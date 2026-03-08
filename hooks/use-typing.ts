"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCallback, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Id } from "@/convex/_generated/dataModel";

const DEBOUNCE_MS = 2000; // Minimum interval between setTyping(true) calls
const STOP_TYPING_DELAY_MS = 3000; // Stop typing after 3s of no keystrokes

export function useTypingIndicator(channelId: Id<"channels"> | undefined) {
    const { sessionId } = useAuth();
    const setTyping = useMutation(api.typing.setTyping);

    // Reactive query — returns who is typing (excluding current user)
    const typingUsers = useQuery(
        api.typing.getTypingUsers,
        channelId ? (sessionId ? { channelId, sessionId } : { channelId }) : "skip"
    );

    const lastSentRef = useRef<number>(0);
    const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    // Send "start typing" signal (debounced)
    const sendStartTyping = useCallback(() => {
        if (!sessionId) return;

        const now = Date.now();
        // Only send if enough time has passed since last call
        if (now - lastSentRef.current > DEBOUNCE_MS) {
            lastSentRef.current = now;
            isTypingRef.current = true;
            if (channelId) {
                setTyping({ sessionId, channelId, isTyping: true }).catch(() => {
                    // Silently ignore — non-critical
                });
            }
        }

        // Reset the "stop typing" timer
        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
        }
        stopTimeoutRef.current = setTimeout(() => {
            sendStopTyping();
        }, STOP_TYPING_DELAY_MS);
    }, [sessionId, channelId, setTyping]);

    // Send "stop typing" signal
    const sendStopTyping = useCallback(() => {
        if (!sessionId || !isTypingRef.current) return;
        isTypingRef.current = false;
        lastSentRef.current = 0; // Reset debounce so next keystroke fires immediately
        if (channelId) {
            setTyping({ sessionId, channelId, isTyping: false }).catch(() => {
                // Silently ignore
            });
        }

        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }
    }, [sessionId, channelId, setTyping]);

    // Cleanup on unmount or channel change
    useEffect(() => {
        return () => {
            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
            }
            // Try to send stop typing on cleanup
            if (isTypingRef.current && sessionId) {
                setTyping({ sessionId, channelId, isTyping: false }).catch(() => { });
                isTypingRef.current = false;
            }
        };
    }, [sessionId, channelId, setTyping]);

    return {
        typingUsers: typingUsers ?? [],
        sendStartTyping,
        sendStopTyping,
    };
}
