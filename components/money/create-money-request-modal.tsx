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
import { Loader2, DollarSign } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

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
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createMoneyRequest = useMutation(api.money.createMoneyRequest);
    const exchangeRate = useQuery(api.money.getExchangeRate);

    const rate = exchangeRate ? exchangeRate.rate : 8.4;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionId) return;
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            toast({ variant: "destructive", description: "Please enter a valid amount." });
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
            });
            toast({ description: "Money request created successfully." });
            setOpen(false);
            setAmount("");
            setNote("");
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="w-full gap-2" variant="default">
                    <DollarSign className="h-4 w-4" />
                    Request Money
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Money Request</DialogTitle>
                    <DialogDescription>
                        Request money from the channel.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Request
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
