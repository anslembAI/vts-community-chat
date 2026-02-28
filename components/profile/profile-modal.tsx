
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
import { Crown, Camera } from "lucide-react";
import { UserReputationCard } from "@/components/reputation/user-reputation-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AvatarEditor } from "./avatar-editor";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface ProfileModalProps {
    user: any; // Ideally types from Convex
    onClose?: () => void;
    trigger?: React.ReactNode;
}

export function ProfileModal({ user, onClose, trigger }: ProfileModalProps) {
    const { sessionId } = useAuth();
    const updateProfile = useMutation(api.profile.updateProfile);
    const generateUploadUrl = useMutation(api.profile.generateAvatarUploadUrl);
    const updateMyAvatar = useMutation(api.profile.updateMyAvatar);
    const removeMyAvatar = useMutation(api.profile.removeMyAvatar);

    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [editorOpen, setEditorOpen] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const { isSupported, masterEnabled, toggleMaster } = usePushNotifications();
    const [isPushToggling, setIsPushToggling] = useState(false);

    const [displayName, setDisplayName] = useState(user?.name || user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const avatarUrl = user?.avatarUrl;
    const [isSaving, setIsSaving] = useState(false);

    const handleAvatarSave = async (blob: Blob) => {
        if (!sessionId) return;
        setUploadProgress(10);
        try {
            // 1. Get upload URL
            const uploadUrl = await generateUploadUrl({ sessionId });
            setUploadProgress(30);

            // 2. Upload file via fetch to get progress
            // We use XMLHttpRequest for actual progress tracking since fetch doesn't support upload progress
            const storageId = await new Promise<string>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open("POST", uploadUrl);
                xhr.setRequestHeader("Content-Type", blob.type);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = 30 + Math.round((e.loaded / e.total) * 60);
                        setUploadProgress(percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const result = JSON.parse(xhr.responseText);
                            resolve(result.storageId);
                        } catch (err) {
                            reject(new Error("Failed to parse upload response"));
                        }
                    } else {
                        reject(new Error(`Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error("Upload failed"));
                xhr.send(blob);
            });
            setUploadProgress(95);

            // 3. Update backend with storageId
            await updateMyAvatar({ sessionId, storageId: storageId as any });
            setUploadProgress(100);

            // Wait a moment for visual completion
            setTimeout(() => setUploadProgress(0), 500);

        } catch (error) {
            setUploadProgress(0);
            throw error; // Will be caught by AvatarEditor and show error toast
        }
    };

    const handleAvatarRemove = async () => {
        if (!sessionId) return;
        await removeMyAvatar({ sessionId });
    };

    const handleSave = async () => {
        if (!sessionId) return;
        setIsSaving(true);
        try {
            await updateProfile({
                sessionId,
                name: displayName,
                email: email || undefined,
            });
            toast({ title: "Profile updated" });
            setOpen(false);
            onClose?.();
        } catch (error) {
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

                    {/* ─── Edit Profile Tab ─── */}
                    <TabsContent value="profile" className="space-y-4 pt-2">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative group cursor-pointer" onClick={() => setEditorOpen(true)}>
                                <Avatar className="h-24 w-24 border-2 border-border shadow-md transition-all group-hover:opacity-80">
                                    <AvatarImage src={avatarUrl} />
                                    <AvatarFallback className="text-2xl">{displayName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white pb-1">
                                    <Camera className="w-6 h-6 mb-0.5 mt-2" />
                                    <span className="text-[10px] uppercase tracking-wider font-semibold">Change</span>
                                </div>
                                {user?.isAdmin && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1 shadow-sm border border-white dark:border-zinc-900 z-10">
                                        <Crown className="w-4 h-4 fill-current" />
                                    </div>
                                )}
                            </div>

                            <AvatarEditor
                                open={editorOpen}
                                onOpenChange={setEditorOpen}
                                onSave={handleAvatarSave}
                                onRemove={user?.avatarStorageId || user?.imageUrl ? handleAvatarRemove : undefined}
                                uploadProgress={uploadProgress}
                                hasExistingAvatar={!!(user?.avatarStorageId || user?.imageUrl)}
                            />

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
                                {isSupported && (
                                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
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
                                )}
                            </div>
                        </div>

                        <DialogFooter className="sm:justify-center">
                            <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </TabsContent>

                    {/* ─── Reputation Tab ─── */}
                    <TabsContent value="reputation" className="pt-2">
                        {user?._id && (
                            <UserReputationCard
                                userId={user._id}
                                sessionId={sessionId}
                            />
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
