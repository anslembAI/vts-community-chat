
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Loader2, Plus, Shield, Trash, ArrowLeft, Mail, Search, X, UserMinus, UserPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { Id } from "@/convex/_generated/dataModel";
import { PremiumPlusButton } from "@/components/ui/premium-plus-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Leaderboard } from "@/components/reputation/leaderboard";
import { BadgeList, ReputationScore } from "@/components/reputation/reputation-badge";
import dynamic from "next/dynamic";
const ExchangeRateSettings = dynamic(() => import("@/components/admin/exchange-rate-settings").then(m => ({ default: m.ExchangeRateSettings })), {
    loading: () => <div className="p-4 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
});
const ModerationPanel = dynamic(() => import("@/components/admin/moderation-panel").then(m => ({ default: m.ModerationPanel })), {
    loading: () => <div className="p-4 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
});
const EmailManagement = dynamic(() => import("@/components/admin/email-management").then(m => ({ default: m.EmailManagement })), {
    loading: () => <div className="p-4 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
});
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { SoundSettingsControl } from "@/components/chat/sound-settings-trigger";

function AdminGuard({ children }: { children: React.ReactNode }) {
    const { sessionId } = useAuth();
    const user = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
    const router = useRouter();

    useEffect(() => {
        if (user !== undefined && !user?.isAdmin) {
            router.push("/");
        }
    }, [user, router]);

    if (user === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="vts-panel flex min-h-[240px] w-full max-w-3xl items-center justify-center rounded-[2rem]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        );
    }

    if (!user?.isAdmin) return null;

    return <div className="vts-app-shell flex h-full flex-col overflow-hidden p-2 md:p-4">{children}</div>;
}

