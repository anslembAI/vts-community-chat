"use client";

import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { TriangleAlert, Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

export const SignUpCard = () => {
    const { signUp } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
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
            const msg = err.message || "Failed to create account";
            if (msg.includes("User already exists")) {
                setError("Username already taken");
            } else {
                // Try to extract the actual error message from the verbose Convex error
                const match = msg.match(/Uncaught Error: (.+?) at handler/);
                setError(match ? match[1] : msg);
            }
        } finally {
            setPending(false);
        }
    };

    return (
        <div className="w-full space-y-6">
            {!!error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <TriangleAlert className="size-4 shrink-0" />
                    <p>{error}</p>
                </div>
            )}
            <form onSubmit={onSignUp} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Username
                    </label>
                    <input
                        disabled={pending}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
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
                            placeholder="Minimum 8 characters"
                            type={showPassword ? "text" : "password"}
                            required
                            minLength={8}
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
                <div className="space-y-2">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        Confirm Password
                    </label>
                    <input
                        disabled={pending}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={8}
                        className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all duration-300 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] text-sm"
                    />
                </div>
                <button
                    type="submit"
                    disabled={pending}
                    className="w-full h-11 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    {pending ? "Creating account..." : "Create Account"}
                </button>
            </form>
            <div className="text-center">
                <span className="text-xs text-zinc-500">
                    Already have an account?{" "}
                    <Link
                        href="/sign-in"
                        className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                        Sign in
                    </Link>
                </span>
            </div>
        </div>
    );
};
