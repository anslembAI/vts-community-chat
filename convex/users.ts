import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        return await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();
    },
});

export const storeUser = mutation({
    args: {
        userId: v.string(), // Clerk ID
        name: v.string(),
        email: v.string(),
        imageUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .first();

        if (user) {
            if (user.name !== args.name || user.imageUrl !== args.imageUrl) {
                await ctx.db.patch(user._id, {
                    name: args.name,
                    imageUrl: args.imageUrl,
                });
            }
            return user._id;
        }

        return await ctx.db.insert("users", {
            userId: args.userId,
            name: args.name,
            email: args.email,
            imageUrl: args.imageUrl,
            isAdmin: false,
            createdAt: Date.now(),
        });
    },
});

export const updateUserRole = mutation({
    args: {
        id: v.id("users"),
        isAdmin: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();

        if (!user || !user.isAdmin) {
            throw new Error("Unauthorized");
        }

        await ctx.db.patch(args.id, { isAdmin: args.isAdmin });
    },
});

export const requestAdminRole = mutation({ // For testing purposes in dev, make user admin
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();

        if (!user) throw new Error("User not found");

        // In production, this logic should be restricted or removed
        await ctx.db.patch(user._id, { isAdmin: true });
    }
});

export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return []; // Or throw error?

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();

        if (!currentUser?.isAdmin) {
            return [];
        }

        return await ctx.db.query("users").collect();
    }
});
