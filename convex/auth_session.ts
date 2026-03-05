import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { requireAuth, requireAdmin } from "./permissions";
import { getAuthUserId } from "./authUtils";

export const setActiveSession = mutation({
    args: {
        sessionId: v.id("sessions"), // The Convex auth session ID
        clientSessionId: v.string(), // The random UUID from client
        deviceLabel: v.string(),
        userAgent: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        const now = Date.now();

        // 1. Mark all existing sessions for this user as inactive
        const existingSessions = await ctx.db
            .query("user_sessions")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        for (const session of existingSessions) {
            await ctx.db.patch(session._id, { isActive: false });
        }

        // 2. Insert the new session
        await ctx.db.insert("user_sessions", {
            userId: user._id,
            sessionId: args.clientSessionId,
            deviceLabel: args.deviceLabel,
            userAgent: args.userAgent,
            isActive: true,
            createdAt: now,
            lastSeenAt: now,
        });

        // 3. Update the user document
        await ctx.db.patch(user._id, {
            activeSessionId: args.clientSessionId,
            activeSessionUpdatedAt: now,
            lastLoginAt: now,
            lastLoginDeviceLabel: args.deviceLabel,
            lastLoginUserAgent: args.userAgent,
        });

        // Keep only last 10 sessions (optional cleanup)
        const allSessions = await ctx.db
            .query("user_sessions")
            .withIndex("by_userId", (q) => q.eq("userId", user._id))
            .order("desc")
            .collect();

        if (allSessions.length > 10) {
            for (let i = 10; i < allSessions.length; i++) {
                await ctx.db.delete(allSessions[i]._id);
            }
        }

        return { success: true };
    },
});

export const getActiveSessionId = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        return user?.activeSessionId || null;
    },
});

export const heartbeat = mutation({
    args: {
        sessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db
            .query("user_sessions")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
            .first();

        if (session && session.isActive) {
            await ctx.db.patch(session._id, {
                lastSeenAt: Date.now(),
            });
        }
    },
});

export const forceLogoutUser = mutation({
    args: {
        sessionId: v.id("sessions"), // Admin's auth session
        userId: v.id("users"), // Target user to log out
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        await ctx.db.patch(args.userId, {
            activeSessionId: "FORCED_LOGOUT_" + Date.now(),
        });

        // Deactivate all sessions
        const sessions = await ctx.db
            .query("user_sessions")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();

        for (const s of sessions) {
            await ctx.db.patch(s._id, { isActive: false });
        }
    },
});

export const getAllSessions = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return [];

        const admin = await ctx.db.get(userId) as Doc<"users"> | null;
        if (!admin || (!admin.isAdmin && admin.role !== "admin")) return [];

        const users = await ctx.db.query("users").collect();
        const results = [];

        for (const user of users) {
            results.push({
                _id: user._id,
                username: user.username,
                name: user.name,
                lastLoginDeviceLabel: user.lastLoginDeviceLabel,
                lastLoginAt: user.lastLoginAt,
                activeSessionUpdatedAt: user.activeSessionUpdatedAt,
                activeSessionId: user.activeSessionId,
            });
        }
        return results;
    }
});

export const deactivateSession = mutation({
    args: {
        sessionId: v.id("sessions"),
        clientSessionId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return;

        const user = await ctx.db.get(userId);
        if (!user) return;

        if (user.activeSessionId === args.clientSessionId) {
            await ctx.db.patch(user._id, {
                activeSessionId: undefined,
            });
        }

        const session = await ctx.db
            .query("user_sessions")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", args.clientSessionId))
            .first();

        if (session && session.userId === user._id) {
            await ctx.db.patch(session._id, { isActive: false });
        }
    },
});

