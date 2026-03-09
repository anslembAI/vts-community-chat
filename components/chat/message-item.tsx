"use client";

import { useState, useEffect, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Pencil, Trash2, X, Check, Smile, MessageSquare, CheckCheck, ShieldAlert, ZoomIn } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ReputationScore, BadgeList } from "@/components/reputation/reputation-badge";
import { VoiceMessageBubble } from "@/components/chat/voice-message-bubble";
import { MessageActions } from "@/components/chat/message-actions";
import { ImageLightbox } from "@/components/chat/image-lightbox";
import { VideoAttachmentBubble } from "@/components/chat/video-attachment-bubble";

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
    avatarUrl?: string | null;
    isAdmin?: boolean;
    role?: string;
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
    imageUrl?: string | null;
    documentUrl?: string | null;
    documentName?: string;
    documentType?: string;
    type?: "text" | "poll" | "voice";
    voiceStorageId?: Id<"_storage">;
    voiceDurationMs?: number;
    voiceMimeType?: string;
    // Video attachment
    videoUrl?: string | null;
    videoThumbUrl?: string | null;
    videoStorageId?: Id<"_storage">;
    videoDurationMs?: number;
    videoFormat?: string;
    user?: MessageUser | null;
    reactions?: ReactionInfo[];
    replyCount?: number;
    lastReplyAt?: number;
    parentMessageId?: Id<"messages">;
    channelId?: Id<"channels">;
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
    onRemoveUser?: (userId: Id<"users">) => Promise<void>;
    isThreadView?: boolean;
    readStatus?: { readCount: number; hasRead: boolean } | null;
    isUnreadThread?: boolean;
}

