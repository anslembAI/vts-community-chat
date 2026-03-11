"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Lock, Megaphone, ShieldAlert } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CreateMoneyRequestModal } from "@/components/money/create-money-request-modal";
import { CreatePollModal } from "@/components/polls/create-poll-modal";
import { PollHistory } from "@/components/polls/poll-history";
import { useTypingIndicator } from "@/hooks/use-typing";
import { getOrCreateSessionId } from "@/lib/session-utils";

interface MessageInputProps {
    channelId: Id<"channels">;
    parentMessageId?: Id<"messages">;
    isLocked?: boolean;
    isAdmin?: boolean;
    isAnnouncement?: boolean;
    placeholder?: string;
    onTypingUsersChange?: (users: { userId: string; username: string }[]) => void;
}

export function MessageInput({
    channelId,
    parentMessageId,
    isLocked = false,
    isAdmin = false,
    isAnnouncement = false,
    placeholder = "Type a message...",
    onTypingUsersChange,
}: MessageInputProps) {
    const [content, setContent] = useState("");
    const [isSending, setIsSending] = useState(false);

    const sendMessage = useMutation(api.messages.sendMessage);
    const { toast } = useToast();
    const { sessionId } = useAuth();
    const { typingUsers, sendStartTyping, sendStopTyping } = useTypingIndicator(channelId);

    React.useEffect(() => {
        onTypingUsersChange?.(typingUsers);
    }, [typingUsers, onTypingUsersChange]);

    const channel = useQuery(api.channels.getChannel, channelId ? { channelId } : "skip");
    const isMoneyChannel = channel?.type === "money_request";

    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
    const isSuspended = currentUser?.suspended === true;

    const isDisabledByAnnouncement = isAnnouncement && !isAdmin;

    const hasOverride = useQuery(
        api.channels.hasLockOverride,
        (sessionId && channelId) ? { channelId, sessionId } : "skip"
    );

    const isDisabledByLock = isLocked && !isAdmin && !hasOverride;

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        if (isDisabledByLock || isDisabledByAnnouncement || isSuspended) return;
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
                clientSessionId: getOrCreateSessionId(),
                parentMessageId,
            });

            setContent("");
            sendStopTyping();
        } catch (error: unknown) {
            console.error(error);
            const msg = error instanceof Error ? error.message : "Failed to send message.";
            toast({
                title: "Error",
                description: msg,
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    if (isDisabledByLock) {
        return (
            <div className="flex items-center gap-3 border-t border-white/30 bg-white/16 p-4 backdrop-blur-sm">
                <Lock className="h-4 w-4 shrink-0 text-black/35" />
                <p className="flex-1 text-sm text-black/45">
                    This channel is locked by an admin.
                </p>
            </div>
        );
    }

    if (isSuspended) {
        return (
            <div className="flex items-center gap-3 border-t border-white/30 bg-destructive/5 p-4 backdrop-blur-sm">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1">
                    Your account has been suspended. You cannot send messages.
                </p>
            </div>
        );
    }

    if (isDisabledByAnnouncement) {
        return (
            <div className="flex items-center gap-3 border-t border-white/30 bg-amber-500/5 p-4 backdrop-blur-sm">
                <Megaphone className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
                    This is a broadcast channel - only admins can post.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col border-t border-white/30 bg-white/14 backdrop-blur-sm">
            <div className="p-4" data-tour="message-composer">
                <div className="vts-soft-card flex items-center gap-2 rounded-[2rem] border-0 px-3 py-1.5">
                    {!parentMessageId && isMoneyChannel && (
                        <CreateMoneyRequestModal channelId={channelId} />
                    )}

                    {!parentMessageId && !isAnnouncement && (
                        <>
                            <CreatePollModal channelId={channelId} />
                            <PollHistory channelId={channelId} />
                        </>
                    )}

                    <form onSubmit={handleSend} className="flex-1 flex items-center gap-2 relative">
                        <Input
                            value={content}
                            onChange={(e) => {
                                setContent(e.target.value);
                                if (e.target.value.trim()) {
                                    sendStartTyping();
                                } else {
                                    sendStopTyping();
                                }
                            }}
                            placeholder={isAnnouncement ? "Post an announcement..." : placeholder}
                            className="flex-1 border-none bg-transparent text-base text-black placeholder:text-black/40 focus-visible:ring-0"
                            disabled={isSending}
                            autoFocus
                        />

                        <Button
                            type="submit"
                            size="icon"
                            disabled={isSending || !content.trim()}
                            className="shrink-0 h-9 w-9 rounded-full bg-[#111827] text-white shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                            title="Send Message"
                        >
                            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
