"use client";

import React, { useState, useRef } from "react";
import NextImage from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Lock, Megaphone, ShieldAlert, Plus, X, ImageIcon, FileText, Mic, Trash2, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CreateMoneyRequestModal } from "@/components/money/create-money-request-modal";
import { CreatePollModal } from "@/components/polls/create-poll-modal";
import { PollHistory } from "@/components/polls/poll-history";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useVoiceRecorder } from "@/hooks/use-voice-recorder";
import { useTypingIndicator } from "@/hooks/use-typing";
import { generateVideoThumbnail, formatVideoDuration } from "@/lib/video-thumbnail";

interface MessageInputProps {
    channelId: Id<"channels">;
    parentMessageId?: Id<"messages">;
    isLocked?: boolean;
    isAdmin?: boolean;
    isAnnouncement?: boolean;
    placeholder?: string;
    onTypingUsersChange?: (users: { userId: string; username: string }[]) => void;
}

// File type icon helper
function getDocIcon(type: string) {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type.includes("sheet") || type.includes("excel")) return "📊";
    if (type.includes("presentation") || type.includes("powerpoint")) return "📎";
    if (type.includes("text/plain")) return "📃";
    return "📁";
}

function getDocLabel(name: string) {
    if (name.length > 25) {
        const ext = name.split(".").pop();
        return name.substring(0, 20) + "..." + (ext ? `.${ext}` : "");
    }
    return name;
}

