
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

    // Check local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem(VISITOR_ID_KEY);
        if (stored) {
            setSessionId(stored as Id<"sessions">);
        }
        setIsLoading(false);
    }, []);

    const signIn = async (username: string, password: string): Promise<void> => {
        try {
            const id = await signInMutation({ username, password });
            localStorage.setItem(VISITOR_ID_KEY, id);
            setSessionId(id);
            router.push("/");
        } catch (error) {
            throw error;
        }
    };

    const signUp = async (username: string, password: string): Promise<void> => {
        try {
            const id = await signUpMutation({ username, password });
            localStorage.setItem(VISITOR_ID_KEY, id);
            setSessionId(id);
            router.push("/");
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
        router.push("/sign-in");
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
