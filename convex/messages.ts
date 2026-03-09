import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import {
    requireAuth,
    requireAdmin,
    requireChannelMember,
    requireChannelUnlockedOrAdmin,
    requireOwner,
    requireWithinEditWindow,
    requireNotSuspended,
    require2FA,
    requireActiveSession,
} from "./permissions";

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
        const rawUser = userMap.get(msg.userId);
        let user = rawUser;

        if (rawUser) {
            let avatarUrl = rawUser.imageUrl;
            if (rawUser.avatarStorageId) {
                const url = await ctx.storage.getUrl(rawUser.avatarStorageId);
                if (url) avatarUrl = url;
            }
            user = { ...rawUser, avatarUrl };
        }

        const reactionsWithInfo = reactions.map((r: any) => {
            const reactor = userMap.get(r.userId);
            return {
                ...r,
                user: reactor ? { name: reactor.name, username: reactor.username } : undefined,
            };
        });

        const imageUrl = msg.image ? await ctx.storage.getUrl(msg.image) : undefined;
        const documentUrl = msg.document ? await ctx.storage.getUrl(msg.document) : undefined;
        const videoUrl = msg.videoStorageId ? await ctx.storage.getUrl(msg.videoStorageId) : undefined;
        const videoThumbUrl = msg.thumbStorageId ? await ctx.storage.getUrl(msg.thumbStorageId) : undefined;

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
            videoUrl,
            videoThumbUrl,
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
        let isLocked = false;
        const channel = await ctx.db.get(args.channelId);
        if (channel?.locked) {
            isLocked = true;
        }

        if (args.sessionId) {
            const user = await requireAuth(ctx, args.sessionId);
            await requireChannelMember(ctx, args.channelId, user);
            const isAdmin = user.role === "admin" || user.isAdmin;
            if (isLocked && !isAdmin) {
                // Check for override
                const override = await ctx.db
                    .query("channel_lock_overrides")
                    .withIndex("by_channelId_userId", (q) =>
                        q.eq("channelId", args.channelId).eq("userId", user._id)
                    )
                    .first();
                if (!override) return [];
            }
        } else if (isLocked) {
            return [];
        }

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

// ─── Get Messages Paginated ─────────────────────────────────────────

export const getMessagesPaginated = query({
    args: {
        channelId: v.id("channels"),
        sessionId: v.optional(v.id("sessions")),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        let isLocked = false;
        const channel = await ctx.db.get(args.channelId);
        if (channel?.locked) {
            isLocked = true;
        }

        if (args.sessionId) {
            const user = await requireAuth(ctx, args.sessionId);
            await requireChannelMember(ctx, args.channelId, user);
            const isAdmin = user.role === "admin" || user.isAdmin;
            if (isLocked && !isAdmin) {
                // Check for override
                const override = await ctx.db
                    .query("channel_lock_overrides")
                    .withIndex("by_channelId_userId", (q) =>
                        q.eq("channelId", args.channelId).eq("userId", user._id)
                    )
                    .first();
                if (!override) return { page: [], isDone: true, continueCursor: "" };
            }
        } else if (isLocked) {
            return { page: [], isDone: true, continueCursor: "" };
        }

        const messagesPage = await ctx.db
            .query("messages")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .filter((q) => q.eq(q.field("parentMessageId"), undefined))
            .order("desc")
            .paginate(args.paginationOpts);

        const enriched = await enrichMessages(ctx, messagesPage.page);
        return {
            ...messagesPage,
            page: enriched,
        };
    },
});

// ─── Get Thread Messages ──────────────────────────────────────────

