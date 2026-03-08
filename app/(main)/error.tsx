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
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#F4E9DD] p-6 text-center">
            <div className="mb-6 rounded-full bg-red-100 p-4">
                <AlertCircle className="h-12 w-12 text-red-600" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Unexpected Error</h1>
            <p className="text-gray-600 max-w-md mb-8">
                The application encountered a critical error. We've been notified and are working on it.
                {error.digest && <span className="block mt-2 text-xs opacity-50 font-mono">ID: {error.digest}</span>}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    onClick={() => reset()}
                    className="bg-[#E07A5F] hover:bg-[#D06A4F] text-white gap-2 h-11 px-6 rounded-xl shadow-lg"
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
                    className="border-[#E0D6C8] hover:bg-white/50 gap-2 h-11 px-6 rounded-xl"
                >
                    <Home className="h-4 w-4" />
                    Go to Home
                </Button>
            </div>

            <p className="mt-12 text-xs text-stone-400">
                If the problem persists, try clearing your browser cache or re-logging.
            </p>
        </div>
    );
}
