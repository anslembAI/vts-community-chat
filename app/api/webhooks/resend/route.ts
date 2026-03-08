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
            const emailId = event.data?.email_id || event.data?.id;
            console.log("Received new inbound email. Event ID:", emailId);

            let bodyHtml = undefined;
            let bodyText = undefined;

            // Since the webhook only gives metadata, we must fetch the full content
            if (emailId && process.env.RESEND_API_KEY) {
                try {
                    const { Resend } = await import("resend");
                    const resend = new Resend(process.env.RESEND_API_KEY);
                    // For inbound (receiving) emails, we use the .emails.receiving.get() method.
                    const { data: fullEmail } = await (resend.emails as any).receiving.get(emailId);

                    if (fullEmail) {
                        bodyHtml = (fullEmail as any).html;
                        bodyText = (fullEmail as any).text;
                        console.log("Successfully fetched inbound email body content from Resend.");
                    }
                } catch (fetchError) {
                    console.error("Failed to fetch full email body from Resend:", fetchError);
                }
            }

            // Map attachments if applicable
            const attachmentsCount = event.data?.attachments?.length || 0;

            // Save to Convex database
            const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
            if (convexUrl) {
                const { ConvexHttpClient } = await import("convex/browser");
                const { api } = await import("@/convex/_generated/api");

                console.log("Calling Convex mutation receiveInboundEmail at:", convexUrl);
                const convex = new ConvexHttpClient(convexUrl);

                const result = await convex.mutation((api as any).emails.receiveInboundEmail, {
                    from: event.data?.from || "unknown",
                    to: event.data?.to || [],
                    subject: event.data?.subject || "No Subject",
                    bodyHtml,
                    bodyText,
                    attachmentsCount
                });

                console.log("Convex mutation result:", result);
                return NextResponse.json({ success: true, convexResult: result });
            } else {
                console.error("CRITICAL: NEXT_PUBLIC_CONVEX_URL is missing in environment!");
                return new NextResponse("Convex URL missing", { status: 500 });
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
