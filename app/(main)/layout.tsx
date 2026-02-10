"use client";

import Sidebar from "@/components/sidebar";
import StoreUser from "@/components/StoreUser";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, MessageSquare } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    // Close mobile sidebar on route change
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <StoreUser />

            {/* Desktop Sidebar */}
            <div className="hidden md:flex h-full shrink-0">
                <Sidebar />
            </div>

            {/* Mobile Sidebar & Header */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="md:hidden flex items-center h-14 min-h-14 px-4 border-b shrink-0">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="mr-2">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <Sidebar />
                        </SheetContent>
                    </Sheet>

                    <div className="flex items-center gap-2 font-bold text-lg">
                        <div className="bg-primary text-primary-foreground rounded-md p-1">
                            <MessageSquare className="h-4 w-4" />
                        </div>
                        <span>Community</span>
                    </div>
                </div>

                <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                    {children}
                </main>
            </div>
        </div>
    );
}
