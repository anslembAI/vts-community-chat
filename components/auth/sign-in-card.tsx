"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { TriangleAlert, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export const SignInCard = () => {
    const { signIn } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);

    const onSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setPending(true);
            setError("");
            await signIn(username, password);
        } catch (err: any) {
            // Log raw error for developer debugging
            console.error("Auth Error:", err);

            // Robustly extract error info
            const rawError = (err.data ?? "") + (err.message ?? "") + String(err);

            // Check if it's the specific credential error
            if (rawError.includes("INVALID_CREDENTIALS")) {
                setError("Wrong username or password.");
            } else {
                // Fallback for ANY other error to prevent leaking server paths
                setError("Something went wrong. Please try again.");
            }
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            {!!error && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-red-500/10 text-red-500 text-sm">
                    <TriangleAlert className="size-4 shrink-0" />
                    <p>{error}</p>
                </div>
            )}
            <form onSubmit={onSignIn} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Username
                    </label>
                    <input
                        disabled={pending}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        type="text"
                        required
                        className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] text-sm"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            disabled={pending}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            type={showPassword ? "text" : "password"}
                            required
                            className="w-full h-11 px-4 pr-11 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={pending}
                    className="w-full h-11 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    {pending ? "Signing in..." : "Sign In"}
                </button>
            </form>
            <div className="text-center">
                <span className="text-xs text-zinc-500">
                    Don&apos;t have an account?{" "}
                    <Link
                        href="/sign-up"
                        className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                        Create account
                    </Link>
                </span>
            </div>
        </div>
    );
};
