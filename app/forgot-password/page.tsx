/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { ImmersiveAuthShell } from "@/components/auth/immersive-auth-shell";
import { Loader2, TriangleAlert, ShieldCheck, KeyRound, CheckCircle2, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

type Step = "username" | "2fa" | "new_password" | "success";

export default function ForgotPasswordPage() {

    const [step, setStep] = useState<Step>("username");
    const [username, setUsername] = useState("");
    const [userId, setUserId] = useState<Id<"users"> | null>(null);
    const [code, setCode] = useState("");
    const [resetToken, setResetToken] = useState(""); // One-time token from server
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    const startReset = useMutation(api.security.startPasswordReset);
    const verifyFactor = useMutation(api.security.verifyResetSecondFactor);
    const finalizeReset = useMutation(api.security.finalizePasswordReset);

    const onStartReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setPending(true);
        setError("");
        try {
            const res = await startReset({ username });
            if (res.status === "ready" && res.userId) {
                setUserId(res.userId);
                setStep("2fa");
            } else {
                // Generic response to prevent enumeration
                setError("If this account exists and has 2FA enabled, you will be able to reset. Please check your username.");
            }
        } catch (err: any) {
            setError(err.message || "Something went wrong.");
        } finally {
            setPending(false);
        }
    };

    const onVerifyFactor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        setPending(true);
        setError("");
        try {
            const { resetToken } = await verifyFactor({ userId, code });
            setResetToken(resetToken);
            setStep("new_password");
        } catch (err: any) {
            setError(err.message || "Invalid security code.");
        } finally {
            setPending(false);
        }
    };

    const onFinalizeReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setPending(true);
        setError("");
        try {
            await finalizeReset({ resetToken, newPassword });
            setStep("success");
        } catch (err: any) {
            setError(err.message || "Failed to update password.");
        } finally {
            setPending(false);
        }
    };

    return (
        <ImmersiveAuthShell heading="Reset Password">
            <div className="w-full space-y-6">
                {!!error && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 text-red-500 text-sm">
                        <TriangleAlert className="size-4 shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {step === "username" && (
                    <form onSubmit={onStartReset} className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Username</Label>
                            <Input
                                disabled={pending}
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your username"
                                required
                                className="bg-white/[0.04] border-white/[0.08] text-white"
                            />
                        </div>
                        <Button disabled={pending} type="submit" className="w-full bg-blue-600 hover:bg-blue-500">
                            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Continue
                        </Button>
                        <div className="text-center">
                            <Link href="/sign-in" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center justify-center gap-1">
                                <ArrowLeft className="size-3" /> Back to Sign In
                            </Link>
                        </div>
                    </form>
                )}

                {step === "2fa" && (
                    <form onSubmit={onVerifyFactor} className="space-y-4">
                        <div className="text-center space-y-2">
                            <ShieldCheck className="mx-auto size-8 text-blue-500" />
                            <h3 className="text-white font-medium">Verify Identity</h3>
                            <p className="text-xs text-zinc-400">Enter your Authenticator code or a backup code.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Security Code</Label>
                            <Input
                                disabled={pending}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="000000 or BACK-UPCD"
                                required
                                className="bg-white/[0.04] border-white/[0.08] text-white text-center font-mono tracking-widest"
                            />
                        </div>
                        <Button disabled={pending} type="submit" className="w-full bg-blue-600 hover:bg-blue-500">
                            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Verify & Continue
                        </Button>
                    </form>
                )}

                {step === "new_password" && (
                    <form onSubmit={onFinalizeReset} className="space-y-4">
                        <div className="text-center space-y-2">
                            <KeyRound className="mx-auto size-8 text-blue-500" />
                            <h3 className="text-white font-medium">Create New Password</h3>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">New Password</Label>
                            <Input
                                disabled={pending}
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                className="bg-white/[0.04] border-white/[0.08] text-white"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Confirm Password</Label>
                            <Input
                                disabled={pending}
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="bg-white/[0.04] border-white/[0.08] text-white"
                            />
                        </div>
                        <Button disabled={pending} type="submit" className="w-full bg-blue-600 hover:bg-blue-500">
                            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Update Password
                        </Button>
                    </form>
                )}

                {step === "success" && (
                    <div className="text-center space-y-6">
                        <CheckCircle2 className="mx-auto size-12 text-green-500" />
                        <div className="space-y-2">
                            <h3 className="text-white font-bold text-lg">Password Reset Successful</h3>
                            <p className="text-sm text-zinc-400">Your password has been updated and all other sessions have been logged out.</p>
                        </div>
                        <Button asChild className="w-full bg-blue-600 hover:bg-blue-500">
                            <Link href="/sign-in">Sign In Now</Link>
                        </Button>
                    </div>
                )}
            </div>
        </ImmersiveAuthShell>
    );
}
