
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";

interface MessageListProps {
    channelId: Id<"channels">;
}

export function MessageList({ channelId }: MessageListProps) {
    const messages = useQuery(api.messages.getMessages, { channelId });
    const { sessionId } = useAuth();
    const currentUser = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (messages) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

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

                return (
                    <div
                        key={msg._id}
                        className={`flex items-start gap-3 ${isCurrentUser ? "flex-row-reverse" : "flex-row"
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
                            </div>

                            <div
                                className={`px-3 py-2 rounded-lg text-sm ${isCurrentUser
                                    ? "bg-primary text-primary-foreground rounded-tr-none"
                                    : "bg-secondary text-secondary-foreground rounded-tl-none"
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    </div>
                );
            })}
            <div ref={bottomRef} />
        </div>
    );
}
