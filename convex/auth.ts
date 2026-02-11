import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

import { hashPassword } from "./crypto";

export const signIn = mutation({
    args: {
        username: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();

        if (!user) {
            throw new Error("Invalid username or password");
        }

        const hashedPassword = await hashPassword(args.password);
        if (hashedPassword !== user.password) {
            throw new Error("Invalid username or password");
        }

        const sessionId = await ctx.db.insert("sessions", {
            userId: user._id,
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
        });

        return sessionId;
    },
});

export const signUp = mutation({
    args: {
        username: v.string(),
        password: v.string(),
        confirmPassword: v.optional(v.string()) // Handled on client, but good to have signature match if needed
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();

        if (existingUser) {
            throw new Error("Username already taken");
        }

        const hashedPassword = await hashPassword(args.password);

        const userId = await ctx.db.insert("users", {
            username: args.username,
            password: hashedPassword,
            name: args.username, // Default display name to username
            role: "user",
            isAdmin: false,
            reputation: 0,
            badges: [],
            createdAt: Date.now(),
        });

        const sessionId = await ctx.db.insert("sessions", {
            userId: userId,
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
        });

        return sessionId;
    },
});

export const signOut = mutation({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.sessionId);
    },
});

export const validateSession = query({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            return null;
        }
        if (session.expiresAt < Date.now()) {
            return null;
        }
        const user = await ctx.db.get(session.userId);
        if (!user) {
            return null;
        }
        return {
            ...user,
            sessionId: session._id,
        };
    },
});
