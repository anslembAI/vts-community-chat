"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { Plus, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StartDirectMessageButton } from "@/components/dm/start-direct-message-button";

interface NewDirectMessageModalProps {
  trigger?: React.ReactNode;
}

export function NewDirectMessageModal({ trigger }: NewDirectMessageModalProps) {
  const { sessionId } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const users = useQuery(
    api.directMessages.searchUsers,
    sessionId && open ? { sessionId, searchTerm } : "skip"
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button type="button" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New Message
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by display name"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto">
            {users?.map((user) => (
              <div key={user._id} className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/35 px-3 py-2">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9 border border-white/50">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback>{user.name?.charAt(0) || user.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium text-[#2c3034]">{user.name}</span>
                </div>
                <StartDirectMessageButton
                  userId={user._id}
                  size="sm"
                  variant="outline"
                  onStarted={() => setOpen(false)}
                />
              </div>
            ))}
            {users && users.length === 0 ? (
              <p className="py-8 text-center text-sm text-black/45">No users found.</p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
