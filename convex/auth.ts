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
            isAdmin: false,
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
