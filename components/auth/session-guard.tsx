"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getDeviceLabel, getOrCreateSessionId, clearSessionId } from "@/lib/session-utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const FORCED_LOGOUT_KEY = "vts-forced-logout-active";

export function SessionGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, userId, signOut, sessionId } = useAuth();
    const [isLoggedOutByOther, setIsLoggedOutByOther] = useState(false);
    const [localSessionId, setLocalSessionId] = useState<string | null>(null);

    const setActiveSession = useMutation(api.auth_session.setActiveSession);
    const heartbeat = useMutation(api.auth_session.heartbeat);

    // Initial check for persisted forced logout state
    useEffect(() => {
        if (typeof window !== "undefined") {
            const isForced = localStorage.getItem(FORCED_LOGOUT_KEY) === "true";
            if (isForced) {
                setIsLoggedOutByOther(true);
            }
        }
    }, []);

    // Watch for active session changes
    const activeSessionId = useQuery(
        api.auth_session.getActiveSessionId,
        userId ? { userId } : "skip"
    );

    useEffect(() => {
        if (isAuthenticated && sessionId && !localSessionId) {
            const sid = getOrCreateSessionId();
            setLocalSessionId(sid);

            // Notify server about this new local session
            setActiveSession({
                sessionId: sessionId,
                clientSessionId: sid,
                deviceLabel: getDeviceLabel(),
                userAgent: navigator.userAgent
            }).catch(console.error);
        }
    }, [isAuthenticated, sessionId, localSessionId, setActiveSession]);

    // Check for mismatch
    useEffect(() => {
        if (isAuthenticated && localSessionId && activeSessionId && activeSessionId !== localSessionId) {
            handleForcedLogout();
        }
    }, [isAuthenticated, localSessionId, activeSessionId]);

    // Heartbeat
    useEffect(() => {
        if (!isAuthenticated || !localSessionId) return;

        const interval = setInterval(() => {
            heartbeat({ sessionId: localSessionId }).catch(console.error);
        }, 45000); // 45 seconds

        return () => clearInterval(interval);
    }, [isAuthenticated, localSessionId, heartbeat]);

    const handleForcedLogout = async () => {
        if (typeof window !== "undefined") {
            localStorage.setItem(FORCED_LOGOUT_KEY, "true");
        }
        setIsLoggedOutByOther(true);
        clearSessionId();
        // We sign out but the state is now captured in isLoggedOutByOther and localStorage
        await signOut(false);
    };

    const handleSignInAgain = () => {
        if (typeof window !== "undefined") {
            localStorage.removeItem(FORCED_LOGOUT_KEY);
        }
        setIsLoggedOutByOther(false);
        window.location.href = "/";
    };

    return (
        <>
            {/* If we are logged out by another device, we hide the app content to prevent interaction */}
            {!isLoggedOutByOther ? children : (
                <div className="fixed inset-0 bg-[#E9DFD2] z-[9999]" />
            )}

            <Dialog open={isLoggedOutByOther} onOpenChange={() => { }}>
                <DialogContent
                    className="sm:max-w-md border-none shadow-2xl bg-[#F4E9DD] z-[10000]"
                    hideClose
                >
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-2xl font-bold text-[#E07A5F] text-center">Signed Out</DialogTitle>
                        <DialogDescription className="text-center text-lg text-stone-600">
                            Your account was logged in from another device. This session has been closed to ensure your account security.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center text-sm text-stone-500">
                        For your security, only one active device is allowed at a time.
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleSignInAgain}
                            className="w-full h-12 text-lg font-bold bg-[#E07A5F] hover:bg-[#D06A4F] text-white shadow-lg transition-all active:scale-95"
                        >
                            Sign in again
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

