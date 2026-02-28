"use client";

import Sidebar from "@/components/sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, Menu, Crown } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { UserMenu } from "@/components/user-menu";
import { VTSLogo } from "@/components/landing/vts-logo";
import { SoundSettingsControl } from "@/components/chat/sound-settings-trigger";
import { useGlobalMessageSound } from "@/hooks/use-global-message-sound";
import { PresenceBar } from "@/components/chat/presence-bar";
import { GlobalUnreadBadge } from "@/components/chat/global-unread";
import { OnboardingTour } from "@/components/onboarding-tour";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const { isAuthenticated, isLoading } = useAuth();
    useGlobalMessageSound();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Close mobile sidebar on route change
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isLoading, isAuthenticated, router]);

    if (!isMounted || isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    // While redirecting
    if (!isAuthenticated) return null;

    return (
        <div className="flex h-screen overflow-hidden bg-[#E9DFD2] app-shell-mobile">
            <OnboardingTour />

            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full shrink-0" data-tour="sidebar-channels">
                <Sidebar />
            </div>

            {/* Mobile Sidebar & Header */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative w-full app-main-wrapper">
                {/* Header: Mobile Sidebar Trigger + User Menu */}
                <header className="flex items-center px-4 border-b border-[#E2D7C9] shrink-0 justify-between z-50 shadow-sm app-header-mobile bg-[#F4E9DD]/85 backdrop-blur-md fixed top-0 left-0 right-0 h-[calc(var(--m-header-h)+env(safe-area-inset-top))] pt-[calc(env(safe-area-inset-top)+12px)] pb-2 md:static md:h-20 md:min-h-20 md:pt-0 md:pb-0 md:bg-[#F4E9DD] md:backdrop-blur-none transition-none">
                    <div className="flex items-center gap-2 md:hidden">
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="-ml-2 text-black hover:bg-[#EADFD2]">
                                    <Menu className="h-6 w-6" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-96 border-r-[#E0D6C8] bg-[#F3E8DC]">
                                <Sidebar />
                            </SheetContent>
                        </Sheet>
                        <div className="flex items-center py-2 shrink-0">
                            <VTSLogo className="h-9 sm:h-12 md:h-16 w-auto" />
                        </div>
                    </div>

                    <div className="flex-1 flex items-center h-full ml-1 sm:ml-2 md:ml-4 overflow-hidden" data-tour="presence-area">
                        <PresenceBar />
                    </div>

                    <div className="ml-auto flex items-center gap-1 sm:gap-2">
                        <div data-tour="global-unread">
                            <GlobalUnreadBadge />
                        </div>
                        <UserMenu />
                    </div>
                </header>

                <main className="flex-1 flex flex-col h-full overflow-hidden relative app-main-mobile pt-[calc(var(--m-header-h)+env(safe-area-inset-top))] md:pt-0 bg-gradient-to-b from-[#EFE5D8] to-[#E9DFD2] md:bg-none md:bg-transparent">
                    {children}
                </main>
            </div>
        </div>
    );
}
