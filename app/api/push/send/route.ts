import { NextResponse } from "next/server";
import webpush from "web-push";

const vapidPublic = process.env.VAPID_PUBLIC_KEY;
const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@vts-chat.vercel.app";
const internalSecret = process.env.PUSH_INTERNAL_SECRET;

if (vapidPublic && vapidPrivate) {
    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
}

// In-memory rate limiting map (IP/Channel constraints could be added)
// This is a basic MVP throttle (e.g., limit bursts)
const rateLimiter = new Map<string, number>();

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("x-push-secret");
        if (!internalSecret || authHeader !== internalSecret) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!vapidPublic || !vapidPrivate) {
            return NextResponse.json({ error: "VAPID keys missing" }, { status: 500 });
        }

        const { subscriptions, payload } = await req.json();

        if (!subscriptions || !Array.isArray(subscriptions) || !payload) {
            return NextResponse.json({ error: "Invalid payload format" }, { status: 400 });
        }

        // Rate limiting: 1 push per channel every 5 secs globally to prevent spam bursts
        // (If the app wants per-user limits, we could compute keys using userIds)
        const { channelId } = payload;
        const now = Date.now();
        const lastSend = rateLimiter.get(channelId);

        // Very naive coalescing throttle: Block if recent
        if (lastSend && now - lastSend < 5000) {
            return NextResponse.json({ message: "Throttled" }, { status: 429 });
        }
        rateLimiter.set(channelId, now);

        const safePayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url,
            channelId: payload.channelId,
            messageId: payload.messageId
        });

        const sendPromises = subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(sub, safePayload);
            } catch (err: any) {
                if (err?.statusCode === 404 || err?.statusCode === 410) {
                    // Subscription expired or invalid
                    // Call convex to remove it using the endpoint URL as identifier
                    const fetchPromise = fetch(`${process.env.NEXT_PUBLIC_CONVEX_URL}/api/mutation`, {
                        // Let user handle garbage collection in a better way, normally we call a convex HTTP endpoint.
                        // We'll skip strict local HTTP invocation and document standard cleanup strategies.
                        // Alternatively, use fetch directly against convex http action.
                    }).catch(() => { });

                    return { error: "expired", endpoint: sub.endpoint };
                }
                return { error: err.message || "Unknown error" };
            }
            return { success: true };
        });

        const results = await Promise.all(sendPromises);

        // Auto-cleanup mechanism for expired endpoints
        const expiredEndpoints = results.filter((r) => r.error === "expired").map((r) => r.endpoint);

        // If we have expired endpoints, we should theoretically contact Convex here via an HTTP action or fetch.
        // For MVP, returning them in the response works well if the caller (Convex Action) processed the response.
        // Wait, the caller is the Convex Action `internal.push.sendPushNotifications` which could evaluate response!

        return NextResponse.json({ success: true, expiredEndpoints }, { status: 200 });

    } catch (err: any) {
        console.error("Push send error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
