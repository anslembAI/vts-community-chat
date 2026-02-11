"use client";

import { useEffect, useState } from "react";

export function BackgroundEffects() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-zinc-950">
            {/* Base deep background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.12),transparent)]" />

            {/* Grid texture */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Floating Orbs - Subtle Movement */}
            <div
                className={`absolute top-[20%] left-[15%] w-[500px] h-[500px] rounded-full bg-blue-600/[0.04] blur-[100px] transition-transform duration-[3000ms] ${mounted ? "translate-x-8 translate-y-4 scale-105" : ""}`}
                style={{ animation: "float1 18s ease-in-out infinite" }}
            />
            <div
                className={`absolute bottom-[15%] right-[10%] w-[450px] h-[450px] rounded-full bg-violet-600/[0.04] blur-[100px] transition-transform duration-[3000ms] ${mounted ? "-translate-x-6 -translate-y-8 scale-110" : ""}`}
                style={{ animation: "float2 20s ease-in-out infinite" }}
            />
            <div
                className="absolute top-[60%] left-[50%] w-[300px] h-[300px] rounded-full bg-indigo-500/[0.03] blur-[80px]"
                style={{ animation: "float3 25s ease-in-out infinite" }}
            />

            {/* Vignette for focus */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(9,9,11,0.6)_100%)]" />

            {/* Subtle Noise Texture */}
            <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

            <style jsx>{`
                @keyframes float1 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(40px, -30px) scale(1.05); }
                    66% { transform: translate(-20px, 20px) scale(0.95); }
                }
                @keyframes float2 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(-30px, 30px) scale(1.05); }
                    66% { transform: translate(20px, -20px) scale(0.95); }
                }
                @keyframes float3 {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(30px, -30px) scale(1.1); }
                }
            `}</style>
        </div>
    );
}
