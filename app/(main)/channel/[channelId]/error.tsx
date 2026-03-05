"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function ChannelError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("[ChannelError]", error);
    }, [error]);

    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="w-14 h-14 bg-destructive/10 flex items-center justify-center rounded-2xl">
                <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-black">Something went wrong</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
                There was an error loading this channel. This won&apos;t affect other parts of the app.
            </p>
            <Button
                onClick={reset}
                variant="outline"
                className="gap-2 mt-2"
            >
                <RotateCcw className="h-4 w-4" />
                Try Again
            </Button>
        </div>
    );
}
