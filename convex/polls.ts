import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

// ─── Create Poll (Admin Only) ───────────────────────────────────────

export const createPoll = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        question: v.string(),
        options: v.array(v.string()),
        allowMultiple: v.boolean(),
        anonymous: v.boolean(),
        allowChangeVote: v.boolean(),
        endsAt: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user?.isAdmin) throw new Error("Only admins can create polls.");

        // Validate question
        const question = args.question.trim();
        if (!question) throw new Error("Poll question is required.");
        if (question.length > 140) throw new Error("Poll question must be 140 characters or less.");

        // Validate options
        const options = args.options.map(o => o.trim()).filter(o => o.length > 0);
        if (options.length < 2) throw new Error("At least 2 options are required.");
        if (options.length > 6) throw new Error("Maximum 6 options allowed.");

        // Check for duplicate options
        const uniqueOptions = new Set(options.map(o => o.toLowerCase()));
        if (uniqueOptions.size !== options.length) {
            throw new Error("Options must be unique.");
        }

        // Validate channel exists
        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found.");

        // Validate endsAt is in the future
        if (args.endsAt && args.endsAt <= Date.now()) {
            throw new Error("End time must be in the future.");
        }

        const now = Date.now();

        // Create the poll
        const pollId = await ctx.db.insert("polls", {
            channelId: args.channelId,
            createdBy: userId,
            question,
            options,
            allowMultiple: args.allowMultiple,
            anonymous: args.anonymous,
            allowChangeVote: args.allowChangeVote,
            status: "active",
            endsAt: args.endsAt,
            createdAt: now,
            updatedAt: now,
        });

        // Insert a message of type "poll" into the channel
        await ctx.db.insert("messages", {
            channelId: args.channelId,
            userId: userId,
            content: `📊 Poll: ${question}`,
            timestamp: now,
            edited: false,
            type: "poll",
            pollId: pollId,
        });

        return pollId;
    },
});

// ─── Vote on Poll ───────────────────────────────────────────────────

export const voteOnPoll = mutation({
    args: {
        sessionId: v.id("sessions"),
        pollId: v.id("polls"),
        optionIndexes: v.array(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        // Check if poll is still active
        const isExpired = poll.endsAt && poll.endsAt <= Date.now();
        if (poll.status !== "active" || isExpired) {
            throw new Error("This poll is no longer accepting votes.");
        }

        // Check channel membership
        const membership = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) =>
                q.eq("channelId", poll.channelId).eq("userId", userId)
            )
            .first();

        // Allow admins to vote without membership
        const user = await ctx.db.get(userId);
        if (!membership && !user?.isAdmin) {
            throw new Error("You must be a channel member to vote.");
        }

        // Validate option indexes
        for (const idx of args.optionIndexes) {
            if (idx < 0 || idx >= poll.options.length || !Number.isInteger(idx)) {
                throw new Error("Invalid option selected.");
            }
        }

        // Enforce single choice
        if (!poll.allowMultiple && args.optionIndexes.length > 1) {
            throw new Error("This poll only allows one selection.");
        }

        if (args.optionIndexes.length === 0) {
            throw new Error("You must select at least one option.");
        }

        // Remove duplicates
        const uniqueIndexes = [...new Set(args.optionIndexes)];

        // Check existing vote
        const existingVote = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId_userId", (q) =>
                q.eq("pollId", args.pollId).eq("userId", userId)
            )
            .first();

        const now = Date.now();

        if (existingVote) {
            if (!poll.allowChangeVote) {
                throw new Error("You have already voted and cannot change your vote.");
            }
            // Update existing vote
            await ctx.db.patch(existingVote._id, {
                optionIndexes: uniqueIndexes,
                updatedAt: now,
            });
        } else {
            // Create new vote
            await ctx.db.insert("pollVotes", {
                pollId: args.pollId,
                userId: userId,
                optionIndexes: uniqueIndexes,
                createdAt: now,
                updatedAt: now,
            });
        }
    },
});

// ─── Remove Vote ────────────────────────────────────────────────────