export function MessageInput({
    channelId,
    parentMessageId,
    isLocked = false,
    isAdmin = false,
    isAnnouncement = false,
    placeholder = "Type a message...",
    onTypingUsersChange,
}: MessageInputProps) {
    const [content, setContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [attachmentType, setAttachmentType] = useState<"image" | "document" | "video" | null>(null);
    const [attachMenuOpen, setAttachMenuOpen] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);

    // Video-specific state
    const [videoThumbnailBlob, setVideoThumbnailBlob] = useState<Blob | null>(null);
    const [videoThumbnailUrl, setVideoThumbnailUrl] = useState<string | null>(null);
    const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);

    const sendMessage = useMutation(api.messages.sendMessage);
    const sendVoiceMessage = useMutation(api.messages.sendVoiceMessage);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

    const { isRecording, duration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const { sessionId } = useAuth();
    const { typingUsers, sendStartTyping, sendStopTyping } = useTypingIndicator(channelId);

    // Keep parent informed about who is typing
    React.useEffect(() => {
        onTypingUsersChange?.(typingUsers);
    }, [typingUsers, onTypingUsersChange]);

    // Fetch channel details to check type
    const channel = useQuery(api.channels.getChannel, { channelId });

    // Determine if this is a money_request channel
    const isMoneyChannel = channel?.type === "money_request";

    // Fetch current user to check if suspended
    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
    const isSuspended = currentUser?.suspended === true;

    // If announcement channel and user is not admin, show read-only state
    const isDisabledByAnnouncement = isAnnouncement && !isAdmin;

    // Check for lock override
    const hasOverride = useQuery(
        api.channels.hasLockOverride,
        sessionId ? { channelId, sessionId } : "skip"
    );

    // If locked and user is not admin AND has no override, show disabled state
    const isDisabledByLock = isLocked && !isAdmin && !hasOverride;

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast({ variant: "destructive", description: "Image size must be less than 5MB." });
                return;
            }
            setSelectedFile(file);
            setAttachmentType("image");
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const handleDocSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast({ variant: "destructive", description: "Document size must be less than 10MB." });
                return;
            }
            setSelectedFile(file);
            setAttachmentType("document");
            setPreviewUrl(null); // No visual preview for documents
        }
    };

    const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 50 * 1024 * 1024) {
            toast({ variant: "destructive", description: "Video exceeds the 50MB limit." });
            if (videoInputRef.current) videoInputRef.current.value = "";
            return;
        }
        setSelectedFile(file);
        setAttachmentType("video");
        setPreviewUrl(null);

        // Generate thumbnail client-side
        try {
            const thumb = await generateVideoThumbnail(file);
            if (thumb) {
                setVideoThumbnailBlob(thumb.blob);
                const thumbObjUrl = URL.createObjectURL(thumb.blob);
                setVideoThumbnailUrl(thumbObjUrl);
                setVideoDurationMs(thumb.durationMs);
            } else {
                // Fallback: no thumbnail, still allow sending
                setVideoThumbnailBlob(null);
                setVideoThumbnailUrl(null);
                setVideoDurationMs(null);
            }
        } catch {
            console.warn("Thumbnail generation failed, using fallback.");
            setVideoThumbnailBlob(null);
            setVideoThumbnailUrl(null);
            setVideoDurationMs(null);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setAttachmentType(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (videoThumbnailUrl) {
            URL.revokeObjectURL(videoThumbnailUrl);
            setVideoThumbnailUrl(null);
        }
        setVideoThumbnailBlob(null);
        setVideoDurationMs(null);
        setUploadProgress(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (docInputRef.current) docInputRef.current.value = "";
        if (videoInputRef.current) videoInputRef.current.value = "";
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && !selectedFile) return;
        if (isDisabledByLock || isDisabledByAnnouncement || isSuspended) return;
        if (!sessionId) {
            toast({
                title: "Error",
                description: "You must be logged in to send messages.",
                variant: "destructive",
            });
            return;
        }

        setIsSending(true);
        try {
            let imageStorageId: Id<"_storage"> | undefined;
            let docStorageId: Id<"_storage"> | undefined;
            let videoStorageId: Id<"_storage"> | undefined;
            let thumbStorageId: Id<"_storage"> | undefined;

            // Upload file if selected
            if (selectedFile) {
                if (attachmentType === "video") {
                    // ── Video dual-upload: thumbnail first, then video ──
                    if (videoThumbnailBlob) {
                        setUploadProgress("Uploading thumbnail...");
                        const thumbUploadUrl = await generateUploadUrl();
                        const thumbResult = await fetch(thumbUploadUrl, {
                            method: "POST",
                            headers: { "Content-Type": videoThumbnailBlob.type },
                            body: videoThumbnailBlob,
                        });
                        if (!thumbResult.ok) throw new Error("Thumbnail upload failed");
                        const { storageId: thumbId } = await thumbResult.json();
                        thumbStorageId = thumbId;
                    }

                    setUploadProgress("Uploading video...");
                    const videoUploadUrl = await generateUploadUrl();
                    const videoResult = await fetch(videoUploadUrl, {
                        method: "POST",
                        headers: { "Content-Type": selectedFile.type },
                        body: selectedFile,
                    });
                    if (!videoResult.ok) throw new Error("Video upload failed");
                    const { storageId: vidId } = await videoResult.json();
                    videoStorageId = vidId;
                    setUploadProgress(null);
                } else {
                    // ── Image / Document upload (existing flow) ──
                    const postUrl = await generateUploadUrl();
                    const result = await fetch(postUrl, {
                        method: "POST",
                        headers: { "Content-Type": selectedFile.type },
                        body: selectedFile,
                    });
                    if (!result.ok) throw new Error(`Upload failed: ${result.statusText}`);
                    const { storageId: uploadedId } = await result.json();

                    if (attachmentType === "image") {
                        imageStorageId = uploadedId;
                    } else if (attachmentType === "document") {
                        docStorageId = uploadedId;
                    }
                }
            }

            await sendMessage({
                channelId,
                content: content || (attachmentType === "video" ? "🎬 Video" : ""),
                sessionId,
                parentMessageId,
                image: imageStorageId,
                document: docStorageId,
                documentName: attachmentType === "document" && selectedFile ? selectedFile.name : undefined,
                documentType: attachmentType === "document" && selectedFile ? selectedFile.type : undefined,
                videoStorageId,
                thumbStorageId,
                videoDurationMs: attachmentType === "video" ? (videoDurationMs ?? undefined) : undefined,
                videoFormat: attachmentType === "video" && selectedFile ? selectedFile.type : undefined,
            });

            setContent("");
            removeFile();
            sendStopTyping();
        } catch (error: unknown) {
            console.error(error);
            const msg = error instanceof Error ? error.message : "Failed to send message.";
            toast({
                title: "Error",
                description: msg,
                variant: "destructive",
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleVoiceRecord = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (isRecording) {
            // Stop and send
            const result = await stopRecording();
            if (result) {
                await uploadAndSendVoice(result.blob, result.durationMs, result.mimeType);
            }
        } else {
            // Start recording
            if (!content.trim() && !selectedFile) {
                // Optionally clear inputs before recording starts
            }
            startRecording();
        }
    };

    const uploadAndSendVoice = async (blob: Blob, durationMs: number, mimeType: string) => {
        if (isDisabledByLock || isDisabledByAnnouncement || isSuspended) return;
        if (!sessionId) return;

        setIsSending(true);
        try {
            const postUrl = await generateUploadUrl();
            const response = await fetch(postUrl, {
                method: "POST",
                headers: { "Content-Type": blob.type },
                body: blob,
            });

            if (!response.ok) throw new Error("Upload failed");
            const { storageId } = await response.json();

            await sendVoiceMessage({
                sessionId,
                channelId,
                parentMessageId,
                storageId,
                durationMs,
                mimeType,
            });

            // Do not clear content here in case user typed text while recording
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to send voice message.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // Locked state for non-admins
    if (isDisabledByLock) {
        return (
            <div className="flex items-center gap-3 p-4 border-t bg-muted/30">
                <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground flex-1">
                    This channel is locked by an admin.
                </p>
            </div>
        );
    }

    // Suspended state
    if (isSuspended) {
        return (
            <div className="flex items-center gap-3 p-4 border-t bg-destructive/5">
                <ShieldAlert className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1">
                    Your account has been suspended. You cannot send messages.
                </p>
            </div>
        );
    }

    // Announcement read-only state for non-admins
    if (isDisabledByAnnouncement) {
        return (
            <div className="flex items-center gap-3 p-4 border-t bg-amber-500/5">
                <Megaphone className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400 flex-1">
                    This is a broadcast channel — only admins can post.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col border-t border-[#E0D6C8] bg-[#F4E9DD]">
            {/* Image Preview Area */}
            {previewUrl && attachmentType === "image" && (
                <div className="px-4 pt-4 flex">
                    <div className="relative group">
                        <NextImage
                            src={previewUrl}
                            alt="Preview"
                            width={80}
                            height={80}
                            className="h-20 w-auto rounded-md object-cover border"
                            unoptimized
                        />
                        <button
                            onClick={removeFile}
                            className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 transition-colors shadow-sm"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Document Preview Area */}
            {selectedFile && attachmentType === "document" && (
                <div className="px-4 pt-4 flex">
                    <div className="relative group flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border">
                        <span className="text-xl">{getDocIcon(selectedFile.type)}</span>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate max-w-[200px]">
                                {getDocLabel(selectedFile.name)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {(selectedFile.size / 1024).toFixed(1)} KB
                            </span>
                        </div>
                        <button
                            onClick={removeFile}
                            className="ml-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 transition-colors shadow-sm"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Video Preview Area */}
            {selectedFile && attachmentType === "video" && (
                <div className="px-4 pt-4 flex">
                    <div className="relative group flex items-center gap-3 bg-muted/50 rounded-lg px-3 py-2 border">
                        {videoThumbnailUrl ? (
                            <div className="relative h-14 w-20 shrink-0 rounded overflow-hidden">
                                <NextImage
                                    src={videoThumbnailUrl}
                                    alt="Video thumbnail"
                                    width={80}
                                    height={56}
                                    className="h-14 w-20 object-cover rounded"
                                    unoptimized
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                                    <Video className="h-5 w-5 text-white" />
                                </div>
                            </div>
                        ) : (
                            <div className="h-14 w-20 shrink-0 rounded bg-zinc-800 flex items-center justify-center">
                                <Video className="h-6 w-6 text-white/60" />
                            </div>
                        )}
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate max-w-[200px]">
                                {getDocLabel(selectedFile.name)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                                {videoDurationMs ? ` · ${formatVideoDuration(videoDurationMs)}` : ""}
                            </span>
                        </div>
                        <button
                            onClick={removeFile}
                            className="ml-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90 transition-colors shadow-sm"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Progress */}
            {uploadProgress && (
                <div className="px-4 pt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>{uploadProgress}</span>
                    </div>
                </div>
            )}

            <div className="p-4" data-tour="message-composer">
                <div className="flex items-center gap-2 px-3 py-1 bg-[#F4E9DD] border border-[#E0D6C8] rounded-full shadow-sm">
                    {!parentMessageId && isMoneyChannel && (
                        <CreateMoneyRequestModal channelId={channelId} />
                    )}

                    {!parentMessageId && !isAnnouncement && (
                        <>
                            <CreatePollModal channelId={channelId} />
                            <PollHistory channelId={channelId} />
                        </>
                    )}

                    {/* Hidden file inputs */}
                    <input
                        type="file"
                        ref={imageInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageSelect}
                    />
                    <input
                        type="file"
                        ref={docInputRef}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp"
                        onChange={handleDocSelect}
                    />
                    <input
                        type="file"
                        ref={videoInputRef}
                        className="hidden"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoSelect}
                    />

                    {/* Attachment Popover */}
                    <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 rounded-full h-9 w-9 hover:bg-[#EADFD2]"
                                disabled={isSending}
                            >
                                <Plus className="h-6 w-6 text-[#5C5C5C]" />
                                <span className="sr-only">Add Attachment</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-44 p-1 bg-[#F4E9DD] border-[#E0D6C8]" side="top" align="start">
                            <button
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-[#EADFD2] transition-colors"
                                onClick={() => {
                                    imageInputRef.current?.click();
                                    setAttachMenuOpen(false);
                                }}
                            >
                                <ImageIcon className="h-4 w-4 text-blue-500" />
                                <span>Image</span>
                            </button>
                            <button
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-[#EADFD2] transition-colors"
                                onClick={() => {
                                    docInputRef.current?.click();
                                    setAttachMenuOpen(false);
                                }}
                            >
                                <FileText className="h-4 w-4 text-orange-500" />
                                <span>Document</span>
                            </button>
                            <button
                                className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-[#EADFD2] transition-colors"
                                onClick={() => {
                                    videoInputRef.current?.click();
                                    setAttachMenuOpen(false);
                                }}
                            >
                                <Video className="h-4 w-4 text-purple-500" />
                                <span>Video</span>
                            </button>
                        </PopoverContent>
                    </Popover>

                    <form onSubmit={handleSend} className="flex-1 flex items-center gap-2 relative">
                        {isRecording ? (
                            <div className="flex-1 flex items-center justify-between bg-red-100/50 dark:bg-red-900/20 rounded-full px-4 py-1.5 h-10 border border-red-200 dark:border-red-900">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                        Recording... {formatDuration(duration)}
                                    </span>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={cancelRecording}
                                    className="h-7 w-7 text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-full"
                                    title="Cancel Recording"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <Input
                                value={content}
                                onChange={(e) => {
                                    setContent(e.target.value);
                                    if (e.target.value.trim()) {
                                        sendStartTyping();
                                    } else {
                                        sendStopTyping();
                                    }
                                }}
                                placeholder={isAnnouncement ? "Post an announcement..." : placeholder}
                                className="flex-1 bg-transparent border-none focus-visible:ring-0 text-black placeholder-[#8A8A8A] text-base"
                                disabled={isSending}
                                autoFocus
                            />
                        )}

                        {!content.trim() && !selectedFile && !isAnnouncement && (
                            <Button
                                type="button"
                                size="icon"
                                onClick={handleVoiceRecord}
                                disabled={isSending}
                                className={`shrink-0 h-9 w-9 rounded-full shadow-sm transition-transform active:scale-95 ${isRecording
                                    ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                                    : "bg-transparent hover:bg-black/5 text-black border border-black/10"
                                    }`}
                                title={isRecording ? "Stop & Send Voice Note" : "Record Voice Note"}
                            >
                                <Mic className="h-4 w-4" />
                            </Button>
                        )}

                        {(content.trim() || selectedFile || isAnnouncement) && !isRecording && (
                            <Button
                                type="submit"
                                size="icon"
                                disabled={isSending}
                                className="bg-[#C8D8CE] hover:bg-[#BFD0C6] text-black rounded-full shadow-sm shrink-0 h-9 w-9"
                            >
                                {isSending ? (
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                ) : isAnnouncement ? (
                                    <Megaphone className="h-5 w-5" />
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </Button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
