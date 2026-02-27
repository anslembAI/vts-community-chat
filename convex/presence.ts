import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

export const heartbeat = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.optional(v.id("channels")),
        status: v.union(
            v.literal("online"),
            v.literal("away"),
            v.literal("dnd"),
            v.literal("offline")
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return;

        const existing = await ctx.db
            .query("presence")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                channelId: args.channelId,
                lastSeen: now,
                status: args.status,
            });
        } else {
            await ctx.db.insert("presence", {
                userId,
                channelId: args.channelId,
                lastSeen: now,
                status: args.status,
            });
        }
    },
});

export const getPresenceCounts = query({
    args: {
        channelId: v.optional(v.id("channels")),
    },
    handler: async (ctx, args) => {
        const threshold = Date.now() - 60000;

        // Total online
        const allPresence = await ctx.db
            .query("presence")
            .withIndex("by_lastSeen", (q) => q.gt("lastSeen", threshold))
            .collect();

        const globalOnlineCount = allPresence.filter(p => p.status !== "offline").length;

        let channelOnlineCount = 0;
        if (args.channelId) {
            channelOnlineCount = allPresence.filter(
                (p) => p.channelId === args.channelId && p.status !== "offline"
            ).length;
        }

        return {
            globalOnlineCount,
            channelOnlineCount,
        };
    },
});

export const getMyPresence = query({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return null;

        return await ctx.db
            .query("presence")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .unique();
    },
});

