"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface MessageInputProps {
    channelId: Id<"channels">;
}

export function MessageInput({ channelId }: MessageInputProps) {
    const [content, setContent] = useState("");
    const sendMessage = useMutation(api.messages.sendMessage);
    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setIsSending(true);
        try {
            await sendMessage({ channelId, content });
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
        <form onSubmit={handleSend} className="flex items-center gap-2 p-4 border-t bg-background">
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
    );
}
