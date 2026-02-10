
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";

export const SignUpCard = () => {
    const { signUp } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    const onSignUp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        try {
            setError("");
            setPending(true);

            await signUp(username, password);

        } catch (err: any) {
            console.error(err);
            if (err.message) {
                setError(err.message);
            } else {
                setError("Failed to create account");
            }
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md border border-gray-200">
            <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>
            {!!error && (
                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
                    <TriangleAlert className="size-4" />
                    <p>{error}</p>
                </div>
            )}
            <form onSubmit={onSignUp} className="space-y-4">
                <div>
                    <Input
                        disabled={pending}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        type="text"
                        required
                    />
                </div>
                <div>
                    <Input
                        disabled={pending}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        type="password"
                        required
                        minLength={8}
                    />
                </div>
                <div>
                    <Input
                        disabled={pending}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        type="password"
                        required
                        minLength={8}
                    />
                </div>
                <Button className="w-full" type="submit" size="lg" disabled={pending}>
                    Continue
                </Button>
            </form>
            <div className="mt-4 text-xs text-muted-foreground text-center">
                Already have an account? <Link href="/sign-in" className="text-sky-700 hover:underline cursor-pointer">Sign in</Link>
            </div>
        </div>
    );
};
