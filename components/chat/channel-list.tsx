
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Hash, LogIn, LogOut, Users, DollarSign, Lock, Megaphone } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ChannelList() {
    const { sessionId } = useAuth();
    // Default to empty array if no sessionId, but query should handle null too.
    // We actually want to fetch even if unauthenticated (partially), but our backend logic expects session for "isMember" check.
    const channels = useQuery(api.channels.getChannelsWithMembership, { sessionId: sessionId ?? undefined });
    const joinChannel = useMutation(api.channels.joinChannel);
    const leaveChannel = useMutation(api.channels.leaveChannel);
    const pathname = usePathname();

    const handleJoin = async (e: React.MouseEvent, channelId: Id<"channels">) => {
        e.preventDefault();
        e.stopPropagation();
        if (!sessionId) return;
        await joinChannel({ sessionId, channelId });
    };

    const handleLeave = async (e: React.MouseEvent, channelId: Id<"channels">) => {
        e.preventDefault();
        e.stopPropagation();
        if (!sessionId) return;
        await leaveChannel({ sessionId, channelId });
    };

    if (channels === undefined) {
        return (
            <div className="flex flex-col gap-2 p-2">
                <div className="px-2 py-1.5">
                    <Skeleton className="h-4 w-20" />
                </div>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                ))}
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-1 p-2">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Channels
                    </h2>
                </div>

                {channels.length === 0 && (
                    <div className="px-2 text-sm text-muted-foreground">No channels yet</div>
                )}

                {channels.map((channel) => (
                    <div key={channel._id} className="relative group flex items-center gap-1 my-0.5">
                        {/* Action Buttons (Left side) - Fixed width for alignment */}
                        <div className="shrink-0 w-6 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                            {channel.isMember ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => handleLeave(e, channel._id)}
                                            disabled={!sessionId}
                                        >
                                            <LogOut className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Leave Channel</TooltipContent>
                                </Tooltip>
                            ) : (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={(e) => handleJoin(e, channel._id)}
                                            disabled={!sessionId}
                                        >
                                            <LogIn className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Join Channel</TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <Link
                            href={`/channel/${channel._id}`}
                            className={cn(
                                "flex-1 flex items-center justify-between px-3 py-2 rounded-md transition-colors min-w-0",
                                pathname === `/channel/${channel._id}`
                                    ? "bg-accent text-accent-foreground"
                                    : "text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground"
                            )}
                        >
                            {/* Left Section: Icon + Name + Lock */}
                            <div className="flex items-center gap-2 min-w-0">
                                {channel.type === "money_request" ? (
                                    <DollarSign className="h-4 w-4 shrink-0 text-green-500" />
                                ) : channel.type === "announcement" ? (
                                    <Megaphone className="h-4 w-4 shrink-0 text-amber-500" />
                                ) : (
                                    <Hash className="h-4 w-4 shrink-0" />
                                )}

                                <span className="font-medium text-sm">
                                    {channel.name}
                                </span>

                                {channel.locked && (
                                    channel.hasOverride ? (
                                        <Lock className="h-3 w-3 shrink-0 text-green-500" />
                                    ) : (
                                        <Lock className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                                    )
                                )}
                            </div>

                            {/* Right Section: Member Count */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0 ml-2">
                                <Users className="h-3 w-3" />
                                <span>{channel.memberCount}</span>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </TooltipProvider>
    );
}
