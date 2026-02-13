"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, CheckCheck, BarChart3, Clock, Lock, MessageSquare } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function NotificationBell() {
    const { sessionId } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);

    // User Info
    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
    const isAdmin = currentUser?.isAdmin || currentUser?.role === "admin";

    // Poll Notifications
    const unreadPollCount = useQuery(api.polls.getUnreadNotificationCount, { sessionId: sessionId ?? undefined });
    const pollNotifications = useQuery(api.polls.getMyNotifications, sessionId ? { sessionId } : "skip");
    const markPollRead = useMutation(api.polls.markNotificationRead);
    const markAllPollsRead = useMutation(api.polls.markAllNotificationsRead);

    // Admin Notifications
    const unreadAdminCount = useQuery(api.adminNotifications.getUnreadAdminNotificationCount, { sessionId: sessionId ?? undefined });
    const adminNotifications = useQuery(api.adminNotifications.getAdminNotifications, sessionId ? { sessionId } : "skip");
    const markAdminRead = useMutation(api.adminNotifications.markNotificationRead);
    const markAllAdminRead = useMutation(api.adminNotifications.markAllNotificationsRead);

    if (!sessionId) return null;

    const totalUnread = (unreadPollCount ?? 0) + (isAdmin ? (unreadAdminCount ?? 0) : 0);

    const handlePollClick = async (notif: any) => {
        if (!sessionId) return;
        if (!notif.read) await markPollRead({ sessionId, notificationId: notif._id });
        setOpen(false);
        // Navigate if applicable (e.g. to poll or channel)
        if (notif.channelId) {
            router.push(`/channel/${notif.channelId}`);
        }
    };

    const handleAdminClick = async (notif: any) => {
        if (!sessionId) return;
        if (!notif.read) await markAdminRead({ sessionId, notificationId: notif._id });
        setOpen(false);
        if (notif.channelId) {
            // Include msg param for highlighting
            router.push(`/channel/${notif.channelId}?msg=${notif.messageId}`);
        }
    };

    const handleMarkAllPollsRead = async () => {
        if (!sessionId) return;
        await markAllPollsRead({ sessionId });
    };

    const handleMarkAllAdminRead = async () => {
        if (!sessionId) return;
        await markAllAdminRead({ sessionId });
    };

    const getRelativeTime = (ts: number) => {
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        const days = Math.floor(hrs / 24);
        return `${days}d ago`;
    };

    const renderEmpty = (text: string) => (
        <div className="py-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{text}</p>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="h-4 w-4" />
                    {totalUnread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold animate-in zoom-in-50">
                            {totalUnread > 9 ? "9+" : totalUnread}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px] max-h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5 text-primary" />
                        Notifications
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col">
                    {isAdmin ? (
                        <Tabs defaultValue="activity" className="flex-1 flex flex-col">
                            <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                                <TabsTrigger value="activity" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 pt-3">
                                    Activity
                                    {(unreadPollCount ?? 0) > 0 && (
                                        <span className="ml-2 bg-muted text-foreground text-[10px] px-1.5 py-0.5 rounded-full">{unreadPollCount}</span>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="admin" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-3 pt-3">
                                    Admin
                                    {(unreadAdminCount ?? 0) > 0 && (
                                        <span className="ml-2 bg-muted text-foreground text-[10px] px-1.5 py-0.5 rounded-full">{unreadAdminCount}</span>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="activity" className="flex-1 overflow-y-auto p-4 pt-2 m-0 data-[state=inactive]:hidden">
                                <div className="flex justify-end mb-2">
                                    {(unreadPollCount ?? 0) > 0 && (
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleMarkAllPollsRead}>
                                            Mark all read
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {(!pollNotifications || pollNotifications.length === 0) && renderEmpty("No recent activity")}
                                    {pollNotifications?.map((notif: any) => (
                                        <button
                                            key={notif._id}
                                            onClick={() => handlePollClick(notif)}
                                            className={cn(
                                                "w-full text-left p-3 rounded-lg transition-colors flex items-start gap-2.5",
                                                notif.read ? "opacity-60 hover:bg-muted/20" : "bg-primary/5 hover:bg-primary/10 border border-primary/10"
                                            )}
                                        >
                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", notif.read ? "bg-muted" : "bg-primary/10")}>
                                                <BarChart3 className={cn("h-3.5 w-3.5", notif.read ? "text-muted-foreground" : "text-primary")} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs leading-relaxed">{notif.message}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {getRelativeTime(notif.createdAt)}
                                                </p>
                                            </div>
                                            {!notif.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                                        </button>
                                    ))}
                                </div>
                            </TabsContent>

                            <TabsContent value="admin" className="flex-1 overflow-y-auto p-4 pt-2 m-0 data-[state=inactive]:hidden">
                                <div className="flex justify-end mb-2">
                                    {(unreadAdminCount ?? 0) > 0 && (
                                        <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleMarkAllAdminRead}>
                                            Mark all read
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    {(!adminNotifications || adminNotifications.length === 0) && renderEmpty("No admin notifications")}
                                    {adminNotifications?.map((notif: any) => (
                                        <button
                                            key={notif._id}
                                            onClick={() => handleAdminClick(notif)}
                                            className={cn(
                                                "w-full text-left p-3 rounded-lg transition-colors flex items-start gap-2.5",
                                                notif.read ? "opacity-60 hover:bg-muted/20" : "bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/10"
                                            )}
                                        >
                                            <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center shrink-0", notif.read ? "bg-muted" : "bg-amber-500/10")}>
                                                <MessageSquare className={cn("h-3.5 w-3.5", notif.read ? "text-muted-foreground" : "text-amber-600")} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                    <span className="font-semibold text-xs">{notif.senderName}</span>
                                                    <span className="text-[10px] text-muted-foreground">in #{notif.channelName}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 italic">"{notif.preview}"</p>
                                                <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
                                                    <Clock className="h-3 w-3" />
                                                    {getRelativeTime(notif.createdAt)}
                                                </p>
                                            </div>
                                            {!notif.read && <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />}
                                        </button>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        // Non-admin view (original)
                        <div className="p-4 pt-2 flex-1 overflow-y-auto">
                            <div className="flex justify-end mb-2">
                                {(unreadPollCount ?? 0) > 0 && (
                                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleMarkAllPollsRead}>
                                        Mark all read
                                    </Button>
                                )}
                            </div>
                            <div className="space-y-1">
                                {(!pollNotifications || pollNotifications.length === 0) && renderEmpty("No recent activity")}
                                {pollNotifications?.map((notif: any) => (
                                    <button
                                        key={notif._id}
                                        onClick={() => handlePollClick(notif)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-lg transition-colors flex items-start gap-2.5",
                                            notif.read ? "opacity-60 hover:bg-muted/20" : "bg-primary/5 hover:bg-primary/10 border border-primary/10"
                                        )}
                                    >
                                        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", notif.read ? "bg-muted" : "bg-primary/10")}>
                                            <BarChart3 className={cn("h-3.5 w-3.5", notif.read ? "text-muted-foreground" : "text-primary")} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs leading-relaxed">{notif.message}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                                                <Clock className="h-3 w-3" />
                                                {getRelativeTime(notif.createdAt)}
                                            </p>
                                        </div>
                                        {!notif.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
