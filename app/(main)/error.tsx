"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MainError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        // Log to a service if you have one
        console.error("[MainError Boundary]", error);
    }, [error]);

    return (
        <div className="flex h-screen w-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(200,226,244,0.95),transparent_38%),radial-gradient(circle_at_bottom,rgba(247,214,202,0.7),transparent_30%),linear-gradient(135deg,#eaf1f5_0%,#f4f1ea_55%,#f7f5f1_100%)] p-6 text-center">
            <div className="vts-panel max-w-xl rounded-[2rem] px-8 py-10">
            <div className="mb-6 inline-flex rounded-full border border-red-200/70 bg-red-100/75 p-4 shadow-sm">
                <AlertCircle className="h-12 w-12 text-red-600" />
            </div>

            <h1 className="vts-display mb-2 text-4xl leading-none text-[#2c3034]">Unexpected Error</h1>
            <p className="mb-8 max-w-md text-sm leading-relaxed text-black/55">
                The application encountered a critical error. We&apos;ve been notified and are working on it.
                {error.digest && <span className="block mt-2 text-xs opacity-50 font-mono">ID: {error.digest}</span>}
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                    onClick={() => reset()}
                    className="h-11 gap-2 rounded-xl bg-[#E07A5F] px-6 text-white shadow-lg shadow-[#E07A5F]/20 hover:bg-[#D06A4F]"
                >
                    <RefreshCcw className="h-4 w-4" />
                    Try Again
                </Button>

                <Button
                    variant="outline"
                    onClick={() => {
                        router.push("/channel/general");
                        // Sometimes navigation doesn't clear the error state, so we force a refresh
                        setTimeout(() => window.location.reload(), 100);
                    }}
                    className="h-11 gap-2 rounded-xl border-white/40 bg-white/35 px-6 hover:bg-white/55"
                >
                    <Home className="h-4 w-4" />
                    Go to Home
                </Button>
            </div>

            <p className="mt-12 text-xs text-black/35">
                If the problem persists, try clearing your browser cache or re-logging.
            </p>
            </div>
        </div>
    );
}
