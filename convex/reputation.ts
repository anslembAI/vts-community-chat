import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";
import { requireAuth, requireAdmin } from "./permissions";
import { Id, Doc } from "./_generated/dataModel";

// ─── Badge Definitions ──────────────────────────────────────────────

export const BADGE_DEFINITIONS: Record<string, {
    label: string;
    emoji: string;
    description: string;
    color: string;
}> = {
    contributor: {
        label: "Contributor",
        emoji: "💬",
        description: "Active community participant",
        color: "blue",
    },
    trusted_member: {
        label: "Trusted Member",
        emoji: "🛡️",
        description: "Recognized for reliability and helpfulness",
        color: "green",
    },
    verified: {
        label: "Verified",
        emoji: "✅",
        description: "Identity verified by an admin",
        color: "cyan",
    },
    top_contributor: {
        label: "Top Contributor",
        emoji: "🏆",
        description: "Highest reputation in the community",
        color: "amber",
    },
};

// ─── Reputation Point Values ────────────────────────────────────────

const REPUTATION_POINTS = {
    message_sent: 1,
    poll_voted: 2,
    poll_created: 3,
    money_request_fulfilled: 5,
    reaction_received: 1,
};

// ─── Get User Reputation Stats ──────────────────────────────────────
// Computes live stats by counting across tables.

export const getUserReputation = query({
    args: {
        userId: v.id("users"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) return null;

        // Message count (top-level, non-poll messages)
        const messages = await ctx.db
            .query("messages")
            .collect();
        const userMessages = messages.filter(
            (m) => m.userId === args.userId && m.type !== "poll"
        );
        const messageCount = userMessages.length;

        // Poll participation (votes cast)
        const pollVotes = await ctx.db
            .query("pollVotes")
            .collect();
        const userPollVotes = pollVotes.filter((v) => v.userId === args.userId);
        const pollParticipationCount = userPollVotes.length;

        // Polls created
        const polls = await ctx.db
            .query("polls")
            .collect();
        const userPollsCreated = polls.filter((p) => p.createdBy === args.userId).length;

        // Money requests fulfilled (marked_paid by the user as requester)
        const moneyRequests = await ctx.db
            .query("moneyRequests")
            .collect();
        const fulfilledMoneyRequests = moneyRequests.filter(
            (mr) => mr.requesterId === args.userId && mr.status === "paid"
        ).length;

        // Reactions received on user's messages
        const userMessageIds = new Set(userMessages.map((m) => m._id));
        const reactions = await ctx.db
            .query("message_reactions")
            .collect();
        const reactionsReceived = reactions.filter((r) => userMessageIds.has(r.messageId)).length;

        // Compute reputation score
        const computedReputation =
            messageCount * REPUTATION_POINTS.message_sent +
            pollParticipationCount * REPUTATION_POINTS.poll_voted +
            userPollsCreated * REPUTATION_POINTS.poll_created +
            fulfilledMoneyRequests * REPUTATION_POINTS.money_request_fulfilled +
            reactionsReceived * REPUTATION_POINTS.reaction_received;

        return {
            userId: args.userId,
            username: user.username,
            name: user.name,
            imageUrl: user.imageUrl,
            isAdmin: user.isAdmin,
            reputation: computedReputation,
            storedReputation: user.reputation ?? 0,
            badges: user.badges ?? [],
            badgesGrantedAt: user.badgesGrantedAt ?? [],
            stats: {
                messageCount,
                pollParticipationCount,
                pollsCreated: userPollsCreated,
                moneyRequestsFulfilled: fulfilledMoneyRequests,
                reactionsReceived,
            },
            memberSince: user.createdAt,
        };
    },
});

// ─── Get Badge Definitions (for frontend display) ───────────────────

export const getBadgeDefinitions = query({
    args: {},
    handler: async () => {
        return BADGE_DEFINITIONS;
    },
});

// ─── Get Leaderboard ────────────────────────────────────────────────
// Returns top users ranked by computed reputation score.

