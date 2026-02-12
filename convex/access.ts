import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin, requireAuth } from "./permissions";
import { hashPassword } from "./crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Admin: Generate One-Time Password for Channel Access
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates an 8-digit random code, hashes it, and stores it.
 * Returns the PLAIN TEXT code to the admin (single view).
 */
export const generateChannelAccessCode = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        targetUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const admin = await requireAuth(ctx, args.sessionId);
        requireAdmin(admin);

        const channel = await ctx.db.get(args.channelId);
        if (!channel) throw new Error("Channel not found");

        const targetUser = await ctx.db.get(args.targetUserId);
        if (!targetUser) throw new Error("User not found");

        // 1. Generate 8-digit random code
        const code = generateRandomCode(8);

        // 2. Hash the code for storage
        const hashedCode = await hashPassword(code);

        // 3. Store
        await ctx.db.insert("channel_access_codes", {
            code: hashedCode,
            channelId: args.channelId,
            targetUserId: args.targetUserId,
            createdBy: admin._id,
            createdAt: Date.now(),
            used: false,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        });

        // 4. Usage Log
        await ctx.db.insert("moderation_log", {
            action: "badge_granted", // Using generic/closest match
            actorId: admin._id,
            targetUserId: targetUser._id,
            targetChannelId: channel._id,
            reason: "Generated Access Code",
            timestamp: Date.now(),
        });

        return code;
    },
});

function generateRandomCode(length: number) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, 1, O, 0
    let result = "";
    const randomBytes = new Uint8Array(length);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < length; i++) {
        result += chars[randomBytes[i] % chars.length];
    }
    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// User: Redeem Access Code
// ─────────────────────────────────────────────────────────────────────────────

export const redeemChannelAccessCode = mutation({
    args: {
        sessionId: v.id("sessions"),
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        // 1. Hash the input code
        const hashedCode = await hashPassword(args.code.trim().toUpperCase());

        // 2. Find the code record
        const accessCode = await ctx.db
            .query("channel_access_codes")
            .withIndex("by_code", (q) => q.eq("code", hashedCode))
            .first();

        if (!accessCode) {
            return { success: false, error: "Invalid access code." };
        }

        if (accessCode.used) {
            return { success: false, error: "This code has already been used." };
        }

        if (accessCode.expiresAt && Date.now() > accessCode.expiresAt) {
            return { success: false, error: "This code has expired." };
        }

        if (accessCode.targetUserId !== user._id) {
            return { success: false, error: "Error: Access denied. Please contact an administrator." };
        }

        // 3. Grant access
        const existing = await ctx.db
            .query("channel_lock_overrides")
            .withIndex("by_channelId_userId", (q) =>
                q.eq("channelId", accessCode.channelId).eq("userId", user._id)
            )
            .first();

        if (!existing) {
            await ctx.db.insert("channel_lock_overrides", {
                channelId: accessCode.channelId,
                userId: user._id,
                grantedAt: Date.now(),
                grantedBy: accessCode.createdBy,
            });
        }

        // 4. Mark code as used
        await ctx.db.patch(accessCode._id, { used: true });

        // 5. Join the channel if not already a member
        const membership = await ctx.db
            .query("channel_members")
            .withIndex("by_channelId_userId", (q) =>
                q.eq("channelId", accessCode.channelId).eq("userId", user._id)
            )
            .first();

        if (!membership) {
            await ctx.db.insert("channel_members", {
                channelId: accessCode.channelId,
                userId: user._id,
                joinedAt: Date.now(),
            });
        }

        return { success: true, channelId: accessCode.channelId };
    },
});
