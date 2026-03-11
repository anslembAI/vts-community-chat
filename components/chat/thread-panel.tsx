"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { X, Loader2, MessageSquare, ChevronLeft } from "lucide-react";
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
    const markThreadRead = useMutation(api.threads.markThreadRead);

    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        if (sessionId) {
            markThreadRead({ sessionId, parentMessageId: messageId });
        }
    }, [replies, sessionId, messageId, markThreadRead]);

    const handleEdit = async (msgId: Id<"messages">, content: string) => {
        try {
            await editMessage({ sessionId: sessionId!, messageId: msgId, content });
        } catch {
            toast({ variant: "destructive", description: "Failed to update reply" });
        }
    };

    const handleDelete = async (msgId: Id<"messages">) => {
        if (!confirm("Delete this reply?")) return;
        try {
            await deleteMessage({ sessionId: sessionId!, messageId: msgId });
        } catch {
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
            <div className="vts-panel flex h-full flex-col rounded-none bg-white/20 lg:rounded-r-[2rem]">
                <div className="flex h-14 items-center justify-between border-b border-white/30 px-4 shrink-0">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">Thread</h3>
                    </div>
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
        <div className="vts-panel absolute inset-0 z-50 flex h-full w-full flex-col border-l-0 bg-white/18 lg:relative lg:w-[400px] lg:rounded-r-[2rem]">
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-white/30 px-4 shrink-0 bg-white/18">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-black/55" />
                    <h3 className="font-medium text-sm text-black">Thread</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="vts-icon-button h-9 w-9 rounded-full text-black/80 hover:bg-white/60">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Parent Message */}
                <div className="border-b border-white/35 pb-4">
                    {parentMessage && (
                        <MessageItem
                            message={parentMessage}
                            currentUserId={currentUser?._id}
                            currentUserIsAdmin={isAdmin}
                            isChannelLocked={isLocked}
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
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-black/45">
                            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
                        </span>
                        <div className="h-[1px] flex-1 bg-white/35" />
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
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onReaction={handleReaction}
                            isThreadView
                        />
                    ))}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Input with Mobile Back Button */}
            <div className="relative shrink-0 border-t border-white/30 bg-transparent">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onClose}
                    className="vts-soft-card absolute -top-12 left-4 z-[60] flex h-8 items-center gap-1.5 rounded-full px-4 text-xs font-bold text-black lg:hidden"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back
                </Button>
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
