"use client";

import { useUnread } from "@/hooks/use-unread";
import { MessageSquare } from "lucide-react";

export function GlobalUnreadBadge() {
    const { globalUnreadCount } = useUnread();

    if (globalUnreadCount === 0) return null;

    return (
        <div className="vts-icon-button relative flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-black/80 transition-colors hover:bg-white/60" title={`${globalUnreadCount} unread messages`}>
            <MessageSquare className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full min-w-4 h-4 px-1 pb-[1px] shadow-sm ring-2 ring-[#F4E9DD]">
                {globalUnreadCount > 9 ? "9+" : globalUnreadCount}
            </span>
        </div>
    );
}
