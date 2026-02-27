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
import { NotificationBell } from "@/components/polls/notification-bell";
import { SidebarLeaderboard } from "@/components/reputation/sidebar-leaderboard";
import { useState } from "react";

export default function Sidebar() {
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    return (
        <div className="flex w-96 flex-col bg-[#F3E8DC] border-r border-[#E0D6C8] h-full shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between h-14 min-h-14 px-4 border-b border-[#E0D6C8]">
                <div className="flex items-center gap-3 font-black text-4xl tracking-tighter text-black font-outfit">
                    <Crown className="h-10 w-10 text-amber-500 fill-amber-500/20 drop-shadow-sm" />
                    <span>VTS Chat</span>
                </div>
                <div className="flex items-center gap-1">
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
