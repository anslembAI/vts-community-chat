import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    password: v.string(), // Hashed password
    name: v.optional(v.string()), // Optional display name
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isAdmin: v.boolean(),
    createdAt: v.number(),
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
    type: v.optional(v.union(v.literal("chat"), v.literal("money_request"))),
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
    // Poll integration
    type: v.optional(v.union(v.literal("text"), v.literal("poll"))),
    pollId: v.optional(v.id("polls")),
  }).index("by_channelId", ["channelId"]),

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
    scheduledFor: v.optional(v.number()),       // future publish time
    hideResultsBeforeClose: v.optional(v.boolean()), // hide results until poll closes
    isAnnouncement: v.optional(v.boolean()),     // announcement poll highlight
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
      v.literal("poll_ending_soon")
    ),
    message: v.string(),
    pollId: v.optional(v.id("polls")),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),

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
});
