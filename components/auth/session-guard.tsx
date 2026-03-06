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

export function SessionGuard({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, userId, signOut, sessionId } = useAuth();
    const [isLoggedOutByOther, setIsLoggedOutByOther] = useState(false);
    const [localSessionId, setLocalSessionId] = useState<string | null>(null);

    const setActiveSession = useMutation(api.auth_session.setActiveSession);
    const heartbeat = useMutation(api.auth_session.heartbeat);

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
            setIsLoggedOutByOther(true);
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
        clearSessionId();
        await signOut(false);
    };

    return (
        <>
            {!isLoggedOutByOther && children}

            <Dialog open={isLoggedOutByOther} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Signed Out</DialogTitle>
                        <DialogDescription>
                            Your account was logged in from another device. This session has been closed to ensure your account security.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            onClick={() => {
                                setIsLoggedOutByOther(false);
                                window.location.href = "/";
                            }}
                            className="w-full bg-[#E07A5F] hover:bg-[#D06A4F] text-white"
                        >
                            Sign in again
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
