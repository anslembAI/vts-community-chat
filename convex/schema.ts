import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(), // Clerk ID
    name: v.string(),
    email: v.string(),
    imageUrl: v.optional(v.string()),
    isAdmin: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"), // Reference to user's internal ID
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  messages: defineTable({
    channelId: v.id("channels"), // Reference
    userId: v.id("users"), // Reference
    content: v.string(),
    timestamp: v.number(),
    edited: v.boolean(),
    editedAt: v.optional(v.number()),
  }).index("by_channelId", ["channelId"]),
});
