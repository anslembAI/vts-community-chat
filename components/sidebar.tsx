"use client";

import { Button } from "@/components/ui/button";
import { ChannelList } from "@/components/chat/channel-list";
import { DirectMessageList } from "@/components/dm/direct-message-list";
import { ChevronLeft } from "lucide-react";
import { VTSLogo } from "@/components/landing/vts-logo";
import { UserMenu } from "@/components/user-menu";
import { UserStatusDropdown } from "@/components/chat/user-status-dropdown";
import { HeaderDateTime } from "@/components/header-date-time";
import { usePathname } from "next/navigation";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
    const pathname = usePathname();
    const hasChannel = pathname?.startsWith("/channel/");
    const hasDirectMessage = pathname?.startsWith("/messages/");

    return (
        <aside className="vts-panel flex w-96 max-w-full flex-col h-full rounded-[2rem] border-0 overflow-hidden">
            {/* Header */}
            <div className="flex items-center h-24 min-h-24 px-5 pt-2 shrink-0">
                <div className="flex items-center py-2 shrink-0">
                    <VTSLogo className="h-12 w-auto" />
                </div>
                <HeaderDateTime />
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto py-2 flex flex-col">
                <ChannelList />
                <DirectMessageList />
            </div>

            {/* Bottom Profile Section */}
            <div className="px-4 py-4 flex items-center justify-between shrink-0">
                <UserStatusDropdown />
                <UserMenu />
            </div>

            {/* Mobile "Back to Channel" Button */}
            {(hasChannel || hasDirectMessage) && onClose && (
                <div className="shrink-0 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-2 md:hidden">
                    <Button
                        variant="outline"
                        className="vts-soft-card w-full rounded-2xl border-0 text-sm py-2 text-black shadow-sm flex items-center justify-center gap-2"
                        onClick={onClose}
                    >
                        <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        {hasDirectMessage ? "Back to Conversation" : "Back to Channel"}
                    </Button>
                </div>
            )}
        </aside>
    );
}
