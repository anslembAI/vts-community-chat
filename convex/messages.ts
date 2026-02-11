import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";
import {
    requireAuth,
    requireAdmin,
    requireChannelMember,
    requireChannelUnlockedOrAdmin,
    requireOwner,
    requireWithinEditWindow,
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

                return {
                    ...msg,
                    user,
                    reactions: reactionsWithInfo,
                };
            })
        );

        return messagesWithUser.reverse();
    },
});

// ─── Send Message ───────────────────────────────────────────────────
// Requires: authenticated, channel member, channel unlocked OR admin.

export const sendMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        await requireChannelMember(ctx, args.channelId, user);
        await requireChannelUnlockedOrAdmin(ctx, args.channelId, user);

        await ctx.db.insert("messages", {
            channelId: args.channelId,
            userId: user._id,
            content: args.content,
            timestamp: Date.now(),
            edited: false,
        });
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

export const deleteMessage = mutation({
    args: {
        sessionId: v.id("sessions"),
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        // Owner or admin
        if (message.userId !== user._id && !user.isAdmin) {
            throw new Error("You can only delete your own messages.");
        }

        // Delete reactions
        const reactions = await ctx.db
            .query("message_reactions")
            .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
            .collect();

        await Promise.all(reactions.map((r) => ctx.db.delete(r._id)));

        await ctx.db.delete(args.messageId);
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
