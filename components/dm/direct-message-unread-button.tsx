"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useUnread } from "@/hooks/use-unread";
import { Button } from "@/components/ui/button";

export function DirectMessageUnreadButton() {
    const router = useRouter();
    const { directMessageUnreadCount } = useUnread();

    return (
        <Button
            variant="ghost"
            size="sm"
            className="vts-icon-button relative h-10 w-10 shrink-0 rounded-full px-0 text-black/80 hover:bg-white/60 md:h-auto md:w-auto md:gap-2 md:px-3"
            onClick={() => router.push("/messages")}
            title={`Direct Messages (${directMessageUnreadCount})`}
        >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden sm:inline">{`Direct Messages (${directMessageUnreadCount})`}</span>
            {directMessageUnreadCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white md:static md:h-5 md:min-w-5 md:text-[10px]">
                    {directMessageUnreadCount > 99 ? "99+" : directMessageUnreadCount}
                </span>
            ) : null}
        </Button>
    );
}
