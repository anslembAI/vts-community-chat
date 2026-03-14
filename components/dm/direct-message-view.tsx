"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Loader2, MessageCircle, MoreVertical, Shield, VolumeX, Archive, Trash2, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { getOrCreateSessionId } from "@/lib/session-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageItem } from "@/components/chat/message-item";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";

const BATCH_SIZE = 30;

export function DirectMessageView({ threadId }: { threadId: Id<"directMessageThreads"> }) {
  const router = useRouter();
  const { sessionId } = useAuth();
  const { toast } = useToast();
  const [body, setBody] = useState("");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [clearConfirmation, setClearConfirmation] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  useEffect(() => {
    previousMessageCountRef.current = 0;
  }, [threadId]);
  const thread = useQuery(api.directMessages.getThread, sessionId ? { sessionId, threadId } : "skip");
  const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
  const presence = useQuery(
    api.presence.getUserPresence,
    thread?.otherParticipant?._id ? { userId: thread.otherParticipant._id } : "skip"
  );

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.directMessages.getMessagesPaginated,
    sessionId ? { sessionId, threadId } : "skip",
    { initialNumItems: BATCH_SIZE }
  );

  const sendMessage = useMutation(api.directMessages.sendMessage);
  const editMessage = useMutation(api.directMessages.editMessage);
  const deleteMessage = useMutation(api.directMessages.deleteMessage);
  const markThreadRead = useMutation(api.directMessages.markThreadRead);
  const toggleMuteThread = useMutation(api.directMessages.toggleMuteThread);
  const toggleArchiveThread = useMutation(api.directMessages.toggleArchiveThread);
  const deleteThreadFromMyList = useMutation(api.directMessages.deleteThreadFromMyList);
  const toggleBlockUser = useMutation(api.directMessages.toggleBlockUser);
  const clearThreadMessages = useMutation(api.directMessages.clearThreadMessages);

  useEffect(() => {
    if (sessionId) {
      void markThreadRead({ sessionId, threadId });
    }
  }, [markThreadRead, sessionId, threadId, results.length]);

  const messages = useMemo(
    () =>
      [...results]
        .reverse()
        .map((message) => ({
          ...message,
          content: message.deletedAt ? "Message deleted" : message.body,
          timestamp: message.createdAt,
          edited: !!message.editedAt,
          isModerated: !!message.deletedAt,
          type: "text" as const,
          deliveryStatus: message.deliveryStatus as "delivered" | "seen" | undefined,
        })),
    [results]
  );

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      setIsNearBottom(distanceFromBottom < 80);
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll);

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const messageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;
    const hasNewMessages = messageCount > previousMessageCount;

    if (!container || messageCount === 0) {
      previousMessageCountRef.current = messageCount;
      return;
    }

    if (previousMessageCount === 0 || (hasNewMessages && isNearBottom)) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: previousMessageCount === 0 ? "auto" : "smooth",
      });
    }

    previousMessageCountRef.current = messageCount;
  }, [messages.length, isNearBottom]);

  const isCurrentUserAdmin = currentUser?.role === "admin" || currentUser?.isAdmin;
  const clearTargetName = thread?.otherParticipant.name || thread?.otherParticipant.username || "CLEAR";

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionId || !body.trim()) return;
    try {
      await sendMessage({
        sessionId,
        clientSessionId: getOrCreateSessionId(),
        threadId,
        body,
      });
      setBody("");
    } catch (error: any) {
      toast({
        title: "Unable to send message",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async (messageId: Id<"messages"> | Id<"directMessages">, nextBody: string) => {
    if (!sessionId) return;
    await editMessage({ sessionId, messageId: messageId as Id<"directMessages">, body: nextBody });
  };

  const handleDelete = async (messageId: Id<"messages"> | Id<"directMessages">) => {
    if (!sessionId) return;
    await deleteMessage({ sessionId, messageId: messageId as Id<"directMessages"> });
  };

  const handleMenuAction = async (action: () => Promise<any>, successMessage: string, redirectToInbox = false) => {
    if (!sessionId) return;
    try {
      await action();
      toast({ description: successMessage });
      if (redirectToInbox) {
        router.push("/messages");
      }
    } catch (error: any) {
      toast({
        title: "Action failed",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearThread = async () => {
    if (!sessionId || !thread) return;
    if (clearConfirmation !== "CLEAR" && clearConfirmation !== clearTargetName) {
      toast({
        title: "Validation Error",
        description: "You must type the participant name or CLEAR.",
        variant: "destructive",
      });
      return;
    }

    setIsClearing(true);
    try {
      let isDone = false;
      let totalDeleted = 0;

      while (!isDone) {
        const result = await clearThreadMessages({ sessionId, threadId });
        isDone = result.isDone;
        totalDeleted += result.deletedCount;
      }

      toast({
        title: "Conversation cleared successfully.",
        description: `Deleted ${totalDeleted} messages.`,
      });
      setClearDialogOpen(false);
      setClearConfirmation("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  if (thread === undefined || currentUser === undefined) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="vts-panel flex h-full flex-col items-center justify-center rounded-[2rem] p-6 text-center">
        <MessageCircle className="mb-3 h-10 w-10 text-black/35" />
        <p className="text-lg font-semibold text-[#2c3034]">Conversation not found</p>
      </div>
    );
  }

  return (
    <div className="vts-panel flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem]">
      <div className="flex h-16 md:h-20 items-center gap-2 md:gap-3 border-b border-white/35 bg-white/18 px-3 md:px-6 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          className="vts-icon-button -ml-2 h-10 w-10 rounded-full text-black/80 hover:bg-white/60 md:hidden"
          onClick={() => router.push("/messages")}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="relative">
          <Avatar className="h-11 w-11 border border-white/50 shadow-sm">
            <AvatarImage src={thread.otherParticipant.avatarUrl || undefined} />
            <AvatarFallback>{(thread.otherParticipant.name || thread.otherParticipant.username).charAt(0)}</AvatarFallback>
          </Avatar>
          <span
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
              presence?.isOnline ? "bg-green-500" : "bg-zinc-300"
            }`}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-[#2c3034]">
            {thread.otherParticipant.name || thread.otherParticipant.username}
          </h2>
          <p className="text-xs text-black/45">{presence?.isOnline ? "Online" : "Offline"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="vts-icon-button h-10 w-10 rounded-full text-black/80 hover:bg-white/60">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() =>
                handleMenuAction(
                  () => toggleMuteThread({ sessionId: sessionId!, threadId }),
                  thread.isMuted ? "Conversation unmuted" : "Conversation muted"
                )
              }
              className="gap-2"
            >
              <VolumeX className="h-4 w-4" />
              {thread.isMuted ? "Unmute Conversation" : "Mute Conversation"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleMenuAction(
                  () => toggleArchiveThread({ sessionId: sessionId!, threadId }),
                  thread.isArchived ? "Conversation restored" : "Conversation archived",
                  !thread.isArchived
                )
              }
              className="gap-2"
            >
              <Archive className="h-4 w-4" />
              {thread.isArchived ? "Unarchive Conversation" : "Archive Conversation"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleMenuAction(
                  () => toggleBlockUser({ sessionId: sessionId!, threadId }),
                  thread.blockedByMe ? "User unblocked" : "User blocked"
                )
              }
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              {thread.blockedByMe ? "Unblock User" : "Block User"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleMenuAction(
                  () => deleteThreadFromMyList({ sessionId: sessionId!, threadId }),
                  "Conversation removed from your list",
                  true
                )
              }
              className="gap-2 text-destructive focus:bg-destructive focus:text-destructive-foreground"
            >
              <Trash2 className="h-4 w-4" />
              Delete Conversation from My List
            </DropdownMenuItem>
            {isCurrentUserAdmin ? (
              <DropdownMenuItem
                onClick={() => setClearDialogOpen(true)}
                className="gap-2 text-destructive focus:bg-destructive focus:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
                Clear Conversation for Everyone
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 pb-3 pt-4 md:px-4 md:pb-4">
        {status === "CanLoadMore" ? (
          <div className="mb-4 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => loadMore(BATCH_SIZE)}>
              Load older messages
            </Button>
          </div>
        ) : null}
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageItem
              key={message._id}
              message={message}
              currentUserId={currentUser?._id}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReaction={async () => {}}
              disableReactions
              disableReplies
            />
          ))}
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="border-t border-white/30 bg-white/14 p-4 backdrop-blur-sm">
        <form onSubmit={handleSend} className="vts-soft-card flex items-center gap-2 rounded-[2rem] border-0 px-3 py-1.5">
          <Input
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={thread.blockedMe ? "This user has blocked you" : "Type a private message..."}
            className="border-none bg-transparent text-base text-black placeholder:text-black/40 focus-visible:ring-0"
            disabled={thread.blockedMe}
          />
          <Button
            type="submit"
            size="sm"
            className="rounded-full"
            disabled={!body.trim() || thread.blockedMe}
          >
            Send
          </Button>
        </form>
      </div>

      <AlertDialog
        open={clearDialogOpen}
        onOpenChange={(open) => {
          setClearDialogOpen(open);
          if (!open) {
            setClearConfirmation("");
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-[400px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Clear direct messages?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages in this conversation for both participants.
              Type <strong>{clearTargetName}</strong> or <strong>CLEAR</strong> to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={clearConfirmation}
            onChange={(event) => setClearConfirmation(event.target.value)}
            placeholder={`Type ${clearTargetName} or CLEAR`}
            disabled={isClearing}
          />
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isClearing} onClick={() => setClearDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleClearThread();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isClearing || (clearConfirmation !== "CLEAR" && clearConfirmation !== clearTargetName)}
            >
              {isClearing ? "Clearing..." : "Clear Conversation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
