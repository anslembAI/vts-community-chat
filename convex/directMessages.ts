/* eslint-disable @typescript-eslint/no-explicit-any */
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  normalizeDirectMessageParticipants,
  require2FA,
  requireActiveSession,
  requireAdmin,
  requireAuth,
  requireDirectMessageParticipant,
  requireNotSuspended,
} from "./permissions";

function getParticipantKey(participantIds: [Id<"users">, Id<"users">]) {
  return participantIds.join(":");
}

async function getBlockRecord(
  ctx: any,
  blockerId: Id<"users">,
  blockedId: Id<"users">
) {
  return await ctx.db
    .query("directMessageBlocks")
    .withIndex("by_blockerId_blockedId", (q: any) =>
      q.eq("blockerId", blockerId).eq("blockedId", blockedId)
    )
    .first();
}

async function getOtherParticipant(
  ctx: any,
  thread: Doc<"directMessageThreads">,
  currentUserId: Id<"users">
) {
  const otherUserId = thread.participantIds.find((id) => id !== currentUserId);
  if (!otherUserId) return null;
  const otherUser = await ctx.db.get(otherUserId);
  if (!otherUser) return null;
  return {
    _id: otherUser._id,
    username: otherUser.username,
    name: otherUser.name,
    avatarUrl: otherUser.imageUrl,
    isAdmin: otherUser.isAdmin,
    role: otherUser.role,
  };
}

async function getThreadReadState(ctx: any, threadId: Id<"directMessageThreads">, userId: Id<"users">) {
  return await ctx.db
    .query("directMessageReadState")
    .withIndex("by_threadId_userId", (q: any) => q.eq("threadId", threadId).eq("userId", userId))
    .first();
}

async function ensureReadState(ctx: any, threadId: Id<"directMessageThreads">, userId: Id<"users">, timestamp: number) {
  const existing = await getThreadReadState(ctx, threadId, userId);
  if (existing) {
    await ctx.db.patch(existing._id, { lastReadAt: timestamp });
    return;
  }
  await ctx.db.insert("directMessageReadState", {
    threadId,
    userId,
    lastReadAt: timestamp,
  });
}

async function buildThreadSummary(ctx: any, thread: Doc<"directMessageThreads">, currentUser: Doc<"users">) {
  const otherParticipant = await getOtherParticipant(ctx, thread, currentUser._id);
  if (!otherParticipant) return null;

  const readState = await getThreadReadState(ctx, thread._id, currentUser._id);
  const recentMessages = await ctx.db
    .query("directMessages")
    .withIndex("by_threadId", (q: any) => q.eq("threadId", thread._id))
    .order("desc")
    .take(50);

  const unreadCount = recentMessages.reduce((count: number, message: Doc<"directMessages">) => {
    if (message.deletedAt) return count;
    if (message.senderId === currentUser._id) return count;
    if ((readState?.lastReadAt ?? 0) >= message.createdAt) return count;
    return count + 1;
  }, 0);

  const blockedByMe = !!(await getBlockRecord(ctx, currentUser._id, otherParticipant._id));
  const blockedMe = !!(await getBlockRecord(ctx, otherParticipant._id, currentUser._id));

  return {
    ...thread,
    otherParticipant,
    unreadCount,
    isMuted: thread.mutedBy.includes(currentUser._id),
    isArchived: thread.archivedBy.includes(currentUser._id),
    isDeletedForUser: thread.deletedBy.includes(currentUser._id),
    blockedByMe,
    blockedMe,
  };
}

export const getOrCreateThread = mutation({
  args: {
    sessionId: v.id("sessions"),
    clientSessionId: v.optional(v.string()),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    if (args.clientSessionId) {
      requireActiveSession(user, args.clientSessionId);
    }
    require2FA(user);
    requireNotSuspended(user);

    if (user._id === args.targetUserId) {
      throw new Error("You cannot message yourself.");
    }

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser) {
      throw new Error("User not found.");
    }

    const participantIds = normalizeDirectMessageParticipants(user._id, args.targetUserId);
    const participantKey = getParticipantKey(participantIds);

    const existing = await ctx.db
      .query("directMessageThreads")
      .withIndex("by_participantKey", (q) => q.eq("participantKey", participantKey))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        deletedBy: existing.deletedBy.filter((id) => id !== user._id),
        archivedBy: existing.archivedBy.filter((id) => id !== user._id),
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const now = Date.now();
    const threadId = await ctx.db.insert("directMessageThreads", {
      participantIds,
      participantKey,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      lastMessagePreview: "",
      createdBy: user._id,
      mutedBy: [],
      archivedBy: [],
      deletedBy: [],
    });

    await Promise.all([
      ensureReadState(ctx, threadId, user._id, now),
      ensureReadState(ctx, threadId, args.targetUserId, 0),
    ]);

    return threadId;
  },
});