export function MessageItem({
    message: msg,
    currentUserId,
    currentUserIsAdmin,
    isChannelLocked,
    isAnnouncement = false,
    // sessionId is received but not directly used in this component's render
     
    sessionId,
    onEdit,
    onDelete,
    onReaction,
    onReply,
    onMarkAsRead,
    onRemoveUser,
    isThreadView = false,
    readStatus,
    isUnreadThread = false,
}: MessageItemProps) {
    const isCurrentUser = msg.user && currentUserId && msg.user._id === currentUserId;
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(msg.content);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const [sheetOpen, setSheetOpen] = useState(false);
    const touchStartPos = useRef<{ x: number, y: number } | null>(null);
    const touchTimer = useRef<NodeJS.Timeout | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        if ((e.target as HTMLElement).closest('button, a, input')) return;

        const touch = e.touches[0];
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };

        touchTimer.current = setTimeout(() => {
            if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
            setSheetOpen(true);
        }, 400);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!touchStartPos.current || !touchTimer.current) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > 10 || dy > 10) {
            clearTimeout(touchTimer.current);
            touchTimer.current = null;
        }
    };

    const handleTouchEnd = () => {
        if (touchTimer.current) {
            clearTimeout(touchTimer.current);
            touchTimer.current = null;
        }
        touchStartPos.current = null;
    };

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
                    "group flex items-start gap-3 opacity-60",
                    isCurrentUser ? "flex-row-reverse" : "flex-row"
                )}
            >
                <Avatar className="h-8 w-8 grayscale">
                    <AvatarImage src={msg.user?.avatarUrl ?? undefined} />
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
                        <span className="text-xs font-semibold text-black/45">
                            {msg.user?.name || msg.user?.username || "Unknown"}
                        </span>
                        <span className="text-[10px] text-black/35">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg rounded-tl-none border border-white/35 bg-white/38 px-3 py-2 text-sm">
                            <div className="flex items-center gap-1.5 italic text-black/45">
                                <ShieldAlert className="h-3 w-3 text-black/30" />
                                <span className="text-xs">{msg.content}</span>
                            </div>
                        </div>

                        {/* Admin can still delete moderated messages */}
                        {currentUserIsAdmin && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-white/55">
                                            <MoreVertical className="h-3.5 w-3.5 text-black/40" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onDelete(msg._id)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                                            Delete Permanently
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        )}
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
                "group flex items-start gap-3 w-full",
                isCurrentUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <Avatar className="h-9 w-9 border border-white/50 shadow-sm hover:scale-105 transition-transform duration-200">
                <AvatarImage src={msg.user?.avatarUrl ?? undefined} />
                <AvatarFallback>
                    {msg.user?.name?.charAt(0) || msg.user?.username?.charAt(0) || "?"}
                </AvatarFallback>
            </Avatar>

            <div
                className={cn(
                    "flex flex-col min-w-0 max-w-[85%] sm:max-w-[70%]",
                    isCurrentUser ? "items-end" : "items-start"
                )}
            >
                <div className={cn(
                    "flex flex-col gap-0.5 mb-1 max-w-full",
                    isCurrentUser ? "items-end" : "items-start"
                )}>
                    {/* BADGES ROW (Above Name) */}
                    <div className={cn(
                        "flex items-center gap-1.5 flex-wrap",
                        isCurrentUser && "justify-end"
                    )}>
                        {/* Only show badges if they exist to avoid empty height/margin issues if flex gap affects it, though gap-1.5 handles it */}
                        {(msg.user?.role === "admin" || (!msg.user?.role && msg.user?.isAdmin)) && (
                            <Badge variant="default" className="text-[9px] h-[18px] px-1.5 bg-red-500/90 hover:bg-red-600 border-none shadow-none shrink-0 font-bold uppercase tracking-wider">Admin</Badge>
                        )}
                        {msg.user?.role === "moderator" && (
                            <Badge variant="default" className="text-[9px] h-[18px] px-1.5 bg-green-500/90 hover:bg-green-600 border-none shadow-none shrink-0 font-bold uppercase tracking-wider">Mod</Badge>
                        )}
                        {msg.user?.badges && msg.user.badges.length > 0 && (
                            <BadgeList badges={msg.user.badges} size="sm" maxShow={3} />
                        )}
                        {typeof msg.user?.reputation === "number" && msg.user.reputation > 0 && (
                            <ReputationScore score={msg.user.reputation} size="sm" />
                        )}
                    </div>

                    {/* NAME & TIME ROW */}
                    <div className={cn(
                        "flex items-baseline gap-2.5 max-w-full",
                        isCurrentUser && "flex-row-reverse" // keep name on far right for current user
                    )}>
                        <span className="truncate text-sm font-semibold text-[#2c3034] leading-none">
                            {msg.user?.name || msg.user?.username || "Unknown"}
                        </span>
                        <span className="shrink-0 text-xs font-medium leading-none text-black/45">
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                        {msg.edited && (
                            <span className="text-xs text-[#7A7A7A] italic shrink-0 leading-none">(edited)</span>
                        )}
                    </div>
                </div>

                <div className={cn("flex items-center gap-2 group-hover:opacity-100 transition-opacity min-w-0 w-full", isCurrentUser && "flex-row-reverse")}>
                    {/* Message Bubble */}
                    <div
                        className="flex flex-col gap-1 min-w-0 w-full cursor-auto"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                    >
                        <div
                            className={cn(
                                "relative min-w-0 break-words rounded-[1.4rem] pl-4 pr-11 py-3 text-[15px] leading-relaxed text-black",
                                isAnnouncement
                                    ? "bg-amber-500/10 text-black border border-amber-500/20 shadow-[0_10px_26px_rgba(210,169,64,0.08)]"
                                    : isCurrentUser
                                        ? "bg-[linear-gradient(180deg,rgba(210,231,217,0.96),rgba(198,222,205,0.92))] border border-white/45 shadow-[0_12px_28px_rgba(120,140,154,0.12)]"
                                        : "bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(245,248,250,0.52))] border border-white/55 shadow-[0_12px_28px_rgba(120,140,154,0.1)]"
                            )}
                        >
                            {isEditing ? (
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                    <Input
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="h-8 border-white/40 bg-white/65 text-xs text-black"
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
                                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-white/50" onClick={handleEditCancel}>
                                            <X className="h-3 w-3" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-white/50" onClick={handleEditSave}>
                                            <Check className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {msg.imageUrl && (
                                        <>
                                            <div
                                            className="relative my-1 cursor-pointer overflow-hidden rounded-xl group/img"
                                                onClick={() => setLightboxOpen(true)}
                                                role="button"
                                                tabIndex={0}
                                                aria-label="Open image fullscreen"
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLightboxOpen(true); }}
                                            >
                                                <Image
                                                    src={msg.imageUrl ?? undefined}
                                                    alt="Attachment"
                                                    width={400}
                                                    height={300}
                                                    className="h-auto max-h-[300px] w-auto max-w-full rounded-lg object-contain transition-all duration-200 group-hover/img:brightness-90"
                                                    loading="lazy"
                                                    unoptimized
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity duration-200 bg-black/10 rounded-md">
                                                    <div className="bg-black/60 text-white rounded-full p-2 shadow-lg">
                                                        <ZoomIn className="h-5 w-5" />
                                                    </div>
                                                </div>
                                            </div>
                                            <ImageLightbox
                                                src={msg.imageUrl}
                                                alt="Shared image"
                                                open={lightboxOpen}
                                                onClose={() => setLightboxOpen(false)}
                                            />
                                        </>
                                    )}
                                    {msg.videoUrl && (
                                        <VideoAttachmentBubble
                                            videoUrl={msg.videoUrl}
                                            thumbUrl={msg.videoThumbUrl}
                                            durationMs={msg.videoDurationMs}
                                            videoFormat={msg.videoFormat}
                                        />
                                    )}
                                    {msg.documentUrl && (
                                        <a
                                            href={msg.documentUrl ?? undefined}
                                            download={msg.documentName ?? ""}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        className="group my-1 flex max-w-xs items-center gap-3 rounded-xl border border-white/50 bg-white/35 px-3 py-2.5 transition-colors hover:bg-white/55"
                                        >
                                            <span className="text-xl shrink-0">{getDocIconFromType(msg.documentType)}</span>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-sm font-medium truncate group-hover:underline">
                                                    {msg.documentName || "Download File"}
                                                </span>
                                                <span className="text-[10px] text-black/35">
                                                    Click to download
                                                </span>
                                            </div>
                                        </a>
                                    )}

                                    {msg.type === "voice" && msg.voiceStorageId && msg.voiceDurationMs ? (
                                        <div className="my-1 w-full min-w-0 overflow-hidden">
                                            <VoiceMessageBubble
                                                storageId={msg.voiceStorageId}
                                                durationMs={msg.voiceDurationMs}
                                                channelId={msg.channelId as any} // Requires passing channelId from props, or passing it from msg if available... wait, channelId is not present. Let me check if msg has channelId.
                                                sessionId={sessionId}
                                            />
                                        </div>
                                    ) : (
                                        msg.content && <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                                    )}
                                </div>
                            )}

                            {!isEditing && (
                                <MessageActions
                                    messageId={msg._id}
                                    content={msg.content}
                                    type={msg.type}
                                    canEdit={!!canEdit}
                                    canReply={!!canReply}
                                    canDelete={isCurrentUser || !!currentUserIsAdmin}
                                    canRemoveUser={!!(currentUserIsAdmin && !isCurrentUser && msg.user)}
                                    isCurrentUser={!!isCurrentUser}
                                    onEdit={() => { setIsEditing(true); setEditContent(msg.content); }}
                                    onDelete={() => onDelete(msg._id)}
                                    onReply={() => onReply?.(msg._id)}
                                    onReaction={(emoji) => onReaction(msg._id, emoji)}
                                    onRemoveUser={() => msg.user && onRemoveUser?.(msg.user._id)}
                                    open={sheetOpen}
                                    onOpenChange={setSheetOpen}
                                />
                            )}
                        </div>

                        {/* Thread Reply Indicator (Only in Main View, NOT in announcement channels) */}
                        {!isThreadView && !isAnnouncement && typeof msg.replyCount === "number" && msg.replyCount > 0 && (
                            <div
                                onClick={() => onReply?.(msg._id)}
                                className="mt-1 flex cursor-pointer items-center gap-2 self-start rounded-xl p-1.5 transition-colors hover:bg-white/25"
                            >
                                <div className="flex -space-x-1">
                                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white/65 text-[8px] text-black/45 ring-2 ring-[#f2f2ef]">
                                        <MessageSquare className="h-2.5 w-2.5" />
                                    </div>
                                </div>
                                <span className="text-xs text-blue-500 font-medium hover:underline">
                                    {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
                                </span>
                                {isUnreadThread && (
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="New replies" />
                                )}
                                <span className="text-[10px] text-black/35 group-hover:text-black/45">
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
                                    <span className="text-[10px] text-black/35">
                                        {readStatus.readCount} {readStatus.readCount === 1 ? "read" : "reads"}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* REACTIONS DISPLAY */}
                {
                    msg.reactions && msg.reactions.length > 0 && (
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
                    )
                }
            </div>
        </div>
    );
}
