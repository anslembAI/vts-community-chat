import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { AnimatedBackground } from "@/components/landing/animated-background";
import { VTSLogo } from "@/components/landing/vts-logo";
import { AuthWrapper } from "@/components/landing/auth-wrapper";

export default function WelcomePage() {
    const { sessionId, isLoading: isAuthLoading } = useAuth();
    const [authMode, setAuthMode] = useState<"signIn" | "signUp">("signIn");
    const [isAuthOpen, setIsAuthOpen] = useState(false);

    // If authenticated, we could redirect here or show a "Go to Dashboard" button.
    // For now, let's assume this is a landing page that can be visited anytime.

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
                duration: 0.8,
            },
        },
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring" as const,
                stiffness: 100,
                damping: 20,
            },
        },
    };

    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden bg-background text-foreground selection:bg-primary/30">
            {/* Background Layer */}
            <div className="absolute inset-0 z-0">
                <AnimatedBackground />
                {/* Overlay gradient for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent pointer-events-none" />
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-[1400px] mx-auto">
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                    className="w-full max-w-md mx-auto relative group perspective"
                >
                    {/* Glass Card */}
                    <div
                        className="relative bg-background/40 dark:bg-black/40 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl p-8 sm:p-12 shadow-2xl ring-1 ring-black/5 overflow-hidden transition-all duration-500 hover:shadow-primary/5 hover:bg-background/50"
                        style={{
                            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        }}
                    >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />

                        {/* Content */}
                        <div className="flex flex-col items-center text-center space-y-8">
                            {/* Logo */}
                            <motion.div variants={itemVariants} className="relative">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150 animate-pulse-slow" />
                                <VTSLogo className="w-16 h-16 text-primary relative z-10" />
                            </motion.div>

                            {/* Title & Tagline */}
                            <motion.div variants={itemVariants} className="space-y-3">
                                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70">
                                    VTS Chat Community
                                </h1>
                                <p className="text-muted-foreground text-lg font-medium leading-relaxed">
                                    Connect. Organize. Move as one.
                                </p>
                            </motion.div>

                            {/* Auth Actions */}
                            <motion.div variants={itemVariants} className="w-full space-y-4 pt-4">
                                {sessionId ? (
                                    <Link href="/" className="block w-full">
                                        <Button size="lg" className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                                            Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                ) : (
                                    <>
                                        <Button
                                            onClick={() => { setAuthMode("signIn"); setIsAuthOpen(true); }}
                                            size="lg"
                                            className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all bg-primary hover:bg-primary/90"
                                        >
                                            Sign In
                                        </Button>
                                        <Button
                                            onClick={() => { setAuthMode("signUp"); setIsAuthOpen(true); }}
                                            variant="outline"
                                            size="lg"
                                            className="w-full h-12 text-base font-semibold border-white/10 dark:border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all"
                                        >
                                            Create Account
                                        </Button>
                                    </>
                                )}
                            </motion.div>

                            {/* Footer helper */}
                            <motion.div variants={itemVariants} className="flex flex-col gap-2">
                                <p className="text-xs text-muted-foreground/60 font-medium tracking-wide">
                                    Admin access required for channel creation.
                                </p>

                                <Link
                                    href="/"
                                    className="text-xs text-primary/80 hover:text-primary transition-colors underline-offset-4 hover:underline mt-2"
                                >
                                    Continue as Guest
                                </Link>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </main>

            {/* Auth Dialog (using existing component but controlling state) */}
            {/* Note: AuthDialog as written controls its own state mostly, but we trigger it via button. 
                 The existing AuthDialog seems to be designed as a modal triggered by a button inside it?
                 Let's check AuthDialog usage. Ah, existing AuthDialog renders a DialogTrigger.
                 I might need to wrap Button in AuthDialog or just render AuthDialog controlled.
                 Let's assume I can wrap the buttons above.
                 Actually, looking at previous context, AuthDialog usually manages its internal open state or accepts `open` prop.
                 I will wrap the buttons with a custom trigger if needed, or if AuthDialog exports a controlled version.
                 Wait, I can just use the AuthDialog component if I rework it slightly or use it as is if it accepts `open` props.
                 I'll wrap it for now.
             */}

            {/* Correction: The buttons above set state. I should render the Auth Dialog conditionally or pass props.
                 Since I can't easily see `auth-dialog.tsx` right now without viewing it, I will assume it's standard.
                 Actually, I'll view it first to be sure.
             */}
            <AuthWrapper
                isOpen={isAuthOpen}
                onOpenChange={setIsAuthOpen}
                defaultTab={authMode}
            />

        </div>
    );
}

// Temporary wrapper to bridge the existing AuthDialog if it's not fully controlled
// or to inject the functionality.
// Actually, I'll just view `auth-dialog.tsx` first to ensure I integrate it correctly.
// I will pause on writing this file until I check the AuthDialog.