export const listThreads = query({
  args: {
    sessionId: v.id("sessions"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const allThreads = await ctx.db.query("directMessageThreads").withIndex("by_lastMessageAt").order("desc").collect();
    const ownThreads = allThreads.filter(
      (thread) =>
        thread.participantIds.includes(user._id) &&
        !thread.deletedBy.includes(user._id) &&
        (args.includeArchived ? true : !thread.archivedBy.includes(user._id))
    );

    const summaries = await Promise.all(ownThreads.map((thread) => buildThreadSummary(ctx, thread, user)));
    return summaries
      .filter((thread): thread is NonNullable<typeof thread> => thread !== null)
      .sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  },
});

export const getThread = query({
  args: {
    sessionId: v.id("sessions"),
    threadId: v.id("directMessageThreads"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const thread = await requireDirectMessageParticipant(ctx, args.threadId, user);
    return await buildThreadSummary(ctx, thread, user);
  },
});

export const getMessagesPaginated = query({
  args: {
    sessionId: v.id("sessions"),
    threadId: v.id("directMessageThreads"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const thread = await requireDirectMessageParticipant(ctx, args.threadId, user);
    const otherUserId = thread.participantIds.find((id) => id !== user._id) as Id<"users">;
    const otherReadState = await getThreadReadState(ctx, thread._id, otherUserId);

    const page = await ctx.db
      .query("directMessages")
      .withIndex("by_threadId_createdAt", (q) => q.eq("threadId", args.threadId))
      .order("desc")
      .paginate(args.paginationOpts);

    const senderIds = [...new Set(page.page.map((message) => message.senderId))];
    const senders = await Promise.all(senderIds.map((senderId) => ctx.db.get(senderId)));
    const senderMap = new Map(senderIds.map((senderId, index) => [senderId, senders[index]]));

    return {
      ...page,
      page: page.page.map((message) => {
        const sender = senderMap.get(message.senderId);
        const isSeenByRecipient =
          message.senderId === user._id &&
          !!otherReadState &&
          otherReadState.lastReadAt >= message.createdAt;

        return {
          ...message,
          user: sender
            ? {
                _id: sender._id,
                username: sender.username,
                name: sender.name,
                avatarUrl: sender.imageUrl,
                isAdmin: sender.isAdmin,
                role: sender.role,
              }
            : null,
          deliveryStatus: message.senderId === user._id ? (isSeenByRecipient ? "seen" : "delivered") : undefined,
        };
      }),
    };
  },
});

export const sendMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    clientSessionId: v.optional(v.string()),
    threadId: v.id("directMessageThreads"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    if (args.clientSessionId) {
      requireActiveSession(user, args.clientSessionId);
    }
    require2FA(user);
    requireNotSuspended(user);

    const thread = await requireDirectMessageParticipant(ctx, args.threadId, user);
    const trimmedBody = args.body.trim();
    if (!trimmedBody) {
      throw new Error("Message body is required.");
    }

    const recipientId = thread.participantIds.find((id) => id !== user._id) as Id<"users">;
    const blockedByRecipient = await getBlockRecord(ctx, recipientId, user._id);
    if (blockedByRecipient) {
      throw new Error("This user has blocked you.");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("directMessages", {
      threadId: args.threadId,
      senderId: user._id,
      body: trimmedBody,
      createdAt: now,
    });

    await ctx.db.patch(args.threadId, {
      updatedAt: now,
      lastMessageAt: now,
      lastMessagePreview: trimmedBody.slice(0, 120),
      archivedBy: thread.archivedBy.filter((id) => id !== user._id && id !== recipientId),
      deletedBy: thread.deletedBy.filter((id) => id !== user._id && id !== recipientId),
    });

    await ensureReadState(ctx, args.threadId, user._id, now);

    if (process.env.PUSH_INTERNAL_SECRET) {
      const hostUrl = process.env.HOST_URL || "https://vtschat.app";
      await ctx.scheduler.runAfter(0, internal.push.sendDirectMessagePushNotifications, {
        threadId: args.threadId,
        senderId: user._id,
        recipientId,
        payload: {
          title: `New private message from ${user.name || user.username}`,
          body: trimmedBody.length > 120 ? `${trimmedBody.slice(0, 120)}...` : trimmedBody,
          url: `${hostUrl}/messages/${args.threadId}`,
          threadId: args.threadId,
        },
      });
    }

    return messageId;
  },
});

export const markThreadRead = mutation({
  args: {
    sessionId: v.id("sessions"),
    threadId: v.id("directMessageThreads"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const thread = await requireDirectMessageParticipant(ctx, args.threadId, user);
    await ensureReadState(ctx, thread._id, user._id, Date.now());
  },
});

export const toggleMuteThread = mutation({
  args: {
    sessionId: v.id("sessions"),
    threadId: v.id("directMessageThreads"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const thread = await requireDirectMessageParticipant(ctx, args.threadId, user);
    const isMuted = thread.mutedBy.includes(user._id);
    await ctx.db.patch(thread._id, {
      mutedBy: isMuted ? thread.mutedBy.filter((id) => id !== user._id) : [...thread.mutedBy, user._id],
      updatedAt: Date.now(),
    });
    return { muted: !isMuted };
  },
});

export const toggleArchiveThread = mutation({
  args: {
    sessionId: v.id("sessions"),
    threadId: v.id("directMessageThreads"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const thread = await requireDirectMessageParticipant(ctx, args.threadId, user);
    const isArchived = thread.archivedBy.includes(user._id);
    await ctx.db.patch(thread._id, {
      archivedBy: isArchived ? thread.archivedBy.filter((id) => id !== user._id) : [...thread.archivedBy, user._id],
      updatedAt: Date.now(),
    });
    return { archived: !isArchived };
  },
});

export const deleteThreadFromMyList = mutation({
  args: {
    sessionId: v.id("sessions"),
    threadId: v.id("directMessageThreads"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const thread = await requireDirectMessageParticipant(ctx, args.threadId, user);
    if (!thread.deletedBy.includes(user._id)) {
      await ctx.db.patch(thread._id, {
        deletedBy: [...thread.deletedBy, user._id],
        updatedAt: Date.now(),
      });
    }
  },
});

export const toggleBlockUser = mutation({
  args: {
    sessionId: v.id("sessions"),
    threadId: v.id("directMessageThreads"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const thread = await requireDirectMessageParticipant(ctx, args.threadId, user);
    const otherUserId = thread.participantIds.find((id) => id !== user._id) as Id<"users">;
    const existing = await getBlockRecord(ctx, user._id, otherUserId);

    if (existing) {
      await ctx.db.delete(existing._id);
      return { blocked: false };
    }

    await ctx.db.insert("directMessageBlocks", {
      blockerId: user._id,
      blockedId: otherUserId,
      createdAt: Date.now(),
    });
    return { blocked: true };
  },
});

export const searchUsers = query({
  args: {
    sessionId: v.id("sessions"),
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const term = args.searchTerm.trim().toLowerCase();
    const users = await ctx.db.query("users").collect();

    return users
      .filter((candidate) => candidate._id !== user._id)
      .filter((candidate) => {
        if (!candidate.name) return false;
        if (!term) return true;
        return candidate.name.toLowerCase().includes(term);
      })
      .slice(0, 20)
      .map((candidate) => ({
        _id: candidate._id,
        name: candidate.name || candidate.username,
        username: candidate.username,
        avatarUrl: candidate.imageUrl,
      }));
  },
});

export const editMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    messageId: v.id("directMessages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found.");
    if (message.senderId !== user._id) throw new Error("You do not own this message.");
    if (Date.now() - message.createdAt > 10 * 60 * 1000) {
      throw new Error("Edit window has expired.");
    }

    const trimmedBody = args.body.trim();
    if (!trimmedBody) throw new Error("Message body is required.");

    await requireDirectMessageParticipant(ctx, message.threadId, user);
    await ctx.db.patch(args.messageId, {
      body: trimmedBody,
      editedAt: Date.now(),
    });

    const thread = await ctx.db.get(message.threadId);
    if (thread && thread.lastMessagePreview === message.body.slice(0, 120)) {
      await ctx.db.patch(message.threadId, {
        lastMessagePreview: trimmedBody.slice(0, 120),
        updatedAt: Date.now(),
      });
    }
  },
});

export const deleteMessage = mutation({
  args: {
    sessionId: v.id("sessions"),
    messageId: v.id("directMessages"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.sessionId);
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found.");
    if (message.senderId !== user._id) throw new Error("You do not own this message.");

    await requireDirectMessageParticipant(ctx, message.threadId, user);
    await ctx.db.patch(args.messageId, {
      deletedAt: Date.now(),
    });
  },
});

export const clearThreadMessages = mutation({
  args: {
    sessionId: v.id("sessions"),
    threadId: v.id("directMessageThreads"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAuth(ctx, args.sessionId);
    requireAdmin(admin);

    const thread = await requireDirectMessageParticipant(ctx, args.threadId, admin);
    const otherParticipantId = thread.participantIds.find((id) => id !== admin._id) ?? null;

    let deletedCount = 0;
    let batch;
    const maxBatches = 5;
    let batchesRun = 0;

    do {
      batch = await ctx.db
        .query("directMessages")
        .withIndex("by_threadId", (q) => q.eq("threadId", args.threadId))
        .take(100);

      if (batch.length === 0) break;

      for (const message of batch) {
        await ctx.db.delete(message._id);
        deletedCount++;
      }

      batchesRun++;
    } while (batch.length === 100 && batchesRun < maxBatches);

    const isDone = batch.length < 100;

    if (deletedCount > 0 && isDone) {
      await ctx.db.patch(args.threadId, {
        updatedAt: Date.now(),
        lastMessageAt: thread.createdAt,
        lastMessagePreview: "",
      });
    }

    if (deletedCount > 0) {
      await ctx.db.insert("moderation_log", {
        action: "messages_bulk_deleted",
        actorId: admin._id,
        targetUserId: otherParticipantId ?? undefined,
        reason: "Admin cleared direct message thread",
        metadata: JSON.stringify({
          count: deletedCount,
          threadId: args.threadId,
          participantIds: thread.participantIds,
          isDone,
        }),
        timestamp: Date.now(),
      });
    }

    return { success: true, deletedCount, isDone };
  },
});
