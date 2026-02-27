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
        <div className="flex h-screen overflow-hidden bg-[#E9DFD2]">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full shrink-0">
                <Sidebar />
            </div>

            {/* Mobile Sidebar & Header */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header: Mobile Sidebar Trigger + User Menu */}
                <header className="flex items-center h-20 min-h-20 px-4 border-b border-[#E2D7C9] shrink-0 justify-between bg-[#F4E9DD] z-10 shadow-sm">
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

                    <div className="flex-1 flex items-center h-full ml-1 sm:ml-2 md:ml-4 overflow-hidden">
                        <PresenceBar />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <UserMenu />
                    </div>
                </header>

                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
