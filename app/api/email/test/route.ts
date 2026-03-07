import { NextRequest, NextResponse } from "next/server";
import { sendTransactionalEmail } from "@/lib/resend";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { to, subject, message } = body;

        if (!to || !subject || !message) {
            return new NextResponse("Missing required fields: to, subject, or message.", { status: 400 });
        }

        const result = await sendTransactionalEmail({
            to,
            subject,
            html: `<p>${message.replace(/\n/g, "<br />")}</p>`,
            text: message,
            // Example of a unique idempotency key logic - preventing duplicate triggers
            idempotencyKey: `test-email/${Date.now()}`
        });

        if (result?.error) {
            return NextResponse.json({ success: false, error: (result.error as any).message || "Unknown error" }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result });

    } catch (error: any) {
        console.error("Test email delivery failed:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
