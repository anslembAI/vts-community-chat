import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuth } from "./permissions";

export const getCommunityStats = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        // Just verify auth
        await requireAuth(ctx, args.sessionId);

        // 1) Global online count
        // Note: we can use the same logic as globalOnlineCount if possible, or just query presence.
        const activePresence = await ctx.db
            .query("presence")
            .withIndex("by_lastSeen", (q) => q.gt("lastSeen", Date.now() - 60000))
            .collect();
        const globalOnlineCount = activePresence.filter(p => p.status !== "offline").length;

        // 2) Active channels count (activity within last 10 minutes)
        const tenMinsAgo = Date.now() - 10 * 60 * 1000;
        const channels = await ctx.db.query("channels").collect();
        const activeChannelsCount = channels.filter(
            (c) => c.lastMessageTime && c.lastMessageTime >= tenMinsAgo
        ).length;

        // 3) Messages today count
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayMs = startOfDay.getTime();

        const messagesToday = await ctx.db
            .query("messages")
            .withIndex("by_creation_time", (q) => q.gte("_creationTime", startOfDayMs))
            .collect();
        const messagesTodayCount = messagesToday.length;

        return {
            globalOnlineCount,
            activeChannelsCount,
            messagesTodayCount,
        };
    },
});
