"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { ShieldCheck, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Setup2FAPage() {
    const { sessionId, isAuthenticated } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [step, setStep] = useState<"start" | "verify" | "backup">("start");
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
    const [manualSecret, setManualSecret] = useState<string>("");
    const [token, setToken] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState("");
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);

    const startSetup = useMutation(api.security.startTwoFactorSetup);
    const confirmSetup = useMutation(api.security.confirmTwoFactorSetup);
    const userState = useQuery(api.security.getTwoFactorState, isAuthenticated ? { sessionId: sessionId! } : "skip");

    useEffect(() => {
        if (userState?.twoFactorEnabled) {
            router.replace("/dashboard");
        }
    }, [userState, router]);

    const handleStartSetup = async () => {
        try {
            const { otpauth, secret } = await startSetup({ sessionId: sessionId! });
            const qrUrl = await QRCode.toDataURL(otpauth);
            setQrCodeUrl(qrUrl);
            setManualSecret(secret);
            setStep("verify");
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Setup failed",
                description: err.message || "Could not start 2FA setup.",
            });
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (token.length !== 6) return;

        setIsVerifying(true);
        setError("");
        try {
            const { backupCodes } = await confirmSetup({ sessionId: sessionId!, token });
            setBackupCodes(backupCodes);
            setStep("backup");
        } catch (err: any) {
            setError(err.message || "Invalid code. Please try again.");
            setIsVerifying(false);
        }
    };

    const handleDone = () => {
        router.refresh(); // Invalidate state
        router.push("/dashboard");
    };

    const copyBackupCodes = () => {
        navigator.clipboard.writeText(backupCodes.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (userState === undefined) {
        return (
            <div className="flex flex-1 items-center justify-center p-4">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 items-center justify-center p-4 bg-gradient-to-b from-[#EFE5D8] to-[#E9DFD2]">
            <Card className="w-full max-w-md shadow-xl border-[#E2D7C9] bg-[#F4E9DD]">
                {step === "start" && (
                    <>
                        <CardHeader className="text-center">
                            <div className="mx-auto w-12 h-12 bg-[#F59E0B]/20 rounded-full flex items-center justify-center mb-2">
                                <ShieldCheck className="h-6 w-6 text-[#D97706]" />
                            </div>
                            <CardTitle className="text-2xl font-bold text-[#4A3728]">Account Security</CardTitle>
                            <CardDescription>
                                Mandatory Two-Factor Authentication (2FA) is required to access the VTS Community Chat.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-[#6B5A4E]">
                                2FA adds an extra layer of security to your account. You'll need it to reset your password or perform sensitive actions.
                            </p>
                            <div className="bg-[#EADFD2] p-3 rounded-lg border border-[#DACFBF]">
                                <h4 className="font-semibold text-sm mb-1 text-[#4A3728]">How it works:</h4>
                                <ol className="text-xs list-decimal list-inside space-y-1 text-[#6B5A4E]">
                                    <li>Scan a QR code with your Authenticator app.</li>
                                    <li>Enter the 6-digit confirmation code.</li>
                                    <li>Store your emergency backup codes safely.</li>
                                </ol>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={handleStartSetup}
                                className="w-full bg-[#D97706] hover:bg-[#B45309] text-white"
                            >
                                Start Setup
                            </Button>
                        </CardFooter>
                    </>
                )}

                {step === "verify" && (
                    <>
                        <CardHeader>
                            <CardTitle className="text-xl">Scan QR Code</CardTitle>
                            <CardDescription>
                                Use your authenticator app (e.g., Google or Microsoft Authenticator) to scan the code below.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 flex flex-col items-center">
                            {qrCodeUrl ? (
                                <div className="p-4 bg-white rounded-xl shadow-inner border-4 border-white">
                                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
                                </div>
                            ) : (
                                <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-xl" />
                            )}

                            <div className="w-full space-y-2">
                                <Label className="text-xs text-muted-foreground uppercase tracking-widest">Manual Entry Key</Label>
                                <div className="flex gap-2">
                                    <Input value={manualSecret} readOnly className="font-mono text-center bg-[#F3E8DC] border-[#E0D6C8]" />
                                    <Button size="icon" variant="outline" onClick={() => {
                                        navigator.clipboard.writeText(manualSecret);
                                        toast({ description: "Secret copied to clipboard" });
                                    }}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <form onSubmit={handleVerify} className="w-full space-y-4 pt-4 border-t border-[#E0D6C8]">
                                <div className="space-y-2">
                                    <Label htmlFor="token">Enter 6-digit code</Label>
                                    <Input
                                        id="token"
                                        placeholder="000000"
                                        maxLength={6}
                                        value={token}
                                        onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                                        className="text-center text-2xl tracking-[0.5em] font-bold h-12 border-[#E0D6C8]"
                                        autoComplete="one-time-code"
                                    />
                                </div>
                                {error && (
                                    <div className="text-red-600 text-xs flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {error}
                                    </div>
                                )}
                                <Button
                                    type="submit"
                                    className="w-full bg-[#D97706] hover:bg-[#B45309]"
                                    disabled={token.length !== 6 || isVerifying}
                                >
                                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & Enable"}
                                </Button>
                            </form>
                        </CardContent>
                    </>
                )}

                {step === "backup" && (
                    <>
                        <CardHeader>
                            <CardTitle className="text-xl">Save Backup Codes</CardTitle>
                            <CardDescription className="text-red-700 font-medium bg-red-100 p-2 rounded border border-red-200">
                                These codes are the ONLY way to access your account if you lose your phone.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 bg-[#EADFD2] p-4 rounded-lg font-mono text-sm border border-[#DACFBF]">
                                {backupCodes.map((code, i) => (
                                    <div key={i} className="text-[#4A3728]">{code}</div>
                                ))}
                            </div>
                            <Button
                                variant="outline"
                                className="w-full border-[#D97706] text-[#D97706] hover:bg-[#D97706] hover:text-white"
                                onClick={copyBackupCodes}
                            >
                                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                {copied ? "Copied!" : "Copy all codes"}
                            </Button>
                        </CardContent>
                        <CardFooter>
                            <Button
                                onClick={handleDone}
                                className="w-full bg-[#D97706] hover:bg-[#B45309] text-white"
                            >
                                I've saved these codes, finish setup
                            </Button>
                        </CardFooter>
                    </>
                )}
            </Card>
        </div>
    );
}
