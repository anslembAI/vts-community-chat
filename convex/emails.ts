import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { Resend } from "resend";
import { api, internal } from "./_generated/api";
import { getAuthUserId } from "./authUtils";
import { Doc } from "./_generated/dataModel";
// Resend initialization happens locally in actions to prevent compiler errors if env vars aren't synced.

// --- Queries ---

export const getEmails = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return [];
        const user = (await ctx.db.get(userId)) as Doc<"users"> | null;
        if (!user || (!user.isAdmin && user.role !== "admin")) return [];

        return await ctx.db.query("emails").withIndex("by_createdAt").order("desc").collect();
    },
});

export const getUnreadCount = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return 0;
        const user = (await ctx.db.get(userId)) as Doc<"users"> | null;
        if (!user || (!user.isAdmin && user.role !== "admin")) return 0;

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
    args: { sessionId: v.id("sessions"), emailId: v.id("emails") },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthorized");
        const user = (await ctx.db.get(userId)) as Doc<"users"> | null;
        if (!user || (!user.isAdmin && user.role !== "admin")) throw new Error("Unauthorized");

        await ctx.db.patch(args.emailId, { read: true });
    },
});

// Changed to a public mutation so the Next.js API route can call it via ConvexHttpClient.
export const receiveInboundEmail = mutation({
    args: {
        from: v.string(),
        to: v.array(v.string()),
        subject: v.string(),
        bodyHtml: v.optional(v.string()),
        bodyText: v.optional(v.string()),
        attachmentsCount: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        console.log("--- receiveInboundEmail triggered ---");
        console.log("From:", args.from);
        console.log("Subject:", args.subject);

        const id = await ctx.db.insert("emails", {
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

        console.log("Email saved with ID:", id);
        return { success: true, emailId: id };
    },
});

// Changed to a public mutation so lib/resend.ts can log outbound emails via ConvexHttpClient.
export const logOutboundEmail = mutation({
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usersWithEmail = await ctx.runQuery((internal as any).users.getUsersWithEmail);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

            // Log the outbound email (call public mutation)
            await ctx.runMutation(api.emails.logOutboundEmail, {
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
