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
        "overview" | "suspended" | "activity" | "patterns" | "access" | "settings"
    >("overview");

    return (
        <div className="space-y-6">
            {/* Section Navigation */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { key: "overview" as const, icon: <ShieldAlert className="h-3.5 w-3.5" />, label: "Suspend Users" },
                    { key: "suspended" as const, icon: <ShieldOff className="h-3.5 w-3.5" />, label: "Suspended Users" },
                    { key: "access" as const, icon: <Lock className="h-3.5 w-3.5" />, label: "Access Codes" },
                    { key: "activity" as const, icon: <Activity className="h-3.5 w-3.5" />, label: "Activity Log" },
                    { key: "patterns" as const, icon: <Eye className="h-3.5 w-3.5" />, label: "Suspicious Patterns" },
                    { key: "settings" as const, icon: <Settings className="h-3.5 w-3.5" />, label: "Settings" },
                ].map((section) => (
                    <Button
                        key={section.key}
                        variant={activeSection === section.key ? "secondary" : "outline"}
                        size="sm"
                        className={cn(
                            "gap-1.5 text-xs",
                            activeSection === section.key && "shadow-sm"
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
    const users = useQuery(api.users.getAllUsers, { sessionId: sessionId ?? undefined });

    if (!users) return <div className="text-sm text-muted-foreground p-4">Loading users...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <Settings className="h-4 w-4" />
                <h3 className="text-base font-semibold">Settings & Roles</h3>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b">
                        <tr className="text-left">
                            <th className="p-3 font-medium text-muted-foreground">User</th>
                            <th className="p-3 font-medium text-muted-foreground">Joined</th>
                            <th className="p-3 font-medium text-muted-foreground">Role</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {users.map((u) => (
                            <tr key={u._id} className="hover:bg-muted/20 transition-colors">
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={u.imageUrl} />
                                            <AvatarFallback className="text-xs">
                                                {u.name?.charAt(0) || u.username?.charAt(0) || "?"}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{u.name || u.username}</span>
                                            <span className="text-[10px] text-muted-foreground">@{u.username}</span>
                                        </div>
                                        {u.suspended && (
                                            <Badge variant="destructive" className="ml-2 text-[9px] h-4 px-1.5">
                                                Suspended
                                            </Badge>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3 text-muted-foreground text-xs">
                                    {new Date(u.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-3">
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
            </div>
        </div>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. Suspend User Section
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SuspendUserSection() {
    const { sessionId } = useAuth();
    const users = useQuery(api.users.getAllUsers, { sessionId: sessionId ?? undefined });
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

            <div className="border rounded-lg divide-y">
                {nonAdminUsers.map((u) => (
                    <div key={u._id} className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={u.imageUrl} />
                            <AvatarFallback className="text-xs">
                                {u.name?.charAt(0) || u.username?.charAt(0) || "?"}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">
                                    {u.name || u.username}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    @{u.username}
                                </span>
                                {u.suspended && (
                                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                                        Suspended
                                    </Badge>
                                )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Joined {new Date(u.createdAt).toLocaleDateString()}
                            </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            {/* Suspend Button */}
                            {!u.suspended && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs h-7 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => {
                                        setSelectedUserId(u._id);
                                        setSuspendDialogOpen(true);
                                    }}
                                >
                                    <ShieldAlert className="h-3 w-3" />
                                    Suspend
                                </Button>
                            )}

                            {/* Bulk Delete Messages */}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs h-7 gap-1 text-orange-600 hover:text-orange-700 hover:bg-orange-500/10"
                                onClick={() => {
                                    setSelectedUserId(u._id);
                                    setDeleteDialogOpen(true);
                                }}
                            >
                                <Trash2 className="h-3 w-3" />
                                Delete All Msgs
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

            <div className="border rounded-lg divide-y">
                {suspendedUsers.map((u: any) => (
                    <div key={u._id} className="p-4 bg-destructive/3 hover:bg-destructive/5 transition-colors">
                        <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10 grayscale ring-2 ring-destructive/20">
                                <AvatarImage src={u.imageUrl} />
                                <AvatarFallback>{u.name?.charAt(0) || u.username?.charAt(0) || "?"}</AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{u.name || u.username}</span>
                                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 h-4">
                                        Suspended
                                    </Badge>
                                </div>
                                <div className="mt-1 space-y-0.5">
                                    <p className="text-[11px] text-muted-foreground">
                                        <span className="font-medium">Reason:</span> {u.suspendReason || "No reason provided"}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        <span className="font-medium">By:</span> {u.suspendedByName} •{" "}
                                        {u.suspendedAt && new Date(u.suspendedAt).toLocaleDateString(undefined, {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </p>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="shrink-0 gap-1.5 text-xs text-green-600 hover:text-green-700 hover:bg-green-500/10 border-green-500/20"
                                onClick={() => handleUnsuspend(u._id)}
                            >
                                <ShieldOff className="h-3 w-3" />
                                Unsuspend
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
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

            <div className="border rounded-lg divide-y max-h-[500px] overflow-y-auto">
                {activityLog.map((log: any) => {
                    const actionInfo = ACTION_LABELS[log.action] || {
                        label: log.action,
                        emoji: "📋",
                        color: "text-muted-foreground",
                    };
                    const metadata = log.metadata ? JSON.parse(log.metadata) : null;

                    return (
                        <div key={log._id} className="p-3 hover:bg-muted/20 transition-colors">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0 text-sm">
                                    {actionInfo.emoji}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={cn("text-xs font-semibold", actionInfo.color)}>
                                            {actionInfo.label}
                                        </span>
                                        {log.targetUser && (
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                <ChevronRight className="h-2.5 w-2.5" />
                                                <User className="h-2.5 w-2.5" />
                                                {log.targetUser.name}
                                            </span>
                                        )}
                                        {log.targetChannel && (
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                                <ChevronRight className="h-2.5 w-2.5" />
                                                #{log.targetChannel.name}
                                            </span>
                                        )}
                                    </div>

                                    {log.reason && (
                                        <p className="text-[11px] text-muted-foreground mt-0.5 italic">
                                            "{log.reason}"
                                        </p>
                                    )}

                                    {metadata?.count && (
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {metadata.count} messages affected
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] text-muted-foreground">
                                            by {log.actor.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">•</span>
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                            <Clock className="h-2.5 w-2.5" />
                                            {new Date(log.timestamp).toLocaleDateString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
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

            <div className="space-y-2">
                {patterns.map((pattern: any, index: number) => {
                    const severity = SEVERITY_STYLES[pattern.severity] || SEVERITY_STYLES.low;
                    const patternInfo = PATTERN_LABELS[pattern.type] || {
                        label: pattern.type,
                        icon: <AlertTriangle className="h-3.5 w-3.5" />,
                    };

                    return (
                        <div
                            key={`${pattern.userId}-${pattern.type}-${index}`}
                            className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                                severity.bg,
                                severity.border
                            )}
                        >
                            <div className={cn("shrink-0 mt-0.5", severity.text)}>
                                {patternInfo.icon}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn("text-xs font-semibold", severity.text)}>
                                        {patternInfo.label}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[9px] px-1.5 py-0 h-4 uppercase tracking-wider font-bold",
                                            severity.text,
                                            severity.border
                                        )}
                                    >
                                        {pattern.severity}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <User className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs font-medium">
                                        {pattern.name || pattern.username}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        @{pattern.username}
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    {pattern.description}
                                </p>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-xs h-7 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                    handleQuickSuspend(
                                        pattern.userId,
                                        `Auto-flagged: ${patternInfo.label} — ${pattern.description}`
                                    )
                                }
                            >
                                <ShieldAlert className="h-3 w-3" />
                                Suspend
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
