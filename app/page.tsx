"use client";

import { useState, useEffect } from "react";
import { BackgroundEffects } from "@/components/welcome/background-effects";
import { AuthModal } from "@/components/welcome/auth-modal";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { VTSLogo } from "@/components/landing/vts-logo";
import Link from "next/link";

export default function WelcomeScreen() {
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [isAuthOpen, setIsAuthOpen] = useState(false);
    const [authTab, setAuthTab] = useState<"signIn" | "signUp">("signIn");

    // Redirect if authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push("/dashboard");
        }
    }, [isLoading, isAuthenticated, router]);

    // Auto-open modal after delay
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            const timer = setTimeout(() => {
                setIsAuthOpen(true);
            }, 800); // 800ms delay as requested
            return () => clearTimeout(timer);
        }
    }, [isLoading, isAuthenticated]);

    const handleOpenAuth = (tab: "signIn" | "signUp") => {
        setAuthTab(tab);
        setIsAuthOpen(true);
    };

    if (isLoading || isAuthenticated) return null; // Or a loading spinner

    return (
        <main className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-hidden selection:bg-blue-500/30 font-outfit">
            <BackgroundEffects />

            {/* Top Navigation */}
            <header className="absolute top-0 w-full z-50 px-6 py-6 md:px-8 md:py-8 flex justify-end">
                <nav className="flex items-center gap-6 text-sm font-medium">
                    <Link
                        href="/about"
                        className="text-white/70 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
                    >
                        About
                    </Link>
                    <Link
                        href="/features"
                        className="text-white/70 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all"
                    >
                        Features
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section
                className={`relative z-10 w-full max-w-4xl mx-auto text-center space-y-8 transition-all duration-700 ${isAuthOpen ? "blur-sm opacity-50 scale-95" : "opacity-100 blur-0 scale-100"}`}
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="space-y-8"
                >
                    {/* Branding Lockup */}
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <div className="relative">
                                <VTSLogo className="h-24 w-auto drop-shadow-2xl" />
                                <div className="absolute inset-0 bg-blue-500/20 blur-3xl -z-10 rounded-full" />
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold tracking-[0.2em] text-blue-400 uppercase">
                                    Welcome to
                                </p>
                                <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white">
                                    VTS Chat Community
                                </h1>
                                <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto font-light leading-relaxed">
                                    Private collaboration, organized channels, real community.
                                </p>
                            </div>
                        </motion.div>

                        {/* Trust Cues */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="flex items-center justify-center gap-6 text-[10px] sm:text-xs font-medium text-zinc-600 uppercase tracking-widest"
                        >
                            <span className="flex items-center gap-1.5"><Lock className="w-3 h-3" /> Secure Sign-in</span>
                            <span className="w-1 h-1 rounded-full bg-zinc-800" />
                            <span>Admin-Curated Channels</span>
                        </motion.div>
                    </div>

                    {/* Primary CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="flex flex-col items-center gap-4 pt-4"
                    >
                        <Button
                            size="lg"
                            onClick={() => handleOpenAuth("signUp")}
                            className="h-14 px-8 rounded-full text-base font-semibold bg-white text-black hover:bg-zinc-200 transition-all shadow-xl shadow-white/10 hover:scale-105"
                        >
                            Get Started <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>

                        <button
                            onClick={() => handleOpenAuth("signIn")}
                            className="text-sm text-zinc-500 hover:text-white transition-colors"
                        >
                            Sign In
                        </button>
                    </motion.div>
                </motion.div>
            </section>

            {/* Premium Footer */}
            <footer className="absolute bottom-8 left-0 right-0 text-center z-20 flex flex-col items-center gap-2 pb-[env(safe-area-inset-bottom)] px-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-[0.3em] opacity-30">
                    &copy; {new Date().getFullYear()} VTS Chat &bull; Secure Real-time Messaging
                </p>
                <p className="text-[11px] text-white/50 tracking-wide font-light">
                    Created by <span className="text-white/70">Anslem Brathwaite</span>
                </p>
            </footer>

            {/* Auth Modal Overlay */}
            <AuthModal
                isOpen={isAuthOpen}
                onOpenChange={setIsAuthOpen}
                defaultTab={authTab}
            />
        </main>
    );
}
