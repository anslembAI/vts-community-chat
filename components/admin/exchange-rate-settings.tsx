/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */
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
        return <div className="vts-panel flex items-center gap-2 rounded-[1.75rem] p-6 text-black/45"><Loader2 className="h-4 w-4 animate-spin" /> Loading exchange rate...</div>;
    }

    return (
        <div className="space-y-6">
            <Card className="vts-panel border-0 rounded-[1.75rem] shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-[#2c3034]">Current Exchange Rate</CardTitle>
                    <CardDescription>Manage the base conversion rate for money requests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="vts-soft-card flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center">
                        <div className="text-3xl font-black text-primary">1 USD = {exchangeRate?.rate ?? "..."} TTD</div>
                        <div className="text-xs font-medium text-black/40 sm:ml-auto">
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
                                className="h-12 rounded-xl border-white/45 bg-white/40 text-base font-semibold shadow-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="note" className="text-sm font-bold">Note (Optional)</Label>
                            <Input
                                id="note"
                                placeholder="Reason for change..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="h-12 rounded-xl border-white/45 bg-white/40 text-base font-semibold shadow-sm"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleUpdate}
                        disabled={isUpdating || !newRate}
                        className="h-12 w-full bg-[#E07A5F] text-base font-black shadow-lg transition-all hover:bg-[#D06A4F] active:scale-95"
                    >
                        {isUpdating && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Update Rate
                    </Button>
                </CardContent>
            </Card>

            <Card className="vts-panel border-0 rounded-[1.75rem] shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl font-bold text-[#2c3034]">Rate History</CardTitle>
                    <CardDescription>Recent changes to the exchange rate.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    {/* Desktop View Table */}
                    <div className="hidden sm:block">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-b-white/35 hover:bg-transparent">
                                    <TableHead className="font-bold">Date</TableHead>
                                    <TableHead className="font-bold">Old Rate</TableHead>
                                    <TableHead className="font-bold">New Rate</TableHead>
                                    <TableHead className="font-bold">Changed By</TableHead>
                                    <TableHead className="font-bold">Note</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history?.map((entry) => (
                                    <TableRow key={entry._id} className="border-b-white/25 hover:bg-white/18">
                                        <TableCell className="py-4">{new Date(entry.updatedAt).toLocaleString()}</TableCell>
                                        <TableCell className="py-4 font-medium text-black/45">{entry.oldRate}</TableCell>
                                        <TableCell className="py-4 font-black text-primary">{entry.newRate}</TableCell>
                                        <TableCell className="py-4 font-semibold">{entry.user?.name || "Unknown"}</TableCell>
                                        <TableCell className="py-4 text-xs italic text-black/55">{entry.note || "-"}</TableCell>
                                    </TableRow>
                                ))}
                                {(!history || history.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-8 text-center italic text-black/35">No history available yet</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="divide-y divide-white/30 sm:hidden">
                        {history?.map((entry) => (
                            <div key={entry._id} className="space-y-3 bg-white/18 p-4 transition-colors active:bg-white/24">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-black/45">
                                            {new Date(entry.updatedAt).toLocaleDateString()} at {new Date(entry.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="font-bold text-sm">Update by {entry.user?.name || "Unknown"}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-primary">{entry.newRate} TTD</p>
                                        <p className="text-[10px] font-bold text-black/35 line-through">from {entry.oldRate}</p>
                                    </div>
                                </div>
                                {entry.note && (
                                    <p className="rounded-lg border border-white/35 bg-white/35 p-2 text-xs italic text-black/55">
                                        "{entry.note}"
                                    </p>
                                )}
                            </div>
                        ))}
                        {(!history || history.length === 0) && (
                            <div className="p-8 text-center text-sm italic text-black/35">
                                No history available yet
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
