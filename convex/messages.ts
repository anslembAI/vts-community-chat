
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

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

        return messagesWithUser.reverse(); // Serve oldest first
    },
});


export const sendMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        await ctx.db.insert("messages", {
            channelId: args.channelId,
            userId: userId,
            content: args.content,
            timestamp: Date.now(),
            edited: false,
        });
    },
});

export const editMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        messageId: v.id("messages"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        if (message.userId !== userId) {
            throw new Error("Unauthorized");
        }

        const timeLimit = 10 * 60 * 1000; // 10 minutes
        if (Date.now() - message.timestamp > timeLimit) {
            throw new Error("Edit time limit exceeded");
        }

        await ctx.db.patch(args.messageId, {
            content: args.content,
            edited: true,
            editedAt: Date.now(),
        });
    },
});

export const deleteMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        if (message.userId !== userId) {
            throw new Error("Unauthorized");
        }

        await ctx.db.delete(args.messageId);
    },
});

