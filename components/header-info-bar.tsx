"use client";

import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Id } from "@/convex/_generated/dataModel";
import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function CommunityStats() {
    const { sessionId } = useAuth();
    const stats = useQuery(api.stats.getCommunityStats, sessionId ? { sessionId } : "skip");

    if (!stats) {
        return (
            <div className="flex items-center gap-4 text-sm font-medium text-black/70 animate-pulse">
                <Skeleton className="h-4 w-24" />
                <div className="h-4 w-[1px] bg-[#E0D6C8]"></div>
                <Skeleton className="h-4 w-32" />
                <div className="h-4 w-[1px] bg-[#E0D6C8]"></div>
                <Skeleton className="h-4 w-32" />
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3 lg:gap-4 text-xs font-semibold text-black/70 whitespace-nowrap">
            <span className="flex items-center gap-1.5" title="Total users online">
                👥 {stats.globalOnlineCount} Online
            </span>
            <div className="h-4 w-[1px] bg-[#E0D6C8] hidden lg:block"></div>
            <span className="hidden lg:flex items-center gap-1.5" title="Channels with recent activity">
                💬 {stats.activeChannelsCount} Active Channel{stats.activeChannelsCount === 1 ? '' : 's'}
            </span>
            <div className="h-4 w-[1px] bg-[#E0D6C8]"></div>
            <span className="flex items-center gap-1.5" title="Messages sent today across the community">
                📊 {stats.messagesTodayCount} Messages Today
            </span>
        </div>
    );
}

function MarketPulse() {
    // A simple mock or real fetcher for Market Pulse
    // Since we need to update without full refresh, we could just fetch a free API or simulate based on last known if no API key
    // The prompt says "A simple mock or real fetcher... NQ, ES, CL, GC... Update periodically".
    // I'll implement a static/randomized mock for visual parity if no actual trading API is available in this project's ENV
    const [quotes, setQuotes] = useState({
        NQ: { change: 0.35, up: true },
        ES: { change: 0.22, up: true },
        CL: { change: -0.12, up: false },
        GC: { change: 0.44, up: true },
    });

    useEffect(() => {
        // Mock a pulse update every 30 seconds
        const interval = setInterval(() => {
            setQuotes(prev => {
                const updated = { ...prev };
                ['NQ', 'ES', 'CL', 'GC'].forEach(sym => {
                    const jitter = (Math.random() - 0.5) * 0.1;
                    const key = sym as keyof typeof updated;
                    let newChange = prev[key].change + jitter;
                    if (newChange > 3) newChange = 3;
                    if (newChange < -3) newChange = -3;
                    updated[key] = {
                        change: parseFloat(newChange.toFixed(2)),
                        up: newChange >= 0
                    };
                });
                return updated;
            });
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex items-center gap-3 text-xs font-medium bg-black/5 rounded-lg px-3 py-1.5">
            {Object.entries(quotes).map(([sym, data]) => (
                <span key={sym} className="flex items-center gap-1 whitespace-nowrap">
                    <span className="text-[#5C5C5C] font-bold">{sym}</span>
                    <span className={data.up ? "text-green-600" : "text-red-600"}>
                        {data.up ? '▲' : '▼'} {data.change > 0 && '+'}{data.change}%
                    </span>
                </span>
            ))}
        </div>
    );
}

function CourseProgressStats({ channelId }: { channelId: Id<"channels"> }) {
    const { sessionId } = useAuth();

    const courseData = useQuery(api.course.getCourseData, { channelId });
    const userProgress = useQuery(
        api.course.getUserProgress,
        sessionId ? { sessionId, channelId } : "skip"
    );

    if (courseData === undefined || userProgress === undefined) {
        return (
            <div className="flex items-center gap-4 text-sm">
                <Skeleton className="h-6 w-48 rounded-full" />
                <Skeleton className="h-6 w-32 rounded-lg" />
            </div>
        );
    }

    const flatLessons = courseData.flatMap(mod => mod.lessons);
    const totalLessons = flatLessons.length;
    const completedLessons = userProgress?.completedLessonIds?.length || 0;
    const progressPercent = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

    const handleResume = () => {
        // Find first incomplete lesson
        const nextIncomplete = flatLessons.find(l => !userProgress?.completedLessonIds?.some(id => id === l._id));
        if (nextIncomplete) {
            const el = document.getElementById(`lesson-${nextIncomplete._id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    return (
        <div className="flex items-center gap-3 justify-between w-full">
            <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-bold text-black/80 flex border border-[#E0D6C8] bg-white px-2 py-1 rounded-md shadow-sm">
                    Course Progress: {progressPercent}% Complete
                </span>
                {progressPercent < 100 && totalLessons > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResume}
                        className="h-6 text-xs px-2 py-0 text-orange-600 hover:text-orange-700 hover:bg-orange-600/10 font-bold"
                    >
                        Resume Lesson
                    </Button>
                )}
            </div>

            <div className="hidden lg:block ml-auto">
                <MarketPulse />
            </div>
        </div>
    );
}

export function HeaderInfoBar() {
    const pathname = usePathname();
    const { sessionId } = useAuth();

    const channels = useQuery(api.channels.getChannelsWithMembership, sessionId ? { sessionId } : "skip");

    // Determine the active channel
    const channelParam = pathname?.split("/")[2];
    const activeChannel = channels?.find(c => c._id === channelParam || c.slug === channelParam);
    const channelId = activeChannel?._id;

    // Detection logic
    let isCourse = false;
    if (activeChannel) {
        if (activeChannel.type === "course") isCourse = true;
        if (activeChannel.name && activeChannel.name.toLowerCase().includes("course")) isCourse = true;
    }

    // Do not render on non-channel pages
    if (!channelId) return null;

    return (
        <div className="hidden md:flex flex-1 mx-2 lg:mx-4 max-w-3xl h-10 items-center justify-center bg-[#F7EFE6]/50 border border-[#E2D7C9] rounded-xl px-2 lg:px-4 shadow-sm transition-opacity duration-200 overflow-hidden">
            {isCourse ? (
                <CourseProgressStats channelId={channelId} />
            ) : (
                <CommunityStats />
            )}
        </div>
    );
}
