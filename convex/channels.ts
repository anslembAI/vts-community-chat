
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

// Fetch all channels with current user membership status and total member count
export const getChannelsWithMembership = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId || null);
        const channels = await ctx.db.query("channels").collect();

        // If not logged in, just return channels with 0 members (or fetch counts if needed for public view)
        // Ideally we fetch counts.

        const channelsWithData = await Promise.all(channels.map(async (channel) => {
            const memberCount = (await ctx.db
                .query("channel_members")
                .withIndex("by_channelId", (q) => q.eq("channelId", channel._id))
                .collect()).length;

            let isMember = false;
            if (userId) {
                const membership = await ctx.db
                    .query("channel_members")
                    .withIndex("by_channelId_userId", (q) => q.eq("channelId", channel._id).eq("userId", userId))
                    .first();
                isMember = !!membership;
            }

            return {
                ...channel,
                memberCount,
                isMember,
            };
        }));

        return channelsWithData;
    },
});

export const joinChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const existingMembership = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) => q.eq("channelId", args.channelId).eq("userId", userId))
            .first();

        if (existingMembership) {
            return; // Already a member
        }

        await ctx.db.insert("channel_members", {
            channelId: args.channelId,
            userId: userId,
            joinedAt: Date.now(),
        });
    },
});

export const leaveChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const membership = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) => q.eq("channelId", args.channelId).eq("userId", userId))
            .first();

        if (!membership) {
            return; // Not a member
        }

        await ctx.db.delete(membership._id);
    },
});

export const getChannels = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("channels").collect();
    },
});

export const createChannel = mutation({
    args: {
        sessionId: v.id("sessions"),
        name: v.string(),
        description: v.optional(v.string()),
        type: v.optional(v.union(v.literal("chat"), v.literal("money_request"))),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);

        if (!user || !user.isAdmin) {
            throw new Error("Unauthorized: Only admins can create channels");
        }

        return await ctx.db.insert("channels", {
            name: args.name,
            description: args.description,
            type: args.type || "chat",
            createdBy: user._id,
            createdAt: Date.now(),
        });
    },
});

export const getChannel = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.channelId);
    },
});
