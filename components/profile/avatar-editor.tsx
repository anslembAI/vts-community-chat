"use client";

import React, { useState, useRef, useCallback } from "react";
import Cropper, { Point, Area } from "react-easy-crop";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Camera, Trash, ZoomIn, ZoomOut, Save, ImageIcon } from "lucide-react";
import getCroppedImg from "@/lib/cropImage";

interface AvatarEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (blob: Blob) => Promise<void>;
    onRemove?: () => Promise<void>;
    uploadProgress: number;
    hasExistingAvatar: boolean;
}

export function AvatarEditor({ open, onOpenChange, onSave, onRemove, uploadProgress, hasExistingAvatar }: AvatarEditorProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { toast } = useToast();

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Client-side validation: Max 2MB
            if (file.size > 2 * 1024 * 1024) {
                toast({ title: "File too large", description: "Please choose an image under 2MB.", variant: "destructive" });
                return;
            }
            if (!file.type.startsWith("image/")) {
                toast({ title: "Invalid file type", description: "Please choose a valid image.", variant: "destructive" });
                return;
            }

            const reader = new FileReader();
            reader.addEventListener("load", () => setImageSrc(reader.result?.toString() || null));
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        setIsSaving(true);
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
            if (croppedImageBlob) {
                await onSave(croppedImageBlob);
                toast({ title: "Profile photo updated" });
                handleClose();
            }
        } catch (e) {
            toast({ title: "Upload failed", description: "Try again.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleRemove = async () => {
        if (!onRemove) return;
        setIsSaving(true);
        try {
            await onRemove();
            toast({ title: "Profile photo removed" });
            handleClose();
        } catch {
            toast({ title: "Failed to remove photo", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (!isSaving && uploadProgress === 0) {
            setImageSrc(null);
            setZoom(1);
            onOpenChange(false);
        }
    };

    const triggerFilePicker = () => {
        fileInputRef.current?.click();
    };

    const triggerCamera = () => {
        cameraInputRef.current?.click();
    };

    const content = (
        <>
            <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
            />
            <input
                type="file"
                accept="image/*"
                ref={cameraInputRef}
                className="hidden"
                onChange={handleFileChange}
                capture="user"
            />
            {imageSrc ? (
                <div className="space-y-4">
                    <div className="relative w-full h-64 sm:h-80 bg-black/10 rounded-lg overflow-hidden flex items-center justify-center">
                        {uploadProgress > 0 && (
                            <div className="absolute inset-0 z-50 bg-background/80 flex items-center justify-center flex-col gap-4 filter backdrop-blur-sm">
                                <div className="relative w-20 h-20 flex items-center justify-center">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-muted" />
                                        <circle
                                            cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="4" fill="transparent"
                                            strokeDasharray={`${2 * Math.PI * 36}`}
                                            strokeDashoffset={`${2 * Math.PI * 36 - (uploadProgress / 100) * 2 * Math.PI * 36}`}
                                            className="text-primary transition-all duration-300 ease-out"
                                        />
                                    </svg>
                                    <span className="absolute text-sm font-semibold">{uploadProgress}%</span>
                                </div>
                                <p className="text-sm font-medium animate-pulse">Uploading...</p>
                            </div>
                        )}
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={1}
                            cropShape="round"
                            showGrid={false}
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                    <div className="flex items-center gap-4 px-4 w-full">
                        <ZoomOut className="w-4 h-4 text-muted-foreground" />
                        <Slider
                            value={[zoom]}
                            min={1} max={3} step={0.1}
                            onValueChange={(val) => setZoom(val[0])}
                            className="flex-1 cursor-ew-resize"
                            disabled={isSaving || uploadProgress > 0}
                        />
                        <ZoomIn className="w-4 h-4 text-muted-foreground" />
                    </div>
                </div>
            ) : (
                <div className="py-12 flex flex-col items-center justify-center gap-6">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera className="w-10 h-10 text-primary" />
                    </div>
                    <p className="text-center text-muted-foreground max-w-xs text-sm">
                        Choose an image from your device to use as your profile photo (Max 2MB).
                    </p>
                    <div className="flex flex-col gap-3 w-full max-w-xs">
                        <Button
                            onClick={triggerFilePicker}
                            size="lg"
                            className="w-full group"
                        >
                            <ImageIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                            Choose from Photos
                        </Button>
                        <Button
                            onClick={triggerCamera}
                            size="lg"
                            variant="secondary"
                            className="w-full group"
                        >
                            <Camera className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                            Take Photo
                        </Button>
                        {hasExistingAvatar && onRemove && (
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleRemove}
                                disabled={isSaving}
                            >
                                <Trash className="w-4 h-4 mr-2" />
                                Remove Current Photo
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </>
    );

    const buttons = imageSrc && (
        <>
            <Button variant="ghost" onClick={() => setImageSrc(null)} disabled={isSaving || uploadProgress > 0}>
                Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || uploadProgress > 0}>
                {isSaving || uploadProgress > 0 ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save</>}
            </Button>
        </>
    );

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle>Profile Photo</DialogTitle>
                    </DialogHeader>
                    <div className="px-6 pb-2">
                        {content}
                    </div>
                    {imageSrc && (
                        <DialogFooter className="p-6 pt-2">
                            {buttons}
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Drawer open={open} onOpenChange={handleClose}>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle>Profile Photo</DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-4">
                    {content}
                </div>
                {imageSrc && (
                    <DrawerFooter className="flex-row justify-end space-x-2 pt-2">
                        {buttons}
                    </DrawerFooter>
                )}
            </DrawerContent>
        </Drawer>
    );
}
