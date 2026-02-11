"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageItem } from "./message-item";
import { MessageInput } from "./message-input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { useRef, useEffect } from "react";

interface ThreadPanelProps {
    messageId: Id<"messages">;
    channelId: Id<"channels">;
    onClose: () => void;
    isLocked?: boolean;
    isAdmin?: boolean;
}

export function ThreadPanel({ messageId, channelId, onClose, isLocked, isAdmin }: ThreadPanelProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const parentMessage = useQuery(api.messages.getMessage, { messageId });
    const replies = useQuery(api.messages.getThreadMessages, { messageId });
    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");

    const editMessage = useMutation(api.messages.editMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const toggleReaction = useMutation(api.messages.toggleReaction);

    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [replies]);

    const handleEdit = async (msgId: Id<"messages">, content: string) => {
        try {
            await editMessage({ sessionId: sessionId!, messageId: msgId, content });
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to update reply" });
        }
    };

    const handleDelete = async (msgId: Id<"messages">) => {
        if (!confirm("Delete this reply?")) return;
        try {
            await deleteMessage({ sessionId: sessionId!, messageId: msgId });
        } catch (error) {
            toast({ variant: "destructive", description: "Failed to delete reply" });
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

    if (parentMessage === undefined || replies === undefined) {
        return (
            <div className="flex h-full flex-col border-l bg-background">
                <div className="flex h-14 items-center justify-between border-b px-4 shrink-0">
                    <h3 className="font-semibold text-sm">Thread</h3>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col border-l bg-background w-[400px]">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b px-4 shrink-0">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-semibold text-sm">Thread</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Parent Message */}
                <div className="pb-4 border-b">
                    {parentMessage && (
                        <MessageItem
                            message={parentMessage}
                            currentUserId={currentUser?._id}
                            currentUserIsAdmin={isAdmin}
                            isChannelLocked={isLocked}
                            sessionId={sessionId}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onReaction={handleReaction}
                            isThreadView
                        />
                    )}
                </div>

                {/* Replies Count */}
                {replies.length > 0 && (
                    <div className="flex items-center gap-2 py-2">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                        </span>
                        <div className="h-[1px] flex-1 bg-border" />
                    </div>
                )}

                {/* Replies List */}
                <div className="space-y-4">
                    {replies.map((reply) => (
                        <MessageItem
                            key={reply._id}
                            message={reply}
                            currentUserId={currentUser?._id}
                            currentUserIsAdmin={isAdmin}
                            isChannelLocked={isLocked}
                            sessionId={sessionId}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onReaction={handleReaction}
                            isThreadView
                        />
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Input */}
            <div className="shrink-0 bg-background border-t">
                <MessageInput
                    channelId={channelId}
                    parentMessageId={messageId}
                    isLocked={isLocked}
                    isAdmin={isAdmin}
                    placeholder="Reply to thread..."
                />
            </div>
        </div>
    );
}
