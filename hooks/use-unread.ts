"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

const GLOBAL_DEFAULT_TITLE = "VTS Chat – Secure Community Messaging";
const SHORT_TITLE = "VTS Chat";

export function useUnread() {
    const { sessionId, isAuthenticated } = useAuth();
    const params = useParams();
    const channelIdParam = params?.channelId as string | undefined;
    const channelId = (channelIdParam && channelIdParam.length > 15 && channelIdParam.includes("j")) ? (channelIdParam as Id<"channels">) : undefined;

    const getUnreadCounts = useQuery(
        api.unread.getUnreadCounts,
        sessionId ? { sessionId } : "skip"
    );

    const markChannelRead = useMutation(api.unread.markChannelRead);

    const [isVisible, setIsVisible] = useState(true);
    const [isFocused, setIsFocused] = useState(true);

    // Original Favicon Reference
    const originalFaviconHref = useRef<string>("/favicon.ico");

    // Animation refs
    const animationFrameId = useRef<number | null>(null);
    const lastAnimationTime = useRef<number>(0);
    const animationState = useRef<boolean>(true); // true = State A, false = State B
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

        // Capture base favicon on mount
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
        if (link && link.href) {
            originalFaviconHref.current = link.href;
        }

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

    useEffect(() => {
        actMarkRead();
    }, [channelId, isVisible, isFocused, actMarkRead]);

    // Cleanup specific to animation
    const clearTimeoutsAndFrames = useCallback(() => {
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }, []);

    const updateFaviconAndTitle = useCallback((globalCount: number) => {
        // Debounce update to at most once per 1000ms indirectly through this setup
        // Actually, we resolve the title instantly, but throttle the execution via the timeout

        let targetTitle = GLOBAL_DEFAULT_TITLE;

        if (!isVisible && globalCount > 0) {
            const countStr = globalCount > 99 ? "99+" : globalCount.toString();
            document.title = `(${countStr}) ${targetTitle}`;
        } else {
            document.title = targetTitle;
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

        // 3. Favicon Badging Animation Logic
        if (isVisible || globalCount === 0) {
            clearTimeoutsAndFrames();
            restoreOriginalFavicon(originalFaviconHref.current);
            return;
        }

        // We are hidden and have unreads - animate!
        const animateFavicon = (timestamp: number) => {
            if (timestamp - lastAnimationTime.current > 1000) {
                animationState.current = !animationState.current;
                lastAnimationTime.current = timestamp;
                drawFaviconFrame(globalCount, originalFaviconHref.current, animationState.current);
            }
            animationFrameId.current = requestAnimationFrame(animateFavicon);
        };

        if (!animationFrameId.current) {
            // First run, trigger immediately
            lastAnimationTime.current = performance.now();
            animationState.current = true;
            drawFaviconFrame(globalCount, originalFaviconHref.current, true);
            animationFrameId.current = requestAnimationFrame(animateFavicon);
        }
    }, [isVisible, clearTimeoutsAndFrames]);

    // Trigger effect
    useEffect(() => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Enforce 1000ms max update rate for reactivity, except on fast visibility changes
        updateTimeoutRef.current = setTimeout(() => {
            const globalCount = getUnreadCounts?.global || 0;
            updateFaviconAndTitle(globalCount);
        }, 100); // 100ms debounce of raw state changes

        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [getUnreadCounts?.global, isVisible, updateFaviconAndTitle]);

    // Cleanup completely on unmount
    useEffect(() => {
        return () => clearTimeoutsAndFrames();
    }, [clearTimeoutsAndFrames]);

    return {
        globalUnreadCount: getUnreadCounts?.global || 0,
        unreadByChannel: getUnreadCounts?.channels || {},
    };
}

// ─── Favicon Drawing Helpers ──────────────────────────────────────────

function getFaviconLink(): HTMLLinkElement {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
    }
    return link;
}

function restoreOriginalFavicon(originalHref: string) {
    const link = getFaviconLink();
    if (link.href !== originalHref && link.href !== new URL(originalHref, document.baseURI).href) {
        link.href = originalHref;
    }
}

function drawFaviconFrame(count: number, originalHref: string, isStateA: boolean) {
    const link = getFaviconLink();

    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalHref;
    img.onload = () => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(img, 0, 0, 64, 64);

        const countStr = count > 9 ? "9+" : count.toString();
        const centerX = 50;
        const centerY = 14;
        const baseRadius = 12;

        // Scale and opacity depending on state
        const scale = isStateA ? 1.0 : 0.94;
        const opacity = isStateA ? 1.0 : 0.85;
        const radius = baseRadius * scale;

        ctx.globalAlpha = opacity;

        // Draw thin white ring for contrast
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        // Draw soft red dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#EF4444"; // Tailwind red-500
        ctx.fill();

        // Draw tiny text centered
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(countStr, centerX, centerY + 1);

        link.href = canvas.toDataURL("image/png");
    };
}
