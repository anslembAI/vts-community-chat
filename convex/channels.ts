import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";
import {
    requireAuth,
    requireAdmin,
    requireChannelMember,
} from "./permissions";

// ─── Get All Channels with Membership Info ──────────────────────────

export const getChannelsWithMembership = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId || null);
        const channels = await ctx.db.query("channels").collect();

        const channelsWithData = await Promise.all(channels.map(async (channel) => {
            const memberCount = (await ctx.db
                .query("channel_members")
                .withIndex("by_channelId", (q) => q.eq("channelId", channel._id))
                .collect()).length;

            let isMember = false;
            if (userId) {
                const membership = await ctx.db
                    .query("channel_members")
                    .withIndex("by_channelId_userId", (q) => q.eq("channelId", channel._id).eq("userId", userId))
                    .first();
                isMember = !!membership;
            }

            return {
                ...channel,
                memberCount,
                isMember,
            };
        }));

        return channelsWithData;
    },
});

// ─── Join Channel (any authenticated user) ──────────────────────────

export const joinChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found.");

        const existingMembership = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) => q.eq("channelId", args.channelId).eq("userId", user._id))
            .first();

        if (existingMembership) return; // Already a member

        await ctx.db.insert("channel_members", {
            channelId: args.channelId,
            userId: user._id,
            joinedAt: Date.now(),
        });
    },
});

// ─── Leave Channel (must be a member) ───────────────────────────────

export const leaveChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        const membership = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) => q.eq("channelId", args.channelId).eq("userId", user._id))
            .first();

        if (!membership) return; // Not a member

        await ctx.db.delete(membership._id);
    },
});

// ─── Get All Channels (simple list) ─────────────────────────────────

export const getChannels = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("channels").collect();
    },
});

// ─── Create Channel (admin only) ────────────────────────────────────

export const createChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        name: v.string(),
        description: v.optional(v.string()),
        type: v.optional(v.union(v.literal("chat"), v.literal("money_request"))),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        return await ctx.db.insert("channels", {
            name: args.name,
            description: args.description,
            type: args.type || "chat",
            locked: false,
            createdBy: user._id,
            createdAt: Date.now(),
        });
    },
});

// ─── Rename Channel (admin only) ────────────────────────────────────

export const renameChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        name: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found.");

        const trimmed = args.name.trim();
        if (!trimmed) throw new Error("Channel name cannot be empty.");

        await ctx.db.patch(args.channelId, { name: trimmed });
    },
});

// ─── Delete Channel (admin only) ────────────────────────────────────

export const deleteChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found.");

        // Delete all memberships
        const members = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();
        await Promise.all(members.map((m) => ctx.db.delete(m._id)));

        // Delete all messages
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();
        await Promise.all(messages.map((m) => ctx.db.delete(m._id)));

        // Delete lock history
        const lockHistory = await ctx.db
            .query("channelLockHistory")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();
        await Promise.all(lockHistory.map((h) => ctx.db.delete(h._id)));

        await ctx.db.delete(args.channelId);
    },
});

// ─── Get Single Channel ─────────────────────────────────────────────

export const getChannel = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.channelId);
    },
});

// ─── Lock Channel (admin only) ──────────────────────────────────────

export const lockChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found.");

        if (channel.locked) throw new Error("Channel is already locked.");

        const now = Date.now();

        await ctx.db.patch(args.channelId, {
            locked: true,
            lockedBy: user._id,
            lockedAt: now,
            lockReason: args.reason?.trim() || undefined,
        });

        // Audit log
        await ctx.db.insert("channelLockHistory", {
            channelId: args.channelId,
            action: "locked",
            actorId: user._id,
            reason: args.reason?.trim() || undefined,
            timestamp: now,
        });
    },
});

// ─── Unlock Channel (admin only) ────────────────────────────────────

export const unlockChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found.");

        if (!channel.locked) throw new Error("Channel is not locked.");

        const now = Date.now();

        await ctx.db.patch(args.channelId, {
            locked: false,
            lockedBy: undefined,
            lockedAt: undefined,
            lockReason: undefined,
        });

        // Audit log
        await ctx.db.insert("channelLockHistory", {
            channelId: args.channelId,
            action: "unlocked",
            actorId: user._id,
            timestamp: now,
        });
    },
});

// ─── Get Channel Lock History (admin only) ──────────────────────────

export const getChannelLockHistory = query({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return [];

        const user = await ctx.db.get(userId);
        if (!user?.isAdmin) return [];

        const history = await ctx.db
            .query("channelLockHistory")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();

        const enriched = await Promise.all(
            history.map(async (entry) => {
                const actor = await ctx.db.get(entry.actorId);
                return {
                    ...entry,
                    actorName: actor?.name || actor?.username || "Unknown",
                };
            })
        );

        return enriched.sort((a, b) => b.timestamp - a.timestamp);
    },
});
