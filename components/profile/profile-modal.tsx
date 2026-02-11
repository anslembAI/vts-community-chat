
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
import { User, Crown } from "lucide-react";
import { UserReputationCard } from "@/components/reputation/user-reputation-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProfileModalProps {
    user: any; // Ideally types from Convex
    onClose?: () => void;
    trigger?: React.ReactNode;
}

export function ProfileModal({ user, onClose, trigger }: ProfileModalProps) {
    const { sessionId } = useAuth();
    const updateProfile = useMutation(api.profile.updateProfile);
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const [displayName, setDisplayName] = useState(user?.name || user?.username || "");
    const [email, setEmail] = useState(user?.email || "");
    const [imageUrl, setImageUrl] = useState(user?.imageUrl || "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!sessionId) return;
        setIsSaving(true);
        try {
            await updateProfile({
                sessionId,
                name: displayName,
                email: email || undefined,
                imageUrl: imageUrl || undefined
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
                            <div className="relative">
                                <Avatar className="h-24 w-24 border-2 border-border shadow-md">
                                    <AvatarImage src={imageUrl} />
                                    <AvatarFallback className="text-2xl">{displayName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {user?.isAdmin && (
                                    <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full p-1 shadow-sm border border-white dark:border-zinc-900">
                                        <Crown className="w-4 h-4 fill-current" />
                                    </div>
                                )}
                                <Input
                                    className="mt-2 text-xs h-8"
                                    placeholder="Image URL"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                />
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
