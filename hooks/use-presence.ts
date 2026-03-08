"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

export type UserStatus = "online" | "away" | "dnd" | "offline";

export function usePresence() {
    const { sessionId, isAuthenticated } = useAuth();
    const params = useParams();
    const channelIdParam = params?.channelId as string | undefined;
    // Only use as ID if it looks like one (e.g. contains enough characters to be a Convex ID)
    // Actually, Convex IDs have a specific format. A safer way is to check if it's in our local channels list or just let it be.
    // Better: only pass to useQuery if it's defined AND we aren't likely dealing with a slug. 
    // In this app, slugs like "general" are short. Convex IDs are longer and have a specific format.
    const channelId = (channelIdParam && channelIdParam.length > 15) ? (channelIdParam as Id<"channels">) : undefined;

    const heartbeat = useMutation(api.presence.heartbeat);
    const counts = useQuery(api.presence.getPresenceCounts, { channelId });
    const myPresence = useQuery(api.presence.getMyPresence, sessionId ? { sessionId } : "skip");

    const [manualStatus, setManualStatus] = useState<UserStatus | null>(null);
    const [isInactive, setIsInactive] = useState(false);

    // Inactivity tracking
    useEffect(() => {
        let timeout: NodeJS.Timeout;

        const resetTimer = () => {
            setIsInactive(false);
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                setIsInactive(true);
            }, 60000); // 60 seconds
        };

        window.addEventListener("mousemove", resetTimer);
        window.addEventListener("keydown", resetTimer);
        window.addEventListener("click", resetTimer);
        window.addEventListener("scroll", resetTimer);

        resetTimer();

        return () => {
            window.removeEventListener("mousemove", resetTimer);
            window.removeEventListener("keydown", resetTimer);
            window.removeEventListener("click", resetTimer);
            window.removeEventListener("scroll", resetTimer);
            clearTimeout(timeout);
        };
    }, []);

    const currentStatus: UserStatus = manualStatus || (isInactive ? "away" : "online");

    // Keep DND if manually set, otherwise respect inactivity
    const effectiveStatus = manualStatus === "dnd" ? "dnd" : currentStatus;

    const doHeartbeat = useCallback(async () => {
        if (!isAuthenticated || !sessionId) return;
        try {
            await heartbeat({
                sessionId,
                channelId,
                status: effectiveStatus,
            });
        } catch (e) {
            console.error("Heartbeat failed", e);
        }
    }, [isAuthenticated, sessionId, channelId, effectiveStatus, heartbeat]);

    // Heartbeat interval
    useEffect(() => {
        if (!isAuthenticated) return;

        // Initial heartbeat
        doHeartbeat();

        const interval = setInterval(doHeartbeat, 15000); // 15 seconds
        return () => clearInterval(interval);
    }, [isAuthenticated, doHeartbeat]);

    // Immediate heartbeat on channel change
    useEffect(() => {
        if (isAuthenticated) {
            doHeartbeat();
        }
    }, [channelId, isAuthenticated]);

    return {
        globalOnlineCount: counts?.globalOnlineCount ?? 0,
        channelOnlineCount: counts?.channelOnlineCount ?? 0,
        status: myPresence?.status || "online",
        setManualStatus,
        manualStatus
    };
}
