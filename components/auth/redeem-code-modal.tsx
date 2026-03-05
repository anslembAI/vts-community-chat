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
        } catch (error) {
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
            <DialogContent className="sm:max-w-md bg-[#F4E9DD] border-[#E0D6C8] shadow-2xl rounded-2xl">
                <DialogHeader className="flex flex-col items-center space-y-4 pt-4">
                    <div className="h-16 w-16 bg-[#E2D6C8] rounded-full flex items-center justify-center shadow-inner">
                        <Lock className="h-8 w-8 text-[#5C544B]" />
                    </div>
                    <div className="text-center">
                        <DialogTitle className="text-2xl font-bold text-[#2A2A2A]">
                            Locked Channel
                        </DialogTitle>
                        <DialogDescription className="text-[#5C544B] mt-2">
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
                            className="bg-white/50 border-[#E0D6C8] h-14 text-lg text-center font-mono tracking-widest focus-visible:ring-[#CC9D66] rounded-xl shadow-sm"
                            maxLength={15} // A bit extra just in case
                            autoComplete="off"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="bg-[#E2D6C8]/30 p-4 rounded-xl border border-[#E2D6C8]/50">
                        <p className="text-xs text-[#5C544B] text-center leading-relaxed">
                            Access codes are unique to your account and one-time use.
                            If you don't have a code, please contact a moderator or administrator.
                        </p>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl text-[#5C544B] hover:bg-[#EADFD2]"
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 h-12 bg-[#CC9D66] hover:bg-[#B38955] text-white font-semibold rounded-xl shadow-lg shadow-[#CC9D66]/20"
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
