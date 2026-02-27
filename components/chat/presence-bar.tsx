"use client";

import { usePresence, UserStatus } from "@/hooks/use-presence";
import { Users, Hash, ChevronDown } from "lucide-react";
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

import { motion, AnimatePresence } from "framer-motion";

export function PresenceBar() {
    const { globalOnlineCount, channelOnlineCount, status, setManualStatus } = usePresence();

    const statusConfig = {
        online: { color: "bg-green-500", label: "Online" },
        away: { color: "bg-yellow-500", label: "Away" },
        dnd: { color: "bg-red-500", label: "Do Not Disturb" },
        offline: { color: "bg-gray-500", label: "Offline" },
    };

    const currentStatus = statusConfig[status as keyof typeof statusConfig] || statusConfig.online;

    return (
        <div className="flex items-center h-full gap-4 px-2 select-none w-full">
            {/* Left Block: Online Counts */}
            <div className="flex items-center gap-4 flex-1">
                {/* Global Count */}
                <div className="flex items-center gap-1.5 min-w-[100px]">
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </div>
                    <div className="text-sm font-medium text-black flex items-center gap-1">
                        <span className="md:inline hidden">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={globalOnlineCount}
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 5 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {globalOnlineCount}
                                </motion.span>
                            </AnimatePresence>
                            Online
                        </span>
                        <div className="md:hidden flex items-center gap-1">
                            <Users className="h-4 w-4 text-black/60" />
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={globalOnlineCount}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {globalOnlineCount}
                                </motion.span>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Vertical Divider */}
                <div className="h-4 w-[1px] bg-black/10 hidden md:block"></div>

                {/* Channel Count */}
                <div className="flex items-center gap-1.5 min-w-[140px]">
                    <div className="md:inline hidden text-sm font-medium text-black/60">
                        <span className="flex items-center gap-1">
                            👥
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={channelOnlineCount}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    {channelOnlineCount}
                                </motion.span>
                            </AnimatePresence>
                            in this channel
                        </span>
                    </div>
                    <div className="md:hidden flex items-center gap-1 text-sm font-medium text-black/60">
                        <Hash className="h-4 w-4" />
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={channelOnlineCount}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                {channelOnlineCount}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Right Block: Status Selector */}
            <div className="flex items-center shrink-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-9 px-3 gap-2 hover:bg-black/5 rounded-full transition-colors border border-black/5">
                            <div className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-white", currentStatus.color)} />
                            <span className="text-sm font-semibold hidden lg:inline">{currentStatus.label}</span>
                            <ChevronDown className="h-3.5 w-3.5 opacity-50 mt-0.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 p-1.5" sideOffset={8}>
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
            </div>
        </div>
    );
}
