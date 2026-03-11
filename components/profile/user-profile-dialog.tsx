"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Crown } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StartDirectMessageButton } from "@/components/dm/start-direct-message-button";

interface UserProfileDialogProps {
  userId: Id<"users">;
  fallbackName?: string;
  fallbackAvatarUrl?: string | null;
  trigger: React.ReactNode;
}

export function UserProfileDialog({ userId, fallbackName, fallbackAvatarUrl, trigger }: UserProfileDialogProps) {
  const { sessionId } = useAuth();
  const [open, setOpen] = useState(false);
  const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
  const user = useQuery(api.users.getUserById, sessionId && open ? { sessionId, userId } : "skip");

  const displayName = user?.name || fallbackName || user?.username || "User";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="relative">
            <Avatar className="h-24 w-24 border border-white/50 shadow-sm">
              <AvatarImage src={user?.avatarUrl || fallbackAvatarUrl || undefined} />
              <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
            </Avatar>
            {user?.isAdmin ? (
              <Crown className="absolute -right-1 -top-1 h-5 w-5 fill-current text-yellow-500" />
            ) : null}
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-[#2c3034]">{displayName}</p>
            {user?.username ? <p className="text-sm text-black/45">@{user.username}</p> : null}
          </div>
          {currentUser?._id !== userId ? (
            <StartDirectMessageButton
              userId={userId}
              size="sm"
              variant="default"
              className="gap-2"
              label="Message"
              onStarted={() => setOpen(false)}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
