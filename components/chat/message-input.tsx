"use client";

import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Lock, Megaphone, ShieldAlert, Plus, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CreateMoneyRequestModal } from "@/components/money/create-money-request-modal";
import { CreatePollModal } from "@/components/polls/create-poll-modal";
import { PollHistory } from "@/components/polls/poll-history";

interface MessageInputProps {
    channelId: Id<"channels">;
    parentMessageId?: Id<"messages">;
    isLocked?: boolean;
    isAdmin?: boolean;
    isAnnouncement?: boolean;
    placeholder?: string;
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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sendMessage = useMutation(api.messages.sendMessage);
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);

    const [isSending, setIsSending] = useState(false);
    const { toast } = useToast();
    const { sessionId } = useAuth();

    // Fetch channel details to check type
    const channel = useQuery(api.channels.getChannel, { channelId });

    // Determine if this is a money_request channel
    const isMoneyChannel = channel?.type === "money_request";

    // If locked and user is not admin, show disabled state
    const isDisabledByLock = isLocked && !isAdmin;

    // If announcement channel and user is not admin, show read-only state
    const isDisabledByAnnouncement = isAnnouncement && !isAdmin;

    // Fetch current user to check if suspended
    const currentUser = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });
    const isSuspended = currentUser?.suspended === true;

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast({ variant: "destructive", description: "File size must be less than 5MB." });
                return;
            }
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
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
            let storageId: Id<"_storage"> | undefined;

            // Upload image if selected
            if (selectedFile) {
                // 1. Get upload URL
                const postUrl = await generateUploadUrl();

                // 2. Upload file
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": selectedFile.type },
                    body: selectedFile,
                });

                if (!result.ok) {
                    throw new Error(`Upload failed: ${result.statusText}`);
                }

                const { storageId: uploadedId } = await result.json();
                storageId = uploadedId;
            }

            // 3. Send message with storage ID
            await sendMessage({
                channelId,
                content,
                sessionId,
                parentMessageId,
                image: storageId,
            });

            setContent("");
            removeFile();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error?.message || "Failed to send message. Please try again.",
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
            {previewUrl && (
                <div className="px-4 pt-4 flex">
                    <div className="relative group">
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="h-20 w-auto rounded-md object-cover border"
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

                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                />

                <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full h-8 w-8 hover:bg-muted"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                >
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Add Attachment</span>
                </Button>

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
