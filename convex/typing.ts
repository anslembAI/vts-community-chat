import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

// ─── Set Typing Status ──────────────────────────────────────────────
// Called when a user starts or stops typing in a channel.
// Upserts a row in `typingIndicators`.
export const setTyping = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        isTyping: v.boolean(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return;

        const existing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_userId_channelId", (q) =>
                q.eq("userId", userId).eq("channelId", args.channelId)
            )
            .unique();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                isTyping: args.isTyping,
                lastTypedAt: now,
            });
        } else {
            await ctx.db.insert("typingIndicators", {
                userId,
                channelId: args.channelId,
                isTyping: args.isTyping,
                lastTypedAt: now,
            });
        }
    },
});

// ─── Get Typing Users ────────────────────────────────────────────────
// Returns a list of usernames currently typing in a given channel.
// Filters out entries older than 5 seconds (stale) and the current user.
export const getTypingUsers = query({
    args: {
        channelId: v.id("channels"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const currentUserId = args.sessionId
            ? await getAuthUserId(ctx, args.sessionId)
            : null;

        const TYPING_TTL_MS = 5000; // 5 seconds
        const threshold = Date.now() - TYPING_TTL_MS;

        const indicators = await ctx.db
            .query("typingIndicators")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();

        // Filter: must be actively typing, not stale, and not the current user
        const activeTypers = indicators.filter(
            (ind) =>
                ind.isTyping &&
                ind.lastTypedAt > threshold &&
                ind.userId !== currentUserId
        );

        // Resolve usernames
        const users = await Promise.all(
            activeTypers.map(async (ind) => {
                const user = await ctx.db.get(ind.userId);
                return user ? { userId: ind.userId, username: user.username } : null;
            })
        );

        return users.filter(Boolean) as { userId: string; username: string }[];
    },
});
