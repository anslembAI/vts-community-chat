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
    Crown
} from "lucide-react";
import { VTSLogo } from "@/components/landing/vts-logo";
import { NotificationBell } from "@/components/polls/notification-bell";
import { SidebarLeaderboard } from "@/components/reputation/sidebar-leaderboard";
import { useState } from "react";

export default function Sidebar() {
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    return (
        <div className="flex w-96 flex-col bg-[#F3E8DC] border-r border-[#E0D6C8] h-full shadow-sm">
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
                        className="h-10 w-10"
                        onClick={() => setShowLeaderboard(!showLeaderboard)}
                        title="Leaderboard"
                    >
                        <Trophy className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto py-2">
                {showLeaderboard ? (
                    <SidebarLeaderboard />
                ) : (
                    <ChannelList />
                )}
            </div>
        </div>
    );
}
