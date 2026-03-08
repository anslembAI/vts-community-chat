"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw, Send, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export function EmailManagement({ sessionId }: { sessionId: Id<"sessions"> }) {
    const emails = useQuery((api as any).emails.getEmails, { sessionId });
    const markAsRead = useMutation((api as any).emails.markAsRead);
    const [sending, setSending] = useState(false);
    const [sendSuccess, setSendSuccess] = useState(false);

    // Form states
    const [to, setTo] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setSendSuccess(false);
        try {
            const res = await fetch("/api/email/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ to: to.split(",").map(s => s.trim()), subject, message })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setSendSuccess(true);
                setTo("");
                setSubject("");
                setMessage("");
                setTimeout(() => setSendSuccess(false), 3000);
            } else {
                alert(`Failed to send email: ${data.error || "Unknown error"}`);
            }
        } catch (error: any) {
            console.error(error);
            alert(`Error sending email: ${error.message || "Request failed"}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* INBOX SECTION */}
            <div className="p-5 border rounded-xl bg-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Mail className="w-5 h-5 text-zinc-500" /> Inbox & Sent
                    </h3>
                    {emails === undefined && <RefreshCw className="w-4 h-4 animate-spin text-zinc-400" />}
                </div>

                <ScrollArea className="h-[500px] pr-4">
                    {!emails?.length && (
                        <div className="text-center py-10 text-zinc-400 text-sm">
                            No emails found. Ensure your webhook is configured.
                        </div>
                    )}

                    <div className="space-y-3">
                        {emails?.map((email: any) => (
                            <div
                                key={email._id}
                                className={`p-4 rounded-lg border transition-colors ${email.read ? "bg-zinc-50" : "bg-blue-50/50 border-blue-200"}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={email.direction === "inbound" ? "secondary" : "outline"} className="capitalize">
                                        {email.direction}
                                    </Badge>
                                    <span className="text-xs text-zinc-500">
                                        {formatDistanceToNow(email.createdAt, { addSuffix: true })}
                                    </span>
                                </div>

                                <p className="text-xs text-zinc-500 font-medium mb-1 truncate">
                                    {email.direction === "inbound" ? `From: ${email.from}` : `To: ${email.to.join(", ")}`}
                                </p>
                                <h4 className="font-semibold text-sm mb-2 text-zinc-800">{email.subject}</h4>
                                <div className="text-sm text-zinc-600 bg-white p-3 rounded border overflow-hidden">
                                    {email.bodyText ? (
                                        <div className="whitespace-pre-wrap line-clamp-[10]">{email.bodyText}</div>
                                    ) : email.bodyHtml ? (
                                        <div
                                            className="prose prose-sm max-w-none line-clamp-[10]"
                                            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                                        />
                                    ) : (
                                        <span className="italic text-zinc-400">No content available</span>
                                    )}
                                </div>

                                {!email.read && email.direction === "inbound" && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => markAsRead({ sessionId, emailId: email._id })}
                                        className="mt-3 w-full text-xs h-8 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                    >
                                        Mark as Read
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* SEND EMAIL SECTION */}
            <div className="p-5 border rounded-xl bg-white shadow-sm flex flex-col">
                <div className="border-b pb-3 mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Send className="w-5 h-5 text-zinc-500" /> Send Single Email
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">Send an immediate transactional email directly.</p>
                </div>

                <form onSubmit={handleSendEmail} className="space-y-4 flex-1">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Recipient(s)</label>
                        <Input
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            placeholder="user@example.com, another@example.com"
                            required
                            className="text-sm border-zinc-200"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">Subject</label>
                        <Input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Email Subject"
                            required
                            className="text-sm border-zinc-200"
                        />
                    </div>

                    <div className="space-y-1.5 flex-1 flex flex-col">
                        <label className="text-xs font-semibold text-zinc-700">Message (Text format)</label>
                        <Textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Type the email content here..."
                            required
                            className="text-sm border-zinc-200 flex-1 min-h-[200px]"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={sending}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
                    >
                        {sending ? (
                            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : sendSuccess ? (
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-300" />
                        ) : (
                            <Send className="w-4 h-4 mr-2" />
                        )}
                        {sendSuccess ? "Sent Successfully!" : "Send Email"}
                    </Button>
                </form>
            </div>
        </div>
    );
}
