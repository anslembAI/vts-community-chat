import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

// ─── Mark Channel as Read ──────────────────────────────────────────

export const markChannelRead = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return;

        const existing = await ctx.db
            .query("channel_read_state")
            .withIndex("by_channelId_userId", (q) =>
                q.eq("channelId", args.channelId).eq("userId", userId)
            )
            .first();

        const now = Date.now();

        if (existing) {
            await ctx.db.patch(existing._id, {
                lastReadAt: now,
            });
        } else {
            await ctx.db.insert("channel_read_state", {
                userId,
                channelId: args.channelId,
                lastReadAt: now,
            });
        }
    },
});

// ─── Get Unread Counts ─────────────────────────────────────────────

export const getUnreadCounts = query({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return { channels: {}, global: 0 };

        // Get all channels the user is a member of
        const memberships = await ctx.db
            .query("channel_members")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        // Get user's read states
        const readStates = await ctx.db
            .query("channel_read_state")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const readMap = new Map();
        for (const rs of readStates) {
            readMap.set(rs.channelId, rs.lastReadAt);
        }

        const unreadByChannel: Record<string, number> = {};
        let globalUnread = 0;

        // For each membership, compute unread messages up to a max (e.g., 10)
        for (const m of memberships) {
            const joinedAt = m.joinedAt || 0;
            const lastReadAt = readMap.get(m.channelId) || 0;
            const threshold = Math.max(joinedAt, lastReadAt);

            // Fetch messages after the threshold.
            // We read from the end to quickly get new messages. Since we don't have
            // a by_channelId_timestamp index, we just get messages by channelId
            // and filter. To make it efficient, we fetch all and filter but only
            // care about the ones after the threshold.
            // A better approach in Convex for big channels without the index is just fetching recent ones:
            const recentMessages = await ctx.db
                .query("messages")
                .withIndex("by_channelId", (q) => q.eq("channelId", m.channelId))
                .order("desc")
                .take(50); // Look at the last 50 messages to calculate badge

            let unreadCount = 0;
            for (const msg of recentMessages) {
                if (msg.timestamp <= threshold) break; // Found a message older than threshold, we can stop
                if (!msg.deletedAt && msg.userId !== userId) {
                    unreadCount++;
                }
            }

            if (unreadCount > 0) {
                unreadByChannel[m.channelId] = unreadCount;
                globalUnread += unreadCount;
            }
        }

        return {
            channels: unreadByChannel,
            global: globalUnread,
        };
    },
});
