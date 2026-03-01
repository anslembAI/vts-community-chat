import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
    title: "VTS Chat Features (VTSChat) – Channels, Voice Notes, Real-Time Messaging",
    description:
        "Explore VTS Chat (vtschat.app) features: organized channels, admin-curated access, real-time messaging, voice notes, channel locking, and a responsive web app experience.",
    alternates: {
        canonical: "https://vtschat.app/features",
    },
};

export default function FeaturesPage() {
    return (
        <main className="min-h-screen bg-black text-white selection:bg-blue-500/30 font-outfit">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md">
                <div className="mx-auto max-w-4xl px-4 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm font-medium text-white/70 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Back to Home
                    </Link>
                    <nav>
                        <Link
                            href="/about"
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            About
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <div className="mx-auto max-w-3xl px-6 py-20 space-y-16">
                <div className="space-y-6">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                        VTS Chat Features
                    </h1>

                    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                        <p className="text-sm font-medium text-zinc-300">
                            VTS Chat (VTSChat) provides organized channels, admin-controlled access,
                            real-time messaging, voice notes, and a responsive web app experience
                            optimized for community communication.
                        </p>
                    </div>
                </div>

                <section className="space-y-4">
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-lg text-zinc-300">
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Organized Channel Structure</h3>
                            <p className="text-base text-zinc-500">Keep discussions focused and easy to navigate with dedicated channels.</p>
                        </li>
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Admin-Curated Access Control</h3>
                            <p className="text-base text-zinc-500">Manage who can see and participate in specific spaces securely.</p>
                        </li>
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Real-Time Messaging</h3>
                            <p className="text-base text-zinc-500">Instantly connect and collaborate with lightning-fast chat functionality.</p>
                        </li>
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Voice Notes</h3>
                            <p className="text-base text-zinc-500">Share vocal ideas and communicate effortlessly asynchronously.</p>
                        </li>
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Channel Locking</h3>
                            <p className="text-base text-zinc-500">Restrict channels dynamically for sensitive or elevated community access.</p>
                        </li>
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Online Presence Indicators</h3>
                            <p className="text-base text-zinc-500">Know who is active to coordinate communication smoothly.</p>
                        </li>
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Message Actions & Thread Support</h3>
                            <p className="text-base text-zinc-500">Reply contextually, react, and organize sub-conversations in threads.</p>
                        </li>
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Secure Authentication</h3>
                            <p className="text-base text-zinc-500">Robust sign-ins guarantee a protected environment for all members.</p>
                        </li>
                        <li className="space-y-2">
                            <h3 className="text-xl font-bold text-white">Responsive Web App Experience</h3>
                            <p className="text-base text-zinc-500">Work seamlessly everywhere from desktop displays to mobile screens.</p>
                        </li>
                    </ul>
                </section>
            </div>
        </main>
    );
}
