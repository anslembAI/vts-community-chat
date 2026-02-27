"use client";

import { useState, useEffect } from "react";

export function SidebarTime() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) {
        return <div className="ml-2 h-8 w-24 animate-pulse bg-black/5 rounded-md" />;
    }

    const formatDate = time.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    const formatTime = time.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    return (
        <div className="flex flex-col ml-1 sm:ml-2 border-l border-black/10 pl-2 sm:pl-3 py-0.5 justify-center">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-black/50 leading-tight">
                {formatDate}
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-black/70 leading-tight">
                {formatTime}
            </span>
        </div>
    );
}
