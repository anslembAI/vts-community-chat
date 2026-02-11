"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Plus, User, Search } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CreateMoneyRequestModalProps {
    channelId: Id<"channels">;
}

export function CreateMoneyRequestModal({ channelId }: CreateMoneyRequestModalProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [currency, setCurrency] = useState<"USD" | "TTD">("USD");
    const [note, setNote] = useState("");
    const [recipientId, setRecipientId] = useState<Id<"users"> | null>(null);
    const [userSearch, setUserSearch] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createMoneyRequest = useMutation(api.money.createMoneyRequest);
    const exchangeRate = useQuery(api.money.getExchangeRate);
    const currentUser = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });

    // Fetch all users for the recipient picker
    const allUsers = useQuery(
        api.users.listUsersForPicker,
        sessionId ? { sessionId } : "skip"
    );

    const rate = exchangeRate ? exchangeRate.rate : 8.4;

    // Filter out the current user from the list and apply search
    const availableUsers = (allUsers ?? []).filter((u) => {
        if (currentUser && u._id === currentUser._id) return false;
        if (!userSearch.trim()) return true;
        const query = userSearch.toLowerCase();
        return (
            u.username?.toLowerCase().includes(query) ||
            u.name?.toLowerCase().includes(query)
        );
    });

    const selectedUser = recipientId
        ? (allUsers ?? []).find((u) => u._id === recipientId)
        : null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionId) return;
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast({ variant: "destructive", description: "Please enter a valid amount." });
            return;
        }
        if (!recipientId) {
            toast({ variant: "destructive", description: "Please select a recipient." });
            return;
        }

        setIsSubmitting(true);
        try {
            await createMoneyRequest({
                sessionId,
                channelId,
                amount: Number(amount),
                currency,
                note,
                recipientId,
            });
            toast({ description: "Money request created successfully." });
            setOpen(false);
            setAmount("");
            setNote("");
            setRecipientId(null);
            setUserSearch("");
        } catch (error: any) {
            toast({ variant: "destructive", description: error.message || "Failed to create request." });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate preview
    const numAmount = Number(amount);
    let preview = "";
    if (numAmount > 0) {
        if (currency === "USD") {
            const converted = (numAmount * rate).toFixed(2);
            preview = `${numAmount} USD ≈ ${converted} TTD (Rate: ${rate})`;
        } else {
            const converted = (numAmount / rate).toFixed(2);
            preview = `${numAmount} TTD ≈ ${converted} USD (Rate: ${rate})`;
        }
    }

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
                // Reset form on close
                setRecipientId(null);
                setUserSearch("");
            }
        }}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 rounded-full h-8 w-8 hover:bg-muted">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="sr-only">Create Request</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create Money Request</DialogTitle>
                    <DialogDescription>
                        Send a money request to a specific user.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Recipient Picker */}
                    <div className="grid gap-2">
                        <Label>Send To</Label>
                        {selectedUser ? (
                            <div className="flex items-center justify-between gap-2 p-3 border rounded-lg bg-muted/30">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {selectedUser.name || selectedUser.username}
                                        </p>
                                        {selectedUser.name && (
                                            <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setRecipientId(null);
                                        setUserSearch("");
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Change
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search users..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <ScrollArea className="h-[140px] border rounded-lg">
                                    {allUsers === undefined ? (
                                        <div className="flex items-center justify-center h-full p-4">
                                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : availableUsers.length === 0 ? (
                                        <div className="flex items-center justify-center h-full p-4">
                                            <p className="text-sm text-muted-foreground">No users found</p>
                                        </div>
                                    ) : (
                                        <div className="p-1">
                                            {availableUsers.map((user) => (
                                                <button
                                                    key={user._id}
                                                    type="button"
                                                    onClick={() => {
                                                        setRecipientId(user._id);
                                                        setUserSearch("");
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-left transition-colors"
                                                >
                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                        <User className="h-3.5 w-3.5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {user.name || user.username}
                                                        </p>
                                                        {user.name && (
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                @{user.username}
                                                            </p>
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    {/* Amount */}
                    <div className="grid gap-2">
                        <Label htmlFor="amount">Amount</Label>
                        <div className="flex gap-2">
                            <Input
                                id="amount"
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                step="0.01"
                                className="flex-1"
                            />
                            <Select value={currency} onValueChange={(v: "USD" | "TTD") => setCurrency(v)}>
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="USD">USD</SelectItem>
                                    <SelectItem value="TTD">TTD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {preview && <p className="text-sm text-muted-foreground">{preview}</p>}
                    </div>

                    {/* Note */}
                    <div className="grid gap-2">
                        <Label htmlFor="note">Note (Optional)</Label>
                        <Input
                            id="note"
                            placeholder="What is this for?"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={isSubmitting || !recipientId}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Request
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
