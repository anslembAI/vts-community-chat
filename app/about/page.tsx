import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
    title: "About VTS Chat (vtschat.app) – Secure Community Messaging",
    description:
        "Learn what VTS Chat (vtschat.app) is: a secure real-time collaboration platform with organized channels and admin-curated community communication.",
    alternates: {
        canonical: "https://vtschat.app/about",
    },
};

export default function AboutPage() {
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            {
                "@type": "Question",
                name: "What is VTS Chat?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "VTS Chat is a secure real-time collaboration platform with organized channels and admin-controlled community messaging.",
                },
            },
            {
                "@type": "Question",
                name: "Is VTS Chat the same as VTSChat?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "Yes. VTS Chat is also referred to as VTSChat and is available at vtschat.app.",
                },
            },
            {
                "@type": "Question",
                name: "What is vtschat.app?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "vtschat.app is the official website for VTS Chat, the platform for structured community communication.",
                },
            },
            {
                "@type": "Question",
                name: "Who is VTS Chat for?",
                acceptedAnswer: {
                    "@type": "Answer",
                    text: "VTS Chat is designed for private communities, teams, and groups that need organized, admin-curated channels and real-time messaging.",
                },
            },
        ],
    };

    return (
        <main className="h-full overflow-y-auto bg-black text-white selection:bg-blue-500/30 font-outfit">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

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
                            href="/features"
                            className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                        >
                            Features
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Content */}
            <div className="mx-auto max-w-3xl px-6 py-20 space-y-16">
                <div className="space-y-6">
                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
                        VTS Chat – Organized Communication for Real Communities
                    </h1>
                </div>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">What is VTS Chat?</h2>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        VTS Chat (vtschat.app) is a secure real-time collaboration platform
                        designed for structured communities. Unlike traditional chat apps
                        that become noisy and disorganized, VTS Chat focuses on clarity,
                        organization, and admin-curated channel management.
                    </p>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        It is built for private communities, educational groups, trading
                        teams, and organizations that value structured discussion over
                        chaos.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">Our Mission</h2>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        Our mission is to create a focused, distraction-free communication
                        environment where members can collaborate efficiently through
                        organized channels, real-time messaging, and admin-controlled access.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-white">Why VTS Chat?</h2>
                    <ul className="list-disc list-inside space-y-2 text-lg text-zinc-400">
                        <li>Structured channel organization</li>
                        <li>Admin-controlled permissions</li>
                        <li>Real-time messaging</li>
                        <li>Private and secure environment</li>
                        <li>Clean, modern user experience</li>
                    </ul>
                </section>

                {/* FAQ Section */}
                <section className="space-y-8 pt-8 border-t border-white/10">
                    <h2 className="text-3xl font-bold text-white">VTS Chat FAQ</h2>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white">
                                Q: What is VTS Chat?
                            </h3>
                            <p className="text-lg text-zinc-400">
                                A: VTS Chat is a secure real-time collaboration platform with
                                organized channels and admin-controlled community messaging.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white">
                                Q: Is VTS Chat the same as VTSChat?
                            </h3>
                            <p className="text-lg text-zinc-400">
                                A: Yes. VTS Chat is also referred to as VTSChat and is available
                                at vtschat.app.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white">
                                Q: What is vtschat.app?
                            </h3>
                            <p className="text-lg text-zinc-400">
                                A: vtschat.app is the official website for VTS Chat, the platform
                                for structured community communication.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-white">
                                Q: Who is VTS Chat for?
                            </h3>
                            <p className="text-lg text-zinc-400">
                                A: VTS Chat is designed for private communities, teams, and
                                groups that need organized, admin-curated channels and real-time
                                messaging.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
