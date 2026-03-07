"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Id } from "@/convex/_generated/dataModel";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    ShieldAlert,
    ShieldOff,
    Trash2,
    Clock,
    AlertTriangle,
    User,
    MessageSquare,
    Activity,
    Eye,
    ChevronRight,
    Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AccessCodeGenerator } from "./access-code-generator";
import { UserRoleSelect } from "./user-role-select";
import { Settings } from "lucide-react";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ModerationPanel — Main admin moderation interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ModerationPanel() {
    const [activeSection, setActiveSection] = useState<
        "overview" | "suspended" | "activity" | "patterns" | "access" | "settings" | "sessions"
    >("overview");

    return (
        <div className="space-y-6">
            {/* Section Navigation */}
            {/* Section Navigation */}
            <div className="flex gap-2 p-1.5 bg-muted/30 rounded-xl overflow-x-auto scrollbar-hide shrink-0 snap-x">
                {[
                    { key: "overview" as const, icon: <ShieldAlert className="h-4 w-4" />, label: "Suspend" },
                    { key: "suspended" as const, icon: <ShieldOff className="h-4 w-4" />, label: "History" },
                    { key: "sessions" as const, icon: <Activity className="h-4 w-4" />, label: "Sessions" },
                    { key: "access" as const, icon: <Lock className="h-4 w-4" />, label: "Access" },
                    { key: "activity" as const, icon: <Activity className="h-4 w-4" />, label: "Logs" },
                    { key: "patterns" as const, icon: <Eye className="h-4 w-4" />, label: "Spam" },
                    { key: "settings" as const, icon: <Settings className="h-4 w-4" />, label: "Roles" },
                ].map((section) => (
                    <Button
                        key={section.key}
                        variant={activeSection === section.key ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                            "gap-2 text-xs font-bold rounded-lg shrink-0 h-10 px-4 snap-start",
                            activeSection === section.key ? "shadow-md bg-[#E07A5F] hover:bg-[#D06A4F]" : "text-stone-600 hover:bg-muted/60"
                        )}
                        onClick={() => setActiveSection(section.key)}
                    >
                        {section.icon}
                        {section.label}
                    </Button>
                ))}
            </div>

            {/* Section Content */}
            {activeSection === "overview" && <SuspendUserSection />}
            {activeSection === "suspended" && <SuspendedUsersSection />}
            {activeSection === "sessions" && <ActiveSessionsSection />}
            {activeSection === "access" && <AccessCodeGenerator />}
            {activeSection === "activity" && <ActivityLogSection />}
            {activeSection === "patterns" && <SuspiciousPatternsSection />}
            {activeSection === "settings" && <SettingsSection />}
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. Settings Section (Role Management)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SettingsSection() {
    const { sessionId } = useAuth();
    const users = useQuery(api.users.getAllUsers, sessionId ? { sessionId } : "skip");

    if (!users) return <div className="text-sm text-muted-foreground p-4">Loading users...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4" />
                <h3 className="text-base font-semibold">Settings & Roles</h3>
            </div>

            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
                <table className="w-full text-sm hidden md:table">
                    <thead className="bg-muted/50 border-b">
                        <tr className="text-left">
                            <th className="p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">User</th>
                            <th className="p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Joined</th>
                            <th className="p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Role</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {users.map((u) => (
                            <tr key={u._id} className="hover:bg-muted/10 transition-colors">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border-2 border-muted">
                                            <AvatarImage src={u.avatarUrl ?? u.imageUrl} />
                                            <AvatarFallback className="text-xs font-bold">
                                                {u.name?.charAt(0) || u.username?.charAt(0) || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-stone-800">{u.name || u.username}</span>
                                            <span className="text-[10px] font-medium text-stone-500">@{u.username}</span>
                                        </div>
                                        {u.suspended && (
                                            <Badge variant="destructive" className="ml-2 text-[10px] h-5 px-2 font-black uppercase tracking-tighter">
                                                Suspended
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-stone-500 text-xs font-semibold">
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                    <UserRoleSelect
                                        userId={u._id}
                                        currentRole={u.role}
                                        currentIsAdmin={u.isAdmin}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile View */}
                <div className="divide-y divide-border/60 md:hidden">
                    {users.map((u) => (
                        <div key={u._id} className="p-4 flex flex-col gap-3 active:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={u.avatarUrl ?? u.imageUrl} />
                                    <AvatarFallback className="font-bold">{u.name?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold truncate text-base">{u.name || u.username}</span>
                                        {u.suspended && (
                                            <Badge variant="destructive" className="text-[9px] h-4 px-1.5 font-bold uppercase">Banned</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-stone-500 font-medium">Joined {new Date(u.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-dashed border-border/40">
                                <UserRoleSelect
                                    userId={u._id}
                                    currentRole={u.role}
                                    currentIsAdmin={u.isAdmin}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Suspend User Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SuspendUserSection() {
    const { sessionId } = useAuth();
    const users = useQuery(api.users.getAllUsers, sessionId ? { sessionId } : "skip");
    const suspendUser = useMutation(api.moderation.suspendUser);
    const bulkDelete = useMutation(api.messages.adminBulkSoftDeleteUserMessages);
    const { toast } = useToast();

    const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
    const [suspendReason, setSuspendReason] = useState("");
    const [deleteReason, setDeleteReason] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    if (!users) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                ))}
            </div>
        );
    }

    const nonAdminUsers = users.filter((u) => !u.isAdmin);

    const handleSuspend = async () => {
        if (!sessionId || !selectedUserId) return;
        try {
            await suspendUser({
                sessionId,
                userId: selectedUserId,
                reason: suspendReason || undefined,
            });
            toast({ description: "User suspended successfully." });
            setSuspendDialogOpen(false);
            setSuspendReason("");
            setSelectedUserId(null);
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "Failed to suspend user." });
        }
    };

    const handleBulkDelete = async () => {
        if (!sessionId || !selectedUserId) return;
        try {
            const result = await bulkDelete({
                sessionId,
                userId: selectedUserId,
                reason: deleteReason || undefined,
            });
            toast({ description: `${(result as any)?.deletedCount || 0} messages removed.` });
            setDeleteDialogOpen(false);
            setDeleteReason("");
            setSelectedUserId(null);
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "Failed to delete messages." });
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base font-semibold">User Management</h3>
                <span className="text-xs text-muted-foreground">
                    ({nonAdminUsers.length} non-admin users)
                </span>
            </div>

            <div className="border rounded-xl divide-y bg-card overflow-hidden shadow-sm">
                {nonAdminUsers.map((u) => (
                    <div key={u._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 hover:bg-muted/10 transition-colors active:bg-muted/20">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-11 w-11 shadow-sm shrink-0 border border-border/50">
                                <AvatarImage src={u.avatarUrl ?? u.imageUrl} />
                                <AvatarFallback className="text-sm font-black">
                                    {u.name?.charAt(0) || u.username?.charAt(0) || "?"}
                                </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <span className="text-base font-black truncate text-stone-800">
                                        {u.name || u.username}
                                    </span>
                                    {u.role === "moderator" && (
                                        <Badge variant="default" className="text-[9px] px-2 py-0.5 h-4 bg-green-500 hover:bg-green-600 border-none shadow-none font-bold uppercase tracking-tight">
                                            MODERATOR
                                        </Badge>
                                    )}
                                    {u.suspended && (
                                        <Badge variant="destructive" className="text-[9px] px-2 py-0.5 h-4 font-bold uppercase tracking-tight">
                                            BANNED
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-stone-500">
                                    Joined {new Date(u.createdAt).toLocaleDateString()} • @{u.username}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-dashed border-border/60">
                            {/* Suspend Button */}
                            {!u.suspended && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 sm:flex-none h-11 px-4 gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 font-bold text-xs"
                                    onClick={() => {
                                        setSelectedUserId(u._id);
                                        setSuspendDialogOpen(true);
                                    }}
                                >
                                    <ShieldAlert className="h-4 w-4" />
                                    Suspend
                                </Button>
                            )}

                            {/* Bulk Delete Messages */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 sm:flex-none h-11 px-4 gap-2 text-orange-600 border-orange-200 hover:bg-orange-50 font-bold text-xs"
                                onClick={() => {
                                    setSelectedUserId(u._id);
                                    setDeleteDialogOpen(true);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                Clear All
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Suspend Dialog */}
            <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <ShieldAlert className="h-5 w-5" />
                            Suspend User
                        </DialogTitle>
                        <DialogDescription>
                            This will prevent the user from sending messages, reacting, or editing.
                            They will see a suspension notice in the chat.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Reason (optional)</label>
                            <Input
                                value={suspendReason}
                                onChange={(e) => setSuspendReason(e.target.value)}
                                placeholder="Violation of community guidelines..."
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setSuspendDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleSuspend}>
                            Confirm Suspension
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Delete Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-orange-600">
                            <Trash2 className="h-5 w-5" />
                            Remove All Messages
                        </DialogTitle>
                        <DialogDescription>
                            This will soft-delete all messages from this user across all channels.
                            Messages will be replaced with "[Message removed by moderator]".
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium">Reason (optional)</label>
                            <Input
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                                placeholder="Spam / inappropriate content..."
                                className="h-9 text-sm"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="default"
                            size="sm"
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                            onClick={handleBulkDelete}
                        >
                            Remove All Messages
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. Suspended Users Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SuspendedUsersSection() {
    const { sessionId } = useAuth();
    const suspendedUsers = useQuery(
        api.moderation.getSuspendedUsers,
        sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip"
    );
    const unsuspendUser = useMutation(api.moderation.unsuspendUser);
    const { toast } = useToast();

    if (suspendedUsers === undefined) {
        return (
            <div className="space-y-3">
                {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
            </div>
        );
    }

    if (suspendedUsers.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <ShieldOff className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No suspended users</p>
                <p className="text-xs mt-1">All community members are in good standing.</p>
            </div>
        );
    }

    const handleUnsuspend = async (userId: Id<"users">) => {
        if (!sessionId) return;
        try {
            await unsuspendUser({ sessionId, userId });
            toast({ description: "User unsuspended." });
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "Failed to unsuspend." });
        }
    };

    return (
        <div className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
                <ShieldOff className="h-4 w-4 text-destructive" />
                Suspended Users ({suspendedUsers.length})
            </h3>

            <div className="border rounded-xl divide-y bg-card overflow-hidden shadow-sm">
                {suspendedUsers.map((u: any) => (
                    <div key={u._id} className="p-4 bg-destructive/5 hover:bg-destructive/[0.08] transition-colors active:bg-destructive/10">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Avatar className="h-11 w-11 grayscale ring-2 ring-destructive/20 shrink-0 shadow-sm border border-destructive/10">
                                    <AvatarImage src={u.avatarUrl ?? u.imageUrl} />
                                    <AvatarFallback className="font-bold">{u.name?.charAt(0) || u.username?.charAt(0) || "?"}</AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-black text-base text-stone-800">{u.name || u.username}</span>
                                        <Badge variant="destructive" className="text-[9px] h-4 px-2 font-black uppercase tracking-tight">Suspended</Badge>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-start gap-1.5">
                                            <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                                            <p className="text-xs text-stone-600 leading-snug">
                                                <span className="font-bold text-stone-500 uppercase text-[9px]">Reason:</span> {u.suspendReason || "No reason documented"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:items-end gap-2 pt-3 sm:pt-0 border-t sm:border-t-0 border-dashed border-destructive/20 w-full sm:w-auto">
                                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-tighter sm:text-right">
                                    Banned by {u.suspendedByName}
                                    <br />
                                    {u.suspendedAt && new Date(u.suspendedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-11 px-5 gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 font-bold text-sm w-full sm:w-auto shadow-sm active:scale-95 transition-all"
                                    onClick={() => handleUnsuspend(u._id)}
                                >
                                    <ShieldOff className="h-4 w-4" />
                                    Unsuspend
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div >
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. Activity Log Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ACTION_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
    user_suspended: { label: "User Suspended", emoji: "🚫", color: "text-destructive" },
    user_unsuspended: { label: "User Unsuspended", emoji: "✅", color: "text-green-600" },
    message_deleted: { label: "Message Deleted", emoji: "🗑️", color: "text-orange-600" },
    messages_bulk_deleted: { label: "Bulk Messages Deleted", emoji: "🗑️", color: "text-orange-600" },
    user_role_changed: { label: "Role Changed", emoji: "👤", color: "text-blue-600" },
    channel_locked: { label: "Channel Locked", emoji: "🔒", color: "text-yellow-600" },
    channel_unlocked: { label: "Channel Unlocked", emoji: "🔓", color: "text-green-600" },
    badge_granted: { label: "Badge Granted", emoji: "🎖️", color: "text-purple-600" },
    badge_revoked: { label: "Badge Revoked", emoji: "❌", color: "text-red-600" },
};

function ActivityLogSection() {
    const { sessionId } = useAuth();
    const activityLog = useQuery(
        api.moderation.getActivityLog,
        sessionId ? { sessionId: sessionId as Id<"sessions">, limit: 50 } : "skip"
    );

    if (activityLog === undefined) {
        return (
            <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
            </div>
        );
    }

    if (activityLog.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No moderation activity yet</p>
                <p className="text-xs mt-1">Actions taken by admins will appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Activity Log ({activityLog.length} entries)
            </h3>

            <div className="border rounded-xl divide-y bg-card overflow-hidden shadow-sm max-h-[600px] overflow-y-auto">
                {activityLog.map((log: any) => {
                    const actionInfo = ACTION_LABELS[log.action] || {
                        label: log.action,
                        emoji: "📋",
                        color: "text-muted-foreground",
                    };
                    const metadata = log.metadata ? JSON.parse(log.metadata) : null;

                    return (
                        <div key={log._id} className="p-4 hover:bg-muted/10 transition-colors active:bg-muted/20">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#F4E9DD] flex items-center justify-center shrink-0 text-lg shadow-inner border border-[#E2D7C9]/30">
                                    {actionInfo.emoji}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className={cn("text-sm font-black uppercase tracking-tight", actionInfo.color)}>
                                            {actionInfo.label}
                                        </span>
                                        {log.targetUser && (
                                            <span className="text-[10px] font-bold text-stone-500 bg-muted px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                <User className="h-2.5 w-2.5" />
                                                {log.targetUser.name}
                                            </span>
                                        )}
                                        {log.targetChannel && (
                                            <span className="text-[10px] font-bold text-stone-500 bg-muted px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                                <MessageSquare className="h-2.5 w-2.5" />
                                                #{log.targetChannel.name}
                                            </span>
                                        )}
                                    </div>

                                    {log.reason && (
                                        <p className="text-xs text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-100 italic mb-2">
                                            "{log.reason}"
                                        </p>
                                    )}

                                    {metadata?.count && (
                                        <p className="text-[10px] font-black text-orange-600 uppercase mb-2">
                                            {metadata.count} messages affected
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between mt-2 flex-wrap gap-2 pt-2 border-t border-dashed border-border/40">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="h-2 w-2 text-primary" />
                                            </div>
                                            <span className="text-[10px] font-bold text-stone-500">
                                                {log.actor.name}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-bold text-stone-400 flex items-center gap-1">
                                            <Clock className="h-2.5 w-2.5" />
                                            {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. Suspicious Patterns Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
    high: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
    medium: { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20" },
    low: { bg: "bg-yellow-500/10", text: "text-yellow-700", border: "border-yellow-500/20" },
};

const PATTERN_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
    rapid_posting: { label: "Rapid Posting", icon: <Activity className="h-3.5 w-3.5" /> },
    new_account_spam: { label: "New Account Spam", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
    duplicate_messages: { label: "Duplicate Messages", icon: <MessageSquare className="h-3.5 w-3.5" /> },
    high_delete_rate: { label: "High Moderation Rate", icon: <Trash2 className="h-3.5 w-3.5" /> },
};

function SuspiciousPatternsSection() {
    const { sessionId } = useAuth();
    const patterns = useQuery(
        api.moderation.getSuspiciousPatterns,
        sessionId ? { sessionId: sessionId as Id<"sessions"> } : "skip"
    );
    const suspendUser = useMutation(api.moderation.suspendUser);
    const { toast } = useToast();

    if (patterns === undefined) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
            </div>
        );
    }

    if (patterns.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No suspicious patterns detected</p>
                <p className="text-xs mt-1">
                    The system monitors for rapid posting, duplicate messages,
                    new account spam, and high moderation rates.
                </p>
            </div>
        );
    }

    const handleQuickSuspend = async (userId: Id<"users">, reason: string) => {
        if (!sessionId) return;
        try {
            await suspendUser({ sessionId, userId, reason });
            toast({ description: "User suspended." });
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "Failed to suspend." });
        }
    };

    return (
        <div className="space-y-3">
            <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Suspicious Patterns ({patterns.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    Automated heuristics detecting potential abuse. Review before taking action.
                </p>
            </div>

            <div className="grid gap-4">
                {patterns.length === 0 ? (
                    <div className="text-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed border-muted">
                        <Eye className="h-12 w-12 mx-auto mb-4 text-stone-300" />
                        <p className="text-base font-black text-stone-500">Heuristics Clear</p>
                        <p className="text-xs text-stone-400 max-w-[200px] mx-auto mt-1">No suspicious activity detected by the guard system.</p>
                    </div>
                ) : patterns.map((pattern: any, index: number) => {
                    const severity = SEVERITY_STYLES[pattern.severity] || SEVERITY_STYLES.low;
                    const patternInfo = PATTERN_LABELS[pattern.type] || {
                        label: pattern.type,
                        icon: <AlertTriangle className="h-4 w-4" />,
                    };

                    return (
                        <div
                            key={`${pattern.userId}-${pattern.type}-${index}`}
                            className={cn(
                                "group relative overflow-hidden rounded-2xl border-2 transition-all p-4 flex flex-col sm:flex-row gap-4",
                                severity.bg,
                                severity.border
                            )}
                        >
                            <div className={cn(
                                "flex items-center justify-center w-12 h-12 rounded-xl shrink-0 shadow-sm",
                                severity.bg,
                                "brightness-95 contrast-125"
                            )}>
                                <div className={severity.text}>{patternInfo.icon}</div>
                            </div>

                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn("text-sm font-black uppercase tracking-tight", severity.text)}>
                                        {patternInfo.label}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[9px] px-2 py-0.5 font-black uppercase tracking-widest",
                                            severity.text,
                                            severity.border,
                                            "bg-white/50"
                                        )}
                                    >
                                        {pattern.severity}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6 border border-stone-200">
                                        <AvatarImage src={pattern.avatarUrl} />
                                        <AvatarFallback className="text-[10px] font-bold">{pattern.name?.charAt(0) || "?"}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex items-baseline gap-1.5 min-w-0">
                                        <span className="text-sm font-black text-stone-800 truncate">{pattern.name || pattern.username}</span>
                                        <span className="text-[10px] font-bold text-stone-400 uppercase">@{pattern.username}</span>
                                    </div>
                                </div>

                                <p className="text-xs text-stone-600 leading-relaxed bg-white/40 p-2.5 rounded-xl border border-stone-200/50">
                                    {pattern.description}
                                </p>
                            </div>

                            <div className="flex flex-col justify-center sm:min-w-[120px]">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-11 w-full sm:h-12 px-5 gap-2 font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                    onClick={() =>
                                        handleQuickSuspend(
                                            pattern.userId,
                                            `Auto-flagged: ${patternInfo.label} — ${pattern.description}`
                                        )
                                    }
                                >
                                    <ShieldAlert className="h-4 w-4" />
                                    Ban User
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. Active Sessions Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ActiveSessionsSection() {
    const { sessionId } = useAuth();
    const sessionInfos = useQuery(api.auth_session.getAllSessions, sessionId ? { sessionId } : "skip");
    const forceLogout = useMutation(api.auth_session.forceLogoutUser);
    const { toast } = useToast();

    if (!sessionInfos) return <div className="text-sm p-4 text-muted-foreground">Loading active sessions...</div>;

    const handleForceLogout = async (userId: Id<"users">) => {
        if (!sessionId) return;
        try {
            await forceLogout({ sessionId, userId });
            toast({ description: "User session terminated successfully." });
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "Failed to force logout." });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4" />
                <h3 className="text-base font-semibold">User Sessions</h3>
            </div>

            <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
                {/* Desktop View Table */}
                <table className="w-full text-sm hidden md:table">
                    <thead className="bg-muted/50 border-b text-left">
                        <tr>
                            <th className="p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">User</th>
                            <th className="p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Last Device</th>
                            <th className="p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider">Status</th>
                            <th className="p-4 font-bold text-muted-foreground uppercase text-[10px] tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {sessionInfos.map((info) => (
                            <tr key={info._id} className="hover:bg-muted/10 transition-colors">
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-sm text-stone-800">{info.name || info.username}</span>
                                        <span className="text-[10px] font-medium text-stone-500">@{info.username}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold">{info.lastLoginDeviceLabel || "Unknown Device"}</span>
                                        <span className="text-[10px] text-stone-400 font-mono">{info.lastLoginIpApprox || "IP Unknown"}</span>
                                    </div>
                                </td>
                                <td className="p-4">
                                    <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[9px] font-black uppercase tracking-tighter">
                                        Active
                                    </Badge>
                                </td>
                                <td className="p-4 text-right">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-9 px-3 gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 font-bold text-xs"
                                        onClick={() => handleForceLogout(info._id)}
                                    >
                                        <ShieldOff className="h-3.5 w-3.5" />
                                        Kill Session
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Mobile View Cards */}
                <div className="divide-y divide-border/60 md:hidden">
                    {sessionInfos.map((info) => (
                        <div key={info._id} className="p-4 flex flex-col gap-3 active:bg-muted/10 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="space-y-0.5">
                                    <p className="font-bold text-base text-stone-800">{info.name || info.username}</p>
                                    <p className="text-xs text-stone-500 font-medium tracking-tight">@{info.username}</p>
                                </div>
                                <Badge variant="secondary" className="bg-green-100 text-green-700 border-none text-[9px] font-black uppercase tracking-tighter">Live</Badge>
                            </div>

                            <div className="bg-[#F4E9DD]/50 p-3 rounded-xl border border-[#E2D7C9]/30 space-y-2">
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-stone-400 uppercase">Device</span>
                                    <span className="font-black text-stone-700">{info.lastLoginDeviceLabel || "Unknown"}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className="font-bold text-stone-400 uppercase">IP Address</span>
                                    <span className="font-mono text-stone-600">{info.lastLoginIpApprox || "?.?.?.?"}</span>
                                </div>
                            </div>

                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full h-11 gap-2 font-black text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all"
                                onClick={() => handleForceLogout(info._id)}
                            >
                                <ShieldOff className="h-4 w-4" />
                                Terminate Session
                            </Button>
                        </div>
                    ))}
                    {sessionInfos.length === 0 && (
                        <div className="p-8 text-center text-stone-400 italic text-sm">
                            No active sessions found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
