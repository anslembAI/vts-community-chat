"use client";

import { useEffect, useState } from "react";
import { Calendar } from "lucide-react";

export function HeaderDateTime() {
    const [time, setTime] = useState<Date>(new Date());

    useEffect(() => {
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

    const formatDate = time.toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
    }).toUpperCase();

    const formatTime = time.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).toUpperCase();

    return (
        <div className="ml-2 lg:ml-3 flex items-center gap-2 shrink-0">
            <Calendar className="h-[14px] w-[14px] text-black/55 sm:h-4 sm:w-4" strokeWidth={2.1} />
            <div className="flex items-center text-[11px] font-medium uppercase tracking-[0.06em] text-black/70 tabular-nums sm:text-sm">
                <span className="hidden sm:inline">
                    {formatDate}
                    <span className="mx-1.5 font-bold text-black/30">·</span>
                </span>
                <span>{formatTime}</span>
            </div>
        </div>
    );
}
