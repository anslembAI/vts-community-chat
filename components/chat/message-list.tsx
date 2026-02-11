"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MoreVertical, Pencil, Trash2, X, Check, Smile } from "lucide-react";
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

export function MessageList({ channelId, onThreadSelect }: MessageListProps) {
    const { sessionId } = useAuth();
    const messages = useQuery(api.messages.getMessages, { channelId });
    const moneyRequests = useQuery(api.money.listMoneyRequests, { channelId, sessionId: sessionId ?? undefined });
    const activePolls = useQuery(api.polls.getActivePollsForChannel, { channelId });
    const channel = useQuery(api.channels.getChannel, { channelId });

    const currentUser = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });
    const bottomRef = useRef<HTMLDivElement>(null);

    const editMessage = useMutation(api.messages.editMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const toggleReaction = useMutation(api.messages.toggleReaction);
    const markAnnouncementRead = useMutation(api.channels.markAnnouncementRead);
    const { toast } = useToast();

    const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);
    const [editContent, setEditContent] = useState("");

    const isAnnouncement = channel?.type === "announcement";

    // Fetch announcement read statuses (only for announcement channels)
    const announcementReadStatus = useQuery(
        api.channels.getAnnouncementReadStatus,
        isAnnouncement ? { channelId, sessionId: sessionId ?? undefined } : "skip"
    );

    // Build a map of messageId -> read status
    const readStatusMap = new Map<string, { readCount: number; hasRead: boolean }>();
    if (announcementReadStatus) {
        for (const status of announcementReadStatus) {
            readStatusMap.set(status.messageId, {
                readCount: status.readCount,
                hasRead: status.hasRead,
            });
        }
    }

    // Build set of active poll IDs for dedup
    const activePollIds = new Set((activePolls ?? []).map(p => p._id.toString()));

    // Combine and sort
    const combinedItems = [
        ...(messages || []).map(m => ({ ...m, itemType: (m.type === "poll" ? "poll" : "message") as string, sortTime: m.timestamp })),
        ...(moneyRequests || []).map(r => ({ ...r, itemType: "money_request" as string, sortTime: r.createdAt }))
    ].sort((a, b) => a.sortTime - b.sortTime);

    useEffect(() => {
        if (combinedItems.length > 0) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, moneyRequests, combinedItems.length]);

    const isChannelLocked = (channel?.locked ?? false) && !currentUser?.isAdmin;

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

    if (messages === undefined || moneyRequests === undefined) {
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
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
                {isAnnouncement ? (
                    <>
                        <p>No announcements yet.</p>
                        <p className="text-sm">Announcements from admins will appear here.</p>
                    </>
                ) : (
                    <>
                        <p>No messages yet.</p>
                        <p className="text-sm">Start the conversation!</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* ─── Pinned Active Polls (not in announcement channels) ───── */}
            {!isAnnouncement && activePolls && activePolls.length > 0 && (
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3 space-y-2">
                    {activePolls.map((poll: any) => (
                        <div key={poll._id} className="flex justify-center">
                            <PollCard pollId={poll._id} pinned />
                        </div>
                    ))}
                </div>
            )}

            {/* ─── Message Stream ────────────────────────────────────────── */}
            <div className="p-4 space-y-4">
                {combinedItems.map((item: any) => {
                    // ────── Money Request Card ──────
                    if (item.itemType === "money_request") {
                        return (
                            <div key={item._id} className={`flex ${item.requesterId === currentUser?._id ? "justify-end" : "justify-start"}`}>
                                <MoneyRequestCard request={item} />
                            </div>
                        );
                    }

                    // ────── Poll Card (inline, skip if already pinned) ──────
                    if (item.itemType === "poll" && item.pollId) {
                        const isPinned = activePollIds.has(item.pollId.toString());
                        if (isPinned) {
                            return (
                                <div key={item._id} className="flex justify-center py-1">
                                    <div className="text-[11px] text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                        📊 Active poll pinned above
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={item._id} className="flex justify-center py-1">
                                <PollCard pollId={item.pollId} />
                            </div>
                        );
                    }

                    // ────── Regular Text Message / Announcement ──────
                    const msg = item;
                    const msgReadStatus = isAnnouncement
                        ? readStatusMap.get(msg._id) || { readCount: 0, hasRead: false }
                        : null;

                    return (
                        <MessageItem
                            key={msg._id}
                            message={msg}
                            currentUserId={currentUser?._id}
                            currentUserIsAdmin={currentUser?.isAdmin}
                            isChannelLocked={isChannelLocked}
                            isAnnouncement={isAnnouncement}
                            sessionId={sessionId}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onReaction={handleReaction}
                            onReply={onThreadSelect}
                            onMarkAsRead={handleMarkAsRead}
                            readStatus={msgReadStatus}
                        />
                    );
                })}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
