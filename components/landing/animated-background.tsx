"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function AnimatedBackground() {
    const { theme } = useTheme(); // Note: useTheme might not give us resolvedTheme immediately on server render, so we client-side only
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Simple floating orbs animation
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-background transition-colors duration-500">
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent dark:from-indigo-900/20 dark:via-purple-900/20 opacity-50" />

            {/* Animated Orbs */}
            {[...Array(3)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 bg-blue-400 dark:bg-blue-600"
                    animate={{
                        x: [0, 100, -100, 0],
                        y: [0, -100, 100, 0],
                        scale: [1, 1.2, 1],
                    }}
                    transition={{
                        duration: 10 + i * 5,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                    }}
                    style={{
                        left: `${20 + i * 30}%`,
                        top: `${20 + i * 20}%`,
                        width: "30vw",
                        height: "30vw",
                    }}
                />
            ))}
            <motion.div
                className="absolute rounded-full mix-blend-multiply filter blur-3xl opacity-30 dark:opacity-20 bg-violet-400 dark:bg-violet-600"
                animate={{
                    x: [0, -150, 150, 0],
                    y: [0, 150, -150, 0],
                    scale: [1.2, 1, 1.2],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    repeatType: "reverse",
                    ease: "easeInOut",
                }}
                style={{
                    right: "10%",
                    bottom: "10%",
                    width: "35vw",
                    height: "35vw",
                }}
            />
        </div>
    );
}
