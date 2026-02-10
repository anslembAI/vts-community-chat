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
    .index("by_email", ["email"]), // Keep if needed, but made optional

  sessions: defineTable({
    userId: v.id("users"),
    expiresAt: v.number(),
  }),

  channels: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_name", ["name"]),

  messages: defineTable({
    channelId: v.id("channels"),
    userId: v.id("users"),
    content: v.string(),
    timestamp: v.number(),
    edited: v.boolean(),
    editedAt: v.optional(v.number()),
  }).index("by_channelId", ["channelId"]),
});
