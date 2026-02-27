"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

const ORIGINAL_TITLE = "VTS Chat";

export function useUnread() {
    const { sessionId, isAuthenticated } = useAuth();
    const params = useParams();
    const channelId = params?.channelId as Id<"channels"> | undefined;

    const getUnreadCounts = useQuery(
        api.unread.getUnreadCounts,
        sessionId ? { sessionId } : "skip"
    );
    const markChannelRead = useMutation(api.unread.markChannelRead);

    const [isVisible, setIsVisible] = useState(true);
    const [isFocused, setIsFocused] = useState(true);

    // Original Favicon Reference
    const originalFaviconHref = useRef<string>("/favicon.ico");

    // Track Visibility & Focus
    useEffect(() => {
        const handleVisibility = () => setIsVisible(document.visibilityState === "visible");
        const handleFocus = () => setIsFocused(true);
        const handleBlur = () => setIsFocused(false);

        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        setIsVisible(document.visibilityState === "visible");
        setIsFocused(document.hasFocus());

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    // Mark Read Logic
    const actMarkRead = useCallback(async () => {
        if (!sessionId || !channelId) return;
        if (isVisible && isFocused) {
            try {
                await markChannelRead({ sessionId, channelId });
            } catch (e) {
                console.error("Failed to mark channel read", e);
            }
        }
    }, [sessionId, channelId, isVisible, isFocused, markChannelRead]);

    // Mark Read when Channel Changes or Tab Becomes Active
    useEffect(() => {
        actMarkRead();
    }, [channelId, isVisible, isFocused, actMarkRead]);

    // Fallback UI Updates (Title + Favicon + Web Badge)
    useEffect(() => {
        const globalCount = getUnreadCounts?.global || 0;

        // 1. Update Title
        if (globalCount > 0) {
            document.title = `(${globalCount}) ${ORIGINAL_TITLE}`;
        } else {
            document.title = ORIGINAL_TITLE;
        }

        // 2. Web Badging API (PWA)
        if ("setAppBadge" in navigator) {
            try {
                if (globalCount > 0) {
                    (navigator as any).setAppBadge(globalCount);
                } else {
                    (navigator as any).clearAppBadge();
                }
            } catch (e) {
                console.error("Error setting app badge", e);
            }
        }

        // 3. Favicon Badging
        updateFaviconBadge(globalCount, originalFaviconHref.current);

    }, [getUnreadCounts?.global]);

    return {
        globalUnreadCount: getUnreadCounts?.global || 0,
        unreadByChannel: getUnreadCounts?.channels || {},
    };
}

// Favicon Drawing Helper
function updateFaviconBadge(count: number, originalHref: string) {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }

    if (count === 0) {
        link.href = originalHref;
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalHref;
    img.onload = () => {
        ctx.clearRect(0, 0, 32, 32);
        ctx.drawImage(img, 0, 0, 32, 32);

        // Draw red circle
        ctx.beginPath();
        ctx.arc(24, 8, 8, 0, 2 * Math.PI);
        ctx.fillStyle = "#EF4444"; // red-500
        ctx.fill();

        // Draw text
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(count > 9 ? "9+" : count.toString(), 24, 8);

        link.href = canvas.toDataURL("image/png");
    };
}
