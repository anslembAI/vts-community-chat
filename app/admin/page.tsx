
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Plus, Shield } from "lucide-react";
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
    const { toast } = useToast();

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

    return (
        <div className="border rounded-lg">
            <div className="p-4 border-b bg-muted/50">
                <h3 className="font-semibold">Users ({users.length})</h3>
            </div>
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
                                    <span className="font-medium">{u.name || u.username}</span>
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
                                <td className="p-4 text-right">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleToggleAdmin(u._id, u.isAdmin)}
                                    >
                                        {u.isAdmin ? "Remove Admin" : "Make Admin"}
                                    </Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
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
            });
            setIsOpen(false);
            setNewChannelName("");
            setNewChannelDesc("");
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
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Channel
                        </Button>
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
                                    # {c.name}
                                </h4>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {c.description || "No description"}
                            </p>
                        </div>
                        <div className="mt-4 pt-4 border-t text-xs text-muted-foreground flex justify-between">
                            <span>Created {new Date(c.createdAt).toLocaleDateString()}</span>
                            {/* Add delete/edit buttons here if needed */}
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
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="channels" className="space-y-4">
                        <ChannelManagement />
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4">
                        <UserManagement />
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
