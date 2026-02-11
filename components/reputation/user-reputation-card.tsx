"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ReputationScore, BadgeList } from "./reputation-badge";
import {
    MessageSquare,
    BarChart3,
    DollarSign,
    Heart,
    Crown,
    Calendar,
} from "lucide-react";

interface UserReputationCardProps {
    userId: Id<"users">;
    sessionId?: string | null;
    compact?: boolean;
}

export function UserReputationCard({ userId, sessionId, compact = false }: UserReputationCardProps) {
    const repData = useQuery(api.reputation.getUserReputation, {
        userId,
        sessionId: sessionId as Id<"sessions"> | undefined,
    });

    if (repData === undefined) {
        return (
            <div className="space-y-3 p-4">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-14 rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    if (!repData) return null;

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <ReputationScore score={repData.reputation} size="sm" />
                <BadgeList badges={repData.badges} size="sm" maxShow={2} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* User Header */}
            <div className="flex items-center gap-3">
                <div className="relative">
                    <Avatar className="h-14 w-14 border-2 border-border shadow-md">
                        <AvatarImage src={repData.imageUrl} />
                        <AvatarFallback className="text-lg font-bold">
                            {repData.name?.charAt(0) || repData.username?.charAt(0) || "?"}
                        </AvatarFallback>
                    </Avatar>
                    {repData.isAdmin && (
                        <div className="absolute -top-1 -right-1 bg-yellow-400 text-yellow-900 rounded-full p-0.5 shadow-sm border border-background">
                            <Crown className="w-3 h-3 fill-current" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">
                            {repData.name || repData.username}
                        </h3>
                        <ReputationScore score={repData.reputation} size="md" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        @{repData.username}
                    </p>
                    <BadgeList badges={repData.badges} size="md" className="mt-1" />
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2">
                <StatCard
                    icon={<MessageSquare className="h-3.5 w-3.5" />}
                    label="Messages"
                    value={repData.stats.messageCount}
                    color="text-blue-500"
                    bgColor="bg-blue-500/10"
                />
                <StatCard
                    icon={<BarChart3 className="h-3.5 w-3.5" />}
                    label="Poll Votes"
                    value={repData.stats.pollParticipationCount}
                    color="text-purple-500"
                    bgColor="bg-purple-500/10"
                />
                <StatCard
                    icon={<DollarSign className="h-3.5 w-3.5" />}
                    label="Fulfilled"
                    value={repData.stats.moneyRequestsFulfilled}
                    color="text-green-500"
                    bgColor="bg-green-500/10"
                />
                <StatCard
                    icon={<Heart className="h-3.5 w-3.5" />}
                    label="Reactions"
                    value={repData.stats.reactionsReceived}
                    color="text-rose-500"
                    bgColor="bg-rose-500/10"
                />
            </div>

            {/* Member Since */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t">
                <Calendar className="h-3 w-3" />
                <span>
                    Member since{" "}
                    {new Date(repData.memberSince).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                    })}
                </span>
            </div>
        </div>
    );
}

// ─── Stat Card ──────────────────────────────────────────────────────

function StatCard({
    icon,
    label,
    value,
    color,
    bgColor,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    color: string;
    bgColor: string;
}) {
    return (
        <div className={`flex items-center gap-2.5 p-2.5 rounded-lg ${bgColor} border border-transparent hover:border-border transition-colors`}>
            <div className={`${color} shrink-0`}>{icon}</div>
            <div className="min-w-0">
                <p className="text-sm font-bold leading-none">{value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
            </div>
        </div>
    );
}
