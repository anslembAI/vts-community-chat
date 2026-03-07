import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";

export async function POST(req: NextRequest) {
    const payload = await req.text();
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    if (!webhookSecret) {
        return new NextResponse("Webhook secret missing in environment", { status: 500 });
    }

    // Capture standard Svix webhook headers necessary for verification
    const id = req.headers.get("svix-id");
    const timestamp = req.headers.get("svix-timestamp");
    const signature = req.headers.get("svix-signature");

    if (!id || !timestamp || !signature) {
        return new NextResponse("Missing svix signature headers", { status: 400 });
    }

    let event: any;

    const headers = {
        "svix-id": id,
        "svix-signature": signature,
        "svix-timestamp": timestamp,
    };

    try {
        const wh = new Webhook(webhookSecret);
        event = wh.verify(payload, headers);
    } catch (err: any) {
        console.error("Resend Webhook verification failed:", err.message);
        return new NextResponse("Invalid webhook signature", { status: 400 });
    }

    console.log("Verified Resend Webhook Event Type:", event?.type);

    try {
        // Handle specific Resend events
        if (event.type === "email.received") {
            // An incoming email from a user/outside address hits the vtschat.app domain.
            console.log("Received new email from:", event.data?.from, "subject:", event.data?.subject);

            // Map attachments if applicable
            const attachmentsCount = event.data?.attachments?.length || 0;

            // Save to Convex database
            const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
            if (convexUrl) {
                const { ConvexHttpClient } = await import("convex/browser");
                const { api } = await import("@/convex/_generated/api");
                const convex = new ConvexHttpClient(convexUrl);

                await convex.mutation((api as any).emails.receiveInboundEmail, {
                    from: event.data?.from || "unknown",
                    to: event.data?.to || [],
                    subject: event.data?.subject || "No Subject",
                    bodyHtml: event.data?.html,
                    bodyText: event.data?.text,
                    attachmentsCount
                });
            }
        } else if (event.type === "email.bounced" || event.type === "email.complained") {
            // Address delivery issues or spam warnings
            // Log this so we can automatically throttle or block the sender via our database.
            console.warn(`Delivery failure or complaint for email: ${event.data?.to}`);
        }
        else if (event.type === "email.delivered") {
            // Optional: confirm sending status.
            console.log(`Successfully delivered email to ${event.data?.to}`);
        }

        return new NextResponse("OK", { status: 200 });

    } catch (error: any) {
        console.error("Error processing resend webhook:", error);
        return new NextResponse("Error processing webhook", { status: 500 }); // NOTE: Resend might retry this.
    }
}
