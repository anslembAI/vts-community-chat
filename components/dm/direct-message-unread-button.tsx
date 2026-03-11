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
      className="relative gap-2 rounded-full px-3 text-black/80 hover:bg-white/60"
      onClick={() => router.push("/messages")}
      title={`Direct Messages (${directMessageUnreadCount})`}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">{`Direct Messages (${directMessageUnreadCount})`}</span>
      {directMessageUnreadCount > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {directMessageUnreadCount > 99 ? "99+" : directMessageUnreadCount}
        </span>
      ) : null}
    </Button>
  );
}
