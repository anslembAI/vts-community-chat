"use client";

import { useEffect, useState } from "react";

interface ImmersiveAuthShellProps {
    children: React.ReactNode;
    heading?: string;
}

export function ImmersiveAuthShell({ children, heading = "Sign In" }: ImmersiveAuthShellProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-zinc-950 selection:bg-blue-500/30">

            {/* ========== IMMERSIVE BACKGROUND ========== */}

            {/* Base deep gradient */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />

            {/* Grid texture */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Radial glow behind card */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.08)_0%,rgba(139,92,246,0.04)_40%,transparent_70%)] pointer-events-none" />

            {/* Animated glow orbs — subtle slow movement */}
            <div
                className={`absolute top-[20%] left-[15%] w-[400px] h-[400px] rounded-full bg-blue-500/[0.06] blur-[100px] transition-all duration-[3000ms] ${mounted ? "translate-x-8 translate-y-4 scale-110" : ""
                    }`}
                style={{ animation: "float1 12s ease-in-out infinite" }}
            />
            <div
                className={`absolute bottom-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-violet-500/[0.06] blur-[100px] transition-all duration-[3000ms] ${mounted ? "-translate-x-6 -translate-y-8 scale-105" : ""
                    }`}
                style={{ animation: "float2 15s ease-in-out infinite" }}
            />
            <div
                className="absolute top-[60%] left-[60%] w-[250px] h-[250px] rounded-full bg-cyan-500/[0.04] blur-[80px]"
                style={{ animation: "float3 18s ease-in-out infinite" }}
            />

            {/* Cinematic vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)] pointer-events-none" />

            {/* Subtle noise grain overlay */}
            <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />


            {/* ========== AUTH CARD ========== */}
            <div
                className={`relative z-10 w-full max-w-[420px] mx-4 transition-all duration-700 ease-out ${mounted
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-6"
                    }`}
            >
                {/* Card glass container */}
                <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden">

                    {/* Top shimmer line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    {/* Inner content */}
                    <div className="px-8 py-10 sm:px-10 sm:py-12">

                        {/* Branding */}
                        <div className="text-center mb-8 space-y-3">
                            {/* Logo mark */}
                            <div className="flex justify-center mb-4">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                        </svg>
                                    </div>
                                    {/* Glow behind logo */}
                                    <div className="absolute inset-0 w-12 h-12 rounded-xl bg-blue-500/30 blur-xl -z-10" />
                                </div>
                            </div>

                            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-[0.2em]">
                                Welcome to
                            </p>
                            <h1 className="text-2xl sm:text-[26px] font-bold tracking-tight text-white leading-tight">
                                VTS Chat Community
                            </h1>
                            <p className="text-sm text-zinc-400 font-light">
                                Secure. Structured. Seamless collaboration.
                            </p>
                        </div>

                        {/* Auth form slot */}
                        {children}
                    </div>

                    {/* Bottom subtle border */}
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
                </div>
            </div>


            {/* ========== KEYFRAME ANIMATIONS ========== */}
            <style jsx>{`
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -20px) scale(1.05); }
                    66% { transform: translate(-20px, 15px) scale(0.95); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(-25px, 20px) scale(1.08); }
                    66% { transform: translate(15px, -25px) scale(0.92); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(20px, -30px) scale(1.1); }
                }
            `}</style>
        </div>
    );
}
