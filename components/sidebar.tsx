"use client";

import { Button } from "@/components/ui/button";
import { ChannelList } from "@/components/chat/channel-list";
import {
    Plus,
    Search,
    MessageSquare,
    Hash,
    Settings,
    Bell,
    Crown,
    ChevronLeft
} from "lucide-react";
import { VTSLogo } from "@/components/landing/vts-logo";
import { UserMenu } from "@/components/user-menu";
import { UserStatusDropdown } from "@/components/chat/user-status-dropdown";
import { HeaderDateTime } from "@/components/header-date-time";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const hasChannel = pathname?.startsWith("/channel/");

    return (
        <div className="flex w-96 flex-col bg-[#F3E8DC] border-r border-[#E0D6C8] h-full shadow-sm max-w-full">
            {/* Header */}
            <div className="flex items-center h-20 min-h-20 px-4 border-b border-[#E0D6C8] bg-[#F7EFE6] shrink-0">
                <div className="flex items-center py-2 shrink-0">
                    <VTSLogo />
                </div>
                <HeaderDateTime />
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto py-2 flex flex-col">
                <ChannelList />
            </div>

            {/* Bottom Profile Section */}
            <div className="border-t border-[#E0D6C8] bg-[#F7EFE6] px-4 py-3 flex items-center justify-between shrink-0">
                <UserStatusDropdown />
                <UserMenu />
            </div>

            {/* Mobile "Back to Channel" Button */}
            {hasChannel && onClose && (
                <div className="shrink-0 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 md:hidden">
                    <Button
                        variant="outline"
                        className="w-full rounded-xl border border-[#E0D6C8] bg-white/40 hover:bg-white/60 text-sm py-2 text-black shadow-sm flex items-center justify-center gap-2"
                        onClick={onClose}
                    >
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        Back to Channel
                    </Button>
                </div>
            )}
        </div>
    );
}
