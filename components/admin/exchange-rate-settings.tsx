"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function ExchangeRateSettings() {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const exchangeRate = useQuery(api.money.getExchangeRate);
    const history = useQuery(api.money.getExchangeRateHistory, sessionId ? { sessionId } : "skip");
    const updateRate = useMutation(api.money.updateExchangeRate);

    const [newRate, setNewRate] = useState("");
    const [note, setNote] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpdate = async () => {
        const rate = parseFloat(newRate);
        if (isNaN(rate) || rate <= 0) {
            toast({ title: "Invalid Rate", description: "Please enter a valid positive number.", variant: "destructive" });
            return;
        }
        if (!sessionId) return;

        setIsUpdating(true);
        try {
            await updateRate({
                sessionId,
                newRate: rate,
                note: note.trim() || undefined,
            });
            toast({ title: "Rate Updated", description: `Exchange rate set to 1 USD = ${rate} TTD` });
            setNewRate("");
            setNote("");
        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsUpdating(false);
        }
    };

    if (exchangeRate === undefined) {
        return <div className="flex items-center gap-2"><Loader2 className="animate-spin h-4 w-4" /> Loading exchange rate...</div>;
    }

    return (
        <div className="space-y-6">
            <Card className="border-[#E2D7C9] shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Current Exchange Rate</CardTitle>
                    <CardDescription>Manage the base conversion rate for money requests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border border-[#E2D7C9] rounded-xl bg-[#F4E9DD]/50">
                        <div className="text-3xl font-black text-primary">1 USD = {exchangeRate?.rate ?? "..."} TTD</div>
                        <div className="text-xs font-medium text-stone-500 sm:ml-auto">
                            Updated: {exchangeRate?.updatedAt ? new Date(exchangeRate.updatedAt).toLocaleString() : "Never"}
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="rate" className="text-sm font-bold">New Rate (TTD)</Label>
                            <Input
                                id="rate"
                                type="number"
                                step="0.01"
                                placeholder="e.g. 8.40"
                                value={newRate}
                                onChange={(e) => setNewRate(e.target.value)}
                                className="h-12 text-base font-semibold bg-white rounded-xl shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="note" className="text-sm font-bold">Note (Optional)</Label>
                            <Input
                                id="note"
                                placeholder="Reason for change..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="h-12 text-base font-semibold bg-white rounded-xl shadow-sm"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleUpdate}
                        disabled={isUpdating || !newRate}
                        className="w-full h-12 text-base font-black bg-[#E07A5F] hover:bg-[#D06A4F] shadow-lg active:scale-95 transition-all"
                    >
                        {isUpdating && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Update Rate
                    </Button>
                </CardContent>
            </Card>

            <Card className="border-[#E2D7C9] shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Rate History</CardTitle>
                    <CardDescription>Recent changes to the exchange rate.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    {/* Desktop View Table */}
                    <div className="hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b-[#E2D7C9]">
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="font-bold">Old Rate</TableHead>
                                    <TableHead className="font-bold">New Rate</TableHead>
                                    <TableHead className="font-bold">Changed By</TableHead>
                                    <TableHead className="font-bold">Note</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history?.map((entry) => (
                                    <TableRow key={entry._id} className="hover:bg-muted/30 border-b-[#E2D7C9]/50">
                                        <TableCell className="py-4">{new Date(entry.updatedAt).toLocaleString()}</TableCell>
                                        <TableCell className="py-4 font-medium text-stone-500">{entry.oldRate}</TableCell>
                                        <TableCell className="py-4 font-black text-primary">{entry.newRate}</TableCell>
                                        <TableCell className="py-4 font-semibold">{entry.user?.name || "Unknown"}</TableCell>
                                        <TableCell className="py-4 text-stone-600 italic text-xs">{entry.note || "-"}</TableCell>
                                    </TableRow>
                                ))}
                                {(!history || history.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-stone-400 py-8 italic">No history available yet</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="sm:hidden divide-y divide-[#E2D7C9]/60">
                        {history?.map((entry) => (
                            <div key={entry._id} className="p-4 space-y-3 bg-white/40 active:bg-muted/20 transition-colors">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-stone-500">
                                            {new Date(entry.updatedAt).toLocaleDateString()} at {new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="font-bold text-sm">Update by {entry.user?.name || "Unknown"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-primary">{entry.newRate} TTD</p>
                                        <p className="text-[10px] font-bold text-stone-400 line-through">from {entry.oldRate}</p>
                                    </div>
                                </div>
                                {entry.note && (
                                    <p className="text-xs text-stone-600 bg-[#F4E9DD]/50 p-2 rounded-lg italic border border-[#E2D7C9]/30">
                                        "{entry.note}"
                                    </p>
                                )}
                            </div>
                        ))}
                        {(!history || history.length === 0) && (
                            <div className="p-8 text-center text-stone-400 italic text-sm">
                                No history available yet
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
