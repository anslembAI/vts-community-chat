"use client";

import { usePushNotifications } from "@/hooks/use-push-notifications";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface ChannelPushToggleProps {
    channelId: Id<"channels">;
}

export function ChannelPushToggle({ channelId }: ChannelPushToggleProps) {
    const { isSupported, masterEnabled, channelSettings, toggleChannel } = usePushNotifications();
    const { toast } = useToast();

    // In my logic, if undefined, we assume true. Let's explicitly check.
    const isChannelEnabled = channelSettings[channelId] !== false;

    if (!isSupported) {
        return null;
    }

    const handleToggle = async () => {
        if (!masterEnabled) {
            toast({
                title: "Master Push Disabled",
                description: "Please enable push notifications in your profile settings first.",
                variant: "destructive"
            });
            return;
        }

        const newState = !isChannelEnabled;
        await toggleChannel(channelId, newState);
        toast({
            title: newState ? "Push Enabled" : "Push Disabled",
            description: newState
                ? "You will receive push notifications for this channel."
                : "Push notifications muted for this channel."
        });
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-8 w-8 shrink-0 transition-colors",
                        !isChannelEnabled || !masterEnabled ? "text-muted-foreground" : "text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                    )}
                    title={isChannelEnabled && masterEnabled ? "Push notifications enabled" : "Push notifications disabled"}
                >
                    {isChannelEnabled && masterEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Push Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {!masterEnabled ? (
                    <div className="p-2 text-xs text-muted-foreground">
                        Enable Push Notifications in your profile to customize channels.
                    </div>
                ) : (
                    <>
                        <DropdownMenuItem onClick={handleToggle} className="gap-2">
                            {isChannelEnabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                            {isChannelEnabled ? "Mute Channel Push" : "Enable Channel Push"}
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