export const getLeaderboard = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 10;
        const users = await ctx.db.query("users").collect();

        // For each user, compute a lightweight reputation score
        const messages = await ctx.db.query("messages").collect();
        const pollVotes = await ctx.db.query("pollVotes").collect();
        const polls = await ctx.db.query("polls").collect();
        const moneyRequests = await ctx.db.query("moneyRequests").collect();
        const reactions = await ctx.db.query("message_reactions").collect();

        const leaderboard = users.map((user) => {
            const userMsgs = messages.filter(
                (m) => m.userId === user._id && m.type !== "poll"
            );
            const msgCount = userMsgs.length;
            const pollVoteCount = pollVotes.filter((v) => v.userId === user._id).length;
            const pollsCreated = polls.filter((p) => p.createdBy === user._id).length;
            const moneyFulfilled = moneyRequests.filter(
                (mr) => mr.requesterId === user._id && mr.status === "paid"
            ).length;
            const userMsgIds = new Set(userMsgs.map((m) => m._id));
            const rxnReceived = reactions.filter((r) => userMsgIds.has(r.messageId)).length;

            const reputation =
                msgCount * REPUTATION_POINTS.message_sent +
                pollVoteCount * REPUTATION_POINTS.poll_voted +
                pollsCreated * REPUTATION_POINTS.poll_created +
                moneyFulfilled * REPUTATION_POINTS.money_request_fulfilled +
                rxnReceived * REPUTATION_POINTS.reaction_received;

            return {
                _id: user._id,
                username: user.username,
                name: user.name,
                imageUrl: user.imageUrl,
                isAdmin: user.isAdmin,
                reputation,
                badges: user.badges ?? [],
                stats: {
                    messageCount: msgCount,
                    pollParticipationCount: pollVoteCount,
                    moneyRequestsFulfilled: moneyFulfilled,
                },
            };
        });

        // Sort descending by reputation
        leaderboard.sort((a, b) => b.reputation - a.reputation);

        return leaderboard.slice(0, limit);
    },
});

// ─── Admin: Grant Badge ─────────────────────────────────────────────

export const adminGrantBadge = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
        badge: v.string(),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        if (!BADGE_DEFINITIONS[args.badge]) {
            throw new Error(`Invalid badge: "${args.badge}". Valid badges: ${Object.keys(BADGE_DEFINITIONS).join(", ")}`);
        }

        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found.");

        const currentBadges = user.badges ?? [];
        const currentTimestamps = user.badgesGrantedAt ?? [];

        if (currentBadges.includes(args.badge)) {
            throw new Error("User already has this badge.");
        }

        await ctx.db.patch(args.userId, {
            badges: [...currentBadges, args.badge],
            badgesGrantedAt: [...currentTimestamps, Date.now()],
        });
    },
});

// ─── Admin: Revoke Badge ────────────────────────────────────────────

export const adminRevokeBadge = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
        badge: v.string(),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found.");

        const currentBadges = user.badges ?? [];
        const currentTimestamps = user.badgesGrantedAt ?? [];

        const index = currentBadges.indexOf(args.badge);
        if (index === -1) {
            throw new Error("User does not have this badge.");
        }

        const newBadges = [...currentBadges];
        const newTimestamps = [...currentTimestamps];
        newBadges.splice(index, 1);
        newTimestamps.splice(index, 1);

        await ctx.db.patch(args.userId, {
            badges: newBadges,
            badgesGrantedAt: newTimestamps,
        });
    },
});

// ─── Admin: Adjust Reputation ───────────────────────────────────────
// Allows admins to manually adjust a user's stored reputation bonus.

export const adminAdjustReputation = mutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
        amount: v.number(), // positive or negative
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        const user = await ctx.db.get(args.userId);
        if (!user) throw new Error("User not found.");

        const current = user.reputation ?? 0;
        await ctx.db.patch(args.userId, {
            reputation: Math.max(0, current + args.amount),
        });
    },
});