export const getThreadMessages = query({
    args: {
        messageId: v.id("messages"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const parentMsg = await ctx.db.get(args.messageId);
        if (!parentMsg) return [];

        const channel = await ctx.db.get(parentMsg.channelId);
        const isLocked = !!channel?.locked;

        if (args.sessionId) {
            const user = await requireAuth(ctx, args.sessionId);
            // Optional: channel member check
            const isAdmin = user.role === "admin" || user.isAdmin;
            if (isLocked && !isAdmin) {
                const override = await ctx.db
                    .query("channel_lock_overrides")
                    .withIndex("by_channelId_userId", (q) =>
                        q.eq("channelId", parentMsg.channelId).eq("userId", user._id)
                    )
                    .first();
                if (!override) return [];
            }
        } else if (isLocked) {
            return [];
        }

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

        const channel = await ctx.db.get(msg.channelId);
        if (channel?.locked) {
            return null; // For getMessage strictly locked since it has no sessionId arg here currently.
            // Wait, we can't check auth here without sessionId. Let's return null to be safe if locked.
        }

        const [enriched] = await enrichMessages(ctx, [msg]);
        return enriched;
    },
});

// ─── Send Message ───────────────────────────────────────────────────

export const sendMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        clientSessionId: v.optional(v.string()), // For single-session enforcement
        channelId: v.id("channels"),
        content: v.string(),
        parentMessageId: v.optional(v.id("messages")),
        image: v.optional(v.id("_storage")),
        document: v.optional(v.id("_storage")),
        documentName: v.optional(v.string()),
        documentType: v.optional(v.string()),
        // Video attachment fields
        videoStorageId: v.optional(v.id("_storage")),
        thumbStorageId: v.optional(v.id("_storage")),
        videoDurationMs: v.optional(v.number()),
        videoFormat: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        // Single session enforcement
        if (args.clientSessionId) {
            requireActiveSession(user, args.clientSessionId);
        }

        require2FA(user);
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
            videoStorageId: args.videoStorageId,
            thumbStorageId: args.thumbStorageId,
            videoDurationMs: args.videoDurationMs,
            videoFormat: args.videoFormat,
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
            const preview = (args.content || (args.videoStorageId ? "Sent a video" : args.image ? "Sent an image" : "Sent a file")).slice(0, 50);

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

        // Trigger push notification
        const hostUrl = process.env.HOST_URL || "https://vtschat.app";
        if (process.env.PUSH_INTERNAL_SECRET) {
            await ctx.scheduler.runAfter(0, internal.push.sendPushNotifications, {
                channelId: args.channelId,
                senderId: user._id,
                payload: {
                    title: channel?.name || "New Message",
                    body: `${user.name || user.username}: ${args.content.length > 80 ? args.content.slice(0, 80) + "..." : args.content}`,
                    url: `${hostUrl}/channel/${channel?.slug || args.channelId}#${messageId}`,
                    channelId: args.channelId,
                    messageId: messageId,
                },
            });
        }

        if (channel?.type === "announcement" && process.env.RESEND_API_KEY) {
            await ctx.scheduler.runAfter(0, (internal as any).emails.sendAnnouncementEmail, {
                announcementContent: args.content || "New Announcement!",
                channelName: channel.name,
            });
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
        require2FA(user);
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
        require2FA(user);
        const isAdmin = user.role === "admin" || user.isAdmin;

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        if (!isAdmin) {
            if (message.userId !== user._id) {
                throw new Error("Not authorized to delete this message");
            }
            await requireChannelUnlockedOrAdmin(ctx, message.channelId, user);
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
        require2FA(user);
        requireNotSuspended(user);

        const msg = await ctx.db.get(args.messageId);
        if (!msg) throw new Error("Message not found");
        await requireChannelUnlockedOrAdmin(ctx, msg.channelId, user);

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

export const sendVoiceMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        clientSessionId: v.optional(v.string()), // For single-session enforcement
        channelId: v.id("channels"),
        storageId: v.id("_storage"),
        durationMs: v.number(),
        mimeType: v.string(),
        parentMessageId: v.optional(v.id("messages")),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        // Single session enforcement
        if (args.clientSessionId) {
            requireActiveSession(user, args.clientSessionId);
        }

        require2FA(user);
        requireNotSuspended(user);
        await requireChannelMember(ctx, args.channelId, user);
        await requireChannelUnlockedOrAdmin(ctx, args.channelId, user);

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
            type: "voice",
            content: "🎤 Voice message",
            timestamp: Date.now(),
            edited: false,
            parentMessageId: args.parentMessageId,
            voiceStorageId: args.storageId,
            voiceDurationMs: args.durationMs,
            voiceMimeType: args.mimeType,
        });

        if (args.parentMessageId) {
            const parent = await ctx.db.get(args.parentMessageId);
            if (parent) {
                await ctx.db.patch(args.parentMessageId, {
                    replyCount: (parent.replyCount || 0) + 1,
                    lastReplyAt: Date.now(),
                });
            }
        }

        await ctx.db.patch(args.channelId, {
            lastMessageId: messageId,
            lastMessageTime: Date.now(),
            lastSenderId: user._id,
        });

        // Simplified admin notifications for voice messages
        const adminsByRole = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect();
        const adminsByFlag = await ctx.db.query("users").withIndex("by_isAdmin", (q) => q.eq("isAdmin", true)).collect();

        const adminIds = new Set<Id<"users">>();
        for (const u of adminsByRole) adminIds.add(u._id);
        for (const u of adminsByFlag) adminIds.add(u._id);
        adminIds.delete(user._id);

        if (adminIds.size > 0) {
            const now = Date.now();
            const mutes = await ctx.db.query("channelNotificationMutes").withIndex("by_channelId_mutedBy", (q) => q.eq("channelId", args.channelId)).collect();
            const muteMap = new Map<string, number>();
            for (const mute of mutes) muteMap.set(mute.mutedBy, mute.muteUntil);

            const notificationsToInsert = [];
            const preview = "🎤 Voice message";

            for (const adminId of Array.from(adminIds)) {
                const muteUntil = muteMap.get(adminId);
                if (!muteUntil || muteUntil <= now) {
                    notificationsToInsert.push({ adminId, channelId: args.channelId, messageId, senderId: user._id, preview, createdAt: now, read: false });
                }
            }
            await Promise.all(notificationsToInsert.map(n => ctx.db.insert("adminNotifications", n)));
        }

        // Trigger push notification for voice
        const hostUrl = process.env.HOST_URL || "https://vtschat.app";
        if (process.env.PUSH_INTERNAL_SECRET) {
            await ctx.scheduler.runAfter(0, internal.push.sendPushNotifications, {
                channelId: args.channelId,
                senderId: user._id,
                payload: {
                    title: channel?.name || "New Voice Message",
                    body: `${user.name || user.username}: 🎤 Voice message`,
                    url: `${hostUrl}/channel/${channel?.slug || args.channelId}#${messageId}`,
                    channelId: args.channelId,
                    messageId: messageId,
                },
            });
        }

        return messageId;
    }
});

