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
import { Bell, Check, CheckCheck, BarChart3, Clock } from "lucide-react";
import { useState } from "react";

export function NotificationBell() {
    const { sessionId } = useAuth();
    const [open, setOpen] = useState(false);

    const unreadCount = useQuery(api.polls.getUnreadNotificationCount, {
        sessionId: sessionId ?? undefined,
    });

    const notifications = useQuery(
        api.polls.getMyNotifications,
        sessionId ? { sessionId } : "skip"
    );

    const markRead = useMutation(api.polls.markNotificationRead);
    const markAllRead = useMutation(api.polls.markAllNotificationsRead);

    if (!sessionId) return null;

    const handleMarkRead = async (notifId: any) => {
        if (!sessionId) return;
        await markRead({ sessionId, notificationId: notifId });
    };

    const handleMarkAllRead = async () => {
        if (!sessionId) return;
        await markAllRead({ sessionId });
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

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9"
                >
                    <Bell className="h-4 w-4" />
                    {(unreadCount ?? 0) > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold animate-in zoom-in-50">
                            {unreadCount! > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[420px] max-h-[70vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5 text-primary" />
                            Notifications
                        </DialogTitle>
                        {(unreadCount ?? 0) > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs gap-1 text-muted-foreground hover:text-foreground"
                                onClick={handleMarkAllRead}
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </Button>
                        )}
                    </div>
                </DialogHeader>
                <div className="space-y-1">
                    {(!notifications || notifications.length === 0) && (
                        <div className="py-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No notifications yet</p>
                        </div>
                    )}
                    {notifications?.map((notif: any) => (
                        <button
                            key={notif._id}
                            type="button"
                            onClick={() => {
                                if (!notif.read) handleMarkRead(notif._id);
                            }}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${notif.read
                                    ? "opacity-60 hover:bg-muted/20"
                                    : "bg-primary/5 hover:bg-primary/10 border border-primary/10"
                                }`}
                        >
                            <div className="flex items-start gap-2.5">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${notif.read ? "bg-muted" : "bg-primary/10"
                                    }`}>
                                    <BarChart3 className={`h-3.5 w-3.5 ${notif.read ? "text-muted-foreground" : "text-primary"}`} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs leading-relaxed">{notif.message}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-0.5">
                                        <Clock className="h-3 w-3" />
                                        {getRelativeTime(notif.createdAt)}
                                    </p>
                                </div>
                                {!notif.read && (
                                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}
