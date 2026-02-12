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
            <hr className="border-border" />
            <ManageCodesSection />
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Generate Code Section (original functionality)
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
    const users = useQuery(api.users.getAllUsers, { sessionId: sessionId ?? undefined });
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
        <div className="space-y-4 border rounded-lg p-6 bg-card">
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Generate Channel Access Code
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Create a one-time use 8-digit code for a specific user to access a locked channel.
                </p>
            </div>

            {!generatedCode ? (
                <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                        <Label>Select Locked Channel</Label>
                        <Popover open={channelComboOpen} onOpenChange={setChannelComboOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={channelComboOpen}
                                    className="w-full justify-between"
                                >
                                    {selectedChannel ? (
                                        <span className="flex items-center gap-2 truncate">
                                            <Lock className="h-3 w-3 text-muted-foreground" />
                                            {selectedChannel.name}
                                        </span>
                                    ) : (
                                        "Select channel..."
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search channel..." />
                                    <CommandEmpty>No locked channels found.</CommandEmpty>
                                    <CommandGroup>
                                        {lockedChannels.map((channel) => (
                                            <CommandItem
                                                key={channel._id}
                                                value={channel.name}
                                                onSelect={() => {
                                                    setSelectedChannelId(channel._id);
                                                    setChannelComboOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedChannelId === channel._id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <Lock className="mr-2 h-3 w-3 text-muted-foreground" />
                                                {channel.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-2">
                        <Label>Select User</Label>
                        <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={userComboOpen}
                                    className="w-full justify-between"
                                >
                                    {selectedUser ? (
                                        <span className="truncate">
                                            {selectedUser.name || selectedUser.username}
                                        </span>
                                    ) : (
                                        "Select user..."
                                    )}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search user..." />
                                    <CommandEmpty>No users found.</CommandEmpty>
                                    <CommandGroup className="max-h-[300px] overflow-y-auto">
                                        {eligibleUsers.map((user) => (
                                            <CommandItem
                                                key={user._id}
                                                value={user.username}
                                                onSelect={() => {
                                                    setSelectedUserId(user._id);
                                                    setUserComboOpen(false);
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedUserId === user._id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col">
                                                    <span>{user.name || user.username}</span>
                                                    <span className="text-xs text-muted-foreground">@{user.username}</span>
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
                        className="w-full"
                    >
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate Access Code
                    </Button>
                </div>
            ) : (
                <div className="space-y-6 max-w-md bg-muted/30 p-6 rounded-lg border text-center">
                    <div className="space-y-2">
                        <Label className="text-muted-foreground uppercase text-xs tracking-wider">Access Code</Label>
                        <div className="text-3xl font-mono font-bold tracking-widest text-primary break-all">
                            {generatedCode}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            This code is valid for 24 hours. Valid only for {selectedUser?.name} in #{selectedChannel?.name}.
                        </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                        <Button variant="secondary" onClick={copyToClipboard} className="gap-2">
                            <Copy className="h-4 w-4" />
                            Copy Code
                        </Button>
                        <Button variant="outline" onClick={reset}>
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

    const users = useQuery(api.users.getAllUsers, { sessionId: sessionId ?? undefined });
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
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-4 border rounded-lg p-6 bg-card">
            <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-destructive" />
                    Manage Access Codes
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                    Select a user to view and revoke their access codes. Revoking a code also removes the user&apos;s channel access.
                </p>
            </div>

            {/* User Selector */}
            <div className="max-w-md space-y-2">
                <Label>Select User</Label>
                <Popover open={userComboOpen} onOpenChange={setUserComboOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={userComboOpen}
                            className="w-full justify-between"
                        >
                            {selectedUser ? (
                                <span className="flex items-center gap-2 truncate">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    {selectedUser.name || selectedUser.username}
                                    <span className="text-xs text-muted-foreground">@{selectedUser.username}</span>
                                </span>
                            ) : (
                                "Select user to manage..."
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0">
                        <Command>
                            <CommandInput placeholder="Search user..." />
                            <CommandEmpty>No users found.</CommandEmpty>
                            <CommandGroup className="max-h-[300px] overflow-y-auto">
                                {eligibleUsers.map((user) => (
                                    <CommandItem
                                        key={user._id}
                                        value={user.username}
                                        onSelect={() => {
                                            setSelectedUserId(user._id);
                                            setUserComboOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedUserId === user._id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{user.name || user.username}</span>
                                            <span className="text-xs text-muted-foreground">@{user.username}</span>
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
                <div className="space-y-3 mt-4">
                    {accessCodes === undefined ? (
                        <div className="space-y-2">
                            {[1, 2].map((i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-md" />
                            ))}
                        </div>
                    ) : accessCodes.length === 0 ? (
                        <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4 text-center">
                            <KeyRound className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            No access codes found for this user.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                {accessCodes.length} code{accessCodes.length !== 1 ? "s" : ""} found
                            </p>
                            {accessCodes.map((code) => (
                                <div
                                    key={code._id}
                                    className={cn(
                                        "flex items-center justify-between gap-3 p-3 rounded-lg border bg-background transition-colors",
                                        code.used && "opacity-60",
                                        code.expired && !code.used && "border-yellow-500/30"
                                    )}
                                >
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                        <div className="mt-0.5">
                                            <Lock className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium">
                                                    #{code.channelName}
                                                </span>
                                                {code.used ? (
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                        Used
                                                    </Badge>
                                                ) : code.expired ? (
                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-yellow-600 border-yellow-500/40">
                                                        Expired
                                                    </Badge>
                                                ) : (
                                                    <Badge className="text-[10px] px-1.5 py-0 bg-green-600/20 text-green-600 border-green-500/40 hover:bg-green-600/20">
                                                        Active
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Created {formatDate(code.createdAt)}
                                                </span>
                                                <span>by {code.createdByName}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                                        onClick={() => handleRevoke(code._id)}
                                        disabled={revokingId === code._id}
                                        title="Revoke access code"
                                    >
                                        {revokingId === code._id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
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
