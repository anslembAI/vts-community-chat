"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { MessageList } from "@/components/chat/message-list";
import { MessageInput } from "@/components/chat/message-input";
import { useParams } from "next/navigation";
import {
    Hash,
    Loader2,
    Lock,
    Unlock,
    ShieldAlert,
    MoreVertical,
} from "lucide-react";
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
    const unlockChannel = useMutation(api.channels.unlockChannel);

    const [lockReason, setLockReason] = useState("");
    const [lockDialogOpen, setLockDialogOpen] = useState(false);

    const isAdmin = currentUser?.isAdmin ?? false;
    const isLocked = channel?.locked ?? false;

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

    return (
        <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-14 items-center gap-2 border-b bg-background px-4">
                <Hash className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="font-semibold truncate">{channel.name}</h2>
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
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
                )}
            </div>

            {/* Lock Banner */}
            {isLocked && !isAdmin && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-destructive/5 border-b border-destructive/10">
                    <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-xs text-destructive/80">
                        This channel is locked by an admin.
                        {channel.lockReason && (
                            <span className="ml-1 font-medium">Reason: {channel.lockReason}</span>
                        )}
                    </p>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <MessageList channelId={channelId} />
            </div>

            {/* Input */}
            <MessageInput
                channelId={channelId}
                isLocked={isLocked}
                isAdmin={isAdmin}
            />

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
        </div>
    );
}
