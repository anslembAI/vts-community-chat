"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";

interface MoneyRequestCardProps {
    request: any; // Using any for simplicity as Ids are weird to import sometimes
}

export function MoneyRequestCard({ request }: MoneyRequestCardProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const respondToRequest = useMutation(api.money.respondToMoneyRequest);
    const deleteRequest = useMutation(api.money.deleteMoneyRequest);

    const currentUser = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });
    const isAdmin = currentUser?.isAdmin;

    const handleAction = async (action: "accepted" | "declined" | "cancelled" | "marked_paid") => {
        if (!sessionId) return;
        try {
            await respondToRequest({
                sessionId,
                requestId: request._id,
                action,
            });
            toast({ description: `Request ${action.replace("_", " ")}` });
        } catch (error: any) {
            toast({ variant: "destructive", description: error.message });
        }
    };

    const isRequester = currentUser && request.requesterId === currentUser._id;
    const isRecipient = currentUser && request.recipientId === currentUser._id;
    // If no recipientId, anyone can be consistent (logic handled in backend)
    // But for UI, if no recipientId, show Accept/Decline to everyone (except requester)
    const canRespond = currentUser && !isRequester && (request.recipientId ? isRecipient : true);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending": return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
            case "accepted": return "bg-blue-500/10 text-blue-600 border-blue-200";
            case "paid": return "bg-green-500/10 text-green-600 border-green-200";
            case "declined": return "bg-red-500/10 text-red-600 border-red-200";
            case "cancelled": return "bg-gray-500/10 text-gray-600 border-gray-200";
            case "expired": return "bg-orange-500/10 text-orange-600 border-orange-200";
            default: return "bg-secondary text-secondary-foreground";
        }
    };

    return (
        <Card className="w-full max-w-md my-2 border-l-4 border-l-primary shadow-sm">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Money Request</span>
                    <span className="text-sm font-medium">
                        From: {request.requester?.name || request.requester?.username || "Unknown"}
                    </span>
                    {request.recipient && (
                        <span className="text-xs text-muted-foreground">To: {request.recipient.name || request.recipient.username}</span>
                    )}
                </div>
                <Badge variant="outline" className={getStatusColor(request.status)}>
                    {request.status.replace("_", " ").toUpperCase()}
                </Badge>
            </CardHeader>
            <CardContent className="p-4 py-2 space-y-2">
                <div className="flex flex-col gap-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{request.amount} {request.currency}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                        ≈ {request.convertedAmount} {request.convertedCurrency}
                        <span className="text-xs opacity-70">(Rate: {request.rateLocked})</span>
                    </div>
                </div>
                {request.note && (
                    <div className="bg-muted/50 p-2 rounded-md text-sm italic">
                        "{request.note}"
                    </div>
                )}
                {request.dueDate && (
                    <div className="text-xs text-red-500">
                        Due: {new Date(request.dueDate).toLocaleDateString()}
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-4 pt-2 flex flex-wrap justify-end gap-2">
                {request.status === "pending" && (
                    <>
                        {(isRequester || isAdmin) && (
                            <Button variant="outline" size="sm" onClick={() => handleAction("cancelled")}>
                                Cancel
                            </Button>
                        )}
                        {canRespond && (
                            <>
                                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleAction("declined")}>
                                    Decline
                                </Button>
                                <Button variant="default" size="sm" onClick={() => handleAction("accepted")}>
                                    Accept
                                </Button>
                            </>
                        )}
                    </>
                )}

                {request.status === "accepted" && (
                    <>
                        {/* Admin or requester can still cancel if needed to void it? Backend says yes. */}
                        {(isAdmin || isRequester) && (
                            <Button variant="outline" size="sm" onClick={() => handleAction("cancelled")}>
                                Cancel
                            </Button>
                        )}

                        {(isRequester || isRecipient || isAdmin) && (
                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleAction("marked_paid")}>
                                Mark Paid
                            </Button>
                        )}
                    </>
                )}

                {request.status === "paid" && isAdmin && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                            if (window.confirm("Are you sure you want to delete this requests? This cannot be undone.")) {
                                deleteRequest({
                                    sessionId: sessionId!,
                                    requestId: request._id
                                })
                                    .then(() => toast({ description: "Request deleted" }))
                                    .catch((e: any) => toast({ variant: "destructive", description: e.message }));
                            }
                        }}
                    >
                        Delete
                    </Button>
                )}

                <div className="flex-1" />
                <span className="text-[10px] text-muted-foreground self-center">
                    {formatDistanceToNow(request.createdAt)} ago
                </span>
            </CardFooter>
        </Card>
    );
}
