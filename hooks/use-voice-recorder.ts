"use client";

import { useCallback, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export interface VoiceRecorderState {
    isRecording: boolean;
    duration: number;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<{ blob: Blob; durationMs: number; mimeType: string } | null>;
    cancelRecording: () => void;
}

export function useVoiceRecorder(): VoiceRecorderState {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const { toast } = useToast();

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<BlobPart[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const cleanup = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        setIsRecording(false);
        setDuration(0);
        chunksRef.current = [];
        mediaRecorderRef.current = null;
    }, []);

    const stopRecording = useCallback(async (): Promise<{ blob: Blob; durationMs: number; mimeType: string } | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
                cleanup();
                resolve(null);
                return;
            }

            const mimeType = mediaRecorderRef.current.mimeType || "audio/webm";

            mediaRecorderRef.current.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                const currentDurationMs = duration * 1000 || 1000;

                cleanup();
                resolve({ blob, durationMs: currentDurationMs, mimeType });
            };

            mediaRecorderRef.current.stop();
        });
    }, [cleanup, duration]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const types = [
                "audio/webm;codecs=opus",
                "audio/webm",
                "audio/ogg;codecs=opus",
                "audio/mp4",
                "audio/mpeg",
            ];

            let mimeType = "audio/webm";
            for (const type of types) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setDuration(0);

            timerRef.current = setInterval(() => {
                setDuration((prev) => {
                    const next = prev + 1;
                    if (next >= 300) {
                        stopRecording().catch(console.error);
                    }
                    return next;
                });
            }, 1000);
        } catch (error) {
            console.error("Mic access denied", error);
            toast({
                title: "Microphone Access Denied",
                description: "Please allow microphone access in your browser settings to record voice messages.",
                variant: "destructive",
            });
            cleanup();
        }
    }, [cleanup, stopRecording, toast]);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }
        cleanup();
    }, [cleanup]);

    return {
        isRecording,
        duration,
        startRecording,
        stopRecording,
        cancelRecording,
    };
}