function UserManagement() {
    const { sessionId } = useAuth();
    const users = useQuery(api.users.getAllUsers, sessionId ? { sessionId } : "skip");
    const updateUserRole = useMutation(api.users.updateUserRole);
    const deleteUser = useMutation(api.users.deleteUser);
    const createUser = useMutation(api.users.createUser);
    const reset2FA = useMutation(api.security.adminResetUser2FA);
    const { toast } = useToast();

    // Create User State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newIsAdmin, setNewIsAdmin] = useState(false);

    if (!users) return <div className="vts-panel rounded-[1.75rem] p-6 text-sm text-black/50">Loading users...</div>;

    const handleToggleAdmin = async (userId: Id<"users">, currentStatus: boolean) => {
        if (!sessionId) return;
        try {
            await updateUserRole({ sessionId, id: userId, role: !currentStatus ? "admin" : "user" });
            toast({ title: "Success", description: "User role updated." });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update user role.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteUser = async (userId: Id<"users">) => {
        if (!sessionId) return;
        if (!confirm("Are you sure you want to delete this user?")) return;

        try {
            await deleteUser({ sessionId, id: userId });
            toast({ title: "Success", description: "User deleted." });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.data?.message || error.message || "Failed to delete user.",
                variant: "destructive",
            });
        }
    };

    const handleReset2FA = async (userId: Id<"users">) => {
        if (!sessionId) return;
        if (!confirm("Are you sure you want to RESET 2FA for this user? They will be forced to set it up again on their next login.")) return;

        try {
            await reset2FA({ sessionId, targetUserId: userId });
            toast({ title: "Success", description: "2FA has been reset." });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to reset 2FA.",
                variant: "destructive",
            });
        }
    };

    const handleCreateUser = async () => {
        if (!newUsername || !newPassword || !sessionId) return;

        try {
            await createUser({
                sessionId,
                username: newUsername,
                password: newPassword,
                isAdmin: newIsAdmin
            });
            setIsCreateOpen(false);
            setNewUsername("");
            setNewPassword("");
            setNewIsAdmin(false);
            toast({ title: "Success", description: "User created successfully." });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.data?.message || error.message || "Failed to create user.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-4">
            <div className="vts-panel flex items-center justify-between rounded-[1.75rem] px-5 py-4">
                <div>
                    <h3 className="text-lg font-semibold text-[#2c3034]">Users ({users.length})</h3>
                    <p className="text-sm text-black/45">Manage roles, security, and account access.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <div>
                            <PremiumPlusButton size="sm" className="shadow-blue-500/20" title="Add User" />
                        </div>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New User</DialogTitle>
                            <DialogDescription>
                                Create a new user for the community.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Username</Label>
                                <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" />
                            </div>
                            <div className="space-y-2">
                                <Label>Password</Label>
                                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password" />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox id="isAdmin" checked={newIsAdmin} onCheckedChange={(c) => setNewIsAdmin(c as boolean)} />
                                <Label htmlFor="isAdmin">Grant Admin Privileges</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreateUser}>Create User</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="vts-panel overflow-hidden rounded-[1.75rem]">
                <div className="p-0 overflow-x-auto">
                    {/* Desktop View Table */}
                    <table className="w-full text-sm text-left hidden md:table">
                        <thead className="bg-white/28 text-black/45">
                            <tr>
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Email</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium">Security</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/30">
                            {users.map((u) => (
                                <tr key={u._id} className="transition-colors hover:bg-white/18">
                                    <td className="p-4 flex items-center gap-3">
                                        <Avatar className="h-9 w-9 border border-white/50 shadow-sm">
                                            <AvatarImage src={u.imageUrl} />
                                            <AvatarFallback>{u.name?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold">{u.name || u.username}</span>
                                            <BadgeList badges={u.badges ?? []} size="sm" maxShow={3} />
                                        </div>
                                    </td>
                                    <td className="p-4 text-black/45">{u.email || "-"}</td>
                                    <td className="p-4">
                                        {u.isAdmin ? (
                                            <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-2.5 py-1 rounded text-xs font-semibold border border-primary/20">
                                                <Shield className="h-3 w-3" /> Admin
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 font-medium text-black/40">User</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {(u as any).twoFactorEnabled ? (
                                            <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded text-[10px] font-bold border border-green-200 uppercase tracking-tighter">
                                                2FA Active
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-1 text-[10px] font-bold uppercase text-black/35">Not Enrolled</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="vts-soft-card h-10 border-0 px-3 hover:bg-white/70"
                                            onClick={() => handleToggleAdmin(u._id, u.isAdmin)}
                                        >
                                            {u.isAdmin ? "Remove Admin" : "Make Admin"}
                                        </Button>
                                        {(u as any).twoFactorEnabled && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-10 border-[#d7c4ab]/50 bg-white/40 px-3 text-[#8a7258] hover:bg-[rgba(215,196,171,0.16)]"
                                                onClick={() => handleReset2FA(u._id)}
                                            >
                                                Reset 2FA
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => handleDeleteUser(u._id)}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile View Cards */}
                    <div className="divide-y divide-white/30 md:hidden">
                        {users.map((u) => (
                            <div key={u._id} className="space-y-4 bg-white/10 p-4 transition-colors active:bg-white/20">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 border border-white/50 shadow-sm">
                                            <AvatarImage src={u.imageUrl} />
                                            <AvatarFallback>{u.name?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-base leading-none">{u.name || u.username}</span>
                                            <span className="text-xs text-black/40">{u.email || "No email"}</span>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {u.isAdmin ? (
                                                    <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px] font-bold border border-primary/20 uppercase tracking-tight">
                                                        <Shield className="h-2.5 w-2.5" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="rounded bg-white/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-black/40">User</span>
                                                )}
                                                {(u as any).twoFactorEnabled ? (
                                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 uppercase tracking-tight">
                                                        2FA ON
                                                    </span>
                                                ) : (
                                                    <span className="rounded border border-white/35 bg-white/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight text-black/35">2FA OFF</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="-mr-2 h-10 w-10 text-destructive"
                                        onClick={() => handleDeleteUser(u._id)}
                                    >
                                        <Trash className="h-5 w-5" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="vts-soft-card h-11 w-full border-0 text-sm font-semibold hover:bg-white/70"
                                        onClick={() => handleToggleAdmin(u._id, u.isAdmin)}
                                    >
                                        {u.isAdmin ? "Demote User" : "Promote Admin"}
                                    </Button>
                                    {(u as any).twoFactorEnabled ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-11 w-full border-amber-200 bg-white/40 text-sm font-semibold text-amber-600"
                                            onClick={() => handleReset2FA(u._id)}
                                        >
                                            Reset 2FA
                                        </Button>
                                    ) : (
                                        <div className="flex h-11 w-full items-center justify-center rounded-md border border-dashed border-white/40 bg-white/20 text-[10px] font-medium uppercase text-black/40">
                                            No 2FA to reset
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StorageMaintenance() {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const cleanupLegacyMedia = useMutation(api.messages.adminCleanupLegacyVideoAttachments);
    const cleanupLegacyAvatars = useMutation(api.users.adminCleanupLegacyAvatarStorage);
    const [isCleaningMedia, setIsCleaningMedia] = useState(false);
    const [isCleaningAvatars, setIsCleaningAvatars] = useState(false);

    const handleCleanupLegacyMedia = async () => {
        if (!sessionId || isCleaningMedia) return;
        if (!confirm("Delete legacy Convex chat attachments from old messages? This permanently removes old images, documents, videos, thumbnails, and voice files.")) {
            return;
        }

        setIsCleaningMedia(true);
        try {
            const result = await cleanupLegacyMedia({ sessionId });
            toast({
                title: "Chat media cleanup complete",
                description: `${result.cleanedMessages} messages updated, ${result.deletedFiles} files deleted${result.hasMore ? ". Run it again to continue." : "."}`,
            });
        } catch (error: any) {
            toast({
                title: "Cleanup failed",
                description: error?.message || "Failed to clean up legacy chat attachments.",
                variant: "destructive",
            });
        } finally {
            setIsCleaningMedia(false);
        }
    };

    const handleCleanupLegacyAvatars = async () => {
        if (!sessionId || isCleaningAvatars) return;
        if (!confirm("Delete legacy Convex avatar files? Users with an external avatar URL keep it; users without one will fall back to initials.")) {
            return;
        }

        setIsCleaningAvatars(true);
        try {
            const result = await cleanupLegacyAvatars({ sessionId });
            toast({
                title: "Avatar cleanup complete",
                description: `${result.cleanedUsers} users updated, ${result.deletedFiles} files deleted.`,
            });
        } catch (error: any) {
            toast({
                title: "Cleanup failed",
                description: error?.message || "Failed to clean up legacy avatar storage.",
                variant: "destructive",
            });
        } finally {
            setIsCleaningAvatars(false);
        }
    };

    return (
        <div className="vts-panel space-y-4 rounded-[1.75rem] p-6">
            <div>
                <h3 className="text-lg font-semibold mb-1">Storage Maintenance</h3>
                <p className="text-sm text-black/50">
                    Remove old Convex-hosted chat media and avatar files so they stop consuming storage and bandwidth.
                </p>
            </div>
            <div className="vts-soft-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-[#2c3034]">Legacy chat media cleanup</p>
                    <p className="text-xs text-black/45">
                        Deletes stored images, documents, videos, thumbnails, and voice blobs from older messages and replaces attachment-only placeholders with a small text note.
                    </p>
                </div>
                <Button
                    variant="destructive"
                    onClick={handleCleanupLegacyMedia}
                    disabled={isCleaningMedia || !sessionId}
                    className="sm:min-w-[200px]"
                >
                    {isCleaningMedia ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
                    Clean Legacy Chat Media
                </Button>
            </div>
            <div className="vts-soft-card flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-[#2c3034]">Legacy avatar cleanup</p>
                    <p className="text-xs text-black/45">
                        Deletes old Convex avatar blobs and keeps only external avatar URLs.
                    </p>
                </div>
                <Button
                    variant="destructive"
                    onClick={handleCleanupLegacyAvatars}
                    disabled={isCleaningAvatars || !sessionId}
                    className="sm:min-w-[200px]"
                >
                    {isCleaningAvatars ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash className="mr-2 h-4 w-4" />}
                    Clean Legacy Avatars
                </Button>
            </div>
        </div>
    );
}

// ─── Emoji Picker Palette ────────────────────────────────────────────
const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
    {
        label: "Chat & Social",
        emojis: ["💬", "🗣️", "📢", "📣", "🎙️", "🤝", "👋", "✋", "👥", "🫂", "🏠", "🏡"],
    },
    {
        label: "Work & Dev",
        emojis: ["💻", "🖥️", "⌨️", "🔧", "⚙️", "🛠️", "📁", "📂", "📋", "📝", "✏️", "📐"],
    },
    {
        label: "Finance & Money",
        emojis: ["💰", "💵", "💸", "🏦", "📊", "📈", "📉", "💳", "🪙", "💎", "🧾", "🤑"],
    },
    {
        label: "Fun & Creative",
        emojis: ["🎮", "🎯", "🎨", "🎭", "🎵", "🎶", "🎬", "📸", "🧩", "🎲", "🏆", "⭐"],
    },
    {
        label: "Learning & Education",
        emojis: ["📚", "📖", "🎓", "🧠", "💡", "🔬", "🌍", "🗺️", "📰", "🔖", "🏫", "📌"],
    },
    {
        label: "Lifestyle",
        emojis: ["🍕", "☕", "🏋️", "🧘", "🌅", "🌙", "🚀", "✈️", "🎉", "🔥", "❤️", "🌈"],
    },
];

function EmojiPickerPopover({
    value,
    onChange,
    trigger,
}: {
    value: string;
    onChange: (emoji: string) => void;
    trigger?: React.ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="h-10 w-10 text-xl p-0">
                        {value || "#"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Choose Channel Emoji</DialogTitle>
                    <DialogDescription>
                        Pick an emoji to display as the channel icon.
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[300px] overflow-y-auto space-y-3 py-2">
                    {EMOJI_CATEGORIES.map((cat) => (
                        <div key={cat.label}>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                                {cat.label}
                            </p>
                            <div className="grid grid-cols-6 gap-1">
                                {cat.emojis.map((em) => (
                                    <button
                                        key={em}
                                        type="button"
                                        onClick={() => {
                                            onChange(em);
                                            setOpen(false);
                                        }}
                                        className={`h-9 w-full text-xl rounded-lg transition-all duration-100 hover:bg-primary/10 hover:scale-110 active:scale-95 flex items-center justify-center ${value === em ? "bg-primary/15 ring-2 ring-primary/40 scale-105" : ""
                                            }`}
                                    >
                                        {em}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {value && (
                    <div className="flex justify-end pt-2 border-t">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground hover:text-destructive"
                            onClick={() => {
                                onChange("");
                                setOpen(false);
                            }}
                        >
                            Remove emoji (use default #)
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function ChannelManagement() {
    const { sessionId } = useAuth();
    const channels = useQuery(api.channels.getChannelsWithMembersPreview, sessionId ? { sessionId } : "skip");
    const createChannel = useMutation(api.channels.createChannel);
    const renameChannel = useMutation(api.channels.renameChannel);
    const updateChannelEmoji = useMutation(api.channels.updateChannelEmoji);
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [newChannelDesc, setNewChannelDesc] = useState("");
    const [newChannelEmoji, setNewChannelEmoji] = useState("");
    const [newChannelType, setNewChannelType] = useState<"chat" | "money_request" | "announcement">("chat");

    // Inline editing state
    const [editingChannelId, setEditingChannelId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");

    // Detail Panel state
    const [selectedChannelId, setSelectedChannelId] = useState<Id<"channels"> | null>(null);

    const handleCreate = async () => {
        if (!newChannelName.trim()) return;
        if (!sessionId) {
            toast({ title: "Error", description: "Unauthorized", variant: "destructive" });
            return;
        }

        try {
            await createChannel({
                sessionId,
                name: newChannelName,
                description: newChannelDesc,
                emoji: newChannelEmoji || undefined,
                type: newChannelType,
            });
            setIsOpen(false);
            setNewChannelName("");
            setNewChannelDesc("");
            setNewChannelEmoji("");
            setNewChannelType("chat");
            toast({ title: "Success", description: "Channel created." });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create channel.",
                variant: "destructive",
            });
        }
    };

    const handleRename = async (channelId: string) => {
        if (!editingName.trim() || !sessionId) return;
        try {
            await renameChannel({
                sessionId,
                channelId: channelId as any,
                name: editingName,
            });
            setEditingChannelId(null);
            setEditingName("");
            toast({ title: "Success", description: "Channel renamed." });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to rename channel.",
                variant: "destructive",
            });
        }
    };

    const handleEmojiUpdate = async (channelId: string, emoji: string) => {
        if (!sessionId) return;
        try {
            await updateChannelEmoji({
                sessionId,
                channelId: channelId as any,
                emoji,
            });
            toast({ title: "Success", description: emoji ? "Channel emoji updated." : "Channel emoji removed." });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error?.message || "Failed to update emoji.",
                variant: "destructive",
            });
        }
    };

    if (!channels) return <div className="vts-panel rounded-[1.75rem] p-6 text-sm text-black/50">Loading channels...</div>;

    return (
        <div className="space-y-4">
            <div className="vts-panel flex items-center justify-between rounded-[1.75rem] px-5 py-4">
                <div>
                    <h3 className="text-lg font-semibold text-[#2c3034]">Channels</h3>
                    <p className="text-sm text-black/45">Create, rename, and review membership by channel.</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <div>
                            <PremiumPlusButton size="sm" className="shadow-blue-500/20" title="Create Channel" />
                        </div>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Channel</DialogTitle>
                            <DialogDescription>
                                Add a new channel for discussions.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <div className="flex items-center gap-2">
                                    <EmojiPickerPopover
                                        value={newChannelEmoji}
                                        onChange={setNewChannelEmoji}
                                        trigger={
                                            <Button variant="outline" className="h-10 w-10 text-xl p-0 shrink-0 border-dashed">
                                                {newChannelEmoji || "#"}
                                            </Button>
                                        }
                                    />
                                    <Input
                                        id="name"
                                        value={newChannelName}
                                        onChange={(e) => setNewChannelName(e.target.value)}
                                        placeholder="e.g. general"
                                        className="flex-1"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Click the icon on the left to choose an emoji for this channel.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Input
                                    id="desc"
                                    value={newChannelDesc}
                                    onChange={(e) => setNewChannelDesc(e.target.value)}
                                    placeholder="What's this channel about?"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Channel Type</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={newChannelType === "chat" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setNewChannelType("chat")}
                                        className="flex-1"
                                    >
                                        💬 Chat
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={newChannelType === "money_request" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setNewChannelType("money_request")}
                                        className="flex-1"
                                    >
                                        💰 Money Request
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={newChannelType === "announcement" ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setNewChannelType("announcement")}
                                        className="flex-1"
                                    >
                                        📢 Announcement
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {newChannelType === "money_request"
                                        ? "Members can create and manage money requests in this channel."
                                        : newChannelType === "announcement"
                                            ? "Only admins can post. Users can react and mark as read."
                                            : "A standard chat channel for text messages."}
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 overflow-x-hidden sm:grid-cols-2 lg:grid-cols-3">
                {channels.map((c) => (
                    <div
                        key={c._id}
                        className="vts-soft-card group/card relative flex cursor-pointer flex-col justify-between rounded-[1.75rem] p-4 transition-shadow hover:shadow-[0_16px_32px_rgba(120,140,154,0.14)]"
                        onClick={(e) => {
                            // Don't open panel if clicking buttons or emoji picker
                            if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.emoji-picker-container')) return;
                            setSelectedChannelId(c._id as Id<"channels">);
                        }}
                    >
                        <div>
                            <div className="flex items-start justify-between mb-3 gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <div className="emoji-picker-container">
                                        <EmojiPickerPopover
                                            value={(c as any).emoji || ""}
                                            onChange={(emoji) => handleEmojiUpdate(c._id, emoji)}
                                            trigger={
                                                <button
                                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/55 text-2xl font-normal shadow-sm transition-all active:scale-95 hover:bg-white/75"
                                                    title="Change channel emoji"
                                                >
                                                    {(c as any).emoji || (c.type === "money_request" ? "💰" : c.type === "announcement" ? "📢" : "#")}
                                                </button>
                                            }
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        {editingChannelId === c._id ? (
                                            <form
                                                onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleRename(c._id);
                                                }}
                                                className="flex items-center gap-1 w-full"
                                            >
                                                <Input
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="h-10 border-white/45 bg-white/55 text-sm font-bold"
                                                    autoFocus
                                                    onBlur={() => {
                                                        if (editingName.trim() && editingName !== c.name) {
                                                            handleRename(c._id);
                                                        } else {
                                                            setEditingChannelId(null);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Escape") {
                                                            setEditingChannelId(null);
                                                        }
                                                    }}
                                                />
                                            </form>
                                        ) : (
                                            <div
                                                className="group cursor-pointer hover:text-primary transition-colors flex items-center gap-1.5 py-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingChannelId(c._id);
                                                    setEditingName(c.name);
                                                }}
                                                title="Tap to rename"
                                            >
                                                <span className="font-bold text-base truncate">{c.name}</span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                    className="h-4 w-4 opacity-40 group-hover:opacity-100 transition-opacity shrink-0 md:opacity-0 md:group-hover:opacity-60"
                                                >
                                                    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                                                </svg>
                                            </div>
                                        )}
                                        <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 mt-0.5">
                                            {c.type === "money_request" ? "💰 Finance" : c.type === "announcement" ? "📢 Broadcast" : "💬 Community"}
                                        </p>
                                    </div>
                                </div>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter shrink-0 border h-fit ${c.type === "money_request"
                                    ? "bg-green-500/10 text-green-700 border-green-200"
                                    : c.type === "announcement"
                                        ? "bg-amber-500/10 text-amber-700 border-amber-200"
                                        : "bg-blue-500/10 text-blue-700 border-blue-200"
                                    }`}>
                                    ID: {c._id.slice(-4)}
                                </span>
                            </div>
                            <div className="space-y-3">
                                <p className="min-h-[2.5rem] line-clamp-2 text-sm leading-relaxed text-black/55">
                                    {c.description || "No description set for this channel."}
                                </p>

                                <div className="space-y-1.5 border-t border-dashed border-white/35 pt-2">
                                    <p className="text-xs font-bold uppercase tracking-tight text-black/45">
                                        Members : {(c as any).actualMemberCount ?? c.memberCount ?? 0}
                                    </p>
                                    <div className="flex flex-col gap-0.5">
                                        {(c as any).memberPreviews?.map((name: string, idx: number) => (
                                            <p key={idx} className="text-sm font-medium text-[#2c3034]">{name}</p>
                                        ))}
                                        {((c as any).actualMemberCount ?? c.memberCount ?? 0) > 3 && (
                                            <p className="text-sm text-black/45">
                                                + {((c as any).actualMemberCount ?? c.memberCount ?? 0) - 3} more
                                            </p>
                                        )}
                                        {((c as any).actualMemberCount ?? c.memberCount ?? 0) === 0 && (
                                            <p className="text-xs italic text-black/35">No members yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-dashed border-white/35 pt-4">
                            <span className="text-[10px] font-medium text-black/40">
                                {new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 text-[10px] font-bold uppercase tracking-wider md:hidden"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingChannelId(c._id);
                                        setEditingName(c.name);
                                    }}
                                >
                                    Rename
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detailed Member Management Panel */}
            <ChannelMemberPanel
                channelId={selectedChannelId}
                onClose={() => setSelectedChannelId(null)}
            />
        </div>
    );
}

function ChannelMemberPanel({
    channelId,
    onClose
}: {
    channelId: Id<"channels"> | null;
    onClose: () => void;
}) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
    const channel = useQuery(api.channels.getChannel, channelId ? { channelId } : "skip");
    const members = useQuery(api.channels.getChannelMembers, channelId && sessionId ? { channelId, sessionId } : "skip");
    const removeUser = useMutation(api.channels.removeUserFromChannel);
    const addUser = useMutation(api.channels.addUserToChannel);

    const [memberSearchTerm, setMemberSearchTerm] = useState("");
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [addUserSearchTerm, setAddUserSearchTerm] = useState("");

    // Confirmation Modal State
    const [userToRemove, setUserToRemove] = useState<{ _id: Id<"users">, name: string, isAdmin: boolean } | null>(null);

    // Search for users to add
    const searchResults = useQuery(api.channels.searchUsersToAdd,
        isAddUserOpen && channelId && sessionId && addUserSearchTerm.length >= 2
            ? { sessionId, channelId, searchTerm: addUserSearchTerm }
            : "skip"
    );

    const filteredMembers = members?.filter(m =>
        m.name.toLowerCase().includes(memberSearchTerm.toLowerCase())
    );

    const handleRemoveClick = (targetUser: { _id: Id<"users">, name: string, isAdmin: boolean }) => {
        if (!sessionId || !channelId) return;

        // Admin protection rule
        if (targetUser.isAdmin || targetUser._id === currentUser?._id) {
            toast({
                title: "Action Not Allowed",
                description: "Admins cannot remove other administrators.",
                variant: "destructive",
            });
            return;
        }

        setUserToRemove(targetUser);
    };

    const confirmRemoveMember = async () => {
        if (!sessionId || !channelId || !userToRemove) return;

        try {
            await removeUser({ sessionId, channelId, userId: userToRemove._id });
            toast({ title: "Success", description: `${userToRemove.name} removed from channel.` });
            setUserToRemove(null);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to remove user.",
                variant: "destructive"
            });
        }
    };

    const handleAddUser = async (user: { _id: Id<"users">, name: string }) => {
        if (!sessionId || !channelId) return;
        try {
            await addUser({ sessionId, channelId, userId: user._id });
            setIsAddUserOpen(false);
            setAddUserSearchTerm("");
            toast({ title: "Success", description: `${user.name} added to channel.` });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to add user.",
                variant: "destructive"
            });
        }
    };

    return (
        <Sheet open={!!channelId} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="flex w-full flex-col overflow-hidden border-l-white/40 bg-[#f6f7f6]/88 p-0 backdrop-blur-xl sm:max-w-md md:max-w-xl">
                <SheetHeader className="shrink-0 border-b border-white/35 p-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                                <span className="text-primary">#</span> {channel?.name}
                            </SheetTitle>
                            <SheetDescription>
                                Channel Management & Members
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex flex-1 flex-col space-y-6 overflow-hidden p-6">
                    {/* Channel Members Section */}
                    <div className="flex flex-col flex-1 overflow-hidden space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-bold text-[#2c3034]">Channel Members</h4>
                            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-2">
                                        <UserPlus className="h-4 w-4" />
                                        Add User
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Add User to Channel</DialogTitle>
                                        <DialogDescription>
                                            Search for a user by name to add them to this channel.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search users by name..."
                                                className="pl-9"
                                                value={addUserSearchTerm}
                                                onChange={(e) => setAddUserSearchTerm(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <ScrollArea className="h-[300px] rounded-2xl border border-white/40 bg-white/28">
                                            <div className="p-2 space-y-1">
                                                {searchResults === undefined && addUserSearchTerm.length >= 2 ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : searchResults && searchResults.length > 0 ? (
                                                    searchResults.map(u => (
                                                        <div key={u._id} className="flex items-center justify-between rounded-xl p-2 transition-colors hover:bg-white/45 group">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8 border border-white/50 shadow-sm">
                                                                    <AvatarImage src={u.avatarUrl} />
                                                                    <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-medium text-sm">{u.name}</span>
                                                            </div>
                                                            <Button size="sm" variant="ghost" className="vts-soft-card h-8 w-8 border-0 p-0 hover:bg-white/70" onClick={() => handleAddUser(u)}>
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                ) : addUserSearchTerm.length >= 2 ? (
                                                    <p className="text-center py-8 text-sm text-muted-foreground">No users found</p>
                                                ) : (
                                                    <p className="text-center py-8 text-xs text-muted-foreground uppercase font-semibold tracking-widest">Type at least 2 characters to search</p>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Search Field */}
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search members in channel..."
                                className="h-11 border-white/40 bg-white/35 pl-9"
                                value={memberSearchTerm}
                                onChange={(e) => setMemberSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Members List */}
                        <ScrollArea className="flex-1 rounded-[1.5rem] border border-white/40 bg-white/24">
                            <div className="p-4 space-y-2">
                                {!members ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                    </div>
                                ) : filteredMembers && filteredMembers.length > 0 ? (
                                    filteredMembers.map(m => (
                                        <div key={m._id} className="vts-soft-card flex items-center justify-between rounded-xl p-3 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border border-white/50 shadow-sm">
                                                    <AvatarImage src={m.avatarUrl} />
                                                    <AvatarFallback>{m.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-bold text-sm">
                                                    {m.name}
                                                </span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-9 gap-2 text-black/45 hover:bg-destructive/10 hover:text-destructive"
                                                onClick={() => handleRemoveClick(m)}
                                            >
                                                <UserMinus className="h-4 w-4" />
                                                <span className="text-xs font-bold uppercase tracking-tight hidden sm:inline">Kick from Channel</span>
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground">No members found matching "{memberSearchTerm}"</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <AlertDialog open={!!userToRemove} onOpenChange={(open) => !open && setUserToRemove(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove this user from the channel?</AlertDialogTitle>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmRemoveMember} className="bg-destructive hover:bg-destructive/90">
                                Remove
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </SheetContent>
        </Sheet>
    );
}

function AdminContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { sessionId } = useAuth();
    const activeTab = searchParams.get("tab") || "channels";
    const unreadEmails = useQuery(api.emails.getUnreadCount, sessionId ? { sessionId } : "skip");

    useEffect(() => {
        // Fix for Radix UI leaving pointer-events: none on body when a Sheet/Dialog 
        // unmounts abruptly while navigating from the main layout.
        document.body.style.pointerEvents = "";
        document.body.removeAttribute("data-scroll-locked");
    }, []);

    return (
        <AdminGuard>
            {/* ── Sticky admin header ────────────────────────────── */}
            <div className="vts-panel sticky top-0 z-40 shrink-0 rounded-[2rem] px-4 py-4 md:px-8 md:py-5">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="vts-display flex items-center gap-2 text-3xl font-semibold tracking-tight text-[#2c3034] md:text-5xl">
                            <Shield className="h-5 w-5 md:h-7 md:w-7 text-primary" />
                            Admin Dashboard
                        </h1>
                        <p className="text-xs text-black/50 md:text-sm">
                            Manage community settings, users, and channels.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                router.push("/admin?tab=emails");
                            }}
                            className="vts-soft-card relative flex h-10 items-center gap-2 self-start border-0 bg-white/55 px-4 font-semibold text-blue-700 transition-all active:scale-95 sm:self-auto hover:bg-white/70"
                        >
                            <Mail className="h-4 w-4" />
                            <span className="hidden sm:inline">Emails</span>
                            {unreadEmails !== undefined && unreadEmails > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white animate-in zoom-in">
                                    {unreadEmails > 99 ? '99+' : unreadEmails}
                                </span>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push("/dashboard")}
                            className="vts-soft-card flex h-10 items-center gap-2 self-start border-0 px-4 font-semibold text-black transition-all active:scale-95 sm:self-auto hover:bg-white/70"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Scrollable admin body ──────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-0 py-4 md:py-5 pb-[calc(1.5rem+var(--safe-area-bottom))]">
                <div className="max-w-6xl mx-auto">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => router.push(`/admin?tab=${v}`)}
                        className="space-y-4"
                    >

                        <TabsList className="vts-panel flex h-16 w-full shrink-0 items-center gap-1 overflow-x-auto rounded-[1.5rem] p-2 !justify-start sm:!justify-center">
                            <TabsTrigger value="channels" className="h-full min-w-max rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white/75 data-[state=active]:shadow-sm">Channels</TabsTrigger>
                            <TabsTrigger value="users" className="h-full min-w-max rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white/75 data-[state=active]:shadow-sm">Users</TabsTrigger>
                            <TabsTrigger value="moderation" className="h-full min-w-max rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white/75 data-[state=active]:shadow-sm">Moderation</TabsTrigger>
                            <TabsTrigger value="reputation" className="h-full min-w-max rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white/75 data-[state=active]:shadow-sm">Reputation</TabsTrigger>
                            <TabsTrigger value="exchange-rates" className="h-full min-w-max rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white/75 data-[state=active]:shadow-sm">Exchange Rates</TabsTrigger>
                            <TabsTrigger value="emails" className="h-full min-w-max rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white/75 data-[state=active]:shadow-sm">Emails</TabsTrigger>
                            <TabsTrigger value="settings" className="h-full min-w-max rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-white/75 data-[state=active]:shadow-sm">Settings</TabsTrigger>
                        </TabsList>

                        <TabsContent value="channels" className="space-y-4">
                            <ChannelManagement />
                        </TabsContent>

                        <TabsContent value="users" className="space-y-4">
                            <UserManagement />
                        </TabsContent>

                        <TabsContent value="moderation" className="space-y-4">
                            <ModerationPanel />
                        </TabsContent>

                        <TabsContent value="exchange-rates" className="space-y-4">
                            <ExchangeRateSettings />
                        </TabsContent>

                        <TabsContent value="reputation" className="space-y-6">
                            <ReputationManagement />
                        </TabsContent>

                        <TabsContent value="emails" className="space-y-6">
                            {sessionId ? <EmailManagement sessionId={sessionId} /> : <div className="vts-panel rounded-[1.5rem] p-4 text-sm text-black/45">Loading...</div>}
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-4">
                            <div className="vts-panel space-y-4 rounded-[1.75rem] p-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Application Audio</h3>
                                    <p className="text-sm text-black/50">
                                        Manage global notification sounds and system alerts.
                                    </p>
                                </div>
                                <div className="vts-soft-card flex items-center gap-4 rounded-2xl p-4">
                                    <span className="text-sm font-medium">Notification Settings:</span>
                                    <SoundSettingsControl />
                                </div>
                            </div>
                            <StorageMaintenance />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </AdminGuard>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={
            <div className="vts-app-shell flex min-h-screen items-center justify-center p-4">
                <div className="vts-panel flex min-h-[240px] w-full max-w-3xl items-center justify-center rounded-[2rem]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </div>
        }>
            <AdminContent />
        </Suspense>
    );
}

// ─── Reputation Management (Admin Tab) ──────────────────────────────

const AVAILABLE_BADGES = [
    { value: "contributor", label: "💬 Contributor" },
    { value: "trusted_member", label: "🛡️ Trusted Member" },
    { value: "verified", label: "✅ Verified" },
    { value: "top_contributor", label: "🏆 Top Contributor" },
];

function ReputationManagement() {
    const { sessionId } = useAuth();
    const users = useQuery(api.users.getAllUsers, sessionId ? { sessionId } : "skip");
    const grantBadge = useMutation(api.reputation.adminGrantBadge);
    const revokeBadge = useMutation(api.reputation.adminRevokeBadge);
    const { toast } = useToast();
    const [selectedBadge, setSelectedBadge] = useState("");

    const handleGrantBadge = async (userId: Id<"users">) => {
        if (!sessionId || !selectedBadge) return;
        try {
            await grantBadge({ sessionId, userId, badge: selectedBadge });
            toast({ description: `Badge granted ✓` });
            setSelectedBadge("");
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "Failed to grant badge" });
        }
    };

    const handleRevokeBadge = async (userId: Id<"users">, badge: string) => {
        if (!sessionId) return;
        try {
            await revokeBadge({ sessionId, userId, badge });
            toast({ description: `Badge revoked` });
        } catch (error: any) {
            toast({ variant: "destructive", description: error?.message || "Failed to revoke badge" });
        }
    };

    return (
        <div className="space-y-6">
            {/* Leaderboard */}
            <div className="vts-panel space-y-3 rounded-[1.75rem] p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[#2c3034]">
                    🏆 Community Leaderboard
                </h3>
                <p className="text-sm text-black/45">
                    Top members ranked by contribution score.
                </p>
                <div className="vts-soft-card rounded-2xl p-4">
                    <Leaderboard limit={15} />
                </div>
            </div>

            {/* Badge Management */}
            <div className="vts-panel space-y-3 rounded-[1.75rem] p-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-[#2c3034]">
                    🎖️ Badge Management
                </h3>
                <p className="text-sm text-black/45">
                    Grant or revoke badges for community members.
                </p>

                <div className="overflow-hidden rounded-[1.5rem] border border-white/35 divide-y divide-white/30 bg-white/14">
                    {users?.map((u) => (
                        <div key={u._id} className="flex flex-col gap-4 p-4 transition-colors active:bg-white/20 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-11 w-11 shadow-sm shrink-0 border border-white/50">
                                    <AvatarImage src={u.imageUrl} />
                                    <AvatarFallback>{u.name?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-bold text-base leading-none">{u.name || u.username}</span>
                                        {u.isAdmin && (
                                            <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black uppercase tracking-tight border border-primary/20">Admin</span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                        {(u.badges ?? []).map((badge: string) => (
                                            <button
                                                key={badge}
                                                onClick={() => handleRevokeBadge(u._id, badge)}
                                                className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border border-white/45 bg-white/40 px-2 py-1 text-[10px] font-bold shadow-sm transition-all hover:bg-destructive hover:text-white"
                                                title={`Click to revoke "${badge}"`}
                                            >
                                                {AVAILABLE_BADGES.find(b => b.value === badge)?.label || badge}
                                                <span className="text-[12px] opacity-70 leading-none">×</span>
                                            </button>
                                        ))}
                                        {(!u.badges || u.badges.length === 0) && (
                                            <span className="rounded px-2 py-0.5 text-[10px] font-medium italic text-black/40">No badges earned</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex w-full items-center gap-2 border-t border-dashed border-white/35 pt-2 sm:w-auto sm:border-t-0 sm:pt-0">
                                <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                                    <SelectTrigger className="grow sm:min-w-[160px] h-11 bg-white/45 border-white/45 text-sm font-semibold rounded-xl">
                                        <SelectValue placeholder="Give badge..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {AVAILABLE_BADGES.filter(
                                            (b) => !(u.badges ?? []).includes(b.value)
                                        ).map((b) => (
                                            <SelectItem key={b.value} value={b.value} className="text-sm font-medium py-2.5">
                                                {b.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    className="h-11 px-5 shadow-sm active:scale-95 transition-all text-sm font-bold bg-[#E07A5F] hover:bg-[#D06A4F] shrink-0"
                                    disabled={!selectedBadge}
                                    onClick={() => handleGrantBadge(u._id)}
                                >
                                    Grant
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
