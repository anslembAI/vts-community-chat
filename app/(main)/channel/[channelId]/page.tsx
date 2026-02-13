"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { useParams } from "next/navigation";
import { ChannelMuteButton } from "@/components/chat/channel-mute-button";
import {
    Hash,
    Loader2,
    Lock,
    Unlock,
    ShieldAlert,
    MoreVertical,
    Megaphone,
    Pencil,
} from "lucide-react";
import { AccessCodeRedeem } from "@/components/chat/access-code-redeem";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

export default function ChannelPage() {
    const params = useParams();
    const channelId = params.channelId as Id<"channels">;
    const { sessionId } = useAuth();
    const { toast } = useToast();

    const channels = useQuery(api.channels.getChannels);
    const channel = channels?.find((c) => c._id === channelId);

    const currentUser = useQuery(
        api.users.getCurrentUser,
        sessionId ? { sessionId } : "skip"
    );

    const lockChannel = useMutation(api.channels.lockChannel);
    const renameChannel = useMutation(api.channels.renameChannel);
    const unlockChannel = useMutation(api.channels.unlockChannel);

    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);

    const [lockReason, setLockReason] = useState("");
    const [lockDialogOpen, setLockDialogOpen] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<Id<"messages"> | null>(null);

    const isAdmin = currentUser?.isAdmin ?? false;
    const isLocked = channel?.locked ?? false;
    const isAnnouncement = channel?.type === "announcement";

    const hasOverride = useQuery(api.channels.hasLockOverride, {
        channelId,
        sessionId: sessionId ?? undefined,
    });

    if (channels === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!channel) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <h2 className="text-2xl font-bold">Channel not found</h2>
                <p className="text-muted-foreground">The channel you are looking for does not exist.</p>
            </div>
        );
    }

    const handleLock = async () => {
        if (!sessionId) return;
        try {
            await lockChannel({
                sessionId,
                channelId,
                reason: lockReason.trim() || undefined,
            });
            toast({ title: "Channel locked", description: "Users can no longer post in this channel." });
            setLockReason("");
            setLockDialogOpen(false);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const handleUnlock = async () => {
        if (!sessionId) return;
        try {
            await unlockChannel({ sessionId, channelId });
            toast({ title: "Channel unlocked", description: "Users can post again." });
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    };

    const handleRename = async () => {
        if (!sessionId || !newName.trim()) return;
        if (newName.trim().length < 2 || newName.trim().length > 40) {
            toast({ title: "Invalid Name", description: "Channel name must be between 2 and 40 characters.", variant: "destructive" });
            return;
        }

        setIsRenaming(true);
        try {
            await renameChannel({
                sessionId,
                channelId,
                name: newName.trim(),
            });
            toast({ title: "Channel Renamed", description: `Channel renamed to ${newName.trim()}` });
            setRenameDialogOpen(false);
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsRenaming(false);
        }
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-14 items-center gap-2 border-b bg-background px-4 shrink-0">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold truncate">{channel.name}</h2>
                        {isAnnouncement && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-500/20">
                                <Megaphone className="h-3 w-3" />
                                Broadcast
                            </span>
                        )}
                        {isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive border border-destructive/20">
                                <Lock className="h-3 w-3" />
                                Locked
                            </span>
                        )}
                    </div>
                    {channel.description && (
                        <p className="text-xs text-muted-foreground hidden sm:block truncate">
                            {channel.description}
                        </p>
                    )}
                </div>

                {/* Admin channel controls */}
                {isAdmin && (
                    <div className="flex items-center gap-1">
                        <ChannelMuteButton channelId={channelId} />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => {
                                    setNewName(channel.name);
                                    setRenameDialogOpen(true);
                                }} className="gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Rename Channel
                                </DropdownMenuItem>
                                {isLocked ? (
                                    <DropdownMenuItem onClick={handleUnlock} className="gap-2">
                                        <Unlock className="h-4 w-4" />
                                        Unlock Channel
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={() => setLockDialogOpen(true)}
                                        className="gap-2"
                                    >
                                        <Lock className="h-4 w-4" />
                                        Lock Channel
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            {/* Lock Banner */}
            {isLocked && !isAdmin && !hasOverride && (
                <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-destructive/5 border-b border-destructive/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                        <p className="text-xs text-destructive/80">
                            This channel is locked by an admin.
                            {channel.lockReason && (
                                <span className="ml-1 font-medium">Reason: {channel.lockReason}</span>
                            )}
                        </p>
                    </div>
                    <AccessCodeRedeem channelId={channelId} />
                </div>
            )}

            {/* Announcement Banner */}
            {isAnnouncement && !isAdmin && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/10 shrink-0">
                    <Megaphone className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                        This is an announcement channel. Only administrators can post.
                        You can react to messages and mark them as read.
                    </p>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex">
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Messages */}
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <MessageList
                            channelId={channelId}
                            onThreadSelect={(id) => setActiveThreadId(id)}
                        />
                    </div>

                    {/* Input */}
                    <div className="shrink-0">
                        <MessageInput
                            channelId={channelId}
                            isLocked={isLocked}
                            isAdmin={isAdmin}
                            isAnnouncement={isAnnouncement}
                        />
                    </div>
                </div>

                {/* Thread Panel */}
                {activeThreadId && (
                    <div className="shrink-0 h-full border-l">
                        <ThreadPanel
                            messageId={activeThreadId}
                            channelId={channelId}
                            onClose={() => setActiveThreadId(null)}
                            isLocked={isLocked}
                            isAdmin={isAdmin}
                        />
                    </div>
                )}
            </div>

            {/* Lock Channel Dialog */}
            <Dialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Lock className="h-5 w-5 text-destructive" />
                            Lock Channel
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">
                            Locking this channel will prevent non-admin users from sending messages, creating polls, or creating money requests.
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="lock-reason" className="text-xs font-medium">
                                Reason (optional)
                            </Label>
                            <Input
                                id="lock-reason"
                                placeholder="e.g. Maintenance, moderation..."
                                value={lockReason}
                                onChange={(e) => setLockReason(e.target.value)}
                                maxLength={120}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" size="sm">Cancel</Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleLock}
                            className="gap-1"
                        >
                            <Lock className="h-3.5 w-3.5" />
                            Lock Channel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Rename Channel Dialog */}
            <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Rename Channel
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="channel-name" className="text-xs font-medium">
                                Channel Name
                            </Label>
                            <Input
                                id="channel-name"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. general-chat"
                                maxLength={40}
                                disabled={isRenaming}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                2-40 characters. Letters, numbers, spaces, and hyphens only.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setRenameDialogOpen(false)} disabled={isRenaming}>
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleRename}
                            disabled={isRenaming || !newName.trim() || newName.trim() === channel.name}
                        >
                            {isRenaming && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
