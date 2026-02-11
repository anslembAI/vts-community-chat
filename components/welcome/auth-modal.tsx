"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, TriangleAlert, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence, motion } from "framer-motion";

interface AuthModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "signIn" | "signUp";
}

export function AuthModal({ isOpen, onOpenChange, defaultTab = "signIn" }: AuthModalProps) {
    const { signIn, signUp } = useAuth();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");

    // Form states
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleAuth = async (e: React.FormEvent, type: "signIn" | "signUp") => {
        e.preventDefault();
        setError("");
        setPending(true);

        try {
            if (type === "signUp") {
                if (password !== confirmPassword) {
                    throw new Error("Passwords do not match");
                }
                await signUp(username, password);
                onOpenChange(false);
            } else {
                await signIn(username, password);
                onOpenChange(false);
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setPending(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            {/* 
                We use a custom DialogContent approach or standard one with overrides 
                Backdrop blur is handled by the DialogOverlay usually, but we can customize via className
            */}
            <DialogContent
                className="sm:max-w-[400px] p-0 gap-0 overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl rounded-2xl ring-1 ring-white/5 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
            >
                <div className="block sr-only">
                    <DialogTitle>Authentication</DialogTitle>
                    <DialogDescription>Sign in or create an account to continue.</DialogDescription>
                </div>

                {/* Top Glow Line */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-20" />

                <div className="p-6 pb-2">
                    <div className="flex justify-center mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                    </div>

                    <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-black/20 p-1 mb-6 rounded-lg border border-white/5">
                            <TabsTrigger
                                value="signIn"
                                className="text-xs font-medium data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                            >
                                Sign In
                            </TabsTrigger>
                            <TabsTrigger
                                value="signUp"
                                className="text-xs font-medium data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                            >
                                Create Account
                            </TabsTrigger>
                        </TabsList>

                        <AnimatePresence mode="wait">
                            {!!error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="bg-red-500/10 border border-red-500/20 p-3 rounded-md flex items-center gap-x-2 text-xs text-red-400 mb-4"
                                >
                                    <TriangleAlert className="size-3.5 shrink-0" />
                                    <p>{error}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="min-h-[220px]">
                            <TabsContent value="signIn" className="mt-0 space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                                <form onSubmit={(e) => handleAuth(e, "signIn")} className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <Input
                                                disabled={pending}
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="Username"
                                                required
                                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 h-10 text-sm transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Input
                                                disabled={pending}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Password"
                                                type="password"
                                                required
                                                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 h-10 text-sm transition-all"
                                            />
                                            <div className="flex justify-end pt-1">
                                                <button type="button" className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
                                                    Forgot password?
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-blue-500/25 h-10 font-medium tracking-wide transition-all"
                                        type="submit"
                                        disabled={pending}
                                    >
                                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signUp" className="mt-0 space-y-4 data-[state=active]:animate-in data-[state=active]:fade-in-50 data-[state=active]:slide-in-from-bottom-2">
                                <form onSubmit={(e) => handleAuth(e, "signUp")} className="space-y-4">
                                    <div className="space-y-3">
                                        <Input
                                            disabled={pending}
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="Choose a username"
                                            required
                                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 h-10 text-sm transition-all"
                                        />
                                        <Input
                                            disabled={pending}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Password (8+ characters)"
                                            type="password"
                                            required
                                            minLength={8}
                                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 h-10 text-sm transition-all"
                                        />
                                        <Input
                                            disabled={pending}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm Password"
                                            type="password"
                                            required
                                            minLength={8}
                                            className="bg-white/5 border-white/10 text-white placeholder:text-zinc-500 focus-visible:ring-blue-500/50 focus-visible:border-blue-500/50 h-10 text-sm transition-all"
                                        />
                                    </div>
                                    <Button
                                        className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-blue-500/25 h-10 font-medium tracking-wide transition-all"
                                        type="submit"
                                        disabled={pending}
                                    >
                                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
                                    </Button>
                                </form>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* Bottom Footer Area */}
                <div className="bg-white/[0.02] border-t border-white/5 p-4 text-center">
                    <p className="text-[10px] text-zinc-500">
                        Protected by enterprise-grade security.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
