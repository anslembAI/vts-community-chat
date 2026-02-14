import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import {
    requireAuth,
    requireAdmin,
    requireChannelMember,
    requireChannelUnlockedOrAdmin,
    requireOwner,
    requireWithinEditWindow,
    requireAnnouncementAdminPost,
    requireNotSuspended,
} from "./permissions";
import { getAuthUserId } from "./authUtils";

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Enriches a list of messages with user details and reactions.
 * Optimizes user fetching by batching requests.
 */
async function enrichMessages(ctx: any, messages: Doc<"messages">[]) {
    // 1. Collect all unique user IDs (authors + reactors)
    const userIds = new Set<Id<"users">>();
    const messagesWithReactions: any[] = [];

    // Pre-fetch reactions for all messages
    // Future optimization: Index reactions by channelId/timestamp if possible to fetch in bulk

    for (const msg of messages) {
        if (msg.userId) userIds.add(msg.userId);

        const reactions = await ctx.db
            .query("message_reactions")
            .withIndex("by_messageId", (q: any) => q.eq("messageId", msg._id))
            .collect();

        for (const r of reactions) {
            userIds.add(r.userId);
        }

        messagesWithReactions.push({ msg, reactions });
    }

    // 2. Batch fetch all users
    const uniqueUserIds = Array.from(userIds);
    const userDocs = await Promise.all(uniqueUserIds.map((id) => ctx.db.get(id)));
    const userMap = new Map<string, Doc<"users" | any>>();

    uniqueUserIds.forEach((id, index) => {
        if (userDocs[index]) {
            userMap.set(id, userDocs[index]);
        }
    });

    // 3. Assemble the result
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return await Promise.all(messagesWithReactions.map(async ({ msg, reactions }): Promise<any> => {
        const user = userMap.get(msg.userId);

        const reactionsWithInfo = reactions.map((r: any) => {
            const reactor = userMap.get(r.userId);
            return {
                ...r,
                user: reactor ? { name: reactor.name, username: reactor.username } : undefined,
            };
        });

        const imageUrl = msg.image ? await ctx.storage.getUrl(msg.image) : undefined;
        const documentUrl = msg.document ? await ctx.storage.getUrl(msg.document) : undefined;

        // Handle soft-delete masking
        const isDeleted = !!msg.deletedAt;
        const content = isDeleted
            ? (msg.deleteReason?.includes("Admin") ? "Message deleted by Admin" : "Message deleted")
            : msg.content;

        return {
            ...msg,
            content,
            isModerated: isDeleted,
            user,
            reactions: isDeleted ? [] : reactionsWithInfo,
            imageUrl,
            documentUrl,
        };
    }));
}

// ─── Get Messages ───────────────────────────────────────────────────

export const getMessages = query({
    args: {
        channelId: v.id("channels"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        // Optional security check can be enabled here using args.sessionId
        // const user = args.sessionId ? await requireAuth(ctx, args.sessionId) : null;
        // if (user) await requireChannelMember(ctx, args.channelId, user);

        // We fetch 50 messages
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .filter((q) => q.eq(q.field("parentMessageId"), undefined))
            .order("desc")
            .take(50);

        const enriched = await enrichMessages(ctx, messages);
        return enriched.reverse();
    },
});

// ─── Get Thread Messages ──────────────────────────────────────────

export const getThreadMessages = query({
    args: {
        messageId: v.id("messages"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_parentMessageId", (q) => q.eq("parentMessageId", args.messageId))
            .collect();

        const enriched = await enrichMessages(ctx, messages);
        return enriched.sort((a: any, b: any) => a.timestamp - b.timestamp);
    },
});

// ─── Get Single Message ─────────────────────────────────────────────

export const getMessage = query({
    args: {
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const msg = await ctx.db.get(args.messageId);
        if (!msg) return null;

        const [enriched] = await enrichMessages(ctx, [msg]);
        return enriched;
    },
});

// ─── Send Message ───────────────────────────────────────────────────

export const sendMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        content: v.string(),
        parentMessageId: v.optional(v.id("messages")),
        image: v.optional(v.id("_storage")),
        document: v.optional(v.id("_storage")),
        documentName: v.optional(v.string()),
        documentType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireNotSuspended(user);
        await requireChannelMember(ctx, args.channelId, user);
        await requireChannelUnlockedOrAdmin(ctx, args.channelId, user);

        // Announcement channel restrictions
        const channel = await ctx.db.get(args.channelId);
        if (channel?.type === "announcement") {
            requireAdmin(user);
            if (args.parentMessageId) {
                throw new Error("Replies are not allowed in announcement channels.");
            }
        }

        const messageId = await ctx.db.insert("messages", {
            channelId: args.channelId,
            userId: user._id,
            content: args.content,
            timestamp: Date.now(),
            edited: false,
            parentMessageId: args.parentMessageId,
            image: args.image,
            document: args.document,
            documentName: args.documentName,
            documentType: args.documentType,
        });

        // Update thread metadata
        if (args.parentMessageId) {
            const parent = await ctx.db.get(args.parentMessageId);
            if (parent) {
                await ctx.db.patch(args.parentMessageId, {
                    replyCount: (parent.replyCount || 0) + 1,
                    lastReplyAt: Date.now(),
                });
            }
        }

        // Update channel last activity for sounds
        await ctx.db.patch(args.channelId, {
            lastMessageId: messageId,
            lastMessageTime: Date.now(),
            lastSenderId: user._id,
        });

        // ─── Admin Notifications ─────────────────────────────────────────

        // 1. Identify Admins
        const adminsByRole = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "admin"))
            .collect();

        const adminsByFlag = await ctx.db
            .query("users")
            .withIndex("by_isAdmin", (q) => q.eq("isAdmin", true))
            .collect();

        // Unified set of admin IDs (excluding sender)
        const adminIds = new Set<Id<"users">>();
        for (const user of adminsByRole) adminIds.add(user._id);
        for (const user of adminsByFlag) adminIds.add(user._id);
        adminIds.delete(user._id); // Don't notify self

        if (adminIds.size > 0) {
            const now = Date.now();

            // 2. Check for Mutes on this Channel
            // We use the prefix of the index "by_channelId_mutedBy" to get all mutes for this channel
            const mutes = await ctx.db
                .query("channelNotificationMutes")
                .withIndex("by_channelId_mutedBy", (q) => q.eq("channelId", args.channelId))
                .collect();

            // Map of AdminID -> MuteUntil
            const muteMap = new Map<string, number>();
            for (const mute of mutes) {
                muteMap.set(mute.mutedBy, mute.muteUntil);
            }

            // 3. Create Notifications
            const notificationsToInsert = [];
            const preview = (args.content || (args.image ? "Sent an image" : "Sent a file")).slice(0, 50);

            for (const adminId of Array.from(adminIds)) {
                const muteUntil = muteMap.get(adminId);
                // If not muted OR mute expired
                if (!muteUntil || muteUntil <= now) {
                    notificationsToInsert.push({
                        adminId,
                        channelId: args.channelId,
                        messageId,
                        senderId: user._id,
                        preview,
                        createdAt: now,
                        read: false,
                    });
                }
            }

            await Promise.all(notificationsToInsert.map(n => ctx.db.insert("adminNotifications", n)));
        }

        return messageId;
    },
});

