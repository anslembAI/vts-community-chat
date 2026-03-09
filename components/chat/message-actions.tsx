"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
    MessageSquare,
    Pencil,
    Trash2,
    X,
    Copy,
    MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { toast } from "@/components/ui/use-toast";

interface MessageActionsProps {
    messageId: Id<"messages">;
    content: string;
    type?: string;
    canEdit: boolean;
    canReply: boolean;
    canDelete: boolean;
    canRemoveUser: boolean;
    isCurrentUser: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onReply: () => void;
    onReaction: (emoji: string) => void;
    onRemoveUser: () => void;
    // For syncing with long-press
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export function MessageActions({
    content,
    type,
    canEdit,
    canReply,
    canDelete,
    canRemoveUser,
    isCurrentUser,
    onEdit,
    onDelete,
    onReply,
    onReaction,
    onRemoveUser,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
}: MessageActionsProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const [internalOpen, setInternalOpen] = useState(false);

    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = externalOnOpenChange || setInternalOpen;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(content);
            toast({ description: "Message copied to clipboard" });
        } catch {
            toast({ variant: "destructive", description: "Failed to copy message" });
        }
        setOpen(false);
    };

    const handleAction = (action: () => void) => {
        action();
        setOpen(false);
    };

    const actionTrigger = (
        <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 sm:right-2 top-1/2 z-10 h-8 w-8 shrink-0 -translate-y-1/2 rounded-full border border-white/35 bg-white/30 text-black/45 opacity-70 backdrop-blur-sm transition-all hover:bg-white/55 hover:text-black sm:h-9 sm:w-9 hover:opacity-100 focus-within:opacity-100"
        >
            <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
        </Button>
    );

    if (isDesktop) {
        return (
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    {actionTrigger}
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isCurrentUser ? "end" : "start"} className="w-56 rounded-2xl border border-white/40 bg-[rgba(255,255,255,0.82)] p-1 shadow-[0_20px_45px_rgba(98,113,126,0.18)] backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
                    {/* Emojis row */}
                    <div className="flex items-center justify-between rounded-xl bg-white/45 px-2 py-1.5">
                        {EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-full text-lg transition-colors hover:bg-white/70"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleAction(() => onReaction(emoji));
                                }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    <DropdownMenuSeparator />

                    {(!type || type === "text") && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(handleCopy); }}>
                            <Copy className="mr-2 h-4 w-4" />
                            <span>Copy text</span>
                        </DropdownMenuItem>
                    )}

                    {canReply && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(onReply); }}>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>Reply in thread</span>
                        </DropdownMenuItem>
                    )}

                    {canEdit && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(onEdit); }}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Edit message</span>
                        </DropdownMenuItem>
                    )}

                    {canDelete && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(onDelete); }} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete message</span>
                        </DropdownMenuItem>
                    )}

                    {canRemoveUser && (
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleAction(onRemoveUser); }} className="text-destructive focus:text-destructive">
                            <X className="mr-2 h-4 w-4" />
                            <span>Remove user</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // Mobile Sheet representation
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {actionTrigger}
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[90vh] gap-0 overflow-y-auto rounded-t-[1.75rem] border-white/40 bg-[linear-gradient(180deg,rgba(249,251,252,0.96),rgba(239,244,247,0.94))] p-0 pb-safe shadow-[0_-20px_50px_rgba(98,113,126,0.18)] backdrop-blur-xl">
                <SheetHeader className="sticky top-0 z-10 space-y-0 border-b border-white/30 bg-white/45 px-4 py-3 text-left backdrop-blur-xl">
                    <SheetTitle className="text-sm font-semibold uppercase tracking-wider text-black/45">
                        Message Actions
                    </SheetTitle>
                </SheetHeader>

                <div className="p-4 flex flex-col gap-2">
                    {/* Emojis Large Row */}
                    <div className="mb-2 flex justify-between rounded-2xl border border-white/30 bg-white/45 p-2">
                        {EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-transform hover:bg-white/75 active:scale-90"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAction(() => onReaction(emoji)); }}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {/* Action List Buttons */}
                    {(!type || type === "text") && (
                        <Button variant="ghost" className="w-full justify-start h-12 text-base px-4" onClick={(e) => { e.stopPropagation(); handleAction(handleCopy); }}>
                            <Copy className="mr-3 h-5 w-5" />
                            Copy text
                        </Button>
                    )}

                    {canReply && (
                        <Button variant="ghost" className="w-full justify-start h-12 text-base px-4" onClick={(e) => { e.stopPropagation(); handleAction(onReply); }}>
                            <MessageSquare className="mr-3 h-5 w-5" />
                            Reply in thread
                        </Button>
                    )}

                    {canEdit && (
                        <Button variant="ghost" className="w-full justify-start h-12 text-base px-4" onClick={(e) => { e.stopPropagation(); handleAction(onEdit); }}>
                            <Pencil className="mr-3 h-5 w-5" />
                            Edit message
                        </Button>
                    )}

                    {canDelete && (
                        <Button variant="ghost" className="w-full justify-start h-12 text-base text-destructive hover:text-destructive px-4 hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleAction(onDelete); }}>
                            <Trash2 className="mr-3 h-5 w-5" />
                            Delete message
                        </Button>
                    )}

                    {canRemoveUser && (
                        <Button variant="ghost" className="w-full justify-start h-12 text-base text-destructive hover:text-destructive px-4 hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); handleAction(onRemoveUser); }}>
                            <X className="mr-3 h-5 w-5" />
                            Remove user
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

