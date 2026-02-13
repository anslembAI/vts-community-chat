import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    password: v.string(), // Hashed password
    name: v.optional(v.string()), // Optional display name
    email: v.optional(v.string()), // Optional, never required
    imageUrl: v.optional(v.string()),
    isAdmin: v.boolean(), // true = "admin" role, false = "user" role
    role: v.optional(v.union(v.literal("admin"), v.literal("moderator"), v.literal("user"))), // Optional for backward compatibility
    createdAt: v.number(),
    // --- Reputation & Badges ---
    reputation: v.optional(v.number()), // Cumulative reputation score
    badges: v.optional(v.array(v.string())), // e.g. ["contributor", "trusted_member", "verified", "top_contributor"]
    badgesGrantedAt: v.optional(v.array(v.number())), // Parallel array of timestamps when each badge was granted
    // --- Moderation ---
    suspended: v.optional(v.boolean()),
    suspendedAt: v.optional(v.number()),
    suspendedBy: v.optional(v.id("users")),
    suspendReason: v.optional(v.string()),
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"]),

  sessions: defineTable({
    userId: v.id("users"),
    expiresAt: v.number(),
  }),

  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    type: v.optional(v.union(v.literal("chat"), v.literal("money_request"), v.literal("announcement"))),
    // Lock fields
    locked: v.optional(v.boolean()),
    lockedBy: v.optional(v.id("users")),
    lockedAt: v.optional(v.number()),
    lockReason: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  channel_members: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    joinedAt: v.number(),
  })
    .index("by_channelId", ["channelId"])
    .index("by_userId", ["userId"])
    .index("by_channelId_userId", ["channelId", "userId"]),

  messages: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    content: v.string(),
    timestamp: v.number(),
    edited: v.boolean(),
    editedAt: v.optional(v.number()),
    // Attachments
    image: v.optional(v.id("_storage")),
    // Document attachments (PDF, Word, Excel, etc.)
    document: v.optional(v.id("_storage")),
    documentName: v.optional(v.string()),
    documentType: v.optional(v.string()),
    // Poll integration
    type: v.optional(v.union(v.literal("text"), v.literal("poll"))),
    pollId: v.optional(v.id("polls")),
    // Threading
    parentMessageId: v.optional(v.id("messages")),
    replyCount: v.optional(v.number()),
    lastReplyAt: v.optional(v.number()),
    // Moderation (soft-delete)
    deletedAt: v.optional(v.number()),
    deletedBy: v.optional(v.id("users")),
    deleteReason: v.optional(v.string()),
  })
    .index("by_channelId", ["channelId"])
    .index("by_parentMessageId", ["parentMessageId"]),

  message_reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_user_message_emoji", ["userId", "messageId", "emoji"]),

  // --- Polls ---

  polls: defineTable({
    channelId: v.id("channels"),
    createdBy: v.id("users"),
    question: v.string(),
    options: v.array(v.string()),
    allowMultiple: v.boolean(),
    anonymous: v.boolean(),
    allowChangeVote: v.boolean(),
    status: v.union(
      v.literal("active"),
      v.literal("closed"),
      v.literal("scheduled"),
      v.literal("no_participation")
    ),
    endsAt: v.optional(v.number()),
    scheduledFor: v.optional(v.number()),
    hideResultsBeforeClose: v.optional(v.boolean()),
    isAnnouncement: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_channelId", ["channelId"])
    .index("by_status", ["status"]),

  pollVotes: defineTable({
    pollId: v.id("polls"),
    userId: v.id("users"),
    optionIndexes: v.array(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_pollId", ["pollId"])
    .index("by_pollId_userId", ["pollId", "userId"]),

  // --- Notifications ---

  notifications: defineTable({
    userId: v.id("users"),
    channelId: v.optional(v.id("channels")),
    type: v.union(
      v.literal("poll_created"),
      v.literal("poll_closed"),
      v.literal("poll_ending_soon"),
      v.literal("announcement")
    ),
    message: v.string(),
    pollId: v.optional(v.id("polls")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),

  // --- Channel Lock History (Audit) ---

  channelLockHistory: defineTable({
    channelId: v.id("channels"),
    action: v.union(v.literal("locked"), v.literal("unlocked")),
    actorId: v.id("users"),
    reason: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_channelId", ["channelId"]),

  // --- Exchange Rates ---

  exchangeRates: defineTable({
    base: v.literal("USD"),
    quote: v.literal("TTD"),
    rate: v.number(),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
    note: v.optional(v.string()),
  }),

  exchangeRateHistory: defineTable({
    base: v.literal("USD"),
    quote: v.literal("TTD"),
    oldRate: v.number(),
    newRate: v.number(),
    updatedBy: v.id("users"),
    updatedAt: v.number(),
    note: v.optional(v.string()),
  }),

  moneyRequests: defineTable({
    channelId: v.id("channels"),
    requesterId: v.id("users"),
    recipientId: v.optional(v.id("users")),
    amount: v.number(),
    currency: v.union(v.literal("USD"), v.literal("TTD")),
    note: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("cancelled"),
      v.literal("expired"),
      v.literal("paid")
    ),
    rateLocked: v.number(),
    convertedAmount: v.number(),
    convertedCurrency: v.union(v.literal("USD"), v.literal("TTD")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_channelId", ["channelId"]),

  moneyRequestActivity: defineTable({
    requestId: v.id("moneyRequests"),
    action: v.union(
      v.literal("created"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("cancelled"),
      v.literal("marked_paid"),
      v.literal("expired")
    ),
    actorId: v.id("users"),
    timestamp: v.number(),
  }).index("by_requestId", ["requestId"]),

  // --- Announcement Reads (Mark as Read / Acknowledgment) ---

  announcement_reads: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    readAt: v.number(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_messageId_userId", ["messageId", "userId"])
    .index("by_userId", ["userId"]),

  // --- Moderation Log (Audit Trail) ---

  moderation_log: defineTable({
    action: v.union(
      v.literal("user_suspended"),
      v.literal("user_unsuspended"),
      v.literal("message_deleted"),
      v.literal("messages_bulk_deleted"),
      v.literal("user_role_changed"),
      v.literal("channel_locked"),
      v.literal("channel_unlocked"),
      v.literal("badge_granted"),
      v.literal("badge_revoked"),
      v.literal("channel_member_removed")
    ),
    actorId: v.id("users"), // Admin who performed the action
    targetUserId: v.optional(v.id("users")), // User affected
    targetMessageId: v.optional(v.id("messages")), // Message affected
    targetChannelId: v.optional(v.id("channels")), // Channel affected
    reason: v.optional(v.string()),
    metadata: v.optional(v.string()), // JSON string for extra context
    timestamp: v.number(),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_actorId", ["actorId"])
    .index("by_targetUserId", ["targetUserId"]),

  // --- Channel Access Codes (One-Time Password) ---

  channel_access_codes: defineTable({
    code: v.string(), // Hashed code
    channelId: v.id("channels"),
    targetUserId: v.id("users"),
    createdBy: v.id("users"),
    createdAt: v.number(),
    used: v.boolean(),
    expiresAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_channelId", ["channelId"])
    .index("by_targetUserId", ["targetUserId"]),

  // --- Channel Lock Overrides (Exceptions) ---

  channel_lock_overrides: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    grantedAt: v.number(),
    grantedBy: v.id("users"),
  })
    .index("by_channelId_userId", ["channelId", "userId"])
    .index("by_userId", ["userId"]),

  user_thread_activity: defineTable({
    userId: v.id("users"),
    parentMessageId: v.id("messages"),
    lastViewedAt: v.number(),
  }).index("by_user_thread", ["userId", "parentMessageId"]),
});
