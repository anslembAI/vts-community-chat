"use client";

import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Badge visual config matching the backend definitions
const BADGE_CONFIG: Record<string, {
    label: string;
    emoji: string;
    description: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    glowClass: string;
}> = {
    contributor: {
        label: "Contributor",
        emoji: "💬",
        description: "Active community participant",
        bgClass: "bg-blue-500/10",
        textClass: "text-blue-600 dark:text-blue-400",
        borderClass: "border-blue-500/20",
        glowClass: "shadow-blue-500/10",
    },
    trusted_member: {
        label: "Trusted Member",
        emoji: "🛡️",
        description: "Recognized for reliability and helpfulness",
        bgClass: "bg-emerald-500/10",
        textClass: "text-emerald-600 dark:text-emerald-400",
        borderClass: "border-emerald-500/20",
        glowClass: "shadow-emerald-500/10",
    },
    verified: {
        label: "Verified",
        emoji: "✅",
        description: "Identity verified by an admin",
        bgClass: "bg-cyan-500/10",
        textClass: "text-cyan-600 dark:text-cyan-400",
        borderClass: "border-cyan-500/20",
        glowClass: "shadow-cyan-500/10",
    },
    top_contributor: {
        label: "Top Contributor",
        emoji: "🏆",
        description: "Highest reputation in the community",
        bgClass: "bg-amber-500/10",
        textClass: "text-amber-600 dark:text-amber-400",
        borderClass: "border-amber-500/20",
        glowClass: "shadow-amber-500/10",
    },
};

interface ReputationBadgeProps {
    badge: string;
    size?: "sm" | "md";
    showLabel?: boolean;
    className?: string;
}

export function ReputationBadge({
    badge,
    size = "sm",
    showLabel = true,
    className,
}: ReputationBadgeProps) {
    const config = BADGE_CONFIG[badge];
    if (!config) return null;

    const pill = (
        <span
            className={cn(
                "inline-flex items-center gap-1 rounded-full border font-medium transition-all duration-200 hover:shadow-md",
                config.bgClass,
                config.textClass,
                config.borderClass,
                config.glowClass,
                size === "sm"
                    ? "px-1.5 py-0.5 text-[10px]"
                    : "px-2.5 py-1 text-xs",
                className
            )}
        >
            <span>{config.emoji}</span>
            {showLabel && <span>{config.label}</span>}
        </span>
    );

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>{pill}</TooltipTrigger>
                <TooltipContent side="top" className="text-xs max-w-[200px]">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-semibold">{config.emoji} {config.label}</span>
                        <span className="text-muted-foreground">{config.description}</span>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ─── Reputation Score Display ───────────────────────────────────────

interface ReputationScoreProps {
    score: number;
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function ReputationScore({ score, size = "sm", className }: ReputationScoreProps) {
    const tier = getReputationTier(score);

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 rounded-full font-bold border transition-all duration-200",
                            tier.bgClass,
                            tier.textClass,
                            tier.borderClass,
                            size === "sm"
                                ? "px-1.5 py-0.5 text-[10px]"
                                : size === "md"
                                    ? "px-2 py-0.5 text-xs"
                                    : "px-3 py-1 text-sm",
                            className
                        )}
                    >
                        <span>{tier.icon}</span>
                        <span>{score}</span>
                    </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                    <span>Reputation: {score} pts • {tier.label}</span>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ─── Reputation Tiers ───────────────────────────────────────────────

function getReputationTier(score: number) {
    if (score >= 500) return {
        label: "Legend",
        icon: "🔥",
        bgClass: "bg-gradient-to-r from-amber-500/15 to-orange-500/15",
        textClass: "text-orange-600 dark:text-orange-400",
        borderClass: "border-orange-500/30",
    };
    if (score >= 200) return {
        label: "Expert",
        icon: "⭐",
        bgClass: "bg-purple-500/10",
        textClass: "text-purple-600 dark:text-purple-400",
        borderClass: "border-purple-500/20",
    };
    if (score >= 100) return {
        label: "Regular",
        icon: "💎",
        bgClass: "bg-blue-500/10",
        textClass: "text-blue-600 dark:text-blue-400",
        borderClass: "border-blue-500/20",
    };
    if (score >= 25) return {
        label: "Active",
        icon: "✨",
        bgClass: "bg-emerald-500/10",
        textClass: "text-emerald-600 dark:text-emerald-400",
        borderClass: "border-emerald-500/20",
    };
    return {
        label: "Newcomer",
        icon: "🌱",
        bgClass: "bg-muted/50",
        textClass: "text-muted-foreground",
        borderClass: "border-border",
    };
}

// ─── Badge List (inline) ────────────────────────────────────────────

interface BadgeListProps {
    badges: string[];
    size?: "sm" | "md";
    maxShow?: number;
    className?: string;
}

export function BadgeList({ badges, size = "sm", maxShow = 3, className }: BadgeListProps) {
    if (!badges || badges.length === 0) return null;

    const visibleBadges = badges.slice(0, maxShow);
    const extraCount = badges.length - maxShow;

    return (
        <div className={cn("inline-flex items-center gap-1 flex-wrap", className)}>
            {visibleBadges.map((badge) => (
                <ReputationBadge
                    key={badge}
                    badge={badge}
                    size={size}
                    showLabel={size === "md"}
                />
            ))}
            {extraCount > 0 && (
                <span className="text-[10px] text-muted-foreground">+{extraCount}</span>
            )}
        </div>
    );
}
