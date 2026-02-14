import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePathname } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

interface ChannelActivity {
    _id: Id<"channels">;
    lastMessageId?: Id<"messages">;
    lastMessageTime?: number;
    lastSenderId?: Id<"users">;
}

export function useGlobalMessageSound() {
    const { sessionId, userId } = useAuth();
    const pathname = usePathname();
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

    // Fetch user settings
    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
    const settings = currentUser?.soundSettings || {
        enabled: true,
        mode: "smart" as const,
        volume: 75,
        muteUntil: 0,
    };

    // Fetch channel activity
    const channelActivity = useQuery(api.channels.getChannelActivity, { sessionId: sessionId ?? undefined });

    // State to track last seen messages
    const lastSeenMap = useRef<Map<string, string>>(new Map());
    const isFirstRun = useRef(true);

    // Initialize audio
    useEffect(() => {
        const audioInstance = new Audio("/sounds/message.mp3");
        setAudio(audioInstance);
    }, []);

    // Update audio volume when settings change
    useEffect(() => {
        if (audio) {
            audio.volume = (settings.volume ?? 75) / 100;
        }
    }, [audio, settings.volume]);

    useEffect(() => {
        if (!channelActivity || !sessionId || !userId || !audio) return;

        // On first run, just populate the map
        if (isFirstRun.current) {
            channelActivity.forEach((c) => {
                if (c.lastMessageId) {
                    lastSeenMap.current.set(c._id, c.lastMessageId);
                }
            });
            isFirstRun.current = false;
            return;
        }

        const now = Date.now();
        // Check if globally muted
        if (settings.muteUntil && settings.muteUntil > now) return;
        if (settings.enabled === false) return;

        let shouldPlay = false;

        channelActivity.forEach((c) => {
            const currentId = c.lastMessageId;
            if (!currentId) return;

            const prevId = lastSeenMap.current.get(c._id);

            // New message detected
            if (currentId !== prevId) {
                // Update map immediately
                lastSeenMap.current.set(c._id, currentId);

                // Conditions to play sound:
                // 1. Not sent by current user
                // 2. Not too old (e.g. within last 10 seconds)
                const isRecent = c.lastMessageTime ? (now - c.lastMessageTime < 10000) : false;
                const isOthersMessage = c.lastSenderId !== userId;

                if (isRecent && isOthersMessage) {
                    if (settings.mode === "always") {
                        shouldPlay = true;
                    } else if (settings.mode === "smart") {
                        // Smart Mode:
                        // Play if tab is hidden OR user is NOT in this channel
                        const isTabHidden = document.visibilityState === "hidden";
                        const inThisChannel = pathname === `/channel/${c._id}`;

                        if (isTabHidden || !inThisChannel) {
                            shouldPlay = true;
                        }
                    }
                }
            }
        });

        if (shouldPlay) {
            audio.currentTime = 0;
            // Play sound with catch for autoplay policy
            audio.play().catch((e) => {
                // Ignore autoplay errors
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelActivity, sessionId, userId, audio, pathname, settings.enabled, settings.mode, settings.muteUntil, settings.volume]);
}
