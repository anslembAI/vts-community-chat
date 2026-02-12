"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, X, Check, Smile, MessageSquare, CheckCheck, ShieldAlert } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { BadgeList, ReputationScore } from "@/components/reputation/reputation-badge";

function getDocIconFromType(type?: string) {
    if (!type) return "📁";
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    if (type.includes("presentation") || type.includes("powerpoint")) return "📎";
    if (type.includes("text/plain")) return "📃";
    return "📁";
}

interface MessageUser {
    _id: Id<"users">;
    name?: string;
    username?: string;
    imageUrl?: string;
    isAdmin?: boolean;
    suspended?: boolean;
    badges?: string[];
    reputation?: number;
}

interface ReactionInfo {
    _id: string;
    emoji: string;
    userId: Id<"users">;
    user?: { name?: string; username?: string };
}

interface MessageData {
    _id: Id<"messages">;
    content: string;
    timestamp: number;
    edited?: boolean;
    editedAt?: number;
    isModerated?: boolean;
    imageUrl?: string;
    documentUrl?: string;
    documentName?: string;
    documentType?: string;
    user?: MessageUser;
    reactions?: ReactionInfo[];
    replyCount?: number;
    lastReplyAt?: number;
    parentMessageId?: Id<"messages">;
}

interface ReactionGroup {
    count: number;
    users: string[];
    hasReacted: boolean;
}

interface MessageItemProps {
    message: MessageData;
    currentUserId?: Id<"users">;
    currentUserIsAdmin?: boolean;
    isChannelLocked?: boolean;
    isAnnouncement?: boolean;
    sessionId?: string | null;
    onEdit: (messageId: Id<"messages">, content: string) => Promise<void>;
    onDelete: (messageId: Id<"messages">) => Promise<void>;
    onReaction: (messageId: Id<"messages">, emoji: string) => Promise<void>;
    onReply?: (messageId: Id<"messages">) => void;
    onMarkAsRead?: (messageId: Id<"messages">) => Promise<void>;
    isThreadView?: boolean;
    readStatus?: { readCount: number; hasRead: boolean } | null;
}

