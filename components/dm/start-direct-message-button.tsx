"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { useMutation } from "convex/react";
import { MessageCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getOrCreateSessionId } from "@/lib/session-utils";

interface StartDirectMessageButtonProps {
  userId: Id<"users">;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  className?: string;
  label?: string;
  onStarted?: () => void;
}

export function StartDirectMessageButton({
  userId,
  variant = "ghost",
  size = "icon",
  className,
  label = "Message",
  onStarted,
}: StartDirectMessageButtonProps) {
  const router = useRouter();
  const { sessionId } = useAuth();
  const { toast } = useToast();
  const getOrCreateThread = useMutation(api.directMessages.getOrCreateThread);
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (!sessionId) return;
    setIsStarting(true);
    try {
      const threadId = await getOrCreateThread({
        sessionId,
        clientSessionId: getOrCreateSessionId(),
        targetUserId: userId,
      });
      onStarted?.();
      router.push(`/messages/${threadId}`);
    } catch (error: any) {
      toast({
        title: "Unable to start conversation",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={handleStart}
      disabled={isStarting}
    >
      {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {size !== "icon" ? <span>{label}</span> : null}
    </Button>
  );
}
