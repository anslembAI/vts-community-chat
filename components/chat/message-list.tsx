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

interface MessageListProps {
    channelId: Id<"channels">;
}

export function MessageList({ channelId }: MessageListProps) {
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
    const { toast } = useToast();

    const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);
    const [editContent, setEditContent] = useState("");

    // Build set of active poll IDs for dedup
    const activePollIds = new Set((activePolls ?? []).map(p => p._id.toString()));

    // Combine and sort
    const combinedItems = [
        ...(messages || []).map(m => ({ ...m, itemType: (m.type === "poll" ? "poll" : "message") as string, sortTime: m.timestamp })),
        ...(moneyRequests || []).map(r => ({ ...r, itemType: "money_request" as string, sortTime: r.createdAt }))
    ].sort((a, b) => a.sortTime - b.sortTime);

    useEffect(() => {
        if (combinedItems.length > 0) {
            if (!editingId) {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [messages, moneyRequests, editingId, combinedItems.length]);

    const handleEditStart = (msg: any) => {
        setEditingId(msg._id);
        setEditContent(msg.content);
    };

    const handleEditCancel = () => {
        setEditingId(null);
        setEditContent("");
    };

    const handleEditSave = async (resultMsgId: Id<"messages">) => {
        if (!editContent.trim()) return;

        try {
            await editMessage({
                sessionId: sessionId!,
                messageId: resultMsgId,
                content: editContent
            });
            setEditingId(null);
            setEditContent("");
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
                <p>No messages yet.</p>
                <p className="text-sm">Start the conversation!</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* ─── Pinned Active Polls ───────────────────────────────────── */}
            {activePolls && activePolls.length > 0 && (
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
                            // Don't duplicate — show a compact reference
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

                    // ────── Regular Text Message ──────
                    const msg = item;
                    const isCurrentUser = msg.user && currentUser && msg.user._id === currentUser._id;
                    const isEditing = editingId === msg._id;

                    // Edit condition: Owner + Time Window + (Unlocked OR Admin)
                    const canEdit = isCurrentUser &&
                        (Date.now() - msg.timestamp <= 10 * 60 * 1000) &&
                        (!(channel?.locked) || currentUser?.isAdmin);

                    return (
                        <div
                            key={msg._id}
                            className={`group flex items-start gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"
                                }`}
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.user?.imageUrl} />
                                <AvatarFallback>
                                    {msg.user?.name?.charAt(0) || msg.user?.username?.charAt(0) || "?"}
                                </AvatarFallback>
                            </Avatar>

                            <div
                                className={`flex flex-col max-w-[70%] ${isCurrentUser ? "items-end" : "items-start"}`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-semibold text-muted-foreground">
                                        {msg.user?.name || msg.user?.username || "Unknown"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                    {msg.edited && (
                                        <span className="text-[10px] text-muted-foreground italic">(edited)</span>
                                    )}
                                </div>

                                <div className="flex items-end gap-2 group-hover:opacity-100 transition-opacity">
                                    {/* Message Bubble */}
                                    <div
                                        className={`px-3 py-2 rounded-lg text-sm ${isCurrentUser
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-secondary text-secondary-foreground rounded-tl-none"
                                            } relative`}
                                    >
                                        {isEditing ? (
                                            <div className="flex flex-col gap-2 min-w-[200px]">
                                                <Input
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="bg-background text-foreground h-8 text-xs"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleEditSave(msg._id);
                                                        }
                                                        if (e.key === "Escape") handleEditCancel();
                                                    }}
                                                />
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-muted/20" onClick={handleEditCancel}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-muted/20" onClick={() => handleEditSave(msg._id)}>
                                                        <Check className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            msg.content
                                        )}
                                    </div>

                                    {/* REACTION PICKER */}
                                    {!isEditing && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-muted">
                                                    <Smile className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align={isCurrentUser ? "end" : "start"} className="flex gap-1 p-2">
                                                {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emoji) => (
                                                    <Button
                                                        key={emoji}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 rounded-full text-lg hover:bg-muted"
                                                        onClick={() => toggleReaction({ sessionId: sessionId!, messageId: msg._id, emoji })}
                                                    >
                                                        {emoji}
                                                    </Button>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}

                                    {/* Edit/Delete Menu */}
                                    {(isCurrentUser || currentUser?.isAdmin) && !isEditing && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="h-3 w-3" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                {canEdit && (
                                                    <DropdownMenuItem onClick={() => handleEditStart(msg)}>
                                                        <Pencil className="mr-2 h-3.5 w-3.5" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                )}
                                                {(isCurrentUser || currentUser?.isAdmin) && (
                                                    <DropdownMenuItem onClick={() => handleDelete(msg._id)} className="text-destructive focus:text-destructive">
                                                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>

                                {/* REACTIONS DISPLAY */}
                                {msg.reactions && msg.reactions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1 ml-1">
                                        {Object.entries(
                                            (msg.reactions || []).reduce((acc: any, r: any) => {
                                                if (!acc[r.emoji]) {
                                                    acc[r.emoji] = { count: 0, users: [], hasReacted: false };
                                                }
                                                acc[r.emoji].count++;
                                                acc[r.emoji].users.push(r.user?.name || "Unknown");
                                                if (r.userId === currentUser?._id) acc[r.emoji].hasReacted = true;
                                                return acc;
                                            }, {})
                                        ).map(([emoji, data]: [string, any]) => (
                                            <Button
                                                key={emoji}
                                                variant={data.hasReacted ? "secondary" : "ghost"}
                                                size="sm"
                                                className={`h-6 px-1.5 py-0 text-xs gap-1 rounded-full border border-transparent hover:border-border ${data.hasReacted ? "bg-secondary/80 border-primary/20" : "bg-background/50"
                                                    }`}
                                                onClick={() => toggleReaction({ sessionId: sessionId!, messageId: msg._id, emoji })}
                                                title={`Reacted by: ${data.users.join(", ")}`}
                                            >
                                                <span>{emoji}</span>
                                                <span className="text-[10px]">{data.count}</span>
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
        </div>
    );
}