export function MessageItem({
    message: msg,
    currentUserId,
    currentUserIsAdmin,
    isChannelLocked,
    isAnnouncement = false,
    // sessionId is received but not directly used in this component's render
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    sessionId,
    onEdit,
    onDelete,
    onReaction,
    onReply,
    onMarkAsRead,
    isThreadView = false,
    readStatus,
}: MessageItemProps) {
    const isCurrentUser = msg.user && currentUserId && msg.user._id === currentUserId;
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(msg.content);

    // Compute edit eligibility after mount to avoid impure Date.now() in render
    // Use state for "now" to avoid impure Date.now() during render and hydration mismatches
    const [now, setNow] = useState(0);

    useEffect(() => {
        const updateNow = () => setNow(Date.now());
        updateNow(); // Initial update
        const interval = setInterval(updateNow, 30000); // Update every 30s
        return () => clearInterval(interval);
    }, []);

    // Edit condition: Owner + Time Window + (Unlocked OR Admin)
    // In announcement channels, only admin can edit (they are the only ones who can post)
    // We only enable edit if `now` has been set (client-side)
    const canEdit = !!(now && isCurrentUser &&
        (now - msg.timestamp <= 10 * 60 * 1000) &&
        (!isChannelLocked || currentUserIsAdmin) &&
        (!isAnnouncement || currentUserIsAdmin));

    // Reply condition: Channel Unlocked OR Admin
    // In announcement channels, replies are disabled entirely
    const canReply = !isAnnouncement && (!isChannelLocked || currentUserIsAdmin) && !msg.isModerated;

    // If message is moderated (soft-deleted), show a simplified placeholder
    if (msg.isModerated) {
        return (
            <div
                className={cn(
                    "group flex items-start gap-3 opacity-50",
                    isCurrentUser ? "flex-row-reverse" : "flex-row"
                )}
            >
                <Avatar className="h-8 w-8 grayscale">
                    <AvatarImage src={msg.user?.imageUrl} />
                    <AvatarFallback>
                        {msg.user?.name?.charAt(0) || msg.user?.username?.charAt(0) || "?"}
                    </AvatarFallback>
                </Avatar>

                <div
                    className={cn(
                        "flex flex-col max-w-[70%]",
                        isCurrentUser ? "items-end" : "items-start"
                    )}
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
                    </div>
                    <div className="px-3 py-2 rounded-lg text-sm bg-destructive/5 border border-destructive/10 rounded-tl-none">
                        <div className="flex items-center gap-1.5 text-muted-foreground italic">
                            <ShieldAlert className="h-3 w-3 text-destructive/50" />
                            <span className="text-xs">{msg.content}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleEditSave = async () => {
        if (!editContent.trim()) return;
        try {
            await onEdit(msg._id, editContent);
            setIsEditing(false);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditCancel = () => {
        setIsEditing(false);
        setEditContent(msg.content);
    };

    return (
        <div
            className={cn(
                "group flex items-start gap-3",
                isCurrentUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <Avatar className="h-8 w-8 hover:scale-105 transition-transform duration-200">
                <AvatarImage src={msg.user?.imageUrl} />
                <AvatarFallback>
                    {msg.user?.name?.charAt(0) || msg.user?.username?.charAt(0) || "?"}
                </AvatarFallback>
            </Avatar>

            <div
                className={cn(
                    "flex flex-col max-w-[70%]",
                    isCurrentUser ? "items-end" : "items-start"
                )}
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
                    {msg.user?.badges && msg.user.badges.length > 0 && (
                        <BadgeList badges={msg.user.badges} size="sm" maxShow={2} />
                    )}
                    {typeof msg.user?.reputation === "number" && msg.user.reputation > 0 && (
                        <ReputationScore score={msg.user.reputation} size="sm" />
                    )}
                </div>

                <div className="flex items-end gap-2 group-hover:opacity-100 transition-opacity">
                    {/* Message Bubble */}
                    <div className="flex flex-col gap-1">
                        <div
                            className={cn(
                                "px-3 py-2 rounded-lg text-sm relative shadow-sm",
                                isAnnouncement
                                    ? "bg-amber-500/10 text-foreground border border-amber-500/20 rounded-tl-none"
                                    : isCurrentUser
                                        ? "bg-primary text-primary-foreground rounded-tr-none"
                                        : "bg-secondary text-secondary-foreground rounded-tl-none"
                            )}
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
                                                handleEditSave();
                                            }
                                            if (e.key === "Escape") handleEditCancel();
                                        }}
                                    />
                                    <div className="flex justify-end gap-1">
                                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-muted/20" onClick={handleEditCancel}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-muted/20" onClick={handleEditSave}>
                                            <Check className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {msg.imageUrl && (
                                        <div className="rounded-lg overflow-hidden my-1">
                                            <Image
                                                src={msg.imageUrl}
                                                alt="Attachment"
                                                width={400}
                                                height={300}
                                                className="max-w-full max-h-[300px] object-contain rounded-md w-auto h-auto"
                                                loading="lazy"
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                    {msg.documentUrl && (
                                        <a
                                            href={msg.documentUrl}
                                            download={msg.documentName ?? ""}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 bg-muted/40 hover:bg-muted/70 border rounded-lg px-3 py-2.5 transition-colors group max-w-xs my-1"
                                        >
                                            <span className="text-xl shrink-0">{getDocIconFromType(msg.documentType)}</span>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm font-medium truncate group-hover:underline">
                                                    {msg.documentName || "Download File"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    Click to download
                                                </span>
                                            </div>
                                        </a>
                                    )}
                                    {msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>}
                                </div>
                            )}
                        </div>

                        {/* Thread Reply Indicator (Only in Main View, NOT in announcement channels) */}
                        {!isThreadView && !isAnnouncement && typeof msg.replyCount === "number" && msg.replyCount > 0 && (
                            <div
                                onClick={() => onReply?.(msg._id)}
                                className="flex items-center gap-2 mt-1 cursor-pointer hover:bg-muted/50 p-1 rounded-md transition-colors self-start"
                            >
                                <div className="flex -space-x-1">
                                    <div className="bg-muted text-muted-foreground w-4 h-4 rounded-full flex items-center justify-center text-[8px] ring-2 ring-background">
                                        <MessageSquare className="h-2.5 w-2.5" />
                                    </div>
                                </div>
                                <span className="text-xs text-blue-500 font-medium hover:underline">
                                    {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    Last reply {new Date(msg.lastReplyAt || 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}

                        {/* Mark as Read / Acknowledgment (Announcement channels only) */}
                        {isAnnouncement && readStatus && (
                            <div className="flex items-center gap-2 mt-1.5">
                                {readStatus.hasRead ? (
                                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                        <CheckCheck className="h-3.5 w-3.5" />
                                        <span>Acknowledged</span>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-[11px] px-2.5 gap-1 border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                                        onClick={() => onMarkAsRead?.(msg._id)}
                                    >
                                        <Check className="h-3 w-3" />
                                        Mark as Read
                                    </Button>
                                )}
                                {currentUserIsAdmin && (
                                    <span className="text-[10px] text-muted-foreground">
                                        {readStatus.readCount} {readStatus.readCount === 1 ? "read" : "reads"}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ACTION TOOLBAR (Reaction, Reply, Edit, Delete) */}
                    {!isEditing && (
                        <div className="flex items-center bg-background/80 backdrop-blur-sm rounded-full shadow-sm border opacity-0 group-hover:opacity-100 transition-opacity ml-2 px-1">
                            {/* Reaction Picker — always available */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted">
                                        <Smile className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align={isCurrentUser ? "end" : "start"} className="flex gap-1 p-2">
                                    {["👍", "❤️", "😂", "😮", "😢", "😡"].map((emoji) => (
                                        <Button
                                            key={emoji}
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 rounded-full text-lg hover:bg-muted"
                                            onClick={() => onReaction(msg._id, emoji)}
                                        >
                                            {emoji}
                                        </Button>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Reply Button (Only if not in thread view and NOT announcement) */}
                            {!isThreadView && canReply && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full hover:bg-muted"
                                    onClick={() => onReply?.(msg._id)}
                                    title="Reply in thread"
                                >
                                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                            )}

                            {/* Edit/Delete Menu */}
                            {(isCurrentUser || currentUserIsAdmin) && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-muted">
                                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {canEdit && (
                                            <DropdownMenuItem onClick={() => { setIsEditing(true); setEditContent(msg.content); }}>
                                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                                Edit
                                            </DropdownMenuItem>
                                        )}
                                        {(isCurrentUser || currentUserIsAdmin) && (
                                            <DropdownMenuItem onClick={() => onDelete(msg._id)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    )}
                </div>

                {/* REACTIONS DISPLAY */}
                {msg.reactions && msg.reactions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1 ml-1">
                        {Object.entries(
                            (msg.reactions || []).reduce<Record<string, ReactionGroup>>((acc, r) => {
                                if (!acc[r.emoji]) {
                                    acc[r.emoji] = { count: 0, users: [], hasReacted: false };
                                }
                                acc[r.emoji].count++;
                                acc[r.emoji].users.push(r.user?.name || "Unknown");
                                if (r.userId === currentUserId) acc[r.emoji].hasReacted = true;
                                return acc;
                            }, {})
                        ).map(([emoji, data]: [string, ReactionGroup]) => (
                            <Button
                                key={emoji}
                                variant={data.hasReacted ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "h-5 px-1.5 py-0 text-xs gap-1 rounded-full border border-transparent hover:border-border",
                                    data.hasReacted ? "bg-secondary/80 border-primary/20" : "bg-background/50"
                                )}
                                onClick={() => onReaction(msg._id, emoji)}
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
}
