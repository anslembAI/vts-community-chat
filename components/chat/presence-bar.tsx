"use client";

import { usePresence } from "@/hooks/use-presence";
import { Users, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function PresenceBar() {
    const { globalOnlineCount, channelOnlineCount } = usePresence();

    return (
        <div className="flex items-center h-full gap-2 md:gap-4 px-1 md:px-2 select-none w-full overflow-hidden">
            {/* Left Block: Online Counts */}
            <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end md:justify-start mr-2 md:mr-0">
                {/* Global Count */}
                <div className="flex items-center gap-1.5 md:min-w-[100px] shrink-0">
                    <div className="relative hidden md:flex h-2 w-2">
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
                            {" "}Online
                        </span>
                        <div className="md:hidden flex items-center gap-1">
                            <div className="relative flex h-1.5 w-1.5 mr-0.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
                            </div>
                            <Users className="h-3.5 w-3.5 text-black/60" />
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
                <div className="flex items-center gap-1.5 md:min-w-[140px] shrink-0">
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
                            {" "}in this channel
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

        </div>
    );
}
