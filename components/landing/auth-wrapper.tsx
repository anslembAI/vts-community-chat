"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TriangleAlert, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AuthWrapperProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    defaultTab?: "signIn" | "signUp";
}

export function AuthWrapper({ isOpen, onOpenChange, defaultTab = "signIn" }: AuthWrapperProps) {
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
                // On success, hook might redirect or we close
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
            <DialogContent className="sm:max-w-md bg-background border-border">
                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="signIn">Sign In</TabsTrigger>
                        <TabsTrigger value="signUp">Sign Up</TabsTrigger>
                    </TabsList>

                    {/* Error display */}
                    {!!error && (
                        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
                            <TriangleAlert className="size-4" />
                            <p>{error}</p>
                        </div>
                    )}

                    <TabsContent value="signIn">
                        <form onSubmit={(e) => handleAuth(e, "signIn")} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    disabled={pending}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username"
                                    required
                                    className="bg-muted/50"
                                />
                                <Input
                                    disabled={pending}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    type="password"
                                    required
                                    className="bg-muted/50"
                                />
                            </div>
                            <Button className="w-full" type="submit" disabled={pending}>
                                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign In
                            </Button>
                        </form>
                    </TabsContent>

                    <TabsContent value="signUp">
                        <form onSubmit={(e) => handleAuth(e, "signUp")} className="space-y-4">
                            <div className="space-y-2">
                                <Input
                                    disabled={pending}
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Username"
                                    required
                                    className="bg-muted/50"
                                />
                                <Input
                                    disabled={pending}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    type="password"
                                    required
                                    minLength={8}
                                    className="bg-muted/50"
                                />
                                <Input
                                    disabled={pending}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm Password"
                                    type="password"
                                    required
                                    minLength={8}
                                    className="bg-muted/50"
                                />
                            </div>
                            <Button className="w-full" type="submit" disabled={pending}>
                                {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Account
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
