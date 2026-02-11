"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Lock, Megaphone } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CreateMoneyRequestModal } from "@/components/money/create-money-request-modal";
import { CreatePollModal } from "@/components/polls/create-poll-modal";
import { PollHistory } from "@/components/polls/poll-history";

interface MessageInputProps {
    channelId: Id<"channels">;
    parentMessageId?: Id<"messages">;
    isLocked?: boolean;
    isAdmin?: boolean;
    isAnnouncement?: boolean;
    placeholder?: string;
}

export function MessageInput({
    channelId,
    parentMessageId,
    isLocked = false,
    isAdmin = false,
    isAnnouncement = false,
    placeholder = "Type a message..."
}: MessageInputProps) {
    const [content, setContent] = useState("");
    const sendMessage = useMutation(api.messages.sendMessage);
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const { sessionId } = useAuth();

    // Fetch channel details to check type
    const channel = useQuery(api.channels.getChannel, { channelId });

    // Determine if this is a money_request channel
    const isMoneyChannel = channel?.type === "money_request";

    // If locked and user is not admin, show disabled state
    const isDisabledByLock = isLocked && !isAdmin;

    // If announcement channel and user is not admin, show read-only state
    const isDisabledByAnnouncement = isAnnouncement && !isAdmin;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        if (isDisabledByLock || isDisabledByAnnouncement) return;
        if (!sessionId) {
            toast({
                title: "Error",
                description: "You must be logged in to send messages.",
                variant: "destructive",
            });
            return;
        }

        setIsSending(true);
        try {
            await sendMessage({
                channelId,
                content,
                sessionId,
                parentMessageId
            });
            setContent("");
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to send message. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    // Locked state for non-admins
    if (isDisabledByLock) {
        return (
            <div className="flex items-center gap-3 p-4 border-t bg-muted/30">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground flex-1">
                    This channel is locked by an admin.
                </p>
            </div>
        );
    }

    // Announcement read-only state for non-admins
    if (isDisabledByAnnouncement) {
        return (
            <div className="flex items-center gap-3 p-4 border-t bg-amber-500/5">
                <Megaphone className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
                    This is a broadcast channel — only admins can post.
                </p>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 p-4 border-t bg-background">
            {!parentMessageId && isMoneyChannel && (
                <CreateMoneyRequestModal channelId={channelId} />
            )}

            {!parentMessageId && !isAnnouncement && (
                <>
                    <CreatePollModal channelId={channelId} />
                    <PollHistory channelId={channelId} />
                </>
            )}

            <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                <Input
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={isAnnouncement ? "Post an announcement..." : placeholder}
                    className="flex-1"
                    disabled={isSending}
                    autoFocus
                />
                <Button type="submit" size="icon" disabled={isSending || !content.trim()}>
                    {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isAnnouncement ? (
                        <Megaphone className="h-4 w-4" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </form>
        </div>
    );
}
