/**
 * Permission helpers for server-side enforcement.
 * All critical checks happen here — never trust the client.
 */

import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { getAuthUserId } from "./authUtils";

// ─── requireAuth ────────────────────────────────────────────────────
// Returns the full user doc or throws.
export async function requireAuth(
    ctx: QueryCtx | MutationCtx,
    sessionId: Id<"sessions">
): Promise<Doc<"users">> {
    const userId = await getAuthUserId(ctx, sessionId);
    if (!userId) throw new Error("Unauthenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    return user;
}

// ─── requireAdmin ───────────────────────────────────────────────────
// Throws if user is not admin.
export function requireAdmin(user: Doc<"users">): void {
    if (user.role && user.role === "admin") return;
    if (user.isAdmin) return;
    throw new Error("Forbidden: Admin access required.");
}

// ─── requireModerator ───────────────────────────────────────────────
// Throws if user is not admin AND not moderator.
export function requireModerator(user: Doc<"users">): void {
    if (user.role === "admin" || user.role === "moderator") return;
    if (user.isAdmin) return; // Legacy admin flag implies superuser
    throw new Error("Forbidden: Moderator access required.");
}

// Checks membership. Admins always pass.
export async function requireChannelMember(
    ctx: QueryCtx | MutationCtx,
    channelId: Id<"channels">,
    user: Doc<"users">
): Promise<void> {
    // Admin always allowed per matrix: "View channel content: members only (admin always allowed)"
    if (user.role === "admin" || user.isAdmin) return;

    const membership = await ctx.db
        .query("channel_members")
        .withIndex("by_channelId_userId", (q) =>
            q.eq("channelId", channelId).eq("userId", user._id)
        )
        .first();

    if (!membership) {
        throw new Error("You must be a member of this channel.");
    }
}

// ─── requireChannelUnlockedOrAdmin ──────────────────────────────────
// If the channel is locked and user is NOT admin → throw.
export async function requireChannelUnlockedOrAdmin(
    ctx: QueryCtx | MutationCtx,
    channelId: Id<"channels">,
    user: Doc<"users">
): Promise<Doc<"channels">> {
    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    if (channel.locked && !user.isAdmin) {
        // Check for override
        const override = await ctx.db
            .query("channel_lock_overrides")
            .withIndex("by_channelId_userId", (q) =>
                q.eq("channelId", channelId).eq("userId", user._id)
            )
            .first();

        if (!override) {
            throw new Error("This channel is locked by an admin. You cannot perform this action.");
        }
    }

    return channel;
}

// ─── requireOwner ───────────────────────────────────────────────────
// Checks if userId matches ownerId.
export function requireOwner(userId: Id<"users">, ownerId: Id<"users">): void {
    if (userId !== ownerId) {
        throw new Error("You do not own this resource.");
    }
}

// ─── requireChannelType ─────────────────────────────────────────────
// Checks that a channel matches an expected type.
export async function requireChannelType(
    ctx: QueryCtx | MutationCtx,
    channelId: Id<"channels">,
    expectedType: "chat" | "money_request" | "announcement"
): Promise<Doc<"channels">> {
    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    const channelType = channel.type ?? "chat";
    if (channelType !== expectedType) {
        throw new Error(
            `This action requires a "${expectedType}" channel (got "${channelType}").`
        );
    }

    return channel;
}

// ─── requireWithinEditWindow ────────────────────────────────────────
// Checks that a timestamp is within `minutes` of now.
export function requireWithinEditWindow(
    createdAt: number,
    minutes: number = 10
): void {
    const windowMs = minutes * 60 * 1000;
    if (Date.now() - createdAt > windowMs) {
        throw new Error(
            `Edit window of ${minutes} minutes has expired.`
        );
    }
}

// ─── requireAnnouncementAdminPost ───────────────────────────────────
// If the channel is an announcement channel, only admins can post.
export async function requireAnnouncementAdminPost(
    ctx: QueryCtx | MutationCtx,
    channelId: Id<"channels">,
    user: Doc<"users">
): Promise<void> {
    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    if (channel.type === "announcement" && !user.isAdmin) {
        throw new Error("Only administrators can post in announcement channels.");
    }
}

// ─── requireNotSuspended ────────────────────────────────────────────
// Throws if the user account is suspended.
export function requireNotSuspended(user: Doc<"users">): void {
    if (user.suspended) {
        throw new Error(
            "Your account has been suspended. You cannot perform this action."
        );
    }
}
