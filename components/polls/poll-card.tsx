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
    Trash2,
    Users,
    XCircle,
    EyeOff,
    Eye,
    Copy,
    Download,
    Megaphone,
    ChevronDown,
    AlertTriangle,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PollCardProps {
    pollId: Id<"polls">;
    pinned?: boolean;
}

// ─── Live Countdown Timer Component ─────────────────────────────────

function CountdownTimer({ endsAt }: { endsAt: number }) {
    const [timeStr, setTimeStr] = useState("");

    useEffect(() => {
        const update = () => {
            const diff = endsAt - Date.now();
            if (diff <= 0) {
                setTimeStr("Ended");
                return;
            }
            const d = Math.floor(diff / (1000 * 60 * 60 * 24));
            const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            if (d > 0) setTimeStr(`${d}d ${h}h ${m}m`);
            else if (h > 0) setTimeStr(`${h}h ${m}m ${s}s`);
            else setTimeStr(`${m}m ${s}s`);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [endsAt]);

    const diff = endsAt - Date.now();
    const isUrgent = diff > 0 && diff < 5 * 60 * 1000; // < 5 min

    return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 tabular-nums ${isUrgent
            ? "bg-red-500/10 text-red-500 animate-pulse"
            : "bg-muted text-muted-foreground"
            }`}>
            <Clock className="h-3 w-3" />
            {timeStr}
        </span>
    );
}

// ─── Main PollCard ──────────────────────────────────────────────────

export function PollCard({ pollId, pinned }: PollCardProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();

    const pollData = useQuery(api.polls.getPollWithResults, {
        pollId,
        sessionId: sessionId ?? undefined,
    });

    const currentUser = useQuery(api.users.getCurrentUser, {
        sessionId: sessionId ?? undefined,
    });

    // Get channels for duplicate feature
    const channels = useQuery(api.channels.getChannels);

    const voteOnPoll = useMutation(api.polls.voteOnPoll);
    const removeVote = useMutation(api.polls.removeVote);
    const closePoll = useMutation(api.polls.closePoll);
    const deletePoll = useMutation(api.polls.deletePoll);
    const duplicatePoll = useMutation(api.polls.duplicatePoll);

    const [votingIndex, setVotingIndex] = useState<number | null>(null);
    const [showVoters, setShowVoters] = useState<number | null>(null);
    const [duplicateChannelId, setDuplicateChannelId] = useState<string>("");
    const [showDetailedResults, setShowDetailedResults] = useState(false);

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

    const isClosed = pollData.effectiveStatus === "closed" || pollData.effectiveStatus === "no_participation";
    const isNoParticipation = pollData.effectiveStatus === "no_participation";
    const isAdmin = currentUser?.isAdmin;
    const hasVoted = pollData.currentUserVote !== null;
    const userVotedIndexes = pollData.currentUserVote ?? [];
    const isAnnouncement = pollData.isAnnouncement;
    const resultsHidden = pollData.hideResults;

    // Fetch channel to check for lock status
    const channel = useQuery(api.channels.getChannel, { channelId: pollData.channelId });
    const isChannelLocked = (channel?.locked ?? false) && !isAdmin;

    const handleVote = async (optionIndex: number) => {
        if (!sessionId || isClosed || isChannelLocked) return;

        setVotingIndex(optionIndex);
        try {
            if (pollData.allowMultiple) {
                const newIndexes = userVotedIndexes.includes(optionIndex)
                    ? userVotedIndexes.filter((i) => i !== optionIndex)
                    : [...userVotedIndexes, optionIndex];

                if (newIndexes.length === 0) {
                    await removeVote({ sessionId, pollId });
                } else {
                    await voteOnPoll({ sessionId, pollId, optionIndexes: newIndexes });
                }
            } else {
                if (userVotedIndexes.includes(optionIndex) && pollData.allowChangeVote) {
                    await removeVote({ sessionId, pollId });
                } else {
                    await voteOnPoll({ sessionId, pollId, optionIndexes: [optionIndex] });
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

    const handleDuplicate = async () => {
        if (!sessionId || !duplicateChannelId) return;
        try {
            await duplicatePoll({
                sessionId,
                sourcePollId: pollId,
                targetChannelId: duplicateChannelId as Id<"channels">,
            });
            toast({ description: "Poll duplicated!" });
            setDuplicateChannelId("");
        } catch (error: any) {
            const raw = error?.data?.message || error?.message || "";
            const msg = raw.split("\n")[0].replace(/^Uncaught Error:\s*/i, "").trim();
            toast({ variant: "destructive", description: msg || "Failed to duplicate poll." });
        }
    };

    const handleExportCSV = () => {
        if (!pollData) return;
        const rows = [["Option", "Votes", "Percentage"]];
        pollData.options.forEach((opt, idx) => {
            const count = pollData.optionCounts[idx] || 0;
            const pct = pollData.totalVotes > 0 ? Math.round((count / pollData.totalVotes) * 100) : 0;
            rows.push([opt, String(count), `${pct}%`]);
        });
        rows.push([]);
        rows.push(["Total Votes", String(pollData.totalVotes), ""]);
        rows.push(["Status", pollData.effectiveStatus, ""]);

        // Add voter details if non-anonymous
        if (!pollData.anonymous && pollData.votersByOption) {
            rows.push([]);
            rows.push(["--- Voters by Option ---", "", ""]);
            pollData.options.forEach((opt, idx) => {
                const voters = pollData.votersByOption?.[idx] ?? [];
                rows.push([opt, voters.map(v => v.name || v.username || "Unknown").join(", "), ""]);
            });
        }

        const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `poll-${pollData.question.substring(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ description: "CSV exported." });
    };

    const getPercentage = (count: number) => {
        if (pollData.totalVotes === 0) return 0;
        return Math.round((count / pollData.totalVotes) * 100);
    };

    const winningIndex = pollData.optionCounts.indexOf(Math.max(...pollData.optionCounts));

    // Status badge
    const getStatusBadge = () => {
        if (isNoParticipation) return { label: "No Participation", cls: "bg-amber-500/10 text-amber-600 border border-amber-300/20" };
        if (isClosed) return { label: "Closed", cls: "bg-zinc-500/10 text-zinc-500 border border-zinc-300/20" };
        return { label: "Active", cls: "bg-green-500/10 text-green-600 border border-green-200/40" };
    };

    const statusBadge = getStatusBadge();

    return (
        <div className={`w-full max-w-md rounded-xl border bg-card shadow-sm overflow-hidden transition-all ${isAnnouncement && !isClosed
            ? "ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
            : ""
            } ${pinned ? "border-primary/30" : ""}`}>

            {/* Announcement banner */}
            {isAnnouncement && (
                <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent px-4 py-1 flex items-center gap-1.5">
                    <Megaphone className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Announcement Poll</span>
                </div>
            )}

            {/* Pinned indicator */}
            {pinned && (
                <div className="bg-primary/5 px-4 py-1 flex items-center gap-1.5 border-b border-primary/10">
                    <BarChart3 className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-medium text-primary">Pinned • Active Poll</span>
                </div>
            )}

            {/* Header */}
            <div className="px-4 pt-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isAnnouncement ? "bg-amber-500/10" : "bg-primary/10"
                            }`}>
                            {isAnnouncement
                                ? <Megaphone className="h-4 w-4 text-amber-500" />
                                : <BarChart3 className="h-4 w-4 text-primary" />
                            }
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
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider shrink-0 ${statusBadge.cls}`}>
                        {statusBadge.label}
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
                    {pollData.hideResultsBeforeClose && !isClosed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-500 flex items-center gap-0.5">
                            <EyeOff className="h-3 w-3" /> Results hidden
                        </span>
                    )}
                    {/* Live countdown */}
                    {pollData.endsAt && !isClosed && (
                        <CountdownTimer endsAt={pollData.endsAt} />
                    )}
                    {pollData.endsAt && isClosed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" /> Ended
                        </span>
                    )}
                </div>
            </div>

            {/* No Participation notice */}
            {isNoParticipation && (
                <div className="px-4 py-3 flex items-center gap-2 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20 border-y border-amber-200/30">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p className="text-xs">This poll received zero votes before ending.</p>
                </div>
            )}

            {/* Channel Locked notice */}
            {isChannelLocked && (
                <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground bg-muted/20 border-y">
                    <Lock className="h-4 w-4 shrink-0" />
                    <p className="text-xs">Voting is disabled because the channel is locked.</p>
                </div>
            )}

            {/* Results hidden notice */}
            {resultsHidden && !isAdmin && (
                <div className="px-4 py-3 flex items-center gap-2 text-muted-foreground bg-muted/20 border-y">
                    <EyeOff className="h-4 w-4 shrink-0" />
                    <p className="text-xs">Results will be visible when the poll closes.</p>
                </div>
            )}

            {/* Options */}
            <div className="px-4 py-2 space-y-1.5">
                {pollData.options.map((option, idx) => {
                    const count = pollData.optionCounts[idx] || 0;
                    const pct = getPercentage(count);
                    const isSelected = userVotedIndexes.includes(idx);
                    const isWinning = isClosed && idx === winningIndex && pollData.totalVotes > 0;
                    const voters = pollData.votersByOption?.[idx];
                    const showBars = !resultsHidden || isAdmin;

                    return (
                        <div key={idx}>
                            <button
                                type="button"
                                onClick={() => handleVote(idx)}
                                disabled={isClosed || isChannelLocked || votingIndex !== null || (!pollData.allowChangeVote && hasVoted && !isSelected)}
                                className={`relative w-full text-left rounded-lg overflow-hidden transition-all duration-200 border ${isSelected
                                    ? "border-primary/40 bg-primary/5"
                                    : "border-border/50 bg-muted/20 hover:bg-muted/40"
                                    } ${isClosed || isChannelLocked ? "cursor-default" : "cursor-pointer active:scale-[0.99]"} ${isWinning ? "ring-2 ring-primary/30" : ""
                                    }`}
                            >
                                {/* Vote bar background */}
                                {showBars && (
                                    <div
                                        className={`absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-lg ${isSelected
                                            ? "bg-primary/15"
                                            : isWinning
                                                ? "bg-primary/10"
                                                : "bg-muted/30"
                                            }`}
                                        style={{ width: `${pct}%` }}
                                    />
                                )}

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
                                    {showBars && (
                                        <div className="flex items-center gap-2 shrink-0 ml-2">
                                            <span className="text-xs text-muted-foreground tabular-nums">
                                                {count}
                                            </span>
                                            <span className={`text-xs font-semibold tabular-nums w-9 text-right ${isSelected ? "text-primary" : "text-muted-foreground"
                                                }`}>
                                                {pct}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* Voters tooltip (non-anonymous) */}
                            {!pollData.anonymous && !resultsHidden && voters && voters.length > 0 && (
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
            <div className="px-4 py-3 border-t bg-muted/10 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {!resultsHidden ? (
                        <span>{pollData.totalVotes} vote{pollData.totalVotes !== 1 ? "s" : ""}</span>
                    ) : (
                        <span>Votes hidden</span>
                    )}
                    {hasVoted && (
                        <span className="text-primary font-medium ml-1 flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> You voted
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* View Detailed Results */}
                    {(isClosed || (isAdmin && !resultsHidden)) && pollData.totalVotes > 0 && (
                        <Dialog open={showDetailedResults} onOpenChange={setShowDetailedResults}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground">
                                    <Eye className="h-3.5 w-3.5" />
                                    Details
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-primary" />
                                        Detailed Results
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="p-3 rounded-lg bg-muted/30 border">
                                        <p className="text-sm font-semibold">{pollData.question}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Total votes: <strong>{pollData.totalVotes}</strong> • Status: <strong className="capitalize">{pollData.effectiveStatus.replace("_", " ")}</strong>
                                        </p>
                                    </div>

                                    {/* Detailed breakdown */}
                                    <div className="space-y-3">
                                        {pollData.options.map((option, idx) => {
                                            const count = pollData.optionCounts[idx] || 0;
                                            const pct = getPercentage(count);
                                            const voters = pollData.votersByOption?.[idx];
                                            const isWinner = idx === winningIndex && pollData.totalVotes > 0;

                                            return (
                                                <div key={idx} className={`p-3 rounded-lg border ${isWinner ? "border-primary/40 bg-primary/5" : "bg-muted/10"}`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={`text-sm ${isWinner ? "font-semibold text-primary" : "font-medium"}`}>
                                                            {isWinner && "🏆 "}{option}
                                                        </span>
                                                        <span className="text-sm font-bold tabular-nums">
                                                            {count} ({pct}%)
                                                        </span>
                                                    </div>
                                                    {/* Percentage bar */}
                                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ${isWinner ? "bg-primary" : "bg-primary/50"}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                    {/* Voter list */}
                                                    {!pollData.anonymous && voters && voters.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {voters.map((v, i) => (
                                                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                                    {v.name || v.username}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Admin controls */}
                    {isAdmin && (
                        <>
                            {/* Export CSV */}
                            {pollData.totalVotes > 0 && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={handleExportCSV}>
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                            )}

                            {/* Duplicate Poll */}
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-blue-500">
                                        <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[380px]">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-base">
                                            <Copy className="h-4 w-4 text-primary" />
                                            Duplicate Poll
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground">
                                            Duplicate &quot;{pollData.question}&quot; to another channel:
                                        </p>
                                        <Select value={duplicateChannelId} onValueChange={setDuplicateChannelId}>
                                            <SelectTrigger className="h-9 text-sm">
                                                <SelectValue placeholder="Select channel..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(channels ?? []).map((ch: any) => (
                                                    <SelectItem key={ch._id} value={ch._id}>
                                                        # {ch.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            className="w-full"
                                            disabled={!duplicateChannelId}
                                            onClick={handleDuplicate}
                                        >
                                            Duplicate
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            {/* Close Poll */}
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
                                                This will permanently close the poll. No more votes will be accepted. If zero votes were cast, it will be marked as &quot;No Participation.&quot;
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleClose}>Close Poll</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            )}

                            {/* Delete Poll */}
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
