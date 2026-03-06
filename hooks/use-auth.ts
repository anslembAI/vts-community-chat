"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { getOrCreateSessionId, getDeviceLabel } from "@/lib/session-utils";

const VISITOR_ID_KEY = "vts-chat-session-id";

export function useAuth() {
    const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const signInMutation = useMutation(api.auth.signIn);
    const signUpMutation = useMutation(api.auth.signUp);
    const signOutMutation = useMutation(api.auth.signOut);
    const setActiveSession = useMutation(api.auth_session.setActiveSession);

    // We can't conditionally call useQuery, so we pass "skip" if no stored ID
    const [storedSessionId, setStoredSessionId] = useState<Id<"sessions"> | null>(null);
    const [isStorageLoaded, setIsStorageLoaded] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(VISITOR_ID_KEY);
            setStoredSessionId(stored as Id<"sessions"> | null);
            setIsStorageLoaded(true);
        }
    }, []);

    const sessionData = useQuery(
        api.auth.validateSession,
        isStorageLoaded && storedSessionId ? { sessionId: storedSessionId } : "skip"
    );

    useEffect(() => {
        if (!isStorageLoaded) return;

        if (!storedSessionId) {
            setIsLoading(false);
            return;
        }

        if (sessionData === undefined) {
            // Query is loading
            return;
        }

        if (sessionData === null) {
            // Invalid session
            localStorage.removeItem(VISITOR_ID_KEY);
            setSessionId(null);
            setIsLoading(false);
        } else {
            // Valid session
            setSessionId(sessionData.sessionId);
            setIsLoading(false);
        }
    }, [isStorageLoaded, storedSessionId, sessionData]);

    const signIn = async (username: string, password: string): Promise<void> => {
        try {
            const id = await signInMutation({ username, password });
            localStorage.setItem(VISITOR_ID_KEY, id);

            // Register active session for single-device enforcement
            await setActiveSession({
                sessionId: id,
                clientSessionId: getOrCreateSessionId(),
                deviceLabel: getDeviceLabel(),
                userAgent: navigator.userAgent
            });

            setSessionId(id);
            router.push("/dashboard");
        } catch (error) {
            throw error;
        }
    };

    const signUp = async (username: string, password: string): Promise<void> => {
        try {
            const id = await signUpMutation({ username, password });
            localStorage.setItem(VISITOR_ID_KEY, id);

            // Register active session for single-device enforcement
            await setActiveSession({
                sessionId: id,
                clientSessionId: getOrCreateSessionId(),
                deviceLabel: getDeviceLabel(),
                userAgent: navigator.userAgent
            });

            setSessionId(id);
            router.push("/dashboard");
        } catch (error) {
            throw error;
        }
    };

    const deactivateSession = useMutation(api.auth_session.deactivateSession);

    const signOut = async (redirect: boolean = true) => {
        if (sessionId) {
            try {
                // Try to deactivate the single session tracking on server
                await deactivateSession({
                    sessionId,
                    clientSessionId: getOrCreateSessionId()
                });
            } catch (error) {
                console.error("Failed to deactivate session during logout:", error);
            }
            // Delete the Convex session document
            await signOutMutation({ sessionId });
        }
        localStorage.removeItem(VISITOR_ID_KEY);
        setSessionId(null);
        if (redirect) {
            router.push("/");
        }
    };

    return {
        sessionId,
        isLoading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!sessionId,
        userId: sessionData?._id,
        isAdmin: sessionData?.isAdmin ?? false,
    };
}
