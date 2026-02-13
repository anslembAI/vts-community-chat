"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Bell, BellOff, Clock } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface ChannelMuteButtonProps {
    channelId: Id<"channels">;
}

export function ChannelMuteButton({ channelId }: ChannelMuteButtonProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();

    // Check mute status
    const status = useQuery(api.adminNotifications.getChannelMuteStatus, {
        channelId,
        sessionId: sessionId ?? undefined,
    });

    const mute = useMutation(api.adminNotifications.muteChannelNotifications);
    const unmute = useMutation(api.adminNotifications.unmuteChannelNotifications);

    if (status === undefined) return null; // Loading

    const isMuted = status.isMuted;
    const muteUntilData = status.muteUntil ? new Date(status.muteUntil) : null;

    const handleMute = async (duration: "1h" | "4h" | "day") => {
        if (!sessionId) return;
        try {
            await mute({ sessionId, channelId, duration });
            let desc = "";
            if (duration === "1h") desc = "Muted for 1 hour";
            if (duration === "4h") desc = "Muted for 4 hours";
            if (duration === "day") desc = "Muted until end of day";

            toast({ title: "Notifications Muted", description: desc });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleUnmute = async () => {
        if (!sessionId) return;
        try {
            await unmute({ sessionId, channelId });
            toast({ title: "Notifications Unmuted", description: "You will receive notifications for this channel." });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    // Format remaining time if needed, or just show end time
    const timeString = muteUntilData ? muteUntilData.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 shrink-0 transition-colors",
                        isMuted ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" : "text-muted-foreground"
                    )}
                    title={isMuted ? `Muted until ${timeString}` : "Mute Notifications"}
                >
                    {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Notification Settings</DropdownMenuLabel>
                {isMuted && (
                    <>
                        <div className="px-2 py-1.5 text-xs text-amber-600 bg-amber-500/10 rounded-sm mb-1 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>Muted until {timeString}</span>
                        </div>
                        <DropdownMenuItem onClick={handleUnmute}>
                            <Bell className="mr-2 h-4 w-4" />
                            Unmute Now
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}

                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Mute for...
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleMute("1h")}>
                    <span>1 Hour</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMute("4h")}>
                    <span>4 Hours</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMute("day")}>
                    <span>Rest of the Day (POS)</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
