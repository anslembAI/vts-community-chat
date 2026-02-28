"use client";

import { useState, useEffect } from "react";
import { useOnboarding } from "@/hooks/use-onboarding";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, X } from "lucide-react";

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
        text: "Type a message here, or tap the mic to send a voice note.",
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

    // Determine Dialog Position
    let dialogStyle: React.CSSProperties = {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
    };

    // Give a small padding to the spotlight
    const padding = 8;

    if (targetRect && step.position !== "center") {
        const spaceX = 20;
        const spaceY = 20;

        // Default to bottom
        let top = targetRect.bottom + spaceY;
        let left = targetRect.left + (targetRect.width / 2);
        let transform = "translateX(-50%)";

        if (step.position === "right") {
            top = targetRect.top + (targetRect.height / 2);
            left = targetRect.right + spaceX;
            transform = "translateY(-50%)";
        } else if (step.position === "left") {
            top = targetRect.top + (targetRect.height / 2);
            left = targetRect.left - spaceX;
            transform = "translate(-100%, -50%)";
        } else if (step.position === "top") {
            top = targetRect.top - spaceY;
            left = targetRect.left + (targetRect.width / 2);
            transform = "translate(-50%, -100%)";
        }

        // Keep dialog strictly within viewport bounds if possible (simplified constraint)
        dialogStyle = {
            position: "fixed",
            top: `${top}px`,
            left: `${left}px`,
            transform,
        };
    } else {
        dialogStyle = {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
        };
    }

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
        <div className="fixed inset-0 z-[100] pointer-events-auto h-screen w-screen overflow-hidden">
            {/* Click outside to block interaction with background */}
            <div
                className="absolute inset-0 backdrop-blur-[2px] pointer-events-auto"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                // we can't easily put backdrop-blur underneath a box-shadow cutout without it blurring the cutout too.
                // So we apply blur to the whole container, but it will blur the target text as well if not careful.
                // Actually, if we use mask styling, we can avoid this.
                // In this implementation, sticking to simple shadow for 100% reliability over the target.
                // We will remove backdrop-blur here to keep target crisp, as box-shadow masks the rest perfectly.
                style={{ backdropFilter: targetRect ? "none" : "blur(4px)" }}
            />

            {/* Animated Spotlight (acts as dimming layer too) */}
            <motion.div
                className="absolute bg-transparent pointer-events-none z-0"
                initial={spotlightStyle}
                animate={spotlightStyle}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />

            {/* Tour Dialog */}
            <motion.div
                className="absolute bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden max-w-sm w-[320px] z-10 border border-black/10"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                style={{ ...dialogStyle, maxWidth: "calc(100vw - 32px)" }}
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
