
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "convex/react";
import { useState } from "react";
import { MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";


interface MessageListProps {
    channelId: Id<"channels">;
}

export function MessageList({ channelId }: MessageListProps) {
    const messages = useQuery(api.messages.getMessages, { channelId });
    const { sessionId } = useAuth();
    const currentUser = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });
    const bottomRef = useRef<HTMLDivElement>(null);

    const editMessage = useMutation(api.messages.editMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const { toast } = useToast();

    const [editingId, setEditingId] = useState<Id<"messages"> | null>(null);
    const [editContent, setEditContent] = useState("");

    useEffect(() => {
        if (messages) {
            // Only scroll to bottom if we're not editing (to avoid jumping)
            if (!editingId) {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [messages, editingId]);

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

    if (messages === undefined) {
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
    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
                <p>No messages yet.</p>
                <p className="text-sm">Be the first to say hi!</p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
                const isCurrentUser = msg.user && currentUser && msg.user._id === currentUser._id;
                const isEditing = editingId === msg._id;
                // 10 minutes edit window
                const canEdit = isCurrentUser && (Date.now() - msg.timestamp <= 10 * 60 * 1000);

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
                            className={`flex flex-col max-w-[70%] ${isCurrentUser ? "items-end" : "items-start"
                                }`}
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

                            <div className="flex items-center gap-2 group-hover:opacity-100 transition-opacity">
                                {/* Edit/Delete Menu */}
                                {isCurrentUser && !isEditing && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-3 w-3" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
                                            {canEdit && (
                                                <DropdownMenuItem onClick={() => handleEditStart(msg)}>
                                                    <Pencil className="mr-2 h-3.5 w-3.5" />
                                                    Edit
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem onClick={() => handleDelete(msg._id)} className="text-destructive focus:text-destructive">
                                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}

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
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}
