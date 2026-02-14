"use client";

import { Button } from "@/components/ui/button";
import { ChannelList } from "@/components/chat/channel-list";
import { MessageSquare, Trophy } from "lucide-react";
import { NotificationBell } from "@/components/polls/notification-bell";
import { SidebarLeaderboard } from "@/components/reputation/sidebar-leaderboard";
import { useState } from "react";

export default function Sidebar() {
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    return (
        <div className="flex w-80 flex-col bg-slate-900/50 backdrop-blur-2xl border-r border-white/10 h-full">
            {/* Header */}
            <div className="flex items-center justify-between h-14 min-h-14 px-4 border-b border-white/10">
                <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
                    <div className="bg-primary text-primary-foreground rounded-md p-1">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <span>Community</span>
                </div>
                <div className="flex items-center gap-1">
                    <NotificationBell />
                    <Button
                        variant={showLeaderboard ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowLeaderboard(!showLeaderboard)}
                        title="Leaderboard"
                    >
                        <Trophy className="h-4 w-4" />
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
