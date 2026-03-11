"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface Step {
    title: string;
    text: string;
    target?: string;
    position?: "top" | "bottom" | "left" | "right" | "center";
}

const steps: Step[] = [
    {
        title: "Welcome to VTS Chat",
        text: "Let’s take a quick tour to get you started.",
        position: "center"
    },
    {
        title: "Channels Sidebar",
        text: "This is where your channels live. Click a channel to join the conversation.",
        target: "sidebar-channels",
        position: "right"
    },
    {
        title: "Online Status",
        text: "Here you can see who’s online and update your own status.",
        target: "presence-area",
        position: "bottom"
    },
    {
        title: "Message Area",
        text: "This is where conversations happen in real time.",
        target: "message-area",
        position: "top"
    },
    {
        title: "Composer",
        text: "Type a message here to join the conversation.",
        target: "message-composer",
        position: "top"
    },
    {
        title: "Notifications",
        text: "Unread messages appear here so you never miss a thing.",
        target: "global-unread",
        position: "bottom"
    },
    {
        title: "You're all set",
        text: "Start chatting!",
        position: "center"
    }
];

export function OnboardingTour() {
    const { shouldShowTour, completeTour } = useOnboarding();
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    // Measure the target element to position the spotlight
    useEffect(() => {
        if (!shouldShowTour) return;

        const updatePosition = () => {
            const step = steps[currentStepIndex];
            if (step.target) {
                const el = document.querySelector(`[data-tour="${step.target}"]`);
                if (el) {
                    setTargetRect(el.getBoundingClientRect());
                } else {
                    // If element doesn't exist (e.g., they haven't selected a channel for message-area),
                    // fallback to center or adjust rect.
                    // Wait briefly in case it's rendering
                    setTimeout(() => {
                        const retry = document.querySelector(`[data-tour="${step.target}"]`);
                        if (retry) {
                            setTargetRect(retry.getBoundingClientRect());
                        } else {
                            setTargetRect(null); // Center fallback
                        }
                    }, 200);
                }
            } else {
                setTargetRect(null);
            }
        };

        updatePosition();

        // Re-measure on resize or scroll
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);

        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [shouldShowTour, currentStepIndex]);

    // Handle ESC to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && shouldShowTour) {
                completeTour();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [shouldShowTour, completeTour]);

    // Lock body scroll while tour is active
    useEffect(() => {
        if (shouldShowTour) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = '';
            };
        }
    }, [shouldShowTour]);

    if (!shouldShowTour) return null;

    const step = steps[currentStepIndex];
    const isLastStep = currentStepIndex === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            completeTour();
        } else {
            setCurrentStepIndex(i => i + 1);
        }
    };

    const handleBack = () => {
        setCurrentStepIndex(i => Math.max(0, i - 1));
    };

    // Give a small padding to the spotlight
    const padding = 8;

    // Spotlight Box Shadow Approach
    // The spotlight div transitions smoothly between elements
    const spotlightStyle: any = targetRect
        ? {
            top: targetRect.top - padding,
            left: targetRect.left - padding,
            width: targetRect.width + padding * 2,
            height: targetRect.height + padding * 2,
            borderRadius: "12px",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
        }
        : {
            top: "50%",
            left: "50%",
            width: 0,
            height: 0,
            borderRadius: "50%",
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
        };

    return (
        <div className="fixed inset-0 z-[100] pointer-events-auto min-h-[100dvh] w-screen overflow-hidden px-4 pt-[env(safe-area-inset-top)]">
            {/* Click outside to block interaction with background */}
            <div
                className="absolute inset-0 backdrop-blur-[2px] pointer-events-auto"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                // We keep the background dimming standard
                style={{ backdropFilter: targetRect ? "none" : "blur(4px)" }}
            />

            {/* Animated Spotlight (acts as dimming layer too) */}
            <motion.div
                className="absolute bg-transparent pointer-events-none z-0"
                initial={spotlightStyle}
                animate={spotlightStyle}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* Tour Dialog Always Centered */}
            <motion.div
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden w-full max-w-[90vw] md:max-w-md z-10 border border-black/10 break-words"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.15 }}
            >
                <div className="p-5 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                        <h3 className="font-bold text-lg text-black dark:text-white leading-tight">
                            {step.title}
                        </h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 -mr-2 -mt-2 text-muted-foreground hover:bg-black/5"
                            onClick={completeTour}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed mb-2">
                        {step.text}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {currentStepIndex + 1} of {steps.length}
                        </span>
                        <div className="flex gap-2 items-center">
                            {!isLastStep && (
                                <button
                                    onClick={completeTour}
                                    className="text-xs text-muted-foreground hover:text-foreground underline mr-2"
                                >
                                    Skip
                                </button>
                            )}
                            {currentStepIndex > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleBack}
                                    className="px-3"
                                >
                                    Back
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleNext}
                                className="bg-[#C8D8CE] hover:bg-[#BFD0C6] text-black shrink-0 px-4 shadow-sm"
                            >
                                {isLastStep ? "Finish" : "Next"}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
