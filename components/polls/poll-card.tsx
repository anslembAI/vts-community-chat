"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import {
    BarChart3,
    Check,
    Clock,
    Lock,
    ShieldCheck,
    Trash2,
    Users,
    XCircle,
    Eye,
    EyeOff,
} from "lucide-react";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PollCardProps {
    pollId: Id<"polls">;
}

export function PollCard({ pollId }: PollCardProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();

    const pollData = useQuery(api.polls.getPollWithResults, {
        pollId,
        sessionId: sessionId ?? undefined,
    });

    const currentUser = useQuery(api.users.getCurrentUser, {
        sessionId: sessionId ?? undefined,
    });

    const voteOnPoll = useMutation(api.polls.voteOnPoll);
    const removeVote = useMutation(api.polls.removeVote);
    const closePoll = useMutation(api.polls.closePoll);
    const deletePoll = useMutation(api.polls.deletePoll);

    const [votingIndex, setVotingIndex] = useState<number | null>(null);
    const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
    const [showVoters, setShowVoters] = useState<number | null>(null);

    if (!pollData) {
        return (
            <div className="w-full max-w-md rounded-xl border bg-card p-4 animate-pulse">
                <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                <div className="space-y-2">
                    <div className="h-10 bg-muted rounded" />
                    <div className="h-10 bg-muted rounded" />
                </div>
            </div>
        );
    }

    const isClosed = pollData.effectiveStatus === "closed";
    const isAdmin = currentUser?.isAdmin;
    const hasVoted = pollData.currentUserVote !== null;
    const userVotedIndexes = pollData.currentUserVote ?? [];

    const handleVote = async (optionIndex: number) => {
        if (!sessionId || isClosed) return;

        setVotingIndex(optionIndex);
        try {
            if (pollData.allowMultiple) {
                // For multiple choice, toggle
                const newIndexes = userVotedIndexes.includes(optionIndex)
                    ? userVotedIndexes.filter((i) => i !== optionIndex)
                    : [...userVotedIndexes, optionIndex];

                if (newIndexes.length === 0) {
                    // Remove vote entirely
                    await removeVote({ sessionId, pollId });
                } else {
                    await voteOnPoll({
                        sessionId,
                        pollId,
                        optionIndexes: newIndexes,
                    });
                }
            } else {
                // Single choice
                if (userVotedIndexes.includes(optionIndex) && pollData.allowChangeVote) {
                    // Clicking same option removes vote
                    await removeVote({ sessionId, pollId });
                } else {
                    await voteOnPoll({
                        sessionId,
                        pollId,
                        optionIndexes: [optionIndex],
                    });
                }
            }
        } catch (error: any) {
            const raw = error?.data?.message || error?.message || "";
            const msg = raw.split("\n")[0].replace(/^Uncaught Error:\s*/i, "").trim();
            toast({ variant: "destructive", description: msg || "Failed to vote." });
        } finally {
            setVotingIndex(null);
        }
    };

    const handleClose = async () => {
        if (!sessionId) return;
        try {
            await closePoll({ sessionId, pollId });
            toast({ description: "Poll closed." });
        } catch (error: any) {
            const raw = error?.data?.message || error?.message || "";
            const msg = raw.split("\n")[0].replace(/^Uncaught Error:\s*/i, "").trim();
            toast({ variant: "destructive", description: msg || "Failed to close poll." });
        }
    };

    const handleDelete = async () => {
        if (!sessionId) return;
        try {
            await deletePoll({ sessionId, pollId });
            toast({ description: "Poll deleted." });
        } catch (error: any) {
            const raw = error?.data?.message || error?.message || "";
            const msg = raw.split("\n")[0].replace(/^Uncaught Error:\s*/i, "").trim();
            toast({ variant: "destructive", description: msg || "Failed to delete poll." });
        }
    };

    const getPercentage = (count: number) => {
        if (pollData.totalVotes === 0) return 0;
        return Math.round((count / pollData.totalVotes) * 100);
    };

    const getTimeRemaining = () => {
        if (!pollData.endsAt) return null;
        const diff = pollData.endsAt - Date.now();
        if (diff <= 0) return "Ended";
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        if (hours >= 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h left`;
        }
        if (hours > 0) return `${hours}h ${minutes}m left`;
        return `${minutes}m left`;
    };

    const winningIndex = pollData.optionCounts.indexOf(Math.max(...pollData.optionCounts));

    return (
        <div className="w-full max-w-md rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <BarChart3 className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight truncate">
                                {pollData.question}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                by {pollData.creator?.name || pollData.creator?.username || "Admin"}
                            </p>
                        </div>
                    </div>
                    <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider shrink-0 ${isClosed
                                ? "bg-zinc-500/10 text-zinc-500 border border-zinc-300/20"
                                : "bg-green-500/10 text-green-600 border border-green-200/40"
                            }`}
                    >
                        {isClosed ? "Closed" : "Active"}
                    </span>
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {pollData.allowMultiple && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> Multi-choice
                        </span>
                    )}
                    {pollData.anonymous && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 flex items-center gap-0.5">
                            <EyeOff className="h-3 w-3" /> Anonymous
                        </span>
                    )}
                    {!pollData.allowChangeVote && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 flex items-center gap-0.5">
                            <Lock className="h-3 w-3" /> Final vote
                        </span>
                    )}
                    {getTimeRemaining() && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> {getTimeRemaining()}
                        </span>
                    )}
                </div>
            </div>

            {/* Options */}
            <div className="px-4 py-2 space-y-1.5">
                {pollData.options.map((option, idx) => {
                    const count = pollData.optionCounts[idx] || 0;
                    const pct = getPercentage(count);
                    const isSelected = userVotedIndexes.includes(idx);
                    const isWinning = isClosed && idx === winningIndex && pollData.totalVotes > 0;
                    const voters = pollData.votersByOption?.[idx];

                    return (
                        <div key={idx}>
                            <button
                                type="button"
                                onClick={() => handleVote(idx)}
                                disabled={isClosed || votingIndex !== null || (!pollData.allowChangeVote && hasVoted && !isSelected)}
                                className={`relative w-full text-left rounded-lg overflow-hidden transition-all duration-200 border ${isSelected
                                        ? "border-primary/40 bg-primary/5"
                                        : "border-border/50 bg-muted/20 hover:bg-muted/40"
                                    } ${isClosed ? "cursor-default" : "cursor-pointer active:scale-[0.99]"} ${isWinning ? "ring-2 ring-primary/30" : ""
                                    }`}
                            >
                                {/* Vote bar background */}
                                <div
                                    className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-lg ${isSelected
                                            ? "bg-primary/15"
                                            : isWinning
                                                ? "bg-primary/10"
                                                : "bg-muted/30"
                                        }`}
                                    style={{ width: `${pct}%` }}
                                />

                                {/* Content */}
                                <div className="relative flex items-center justify-between px-3 py-2.5 z-10">
                                    <div className="flex items-center gap-2 min-w-0">
                                        {isSelected && (
                                            <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                                                <Check className="h-3 w-3 text-primary-foreground" />
                                            </div>
                                        )}
                                        <span className={`text-sm truncate ${isSelected ? "font-medium" : ""}`}>
                                            {option}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {count}
                                        </span>
                                        <span className={`text-xs font-semibold tabular-nums w-9 text-right ${isSelected ? "text-primary" : "text-muted-foreground"
                                            }`}>
                                            {pct}%
                                        </span>
                                    </div>
                                </div>
                            </button>

                            {/* Voters tooltip (non-anonymous) */}
                            {!pollData.anonymous && voters && voters.length > 0 && (
                                <div className="px-3 pb-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowVoters(showVoters === idx ? null : idx)}
                                        className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                                    >
                                        <Users className="h-3 w-3" />
                                        {voters.length} voter{voters.length !== 1 ? "s" : ""}
                                    </button>
                                    {showVoters === idx && (
                                        <div className="text-[10px] text-muted-foreground pl-3.5 py-0.5">
                                            {voters.map((v, i) => (
                                                <span key={i}>
                                                    {v.name || v.username}{i < voters.length - 1 ? ", " : ""}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t bg-muted/10 flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{pollData.totalVotes} vote{pollData.totalVotes !== 1 ? "s" : ""}</span>
                    {hasVoted && (
                        <span className="text-primary font-medium ml-1 flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> You voted
                        </span>
                    )}
                </div>

                {/* Admin controls */}
                {isAdmin && (
                    <div className="flex items-center gap-1">
                        {!isClosed && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-orange-500">
                                        <XCircle className="h-3.5 w-3.5" />
                                        Close
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Close Poll?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently close the poll. No more votes will be accepted. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleClose}>Close Poll</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Poll?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the poll and all votes. A &quot;Poll removed by admin&quot; placeholder will remain in chat.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                        Delete
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}
            </div>
        </div>
    );
}
