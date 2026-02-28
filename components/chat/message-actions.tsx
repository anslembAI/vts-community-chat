"use client";

import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import {
    Smile,
    MessageSquare,
    Pencil,
    Trash2,
    X,
    Copy,
    MoreHorizontal
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
        } catch (err) {
            toast({ variant: "destructive", description: "Failed to copy message" });
        }
        setOpen(false);
    };

    const handleAction = (action: () => void) => {
        action();
        setOpen(false);
    };

    if (isDesktop) {
        return (
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-black/5 hover:bg-black/10 border border-black/5 text-muted-foreground hover:text-foreground shadow-sm absolute transition-all duration-200 opacity-0 group-hover:opacity-100 focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto focus-within:pointer-events-auto z-10"
                        style={{
                            top: "6px",
                            ...(isCurrentUser ? { left: "-12px" } : { right: "-12px" }),
                        }}
                    >
                        <MoreHorizontal className="h-4 w-4 shrink-0" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isCurrentUser ? "end" : "start"} className="w-56" onClick={(e) => e.stopPropagation()}>
                    {/* Emojis row */}
                    <div className="flex items-center justify-between px-2 py-1.5">
                        {EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                className="h-8 w-8 rounded-full text-lg hover:bg-muted flex flex-col items-center justify-center transition-colors shrink-0"
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

    // Mobile Sheet representation (triggered externally via long press binding)
    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="bottom" className="p-0 border-t rounded-t-2xl gap-0 max-h-[90vh] overflow-y-auto pb-safe">
                <SheetHeader className="px-4 py-3 border-b text-left space-y-0 sticky top-0 bg-background z-10">
                    <SheetTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                        Message Actions
                    </SheetTitle>
                </SheetHeader>

                <div className="p-4 flex flex-col gap-2">
                    {/* Emojis Large Row */}
                    <div className="flex justify-between bg-muted/30 rounded-xl p-2 mb-2">
                        {EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                className="h-10 w-10 text-2xl rounded-full hover:bg-muted active:scale-90 transition-transform flex items-center justify-center"
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

