"use client";

import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "./use-auth";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

// Routes that don't need 2FA (sign-in, setup-2fa, landing, etc.)
const PUBLIC_ROUTES = ["/", "/sign-in", "/sign-up", "/privacy", "/terms", "/forgot-password"];
const SETUP_2FA_ROUTE = "/setup-2fa";

export function useTwoFactorGate() {
    const { isAuthenticated, isLoading: isAuthLoading, sessionId } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const hasRedirectedRef = useRef(false);

    // Call convex query only if authenticated
    const twoFactorState = useQuery(
        api.security.getTwoFactorState,
        isAuthenticated ? { sessionId: sessionId! } : "skip"
    );

    const isLoading = isAuthLoading || (isAuthenticated && twoFactorState === undefined);

    const needs2FA =
        isAuthenticated &&
        twoFactorState !== undefined &&
        twoFactorState.status === "authenticated" &&
        !twoFactorState.twoFactorEnabled;

    useEffect(() => {
        if (isLoading) return;

        // Skip if current path is an exception
        const isPublic = PUBLIC_ROUTES.includes(pathname);
        const isSetup = pathname.startsWith(SETUP_2FA_ROUTE);

        if (needs2FA) {
            if (!isSetup && !isPublic && !hasRedirectedRef.current) {
                hasRedirectedRef.current = true;
                router.replace(SETUP_2FA_ROUTE);
            }
        } else if (isAuthenticated && twoFactorState?.twoFactorEnabled) {
            // Already enabled 2FA, but user is on setup page?
            if (isSetup && !hasRedirectedRef.current) {
                hasRedirectedRef.current = true;
                router.replace("/dashboard");
            }
        }
    }, [isLoading, needs2FA, pathname, router, isAuthenticated, twoFactorState]);

    return {
        status: isLoading ? "loading" : needs2FA ? "needs_2fa" : "ready",
        twoFactorEnabled: !!twoFactorState?.twoFactorEnabled,
    };
}
