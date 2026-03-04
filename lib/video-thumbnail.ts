"use client";

/**
 * Generates a thumbnail from a video file by seeking to ~1s and capturing a canvas frame.
 * Returns a Blob (WebP/JPEG) and dimensions, or null if generation fails.
 */
export async function generateVideoThumbnail(
    file: File,
    options?: { maxWidth?: number; seekTo?: number }
): Promise<{ blob: Blob; width: number; height: number; durationMs: number } | null> {
    const maxWidth = options?.maxWidth ?? 512;

    return new Promise((resolve) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;

        const url = URL.createObjectURL(file);
        let resolved = false;

        const cleanup = () => {
            URL.revokeObjectURL(url);
            video.removeAttribute("src");
            video.load(); // Release any held resources
        };

        const fail = () => {
            if (!resolved) {
                resolved = true;
                cleanup();
                resolve(null);
            }
        };

        // Timeout fallback — if nothing happens in 8s, bail
        const timeout = setTimeout(fail, 8000);

        video.onerror = fail;

        video.onloadedmetadata = () => {
            const durationMs = Math.round(video.duration * 1000);
            // Seek to 1s or 10% of duration, whichever is smaller
            const seekTarget = options?.seekTo ?? Math.min(1, video.duration * 0.1);
            video.currentTime = Math.min(seekTarget, video.duration);
        };

        video.onseeked = () => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeout);

            try {
                const durationMs = Math.round(video.duration * 1000);
                const naturalW = video.videoWidth;
                const naturalH = video.videoHeight;

                if (!naturalW || !naturalH) {
                    cleanup();
                    resolve(null);
                    return;
                }

                const scale = Math.min(1, maxWidth / naturalW);
                const w = Math.round(naturalW * scale);
                const h = Math.round(naturalH * scale);

                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                    cleanup();
                    resolve(null);
                    return;
                }

                ctx.drawImage(video, 0, 0, w, h);

                // Prefer WebP, fall back to JPEG
                canvas.toBlob(
                    (blob) => {
                        cleanup();
                        if (blob) {
                            resolve({ blob, width: w, height: h, durationMs });
                        } else {
                            // Try JPEG fallback
                            canvas.toBlob(
                                (jpegBlob) => {
                                    resolve(jpegBlob ? { blob: jpegBlob, width: w, height: h, durationMs } : null);
                                },
                                "image/jpeg",
                                0.8
                            );
                        }
                    },
                    "image/webp",
                    0.8
                );
            } catch {
                cleanup();
                resolve(null);
            }
        };

        video.src = url;
    });
}

/**
 * Formats a duration in milliseconds to a human-readable string (e.g., "1:23").
 */
export function formatVideoDuration(ms: number): string {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
