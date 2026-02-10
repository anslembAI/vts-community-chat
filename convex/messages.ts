import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getMessages = query({
    args: {
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .order("desc") // Latest first
            .take(50);

        const messagesWithUser = await Promise.all(
            messages.map(async (msg) => {
                const user = await ctx.db.get(msg.userId);
                return {
                    ...msg,
                    user,
                };
            })
        );

        return messagesWithUser.reverse(); // Serve oldest first for chat flow
    },
});

export const sendMessage = mutation({
    args: {
        channelId: v.id("channels"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
            .first();

        if (!user) throw new Error("User not found");

        await ctx.db.insert("messages", {
            channelId: args.channelId,
            userId: user._id,
            content: args.content,
            timestamp: Date.now(),
            edited: false,
        });
    },
});
