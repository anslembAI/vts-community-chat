"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
    src: string;
    alt?: string;
    open: boolean;
    onClose: () => void;
}

export function ImageLightbox({ src, alt = "Image", open, onClose }: ImageLightboxProps) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [isLoaded, setIsLoaded] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset state when opened
    useEffect(() => {
        if (open) {
            setScale(1);
            setRotation(0);
            setPosition({ x: 0, y: 0 });
            setIsLoaded(false);
        }
    }, [open]);

    // Prevent body scroll when lightbox is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [open]);

    // Keyboard shortcuts
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "Escape":
                    onClose();
                    break;
                case "+":
                case "=":
                    e.preventDefault();
                    setScale(s => Math.min(s + 0.25, 5));
                    break;
                case "-":
                    e.preventDefault();
                    setScale(s => Math.max(s - 0.25, 0.25));
                    break;
                case "r":
                    setRotation(r => r + 90);
                    break;
                case "0":
                    setScale(1);
                    setPosition({ x: 0, y: 0 });
                    setRotation(0);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [open, onClose]);

    // Mouse wheel zoom
    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setScale(s => Math.max(0.25, Math.min(5, s + delta)));
    }, []);

    // Pan/drag handlers
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (scale <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, [scale, position]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
        });
    }, [isDragging, dragStart]);

    const handlePointerUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Touch pinch-to-zoom
    const lastTouchDistance = useRef<number | null>(null);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (lastTouchDistance.current !== null) {
                const delta = (distance - lastTouchDistance.current) * 0.005;
                setScale(s => Math.max(0.25, Math.min(5, s + delta)));
            }
            lastTouchDistance.current = distance;
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        lastTouchDistance.current = null;
    }, []);

    // Click backdrop to close
    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === containerRef.current) {
            onClose();
        }
    }, [onClose]);

    const handleDownload = useCallback(async () => {
        try {
            const response = await fetch(src);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = alt || "image";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch {
            window.open(src, "_blank");
        }
    }, [src, alt]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Image viewer"
        >
            {/* Backdrop */}
            <div
                className={cn(
                    "absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
            />

            {/* Close button */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
                <span className="text-white/70 text-sm font-medium truncate max-w-[60%]">
                    {alt}
                </span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={() => setScale(s => Math.min(s + 0.5, 5))}
                        title="Zoom in (+)"
                    >
                        <ZoomIn className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={() => {
                            setScale(s => Math.max(s - 0.5, 0.25));
                            if (scale <= 1) setPosition({ x: 0, y: 0 });
                        }}
                        title="Zoom out (-)"
                    >
                        <ZoomOut className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={() => setRotation(r => r + 90)}
                        title="Rotate (R)"
                    >
                        <RotateCw className="h-5 w-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={handleDownload}
                        title="Download"
                    >
                        <Download className="h-5 w-5" />
                    </Button>
                    <div className="w-px h-5 bg-white/20 mx-1" />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10 rounded-full"
                        onClick={onClose}
                        title="Close (Escape)"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {/* Scale indicator */}
            {scale !== 1 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white/80 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm font-mono">
                    {Math.round(scale * 100)}%
                </div>
            )}

            {/* Loading spinner */}
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center z-5">
                    <div className="w-10 h-10 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {/* Image container */}
            <div
                ref={containerRef}
                className="absolute inset-0 flex items-center justify-center overflow-hidden"
                onClick={handleBackdropClick}
                onWheel={handleWheel}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt={alt}
                    draggable={false}
                    className={cn(
                        "max-w-[95vw] max-h-[90vh] object-contain select-none transition-[opacity] duration-300",
                        isLoaded ? "opacity-100" : "opacity-0",
                        isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-default"
                    )}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                        transition: isDragging ? "none" : "transform 0.2s ease-out",
                    }}
                    onLoad={() => setIsLoaded(true)}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onDoubleClick={() => {
                        if (scale === 1) {
                            setScale(2);
                        } else {
                            setScale(1);
                            setPosition({ x: 0, y: 0 });
                        }
                    }}
                />
            </div>
        </div>
    );
}
