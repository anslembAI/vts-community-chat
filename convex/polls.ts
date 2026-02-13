import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";
import {
    requireAuth,
    requireAdmin,
    requireChannelMember,
    requireChannelUnlockedOrAdmin,
} from "./permissions";

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
        scheduledFor: v.optional(v.number()),
        hideResultsBeforeClose: v.optional(v.boolean()),
        isAnnouncement: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        // Channel must be unlocked OR admin (admin always passes)
        const channel = await requireChannelUnlockedOrAdmin(ctx, args.channelId, user);

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

        const now = Date.now();

        // Validate scheduledFor is in the future
        const isScheduled = args.scheduledFor && args.scheduledFor > now;
        if (args.scheduledFor && args.scheduledFor <= now) {
            throw new Error("Scheduled time must be in the future.");
        }

        // Validate endsAt
        const effectiveStart = isScheduled ? args.scheduledFor! : now;
        if (args.endsAt && args.endsAt <= effectiveStart) {
            throw new Error("End time must be after the start/scheduled time.");
        }

        const status = isScheduled ? "scheduled" as const : "active" as const;

        // Create the poll
        const pollId = await ctx.db.insert("polls", {
            channelId: args.channelId,
            createdBy: user._id,
            question,
            options,
            allowMultiple: args.allowMultiple,
            anonymous: args.anonymous,
            allowChangeVote: args.allowChangeVote,
            status,
            endsAt: args.endsAt,
            scheduledFor: isScheduled ? args.scheduledFor : undefined,
            hideResultsBeforeClose: args.hideResultsBeforeClose ?? false,
            isAnnouncement: args.isAnnouncement ?? false,
            createdAt: now,
            updatedAt: now,
        });

        // Only post message + notifications if not scheduled
        if (!isScheduled) {
            await ctx.db.insert("messages", {
                channelId: args.channelId,
                userId: user._id,
                content: `📊 Poll: ${question}`,
                timestamp: now,
                edited: false,
                type: "poll",
                pollId: pollId,
            });

            // Send in-app notifications to all channel members
            const members = await ctx.db
                .query("channel_members")
                .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
                .collect();

            const announcementLabel = args.isAnnouncement ? " 📢" : "";
            for (const member of members) {
                if (member.userId !== user._id) {
                    await ctx.db.insert("notifications", {
                        userId: member.userId,
                        channelId: args.channelId,
                        type: "poll_created",
                        message: `New poll${announcementLabel}: "${question}" in #${channel.name}`,
                        pollId: pollId,
                        read: false,
                        createdAt: now,
                    });
                }
            }
        }

        return pollId;
    },
});

// ─── Publish Scheduled Poll (Admin Only) ────────────────────────────

