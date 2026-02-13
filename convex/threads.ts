import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./permissions";

export const markThreadRead = mutation({
    args: {
        sessionId: v.id("sessions"),
        parentMessageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        const existing = await ctx.db
            .query("user_thread_activity")
            .withIndex("by_user_thread", (q) =>
                q.eq("userId", user._id).eq("parentMessageId", args.parentMessageId)
            )
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                lastViewedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("user_thread_activity", {
                userId: user._id,
                parentMessageId: args.parentMessageId,
                lastViewedAt: Date.now(),
            });
        }
    },
});

export const getThreadUnreadStatus = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
        parentMessageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        if (!args.sessionId) return false;
        const session = await ctx.db.get(args.sessionId);
        if (!session) return false;

        const parentMessage = await ctx.db.get(args.parentMessageId);
        if (!parentMessage || !parentMessage.lastReplyAt) return false;

        const activity = await ctx.db
            .query("user_thread_activity")
            .withIndex("by_user_thread", (q) =>
                q.eq("userId", session.userId).eq("parentMessageId", args.parentMessageId)
            )
            .first();

        if (!activity) return true; // Never viewed, so if there are replies, it's unread

        return parentMessage.lastReplyAt > activity.lastViewedAt;
    },
});

export const getUnreadThreadsForChannel = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        if (!args.sessionId) return [];
        const session = await ctx.db.get(args.sessionId);
        if (!session) return [];

        // Get all messages with replies in this channel
        const threads = await ctx.db
            .query("messages")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .filter((q) => q.gt(q.field("replyCount"), 0))
            .collect();

        const unreadThreadIds = [];
        for (const thread of threads) {
            const activity = await ctx.db
                .query("user_thread_activity")
                .withIndex("by_user_thread", (q) =>
                    q.eq("userId", session.userId).eq("parentMessageId", thread._id)
                )
                .first();

            if (!activity || (thread.lastReplyAt && thread.lastReplyAt > activity.lastViewedAt)) {
                unreadThreadIds.push(thread._id);
            }
        }

        return unreadThreadIds;
    },
});