export const removeVote = mutation({
    args: {
        sessionId: v.id("sessions"),
        pollId: v.id("polls"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        if (!poll.allowChangeVote) {
            throw new Error("Voting changes are not allowed in this poll.");
        }

        const isExpired = poll.endsAt && poll.endsAt <= Date.now();
        if (poll.status !== "active" || isExpired) {
            throw new Error("This poll is no longer active.");
        }

        const existingVote = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId_userId", (q) =>
                q.eq("pollId", args.pollId).eq("userId", userId)
            )
            .first();

        if (existingVote) {
            await ctx.db.delete(existingVote._id);
        }
    },
});

// ─── Close Poll (Admin Only) ────────────────────────────────────────

export const closePoll = mutation({
    args: {
        sessionId: v.id("sessions"),
        pollId: v.id("polls"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user?.isAdmin) throw new Error("Only admins can close polls.");

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        if (poll.status === "closed") {
            throw new Error("Poll is already closed.");
        }

        await ctx.db.patch(args.pollId, {
            status: "closed",
            updatedAt: Date.now(),
        });
    },
});

// ─── Delete Poll (Admin Only) ───────────────────────────────────────

export const deletePoll = mutation({
    args: {
        sessionId: v.id("sessions"),
        pollId: v.id("polls"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user?.isAdmin) throw new Error("Only admins can delete polls.");

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        // Delete all votes
        const votes = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId", (q) => q.eq("pollId", args.pollId))
            .collect();

        await Promise.all(votes.map((v) => ctx.db.delete(v._id)));

        // Update the message to show deletion placeholder
        // Find the message that references this poll
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_channelId", (q) => q.eq("channelId", poll.channelId))
            .collect();

        const pollMessage = messages.find(m => m.pollId?.toString() === args.pollId.toString());
        if (pollMessage) {
            await ctx.db.patch(pollMessage._id, {
                content: "📊 Poll removed by admin",
                pollId: undefined,
                type: "text",
            });
        }

        // Delete the poll
        await ctx.db.delete(args.pollId);
    },
});

// ─── Get Poll with Results ──────────────────────────────────────────

export const getPollWithResults = query({
    args: {
        pollId: v.id("polls"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const poll = await ctx.db.get(args.pollId);
        if (!poll) return null;

        // Get current user for "you voted" indicator
        let currentUserId = null;
        if (args.sessionId) {
            currentUserId = await getAuthUserId(ctx, args.sessionId);
        }

        // Check if expired
        const isExpired = poll.endsAt ? poll.endsAt <= Date.now() : false;
        const effectiveStatus = (poll.status === "active" && isExpired) ? "closed" : poll.status;

        // Get all votes
        const votes = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId", (q) => q.eq("pollId", args.pollId))
            .collect();

        // Aggregate counts per option
        const optionCounts: number[] = new Array(poll.options.length).fill(0);
        let totalVotes = 0;
        let currentUserVote: number[] | null = null;

        // Track voters per option (for non-anonymous polls)
        const votersByOption: { userId: string; username?: string; name?: string }[][] =
            poll.options.map(() => []);

        for (const vote of votes) {
            for (const idx of vote.optionIndexes) {
                if (idx >= 0 && idx < poll.options.length) {
                    optionCounts[idx]++;
                }
            }
            totalVotes++;

            if (currentUserId && vote.userId === currentUserId) {
                currentUserVote = vote.optionIndexes;
            }

            // Populate voter info for non-anonymous polls
            if (!poll.anonymous) {
                const voter = await ctx.db.get(vote.userId);
                for (const idx of vote.optionIndexes) {
                    if (idx >= 0 && idx < poll.options.length) {
                        votersByOption[idx].push({
                            userId: vote.userId,
                            username: voter?.username,
                            name: voter?.name,
                        });
                    }
                }
            }
        }

        // Get creator info
        const creator = await ctx.db.get(poll.createdBy);

        return {
            ...poll,
            effectiveStatus,
            optionCounts,
            totalVotes,
            currentUserVote,
            votersByOption: poll.anonymous ? undefined : votersByOption,
            creator: creator ? { name: creator.name, username: creator.username } : null,
        };
    },
});
