"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BarChart3, Loader2, Plus, Trash2, X } from "lucide-react";

interface CreatePollModalProps {
    channelId: Id<"channels">;
}

export function CreatePollModal({ channelId }: CreatePollModalProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const currentUser = useQuery(api.users.getCurrentUser, {
        sessionId: sessionId ?? undefined,
    });

    const createPoll = useMutation(api.polls.createPoll);

    const [open, setOpen] = useState(false);
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [anonymous, setAnonymous] = useState(false);
    const [allowChangeVote, setAllowChangeVote] = useState(true);
    const [duration, setDuration] = useState<string>("none");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Only render for admins
    if (!currentUser?.isAdmin) return null;

    const addOption = () => {
        if (options.length < 6) {
            setOptions([...options, ""]);
        }
    };

    const removeOption = (index: number) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const updateOption = (index: number, value: string) => {
        const updated = [...options];
        updated[index] = value;
        setOptions(updated);
    };

    const resetForm = () => {
        setQuestion("");
        setOptions(["", ""]);
        setAllowMultiple(false);
        setAnonymous(false);
        setAllowChangeVote(true);
        setDuration("none");
    };

    const getEndsAt = (): number | undefined => {
        const now = Date.now();
        switch (duration) {
            case "1h": return now + 60 * 60 * 1000;
            case "24h": return now + 24 * 60 * 60 * 1000;
            case "7d": return now + 7 * 24 * 60 * 60 * 1000;
            default: return undefined;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionId) return;

        const trimmedQuestion = question.trim();
        const trimmedOptions = options.map((o) => o.trim()).filter((o) => o.length > 0);

        if (!trimmedQuestion) {
            toast({ variant: "destructive", description: "Please enter a poll question." });
            return;
        }
        if (trimmedQuestion.length > 140) {
            toast({ variant: "destructive", description: "Question must be 140 characters or less." });
            return;
        }
        if (trimmedOptions.length < 2) {
            toast({ variant: "destructive", description: "At least 2 options are required." });
            return;
        }

        setIsSubmitting(true);
        try {
            await createPoll({
                sessionId,
                channelId,
                question: trimmedQuestion,
                options: trimmedOptions,
                allowMultiple,
                anonymous,
                allowChangeVote,
                endsAt: getEndsAt(),
            });
            toast({ description: "Poll created successfully!" });
            resetForm();
            setOpen(false);
        } catch (error: any) {
            const msg = error?.data?.message || error?.message || "";
            const friendly = msg.split("\n")[0].replace(/^Uncaught Error:\s*/i, "").trim();
            toast({ variant: "destructive", description: friendly || "Failed to create poll." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { setOpen(isOpen); if (!isOpen) resetForm(); }}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                    <BarChart3 className="h-4 w-4" />
                    Poll
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Create Poll
                    </DialogTitle>
                    <DialogDescription>
                        Create a poll for the channel. Only admins can create polls.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Question */}
                    <div className="space-y-2">
                        <Label htmlFor="poll-question">Question</Label>
                        <Input
                            id="poll-question"
                            placeholder="Ask your question..."
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            maxLength={140}
                        />
                        <p className="text-[11px] text-muted-foreground text-right">
                            {question.length}/140
                        </p>
                    </div>

                    {/* Options */}
                    <div className="space-y-2">
                        <Label>Options</Label>
                        <div className="space-y-2">
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                                        {idx + 1}
                                    </div>
                                    <Input
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={(e) => updateOption(idx, e.target.value)}
                                        className="flex-1"
                                    />
                                    {options.length > 2 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeOption(idx)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {options.length < 6 && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addOption}
                                className="w-full mt-2 gap-1 text-xs"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Option
                            </Button>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Settings</h4>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Multiple Choice</p>
                                <p className="text-[11px] text-muted-foreground">Allow selecting multiple options</p>
                            </div>
                            <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Anonymous Voting</p>
                                <p className="text-[11px] text-muted-foreground">Hide individual voter identities</p>
                            </div>
                            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Allow Vote Changes</p>
                                <p className="text-[11px] text-muted-foreground">Users can change or remove their vote</p>
                            </div>
                            <Switch checked={allowChangeVote} onCheckedChange={setAllowChangeVote} />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium">Duration</p>
                                <p className="text-[11px] text-muted-foreground">When the poll closes</p>
                            </div>
                            <Select value={duration} onValueChange={setDuration}>
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No limit</SelectItem>
                                    <SelectItem value="1h">1 hour</SelectItem>
                                    <SelectItem value="24h">24 hours</SelectItem>
                                    <SelectItem value="7d">7 days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="gap-2">
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Poll
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
