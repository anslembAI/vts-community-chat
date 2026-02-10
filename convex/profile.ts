
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

        await ctx.db.patch(userId, {
            name: args.name,
            imageUrl: args.imageUrl,
            email: args.email,
        });
    },
});
