"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useParams } from "next/navigation";
import { Hash, Loader2 } from "lucide-react";

export default function ChannelPage() {
    const params = useParams();
    const channelId = params.channelId as Id<"channels">;

    // We can't query directly if the ID is invalid format, 
    // but Convex hooks handle undefined args gracefully usually, 
    // however better to check locally if it looks like an ID or just rely on query
    // For simplicity, we just pass it.

    // Fetch channel details
    // We need a helper query to get single channel or just iterate list
    // Let's assume we can get it from the list or add a getChannel query.
    // The user prompt asked for `getChannels`, `getMessages`, `getUsers`.
    // It didn't explicitly ask for `getChannel(id)`. 
    // But we can filter on client side from `getChannels` or add a query.
    // Adding a query is cleaner.

    // For now, let's use getChannels and find
    const channels = useQuery(api.channels.getChannels);
    const channel = channels?.find((c) => c._id === channelId);

    if (channels === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <h2 className="text-2xl font-bold">Channel not found</h2>
                <p className="text-muted-foreground">The channel you are looking for does not exist.</p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-14 items-center gap-2 border-b bg-background px-4">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div>
                    <h2 className="font-semibold">{channel.name}</h2>
                    {channel.description && (
                        <p className="text-xs text-muted-foreground hidden sm:block">
                            {channel.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <MessageList channelId={channelId} />
            </div>

            {/* Input */}
            <MessageInput channelId={channelId} />
        </div>
    );
}
