"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { Loader2, Lock, Check, ChevronsUpDown, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function AccessCodeGenerator() {
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

    // Filter for locked channels only as per requirement
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
        } catch (error: any) {
            toast({
                variant: "destructive",
                description: error?.message || "Failed to generate code.",
            });
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
