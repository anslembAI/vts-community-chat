"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CreateMoneyRequestModal } from "@/components/money/create-money-request-modal";
import { CreatePollModal } from "@/components/polls/create-poll-modal";

interface MessageInputProps {
    channelId: Id<"channels">;
}

export function MessageInput({ channelId }: MessageInputProps) {
    const [content, setContent] = useState("");
    const sendMessage = useMutation(api.messages.sendMessage);
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const { sessionId } = useAuth();

    // Fetch channel details to check type
    const channel = useQuery(api.channels.getChannel, { channelId });

    // Determine if this is a money_request channel
    const isMoneyChannel = channel?.type === "money_request";

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
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
            await sendMessage({ channelId, content, sessionId });
            setContent("");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to send message. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex items-center gap-2 p-4 border-t bg-background">
            {isMoneyChannel && (
                <CreateMoneyRequestModal channelId={channelId} />
            )}

            {/* Poll button — renders only for admins (component handles visibility) */}
            <CreatePollModal channelId={channelId} />

            <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                <Input
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1"
                    disabled={isSending}
                    autoFocus
                />
                <Button type="submit" size="icon" disabled={isSending || !content.trim()}>
                    {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </form>
        </div>
    );
}
