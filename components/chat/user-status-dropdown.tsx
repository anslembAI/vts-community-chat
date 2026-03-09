"use client";

import { usePresence } from "@/hooks/use-presence";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function UserStatusDropdown() {
    const { status, setManualStatus } = usePresence();

    const statusConfig = {
        online: { color: "bg-green-500", label: "Online" },
        away: { color: "bg-yellow-500", label: "Away" },
        dnd: { color: "bg-red-500", label: "Do Not Disturb" },
        offline: { color: "bg-gray-500", label: "Offline" },
    };

    const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.online;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="vts-soft-card h-11 rounded-full px-4 gap-2 transition-colors shrink-0 outline-none border-0 shadow-none hover:bg-white/60">
                    <div className={cn("h-2.5 w-2.5 rounded-full shrink-0 shadow-sm", currentStatus.color)} />
                    <span className="text-sm font-medium">{currentStatus.label}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5" side="top" sideOffset={8}>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1 mb-1">Status</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setManualStatus("online")} className="gap-2 focus:bg-green-500/10 cursor-pointer rounded-md">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span className="flex-1">Online</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setManualStatus("away")} className="gap-2 focus:bg-yellow-500/10 cursor-pointer rounded-md">
                    <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    <span className="flex-1">Away</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setManualStatus("dnd")} className="gap-2 focus:bg-red-500/10 cursor-pointer rounded-md">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="flex-1">Do Not Disturb</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1.5" />
                <DropdownMenuItem onClick={() => setManualStatus(null)} className="text-[11px] text-muted-foreground hover:text-foreground cursor-pointer justify-center py-1">
                    Reset to automatic
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
