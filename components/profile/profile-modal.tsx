"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Crown, Link as LinkIcon } from "lucide-react";
import { UserReputationCard } from "@/components/reputation/user-reputation-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface ProfileModalProps {
    user: any;
    onClose?: () => void;
    trigger?: React.ReactNode;
}

export function ProfileModal({ user, onClose, trigger }: ProfileModalProps) {
    const { sessionId } = useAuth();
    const updateProfile = useMutation(api.profile.updateProfile);
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const { isSupported, masterEnabled, toggleMaster, sendTestPush } = usePushNotifications();
    const [isPushToggling, setIsPushToggling] = useState(false);
    const [isTestingPush, setIsTestingPush] = useState(false);

    const [displayName, setDisplayName] = useState(user?.name || user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const [avatarUrl, setAvatarUrl] = useState(user?.imageUrl || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!sessionId) return;
        setIsSaving(true);
        try {
            await updateProfile({
                sessionId,
                name: displayName,
                email: email || undefined,
                imageUrl: avatarUrl.trim() || undefined,
            });
            toast({ title: "Profile updated" });
            setOpen(false);
            onClose?.();
        } catch {
            toast({ title: "Failed to update profile", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="ghost" className="w-full justify-start">Edit Profile</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="text-center">Profile</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="profile">Edit Profile</TabsTrigger>
                        <TabsTrigger value="reputation">Reputation</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-4 pt-2">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-2 border-border shadow-md">
                                    <AvatarImage src={avatarUrl || undefined} />
                                    <AvatarFallback className="text-2xl">{displayName.charAt(0) || "?"}</AvatarFallback>
                                </Avatar>
                                {user?.isAdmin && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1 shadow-sm border border-white dark:border-zinc-900 z-10">
                                        <Crown className="w-4 h-4 fill-current" />
                                    </div>
                                )}
                            </div>

                            <div className="w-full space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="displayName">Display Name</Label>
                                    <Input
                                        id="displayName"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email (Optional)</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="avatarUrl">Avatar URL</Label>
                                    <div className="relative">
                                        <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
                                        <Input
                                            id="avatarUrl"
                                            value={avatarUrl}
                                            onChange={(e) => setAvatarUrl(e.target.value)}
                                            placeholder="https://example.com/avatar.jpg"
                                            className="pl-9"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        External image URLs only. Convex-hosted avatar uploads are disabled.
                                    </p>
                                </div>
                                {isSupported && (
                                    <div className="space-y-3 rounded-lg border p-3 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="push-toggle" className="text-sm font-medium">Push Notifications</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Receive alerts for new messages.
                                                </p>
                                            </div>
                                            <Switch
                                                id="push-toggle"
                                                checked={masterEnabled}
                                                disabled={isPushToggling}
                                                onCheckedChange={async (checked) => {
                                                    setIsPushToggling(true);
                                                    await toggleMaster(checked);
                                                    setIsPushToggling(false);
                                                }}
                                            />
                                        </div>
                                        {masterEnabled && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs h-8"
                                                disabled={isTestingPush}
                                                onClick={async () => {
                                                    setIsTestingPush(true);
                                                    try {
                                                        await sendTestPush();
                                                        toast({ title: "Test notification sent!" });
                                                    } catch (err: any) {
                                                        toast({
                                                            title: "Test failed",
                                                            description: err.message || "Make sure you enabled browser notifications.",
                                                            variant: "destructive",
                                                        });
                                                    } finally {
                                                        setIsTestingPush(false);
                                                    }
                                                }}
                                            >
                                                {isTestingPush ? "Sending..." : "Send Test Notification"}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    <TabsContent value="reputation" className="space-y-4 pt-2">
                        <UserReputationCard userId={user?._id} />
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
