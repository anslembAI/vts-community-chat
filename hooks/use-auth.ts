"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

const VISITOR_ID_KEY = "vts-chat-session-id";

export function useAuth() {
    const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const signInMutation = useMutation(api.auth.signIn);
    const signUpMutation = useMutation(api.auth.signUp);
    const signOutMutation = useMutation(api.auth.signOut);

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
            setSessionId(id);
            router.push("/dashboard");
        } catch (error) {
            throw error;
        }
    };

    const signOut = async () => {
        if (sessionId) {
            await signOutMutation({ sessionId });
        }
        localStorage.removeItem(VISITOR_ID_KEY);
        setSessionId(null);
        router.push("/");
    };

    return {
        sessionId,
        isLoading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!sessionId
    };
}
