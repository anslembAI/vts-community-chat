"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, KeyRound } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";

interface AccessCodeRedeemProps {
    channelId: Id<"channels">;
}

export function AccessCodeRedeem({ channelId }: AccessCodeRedeemProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const redeemCode = useMutation(api.access.redeemChannelAccessCode);

    // Determine if we should show this option.
    // We only show it if the user is NOT an admin and the channel is locked.
    // The parent component handles visibility mostly, but we can double check or just be a dumb component.

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || !sessionId) return;

        setIsLoading(true);
        try {
            const result = await redeemCode({
                sessionId,
                code: code.trim().toUpperCase(),
            });

            if (result.channelId === channelId) {
                toast({
                    title: "Access Granted",
                    description: "You have successfully unlocked this channel.",
                });
            } else {
                toast({
                    title: "Access Granted (Different Channel)",
                    description: "You unlocked a channel, but it wasn't this one!",
                });
            }

            setOpen(false);
            setCode("");
            // The UI should auto-update because the parent's `hasOverride` query will re-run or invalidate.
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to redeem code.";
            toast({
                variant: "destructive",
                title: "Invalid Code",
                description: msg,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    Enter Access Code
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Enter Access Code</DialogTitle>
                    <DialogDescription>
                        If an administrator gave you an access code for this channel, enter it below.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Input
                            placeholder="XXXXXXXX"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            maxLength={8}
                            className="font-mono text-center uppercase text-lg tracking-widest"
                            autoFocus
                        />
                        <p className="text-xs text-muted-foreground text-center">
                            Calculated unique access code
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading || code.length < 8}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Unlocking...
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
