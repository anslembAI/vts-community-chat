import { v } from "convex/values";
import { mutation } from "./_generated/server";
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

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        if (user.avatarStorageId) {
            await ctx.storage.delete(user.avatarStorageId).catch(() => { });
        }

        await ctx.db.patch(userId, {
            name: args.name,
            imageUrl: args.imageUrl,
            email: args.email,
            avatarStorageId: undefined,
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
        throw new Error("Avatar uploads are disabled. Use an external avatar URL instead.");
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

        await ctx.storage.delete(args.storageId).catch(() => { });
        throw new Error("Avatar uploads are disabled. Use an external avatar URL instead.");
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

        if (user.avatarStorageId) {
            await ctx.storage.delete(user.avatarStorageId).catch(() => { });
        }

        await ctx.db.patch(userId, {
            avatarStorageId: undefined,
            imageUrl: undefined,
        });
    },
});
