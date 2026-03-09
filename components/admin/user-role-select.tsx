"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface UserRoleSelectProps {
    userId: Id<"users">;
    currentRole?: string;
    currentIsAdmin?: boolean;
    disabled?: boolean;
}

export function UserRoleSelect({ userId, currentRole, currentIsAdmin, disabled }: UserRoleSelectProps) {
    const { sessionId } = useAuth();
    const updateRole = useMutation(api.users.updateUserRole);
    const { toast } = useToast();
    const [isUpdating, setIsUpdating] = useState(false);

    // Normalize role
    const effectiveRole = currentRole || (currentIsAdmin ? "admin" : "user");

    const handleRoleChange = async (newRole: string) => {
        if (!sessionId) return;
        if (newRole === effectiveRole) return;

        setIsUpdating(true);
        try {
            await updateRole({
                sessionId,
                id: userId,
                role: newRole as "admin" | "moderator" | "user",
            });
            toast({ description: "Role updated successfully." });
        } catch (error) {
            toast({
                variant: "destructive",
                description: (error as Error).message || "Failed to update role.",
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="flex items-center gap-2">
            <Select
                value={effectiveRole}
                onValueChange={handleRoleChange}
                disabled={disabled || isUpdating}
            >
                <SelectTrigger className="h-8 w-[118px] rounded-full border-white/45 bg-white/45 px-3 text-xs font-semibold">
                    <SelectValue placeholder="Select role" />
                    {isUpdating && <Loader2 className="ml-2 h-3 w-3 animate-spin" />}
                </SelectTrigger>
                <SelectContent align="end" className="border-white/40 bg-[#f7f7f4]/92 backdrop-blur-xl">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="moderator">Moderator</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
