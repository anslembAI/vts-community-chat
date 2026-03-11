import { v } from "convex/values";
import { mutation, query, action, internalAction, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const setMasterPushEnabled = mutation({
    args: {
        sessionId: v.id("sessions"),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        // Basic auth requirement
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Unauthorized");
        const userId = session.userId;

        const existing = await ctx.db
            .query("userPushSettings")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { enabled: args.enabled, updatedAt: Date.now() });
        } else {
            await ctx.db.insert("userPushSettings", {
                userId,
                enabled: args.enabled,
                updatedAt: Date.now(),
            });
        }
    },
});

export const savePushSubscription = mutation({
    args: {
        sessionId: v.id("sessions"),
        deviceId: v.string(),
        subscription: v.object({
            endpoint: v.string(),
            expirationTime: v.optional(v.union(v.number(), v.null())),
            keys: v.object({
                p256dh: v.string(),
                auth: v.string(),
            }),
        }),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Unauthorized");
        const userId = session.userId;

        const existingMaster = await ctx.db
            .query("userPushSettings")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        if (!existingMaster?.enabled) {
            throw new Error("Master push is not enabled");
        }

        const existingSub = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId_deviceId", (q) => q.eq("userId", userId).eq("deviceId", args.deviceId))
            .first();

        if (existingSub) {
            await ctx.db.patch(existingSub._id, {
                subscription: args.subscription,
                updatedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("pushSubscriptions", {
                userId,
                deviceId: args.deviceId,
                subscription: args.subscription,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }
    },
});

export const removePushSubscription = mutation({
    args: {
        sessionId: v.id("sessions"),
        deviceId: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Unauthorized");
        const userId = session.userId;

        const existingSub = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId_deviceId", (q) => q.eq("userId", userId).eq("deviceId", args.deviceId))
            .first();

        if (existingSub) {
            await ctx.db.delete(existingSub._id);
        }
    },
});

export const removePushSubscriptionByEndpoint = internalMutation({
    args: { endpoint: v.string() },
    handler: async (ctx, args) => {
        const subs = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_endpoint", (q) => q.eq("subscription.endpoint", args.endpoint))
            .collect();

        for (const sub of subs) {
            await ctx.db.delete(sub._id);
        }
    },
});

export const setChannelPushEnabled = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Unauthorized");
        const userId = session.userId;

        // Verify membership
        const member = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) => q.eq("channelId", args.channelId).eq("userId", userId))
            .first();

        if (!member) throw new Error("Not a member of this channel");

        const existing = await ctx.db
            .query("channelPushSettings")
            .withIndex("by_channelId_userId", (q) => q.eq("channelId", args.channelId).eq("userId", userId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { enabled: args.enabled, updatedAt: Date.now() });
        } else {
            await ctx.db.insert("channelPushSettings", {
                userId,
                channelId: args.channelId,
                enabled: args.enabled,
                updatedAt: Date.now(),
            });
        }
    },
});

export const getMyPushSettings = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return { masterEnabled: false, channels: {} };
        const userId = session.userId;

        const master = await ctx.db
            .query("userPushSettings")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .first();

        const channelSettings = await ctx.db
            .query("channelPushSettings")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        const channels: Record<string, boolean> = {};
        for (const cs of channelSettings) {
            channels[cs.channelId] = cs.enabled;
        }

        return {
            masterEnabled: master?.enabled || false,
            channels,
        };
    },
});

export const getNotifiableSubscriptions = internalQuery({
    args: {
        channelId: v.id("channels"),
        senderId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const members = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();

        const subsToNotify = [];

        for (const member of members) {
            if (member.userId === args.senderId) continue;

            const master = await ctx.db
                .query("userPushSettings")
                .withIndex("by_userId", (q) => q.eq("userId", member.userId))
                .first();

            if (!master?.enabled) continue;

            const cSettings = await ctx.db
                .query("channelPushSettings")
                .withIndex("by_channelId_userId", (q) => q.eq("channelId", args.channelId).eq("userId", member.userId))
                .first();

            // Default true if not explicitly set
            if (cSettings && !cSettings.enabled) continue;

            const subs = await ctx.db
                .query("pushSubscriptions")
                .withIndex("by_userId", (q) => q.eq("userId", member.userId))
                .collect();

            subsToNotify.push(...subs.map((s) => s.subscription));
        }

        return subsToNotify;
    }
});

