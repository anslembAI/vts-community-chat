"use client";

import { useUnread } from "@/hooks/use-unread";
import { MessageSquare } from "lucide-react";

export function GlobalUnreadBadge() {
    const { globalUnreadCount } = useUnread();

    if (globalUnreadCount === 0) return null;

    return (
        <div
            className="vts-icon-button relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-black/80 transition-colors hover:bg-white/60 md:h-11 md:w-11"
            title={`${globalUnreadCount} unread messages`}
        >
            <MessageSquare className="h-5 w-5" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 pb-[1px] text-[9px] font-bold text-white shadow-sm ring-2 ring-[#F4E9DD]">
                {globalUnreadCount > 9 ? "9+" : globalUnreadCount}
            </span>
        </div>
    );
}
