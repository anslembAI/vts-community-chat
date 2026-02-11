
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

// --- Exchange Rates ---

export const getExchangeRate = query({
    args: {},
    handler: async (ctx) => {
        const rateRecord = await ctx.db.query("exchangeRates").first();
        if (!rateRecord) {
            // Return default seed if not set
            return {
                base: "USD",
                quote: "TTD",
                rate: 8.4,
                updatedAt: Date.now(),
            };
        }
        return rateRecord;
    },
});

export const updateExchangeRate = mutation({
    args: {
        sessionId: v.id("sessions"),
        newRate: v.number(),
        note: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user || !user.isAdmin) {
            throw new Error("Unauthorized: Only admins can update rates");
        }

        if (args.newRate <= 0 || args.newRate > 50) {
            throw new Error("Invalid rate. Must be between 0 and 50.");
        }

        const currentRateRecord = await ctx.db.query("exchangeRates").first();
        const oldRate = currentRateRecord ? currentRateRecord.rate : 8.4; // Default if first time

        // Update or insert
        if (currentRateRecord) {
            await ctx.db.patch(currentRateRecord._id, {
                rate: args.newRate,
                updatedBy: userId,
                updatedAt: Date.now(),
                note: args.note,
            });
        } else {
            await ctx.db.insert("exchangeRates", {
                base: "USD",
                quote: "TTD",
                rate: args.newRate,
                updatedBy: userId,
                updatedAt: Date.now(),
                note: args.note,
            });
        }

        // Log history
        await ctx.db.insert("exchangeRateHistory", {
            base: "USD",
            quote: "TTD",
            oldRate: oldRate,
            newRate: args.newRate,
            updatedBy: userId,
            updatedAt: Date.now(),
            note: args.note,
        });
    },
});

export const getExchangeRateHistory = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");
        const user = await ctx.db.get(userId);
        if (!user || !user.isAdmin) throw new Error("Unauthorized");

        const history = await ctx.db.query("exchangeRateHistory").order("desc").take(10);

        return await Promise.all(history.map(async (entry) => {
            const user = await ctx.db.get(entry.updatedBy);
            return {
                ...entry,
                user: user ? { name: user.name, username: user.username } : null
            };
        }));
    },
});


// --- Money Requests ---

export const createMoneyRequest = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        recipientId: v.optional(v.id("users")), // Optional, request to anyone
        amount: v.number(),
        currency: v.union(v.literal("USD"), v.literal("TTD")),
        note: v.optional(v.string()),
        dueDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        const isAdmin = user?.isAdmin;

        // Check channel type
        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");
        if (channel.type !== "money_request") {
            throw new Error("Money requests are not allowed in this channel");
        }

        // Check membership
        const membership = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) =>
                q.eq("channelId", args.channelId).eq("userId", userId)
            )
            .first();

        // Allow if member OR admin
        if (!membership && !isAdmin) throw new Error("You must be a member of the channel");

        // Get current Rate
        const rateRecord = await ctx.db.query("exchangeRates").first();
        const rate = rateRecord ? rateRecord.rate : 8.4;

        // Calculate conversions
        let convertedAmount = 0;
        let convertedCurrency: "USD" | "TTD" = "USD";

        if (args.currency === "USD") {
            convertedAmount = args.amount * rate;
            convertedCurrency = "TTD";
        } else {
            convertedAmount = args.amount / rate;
            convertedCurrency = "USD";
        }

        // Round to 2 decimals
        convertedAmount = Math.round(convertedAmount * 100) / 100;


        const requestId = await ctx.db.insert("moneyRequests", {
            channelId: args.channelId,
            requesterId: userId,
            recipientId: args.recipientId,
            amount: args.amount,
            currency: args.currency,
            note: args.note,
            dueDate: args.dueDate,
            status: "pending",
            rateLocked: rate,
            convertedAmount: convertedAmount,
            convertedCurrency: convertedCurrency,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        // Log Activity
        await ctx.db.insert("moneyRequestActivity", {
            requestId: requestId,
            action: "created",
            actorId: userId,
            timestamp: Date.now(),
        });

        return requestId;
    },
});

