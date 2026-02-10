import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getChannels = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("channels").collect();
    },
});

export const createChannel = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();

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
