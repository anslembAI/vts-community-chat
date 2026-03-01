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
    Trophy,
    Crown,
    ChevronLeft
} from "lucide-react";
import { VTSLogo } from "@/components/landing/vts-logo";
import { NotificationBell } from "@/components/polls/notification-bell";
import { SidebarLeaderboard } from "@/components/reputation/sidebar-leaderboard";
import { SidebarTime } from "@/components/sidebar-time";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const pathname = usePathname();
    const hasChannel = pathname?.startsWith("/channel/");

    return (
        <div className="flex w-96 flex-col bg-[#F3E8DC] border-r border-[#E0D6C8] h-full shadow-sm max-w-full">
            {/* Header */}
            <div className="flex items-center h-20 min-h-20 px-4 border-b border-[#E0D6C8] bg-[#F7EFE6] gap-4">
                <div className="flex items-center py-2 shrink-0">
                    <VTSLogo />
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <Button
                        variant={showLeaderboard ? "secondary" : "ghost"}
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => setShowLeaderboard(!showLeaderboard)}
                        title="Leaderboard"
                    >
                        <Trophy className="h-6 w-6" />
                    </Button>
                    <SidebarTime />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto py-2 flex flex-col">
                {showLeaderboard ? (
                    <SidebarLeaderboard />
                ) : (
                    <ChannelList />
                )}
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
