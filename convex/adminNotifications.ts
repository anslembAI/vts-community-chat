import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";

// Timezone for mute expiration
const TIMEZONE = "America/Port_of_Spain";

function getEndOfDayInTimezone(): number {
    const now = new Date();
    // Get the date string in the target timezone
    const format = new Intl.DateTimeFormat("en-US", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "numeric",
        day: "numeric",
    });
    const parts = format.formatToParts(now);
    const day = parts.find((p) => p.type === "day")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const year = parts.find((p) => p.type === "year")?.value;

    if (!day || !month || !year) throw new Error("Could not parse date");

    // Create a date object for the NEXT day at 00:00:00 in that timezone
    // Actually, let's just create a string and parse it, or manipulate safely.
    // Easier approach: Get "YYYY-MM-DD" for today in timezone.
    // Construct "YYYY-MM-DD 23:59:59.999" and get its timestamp.

    const dateString = `${year}-${month}-${day} 23:59:59.999`;
    // We need to parse this AS if it is in the timezone.
    // JS Date parsing is tricky with timezones without library.

    // Alternative:
    // 1. Get offset of timezone.
    // 2. Add offset to UTC.
    // ... complicated without libraries.

    // Let's stick to a simpler approximation if needed, or use a robust method if possible.
    // The robust method:
    // Create a date object, set time to 23:59:59, then use toLocaleString with timezone to check if we need to shift.
    // OR just use the string constructor if supported? No, risky.

    // Let's use `en-US` format with `timeZone` to get components, then explicit construction?
    // Actually, `new Date("MM/DD/YYYY 23:59:59")` uses local time.

    // Best native way:
    // 1. Get components in timezone.
    // 2. Construct a UTC date with those components.
    // 3. Subtract the timezone offset? Offset varies by DST.

    // Let's try to just use a fixed offset? Trinidad is UTC-4 year round (AST).
    // NO DST in Trinidad.
    // So simple calculation: UTC-4.
    const OFFSET_HOURS = -4;

    // Current UTC time
    const utcNow = Date.now();
    // Current Local time in Trinidad
    const localTime = utcNow + (OFFSET_HOURS * 60 * 60 * 1000);

    // Create a date object for local time
    const localDate = new Date(localTime);

    // Set to end of day
    localDate.setUTCHours(23, 59, 59, 999);

    // Convert back to UTC timestamp
    // We have "Local End of Day". To get UTC timestamp, we SUBTRACT the offset.
    const endOfDayTimestamp = localDate.getTime() - (OFFSET_HOURS * 60 * 60 * 1000);

    return endOfDayTimestamp;
}

// ─── Queries ────────────────────────────────────────────────────────

export const getAdminNotifications = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const adminId = await getAuthUserId(ctx, args.sessionId ?? null);
        if (!adminId) return [];

        const admin = await ctx.db.get(adminId);
        if (!admin?.isAdmin && admin?.role !== "admin") return [];

        const notifications = await ctx.db
            .query("adminNotifications")
            .withIndex("by_adminId", (q) => q.eq("adminId", adminId))
            .order("desc") // Latest first
            .take(50);

        // Enrich with channel and sender info
        const notifsWithInfo = await Promise.all(
            notifications.map(async (n) => {
                const channel = await ctx.db.get(n.channelId);
                const sender = await ctx.db.get(n.senderId);
                return {
                    ...n,
                    channelName: channel?.name || "Unknown Channel",
                    senderName: sender?.name || sender?.username || "Unknown User",
                };
            })
        );

        return notifsWithInfo;
    },
});

export const getUnreadAdminNotificationCount = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const adminId = await getAuthUserId(ctx, args.sessionId ?? null);
        if (!adminId) return 0;

        const admin = await ctx.db.get(adminId);
        if (!admin?.isAdmin && admin?.role !== "admin") return 0;

        const unread = await ctx.db
            .query("adminNotifications")
            .withIndex("by_adminId_read", (q) => q.eq("adminId", adminId).eq("read", false))
            .collect();

        return unread.length;
    },
});

export const getChannelMuteStatus = query({
    args: {
        channelId: v.id("channels"),
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const adminId = await getAuthUserId(ctx, args.sessionId ?? null);
        if (!adminId) return { isMuted: false, muteUntil: 0 };

        const mute = await ctx.db
            .query("channelNotificationMutes")
            .withIndex("by_channelId_mutedBy", (q) => q.eq("channelId", args.channelId).eq("mutedBy", adminId))
            .first();

        const now = Date.now();
        if (mute && mute.muteUntil > now) {
            return { isMuted: true, muteUntil: mute.muteUntil };
        }

        return { isMuted: false, muteUntil: 0 };
    },
});

// ─── Mutations ──────────────────────────────────────────────────────

export const muteChannelNotifications = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        duration: v.union(v.literal("1h"), v.literal("4h"), v.literal("day")),
    },
    handler: async (ctx, args) => {
        const adminId = await getAuthUserId(ctx, args.sessionId);
        if (!adminId) throw new Error("Unauthenticated");

        const admin = await ctx.db.get(adminId);
        if (!admin?.isAdmin && admin?.role !== "admin") throw new Error("Unauthorized");

        const now = Date.now();
        let muteUntil = now;

        if (args.duration === "1h") {
            muteUntil = now + 60 * 60 * 1000;
        } else if (args.duration === "4h") {
            muteUntil = now + 4 * 60 * 60 * 1000;
        } else if (args.duration === "day") {
            muteUntil = getEndOfDayInTimezone();
        }

        // Check if already muted
        const existing = await ctx.db
            .query("channelNotificationMutes")
            .withIndex("by_channelId_mutedBy", (q) => q.eq("channelId", args.channelId).eq("mutedBy", adminId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                muteUntil,
            });
        } else {
            await ctx.db.insert("channelNotificationMutes", {
                channelId: args.channelId,
                mutedBy: adminId,
                muteUntil,
                createdAt: now,
            });
        }
    },
});

export const unmuteChannelNotifications = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const adminId = await getAuthUserId(ctx, args.sessionId);
        if (!adminId) throw new Error("Unauthenticated");

        const existing = await ctx.db
            .query("channelNotificationMutes")
            .withIndex("by_channelId_mutedBy", (q) => q.eq("channelId", args.channelId).eq("mutedBy", adminId))
            .first();

        if (existing) {
            // Effectively unmute by setting time to past or deleting?
            // Deleting is cleaner.
            await ctx.db.delete(existing._id);
        }
    },
});

export const markNotificationRead = mutation({
    args: {
        sessionId: v.id("sessions"),
        notificationId: v.id("adminNotifications"),
    },
    handler: async (ctx, args) => {
        const adminId = await getAuthUserId(ctx, args.sessionId);
        if (!adminId) throw new Error("Unauthenticated");

        const notif = await ctx.db.get(args.notificationId);
        if (notif && notif.adminId === adminId) {
            await ctx.db.patch(args.notificationId, { read: true });
        }
    },
});

export const markAllNotificationsRead = mutation({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const adminId = await getAuthUserId(ctx, args.sessionId);
        if (!adminId) throw new Error("Unauthenticated");

        const unread = await ctx.db
            .query("adminNotifications")
            .withIndex("by_adminId_read", (q) => q.eq("adminId", adminId).eq("read", false))
            .collect();

        await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));
    },
});
