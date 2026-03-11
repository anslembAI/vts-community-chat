"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useUnread } from "@/hooks/use-unread";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NewDirectMessageModal } from "@/components/dm/new-direct-message-modal";

export function DirectMessageList() {
  const pathname = usePathname();
  const { sessionId } = useAuth();
  const { unreadByDirectMessage, directMessageUnreadCount } = useUnread();
  const threads = useQuery(api.directMessages.listThreads, sessionId ? { sessionId } : "skip");

  if (!sessionId) return null;

  return (
    <div className="flex flex-col gap-2 px-4 pb-4 pt-3">
      <div className="flex items-center justify-between px-1 py-1.5">
        <h2 className="text-[1.05rem] font-medium uppercase tracking-[0.16em] text-black/55">
          Direct Messages
        </h2>
        <NewDirectMessageModal />
      </div>

      {threads?.map((thread) => {
        const unreadCount = unreadByDirectMessage[thread._id] || thread.unreadCount || 0;
        const isActive = pathname === `/messages/${thread._id}`;
        return (
          <Link
            key={thread._id}
            href={`/messages/${thread._id}`}
            className={cn(
              "vts-soft-card flex items-center gap-3 rounded-[1.35rem] px-4 py-3 transition-all",
              isActive ? "bg-white/65 shadow-[0_14px_32px_rgba(120,140,154,0.18)]" : "hover:bg-white/60"
            )}
          >
            <Avatar className="h-10 w-10 border border-white/50 shadow-sm">
              <AvatarImage src={thread.otherParticipant.avatarUrl || undefined} />
              <AvatarFallback>{thread.otherParticipant.name?.charAt(0) || thread.otherParticipant.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-[#2c3034]">
                  {thread.otherParticipant.name || thread.otherParticipant.username}
                </span>
                {unreadCount > 0 ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                ) : null}
              </div>
              <p className="truncate text-xs text-black/45">
                {thread.lastMessagePreview || "No messages yet"}
              </p>
            </div>
          </Link>
        );
      })}

      {threads && threads.length === 0 ? (
        <p className="px-2 py-3 text-sm text-black/40">
          {directMessageUnreadCount > 0 ? "Unread conversations are hidden by filters." : "No direct messages yet."}
        </p>
      ) : null}
    </div>
  );
}
