"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ReputationScore, BadgeList } from "./reputation-badge";
import { Crown, Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardProps {
    limit?: number;
    className?: string;
}

const RANK_STYLES = [
    {
        icon: <Trophy className="h-4 w-4 text-amber-500 fill-amber-500/30" />,
        bg: "bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border-amber-500/20",
        text: "text-amber-600 dark:text-amber-400",
        ring: "ring-2 ring-amber-500/30",
    },
    {
        icon: <Medal className="h-4 w-4 text-slate-400 fill-slate-400/30" />,
        bg: "bg-gradient-to-r from-slate-400/10 to-slate-300/5 border-slate-400/20",
        text: "text-slate-500 dark:text-slate-400",
        ring: "ring-2 ring-slate-400/20",
    },
    {
        icon: <Award className="h-4 w-4 text-amber-700 fill-amber-700/20" />,
        bg: "bg-gradient-to-r from-amber-700/10 to-orange-600/5 border-amber-700/15",
        text: "text-amber-700 dark:text-amber-500",
        ring: "ring-2 ring-amber-700/20",
    },
];

export function Leaderboard({ limit = 10, className }: LeaderboardProps) {
    const leaderboard = useQuery(api.reputation.getLeaderboard, { limit });

    if (leaderboard === undefined) {
        return (
            <div className={cn("space-y-2", className)}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-3.5 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                        <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    if (!leaderboard || leaderboard.length === 0) {
        return (
            <div className={cn("text-center text-sm text-muted-foreground py-8", className)}>
                No reputation data yet.
            </div>
        );
    }

    return (
        <div className={cn("space-y-1.5", className)}>
            {leaderboard.map((user: any, index: number) => {
                const rankStyle = index < 3 ? RANK_STYLES[index] : null;
                const rank = index + 1;

                return (
                    <div
                        key={user._id}
                        className={cn(
                            "flex items-center gap-3 p-2.5 rounded-lg border transition-all duration-200 hover:shadow-sm",
                            rankStyle ? rankStyle.bg : "bg-background border-border/50 hover:border-border"
                        )}
                    >
                        {/* Rank Number / Icon */}
                        <div className="w-7 flex items-center justify-center shrink-0">
                            {rankStyle ? (
                                rankStyle.icon
                            ) : (
                                <span className="text-xs font-bold text-muted-foreground">
                                    {rank}
                                </span>
                            )}
                        </div>

                        {/* Avatar */}
                        <div className="relative shrink-0">
                            <Avatar className={cn("h-8 w-8", rankStyle?.ring)}>
                                <AvatarImage src={user.imageUrl} />
                                <AvatarFallback className="text-xs font-bold">
                                    {user.name?.charAt(0) || user.username?.charAt(0) || "?"}
                                </AvatarFallback>
                            </Avatar>
                            {user.isAdmin && (
                                <Crown className="absolute -top-1 -right-1 h-3 w-3 text-yellow-500 fill-current" />
                            )}
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className={cn(
                                    "text-sm font-semibold truncate",
                                    rankStyle?.text
                                )}>
                                    {user.name || user.username}
                                </span>
                                <BadgeList badges={user.badges} size="sm" maxShow={2} />
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                                <span>💬 {user.stats.messageCount}</span>
                                <span>📊 {user.stats.pollParticipationCount}</span>
                                <span>💰 {user.stats.moneyRequestsFulfilled}</span>
                            </div>
                        </div>

                        {/* Score */}
                        <ReputationScore
                            score={user.reputation}
                            size="md"
                        />
                    </div>
                );
            })}
        </div>
    );
}
