import { Resend } from 'resend';

// Initialize Resend lazily to avoid crashing during build time if the API key is missing.
export const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Sends a single transactional email via Resend.
 * 
 * @param params Options for sending the email
 * @returns The resulting data or error from Resend
 */
export async function sendTransactionalEmail({
    to,
    subject,
    html,
    text,
    replyTo,
    idempotencyKey
}: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    replyTo?: string | string[];
    idempotencyKey?: string;
}) {
    if (!process.env.RESEND_API_KEY) {
        throw new Error("RESEND_API_KEY is not configured.");
    }

    try {
        const payload: any = {
            // "from" needs to be verified on the Resend dashboard. 
            // We use the application domain the user confirmed: vtschat.app
            from: 'VTS Chat <notifications@vtschat.app>',
            to,
            subject,
        };

        if (html) payload.html = html;
        if (text) payload.text = text;
        if (replyTo) payload.reply_to = replyTo;

        const options: any = {};
        if (idempotencyKey) {
            options.idempotencyKey = idempotencyKey;
        }

        if (!resend) {
            throw new Error("Resend client is not initialized.");
        }

        const response = await resend.emails.send(payload, options);

        // Log to Convex if successful
        if (!response.error && process.env.NEXT_PUBLIC_CONVEX_URL) {
            try {
                const { ConvexHttpClient } = await import("convex/browser");
                const { api } = await import("@/convex/_generated/api");
                const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

                await convex.mutation((api as any).emails.logOutboundEmail, {
                    to: Array.isArray(to) ? to : [to],
                    subject,
                    bodyHtml: html,
                    bodyText: text,
                });
            } catch (logError) {
                console.error("Failed to log outbound email to Convex:", logError);
            }
        }

        return response;
    } catch (error) {
        console.error("Error sending email via Resend:", error);
        return { data: null, error };
    }
}
