
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

                const reactions = await ctx.db
                    .query("message_reactions")
                    .withIndex("by_messageId", (q) => q.eq("messageId", msg._id))
                    .collect();

                const reactionsWithInfo = await Promise.all(
                    reactions.map(async (r) => {
                        const reactor = await ctx.db.get(r.userId);
                        return {
                            ...r,
                            user: reactor ? { name: reactor.name, username: reactor.username } : undefined // lightweight user info
                        };
                    })
                );

                return {
                    ...msg,
                    user,
                    reactions: reactionsWithInfo,
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

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        if (message.userId !== userId && !user.isAdmin) {
            throw new Error("Unauthorized");
        }

        const reactions = await ctx.db
            .query("message_reactions")
            .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
            .collect();

        await Promise.all(reactions.map((r) => ctx.db.delete(r._id)));

        await ctx.db.delete(args.messageId);
    },
});

export const toggleReaction = mutation({
    args: {
        sessionId: v.id("sessions"),
        messageId: v.id("messages"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        // check duplicates
        const existing = await ctx.db
            .query("message_reactions")
            .withIndex("by_user_message_emoji", (q) =>
                q
                    .eq("userId", userId)
                    .eq("messageId", args.messageId)
                    .eq("emoji", args.emoji)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        } else {
            await ctx.db.insert("message_reactions", {
                messageId: args.messageId,
                userId: userId,
                emoji: args.emoji,
            });
        }
    },
});