export const listMoneyRequests = query({
    args: {
        channelId: v.id("channels"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        // Ideally check membership first
        if (args.sessionId) {
            const userId = await getAuthUserId(ctx, args.sessionId);
            if (userId) {
                const user = await ctx.db.get(userId);
                const isAdmin = user?.isAdmin;

                const membership = await ctx.db
                    .query("channel_members")
                    .withIndex("by_channelId_userId", (q) =>
                        q.eq("channelId", args.channelId).eq("userId", userId)
                    )
                    .first();
                if (!membership && !isAdmin) return []; // Or throw error
            }
        }

        const requests = await ctx.db
            .query("moneyRequests")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .order("desc") // Newest first
            .take(50);

        // Enhance with user info
        const requestsWithInfo = await Promise.all(
            requests.map(async (req) => {
                const requester = await ctx.db.get(req.requesterId);
                const recipient = req.recipientId ? await ctx.db.get(req.recipientId) : null;
                return {
                    ...req,
                    requester,
                    recipient,
                };
            })
        );

        return requestsWithInfo;
    },
});

export const respondToMoneyRequest = mutation({
    args: {
        sessionId: v.id("sessions"),
        requestId: v.id("moneyRequests"),
        action: v.union(
            v.literal("accepted"),
            v.literal("declined"),
            v.literal("cancelled"),
            v.literal("marked_paid")
        ),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        const isAdmin = user?.isAdmin;

        const request = await ctx.db.get(args.requestId);
        if (!request) throw new Error("Request not found");

        if (args.action === "cancelled") {
            if (request.requesterId !== userId && !isAdmin) {
                throw new Error("Only the requester or admin can cancel");
            }
            // Admins can cancel even if accepted (to void it), users only if pending
            if (!isAdmin && request.status !== "pending") {
                throw new Error("Can only cancel pending requests");
            }
            // If admin cancels an accepted request, they can.

            await ctx.db.patch(request._id, { status: "cancelled", updatedAt: Date.now() });
        } else if (args.action === "accepted" || args.action === "declined") {
            // Logic for recipient
            if (request.recipientId) {
                if (request.recipientId !== userId) throw new Error("Not the recipient");
            } else {
                // If no specific recipient, anyone in channel (except requester?) can accept/decline??
                // Usually "money request to channel" means "who can pay me?". First to accept takes it.
                if (request.requesterId === userId) throw new Error("Cannot accept your own request");
                // Check channel membership
                const membership = await ctx.db
                    .query("channel_members")
                    .withIndex("by_channelId_userId", (q) =>
                        q.eq("channelId", request.channelId).eq("userId", userId)
                    )
                    .first();
                if (!membership) throw new Error("Must be channel member");

                // If accepting, assign recipient
                if (args.action === "accepted") {
                    await ctx.db.patch(request._id, { recipientId: userId });
                }
            }

            if (request.status !== "pending") throw new Error("Request is not pending");

            await ctx.db.patch(request._id, { status: args.action, updatedAt: Date.now() });

        } else if (args.action === "marked_paid") {
            if (request.status !== "accepted") throw new Error("Request must be accepted first");
            // Only requester or recipient can mark paid? usually requester confirms payment.
            // Prompt says "mark_paid allowed for requester or recipient".
            // Admins can also mark paid.
            if (request.requesterId !== userId && request.recipientId !== userId && !isAdmin) {
                throw new Error("Unauthorized");
            }
            await ctx.db.patch(request._id, { status: "paid", updatedAt: Date.now() });
        }

        // Log activity
        await ctx.db.insert("moneyRequestActivity", {
            requestId: request._id,
            action: args.action,
            actorId: userId,
            timestamp: Date.now(),
        });
    },
});

export const getMoneyRequestActivity = query({
    args: {
        requestId: v.id("moneyRequests"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        // Basic auth/membership check (optional but good)
        if (args.sessionId) {
            const userId = await getAuthUserId(ctx, args.sessionId);
            if (!userId) return [];
        }

        const activities = await ctx.db
            .query("moneyRequestActivity")
            .withIndex("by_requestId", (q) => q.eq("requestId", args.requestId))
            .order("desc")
            .collect();

        return await Promise.all(activities.map(async (act) => {
            const actor = await ctx.db.get(act.actorId);
            return {
                ...act,
                actorName: actor?.name || actor?.username || "Unknown",
            };
        }));
    }
});
