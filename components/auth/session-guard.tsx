"use client";

import { useCallback, useEffect, useState } from "react";
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

    const handleForcedLogout = useCallback(async () => {
        if (typeof window !== "undefined") {
            localStorage.setItem(FORCED_LOGOUT_KEY, "true");
        }
        setIsLoggedOutByOther(true);
        clearSessionId();
        await signOut(false);
    }, [signOut]);

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
        // Only trigger if we are authenticated AND we have a valid result from the server
        // If activeSessionId is null or undefined, it means no session is active (normal logout or loading)
        if (isAuthenticated && localSessionId && activeSessionId && activeSessionId !== localSessionId) {
            handleForcedLogout();
        }
    }, [activeSessionId, handleForcedLogout, isAuthenticated, localSessionId]);

    // Heartbeat
    useEffect(() => {
        if (!isAuthenticated || !localSessionId) return;

        const interval = setInterval(() => {
            heartbeat({ sessionId: localSessionId }).catch(console.error);
        }, 45000); // 45 seconds

        return () => clearInterval(interval);
    }, [isAuthenticated, localSessionId, heartbeat]);

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
                <div className="fixed inset-0 z-[9999] bg-[radial-gradient(circle_at_top_left,rgba(200,226,244,0.92),transparent_36%),radial-gradient(circle_at_bottom,rgba(247,214,202,0.72),transparent_28%),linear-gradient(135deg,#eaf1f5_0%,#f4f1ea_55%,#f7f5f1_100%)]" />
            )}

            <Dialog open={isLoggedOutByOther} onOpenChange={() => { }}>
                <DialogContent
                    className="z-[10000] rounded-[1.75rem] border border-white/40 bg-[rgba(255,255,255,0.84)] shadow-[0_25px_60px_rgba(98,113,126,0.22)] backdrop-blur-xl sm:max-w-md"
                    hideClose
                >
                    <DialogHeader className="space-y-3">
                        <DialogTitle className="text-center text-2xl font-bold text-[#2c3034]">Signed Out</DialogTitle>
                        <DialogDescription className="text-center text-lg text-black/55">
                            Your account was logged in from another device. This session has been closed to ensure your account security.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-2xl border border-white/30 bg-white/45 py-4 text-center text-sm text-black/45">
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

