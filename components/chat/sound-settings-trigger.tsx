import {
    Volume2,
    VolumeX,
    Speaker,
    Clock,
    MoreHorizontal,
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
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full border border-white/35 bg-white/30 text-black shadow-sm backdrop-blur-sm hover:bg-white/55">
                    {isDisabled || isMuted ? (
                        <VolumeX className="h-6 w-6" />
                    ) : (
                        <Volume2 className="h-6 w-6" />
                    )}
                    {isMuted && (
                        <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-destructive ring-2 ring-[#f6f3ee]"></span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4 rounded-[1.5rem] border border-white/40 bg-[rgba(255,255,255,0.82)] p-4 shadow-[0_20px_45px_rgba(98,113,126,0.18)] backdrop-blur-xl" align="end">
                <div className="flex items-center justify-between border-b border-white/30 pb-3">
                    <h4 className="font-medium leading-none flex items-center gap-2">
                        <Speaker className="h-5 w-5" /> Sound Settings ({settings.volume})
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
                        <Label className="text-xs text-black/45">Volume</Label>
                        <span className="text-xs text-black/45">{settings.volume}%</span>
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
                    <Label className="text-xs text-black/45">Notification Mode</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className={`w-full justify-start rounded-xl border-white/40 px-3 text-xs ${settings.mode === "smart" ? "bg-[rgba(228,214,198,0.72)] text-black shadow-sm" : "bg-white/55 text-black/50 hover:bg-white/75"}`}
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
                            className={`w-full justify-start rounded-xl px-3 text-xs ${settings.mode === "always" ? "bg-[#E07A5F] text-white shadow-sm hover:bg-[#d56f55]" : "border border-white/40 bg-white/55 text-black/50 hover:bg-white/75"}`}
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
                <div className="border-t border-white/30 pt-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex h-9 w-full items-center justify-between rounded-xl border-white/40 bg-white/45 text-xs hover:bg-white/75">
                                <span className="flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    Quick Mute...
                                </span>
                                <MoreHorizontal className="h-3.5 w-3.5 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[var(--radix-popover-trigger-width)] rounded-xl border border-white/40 bg-[rgba(255,255,255,0.82)] shadow-[0_20px_45px_rgba(98,113,126,0.18)] backdrop-blur-xl">
                            {muteOptions.map((opt) => (
                                <DropdownMenuItem key={opt.label} onClick={() => handleMute(opt.duration)}>
                                    {opt.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    {isMuted && settings.muteUntil && (
                        <p className="mt-2 text-center text-[10px] text-black/45">
                            Muted until {new Date(settings.muteUntil).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        </p>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
