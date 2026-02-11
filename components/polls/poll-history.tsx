"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { BarChart3, Clock, History, AlertTriangle, Users } from "lucide-react";
import { PollCard } from "./poll-card";
import { useState } from "react";

interface PollHistoryProps {
    channelId: Id<"channels">;
}

export function PollHistory({ channelId }: PollHistoryProps) {
    const { sessionId } = useAuth();
    const currentUser = useQuery(api.users.getCurrentUser, {
        sessionId: sessionId ?? undefined,
    });

    const pollHistory = useQuery(api.polls.getPollHistory, { channelId });
    const [expandedPollId, setExpandedPollId] = useState<string | null>(null);

    if (!pollHistory || pollHistory.length === 0) return null;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <History className="h-4 w-4" />
                    Poll History ({pollHistory.length})
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" />
                        Poll History
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                    {pollHistory.map((poll: any) => {
                        const isExpanded = expandedPollId === poll._id;
                        const isNoParticipation = poll.status === "no_participation" ||
                            (poll.status === "active" && poll.endsAt && poll.endsAt <= Date.now() && poll.totalVotes === 0);

                        return (
                            <div key={poll._id} className="rounded-lg border bg-card overflow-hidden">
                                <button
                                    type="button"
                                    className="w-full text-left p-3 hover:bg-muted/30 transition-colors"
                                    onClick={() => setExpandedPollId(isExpanded ? null : poll._id)}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {poll.question}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-muted-foreground">
                                                    by {poll.creator?.name || poll.creator?.username || "Admin"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground">•</span>
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(poll.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {isNoParticipation ? (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 flex items-center gap-0.5">
                                                    <AlertTriangle className="h-3 w-3" /> No Participation
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground flex items-center gap-0.5">
                                                    <Users className="h-3 w-3" /> {poll.totalVotes} votes
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="border-t p-3">
                                        <PollCard pollId={poll._id} />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
