"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Play, Pause, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VoiceMessageBubbleProps {
    storageId: Id<"_storage">;
    durationMs: number;
    channelId: Id<"channels">;
    sessionId?: string | null;
}

// Global reference to the currently playing audio element to stop it when another starts
let currentlyPlayingAudio: HTMLAudioElement | null = null;

export function VoiceMessageBubble({ storageId, durationMs, channelId, sessionId }: VoiceMessageBubbleProps) {
    // Only fetch URL if user intends to play, BUT for a reliable UI, Convex getUrl is fast
    // Actually, getUrl requires querying. We can lazy fetch when first clicked, or just fetch right away
    // Since we need to play it immediately on click, fetching on mount is typically fine.
    // The requirement says: "Do not fetch audio URLs for all messages upfront. Fetch URL on play click."

    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const duration = durationMs / 1000;

    // Use query directly if we wanted to pre-fetch, but requirement says NOT to.
    // So we'll fetch manually using a dummy fetch or by not passing arguments until requested?
    // Convex `useQuery` cannot be invoked conditionally inline, but we can pass `skip`.
    const fetchedUrl = useQuery(
        api.messages.getVoiceUrl,
        isLoading && sessionId ? { storageId, sessionId: sessionId as Id<"sessions">, channelId } : "skip"
    );

    useEffect(() => {
        if (fetchedUrl && isLoading) {
            setAudioUrl(fetchedUrl);
            setIsLoading(false);
        }
    }, [fetchedUrl, isLoading]);

    useEffect(() => {
        if (audioUrl && !audioRef.current) {
            const audio = new Audio(audioUrl);

            audio.onplay = () => {
                if (currentlyPlayingAudio && currentlyPlayingAudio !== audio) {
                    currentlyPlayingAudio.pause();
                }
                currentlyPlayingAudio = audio;
                setIsPlaying(true);
            };

            audio.onpause = () => setIsPlaying(false);
            audio.onended = () => {
                setIsPlaying(false);
                setProgress(0);
                setCurrentTime(0);
            };

            audio.ontimeupdate = () => {
                setCurrentTime(audio.currentTime);
                setProgress((audio.currentTime / duration) * 100);
            };

            audioRef.current = audio;
            audio.play().catch(console.error); // Play immediately once loaded
        }
    }, [audioUrl, duration]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                if (currentlyPlayingAudio === audioRef.current) {
                    currentlyPlayingAudio = null;
                }
                audioRef.current = null;
            }
        };
    }, []);

    const togglePlayback = () => {
        if (!audioUrl) {
            setIsLoading(true);
            return;
        }

        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(console.error);
            }
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !audioUrl) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;

        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
        setProgress(percent * 100);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="flex items-center gap-2 sm:gap-3 bg-black/5 rounded-2xl p-1.5 sm:p-2 w-full min-w-0 overflow-hidden">
            <Button
                variant="secondary"
                size="icon"
                onClick={togglePlayback}
                disabled={isLoading}
                className="h-10 w-10 shrink-0 rounded-full bg-black/10 hover:bg-black/20 text-black border-none"
            >
                {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-black/70" />
                ) : isPlaying ? (
                    <Pause className="h-5 w-5 fill-current" />
                ) : (
                    <Play className="h-5 w-5 fill-current ml-0.5" />
                )}
            </Button>

            <div className="flex-1 flex flex-col justify-center gap-1.5 min-w-0 pr-1 sm:pr-2">
                <div
                    className="h-2 w-full bg-black/10 rounded-full overflow-hidden cursor-pointer relative"
                    onClick={handleSeek}
                >
                    <div
                        className="h-full bg-black/60 rounded-full transition-all duration-100 ease-linear absolute left-0 top-0"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <div className="flex items-center justify-between text-[10px] sm:text-xs font-medium text-black/50 select-none shrink-0">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
        </div>
    );
}
