import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";
import { Id } from "./_generated/dataModel";
import {
    requireAuth,
    requireAdmin,
} from "./permissions";

// ─── Get All Channels with Membership Info ──────────────────────────

export const getChannelsWithMembership = query({
    args: {
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let userId: Id<"users"> | null = null;
        let isAdmin = false;

        if (args.sessionId) {
            // Manual session lookup since passing generic string
            const session = await ctx.db.get(args.sessionId as Id<"sessions">);
            if (session) {
                userId = session.userId;
                const user = await ctx.db.get(userId);
                isAdmin = user?.isAdmin ?? false;
            }
        }

        const channels = await ctx.db.query("channels").collect();

        // Optimized: Fetch all memberships/overrides for current user in one go
        const myChannelIds = new Set<string>();
        const myOverrideChannelIds = new Set<string>();

        if (userId) {
            const memberships = await ctx.db
                .query("channel_members")
                .withIndex("by_userId", (q) => q.eq("userId", userId!))
                .collect();

            for (const m of memberships) {
                myChannelIds.add(m.channelId);
            }

            if (!isAdmin) {
                const overrides = await ctx.db
                    .query("channel_lock_overrides")
                    .withIndex("by_userId", (q) => q.eq("userId", userId!))
                    .collect();
                for (const o of overrides) {
                    myOverrideChannelIds.add(o.channelId);
                }
            }
        }

        // Map in memory - O(N) instead of O(N*M)
        const channelsWithData = channels.map((channel) => {
            const isMember = userId ? myChannelIds.has(channel._id) : false;
            let hasOverride = false;

            if (isAdmin) {
                hasOverride = true;
            } else if (userId && channel.locked) {
                hasOverride = myOverrideChannelIds.has(channel._id);
            }

            return {
                ...channel,
                memberCount: channel.memberCount ?? 0, // Use denormalized count
                isMember,
                isLocked: channel.locked, // Ensure frontend gets locked status
                isLockedByAdmin: channel.locked,
                hasOverride,
            };
        });

        return channelsWithData.sort((a, b) => b.createdAt - a.createdAt);
    },
});

// ─── Get Channel Activity (for Sound Notifications) ──────────────────

