import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useRef } from "react";
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

    // Use ref for audio to persist between renders without state triggers
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastPlayedRef = useRef<number>(0);
    const isAudioUnlocked = useRef<boolean>(false);

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

    // Initialize audio instance once and setup unlock listeners
    useEffect(() => {
        if (!audioRef.current) {
            const audio = new Audio("/sounds/premium-soft-pop.mp3");
            audio.preload = "auto";
            audioRef.current = audio;
        }

        // ONE-TIME interaction listener to unlock audio context silently
        const unlockAudio = () => {
            if (isAudioUnlocked.current || !audioRef.current) return;

            // Try to play and pause immediately to unlock the audio context for this document
            const p = audioRef.current.play();
            if (p !== undefined) {
                p.then(() => {
                    audioRef.current?.pause();
                    audioRef.current!.currentTime = 0;
                    isAudioUnlocked.current = true;
                    // Remove listeners once unlocked to keep DOM clean
                    document.removeEventListener('keydown', unlockAudio);
                    document.removeEventListener('pointerdown', unlockAudio);
                }).catch((e) => {
                    // Fail silently, waiting for next interaction
                });
            }
        };

        // Listen for user interactions that count as "user gestures" for autoplay policy
        document.addEventListener('keydown', unlockAudio);
        document.addEventListener('pointerdown', unlockAudio);

        return () => {
            document.removeEventListener('keydown', unlockAudio);
            document.removeEventListener('pointerdown', unlockAudio);
        };
    }, []);

    // Update volume when settings change
    useEffect(() => {
        if (audioRef.current) {
            // Apply volume setting (0-100 mapped to 0-1)
            audioRef.current.volume = (settings.volume ?? 75) / 100;
        }
    }, [settings.volume]);

    // Handle channel updates
    useEffect(() => {
        if (!channelActivity || !sessionId || !userId || !audioRef.current) return;

        // Initialize map on first run without playing sound
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
        // Global mute checks
        if (settings.muteUntil && settings.muteUntil > now) return;
        if (settings.enabled === false) return;

        let shouldPlay = false;

        channelActivity.forEach((c) => {
            const currentId = c.lastMessageId;
            if (!currentId) return;

            const prevId = lastSeenMap.current.get(c._id);

            // Check if this is a new message we haven't processed
            if (currentId !== prevId) {
                // Update map immediately
                lastSeenMap.current.set(c._id, currentId);

                // Validation:
                // 1. Message must be recent (within last 10s)
                // 2. Sender must NOT be current user
                const isRecent = c.lastMessageTime ? (now - c.lastMessageTime < 10000) : false;
                const isOthersMessage = c.lastSenderId !== userId;

                if (isRecent && isOthersMessage) {
                    if (settings.mode === "always") {
                        shouldPlay = true;
                    } else if (settings.mode === "smart") {
                        // Smart Mode: Play only if tab hidden OR user is in different channel
                        const isTabHidden = document.visibilityState === "hidden";
                        const inThisChannel = pathname === `/channel/${c._id}`;

                        if (isTabHidden || !inThisChannel) {
                            shouldPlay = true;
                        }
                    }
                }
            }
        });

        // Trigger sound if conditions met
        if (shouldPlay) {
            // Cooldown check: Prevent overlapping sounds (e.g., burst of messages)
            // Minimum 200ms gap between sounds
            if (now - lastPlayedRef.current > 200) {
                const audio = audioRef.current;
                audio.currentTime = 0; // Reset to start

                // Try to play - we rely on the unlockAudio logic above to have prepared the context
                const p = audio.play();
                if (p !== undefined) {
                    p.then(() => {
                        lastPlayedRef.current = now;
                    }).catch((e) => {
                        // Silent fail if autoplay blocked - prevents spamming user
                    });
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [channelActivity, sessionId, userId, pathname, settings.enabled, settings.mode, settings.muteUntil]);
}
