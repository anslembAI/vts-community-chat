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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* INBOX SECTION */}
            <div className="vts-panel space-y-4 rounded-[1.75rem] p-5">
                <div className="flex items-center justify-between border-b border-white/35 pb-3">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-[#2c3034]">
                        <Mail className="h-5 w-5 text-black/45" /> Inbox & Sent
                    </h3>
                    {emails === undefined && <RefreshCw className="h-4 w-4 animate-spin text-black/35" />}
                </div>

                <ScrollArea className="h-[500px] pr-4">
                    {!emails?.length && (
                        <div className="py-10 text-center text-sm text-black/35">
                            No emails found. Ensure your webhook is configured.
                        </div>
                    )}

                    <div className="space-y-3">
                        {emails?.map((email: any) => (
                            <div
                                key={email._id}
                                className={`rounded-2xl border p-4 transition-colors ${email.read ? "bg-white/28 border-white/40" : "bg-blue-50/45 border-blue-200"}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant={email.direction === "inbound" ? "secondary" : "outline"} className="capitalize">
                                        {email.direction}
                                    </Badge>
                                    <span className="text-xs text-black/40">
                                        {formatDistanceToNow(email.createdAt, { addSuffix: true })}
                                    </span>
                                </div>

                                <p className="mb-1 truncate text-xs font-medium text-black/40">
                                    {email.direction === "inbound" ? `From: ${email.from}` : `To: ${email.to.join(", ")}`}
                                </p>
                                <h4 className="mb-2 text-sm font-semibold text-[#2c3034]">{email.subject}</h4>
                                <div className="overflow-hidden rounded-xl border border-white/45 bg-white/50 p-3 text-sm text-black/60">
                                    {email.bodyText ? (
                                        <div className="whitespace-pre-wrap line-clamp-[10]">{email.bodyText}</div>
                                    ) : email.bodyHtml ? (
                                        <div
                                            className="prose prose-sm max-w-none line-clamp-[10]"
                                            dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                                        />
                                    ) : (
                                        <span className="italic text-black/35">No content available</span>
                                    )}
                                </div>

                                {!email.read && email.direction === "inbound" && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => markAsRead({ sessionId, emailId: email._id })}
                                        className="mt-3 h-8 w-full text-xs text-blue-600 hover:bg-blue-100 hover:text-blue-800"
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
            <div className="vts-panel flex flex-col rounded-[1.75rem] p-5">
                <div className="mb-4 border-b border-white/35 pb-3">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-[#2c3034]">
                        <Send className="h-5 w-5 text-black/45" /> Send Single Email
                    </h3>
                    <p className="mt-1 text-xs text-black/40">Send an immediate transactional email directly.</p>
                </div>

                <form onSubmit={handleSendEmail} className="space-y-4 flex-1">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-black/55">Recipient(s)</label>
                        <Input
                            value={to}
                            onChange={e => setTo(e.target.value)}
                            placeholder="user@example.com, another@example.com"
                            required
                            className="border-white/45 bg-white/40 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-black/55">Subject</label>
                        <Input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            placeholder="Email Subject"
                            required
                            className="border-white/45 bg-white/40 text-sm"
                        />
                    </div>

                    <div className="space-y-1.5 flex-1 flex flex-col">
                        <label className="text-xs font-semibold text-black/55">Message (Text format)</label>
                        <Textarea
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Type the email content here..."
                            required
                            className="min-h-[200px] flex-1 border-white/45 bg-white/40 text-sm"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={sending}
                        className="w-full rounded-full bg-blue-600 font-semibold text-white transition hover:bg-blue-700"
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
