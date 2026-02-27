
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Hash,
    LogIn,
    LogOut,
    Users,
    DollarSign,
    Lock,
    Megaphone,
    Search,
    Laptop,
    BookOpen,
    Languages,
    MessageSquare,
    Home
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function ChannelList() {
    const { sessionId } = useAuth();
    const channels = useQuery(api.channels.getChannelsWithMembership, { sessionId: sessionId ?? undefined });
    const joinChannel = useMutation(api.channels.joinChannel);
    const leaveChannel = useMutation(api.channels.leaveChannel);
    const pathname = usePathname();

    const getChannelIcon = (name: string, type: string) => {
        const lowerName = name.toLowerCase();
        if (type === "money_request") return <DollarSign className="h-5 w-5 shrink-0 text-emerald-600" />;
        if (type === "announcement") return <Megaphone className="h-5 w-5 shrink-0 text-amber-600" />;

        if (lowerName.includes("dev")) return <Laptop className="h-5 w-5 shrink-0 text-blue-600" />;
        if (lowerName.includes("trading") || lowerName.includes("education")) return <BookOpen className="h-5 w-5 shrink-0 text-orange-600" />;
        if (lowerName.includes("duolingo")) return <Languages className="h-5 w-5 shrink-0 text-green-600" />;
        if (lowerName.includes("general")) return <Home className="h-5 w-5 shrink-0 text-slate-600" />;

        return <Hash className="h-5 w-5 shrink-0" />;
    };

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
                <div className="flex items-center justify-between px-3 py-1.5 pt-6">
                    <h2 className="text-sm font-semibold text-[#7A7A7A] uppercase tracking-wider">
                        Channels
                    </h2>
                    <Search className="h-5 w-5 text-[#7A7A7A] cursor-pointer hover:text-black transition-colors" />
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
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => handleLeave(e, channel._id)}
                                            disabled={!sessionId}
                                        >
                                            <LogOut className="h-5 w-5" />
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
                                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                            onClick={(e) => handleJoin(e, channel._id)}
                                            disabled={!sessionId}
                                        >
                                            <LogIn className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Join Channel</TooltipContent>
                                </Tooltip>
                            )}
                        </div>

                        <Link
                            href={`/channel/${channel._id}`}
                            className={cn(
                                "flex-1 flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 min-w-0 border border-transparent",
                                pathname === `/channel/${channel._id}`
                                    ? "bg-[#E2D6C8] border-[#E0D6C8] shadow-inner text-black"
                                    : "text-black hover:bg-[#EADFD2]"
                            )}
                        >
                            {/* Left Section: Icon + Name + Lock */}
                            <div className="flex items-center gap-2 min-w-0">
                                {getChannelIcon(channel.name, channel.type || "")}

                                <span className={cn(
                                    "font-medium text-base",
                                    pathname === `/channel/${channel._id}` && "font-semibold"
                                )}>
                                    {channel.name}
                                </span>

                                {channel.locked && (
                                    channel.hasOverride ? (
                                        <Lock className="h-4 w-4 shrink-0 text-green-600" />
                                    ) : (
                                        <Lock className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                                    )
                                )}
                            </div>

                            {/* Right Section: Member Count */}
                            <div className="flex items-center gap-1.5 text-sm text-[#5C5C5C] shrink-0 ml-2">
                                <Users className="h-4 w-4" />
                                <span>{channel.memberCount}</span>
                            </div>
                        </Link>
                    </div>
                ))}
            </div>
        </TooltipProvider>
    );
}
