import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
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

// ─── Get Messages ───────────────────────────────────────────────────

export const getMessages = query({
    args: {
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .filter((q) => q.eq(q.field("parentMessageId"), undefined))
            .order("desc")
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
                            user: reactor ? { name: reactor.name, username: reactor.username } : undefined,
                        };
                    })
                );

                const imageUrl = msg.image ? await ctx.storage.getUrl(msg.image) : undefined;
                const documentUrl = msg.document ? await ctx.storage.getUrl(msg.document) : undefined;

                return {
                    ...msg,
                    // Soft-delete formatting
                    content: msg.deletedAt
                        ? (msg.deleteReason?.includes("Admin") ? "Message deleted by Admin" : "Message deleted")
                        : msg.content,
                    isModerated: !!msg.deletedAt,
                    user,
                    reactions: msg.deletedAt ? [] : reactionsWithInfo,
                    imageUrl,
                    documentUrl,
                };
            })
        );

        return messagesWithUser.reverse();
    },
});

// ─── Get Thread Messages ──────────────────────────────────────────
// Fetch replies for a specific parent message.

export const getThreadMessages = query({
    args: {
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_parentMessageId", (q) => q.eq("parentMessageId", args.messageId))
            .collect();

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
                            user: reactor ? { name: reactor.name, username: reactor.username } : undefined,
                        };
                    })
                );

                const imageUrl = msg.image ? await ctx.storage.getUrl(msg.image) : undefined;
                const documentUrl = msg.document ? await ctx.storage.getUrl(msg.document) : undefined;

                return {
                    ...msg,
                    // Soft-delete formatting
                    content: msg.deletedAt
                        ? (msg.deleteReason?.includes("Admin") ? "Message deleted by Admin" : "Message deleted")
                        : msg.content,
                    isModerated: !!msg.deletedAt,
                    user,
                    reactions: msg.deletedAt ? [] : reactionsWithInfo,
                    imageUrl,
                    documentUrl,
                };
            })
        );

        return messagesWithUser.sort((a, b) => a.timestamp - b.timestamp);
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
                    user: reactor ? { name: reactor.name, username: reactor.username } : undefined,
                };
            })
        );

        const imageUrl = msg.image ? await ctx.storage.getUrl(msg.image) : undefined;
        const documentUrl = msg.document ? await ctx.storage.getUrl(msg.document) : undefined;

        return {
            ...msg,
            user,
            reactions: reactionsWithInfo,
            imageUrl,
            documentUrl,
        };
    },
});

// ─── Send Message ───────────────────────────────────────────────────
// Requires: authenticated, channel member, channel unlocked OR admin.

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
            // Only admin can post
            requireAdmin(user);
            // No replies allowed in announcement channels
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

        // If this is a reply, update the parent message metadata
        if (args.parentMessageId) {
            const parent = await ctx.db.get(args.parentMessageId);
            if (parent) {
                await ctx.db.patch(args.parentMessageId, {
                    replyCount: (parent.replyCount || 0) + 1,
                    lastReplyAt: Date.now(),
                });
            }
        }

        return messageId;
    },
});

// ─── Edit Message ───────────────────────────────────────────────────
// Requires: owner only, 10-minute window, channel unlocked OR admin.

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

        // Only the owner can edit their own message
        requireOwner(user._id, message.userId);

        // Must be within 10-minute edit window
        requireWithinEditWindow(message.timestamp, 10);

        // Channel must be unlocked OR user is admin
        await requireChannelUnlockedOrAdmin(ctx, message.channelId, user);

        await ctx.db.patch(args.messageId, {
            content: args.content,
            edited: true,
            editedAt: Date.now(),
        });
    },
});

// ─── Delete Message ─────────────────────────────────────────────────
// Owner can delete own message. Admin can delete anyone's message.

// Soft-delete: Admin can delete any message, users only their own.
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

        // Authorization check
        if (!isAdmin && message.userId !== user._id) {
            throw new Error("Not authorized to delete this message");
        }

        // Deletion logic (Soft Delete)
        const now = Date.now();
        await ctx.db.patch(args.messageId, {
            deletedAt: now,
            deletedBy: user._id,
            deleteReason: args.reason || (isAdmin ? "Deleted by Admin" : "Deleted by User"),
        });

        // Audit log if admin deletes another user's message
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
                q
                    .eq("userId", user._id)
                    .eq("messageId", args.messageId)
                    .eq("emoji", args.emoji)
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
// Soft-deletes a message: preserves the row, clears content, logs to audit.

// Bulk delete is still useful for performance in moderation tools
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
        if (args.channelId) {
            messages = await ctx.db
                .query("messages")
                .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId!))
                .collect();
            messages = messages.filter((m) => m.userId === args.userId && !m.deletedAt);
        } else {
            messages = await ctx.db.query("messages").collect();
            messages = messages.filter((m) => m.userId === args.userId && !m.deletedAt);
        }

        const now = Date.now();
        for (const message of messages) {
            await ctx.db.patch(message._id, {
                deletedAt: now,
                deletedBy: admin._id,
                deleteReason: args.reason || "Bulk removal by moderator",
            });
        }

        // Single audit log entry for the bulk action
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
