"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Loader2,
    Lock,
    ChevronsUpDown,
    Copy,
    Trash2,
    KeyRound,
    Clock,
    ShieldAlert,
    User,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Access Codes Section (wraps generator + manager)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function AccessCodeGenerator() {
    return (
        <div className="space-y-6">
            <GenerateCodeSection />
            <div className="h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <ManageCodesSection />
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Generate Code Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function GenerateCodeSection() {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
    const [generatedCode, setGeneratedCode] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [userComboOpen, setUserComboOpen] = useState(false);
    const [channelComboOpen, setChannelComboOpen] = useState(false);

    const channels = useQuery(api.channels.getChannels);
    const users = useQuery(api.users.getAllUsers, sessionId ? { sessionId } : "skip");
    const generateCode = useMutation(api.access.generateChannelAccessCode);

    const lockedChannels = channels?.filter((c) => c.locked) || [];
    const eligibleUsers = users?.filter((u) => !u.isAdmin) || [];

    const handleGenerate = async () => {
        if (!sessionId || !selectedChannelId || !selectedUserId) return;

        setIsGenerating(true);
        try {
            const code = await generateCode({
                sessionId,
                channelId: selectedChannelId,
                targetUserId: selectedUserId,
            });
            setGeneratedCode(code);
            toast({ description: "Access code generated successfully." });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to generate code.";
            toast({ variant: "destructive", description: msg });
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = () => {
        if (generatedCode) {
            navigator.clipboard.writeText(generatedCode);
            toast({ description: "Code copied to clipboard." });
        }
    };

    const reset = () => {
        setGeneratedCode(null);
        setSelectedUserId(null);
        setSelectedChannelId(null);
    };

    const selectedUser = users?.find((u) => u._id === selectedUserId);
    const selectedChannel = channels?.find((c) => c._id === selectedChannelId);

    return (
        <div className="vts-panel relative space-y-6 overflow-hidden rounded-[1.75rem] p-5 md:p-8">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#E07A5F]" />
            <div className="space-y-2">
                <h3 className="flex items-center gap-3 text-xl font-black text-[#2c3034]">
                    <div className="bg-[#E07A5F]/10 p-2 rounded-xl">
                        <Lock className="h-6 w-6 text-[#E07A5F]" />
                    </div>
                    Grant Access Code
                </h3>
                <p className="max-w-lg text-sm font-medium leading-relaxed text-black/45">
                    Create a one-time use 8-digit code for a member to join a locked channel.
                </p>
            </div>

            {!generatedCode ? (
                <div className="space-y-5 max-w-sm">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-black/35">Locked Channel</Label>
                        <Popover open={channelComboOpen} onOpenChange={setChannelComboOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={channelComboOpen}
                        className="h-12 w-full justify-between rounded-xl border-white/45 bg-white/35 font-bold transition-all hover:border-[#E07A5F]/30 hover:bg-white/55"
                                >
                                    {selectedChannel ? (
                                        <span className="flex items-center gap-2 truncate">
                                            <span className="text-lg">#</span>
                                            {selectedChannel.name}
                                        </span>
                                    ) : (
                                        <span className="text-black/35">Select channel...</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#E07A5F]" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] rounded-xl border-white/40 p-0 shadow-xl backdrop-blur-xl">
                                <Command className="rounded-xl">
                                    <CommandInput placeholder="Search channels..." className="h-12 border-none ring-0" />
                                    <CommandEmpty className="p-4 text-xs font-bold text-black/35">No locked channels found.</CommandEmpty>
                                    <CommandGroup className="max-h-[300px] overflow-y-auto p-1">
                                        {lockedChannels.map((channel) => (
                                            <CommandItem
                                                key={channel._id}
                                                value={channel.name}
                                                onSelect={() => {
                                                    setSelectedChannelId(channel._id);
                                                    setChannelComboOpen(false);
                                                }}
                                                className="rounded-lg h-11 pointer-events-auto cursor-pointer flex items-center gap-2"
                                            >
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    selectedChannelId === channel._id ? "bg-[#E07A5F]" : "bg-transparent"
                                                )} />
                                                <span className="font-bold">{channel.name}</span>
                                                <Lock className="ml-auto h-3 w-3 text-[#E07A5F]/45" />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-black/35">Target User</Label>
                        <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userComboOpen}
                        className="h-12 w-full justify-between rounded-xl border-white/45 bg-white/35 font-bold transition-all hover:border-[#E07A5F]/30 hover:bg-white/55"
                                >
                                    {selectedUser ? (
                                        <span className="flex items-center gap-2 truncate">
                                            <User className="h-4 w-4 text-[#E07A5F]" />
                                            {selectedUser.name || selectedUser.username}
                                        </span>
                                    ) : (
                                        <span className="text-black/35">Search users...</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#E07A5F]" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] rounded-xl border-white/40 p-0 shadow-xl backdrop-blur-xl">
                                <Command className="rounded-xl">
                                    <CommandInput placeholder="Search by name/username..." className="h-12 border-none ring-0" />
                                    <CommandEmpty className="p-4 text-xs font-bold text-black/35">No users found.</CommandEmpty>
                                    <CommandGroup className="max-h-[300px] overflow-y-auto p-1">
                                        {eligibleUsers.map((user) => (
                                            <CommandItem
                                                key={user._id}
                                                value={user.username}
                                                onSelect={() => {
                                                    setSelectedUserId(user._id);
                                                    setUserComboOpen(false);
                                                }}
                                                className="rounded-lg h-12 pointer-events-auto cursor-pointer flex items-center gap-3"
                                            >
                                                <div className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    selectedUserId === user._id ? "bg-[#E07A5F]" : "bg-transparent"
                                                )} />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold truncate">{user.name || user.username}</span>
                                                    <span className="text-[10px] font-bold uppercase tracking-tighter text-black/35">@{user.username}</span>
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={!selectedChannelId || !selectedUserId || isGenerating}
                        className="w-full h-14 rounded-2xl bg-[#E07A5F] hover:bg-[#D06A4F] text-white font-black text-lg shadow-lg shadow-[#E07A5F]/20 active:scale-95 transition-all mt-2"
                    >
                        {isGenerating && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
                        Generate Access Key
                    </Button>
                </div>
            ) : (
                <div className="relative max-w-sm space-y-6 overflow-hidden rounded-3xl border border-white/40 bg-white/24 p-8 text-center">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#E07A5F]/20" />
                    <div className="space-y-4">
                        <div className="inline-flex rounded-2xl border border-white/50 bg-white/60 p-3 shadow-sm">
                            <KeyRound className="h-8 w-8 text-[#E07A5F]" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-[#E07A5F]">One-Time Access Code</Label>
                            <div className="py-2 text-4xl font-black tracking-[0.2em] text-[#2c3034]">
                                {generatedCode}
                            </div>
                            <p className="mx-auto max-w-[240px] text-[11px] font-bold leading-relaxed text-black/45">
                                Valid for 24h. Only for <span className="text-[#2c3034]">{selectedUser?.name}</span> in <span className="text-[#2c3034]">#{selectedChannel?.name}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            variant="default"
                            onClick={copyToClipboard}
                            className="h-12 gap-3 rounded-xl bg-[#2c3034] text-xs font-black uppercase tracking-widest shadow-md hover:bg-[#23272b]"
                        >
                            <Copy className="h-4 w-4" />
                            Copy to Clipboard
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={reset}
                            className="h-12 rounded-xl font-bold text-black/45 hover:bg-white/55 hover:text-[#2c3034]"
                        >
                            Generate Another
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Manage / Revoke Codes Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ManageCodesSection() {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
    const [userComboOpen, setUserComboOpen] = useState(false);
    const [revokingId, setRevokingId] = useState<string | null>(null);

    const users = useQuery(api.users.getAllUsers, sessionId ? { sessionId } : "skip");
    const accessCodes = useQuery(
        api.access.getAccessCodesForUser,
        sessionId && selectedUserId
            ? { sessionId: sessionId as Id<"sessions">, targetUserId: selectedUserId }
            : "skip"
    );
    const revokeCode = useMutation(api.access.revokeAccessCode);

    const eligibleUsers = users?.filter((u) => !u.isAdmin) || [];
    const selectedUser = users?.find((u) => u._id === selectedUserId);

    const handleRevoke = async (codeId: Id<"channel_access_codes">) => {
        if (!sessionId) return;
        setRevokingId(codeId);
        try {
            await revokeCode({
                sessionId: sessionId as Id<"sessions">,
                codeId,
            });
            toast({ description: "Access code revoked and user access removed." });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to revoke code.";
            toast({ variant: "destructive", description: msg });
        } finally {
            setRevokingId(null);
        }
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    return (
        <div className="vts-panel relative space-y-6 overflow-hidden rounded-[1.75rem] p-5 md:p-8">
            <div className="absolute top-0 left-0 h-full w-2 bg-[#d7c4ab]" />
            <div className="space-y-2">
                <h3 className="flex items-center gap-3 text-xl font-black text-[#2c3034]">
                    <div className="rounded-xl bg-[rgba(215,196,171,0.32)] p-2">
                        <ShieldAlert className="h-6 w-6 text-[#8a7258]" />
                    </div>
                    Manage Active Codes
                </h3>
                <p className="max-w-lg text-sm font-medium leading-relaxed text-black/45">
                    View and revoke a member&apos;s active access codes.
                </p>
            </div>

            {/* User Selector */}
            <div className="max-w-sm space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-black/35">Select Member</Label>
                <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={userComboOpen}
                        className="h-12 w-full justify-between rounded-xl border-white/45 bg-white/45 font-bold transition-all hover:border-[#d7c4ab]/50 hover:bg-white/65"
                        >
                            {selectedUser ? (
                                <span className="flex items-center gap-2 truncate">
                                    <User className="h-4 w-4 text-[#8a7258]" />
                                    {selectedUser.name || selectedUser.username}
                                    <span className="text-[10px] font-bold text-black/35">@{selectedUser.username}</span>
                                </span>
                            ) : (
                                <span className="text-black/35">Search members...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-[#8a7258]/70" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] rounded-xl border-white/40 p-0 shadow-xl backdrop-blur-xl">
                        <Command className="rounded-xl">
                            <CommandInput placeholder="Search member name..." className="h-12 border-none ring-0" />
                            <CommandEmpty className="p-4 text-xs font-bold text-black/35">No members found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto p-1">
                                {eligibleUsers.map((user) => (
                                    <CommandItem
                                        key={user._id}
                                        value={user.username}
                                        onSelect={() => {
                                            setSelectedUserId(user._id);
                                            setUserComboOpen(false);
                                        }}
                                        className="rounded-lg h-12 pointer-events-auto cursor-pointer flex items-center gap-3"
                                    >
                                        <div className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            selectedUserId === user._id ? "bg-[#8a7258]" : "bg-transparent"
                                        )} />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold truncate">{user.name || user.username}</span>
                                            <span className="text-[10px] font-bold uppercase tracking-tighter text-black/35">@{user.username}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Access Codes List */}
            {selectedUserId && (
                <div className="space-y-4">
                    {accessCodes === undefined ? (
                        <div className="space-y-3">
                            <Skeleton className="h-16 w-full rounded-2xl" />
                            <Skeleton className="h-16 w-full rounded-2xl" />
                        </div>
                    ) : accessCodes.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-white/40 bg-white/24 py-10 text-center">
                            <KeyRound className="mx-auto mb-3 h-10 w-10 text-black/25" />
                            <p className="text-sm font-bold text-black/35">No active keys found</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {accessCodes.map((code) => (
                                <div
                                    key={code._id}
                                    className={cn(
                                        "group flex items-center justify-between gap-4 rounded-2xl border bg-white/38 p-4 shadow-sm transition-all hover:shadow-md",
                                        code.used ? "opacity-60 border-white/30" : "border-white/45",
                                        code.expired && !code.used && "border-yellow-200 bg-yellow-50/10"
                                    )}
                                >
                                    <div className="flex items-start gap-4 min-w-0 flex-1">
                                        <div className={cn(
                                            "mt-1 p-2 rounded-lg shrink-0",
                                            code.used ? "bg-[rgba(215,196,171,0.28)]" : (code.expired ? "bg-yellow-100/80" : "bg-green-100/80")
                                        )}>
                                            <Lock className={cn(
                                                "h-4 w-4",
                                                code.used ? "text-[#8a7258]" : (code.expired ? "text-yellow-700" : "text-green-700")
                                            )} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-base font-black tracking-tight text-[#2c3034]">
                                                    #{code.channelName}
                                                </span>
                                                {code.used ? (
                                                    <Badge variant="secondary" className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-tighter">Used</Badge>
                                                ) : code.expired ? (
                                                    <Badge variant="outline" className="text-[9px] px-2 py-0.5 text-yellow-600 border-yellow-500/40 font-bold uppercase tracking-tighter">Expired</Badge>
                                                ) : (
                                                    <Badge className="text-[9px] px-2 py-0.5 bg-green-100 text-green-700 border-none font-bold uppercase tracking-tighter">Active Agent</Badge>
                                                )}
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 gap-x-4">
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-black/35">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(code.createdAt)}
                                                </span>
                                                <span className="self-start rounded-md bg-[rgba(215,196,171,0.22)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black/35">
                                                    By {code.createdByName}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-12 w-12 rounded-xl text-destructive hover:text-white hover:bg-destructive border-destructive/20 active:scale-90 transition-all shrink-0 shadow-sm"
                                        onClick={() => handleRevoke(code._id)}
                                        disabled={revokingId === code._id}
                                    >
                                        {revokingId === code._id ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
