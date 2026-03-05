"use client";

import Sidebar from "@/components/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, Menu, Crown, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { NotificationBell } from "@/components/polls/notification-bell";
import { SidebarLeaderboard } from "@/components/reputation/sidebar-leaderboard";
import { VTSLogo } from "@/components/landing/vts-logo";
import { SoundSettingsControl } from "@/components/chat/sound-settings-trigger";
import { useGlobalMessageSound } from "@/hooks/use-global-message-sound";
import { PresenceBar } from "@/components/chat/presence-bar";
import { HeaderInfoBar } from "@/components/header-info-bar";
import { HeaderDateTime } from "@/components/header-date-time";
import { GlobalUnreadBadge } from "@/components/chat/global-unread";
import dynamic from "next/dynamic";
const OnboardingTour = dynamic(() => import("@/components/onboarding-tour").then(m => m.OnboardingTour), { ssr: false });
import { useTwoFactorGate } from "@/hooks/use-two-factor-gate";
import { SessionGuard } from "@/components/auth/session-guard";

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
    const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
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
        <SessionGuard>
            <div className="flex h-full overflow-hidden bg-[#E9DFD2] app-shell-mobile">
                <OnboardingTour />

                {/* Desktop Sidebar */}
                <div className="hidden md:flex h-full shrink-0" data-tour="sidebar-channels">
                    <Sidebar />
                </div>

                {/* Mobile Sidebar & Header */}
                <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full app-main-wrapper">
                    {/* Header: Mobile Sidebar Trigger + User Menu */}
                    <header className="flex items-center px-4 border-b border-[#E2D7C9] shrink-0 justify-between z-50 shadow-sm app-header-mobile bg-[#F4E9DD]/98 fixed top-0 left-0 right-0 h-[var(--header-height)] pt-[calc(var(--safe-area-top)+12px)] pb-2 md:static md:h-20 md:min-h-20 md:pt-0 md:pb-0 md:bg-[#F4E9DD] transition-none">
                        <div className="flex items-center gap-2 md:hidden">
                            <Sheet open={open} onOpenChange={setOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-ml-2 text-black hover:bg-[#EADFD2]">
                                        <Menu className="h-6 w-6" />
                                        <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-96 border-r-[#E0D6C8] bg-[#F3E8DC]">
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

                        <div className="ml-auto flex items-center gap-1 sm:gap-2">
                            <div data-tour="global-unread">
                                <GlobalUnreadBadge />
                            </div>
                            <NotificationBell />
                            <Sheet open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 shrink-0"
                                        title="Leaderboard"
                                    >
                                        <Trophy className="h-6 w-6" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="right" className="p-0 w-96 border-l-[#E0D6C8] bg-[#F3E8DC] pt-12">
                                    <SidebarLeaderboard />
                                </SheetContent>
                            </Sheet>
                        </div>
                    </header>

                    <main className="flex-1 flex flex-col h-full overflow-hidden relative app-main-mobile pt-[var(--header-height)] md:pt-0 bg-gradient-to-b from-[#EFE5D8] to-[#E9DFD2] md:bg-none md:bg-transparent">
                        {children}
                    </main>
                </div>
            </div>
        </SessionGuard>
    );
}
