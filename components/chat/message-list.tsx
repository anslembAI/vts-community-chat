"use client";

import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState, useCallback, memo, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MoreVertical, Pencil, Trash2, X, Check, Smile, Loader2 } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MoneyRequestCard } from "@/components/money/money-request-card";
import { PollCard } from "@/components/polls/poll-card";
import { MessageItem } from "./message-item";

interface MessageListProps {
    channelId: Id<"channels">;
    onThreadSelect?: (messageId: Id<"messages">) => void;
}

const BATCH_SIZE = 30;

const DEFAULT_READ_STATUS = { readCount: 0, hasRead: false };

export function MessageList({ channelId, onThreadSelect }: MessageListProps) {
    const { sessionId } = useAuth();

    const {
        results: messagesDesc,
        status,
        loadMore,
        isLoading
    } = usePaginatedQuery(
        api.messages.getMessagesPaginated,
        (sessionId && channelId) ? { channelId, sessionId } : "skip",
        { initialNumItems: BATCH_SIZE }
    );

    const moneyRequests = useQuery(api.money.listMoneyRequests, (sessionId && channelId) ? { channelId, sessionId } : "skip");

    const channel = useQuery(api.channels.getChannel, channelId ? { channelId } : "skip");

    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
    const bottomRef = useRef<HTMLDivElement>(null);

    const editMessage = useMutation(api.messages.editMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const toggleReaction = useMutation(api.messages.toggleReaction);
    const markAnnouncementRead = useMutation(api.channels.markAnnouncementRead);
    const removeUserFromChannel = useMutation(api.channels.removeUserFromChannel);
    const { toast } = useToast();

    const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);
    const [editContent, setEditContent] = useState("");

    const isAnnouncement = channel?.type === "announcement";

    // Fetch announcement read statuses (only for announcement channels)
    const announcementReadStatus = useQuery(
        api.channels.getAnnouncementReadStatus,
        (isAnnouncement && sessionId && channelId) ? { channelId, sessionId } : "skip"
    );

    const unreadThreads = useQuery(
        api.threads.getUnreadThreadsForChannel,
        (sessionId && channelId) ? { sessionId, channelId } : "skip"
    );

    // Build a map of messageId -> read status (memoized)
    const readStatusMap = useMemo(() => {
        const map = new Map<string, { readCount: number; hasRead: boolean }>();
        if (announcementReadStatus) {
            for (const s of announcementReadStatus) {
                map.set(s.messageId, {
                    readCount: s.readCount,
                    hasRead: s.hasRead,
                });
            }
        }
        return map;
    }, [announcementReadStatus]);



    // Combine and sort (oldest first for display) — memoized to prevent recomputation on unrelated rerenders
    const combinedItems = useMemo(
        () => [
            ...(messagesDesc || []).map(m => ({ ...m, itemType: (m.type === "poll" ? "poll" : "message") as string, sortTime: m.timestamp })),
            ...(moneyRequests || []).map(r => ({ ...r, itemType: "money_request" as string, sortTime: r.createdAt }))
        ].sort((a, b) => a.sortTime - b.sortTime),
        [messagesDesc, moneyRequests]
    );

    const isCurrentUserAdmin = currentUser?.role === "admin" || currentUser?.isAdmin;
    const isChannelLocked = (channel?.locked ?? false) && !isCurrentUserAdmin;

    const handleEdit = async (msgId: Id<"messages">, content: string) => {
        try {
            await editMessage({
                sessionId: sessionId!,
                messageId: msgId,
                content
            });
            toast({ description: "Message updated" });
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to update message" });
        }
    };

    const handleDelete = async (msgId: Id<"messages">) => {
        if (!confirm("Are you sure you want to delete this message?")) return;
        try {
            await deleteMessage({ sessionId: sessionId!, messageId: msgId });
            toast({ description: "Message deleted" });
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to delete message" });
        }
    };

    const handleReaction = async (msgId: Id<"messages">, emoji: string) => {
        if (!sessionId) return;
        try {
            await toggleReaction({ sessionId, messageId: msgId, emoji });
        } catch (error) {
            console.error(error);
        }
    };

    const handleMarkAsRead = async (msgId: Id<"messages">) => {
        if (!sessionId) return;
        try {
            await markAnnouncementRead({ sessionId, messageId: msgId });
            toast({ description: "Marked as read ✓" });
        } catch (error) {
            console.error(error);
        }
    };

    const handleRemoveUser = useCallback(async (userId: Id<"users">) => {
        if (!confirm("Are you sure you want to remove this user from the channel?")) return;
        try {
            await removeUserFromChannel({ sessionId: sessionId!, channelId, userId });
            toast({ description: "User removed from channel" });
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to remove user" });
        }
    }, [removeUserFromChannel, sessionId, channelId, toast]);

    if (isLoading) {
        return (
            <div className="flex-1 p-4 space-y-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-48" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (combinedItems.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4 text-black/50">
                {isAnnouncement ? (
                    <>
                        <p className="font-medium">No announcements yet.</p>
                        <p className="text-sm">Announcements from admins will appear here.</p>
                    </>
                ) : (
                    <>
                        <p className="font-medium">No messages yet.</p>
                        <p className="text-sm">Start the conversation!</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto px-3 pb-3 md:px-4 md:pb-4" data-tour="message-area">

            {/* ─── Message Stream (Virtualized) ────────────────────────── */}
            <div className="flex-1 min-h-0 w-full h-full">
                <Virtuoso
                    className="h-full"
                    data={combinedItems}
                    initialTopMostItemIndex={Math.max(0, combinedItems.length - 1)}
                    followOutput={(isAtBottom) => isAtBottom ? "smooth" : false}
                    startReached={() => {
                        if (status === "CanLoadMore") {
                            loadMore(BATCH_SIZE);
                        }
                    }}
                    components={{
                        Header: () => (
                            <div className="w-full py-4 flex justify-center">
                                {isLoading ? (
                                    <Loader2 className="h-5 w-5 animate-spin text-black/35" />
                                ) : status === "CanLoadMore" ? (
                                    <div className="vts-soft-card flex h-8 items-center rounded-full px-3 text-xs text-black/45">Scroll up to load more</div>
                                ) : (
                                    <div className="vts-soft-card flex h-8 items-center rounded-full px-3 text-xs text-black/45">Beginning of history</div>
                                )}
                            </div>
                        ),
                        Footer: () => <div className="h-4" />
                    }}
                    itemContent={(index, item) => {
                        // ────── Money Request Card ──────
                        if (item.itemType === "money_request") {
                            return (
                                <div className={`flex px-2 py-2 contain-item md:px-4 ${item.requesterId === currentUser?._id ? "justify-end" : "justify-start"}`}>
                                    <MoneyRequestCard request={item} />
                                </div>
                            );
                        }

                        // ────── Poll Card (inline) ──────
                        if (item.itemType === "poll" && item.pollId) {
                            return (
                                <div className="flex justify-center py-2 px-2 contain-item md:px-4">
                                    <PollCard pollId={item.pollId} />
                                </div>
                            );
                        }

                        // ────── Regular Text Message / Announcement ──────
                        const msg = item;

                        const msgReadStatus = isAnnouncement
                            ? readStatusMap.get(msg._id) || DEFAULT_READ_STATUS
                            : null;

                        return (
                            <div className="px-2 py-2 contain-item md:px-4">
                                <MessageItem
                                    message={msg}
                                    currentUserId={currentUser?._id}
                                    currentUserIsAdmin={isCurrentUserAdmin}
                                    isChannelLocked={isChannelLocked}
                                    isAnnouncement={isAnnouncement}
                                    sessionId={sessionId}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onReaction={handleReaction}
                                    onReply={onThreadSelect}
                                    onMarkAsRead={handleMarkAsRead}
                                    onRemoveUser={handleRemoveUser}
                                    readStatus={msgReadStatus}
                                    isUnreadThread={unreadThreads?.includes(msg._id)}
                                />
                            </div>
                        );
                    }}
                />
            </div>
        </div>
    );
}