export const getChannelActivity = query({
    args: {
        sessionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Lightweight activity check for sound notifications
        const channels = await ctx.db.query("channels").collect();
        return channels.map(c => ({
            _id: c._id,
            lastMessageId: c.lastMessageId, // Added in schema
            lastMessageTime: c.lastMessageTime,
            lastSenderId: c.lastSenderId,
        }));
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

        // Increment member count
        await ctx.db.patch(args.channelId, {
            memberCount: (channel.memberCount ?? 0) + 1
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

        // Decrement member count
        const channel = await ctx.db.get(args.channelId);
        if (channel) {
            await ctx.db.patch(args.channelId, {
                memberCount: Math.max(0, (channel.memberCount ?? 0) - 1)
            });
        }
    },
});

// ─── Remove User from Channel (admin only) ──────────────────────────

export const removeUserFromChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        const membership = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) => q.eq("channelId", args.channelId).eq("userId", args.userId))
            .first();

        if (!membership) throw new Error("User is not a member of this channel.");

        await ctx.db.delete(membership._id);

        // Decrement member count
        const channel = await ctx.db.get(args.channelId);
        if (channel) {
            await ctx.db.patch(args.channelId, {
                memberCount: Math.max(0, (channel.memberCount ?? 0) - 1)
            });
        }

        // Log to moderation audit
        await ctx.db.insert("moderation_log", {
            action: "channel_member_removed",
            actorId: admin._id,
            targetUserId: args.userId,
            targetChannelId: args.channelId,
            reason: "Removed from channel by administrator",
            timestamp: Date.now(),
        });
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
        type: v.optional(v.union(v.literal("chat"), v.literal("money_request"), v.literal("announcement"))),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const slug = args.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

        // Check for existing slug to prevent duplicates on creation
        const existing = await ctx.db
            .query("channels")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .first();

        if (existing) {
            throw new Error("A channel with this name/slug already exists.");
        }

        return await ctx.db.insert("channels", {
            name: args.name,
            slug,
            description: args.description,
            type: args.type || "chat",
            locked: false,
            createdBy: user._id,
            createdAt: Date.now(),
            memberCount: 0,
            updatedAt: Date.now(),
            updatedBy: user._id,
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
        if (trimmed.length < 2 || trimmed.length > 40) {
            throw new Error("Channel name must be between 2 and 40 characters.");
        }

        // Generate slug: lowercase, replace non-alphanumeric with hyphen, trim hyphens
        const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

        if (!slug) throw new Error("Invalid channel name.");

        // Check for uniqueness (excluding current channel)
        const existing = await ctx.db
            .query("channels")
            .withIndex("by_slug", (q) => q.eq("slug", slug))
            .first();

        if (existing && existing._id !== args.channelId) {
            throw new Error("A channel with this name already exists.");
        }

        await ctx.db.patch(args.channelId, {
            name: trimmed,
            slug,
            updatedAt: Date.now(),
            updatedBy: user._id
        });
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
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

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

// ─── Mark Announcement as Read ────────────────────────────────────

export const markAnnouncementRead = mutation({
    args: {
        sessionId: v.id("sessions"),
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        // Check message exists
        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found.");

        // Ensure this is in an announcement channel
        const channel = await ctx.db.get(message.channelId);
        if (!channel || channel.type !== "announcement") {
            throw new Error("This feature is only available for announcement channels.");
        }

        // Check if already read (idempotency)
        const existing = await ctx.db
            .query("announcement_reads")
            .withIndex("by_messageId_userId", (q) =>
                q.eq("messageId", args.messageId).eq("userId", user._id)
            )
            .first();

        if (existing) return; // Already acknowledged

        await ctx.db.insert("announcement_reads", {
            messageId: args.messageId,
            userId: user._id,
            readAt: Date.now(),
            channelId: channel._id,
        });

        // Increment read count on message (atomic update)
        await ctx.db.patch(args.messageId, {
            readCount: (message.readCount ?? 0) + 1,
        });
    },
});

// ─── Get Announcement Read Status ──────────────────────────────────
// Returns read counts for each message in an announcement channel.

export const getAnnouncementReadStatus = query({
    args: {
        channelId: v.id("channels"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const channel = await ctx.db.get(args.channelId);
        if (!channel || channel.type !== "announcement") return [];

        const userId = await getAuthUserId(ctx, args.sessionId || null);

        // Get all messages in this channel
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();

        // Optimized read status fetch
        const readStatuses = await Promise.all(
            messages.map(async (msg) => {
                let readCount = msg.readCount;

                // Fallback for legacy messages
                if (readCount === undefined) {
                    const reads = await ctx.db
                        .query("announcement_reads")
                        .withIndex("by_messageId", (q) => q.eq("messageId", msg._id))
                        .collect();
                    readCount = reads.length;
                }

                let hasRead = false;
                if (userId) {
                    // Check if current user read it (efficient index lookup)
                    const myRead = await ctx.db
                        .query("announcement_reads")
                        .withIndex("by_messageId_userId", (q) =>
                            q.eq("messageId", msg._id).eq("userId", userId!)
                        )
                        .first();
                    hasRead = !!myRead;
                }

                return {
                    messageId: msg._id,
                    readCount,
                    hasRead,
                };
            })
        );

        return readStatuses;
    },
});

export const hasLockOverride = query({
    args: {
        sessionId: v.optional(v.string()),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        if (!args.sessionId) return false;

        // sessionId is the ID of the session doc
        const session = await ctx.db.get(args.sessionId as Id<"sessions">);
        if (!session) return false;

        const user = await ctx.db.get(session.userId);
        if (!user) return false;

        if (user.isAdmin) return true; // Admins always have access

        const override = await ctx.db
            .query("channel_lock_overrides")
            .withIndex("by_channelId_userId", (q) =>
                q.eq("channelId", args.channelId).eq("userId", user._id)
            )
            .first();

        return !!override;
    },
});
