"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { ThreadPanel } from "@/components/chat/thread-panel";
import { useParams, useRouter } from "next/navigation";
import { ChannelMuteButton } from "@/components/chat/channel-mute-button";
import { ChannelPushToggle } from "@/components/chat/channel-push-toggle";
import {
    Hash,
    Loader2,
    Lock,
    Unlock,
    ShieldAlert,
    MoreVertical,
    Megaphone,
    Pencil,
    Laptop,
    BookOpen,
    Languages,
    Home,
    Trash2
} from "lucide-react";
import { AccessCodeRedeem } from "@/components/chat/access-code-redeem";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
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
import { useState, useEffect, useCallback } from "react";

export default function ChannelPage() {
    const params = useParams();
    const router = useRouter();
    const channelId = params.channelId as Id<"channels">;
    const { sessionId } = useAuth();
    const { toast } = useToast();

    // Use getChannelsWithMembership to access the isMember flag
    const channels = useQuery(
        api.channels.getChannelsWithMembership,
        sessionId ? { sessionId } : "skip"
    );
    const channel = channels?.find((c) => c._id === channelId);

    const currentUser = useQuery(
        api.users.getCurrentUser,
        sessionId ? { sessionId } : "skip"
    );

    const lockChannel = useMutation(api.channels.lockChannel);
    const renameChannel = useMutation(api.channels.renameChannel);
    const unlockChannel = useMutation(api.channels.unlockChannel);
    const clearChannelMessages = useMutation(api.messages.clearChannelMessages);
    const joinChannel = useMutation(api.channels.joinChannel);

    const [renameDialogOpen, setRenameDialogOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [isRenaming, setIsRenaming] = useState(false);

    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const [clearConfirmation, setClearConfirmation] = useState("");
    const [isClearing, setIsClearing] = useState(false);

    const [lockReason, setLockReason] = useState("");
    const [lockDialogOpen, setLockDialogOpen] = useState(false);
    const [activeThreadId, setActiveThreadId] = useState<Id<"messages"> | null>(null);
    const [isJoining, setIsJoining] = useState(false);
    const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);
    const handleTypingUsersChange = useCallback((users: { userId: string; username: string }[]) => {
        setTypingUsers(users);
    }, []);

    const isAdmin = currentUser?.isAdmin ?? false;
    const isLocked = channel?.locked ?? false;
    const isAnnouncement = channel?.type === "announcement";

    const hasOverride = useQuery(api.channels.hasLockOverride, {
        channelId,
        sessionId: sessionId ?? undefined,
    });

    const isReady = channels !== undefined && currentUser !== undefined && hasOverride !== undefined && (!sessionId || currentUser !== null);
    const lockedOut = isReady && isLocked && !isAdmin && !hasOverride;

    // Check if the user is a member, administrators bypass this mostly but technically need membership to post.
    // However, we only restrict rendering if they strictly have no membership and are not an admin.
    const nonMember = isReady && channel && !channel.isMember && !isAdmin;

    useEffect(() => {
        if (lockedOut) {
            toast({ title: "This channel is locked." });
            router.push("/");
        }
    }, [lockedOut, router, toast]);

    const handleJoinChannel = async () => {
        if (!sessionId) return;
        setIsJoining(true);
        try {
            await joinChannel({ sessionId, channelId });
            toast({ title: "Joined channel successfully." });
        } catch (err: any) {
            toast({ title: "Error joining channel", description: err.message, variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };

    if (!isReady) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (lockedOut) {
        return null;
    }

    if (!channel) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <h2 className="text-2xl font-bold">Channel not found</h2>
                <p className="text-muted-foreground">The channel you are looking for does not exist.</p>
            </div>
        );
    }

    if (nonMember) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4 text-center p-6">
                <div className="w-16 h-16 bg-[#F4E9DD] flex items-center justify-center rounded-2xl mb-2">
                    <Lock className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-black">Join Required</h2>
                <p className="text-muted-foreground max-w-sm">
                    You must be a member of <strong className="text-black">#{channel.name}</strong> to view and send messages.
                </p>
                <Button
                    className="mt-4 gap-2"
                    onClick={handleJoinChannel}
                    disabled={isJoining}
                >
                    {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    {isJoining ? "Joining..." : "Join Channel"}
                </Button>
            </div>
        );
    }

    if (lockedOut) {
        return null;
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

    const handleClearChannel = async () => {
        if (!sessionId || !channel) return;
        if (clearConfirmation !== "CLEAR" && clearConfirmation !== channel.name) {
            toast({ title: "Validation Error", description: "You must type the channel name or CLEAR.", variant: "destructive" });
            return;
        }

        setIsClearing(true);
        try {
            let isDone = false;
            let totalDeleted = 0;

            while (!isDone) {
                const result = await clearChannelMessages({
                    sessionId,
                    channelId,
                });

                isDone = result.isDone;
                totalDeleted += result.deletedCount;
            }

            toast({ title: "Channel cleared successfully.", description: `Deleted ${totalDeleted} messages.` });
            setClearDialogOpen(false);
            setClearConfirmation("");
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsClearing(false);
        }
    };

    const getChannelIcon = (name: string, type: string, emoji?: string) => {
        // If channel has a custom emoji set by admin, use it
        if (emoji) {
            return <span className="text-xl leading-none shrink-0 w-6 text-center">{emoji}</span>;
        }

        const lowerName = name.toLowerCase();
        if (type === "money_request") return <Hash className="h-6 w-6 text-[#5C5C5C]" />;
        if (type === "announcement") return <Megaphone className="h-6 w-6 text-amber-600" />;

        if (lowerName.includes("dev")) return <Laptop className="h-6 w-6 text-blue-600" />;
        if (lowerName.includes("trading") || lowerName.includes("education")) return <BookOpen className="h-6 w-6 text-orange-600" />;
        if (lowerName.includes("duolingo")) return <Languages className="h-6 w-6 text-green-600" />;
        if (lowerName.includes("general")) return <Home className="h-6 w-6 text-slate-600" />;

        return <Hash className="h-6 w-6 text-[#5C5C5C]" />;
    };

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-16 items-center gap-3 border-b border-[#E2D7C9] bg-[#F4E9DD] px-6 shrink-0 shadow-sm">
                {getChannelIcon(channel.name, channel.type || "", (channel as any).emoji)}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                        <h2 className="font-bold text-lg text-black truncate">{channel.name}</h2>
                        {isAnnouncement && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-600 border border-amber-500/20">
                                <Megaphone className="h-3.5 w-3.5" />
                                Broadcast
                            </span>
                        )}
                        {isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-bold text-destructive border border-destructive/20">
                                <Lock className="h-3.5 w-3.5" />
                                Locked
                            </span>
                        )}
                    </div>
                    {channel.description && (
                        <p className="text-xs text-[#6A6A6A] hidden sm:block truncate">
                            {channel.description}
                        </p>
                    )}
                </div>

                {/* User channel controls */}
                <div className="flex items-center gap-1">
                    <ChannelPushToggle channelId={channelId} />
                    {isAdmin && (
                        <>
                            <ChannelMuteButton channelId={channelId} />
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                                        <MoreVertical className="h-6 w-6" />
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
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setClearDialogOpen(true)}
                                        className="gap-2 text-destructive focus:bg-destructive focus:text-destructive-foreground"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Clear Channel
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}
                </div>
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
                        <TypingIndicator typingUsers={typingUsers} />
                        <MessageInput
                            channelId={channelId}
                            isLocked={isLocked}
                            isAdmin={isAdmin}
                            isAnnouncement={isAnnouncement}
                            onTypingUsersChange={handleTypingUsersChange}
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

            {/* Clear Channel Dialog */}
            <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
                <AlertDialogContent className="sm:max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Clear Channel
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete all messages in <strong>#{channel.name}</strong>.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-3 py-2">
                        <Label htmlFor="clear-confirm" className="text-xs font-medium">
                            Type <strong>CLEAR</strong> or <strong>{channel.name}</strong> to confirm
                        </Label>
                        <Input
                            id="clear-confirm"
                            value={clearConfirmation}
                            onChange={(e) => setClearConfirmation(e.target.value)}
                            placeholder={`CLEAR`}
                            disabled={isClearing}
                        />
                    </div>
                    <AlertDialogFooter className="gap-2 mt-2">
                        <AlertDialogCancel disabled={isClearing} onClick={() => setClearDialogOpen(false)}>Cancel</AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={handleClearChannel}
                            disabled={isClearing || (clearConfirmation !== "CLEAR" && clearConfirmation !== channel.name)}
                            className="gap-1"
                        >
                            {isClearing ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Clearing...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Clear Channel
                                </>
                            )}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
