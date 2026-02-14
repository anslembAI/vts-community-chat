import {
    Volume2,
    VolumeX,
    Speaker,
    Clock,
    MoreHorizontal,
    Settings,
    Check,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export function SoundSettingsControl() {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const updateSettings = useMutation(api.users.updateSoundSettings);
    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");

    const settings = currentUser?.soundSettings || {
        enabled: true,
        mode: "smart" as const,
        volume: 75,
        muteUntil: 0,
    };

    const isMuted = settings.muteUntil && settings.muteUntil > Date.now();
    const isDisabled = !settings.enabled;

    const handleVolumeChange = async (val: number[]) => {
        if (!sessionId) return;
        await updateSettings({
            sessionId,
            enabled: settings.enabled,
            mode: settings.mode,
            volume: val[0],
            muteUntil: settings.muteUntil,
        });
    };

    const handleToggleEnabled = async (checked: boolean) => {
        if (!sessionId) return;
        await updateSettings({
            sessionId,
            enabled: checked,
            mode: settings.mode,
            volume: settings.volume,
            muteUntil: settings.muteUntil,
        });
    };

    const handleModeChange = async (mode: "always" | "smart") => {
        if (!sessionId) return;
        await updateSettings({
            sessionId,
            enabled: settings.enabled,
            mode: mode,
            volume: settings.volume,
            muteUntil: settings.muteUntil,
        });
    };

    const handleMute = async (durationMs: number) => {
        if (!sessionId) return;
        const muteUntil = durationMs === 0 ? 0 : Date.now() + durationMs;
        await updateSettings({
            sessionId,
            enabled: settings.enabled,
            mode: settings.mode,
            volume: settings.volume,
            muteUntil: muteUntil,
        });

        if (durationMs > 0) {
            const time = new Date(muteUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            toast({ description: `Sounds muted until ${time}` });
        } else {
            toast({ description: "Sounds unmuted" });
        }
    };

    const muteOptions = [
        { label: "1 hour", duration: 60 * 60 * 1000 },
        { label: "4 hours", duration: 4 * 60 * 60 * 1000 },
        { label: "Until tomorrow", duration: 24 * 60 * 60 * 1000 }, // Simplified, roughly 24h
    ];

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground hover:text-foreground">
                    {isDisabled || isMuted ? (
                        <VolumeX className="h-5 w-5" />
                    ) : (
                        <Volume2 className="h-5 w-5" />
                    )}
                    {isMuted && (
                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive ring-2 ring-background"></span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4" align="end">
                <div className="flex items-center justify-between border-b pb-3">
                    <h4 className="font-medium leading-none flex items-center gap-2">
                        <Speaker className="h-4 w-4" /> Sound Settings
                    </h4>
                    {isMuted && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleMute(0)}
                        >
                            Unmute
                        </Button>
                    )}
                </div>

                {/* Master Toggle */}
                <div className="flex items-center justify-between">
                    <Label htmlFor="sound-enabled" className="text-sm font-medium">Enable Sounds</Label>
                    <Switch
                        id="sound-enabled"
                        checked={settings.enabled}
                        onCheckedChange={handleToggleEnabled}
                    />
                </div>

                {/* Volume Slider */}
                <div className="space-y-2 opacity-100 transition-opacity duration-200" style={{ opacity: settings.enabled ? 1 : 0.5 }}>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Volume</Label>
                        <span className="text-xs text-muted-foreground">{settings.volume}%</span>
                    </div>
                    <Slider
                        value={[settings.volume]}
                        max={100}
                        step={1}
                        onValueChange={handleVolumeChange}
                        disabled={!settings.enabled}
                        className="w-full"
                    />
                </div>

                {/* Mode Selection */}
                <div className="space-y-2" style={{ opacity: settings.enabled ? 1 : 0.5 }}>
                    <Label className="text-xs text-muted-foreground">Notification Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant={settings.mode === "smart" ? "default" : "outline"}
                            size="sm"
                            className="w-full text-xs justify-start px-3"
                            disabled={!settings.enabled}
                            onClick={() => handleModeChange("smart")}
                        >
                            <div className="flex flex-col items-start gap-0.5">
                                <span className="font-semibold">Smart</span>
                                <span className="text-[10px] opacity-80 font-normal">Background only</span>
                            </div>
                            {settings.mode === "smart" && <Check className="ml-auto h-3 w-3" />}
                        </Button>
                        <Button
                            variant={settings.mode === "always" ? "default" : "outline"}
                            size="sm"
                            className="w-full text-xs justify-start px-3"
                            disabled={!settings.enabled}
                            onClick={() => handleModeChange("always")}
                        >
                            <div className="flex flex-col items-start gap-0.5">
                                <span className="font-semibold">Always</span>
                                <span className="text-[10px] opacity-80 font-normal">All messages</span>
                            </div>
                            {settings.mode === "always" && <Check className="ml-auto h-3 w-3" />}
                        </Button>
                    </div>
                </div>

                {/* Quick Mute Presets */}
                <div className="pt-2 border-t">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full flex items-center justify-between text-xs h-8">
                                <span className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    Quick Mute...
                                </span>
                                <MoreHorizontal className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[var(--radix-popover-trigger-width)]">
                            {muteOptions.map((opt) => (
                                <DropdownMenuItem key={opt.label} onClick={() => handleMute(opt.duration)}>
                                    {opt.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {isMuted && settings.muteUntil && (
                        <p className="text-[10px] text-muted-foreground text-center mt-2">
                            Muted until {new Date(settings.muteUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
