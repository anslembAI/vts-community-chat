
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

export const getCurrentUser = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId || null);
        if (!userId) return null;

        return await ctx.db.get(userId);
    },
});

export const updateUserRole = mutation({
    args: {
        sessionId: v.id("sessions"), // Must be authenticated to even try
        id: v.id("users"), // Target user ID
        isAdmin: v.boolean(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);

        if (!user || !user.isAdmin) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.id, { isAdmin: args.isAdmin });
    },
});

export const requestAdminRole = mutation({ // For testing purposes in dev, make user admin
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        // In production, this logic should be restricted or removed
        await ctx.db.patch(user._id, { isAdmin: true });
    }
});

export const getAllUsers = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId || null);
        if (!userId) return [];

        const currentUser = await ctx.db.get(userId);

        if (!currentUser?.isAdmin) {
            return [];
        }

        return await ctx.db.query("users").collect();
    }
});
