
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

export const getChannels = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("channels").collect();
    },
});

export const createChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        name: v.string(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);

        if (!user || !user.isAdmin) {
            throw new Error("Unauthorized: Only admins can create channels");
        }

        return await ctx.db.insert("channels", {
            name: args.name,
            description: args.description,
            createdBy: user._id,
            createdAt: Date.now(),
        });
    },
});
