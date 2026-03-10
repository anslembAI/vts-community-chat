"use client";

import Sidebar from "@/components/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Trophy, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/polls/notification-bell";
import { SidebarLeaderboard } from "@/components/reputation/sidebar-leaderboard";
import { VTSLogo } from "@/components/landing/vts-logo";
import { useGlobalMessageSound } from "@/hooks/use-global-message-sound";
import { HeaderInfoBar } from "@/components/header-info-bar";
import { HeaderDateTime } from "@/components/header-date-time";
import { GlobalUnreadBadge } from "@/components/chat/global-unread";
import dynamic from "next/dynamic";
const OnboardingTour = dynamic(() => import("@/components/onboarding-tour").then(m => m.OnboardingTour), { ssr: false });
import { useTwoFactorGate } from "@/hooks/use-two-factor-gate";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [leaderboardOpen, setLeaderboardOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const { isAuthenticated, isLoading: isAuthLoading, isAdmin, sessionId } = useAuth();
    const unreadEmails = useQuery(api.emails.getUnreadCount, isAdmin && sessionId ? { sessionId } : "skip");
    const { status: gateStatus } = useTwoFactorGate();
    useGlobalMessageSound();

    const isAppLoading = isAuthLoading || gateStatus === "loading";

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Close mobile sidebar on route change
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Cleanup any lingering Radix UI locks when navigating to a different layout
    useEffect(() => {
        return () => {
            document.body.style.pointerEvents = "";
            document.body.removeAttribute("data-scroll-locked");
        };
    }, []);

    useEffect(() => {
        if (!isAppLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isAppLoading, isAuthenticated, router]);

    if (!isMounted || isAppLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // While redirecting
    if (!isAuthenticated) return null;

    return (
        <div className="flex h-full overflow-hidden vts-app-shell app-shell-mobile p-2 md:p-4">
            <OnboardingTour />

            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full shrink-0" data-tour="sidebar-channels">
                <Sidebar />
            </div>

            {/* Mobile Sidebar & Header */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full app-main-wrapper md:pl-4">
                {/* Header: Mobile Sidebar Trigger + User Menu */}
                <header className="vts-panel flex items-center px-4 md:px-7 shrink-0 justify-between z-50 app-header-mobile fixed top-0 left-0 right-0 h-[var(--header-height)] pt-[calc(var(--safe-area-top)+12px)] pb-2 md:static md:h-20 md:min-h-20 md:pt-0 md:pb-0 rounded-none md:rounded-[2rem] transition-none border-0">
                    <div className="flex items-center gap-2 md:hidden">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="-ml-2 text-black hover:bg-white/20 rounded-full">
                                    <Menu className="h-6 w-6" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-96 border-r-white/40 bg-[#e9f1f7]/85 backdrop-blur-xl">
                                <Sidebar onClose={() => setOpen(false)} />
                            </SheetContent>
                        </Sheet>
                        <div className="flex items-center py-2 shrink-0">
                            <VTSLogo className="h-9 sm:h-12 md:h-16 w-auto" />
                        </div>
                        <HeaderDateTime />
                    </div>

                    <div className="flex-1 flex items-center justify-center h-full ml-1 sm:ml-2 md:ml-4 overflow-hidden">
                        <HeaderInfoBar />
                    </div>

                    <div className="ml-auto flex items-center gap-2 sm:gap-3">
                        <div data-tour="global-unread">
                            <GlobalUnreadBadge />
                        </div>
                        {isAdmin && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="vts-icon-button h-11 w-11 relative shrink-0 rounded-full text-black/80 hover:bg-white/60"
                                onClick={() => router.push("/admin?tab=emails")}
                                title="Admin Emails"
                            >
                                <Mail className="h-5 w-5" />
                                {unreadEmails !== undefined && unreadEmails > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white/80">
                                        {unreadEmails > 9 ? '9+' : unreadEmails}
                                    </span>
                                )}
                            </Button>
                        )}
                        <NotificationBell />
                        <Sheet open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
                            <SheetTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="vts-icon-button h-11 w-11 shrink-0 rounded-full text-black/80 hover:bg-white/60"
                                    title="Leaderboard"
                                >
                                    <Trophy className="h-5 w-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="p-0 w-96 border-l-white/40 bg-[#f6f2e9]/88 pt-12 backdrop-blur-xl">
                                <SidebarLeaderboard />
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                <main className="flex-1 flex flex-col h-full overflow-hidden relative app-main-mobile pt-[var(--header-height)] md:pt-5 bg-transparent">
                    {children}
                </main>
            </div>
        </div>
    );
}

