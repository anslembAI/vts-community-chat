import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { Resend } from "resend";
import { internal } from "./_generated/api";
// Resend initialization happens locally in actions to prevent compiler errors if env vars aren't synced.

// --- Queries ---

export const getEmails = query({
    args: { sessionId: v.string() },
    handler: async (ctx, args) => {
        // Only admins can view emails
        const userSession = await ctx.db
            .query("user_sessions")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
            .first();

        if (!userSession) return [];
        const user = await ctx.db.get(userSession.userId);
        if (!user || !user.isAdmin) return [];

        return await ctx.db.query("emails").withIndex("by_createdAt").order("desc").collect();
    },
});

export const getUnreadCount = query({
    args: { sessionId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.sessionId) return 0;
        const userSession = await ctx.db
            .query("user_sessions")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId as string))
            .first();

        if (!userSession) return 0;
        const user = await ctx.db.get(userSession.userId);
        if (!user || !user.isAdmin) return 0;

        // We only care about unread inbound emails
        const unreadInbound = await ctx.db
            .query("emails")
            .withIndex("by_direction", (q) => q.eq("direction", "inbound"))
            .filter((q) => q.eq(q.field("read"), false))
            .collect();

        return unreadInbound.length;
    },
});

// --- Mutations ---

export const markAsRead = mutation({
    args: { sessionId: v.string(), emailId: v.id("emails") },
    handler: async (ctx, args) => {
        const userSession = await ctx.db
            .query("user_sessions")
            .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
            .first();

        if (!userSession) throw new Error("Unauthorized");
        const user = await ctx.db.get(userSession.userId);
        if (!user || !user.isAdmin) throw new Error("Unauthorized");

        await ctx.db.patch(args.emailId, { read: true });
    },
});

// Using internalMutation because we only want the Next.js API route to call this.
export const receiveInboundEmail = internalMutation({
    args: {
        from: v.string(),
        to: v.array(v.string()),
        subject: v.string(),
        bodyHtml: v.optional(v.string()),
        bodyText: v.optional(v.string()),
        attachmentsCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("emails", {
            direction: "inbound",
            from: args.from,
            to: args.to,
            subject: args.subject || "No Subject",
            bodyHtml: args.bodyHtml,
            bodyText: args.bodyText,
            read: false,
            createdAt: Date.now(),
            attachmentsCount: args.attachmentsCount || 0,
        });
    },
});

// Internal log so the action can log the sent email
export const logOutboundEmail = internalMutation({
    args: {
        to: v.array(v.string()),
        subject: v.string(),
        bodyHtml: v.optional(v.string()),
        bodyText: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("emails", {
            direction: "outbound",
            from: "VTS Chat <notifications@vtschat.app>",
            to: args.to,
            subject: args.subject,
            bodyHtml: args.bodyHtml,
            bodyText: args.bodyText,
            read: true, // Outbound emails are implicitly read
            createdAt: Date.now(),
        });
    },
});


// --- Actions ---

export const sendAnnouncementEmail = action({
    args: {
        sessionId: v.optional(v.string()), // Optional, could be triggered automatically
        announcementContent: v.string(),
        channelName: v.string(),
    },
    handler: async (ctx, args) => {
        // Collect all users who have an email set
        const usersWithEmail = await ctx.runQuery((internal as any).users.getUsersWithEmail);
        const recipients = usersWithEmail.map((u: any) => u.email).filter(Boolean) as string[];

        if (recipients.length === 0) return { success: true, message: "No users with emails" };

        const subject = `New Announcement in #${args.channelName}`;
        const html = `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <h2 style="color: #000;">New Announcement in #${args.channelName}</h2>
      <p style="white-space: pre-wrap; font-size: 16px; line-height: 1.5; background: #f9f9f9; padding: 15px; border-radius: 8px;">${args.announcementContent}</p>
      <hr style="border: none; border-top: 1px solid #ccc; margin-top: 30px;" />
      <p style="font-size: 12px; color: #666;">You're receiving this because you have an email associated with your VTS Chat account.</p>
    </div>`;

        // Batch or single send depending on size
        // Resend batch max is 100, but we can do a single email with multiple BCC or just use batch endpoint.
        // For simplicity, we'll try sending in a single Resend API call using 'bcc' or loop. 
        // Wait, the easiest is sending individually using batch or passing array to `bcc` so they don't see each other.

        try {
            if (!process.env.RESEND_API_KEY) {
                console.error("No RESEND_API_KEY");
                return { success: false, error: "Missing config" };
            }

            const resend = new Resend(process.env.RESEND_API_KEY);

            // We use batch so each user gets a personalized-looking 'to' address without bcc leaking
            const batches = [];
            for (const recipient of recipients) {
                batches.push({
                    from: 'VTS Chat <notifications@vtschat.app>',
                    to: [recipient],
                    subject,
                    html,
                    text: args.announcementContent,
                });
            }

            // Chunking the batch sends into max 100 each
            for (let i = 0; i < batches.length; i += 100) {
                const chunk = batches.slice(i, i + 100);
                await resend.batch.send(chunk);
            }

            // Log the outbound email
            await ctx.runMutation((internal as any).emails.logOutboundEmail, {
                to: ["<multiple users>"],
                subject,
                bodyHtml: html,
                bodyText: args.announcementContent,
            });

            return { success: true };
        } catch (error) {
            console.error("Announcement email failed:", error);
            return { success: false, error: "Failed to send email" };
        }
    },
});
