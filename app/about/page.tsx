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
        <main className="vts-app-shell h-full overflow-y-auto px-3 py-3 text-[#2c3034] md:px-4 md:py-4">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />

            <div className="mx-auto flex max-w-6xl flex-col gap-4">
                <header className="vts-panel sticky top-0 z-40 flex items-center justify-between rounded-[2rem] px-5 py-4">
                    <Link href="/" className="vts-soft-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-black/70 hover:text-black">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                    <nav>
                        <Link href="/features" className="text-sm font-medium text-black/55 transition-colors hover:text-black">
                            Features
                        </Link>
                    </nav>
                </header>

                <section className="vts-panel overflow-hidden rounded-[2rem] px-6 py-10 md:px-10 md:py-14">
                    <div className="pointer-events-none absolute" />
                    <div className="max-w-4xl space-y-10">
                        <div className="space-y-5">
                            <p className="text-sm uppercase tracking-[0.22em] text-black/45">About VTS Chat</p>
                            <h1 className="vts-display max-w-4xl text-5xl leading-[0.92] text-[#2c3034] md:text-7xl">
                                Organized communication for serious communities.
                            </h1>
                            <p className="max-w-2xl text-lg text-black/65 md:text-xl">
                                VTS Chat is built for communities that want structure, clarity, and real-time conversation without the usual noise.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="vts-soft-card rounded-[1.5rem] p-5">
                                <p className="text-sm uppercase tracking-[0.18em] text-black/40">Purpose</p>
                                <p className="mt-3 text-base text-black/70">Structured channels and curated spaces that keep discussion focused.</p>
                            </div>
                            <div className="vts-soft-card rounded-[1.5rem] p-5">
                                <p className="text-sm uppercase tracking-[0.18em] text-black/40">Audience</p>
                                <p className="mt-3 text-base text-black/70">Private groups, educational communities, and trading teams.</p>
                            </div>
                            <div className="vts-soft-card rounded-[1.5rem] p-5">
                                <p className="text-sm uppercase tracking-[0.18em] text-black/40">Approach</p>
                                <p className="mt-3 text-base text-black/70">Admin-controlled access, clean navigation, and responsive messaging.</p>
                            </div>
                        </div>

                        <section className="grid gap-6 md:grid-cols-2">
                            <div className="vts-soft-card rounded-[1.75rem] p-6">
                                <h2 className="text-2xl font-semibold text-[#2c3034]">What is VTS Chat?</h2>
                                <p className="mt-4 text-base leading-7 text-black/65">
                                    VTS Chat is a secure real-time collaboration platform designed for structured communities. It emphasizes clarity, channel organization, and controlled access instead of chaotic, feed-style communication.
                                </p>
                            </div>
                            <div className="vts-soft-card rounded-[1.75rem] p-6">
                                <h2 className="text-2xl font-semibold text-[#2c3034]">Our Mission</h2>
                                <p className="mt-4 text-base leading-7 text-black/65">
                                    Create a focused communication environment where members can collaborate efficiently through organized spaces, real-time messaging, and admin-curated community structure.
                                </p>
                            </div>
                        </section>

                        <section className="vts-soft-card rounded-[1.75rem] p-6 md:p-8">
                            <h2 className="text-3xl font-semibold text-[#2c3034]">Why VTS Chat?</h2>
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {[
                                    "Structured channel organization",
                                    "Admin-controlled permissions",
                                    "Real-time messaging",
                                    "Private and secure environment",
                                    "Clean, modern user experience",
                                    "Designed for focused communities",
                                ].map((item) => (
                                    <div key={item} className="rounded-2xl border border-white/45 bg-white/35 px-4 py-4 text-base text-black/70">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-5">
                            <h2 className="text-3xl font-semibold text-[#2c3034]">FAQ</h2>
                            <div className="grid gap-4">
                                {[
                                    ["What is VTS Chat?", "VTS Chat is a secure real-time collaboration platform with organized channels and admin-controlled community messaging."],
                                    ["Is VTS Chat the same as VTSChat?", "Yes. VTS Chat is also referred to as VTSChat and is available at vtschat.app."],
                                    ["What is vtschat.app?", "vtschat.app is the official website for VTS Chat, the platform for structured community communication."],
                                    ["Who is VTS Chat for?", "VTS Chat is designed for private communities, teams, and groups that need organized, admin-curated channels and real-time messaging."],
                                ].map(([question, answer]) => (
                                    <div key={question} className="vts-soft-card rounded-[1.5rem] p-6">
                                        <h3 className="text-xl font-semibold text-[#2c3034]">{question}</h3>
                                        <p className="mt-3 text-base leading-7 text-black/65">{answer}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                </section>
            </div>
        </main>
    );
}
