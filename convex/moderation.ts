import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireAuth, requireAdmin, requireModerator } from "./permissions";
import { Id } from "./_generated/dataModel";

// ─── Suspend User ───────────────────────────────────────────────────

export const suspendUser = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        // Moderators can suspend users
        requireModerator(user);

        const targetUser = await ctx.db.get(args.userId);
        if (!targetUser) throw new Error("User not found.");

        // Cannot suspend admins
        if (targetUser.isAdmin || targetUser.role === "admin") {
            throw new Error("Cannot suspend an admin user.");
        }

        if (targetUser.suspended) {
            throw new Error("User is already suspended.");
        }

        await ctx.db.patch(args.userId, {
            suspended: true,
            suspendedAt: Date.now(),
            suspendedBy: user._id,
            suspendReason: args.reason || "Suspended by moderator",
        });

        // Log to audit
        await ctx.db.insert("moderation_log", {
            action: "user_suspended",
            actorId: user._id,
            targetUserId: args.userId,
            reason: args.reason || "Suspended by moderator",
            timestamp: Date.now(),
        });
    },
});

// ─── Unsuspend User ─────────────────────────────────────────────────

export const unsuspendUser = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireModerator(user);

        const targetUser = await ctx.db.get(args.userId);
        if (!targetUser) throw new Error("User not found.");

        if (!targetUser.suspended) {
            throw new Error("User is not suspended.");
        }

        await ctx.db.patch(args.userId, {
            suspended: false,
            suspendedAt: undefined,
            suspendedBy: undefined,
            suspendReason: undefined,
        });

        // Log to audit
        await ctx.db.insert("moderation_log", {
            action: "user_unsuspended",
            actorId: user._id,
            targetUserId: args.userId,
            timestamp: Date.now(),
        });
    },
});

// ─── Get Activity Log ───────────────────────────────────────────────
// Returns recent moderation actions, paginated.

export const getActivityLog = query({
    args: {
        sessionId: v.id("sessions"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireModerator(user);

        const limit = args.limit || 50;

        const logs = await ctx.db
            .query("moderation_log")
            .withIndex("by_timestamp")
            .order("desc")
            .take(limit);

        // Enrich with actor and target user names
        const enrichedLogs = await Promise.all(
            logs.map(async (log) => {
                const actor = await ctx.db.get(log.actorId);
                const targetUser = log.targetUserId
                    ? await ctx.db.get(log.targetUserId)
                    : null;
                const targetChannel = log.targetChannelId
                    ? await ctx.db.get(log.targetChannelId)
                    : null;

                return {
                    ...log,
                    actor: actor
                        ? { name: actor.name || actor.username, imageUrl: actor.imageUrl }
                        : { name: "Unknown" },
                    targetUser: targetUser
                        ? { name: targetUser.name || targetUser.username, imageUrl: targetUser.imageUrl }
                        : log.targetUserId
                            ? { name: "Deleted User" }
                            : null,
                    targetChannel: targetChannel
                        ? { name: targetChannel.name }
                        : null,
                };
            })
        );

        return enrichedLogs;
    },
});

// ─── Get Suspended Users ────────────────────────────────────────────

export const getSuspendedUsers = query({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        const users = await ctx.db.query("users").collect();
        const suspended = users.filter((u) => u.suspended);

        // Enrich with who suspended them
        const enriched = await Promise.all(
            suspended.map(async (u) => {
                const suspender = u.suspendedBy
                    ? await ctx.db.get(u.suspendedBy)
                    : null;
                return {
                    _id: u._id,
                    username: u.username,
                    name: u.name,
                    imageUrl: u.imageUrl,
                    suspended: u.suspended,
                    suspendedAt: u.suspendedAt,
                    suspendReason: u.suspendReason,
                    suspendedByName: suspender
                        ? suspender.name || suspender.username
                        : "Unknown",
                };
            })
        );

        return enriched;
    },
});

// ─── Get Suspicious Patterns ────────────────────────────────────────
// Lightweight heuristics for potential spam/abuse patterns.
// This is a starting point — more sophisticated analysis can be added later.

export const getSuspiciousPatterns = query({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        const users = await ctx.db.query("users").collect();
        const allMessages = await ctx.db.query("messages").collect();

        const patterns: {
            type: "rapid_posting" | "new_account_spam" | "duplicate_messages" | "high_delete_rate";
            severity: "low" | "medium" | "high";
            userId: Id<"users">;
            username: string;
            name?: string;
            description: string;
            count: number;
        }[] = [];

        for (const user of users) {
            if (user.isAdmin || user.suspended) continue;

            const userMessages = allMessages.filter((m) => m.userId === user._id);

            // 1. Rapid posting: > 20 messages in the last hour
            const recentMessages = userMessages.filter((m) => m.timestamp > oneHourAgo);
            if (recentMessages.length > 20) {
                patterns.push({
                    type: "rapid_posting",
                    severity: recentMessages.length > 50 ? "high" : "medium",
                    userId: user._id,
                    username: user.username,
                    name: user.name,
                    description: `${recentMessages.length} messages in the last hour`,
                    count: recentMessages.length,
                });
            }

            // 2. New account spam: Account < 24h old with > 10 messages
            const accountAge = now - user.createdAt;
            const isNewAccount = accountAge < 24 * 60 * 60 * 1000;
            if (isNewAccount && userMessages.length > 10) {
                patterns.push({
                    type: "new_account_spam",
                    severity: userMessages.length > 30 ? "high" : "medium",
                    userId: user._id,
                    username: user.username,
                    name: user.name,
                    description: `New account (${Math.round(accountAge / (60 * 60 * 1000))}h old) with ${userMessages.length} messages`,
                    count: userMessages.length,
                });
            }

            // 3. Duplicate messages: Same content posted multiple times in last 24h
            const dayMessages = userMessages.filter((m) => m.timestamp > oneDayAgo && !m.deletedAt);
            const contentMap = new Map<string, number>();
            for (const msg of dayMessages) {
                const content = msg.content.toLowerCase().trim();
                if (content.length > 3) {
                    contentMap.set(content, (contentMap.get(content) || 0) + 1);
                }
            }
            const maxDupes = Math.max(0, ...Array.from(contentMap.values()));
            if (maxDupes >= 3) {
                patterns.push({
                    type: "duplicate_messages",
                    severity: maxDupes >= 5 ? "high" : "medium",
                    userId: user._id,
                    username: user.username,
                    name: user.name,
                    description: `Same message repeated ${maxDupes} times in 24h`,
                    count: maxDupes,
                });
            }

            // 4. High delete rate: User has many soft-deleted messages
            const deletedMessages = userMessages.filter((m) => m.deletedAt);
            if (deletedMessages.length >= 5 && deletedMessages.length > userMessages.length * 0.3) {
                patterns.push({
                    type: "high_delete_rate",
                    severity: deletedMessages.length > 10 ? "high" : "low",
                    userId: user._id,
                    username: user.username,
                    name: user.name,
                    description: `${deletedMessages.length} of ${userMessages.length} messages moderated (${Math.round((deletedMessages.length / userMessages.length) * 100)}%)`,
                    count: deletedMessages.length,
                });
            }
        }

        // Sort by severity (high first)
        const severityOrder = { high: 0, medium: 1, low: 2 };
        patterns.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

        return patterns;
    },
});
