
"use client";

import React, { useState, useEffect } from "react";
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
import { useUnread } from "@/hooks/use-unread";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

interface SortableChannelItemProps {
    channel: any;
    isAdmin: boolean;
    lockedOut: boolean;
    sessionId: string | null;
    pathname: string;
    unreadCount: number;
    onJoin: (e: React.MouseEvent, id: Id<"channels">) => void;
    onLeave: (e: React.MouseEvent, id: Id<"channels">) => void;
    getChannelIcon: (name: string, type: string) => React.ReactNode;
}

function SortableChannelItem({
    channel,
    isAdmin,
    lockedOut,
    sessionId,
    pathname,
    unreadCount,
    onJoin,
    onLeave,
    getChannelIcon,
}: SortableChannelItemProps) {
    const { toast } = useToast();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: channel._id, disabled: !isAdmin });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 1,
        position: isDragging ? ("relative" as const) : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "relative flex items-center gap-1 my-0.5 group",
                lockedOut && "opacity-60",
                isDragging && "opacity-80 scale-[1.02] shadow-sm z-50 rounded-xl bg-[#F4E9DD]"
            )}
        >
            {isAdmin && (
                <div
                    {...attributes}
                    {...listeners}
                    className="shrink-0 w-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <GripVertical className="h-4 w-4" />
                </div>
            )}

            {/* Action Buttons (Left side) - Fixed width for alignment */}
            <div className="shrink-0 w-6 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity">
                {!lockedOut && channel.isMember ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => onLeave(e, channel._id)}
                                disabled={!sessionId}
                            >
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Leave Channel</TooltipContent>
                    </Tooltip>
                ) : !lockedOut && !channel.isMember ? (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                onClick={(e) => onJoin(e, channel._id)}
                                disabled={!sessionId}
                            >
                                <LogIn className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Join Channel</TooltipContent>
                    </Tooltip>
                ) : null}
            </div>

            <Link
                href={lockedOut ? "#" : !channel.isMember && !isAdmin ? "#" : `/channel/${channel._id}`}
                onClick={(e) => {
                    if (lockedOut) {
                        e.preventDefault();
                        toast({ title: "This channel is locked." });
                    } else if (!channel.isMember && !isAdmin) {
                        e.preventDefault();
                        toast({
                            title: "Join Required",
                            description: "Please tap the join button on the left to view this channel.",
                        });
                    }
                }}
                tabIndex={lockedOut ? -1 : 0}
                aria-disabled={lockedOut || (!channel.isMember && !isAdmin)}
                className={cn(
                    "flex-1 flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-150 min-w-0 border border-transparent",
                    !lockedOut && pathname === `/channel/${channel._id}`
                        ? "bg-[#E2D6C8] border-[#E0D6C8] shadow-inner text-black"
                        : "text-black hover:bg-[#EADFD2]",
                    lockedOut && "cursor-not-allowed hover:bg-transparent"
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

                    {channel.isLocked && (
                        channel.hasOverride ? (
                            <Lock className="h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                                </TooltipTrigger>
                                <TooltipContent>Locked</TooltipContent>
                            </Tooltip>
                        )
                    )}
                </div>

                {/* Right Section: Member Count & Unread Badge */}
                <div className="flex items-center gap-2 shrink-0 ml-2">
                    {!lockedOut && unreadCount > 0 && (
                        <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full min-w-5 h-5 px-1 pb-[1px] shadow-sm">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                    {!lockedOut && (
                        <div className="flex items-center gap-1 text-sm text-[#5C5C5C]">
                            <Users className="h-4 w-4 opacity-70" />
                            <span>{channel.memberCount}</span>
                        </div>
                    )}
                </div>
            </Link>
        </div>
    );
}

export function ChannelList() {
    const { sessionId, isAdmin } = useAuth();
    const { unreadByChannel } = useUnread();
    const channelsData = useQuery(api.channels.getChannelsWithMembership, { sessionId: sessionId ?? undefined });
    const joinChannel = useMutation(api.channels.joinChannel);
    const leaveChannel = useMutation(api.channels.leaveChannel);
    const reorderChannels = useMutation(api.channels.reorderChannels);
    const pathname = usePathname();
    const { toast } = useToast();

    // Local state for optimistic drag & drop reordering
    const [channels, setChannels] = React.useState<any[]>([]);

    React.useEffect(() => {
        if (channelsData) {
            setChannels(channelsData);
        }
    }, [channelsData]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id || !channels) {
            return;
        }

        const oldIndex = channels.findIndex((c) => c._id === active.id);
        const newIndex = channels.findIndex((c) => c._id === over.id);

        const newOrder = arrayMove(channels, oldIndex, newIndex);

        // Optimistically update the UI instantly
        setChannels(newOrder);

        try {
            if (sessionId) {
                await reorderChannels({
                    sessionId,
                    orderedChannelIds: newOrder.map((c: any) => c._id),
                });
            }
        } catch (error: any) {
            toast({
                title: "Failed to reorder channels",
                description: error.message,
                variant: "destructive",
            });
            // Revert on failure
            if (channelsData) setChannels(channelsData);
        }
    };

    // Check if user is on the main dashboard
    const isDashboard = pathname === "/dashboard" || pathname === "/";

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

    if (channelsData === undefined) {
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
            <div className={cn("flex flex-col gap-1 p-2", isDashboard && "pt-5 md:pt-2")}>
                <div className="flex items-center justify-between px-3 py-1.5 pt-6">
                    <h2 className="text-sm font-semibold text-[#7A7A7A] uppercase tracking-wider">
                        Channels
                    </h2>
                    <Search className="h-5 w-5 text-[#7A7A7A] cursor-pointer hover:text-black transition-colors" />
                </div>

                {channels.length === 0 && channelsData?.length === 0 && (
                    <div className="px-2 text-sm text-muted-foreground">No channels yet</div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={channels.map((c) => c._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {channels.map((channel) => {
                            const lockedOut = channel.isLocked && !channel.hasOverride;
                            return (
                                <SortableChannelItem
                                    key={channel._id}
                                    channel={channel}
                                    isAdmin={isAdmin}
                                    lockedOut={lockedOut}
                                    sessionId={sessionId}
                                    pathname={pathname}
                                    unreadCount={unreadByChannel[channel._id] || 0}
                                    onJoin={handleJoin}
                                    onLeave={handleLeave}
                                    getChannelIcon={getChannelIcon}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </div>
        </TooltipProvider>
    );
}
