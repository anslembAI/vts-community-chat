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
            <Card>
                <CardHeader>
                    <CardTitle>Current Exchange Rate</CardTitle>
                    <CardDescription>Manage the base conversion rate for money requests.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                        <div className="text-2xl font-bold">1 USD = {exchangeRate?.rate ?? "..."} TTD</div>
                        <div className="text-sm text-muted-foreground ml-auto">
                            Last updated: {exchangeRate?.updatedAt ? new Date(exchangeRate.updatedAt).toLocaleString() : "Never"}
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="rate">New Rate (TTD)</Label>
                            <Input
                                id="rate"
                                type="number"
                                step="0.01"
                                placeholder="e.g. 8.40"
                                value={newRate}
                                onChange={(e) => setNewRate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="note">Note (Optional)</Label>
                            <Input
                                id="note"
                                placeholder="Reason for change..."
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button onClick={handleUpdate} disabled={isUpdating || !newRate}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Rate
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Rate History</CardTitle>
                    <CardDescription>Recent changes to the exchange rate.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Old Rate</TableHead>
                                <TableHead>New Rate</TableHead>
                                <TableHead>Changed By</TableHead>
                                <TableHead>Note</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {history?.map((entry) => (
                                <TableRow key={entry._id}>
                                    <TableCell>{new Date(entry.updatedAt).toLocaleString()}</TableCell>
                                    <TableCell>{entry.oldRate}</TableCell>
                                    <TableCell className="font-medium">{entry.newRate}</TableCell>
                                    <TableCell>{entry.user?.name || "Unknown"}</TableCell>
                                    <TableCell className="text-muted-foreground italic">{entry.note || "-"}</TableCell>
                                </TableRow>
                            ))}
                            {(!history || history.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-4">No history available</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
