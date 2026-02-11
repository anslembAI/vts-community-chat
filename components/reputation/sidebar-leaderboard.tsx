"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ReputationScore, BadgeList } from "./reputation-badge";
import { Crown, Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

const RANK_ICONS = [
    <Trophy key="1" className="h-3.5 w-3.5 text-amber-500 fill-amber-500/30" />,
    <Medal key="2" className="h-3.5 w-3.5 text-slate-400 fill-slate-400/30" />,
    <Award key="3" className="h-3.5 w-3.5 text-amber-700 fill-amber-700/20" />,
];

export function SidebarLeaderboard() {
    const leaderboard = useQuery(api.reputation.getLeaderboard, { limit: 8 });

    return (
        <div className="flex flex-col gap-1 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    Leaderboard
                </h2>
            </div>

            {leaderboard === undefined ? (
                <div className="space-y-2 px-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                            <Skeleton className="h-6 w-6 rounded-full" />
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-4 w-8 rounded-full ml-auto" />
                        </div>
                    ))}
                </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                    No activity yet
                </p>
            ) : (
                <div className="space-y-0.5">
                    {leaderboard.map((user: any, index: number) => {
                        const rank = index + 1;
                        const isTop3 = index < 3;

                        return (
                            <div
                                key={user._id}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
                                    isTop3
                                        ? "bg-amber-500/5 hover:bg-amber-500/10"
                                        : "hover:bg-accent"
                                )}
                            >
                                {/* Rank */}
                                <div className="w-5 flex justify-center shrink-0">
                                    {isTop3 ? (
                                        RANK_ICONS[index]
                                    ) : (
                                        <span className="text-[10px] font-bold text-muted-foreground">
                                            {rank}
                                        </span>
                                    )}
                                </div>

                                {/* Avatar */}
                                <div className="relative shrink-0">
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={user.imageUrl} />
                                        <AvatarFallback className="text-[10px] font-bold">
                                            {user.name?.charAt(0) || user.username?.charAt(0) || "?"}
                                        </AvatarFallback>
                                    </Avatar>
                                    {user.isAdmin && (
                                        <Crown className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 text-yellow-500 fill-current" />
                                    )}
                                </div>

                                {/* Name */}
                                <span className={cn(
                                    "text-xs font-medium truncate flex-1",
                                    isTop3 ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {user.name || user.username}
                                </span>

                                {/* Score */}
                                <ReputationScore
                                    score={user.reputation}
                                    size="sm"
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
