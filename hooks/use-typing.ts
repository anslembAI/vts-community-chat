"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Id } from "@/convex/_generated/dataModel";

const DEBOUNCE_MS = 2000;
const STOP_TYPING_DELAY_MS = 3000;

export function useTypingIndicator(channelId: Id<"channels"> | undefined) {
    const { sessionId } = useAuth();
    const setTyping = useMutation(api.typing.setTyping);

    const typingUsers = useQuery(
        api.typing.getTypingUsers,
        channelId ? (sessionId ? { channelId, sessionId } : { channelId }) : "skip"
    );

    const lastSentRef = useRef(0);
    const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);

    const sendStopTyping = useCallback(() => {
        if (!sessionId || !isTypingRef.current || !channelId) return;

        isTypingRef.current = false;
        lastSentRef.current = 0;
        setTyping({ sessionId, channelId, isTyping: false }).catch(() => {});

        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
            stopTimeoutRef.current = null;
        }
    }, [channelId, sessionId, setTyping]);

    const sendStartTyping = useCallback(() => {
        if (!sessionId || !channelId) return;

        const now = Date.now();
        if (now - lastSentRef.current > DEBOUNCE_MS) {
            lastSentRef.current = now;
            isTypingRef.current = true;
            setTyping({ sessionId, channelId, isTyping: true }).catch(() => {});
        }

        if (stopTimeoutRef.current) {
            clearTimeout(stopTimeoutRef.current);
        }
        stopTimeoutRef.current = setTimeout(sendStopTyping, STOP_TYPING_DELAY_MS);
    }, [channelId, sendStopTyping, sessionId, setTyping]);

    useEffect(() => {
        return () => {
            if (stopTimeoutRef.current) {
                clearTimeout(stopTimeoutRef.current);
            }
            if (isTypingRef.current && sessionId && channelId) {
                setTyping({ sessionId, channelId, isTyping: false }).catch(() => {});
                isTypingRef.current = false;
            }
        };
    }, [channelId, sessionId, setTyping]);

    return {
        typingUsers: typingUsers ?? [],
        sendStartTyping,
        sendStopTyping,
    };
}
