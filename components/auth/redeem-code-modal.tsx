"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2 } from "lucide-react";

interface RedeemCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RedeemCodeModal({ isOpen, onClose }: RedeemCodeModalProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const redeem = useMutation(api.access.redeemChannelAccessCode);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || !sessionId) return;

        setIsLoading(true);
        try {
            const result = await redeem({
                sessionId,
                code: code.trim().toUpperCase(),
            });

            if (result.success) {
                toast({
                    title: "Access Granted",
                    description: "You now have access to the channel.",
                });
                setCode("");
                onClose();
            } else {
                toast({
                    title: "Invalid Code",
                    description: result.error || "Please check the code and try again.",
                    variant: "destructive",
                });
            }
        } catch {
            toast({
                title: "Error",
                description: "Something went wrong. Please try again later.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="rounded-[1.75rem] border border-white/40 bg-[rgba(255,255,255,0.84)] shadow-[0_25px_60px_rgba(98,113,126,0.22)] backdrop-blur-xl sm:max-w-md">
                <DialogHeader className="flex flex-col items-center space-y-4 pt-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/50 bg-[rgba(215,196,171,0.28)] shadow-inner">
                        <Lock className="h-8 w-8 text-[#8a7258]" />
                    </div>
                    <div className="text-center">
                        <DialogTitle className="text-2xl font-bold text-[#2c3034]">
                            Locked Channel
                        </DialogTitle>
                        <DialogDescription className="mt-2 text-black/55">
                            Enter the 8-digit access code provided by an administrator to unlock this channel.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="px-1">
                        <Input
                            placeholder="Enter 8-digit code (e.g. ABC123DEF)"
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            className="h-14 rounded-xl border-white/50 bg-white/55 text-center font-mono text-lg tracking-widest shadow-sm focus-visible:ring-[#d7c4ab]"
                            maxLength={15} // A bit extra just in case
                            autoComplete="off"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="rounded-xl border border-white/35 bg-white/45 p-4">
                        <p className="text-center text-xs leading-relaxed text-black/45">
                            Access codes are unique to your account and one-time use.
                            If you don&apos;t have a code, please contact a moderator or administrator.
                        </p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="h-12 flex-1 rounded-xl text-black/50 hover:bg-white/55"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="h-12 flex-1 rounded-xl bg-[#E07A5F] font-semibold text-white shadow-lg shadow-[#E07A5F]/20 hover:bg-[#D06A4F]"
                            disabled={isLoading || !code.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Validating...
                                </>
                            ) : (
                                "Unlock Channel"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