// ─── Edit Message ───────────────────────────────────────────────────

export const editMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        messageId: v.id("messages"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireNotSuspended(user);
        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        requireOwner(user._id, message.userId);
        requireWithinEditWindow(message.timestamp, 10);
        await requireChannelUnlockedOrAdmin(ctx, message.channelId, user);

        await ctx.db.patch(args.messageId, {
            content: args.content,
            edited: true,
            editedAt: Date.now(),
        });
    },
});

// ─── Delete Message ─────────────────────────────────────────────────

export const deleteMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        messageId: v.id("messages"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        const isAdmin = user.role === "admin" || user.isAdmin;

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        if (!isAdmin && message.userId !== user._id) {
            throw new Error("Not authorized to delete this message");
        }

        const now = Date.now();
        await ctx.db.patch(args.messageId, {
            deletedAt: now,
            deletedBy: user._id,
            deleteReason: args.reason || (isAdmin ? "Deleted by Admin" : "Deleted by User"),
        });

        if (isAdmin && message.userId !== user._id) {
            await ctx.db.insert("moderation_log", {
                action: "message_deleted",
                actorId: user._id,
                targetUserId: message.userId,
                targetMessageId: args.messageId,
                targetChannelId: message.channelId,
                reason: args.reason || "Removed by administrator",
                timestamp: now,
            });
        }

        return { success: true };
    },
});

// ─── Toggle Reaction ────────────────────────────────────────────────

export const toggleReaction = mutation({
    args: {
        sessionId: v.id("sessions"),
        messageId: v.id("messages"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireNotSuspended(user);
        const existing = await ctx.db
            .query("message_reactions")
            .withIndex("by_user_message_emoji", (q) =>
                q.eq("userId", user._id).eq("messageId", args.messageId).eq("emoji", args.emoji)
            )
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        } else {
            await ctx.db.insert("message_reactions", {
                messageId: args.messageId,
                userId: user._id,
                emoji: args.emoji,
            });
        }
    },
});

// ─── Admin Soft-Delete Message ──────────────────────────────────────

export const adminBulkSoftDeleteUserMessages = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
        channelId: v.optional(v.id("channels")),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        let messages;
        // Optimization: Always query by userId first since it's likely more selective than channelId
        // and we have an index on userId.
        messages = await ctx.db
            .query("messages")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();

        if (args.channelId) {
            messages = messages.filter((m) => m.channelId === args.channelId && !m.deletedAt);
        } else {
            messages = messages.filter((m) => !m.deletedAt);
        }

        const now = Date.now();

        // Parallelize updates
        await Promise.all(messages.map(message =>
            ctx.db.patch(message._id, {
                deletedAt: now,
                deletedBy: admin._id,
                deleteReason: args.reason || "Bulk removal by moderator",
            })
        ));

        await ctx.db.insert("moderation_log", {
            action: "messages_bulk_deleted",
            actorId: admin._id,
            targetUserId: args.userId,
            targetChannelId: args.channelId,
            reason: args.reason || "Bulk removal by moderator",
            metadata: JSON.stringify({ count: messages.length }),
            timestamp: now,
        });

        return { deletedCount: messages.length };
    },
});

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});