export const publishScheduledPoll = mutation({
    args: {
        sessionId: v.id("sessions"),
        pollId: v.id("polls"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");
        if (poll.status !== "scheduled") throw new Error("Poll is not scheduled.");

        const now = Date.now();

        await ctx.db.patch(args.pollId, {
            status: "active",
            updatedAt: now,
        });

        // Post the message
        const channel = await ctx.db.get(poll.channelId);
        await ctx.db.insert("messages", {
            channelId: poll.channelId,
            userId: poll.createdBy,
            content: `📊 Poll: ${poll.question}`,
            timestamp: now,
            edited: false,
            type: "poll",
            pollId: args.pollId,
        });

        // Notify members
        const members = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId", (q) => q.eq("channelId", poll.channelId))
            .collect();

        for (const member of members) {
            if (member.userId !== poll.createdBy) {
                await ctx.db.insert("notifications", {
                    userId: member.userId,
                    channelId: poll.channelId,
                    type: "poll_created",
                    message: `New poll: "${poll.question}" in #${channel?.name ?? "channel"}`,
                    pollId: args.pollId,
                    read: false,
                    createdAt: now,
                });
            }
        }
    },
});

// ─── Duplicate Poll (Admin Only) ────────────────────────────────────

export const duplicatePoll = mutation({
    args: {
        sessionId: v.id("sessions"),
        sourcePollId: v.id("polls"),
        targetChannelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const source = await ctx.db.get(args.sourcePollId);
        if (!source) throw new Error("Source poll not found.");

        const channel = await ctx.db.get(args.targetChannelId);
        if (!channel) throw new Error("Target channel not found.");

        const now = Date.now();

        const pollId = await ctx.db.insert("polls", {
            channelId: args.targetChannelId,
            createdBy: user._id,
            question: source.question,
            options: source.options,
            allowMultiple: source.allowMultiple,
            anonymous: source.anonymous,
            allowChangeVote: source.allowChangeVote,
            status: "active",
            endsAt: source.endsAt ? Date.now() + (source.endsAt - source.createdAt) : undefined,
            hideResultsBeforeClose: source.hideResultsBeforeClose,
            isAnnouncement: source.isAnnouncement,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Post message
        await ctx.db.insert("messages", {
            channelId: args.targetChannelId,
            userId: user._id,
            content: `📊 Poll: ${source.question}`,
            timestamp: Date.now(),
            edited: false,
            type: "poll",
            pollId: pollId,
        });

        // Notify members
        const members = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.targetChannelId))
            .collect();

        for (const member of members) {
            if (member.userId !== user._id) {
                await ctx.db.insert("notifications", {
                    userId: member.userId,
                    channelId: args.targetChannelId,
                    type: "poll_created",
                    message: `New poll: "${source.question}" in #${channel.name}`,
                    pollId: pollId,
                    read: false,
                    createdAt: now,
                });
            }
        }

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
        const user = await requireAuth(ctx, args.sessionId);

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        // Check if poll is still active
        const isExpired = poll.endsAt && poll.endsAt <= Date.now();
        if (poll.status !== "active" || isExpired) {
            throw new Error("This poll is no longer accepting votes.");
        }

        // Check channel membership
        await requireChannelMember(ctx, poll.channelId, user);

        // Channel must be unlocked OR admin
        await requireChannelUnlockedOrAdmin(ctx, poll.channelId, user);

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

        const uniqueIndexes = [...new Set(args.optionIndexes)];

        // Check existing vote
        const existingVote = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId_userId", (q) =>
                q.eq("pollId", args.pollId).eq("userId", user._id)
            )
            .first();

        const now = Date.now();

        if (existingVote) {
            if (!poll.allowChangeVote) {
                throw new Error("You have already voted and cannot change your vote.");
            }
            await ctx.db.patch(existingVote._id, {
                optionIndexes: uniqueIndexes,
                updatedAt: now,
            });
        } else {
            await ctx.db.insert("pollVotes", {
                pollId: args.pollId,
                userId: user._id,
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
        const user = await requireAuth(ctx, args.sessionId);

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        if (!poll.allowChangeVote) {
            throw new Error("Voting changes are not allowed in this poll.");
        }

        const isExpired = poll.endsAt && poll.endsAt <= Date.now();
        if (poll.status !== "active" || isExpired) {
            throw new Error("This poll is no longer active.");
        }

        // Channel must be unlocked OR admin
        await requireChannelUnlockedOrAdmin(ctx, poll.channelId, user);

        const existingVote = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId_userId", (q) =>
                q.eq("pollId", args.pollId).eq("userId", user._id)
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
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        if (poll.status === "closed" || poll.status === "no_participation") {
            throw new Error("Poll is already closed.");
        }

        // Check if zero votes → mark as no_participation
        const votes = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId", (q) => q.eq("pollId", args.pollId))
            .collect();

        const finalStatus = votes.length === 0 ? "no_participation" as const : "closed" as const;

        await ctx.db.patch(args.pollId, {
            status: finalStatus,
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
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        // Delete all votes
        const votes = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId", (q) => q.eq("pollId", args.pollId))
            .collect();

        await Promise.all(votes.map((v) => ctx.db.delete(v._id)));

        // Delete notifications related to this poll
        // (no index on pollId, so query all for this channel and filter)
        const allNotifications = await ctx.db.query("notifications").collect();
        const pollNotifs = allNotifications.filter(n => n.pollId?.toString() === args.pollId.toString());
        await Promise.all(pollNotifs.map(n => ctx.db.delete(n._id)));

        // Update the message to show deletion placeholder
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

        let currentUserId = null;
        let isAdmin = false;
        if (args.sessionId) {
            currentUserId = await getAuthUserId(ctx, args.sessionId);
            if (currentUserId) {
                const user = await ctx.db.get(currentUserId);
                isAdmin = user?.isAdmin ?? false;
            }
        }

        // Check if expired
        const isExpired = poll.endsAt ? poll.endsAt <= Date.now() : false;
        let effectiveStatus = poll.status;

        if (poll.status === "active" && isExpired) {
            effectiveStatus = "closed";
        }

        // Get all votes
        const votes = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId", (q) => q.eq("pollId", args.pollId))
            .collect();

        // If expired + zero votes → no_participation
        if (effectiveStatus === "closed" && votes.length === 0 && isExpired) {
            effectiveStatus = "no_participation";
        }

        // Determine if results should be hidden
        const isClosed = effectiveStatus === "closed" || effectiveStatus === "no_participation";
        const hideResults = poll.hideResultsBeforeClose && !isClosed && !isAdmin;

        // Aggregate counts per option
        const optionCounts: number[] = new Array(poll.options.length).fill(0);
        let totalVotes = 0;
        let currentUserVote: number[] | null = null;

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
            optionCounts: hideResults ? poll.options.map(() => 0) : optionCounts,
            totalVotes: hideResults ? 0 : totalVotes,
            currentUserVote,
            votersByOption: poll.anonymous ? undefined : (hideResults ? undefined : votersByOption),
            creator: creator ? { name: creator.name, username: creator.username } : null,
            hideResults,
        };
    },
});

// ─── Get Active Polls for Channel (for pinning) ─────────────────────

export const getActivePollsForChannel = query({
    args: {
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const polls = await ctx.db
            .query("polls")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();

        const now = Date.now();
        return polls
            .filter(p => p.status === "active" && (!p.endsAt || p.endsAt > now))
            .sort((a, b) => b.createdAt - a.createdAt);
    },
});

// ─── Get Poll History for Channel ───────────────────────────────────

export const getPollHistory = query({
    args: {
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const polls = await ctx.db
            .query("polls")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();

        const now = Date.now();
        const closedPolls = polls.filter(p => {
            if (p.status === "closed" || p.status === "no_participation") return true;
            if (p.status === "active" && p.endsAt && p.endsAt <= now) return true;
            return false;
        });

        // Get vote counts and creator info
        const results = [];
        for (const poll of closedPolls.sort((a, b) => b.updatedAt - a.updatedAt)) {
            const votes = await ctx.db
                .query("pollVotes")
                .withIndex("by_pollId", (q) => q.eq("pollId", poll._id))
                .collect();

            const creator = await ctx.db.get(poll.createdBy);

            results.push({
                ...poll,
                totalVotes: votes.length,
                creator: creator ? { name: creator.name, username: creator.username } : null,
            });
        }

        return results;
    },
});

// ─── Get Scheduled Polls for Channel ────────────────────────────────

export const getScheduledPolls = query({
    args: {
        channelId: v.id("channels"),
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return [];

        const user = await ctx.db.get(userId);
        if (!user?.isAdmin) return [];

        const polls = await ctx.db
            .query("polls")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();

        return polls
            .filter(p => p.status === "scheduled")
            .sort((a, b) => (a.scheduledFor ?? 0) - (b.scheduledFor ?? 0));
    },
});

// ─── Export Poll Results (Admin Only) ───────────────────────────────

export const exportPollResults = query({
    args: {
        pollId: v.id("polls"),
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user?.isAdmin) throw new Error("Only admins can export poll results.");

        const poll = await ctx.db.get(args.pollId);
        if (!poll) throw new Error("Poll not found.");

        const votes = await ctx.db
            .query("pollVotes")
            .withIndex("by_pollId", (q) => q.eq("pollId", args.pollId))
            .collect();

        const optionCounts: number[] = new Array(poll.options.length).fill(0);
        const voterDetails: { username: string; name: string; votedFor: string[]; votedAt: number }[] = [];

        for (const vote of votes) {
            const voter = await ctx.db.get(vote.userId);
            const votedOptions = vote.optionIndexes
                .filter(idx => idx >= 0 && idx < poll.options.length)
                .map(idx => poll.options[idx]);

            for (const idx of vote.optionIndexes) {
                if (idx >= 0 && idx < poll.options.length) optionCounts[idx]++;
            }

            voterDetails.push({
                username: voter?.username ?? "unknown",
                name: voter?.name ?? voter?.username ?? "Unknown",
                votedFor: votedOptions,
                votedAt: vote.createdAt,
            });
        }

        return {
            question: poll.question,
            options: poll.options,
            optionCounts,
            totalVotes: votes.length,
            anonymous: poll.anonymous,
            voterDetails: poll.anonymous ? [] : voterDetails,
            createdAt: poll.createdAt,
            endsAt: poll.endsAt,
            status: poll.status,
        };
    },
});

// ─── Notifications ──────────────────────────────────────────────────

export const getMyNotifications = query({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return [];

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        return notifications.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    },
});

export const markNotificationRead = mutation({
    args: {
        sessionId: v.id("sessions"),
        notificationId: v.id("notifications"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const notification = await ctx.db.get(args.notificationId);
        if (!notification) throw new Error("Notification not found.");
        if (notification.userId !== userId) throw new Error("Not your notification.");

        await ctx.db.patch(args.notificationId, { read: true });
    },
});

export const markAllNotificationsRead = mutation({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_userId_read", (q) => q.eq("userId", userId).eq("read", false))
            .collect();

        await Promise.all(unread.map(n => ctx.db.patch(n._id, { read: true })));
    },
});

export const getUnreadNotificationCount = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        if (!args.sessionId) return 0;
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return 0;

        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_userId_read", (q) => q.eq("userId", userId).eq("read", false))
            .collect();

        return unread.length;
    },
});
