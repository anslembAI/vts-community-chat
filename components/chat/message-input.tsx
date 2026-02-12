"use client";

import { useState, useRef } from "react";
import NextImage from "next/image";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Lock, Megaphone, ShieldAlert, Plus, X, ImageIcon, FileText } from "lucide-react";
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

interface MessageInputProps {
    channelId: Id<"channels">;
    parentMessageId?: Id<"messages">;
    isLocked?: boolean;
    isAdmin?: boolean;
    isAnnouncement?: boolean;
    placeholder?: string;
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
    placeholder = "Type a message..."
}: MessageInputProps) {
    const [content, setContent] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [attachmentType, setAttachmentType] = useState<"image" | "document" | null>(null);
    const [attachMenuOpen, setAttachMenuOpen] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const docInputRef = useRef<HTMLInputElement>(null);

    const sendMessage = useMutation(api.messages.sendMessage);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const { sessionId } = useAuth();

    // Fetch channel details to check type
    const channel = useQuery(api.channels.getChannel, { channelId });

    // Determine if this is a money_request channel
    const isMoneyChannel = channel?.type === "money_request";

    // Fetch current user to check if suspended
    const currentUser = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });
    const isSuspended = currentUser?.suspended === true;

    // If announcement channel and user is not admin, show read-only state
    const isDisabledByAnnouncement = isAnnouncement && !isAdmin;

    // Check for lock override
    const hasOverride = useQuery(api.channels.hasLockOverride, {
        channelId,
        sessionId: sessionId ?? undefined
    });

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

    const removeFile = () => {
        setSelectedFile(null);
        setAttachmentType(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
        if (docInputRef.current) {
            docInputRef.current.value = "";
        }
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

            // Upload file if selected
            if (selectedFile) {
                const postUrl = await generateUploadUrl();

                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": selectedFile.type },
                    body: selectedFile,
                });

                if (!result.ok) {
                    throw new Error(`Upload failed: ${result.statusText}`);
                }

                const { storageId: uploadedId } = await result.json();

                if (attachmentType === "image") {
                    imageStorageId = uploadedId;
                } else if (attachmentType === "document") {
                    docStorageId = uploadedId;
                }
            }

            await sendMessage({
                channelId,
                content,
                sessionId,
                parentMessageId,
                image: imageStorageId,
                document: docStorageId,
                documentName: attachmentType === "document" && selectedFile ? selectedFile.name : undefined,
                documentType: attachmentType === "document" && selectedFile ? selectedFile.type : undefined,
            });

            setContent("");
            removeFile();
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
        <div className="flex flex-col border-t bg-background">
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

            <div className="flex items-center gap-2 p-4">
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

                {/* Attachment Popover */}
                <Popover open={attachMenuOpen} onOpenChange={setAttachMenuOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 rounded-full h-8 w-8 hover:bg-muted"
                            disabled={isSending}
                        >
                            <Plus className="h-5 w-5 text-muted-foreground" />
                            <span className="sr-only">Add Attachment</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-1" side="top" align="start">
                        <button
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                            onClick={() => {
                                imageInputRef.current?.click();
                                setAttachMenuOpen(false);
                            }}
                        >
                            <ImageIcon className="h-4 w-4 text-blue-500" />
                            <span>Image</span>
                        </button>
                        <button
                            className="flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                            onClick={() => {
                                docInputRef.current?.click();
                                setAttachMenuOpen(false);
                            }}
                        >
                            <FileText className="h-4 w-4 text-orange-500" />
                            <span>Document</span>
                        </button>
                    </PopoverContent>
                </Popover>

                <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
                    <Input
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={isAnnouncement ? "Post an announcement..." : placeholder}
                        className="flex-1"
                        disabled={isSending}
                        autoFocus
                    />
                    <Button type="submit" size="icon" disabled={isSending || (!content.trim() && !selectedFile)}>
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isAnnouncement ? (
                            <Megaphone className="h-4 w-4" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
