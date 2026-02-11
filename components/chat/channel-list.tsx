
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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

    const handleJoin = async (e: React.MouseEvent, channelId: any) => {
        e.preventDefault();
        e.stopPropagation();
        if (!sessionId) return;
        await joinChannel({ sessionId, channelId });
    };

    const handleLeave = async (e: React.MouseEvent, channelId: any) => {
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

                {channels.map((channel: any) => (
                    <div key={channel._id} className="relative group flex items-center">
                        <Link
                            href={`/channel/${channel._id}`}
                            className={cn(
                                "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                                pathname === `/channel/${channel._id}` ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                            )}
                        >
                            {channel.type === "money_request" ? (
                                <DollarSign className="h-4 w-4 shrink-0 text-green-500" />
                            ) : channel.type === "announcement" ? (
                                <Megaphone className="h-4 w-4 shrink-0 text-amber-500" />
                            ) : (
                                <Hash className="h-4 w-4 shrink-0" />
                            )}
                            <span className="truncate font-medium text-sm flex-1 flex items-center gap-1">
                                {channel.name}
                                {channel.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
                            </span>

                            {/* Member Count Badge */}
                            <div className="flex items-center text-xs text-muted-foreground bg-background/50 px-1.5 py-0.5 rounded-full">
                                <Users className="h-3 w-3 mr-1" />
                                {channel.memberCount}
                            </div>
                        </Link>

                        {/* Action Buitions (show on hover or if active) */}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-background/80 backdrop-blur-sm rounded-md shadow-sm">
                            {channel.isMember ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => handleLeave(e, channel._id)}
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
                                            className="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={(e) => handleJoin(e, channel._id)}
                                        >
                                            <LogIn className="h-3.5 w-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Join Channel</TooltipContent>
                                </Tooltip>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </TooltipProvider>
    );
}
