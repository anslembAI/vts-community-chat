
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
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user?.isAdmin) return null;

    return <div className="flex flex-col h-full overflow-hidden">{children}</div>;
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

    if (!users) return <div>Loading users...</div>;

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
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Users ({users.length})</h3>
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

            <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
                <div className="p-0 overflow-x-auto">
                    {/* Desktop View Table */}
                    <table className="w-full text-sm text-left hidden md:table">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Email</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium">Security</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((u) => (
                                <tr key={u._id} className="hover:bg-muted/30 transition-colors">
                                    <td className="p-4 flex items-center gap-3">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={u.imageUrl} />
                                            <AvatarFallback>{u.name?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-semibold">{u.name || u.username}</span>
                                            <BadgeList badges={u.badges ?? []} size="sm" maxShow={3} />
                                        </div>
                                    </td>
                                    <td className="p-4 text-muted-foreground">{u.email || "-"}</td>
                                    <td className="p-4">
                                        {u.isAdmin ? (
                                            <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-2.5 py-1 rounded text-xs font-semibold border border-primary/20">
                                                <Shield className="h-3 w-3" /> Admin
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground font-medium px-2.5 py-1">User</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {(u as any).twoFactorEnabled ? (
                                            <span className="text-green-600 bg-green-50 px-2.5 py-1 rounded text-[10px] font-bold border border-green-200 uppercase tracking-tighter">
                                                2FA Active
                                            </span>
                                        ) : (
                                            <span className="text-zinc-400 text-[10px] uppercase font-bold px-2.5 py-1">Not Enrolled</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-10 px-3"
                                            onClick={() => handleToggleAdmin(u._id, u.isAdmin)}
                                        >
                                            {u.isAdmin ? "Remove Admin" : "Make Admin"}
                                        </Button>
                                        {(u as any).twoFactorEnabled && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-amber-600 border-amber-200 hover:bg-amber-50 h-10 px-3"
                                                onClick={() => handleReset2FA(u._id)}
                                            >
                                                Reset 2FA
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
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
                    <div className="md:hidden divide-y divide-border">
                        {users.map((u) => (
                            <div key={u._id} className="p-4 space-y-4 bg-card active:bg-muted/20 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={u.imageUrl} />
                                            <AvatarFallback>{u.name?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-1">
                                            <span className="font-bold text-base leading-none">{u.name || u.username}</span>
                                            <span className="text-xs text-muted-foreground">{u.email || "No email"}</span>
                                            <div className="flex flex-wrap gap-2 mt-1">
                                                {u.isAdmin ? (
                                                    <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px] font-bold border border-primary/20 uppercase tracking-tight">
                                                        <Shield className="h-2.5 w-2.5" /> Admin
                                                    </span>
                                                ) : (
                                                    <span className="bg-muted/60 text-muted-foreground px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight">User</span>
                                                )}
                                                {(u as any).twoFactorEnabled ? (
                                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 uppercase tracking-tight">
                                                        2FA ON
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 bg-zinc-50 px-2 py-0.5 rounded text-[10px] font-bold border border-zinc-200 uppercase tracking-tight">2FA OFF</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-destructive -mr-2"
                                        onClick={() => handleDeleteUser(u._id)}
                                    >
                                        <Trash className="h-5 w-5" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-11 font-semibold text-sm w-full"
                                        onClick={() => handleToggleAdmin(u._id, u.isAdmin)}
                                    >
                                        {u.isAdmin ? "Demote User" : "Promote Admin"}
                                    </Button>
                                    {(u as any).twoFactorEnabled ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-11 font-semibold text-sm text-amber-600 border-amber-200 w-full"
                                            onClick={() => handleReset2FA(u._id)}
                                        >
                                            Reset 2FA
                                        </Button>
                                    ) : (
                                        <div className="h-11 w-full bg-muted/40 rounded-md border border-dashed flex items-center justify-center text-[10px] text-muted-foreground font-medium uppercase">
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

    if (!channels) return <div>Loading channels...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Channels</h3>
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 overflow-x-hidden">
                {channels.map((c) => (
                    <div
                        key={c._id}
                        className="border p-4 rounded-xl flex flex-col justify-between bg-card hover:shadow-md transition-shadow cursor-pointer group/card relative"
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
                                                    className="text-2xl hover:bg-muted font-normal rounded-xl h-11 w-11 flex items-center justify-center transition-all shrink-0 border border-border shadow-sm active:scale-95 bg-white"
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
                                                    className="h-10 text-sm font-bold bg-white"
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
                                <p className="text-sm text-stone-600 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                                    {c.description || "No description set for this channel."}
                                </p>

                                <div className="space-y-1.5 pt-2 border-t border-dashed border-muted">
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                                        Members : {(c as any).actualMemberCount ?? c.memberCount ?? 0}
                                    </p>
                                    <div className="flex flex-col gap-0.5">
                                        {(c as any).memberPreviews?.map((name: string, idx: number) => (
                                            <p key={idx} className="text-sm text-stone-700 font-medium">{name}</p>
                                        ))}
                                        {((c as any).actualMemberCount ?? c.memberCount ?? 0) > 3 && (
                                            <p className="text-sm text-muted-foreground">
                                                + {((c as any).actualMemberCount ?? c.memberCount ?? 0) - 3} more
                                            </p>
                                        )}
                                        {((c as any).actualMemberCount ?? c.memberCount ?? 0) === 0 && (
                                            <p className="text-xs italic text-muted-foreground/60">No members yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-dashed flex items-center justify-between gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground">
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
            <SheetContent className="w-full sm:max-w-md md:max-w-xl overflow-hidden flex flex-col p-0">
                <SheetHeader className="p-6 border-b shrink-0">
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

                <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-6">
                    {/* Channel Members Section */}
                    <div className="flex flex-col flex-1 overflow-hidden space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-lg font-bold">Channel Members</h4>
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
                                        <ScrollArea className="h-[300px] border rounded-md">
                                            <div className="p-2 space-y-1">
                                                {searchResults === undefined && addUserSearchTerm.length >= 2 ? (
                                                    <div className="flex items-center justify-center py-8">
                                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                    </div>
                                                ) : searchResults && searchResults.length > 0 ? (
                                                    searchResults.map(u => (
                                                        <div key={u._id} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors group">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-8 w-8">
                                                                    <AvatarImage src={u.avatarUrl} />
                                                                    <AvatarFallback>{u.name.charAt(0)}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="font-medium text-sm">{u.name}</span>
                                                            </div>
                                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleAddUser(u)}>
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
                                className="pl-9 h-11"
                                value={memberSearchTerm}
                                onChange={(e) => setMemberSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Members List */}
                        <ScrollArea className="flex-1 border rounded-xl bg-muted/30">
                            <div className="p-4 space-y-2">
                                {!members ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                                    </div>
                                ) : filteredMembers && filteredMembers.length > 0 ? (
                                    filteredMembers.map(m => (
                                        <div key={m._id} className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm hover:shadow-md transition-all group">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10 border">
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
                                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-2 h-9"
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
            <div className="shrink-0 px-4 py-4 md:px-8 md:py-5 border-b border-[#E2D7C9] bg-[#F4E9DD]/95 sticky top-0 z-40 shadow-sm md:shadow-none">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl md:text-3xl font-bold tracking-tight text-black flex items-center gap-2">
                            <Shield className="h-5 w-5 md:h-7 md:w-7 text-primary" />
                            Admin Dashboard
                        </h1>
                        <p className="text-muted-foreground text-xs md:text-sm">
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
                            className="flex items-center gap-2 border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 h-10 px-4 self-start sm:self-auto font-semibold active:scale-95 transition-all relative"
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
                            className="flex items-center gap-2 border-[#E0D6C8] hover:bg-[#EADFD2] text-black h-10 px-4 self-start sm:self-auto font-semibold active:scale-95 transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Scrollable admin body ──────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-8 pb-[calc(1.5rem+var(--safe-area-bottom))]">
                <div className="max-w-6xl mx-auto">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => router.push(`/admin?tab=${v}`)}
                        className="space-y-4"
                    >

                        <TabsList className="w-full flex !justify-start sm:!justify-center items-center h-14 bg-muted/40 p-1.5 overflow-x-auto scrollbar-hide shrink-0 gap-1 rounded-xl">
                            <TabsTrigger value="channels" className="px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:shadow-sm min-w-max h-full">Channels</TabsTrigger>
                            <TabsTrigger value="users" className="px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:shadow-sm min-w-max h-full">Users</TabsTrigger>
                            <TabsTrigger value="moderation" className="px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:shadow-sm min-w-max h-full">Moderation</TabsTrigger>
                            <TabsTrigger value="reputation" className="px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:shadow-sm min-w-max h-full">Reputation</TabsTrigger>
                            <TabsTrigger value="exchange-rates" className="px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:shadow-sm min-w-max h-full">Exchange Rates</TabsTrigger>
                            <TabsTrigger value="emails" className="px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:shadow-sm min-w-max h-full">Emails</TabsTrigger>
                            <TabsTrigger value="settings" className="px-4 py-2 text-sm font-semibold rounded-lg data-[state=active]:shadow-sm min-w-max h-full">Settings</TabsTrigger>
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
                            {sessionId ? <EmailManagement sessionId={sessionId} /> : <div className="text-sm p-4 text-zinc-500">Loading...</div>}
                        </TabsContent>

                        <TabsContent value="settings" className="space-y-4">
                            <div className="p-6 border rounded-xl bg-muted/20 space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold mb-1">Application Audio</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Manage global notification sounds and system alerts.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-background rounded-lg border">
                                    <span className="text-sm font-medium">Notification Settings:</span>
                                    <SoundSettingsControl />
                                </div>
                            </div>
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
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    🏆 Community Leaderboard
                </h3>
                <p className="text-sm text-muted-foreground">
                    Top members ranked by contribution score.
                </p>
                <div className="border rounded-lg p-4 bg-background">
                    <Leaderboard limit={15} />
                </div>
            </div>

            {/* Badge Management */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    🎖️ Badge Management
                </h3>
                <p className="text-sm text-muted-foreground">
                    Grant or revoke badges for community members.
                </p>

                <div className="border rounded-xl divide-y bg-card overflow-hidden">
                    {users?.map((u) => (
                        <div key={u._id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 active:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-11 w-11 shadow-sm shrink-0">
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
                                                className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg bg-[#F4E9DD] hover:bg-destructive shadow-sm hover:text-white border border-[#E2D7C9] transition-all cursor-pointer h-7"
                                                title={`Click to revoke "${badge}"`}
                                            >
                                                {AVAILABLE_BADGES.find(b => b.value === badge)?.label || badge}
                                                <span className="text-[12px] opacity-70 leading-none">×</span>
                                            </button>
                                        ))}
                                        {(!u.badges || u.badges.length === 0) && (
                                            <span className="text-[10px] font-medium text-muted-foreground bg-muted/30 px-2 py-0.5 rounded italic">No badges earned</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed border-border/60">
                                <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                                    <SelectTrigger className="grow sm:min-w-[160px] h-11 bg-white text-sm font-semibold rounded-xl">
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
