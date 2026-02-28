
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

export const updateProfile = mutation({
    args: {
        sessionId: v.id("sessions"),
        name: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
        email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        await ctx.db.patch(userId, {
            name: args.name,
            imageUrl: args.imageUrl,
            email: args.email,
        });
    },
});

export const generateAvatarUploadUrl = mutation({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        return await ctx.storage.generateUploadUrl();
    },
});

export const updateMyAvatar = mutation({
    args: {
        sessionId: v.id("sessions"),
        storageId: v.id("_storage"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const patch: any = { avatarStorageId: args.storageId };

        // Clear old imageUrl if it exists to strictly use avatarStorageId
        if (user.imageUrl) {
            patch.imageUrl = undefined;
        }

        await ctx.db.patch(userId, patch);
    },
});

export const removeMyAvatar = mutation({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const patch: any = { avatarStorageId: undefined };
        if (user.imageUrl) {
            patch.imageUrl = undefined;
        }

        await ctx.db.patch(userId, patch);
    },
});

export const getAvatarUrl = query({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    }
});