export const getNotifiableDirectMessageSubscriptions = internalQuery({
    args: {
        threadId: v.id("directMessageThreads"),
        senderId: v.id("users"),
        recipientId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const blocked = await ctx.db
            .query("directMessageBlocks")
            .withIndex("by_blockerId_blockedId", (q) =>
                q.eq("blockerId", args.recipientId).eq("blockedId", args.senderId)
            )
            .first();

        if (blocked) return [];

        const thread = await ctx.db.get(args.threadId);
        if (!thread || thread.mutedBy.includes(args.recipientId)) {
            return [];
        }

        const master = await ctx.db
            .query("userPushSettings")
            .withIndex("by_userId", (q) => q.eq("userId", args.recipientId))
            .first();

        if (!master?.enabled) return [];

        const subs = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", args.recipientId))
            .collect();

        return subs.map((sub) => sub.subscription);
    },
});

export const sendPushNotifications = internalAction({
    args: {
        channelId: v.id("channels"),
        senderId: v.id("users"),
        payload: v.object({
            title: v.string(),
            body: v.string(),
            url: v.string(),
            channelId: v.string(),
            messageId: v.string(),
        })
    },
    handler: async (ctx, args) => {
        const subscriptions = await ctx.runQuery(internal.push.getNotifiableSubscriptions, {
            channelId: args.channelId,
            senderId: args.senderId,
        });

        if (subscriptions.length === 0) return;

        const hostUrl = process.env.HOST_URL || "https://vtschat.app";
        const secret = process.env.PUSH_INTERNAL_SECRET || "default_secret";

        const response = await fetch(`${hostUrl}/api/push/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-push-secret": secret,
            },
            body: JSON.stringify({
                subscriptions,
                payload: args.payload,
            }),
        });

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            if (data.expiredEndpoints && data.expiredEndpoints.length > 0) {
                for (const endpoint of data.expiredEndpoints) {
                    await ctx.runMutation(internal.push.removePushSubscriptionByEndpoint, { endpoint });
                }
            }
        } else {
            console.error("Push API error", response.status, await response.text());
        }
    }
});

export const sendDirectMessagePushNotifications = internalAction({
    args: {
        threadId: v.id("directMessageThreads"),
        senderId: v.id("users"),
        recipientId: v.id("users"),
        payload: v.object({
            title: v.string(),
            body: v.string(),
            url: v.string(),
            threadId: v.id("directMessageThreads"),
        }),
    },
    handler: async (ctx, args) => {
        const subscriptions = await ctx.runQuery(internal.push.getNotifiableDirectMessageSubscriptions, {
            threadId: args.threadId,
            senderId: args.senderId,
            recipientId: args.recipientId,
        });

        if (subscriptions.length === 0) return;

        const hostUrl = process.env.HOST_URL || "https://vtschat.app";
        const secret = process.env.PUSH_INTERNAL_SECRET || "default_secret";

        const response = await fetch(`${hostUrl}/api/push/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-push-secret": secret,
            },
            body: JSON.stringify({
                subscriptions,
                payload: {
                    ...args.payload,
                    channelId: "dm",
                    messageId: args.threadId,
                },
            }),
        });

        if (response.ok) {
            const data = await response.json().catch(() => ({}));
            if (data.expiredEndpoints && data.expiredEndpoints.length > 0) {
                for (const endpoint of data.expiredEndpoints) {
                    await ctx.runMutation(internal.push.removePushSubscriptionByEndpoint, { endpoint });
                }
            }
        } else {
            console.error("Direct message push API error", response.status, await response.text());
        }
    },
});

export const runPushTest = mutation({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Unauthorized");
        const userId = session.userId;

        const subs = await ctx.db
            .query("pushSubscriptions")
            .withIndex("by_userId", (q) => q.eq("userId", userId))
            .collect();

        if (subs.length === 0) {
            throw new Error("No push subscriptions found for this device. Please re-enable notifications.");
        }

        await ctx.scheduler.runAfter(0, api.push.testPushAction, {
            userId,
            subscriptions: subs.map(s => s.subscription),
        });

        return { success: true };
    },
});

export const testPushAction = action({
    args: {
        userId: v.id("users"),
        subscriptions: v.array(v.any()),
    },
    handler: async (ctx, args) => {
        const hostUrl = process.env.HOST_URL || "https://vtschat.app";
        const secret = process.env.PUSH_INTERNAL_SECRET || "default_secret";

        await fetch(`${hostUrl}/api/push/send`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-push-secret": secret,
            },
            body: JSON.stringify({
                subscriptions: args.subscriptions,
                payload: {
                    title: "VTS Test Notification",
                    body: "If you see this, push notifications are working correctly!",
                    url: hostUrl,
                    channelId: "test",
                    messageId: "test",
                },
            }),
        });
    },
});
