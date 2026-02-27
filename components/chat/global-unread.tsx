"use client";

import { useUnread } from "@/hooks/use-unread";
import { MessageSquare } from "lucide-react";

export function GlobalUnreadBadge() {
    const { globalUnreadCount } = useUnread();

    if (globalUnreadCount === 0) return null;

    return (
        <div className="relative flex items-center justify-center h-10 w-10 text-black/70 hover:bg-black/5 rounded-full transition-colors cursor-pointer" title={`${globalUnreadCount} unread messages`}>
            <MessageSquare className="h-5 w-5" />
            <span className="absolute top-1 right-1 flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full min-w-4 h-4 px-1 pb-[1px] shadow-sm ring-2 ring-[#F4E9DD]">
                {globalUnreadCount > 9 ? "9+" : globalUnreadCount}
            </span>
        </div>
    );
}
