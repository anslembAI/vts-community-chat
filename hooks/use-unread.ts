"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useParams } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";

const GLOBAL_DEFAULT_TITLE = "VTS Chat – Secure Community Messaging";

type BadgeNavigator = Navigator & {
    setAppBadge?: (value?: number) => Promise<void> | void;
    clearAppBadge?: () => Promise<void> | void;
};

export function useUnread() {
    const { sessionId } = useAuth();
    const params = useParams();
    const channelIdParam = params?.channelId as string | undefined;
    const channelId =
        channelIdParam && channelIdParam.length > 15 && channelIdParam.includes("j")
            ? (channelIdParam as Id<"channels">)
            : undefined;

    const getUnreadCounts = useQuery(api.unread.getUnreadCounts, sessionId ? { sessionId } : "skip");
    const markChannelRead = useMutation(api.unread.markChannelRead);

    const [isVisible, setIsVisible] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
    const [isFocused, setIsFocused] = useState(() => typeof document === "undefined" || document.hasFocus());

    const originalFaviconHref = useRef("/favicon.ico");
    const animationFrameId = useRef<number | null>(null);
    const lastAnimationTime = useRef(0);
    const animationState = useRef(true);
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleVisibility = () => setIsVisible(document.visibilityState === "visible");
        const handleFocus = () => setIsFocused(true);
        const handleBlur = () => setIsFocused(false);

        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
        if (link?.href) {
            originalFaviconHref.current = link.href;
        }

        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, []);

    const actMarkRead = useCallback(async () => {
        if (!sessionId || !channelId || !isVisible || !isFocused) return;

        try {
            await markChannelRead({ sessionId, channelId });
        } catch (error) {
            console.error("Failed to mark channel read", error);
        }
    }, [channelId, isFocused, isVisible, markChannelRead, sessionId]);

    useEffect(() => {
        actMarkRead();
    }, [actMarkRead]);

    const clearTimeoutsAndFrames = useCallback(() => {
        if (updateTimeoutRef.current) clearTimeout(updateTimeoutRef.current);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    }, []);

    const updateFaviconAndTitle = useCallback(
        (globalCount: number) => {
            const targetTitle = GLOBAL_DEFAULT_TITLE;

            if (!isVisible && globalCount > 0) {
                const countStr = globalCount > 99 ? "99+" : globalCount.toString();
                document.title = `(${countStr}) ${targetTitle}`;
            } else {
                document.title = targetTitle;
            }

            const badgeNavigator = navigator as BadgeNavigator;
            if ("setAppBadge" in badgeNavigator || "clearAppBadge" in badgeNavigator) {
                try {
                    if (globalCount > 0) {
                        badgeNavigator.setAppBadge?.(globalCount);
                    } else {
                        badgeNavigator.clearAppBadge?.();
                    }
                } catch (error) {
                    console.error("Error setting app badge", error);
                }
            }

            if (isVisible || globalCount === 0) {
                clearTimeoutsAndFrames();
                restoreOriginalFavicon(originalFaviconHref.current);
                return;
            }

            const animateFavicon = (timestamp: number) => {
                if (timestamp - lastAnimationTime.current > 1000) {
                    animationState.current = !animationState.current;
                    lastAnimationTime.current = timestamp;
                    drawFaviconFrame(globalCount, originalFaviconHref.current, animationState.current);
                }
                animationFrameId.current = requestAnimationFrame(animateFavicon);
            };

            if (!animationFrameId.current) {
                lastAnimationTime.current = performance.now();
                animationState.current = true;
                drawFaviconFrame(globalCount, originalFaviconHref.current, true);
                animationFrameId.current = requestAnimationFrame(animateFavicon);
            }
        },
        [clearTimeoutsAndFrames, isVisible]
    );

    useEffect(() => {
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        updateTimeoutRef.current = setTimeout(() => {
            updateFaviconAndTitle(getUnreadCounts?.global || 0);
        }, 100);

        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [getUnreadCounts?.global, isVisible, updateFaviconAndTitle]);

    useEffect(() => {
        return () => clearTimeoutsAndFrames();
    }, [clearTimeoutsAndFrames]);

    return {
        globalUnreadCount: getUnreadCounts?.global || 0,
        unreadByChannel: getUnreadCounts?.channels || {},
        directMessageUnreadCount: getUnreadCounts?.directMessagesTotal || 0,
        unreadByDirectMessage: getUnreadCounts?.directMessages || {},
    };
}

function getFaviconLink(): HTMLLinkElement {
    let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
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
        const scale = isStateA ? 1 : 0.94;
        const opacity = isStateA ? 1 : 0.85;
        const radius = baseRadius * scale;

        ctx.globalAlpha = opacity;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = "#EF4444";
        ctx.fill();

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(countStr, centerX, centerY + 1);

        link.href = canvas.toDataURL("image/png");
    };
}
