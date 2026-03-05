"use client";

import { useState } from "react";
import Image from "next/image";
import { Play, X, Download } from "lucide-react";
import { formatVideoDuration } from "@/lib/video-thumbnail";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";

interface VideoAttachmentBubbleProps {
    videoUrl: string;
    thumbUrl?: string | null;
    durationMs?: number;
    videoFormat?: string;
}

export function VideoAttachmentBubble({
    videoUrl,
    thumbUrl,
    durationMs,
    videoFormat,
}: VideoAttachmentBubbleProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Thumbnail Card */}
            <div
                className="relative rounded-lg overflow-hidden my-1 cursor-pointer group/vid max-w-[320px]"
                onClick={() => setOpen(true)}
                role="button"
                tabIndex={0}
                aria-label="Play video"
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setOpen(true);
                }}
            >
                {thumbUrl ? (
                    <Image
                        src={thumbUrl}
                        alt="Video thumbnail"
                        width={320}
                        height={180}
                        className="w-full h-auto object-cover rounded-lg transition-all duration-200 group-hover/vid:brightness-75"
                        loading="lazy"
                        unoptimized
                    />
                ) : (
                    /* Fallback placeholder when thumbnail is unavailable */
                    <div className="w-full aspect-video bg-zinc-800 rounded-lg flex items-center justify-center transition-all duration-200 group-hover/vid:bg-zinc-700">
                        <Play className="h-12 w-12 text-white/60" />
                    </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/60 text-white rounded-full p-3 shadow-lg transition-transform duration-200 group-hover/vid:scale-110">
                        <Play className="h-6 w-6 fill-white" />
                    </div>
                </div>

                {/* Duration Badge */}
                {durationMs && durationMs > 0 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] font-medium px-1.5 py-0.5 rounded pointer-events-none">
                        {formatVideoDuration(durationMs)}
                    </div>
                )}

                {/* Format Label */}
                {videoFormat && (
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded pointer-events-none">
                        {videoFormat.replace("video/", "").toUpperCase()}
                    </div>
                )}
            </div>

            {/* Video Player Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl w-[95vw] p-0 bg-black border-none overflow-hidden [&>button]:text-white [&>button]:bg-black/50 [&>button]:rounded-full [&>button]:p-1.5 [&>button]:top-3 [&>button]:right-3">
                    <div className="relative w-full flex flex-col">
                        <video
                            src={videoUrl}
                            controls
                            playsInline
                            preload="metadata"
                            autoPlay
                            className="w-full max-h-[80vh] object-contain bg-black"
                        />
                        <div className="flex items-center justify-end gap-2 px-3 py-2 bg-zinc-900">
                            <a
                                href={videoUrl}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-zinc-800"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Download
                            </a>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