export const getVoiceUrl = query({
    args: {
        storageId: v.id("_storage"),
        sessionId: v.id("sessions"),
        channelId: v.id("channels"), // Passing channelId to check authorization
    },
    handler: async (ctx, args) => {
        // We ensure only authorized members can fetch URLs
        const user = await requireAuth(ctx, args.sessionId);
        await requireChannelMember(ctx, args.channelId, user);
        await requireChannelUnlockedOrAdmin(ctx, args.channelId, user);
        return await ctx.storage.getUrl(args.storageId);
    }
});

// ─── Clear All Channel Messages ───────────────────────────────────────

export const clearChannelMessages = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");

        let deletedCount = 0;
        let batch;
        const maxBatches = 5; // Delete up to 500 at a time to prevent transaction limits
        let batchesRun = 0;

        do {
            batch = await ctx.db
                .query("messages")
                .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
                .take(100);

            if (batch.length === 0) break;

            for (const msg of batch) {
                // Best-effort storage cleanup
                if (msg.image) await ctx.storage.delete(msg.image).catch(() => { });
                if (msg.document) await ctx.storage.delete(msg.document).catch(() => { });
                if (msg.voiceStorageId) await ctx.storage.delete(msg.voiceStorageId).catch(() => { });
                if (msg.videoStorageId) await ctx.storage.delete(msg.videoStorageId).catch(() => { });
                if (msg.thumbStorageId) await ctx.storage.delete(msg.thumbStorageId).catch(() => { });

                // Reactions
                const reactions = await ctx.db
                    .query("message_reactions")
                    .withIndex("by_messageId", q => q.eq("messageId", msg._id))
                    .collect();
                for (const r of reactions) await ctx.db.delete(r._id);

                // Announcement reads
                const reads = await ctx.db
                    .query("announcement_reads")
                    .withIndex("by_messageId", q => q.eq("messageId", msg._id))
                    .collect();
                for (const r of reads) await ctx.db.delete(r._id);

                // Threads (replies to this message)
                // Actually, threaded replies are also just messages with `parentMessageId`. They will be caught
                // eventually by the outer query `by_channelId` anyway! But to be clean, deleting them here is fine,
                // but if we don't, the outer query will just pick them up later.
                // It's perfectly fine to leave them for the main query.

                // Delete the message itself
                await ctx.db.delete(msg._id);
                deletedCount++;
            }
            batchesRun++;
        } while (batch.length === 100 && batchesRun < maxBatches);

        const isDone = batch.length < 100;

        if (deletedCount > 0) {
            await ctx.db.insert("moderation_log", {
                action: "messages_bulk_deleted",
                actorId: admin._id,
                targetChannelId: args.channelId,
                reason: "Admin cleared channel",
                metadata: JSON.stringify({ count: deletedCount, channelName: channel.name, isDone }),
                timestamp: Date.now(),
            });

            // Clean up lastMessage tracking
            if (isDone) {
                await ctx.db.patch(args.channelId, {
                    lastMessageId: undefined,
                    lastMessageTime: undefined,
                    lastSenderId: undefined,
                });
            }
        }

        return { success: true, deletedCount, isDone };
    }
});
