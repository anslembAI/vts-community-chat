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
    Check,
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
            <div className="h-px bg-gradient-to-r from-transparent via-[#E2D7C9] to-transparent" />
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
        <div className="space-y-6 border border-[#E2D7C9] rounded-2xl p-5 md:p-8 bg-white shadow-sm overflow-hidden relative">
            <div className="absolute top-0 left-0 w-2 h-full bg-[#E07A5F]" />
            <div className="space-y-2">
                <h3 className="text-xl font-black flex items-center gap-3 text-stone-800">
                    <div className="bg-[#E07A5F]/10 p-2 rounded-xl">
                        <Lock className="h-6 w-6 text-[#E07A5F]" />
                    </div>
                    Grant Access Code
                </h3>
                <p className="text-sm font-medium text-stone-500 max-w-lg leading-relaxed">
                    Create a one-time use 8-digit code for a member to join a locked channel.
                </p>
            </div>

            {!generatedCode ? (
                <div className="space-y-5 max-w-sm">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-stone-400">Locked Channel</Label>
                        <Popover open={channelComboOpen} onOpenChange={setChannelComboOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={channelComboOpen}
                                    className="w-full h-12 justify-between rounded-xl border-[#E2D7C9] bg-[#F4E9DD]/20 hover:bg-[#F4E9DD]/40 hover:border-[#E07A5F]/30 transition-all font-bold"
                                >
                                    {selectedChannel ? (
                                        <span className="flex items-center gap-2 truncate">
                                            <span className="text-lg">#</span>
                                            {selectedChannel.name}
                                        </span>
                                    ) : (
                                        <span className="text-stone-400">Select channel...</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#E07A5F]" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 border-[#E2D7C9] rounded-xl shadow-xl">
                                <Command className="rounded-xl">
                                    <CommandInput placeholder="Search channels..." className="h-12 border-none ring-0" />
                                    <CommandEmpty className="p-4 text-xs font-bold text-stone-400">No locked channels found.</CommandEmpty>
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
                                                <Lock className="ml-auto h-3 w-3 text-stone-300" />
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-stone-400">Target User</Label>
                        <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userComboOpen}
                                    className="w-full h-12 justify-between rounded-xl border-[#E2D7C9] bg-[#F4E9DD]/20 hover:bg-[#F4E9DD]/40 hover:border-[#E07A5F]/30 transition-all font-bold"
                                >
                                    {selectedUser ? (
                                        <span className="flex items-center gap-2 truncate">
                                            <User className="h-4 w-4 text-[#E07A5F]" />
                                            {selectedUser.name || selectedUser.username}
                                        </span>
                                    ) : (
                                        <span className="text-stone-400">Search users...</span>
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-[#E07A5F]" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0 border-[#E2D7C9] rounded-xl shadow-xl">
                                <Command className="rounded-xl">
                                    <CommandInput placeholder="Search by name/username..." className="h-12 border-none ring-0" />
                                    <CommandEmpty className="p-4 text-xs font-bold text-stone-400">No users found.</CommandEmpty>
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
                                                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">@{user.username}</span>
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
                <div className="space-y-6 max-w-sm bg-[#F4E9DD]/30 p-8 rounded-3xl border border-[#E2D7C9]/40 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#E07A5F]/20" />
                    <div className="space-y-4">
                        <div className="inline-flex p-3 bg-white rounded-2xl shadow-sm border border-[#E2D7C9]/50">
                            <KeyRound className="h-8 w-8 text-[#E07A5F]" />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-[#E07A5F]">One-Time Access Code</Label>
                            <div className="text-4xl font-black tracking-[0.2em] text-stone-800 py-2">
                                {generatedCode}
                            </div>
                            <p className="text-[11px] font-bold text-stone-500 leading-relaxed max-w-[240px] mx-auto">
                                Valid for 24h. Only for <span className="text-stone-900">{selectedUser?.name}</span> in <span className="text-stone-900">#{selectedChannel?.name}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <Button
                            variant="default"
                            onClick={copyToClipboard}
                            className="h-12 gap-3 bg-stone-900 hover:bg-stone-800 rounded-xl font-black uppercase text-xs tracking-widest shadow-md"
                        >
                            <Copy className="h-4 w-4" />
                            Copy to Clipboard
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={reset}
                            className="h-12 font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl"
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
        <div className="space-y-6 border border-[#E2D7C9] rounded-2xl p-5 md:p-8 bg-stone-50/50 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-stone-400" />
            <div className="space-y-2">
                <h3 className="text-xl font-black flex items-center gap-3 text-stone-800">
                    <div className="bg-stone-200 p-2 rounded-xl">
                        <ShieldAlert className="h-6 w-6 text-stone-600" />
                    </div>
                    Manage Active Codes
                </h3>
                <p className="text-sm font-medium text-stone-500 max-w-lg leading-relaxed">
                    View and revoke a member's active access codes.
                </p>
            </div>

            {/* User Selector */}
            <div className="max-w-sm space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-stone-400">Select Member</Label>
                <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={userComboOpen}
                            className="w-full h-12 justify-between rounded-xl border-[#E2D7C9] bg-white hover:bg-[#F4E9DD]/10 transition-all font-bold"
                        >
                            {selectedUser ? (
                                <span className="flex items-center gap-2 truncate">
                                    <User className="h-4 w-4 text-stone-400" />
                                    {selectedUser.name || selectedUser.username}
                                    <span className="text-[10px] font-bold text-stone-400">@{selectedUser.username}</span>
                                </span>
                            ) : (
                                <span className="text-stone-400">Search members...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-stone-400" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0 border-[#E2D7C9] rounded-xl shadow-xl">
                        <Command className="rounded-xl">
                            <CommandInput placeholder="Search member name..." className="h-12 border-none ring-0" />
                            <CommandEmpty className="p-4 text-xs font-bold text-stone-400">No members found.</CommandEmpty>
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
                                            selectedUserId === user._id ? "bg-stone-600" : "bg-transparent"
                                        )} />
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold truncate">{user.name || user.username}</span>
                                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-tighter">@{user.username}</span>
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
                        <div className="text-center py-10 bg-white/50 rounded-3xl border border-dashed border-[#E2D7C9]">
                            <KeyRound className="h-10 w-10 mx-auto mb-3 opacity-20 text-stone-500" />
                            <p className="text-sm font-bold text-stone-400">No active keys found</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {accessCodes.map((code) => (
                                <div
                                    key={code._id}
                                    className={cn(
                                        "group flex items-center justify-between gap-4 p-4 rounded-2xl border bg-white transition-all shadow-sm hover:shadow-md",
                                        code.used ? "opacity-60 border-[#E2D7C9]/40" : "border-[#E2D7C9]/80",
                                        code.expired && !code.used && "border-yellow-200 bg-yellow-50/10"
                                    )}
                                >
                                    <div className="flex items-start gap-4 min-w-0 flex-1">
                                        <div className={cn(
                                            "mt-1 p-2 rounded-lg shrink-0",
                                            code.used ? "bg-stone-100" : (code.expired ? "bg-yellow-100" : "bg-green-100")
                                        )}>
                                            <Lock className={cn(
                                                "h-4 w-4",
                                                code.used ? "text-stone-400" : (code.expired ? "text-yellow-600" : "text-green-600")
                                            )} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <span className="text-base font-black text-stone-800 tracking-tight">
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
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(code.createdAt)}
                                                </span>
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest bg-stone-100 px-1.5 py-0.5 rounded-md self-start">
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
