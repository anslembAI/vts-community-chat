
"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";

export const SignInCard = () => {
    const { signIn } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    const onSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setPending(true);
            setError("");

            await signIn(username, password);

        } catch (err: any) {
            console.error(err);
            if (err.message) {
                setError(err.message);
            } else {
                setError("Invalid username or password");
            }
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="w-full max-w-sm p-8 bg-white rounded-lg shadow-md border border-gray-200">
            <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
            {!!error && (
                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
                    <TriangleAlert className="size-4" />
                    <p>{error}</p>
                </div>
            )}
            <form onSubmit={onSignIn} className="space-y-4">
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
                    />
                </div>
                <Button className="w-full" type="submit" size="lg" disabled={pending}>
                    Continue
                </Button>
            </form>
            <div className="mt-4 text-xs text-muted-foreground text-center">
                Don&apos;t have an account? <Link href="/sign-up" className="text-sky-700 hover:underline cursor-pointer">Sign up</Link>
            </div>
        </div>
    );
};
