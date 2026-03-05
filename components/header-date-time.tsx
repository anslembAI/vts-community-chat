"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";

export function HeaderDateTime() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());

        const now = new Date();
        const delayToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        let interval: NodeJS.Timeout;
        const timeout = setTimeout(() => {
            setTime(new Date());
            interval = setInterval(() => {
                setTime(new Date());
            }, 60000);
        }, delayToNextMinute);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
    }, []);

    if (!time) {
        return <div className="ml-2 lg:ml-3 h-5 w-16 sm:w-32 animate-pulse bg-black/5 rounded shrink-0" />;
    }

    const formatDate = time.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    }).toUpperCase();

    const formatTime = time.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    }).toUpperCase();

    return (
        <div className="flex items-center ml-2 lg:ml-3 gap-1.5 shrink-0">
            <Calendar className="h-[14px] w-[14px] sm:h-4 sm:w-4 text-black/50" strokeWidth={2.5} />
            <div className="flex items-center text-[11px] sm:text-xs font-semibold text-black/70 tabular-nums uppercase tracking-wide">
                <span className="hidden sm:inline">
                    {formatDate}
                    <span className="mx-1.5 text-black/30 font-bold">•</span>
                </span>
                <span>{formatTime}</span>
            </div>
        </div>
    );
}
