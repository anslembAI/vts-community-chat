
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus, Shield, Trash } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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
import { ExchangeRateSettings } from "@/components/admin/exchange-rate-settings";
import { Leaderboard } from "@/components/reputation/leaderboard";
import { BadgeList, ReputationScore } from "@/components/reputation/reputation-badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

function AdminGuard({ children }: { children: React.ReactNode }) {
    const { sessionId } = useAuth();
    const user = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });
    const router = useRouter();

    useEffect(() => {
        if (user !== undefined && !user?.isAdmin) {
            router.push("/");
        }
    }, [user, router]);

    if (user === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!user?.isAdmin) return null;

    return <div className="p-8 max-w-6xl mx-auto">{children}</div>;
}

function UserManagement() {
    const { sessionId } = useAuth();
    const users = useQuery(api.users.getAllUsers, { sessionId: sessionId ?? undefined });
    const updateUserRole = useMutation(api.users.updateUserRole);
    const deleteUser = useMutation(api.users.deleteUser);
    const createUser = useMutation(api.users.createUser);
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
            await updateUserRole({ sessionId, id: userId, isAdmin: !currentStatus });
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

            <div className="border rounded-lg">
                <div className="p-0">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground">
                            <tr>
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Email</th>
                                <th className="p-4 font-medium">Role</th>
                                <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {users.map((u) => (
                                <tr key={u._id}>
                                    <td className="p-4 flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={u.imageUrl} />
                                            <AvatarFallback>{u.name?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-medium">{u.name || u.username}</span>
                                            <BadgeList badges={u.badges ?? []} size="sm" maxShow={3} />
                                        </div>
                                    </td>
                                    <td className="p-4 text-muted-foreground">{u.email || "-"}</td>
                                    <td className="p-4">
                                        {u.isAdmin ? (
                                            <span className="inline-flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded text-xs font-medium">
                                                <Shield className="h-3 w-3" /> Admin
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">User</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right flex items-center justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleAdmin(u._id, u.isAdmin)}
                                        >
                                            {u.isAdmin ? "Remove Admin" : "Make Admin"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleDeleteUser(u._id)}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function ChannelManagement() {
    const channels = useQuery(api.channels.getChannels);
    const createChannel = useMutation(api.channels.createChannel);
    const { toast } = useToast();
    const { sessionId } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [newChannelName, setNewChannelName] = useState("");
    const [newChannelDesc, setNewChannelDesc] = useState("");
    const [newChannelType, setNewChannelType] = useState<"chat" | "money_request" | "announcement">("chat");

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
                type: newChannelType,
            });
            setIsOpen(false);
            setNewChannelName("");
            setNewChannelDesc("");
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
                                <Input
                                    id="name"
                                    value={newChannelName}
                                    onChange={(e) => setNewChannelName(e.target.value)}
                                    placeholder="e.g. general"
                                />
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {channels.map((c) => (
                    <div
                        key={c._id}
                        className="border p-4 rounded-lg flex flex-col justify-between bg-card"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold flex items-center gap-1">
                                    {c.type === "money_request" ? "💰" : c.type === "announcement" ? "📢" : "#"} {c.name}
                                </h4>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider ${c.type === "money_request"
                                    ? "bg-green-500/10 text-green-600 border border-green-200"
                                    : c.type === "announcement"
                                        ? "bg-amber-500/10 text-amber-600 border border-amber-200"
                                        : "bg-blue-500/10 text-blue-600 border border-blue-200"
                                    }`}>
                                    {c.type === "money_request" ? "Money" : c.type === "announcement" ? "Broadcast" : "Chat"}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {c.description || "No description"}
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
                            <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function AdminPage() {
    return (
        <AdminGuard>
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                    <p className="text-muted-foreground">
                        Manage your community settings, users, and channels.
                    </p>
                </div>

                <Tabs defaultValue="channels" className="space-y-4">

                    <TabsList>
                        <TabsTrigger value="channels">Channels</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="reputation">Reputation</TabsTrigger>
                        <TabsTrigger value="exchange-rates">Exchange Rates</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="channels" className="space-y-4">
                        <ChannelManagement />
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4">
                        <UserManagement />
                    </TabsContent>

                    <TabsContent value="exchange-rates" className="space-y-4">
                        <ExchangeRateSettings />
                    </TabsContent>

                    <TabsContent value="reputation" className="space-y-6">
                        <ReputationManagement />
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                        <div className="p-4 border rounded-lg bg-muted/20">
                            <h3 className="font-semibold mb-2">Application Settings</h3>
                            <p className="text-sm text-muted-foreground">
                                General application configuration would go here.
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminGuard>
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
    const users = useQuery(api.users.getAllUsers, { sessionId: sessionId ?? undefined });
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

                <div className="border rounded-lg divide-y">
                    {users?.map((u) => (
                        <div key={u._id} className="flex items-center gap-3 p-4">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={u.imageUrl} />
                                <AvatarFallback>{u.name?.charAt(0) || u.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold">{u.name || u.username}</span>
                                    {u.isAdmin && (
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Admin</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {(u.badges ?? []).map((badge: string) => (
                                        <button
                                            key={badge}
                                            onClick={() => handleRevokeBadge(u._id, badge)}
                                            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive border border-border hover:border-destructive/30 transition-colors cursor-pointer"
                                            title={`Click to revoke "${badge}"`}
                                        >
                                            {AVAILABLE_BADGES.find(b => b.value === badge)?.label || badge}
                                            <span className="text-[8px]">×</span>
                                        </button>
                                    ))}
                                    {(!u.badges || u.badges.length === 0) && (
                                        <span className="text-[10px] text-muted-foreground">No badges</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                                    <SelectTrigger className="h-8 w-[160px] text-xs">
                                        <SelectValue placeholder="Select badge" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AVAILABLE_BADGES.filter(
                                            (b) => !(u.badges ?? []).includes(b.value)
                                        ).map((b) => (
                                            <SelectItem key={b.value} value={b.value} className="text-xs">
                                                {b.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs"
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
