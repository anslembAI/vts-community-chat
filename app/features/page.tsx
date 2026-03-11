import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
    title: "VTS Chat Features (VTSChat) – Channels, Real-Time Messaging",
    description:
        "Explore VTS Chat (vtschat.app) features: organized channels, admin-curated access, real-time messaging, channel locking, and a responsive web app experience.",
    alternates: {
        canonical: "https://vtschat.app/features",
    },
};

const featureCards = [
    ["Organized Channel Structure", "Keep discussions focused and easy to navigate with dedicated channels."],
    ["Admin-Curated Access Control", "Manage who can see and participate in specific spaces securely."],
    ["Real-Time Messaging", "Connect instantly with fast, responsive chat built for live communities."],
    ["Channel Locking", "Restrict channels dynamically for elevated access or moderation needs."],
    ["Online Presence Indicators", "See who is active and coordinate communication more efficiently."],
    ["Threads and Message Actions", "Reply contextually, react quickly, and keep side conversations organized."],
    ["Secure Authentication", "Protect the community with controlled sign-ins and stronger account security."],
    ["Responsive Web App", "Use the app cleanly across desktop and mobile without changing workflows."],
];

export default function FeaturesPage() {
    return (
        <main className="vts-app-shell h-full overflow-y-auto px-3 py-3 text-[#2c3034] md:px-4 md:py-4">
            <div className="mx-auto flex max-w-6xl flex-col gap-4">
                <header className="vts-panel sticky top-0 z-40 flex items-center justify-between rounded-[2rem] px-5 py-4">
                    <Link href="/" className="vts-soft-card inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-black/70 hover:text-black">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                    <nav>
                        <Link href="/about" className="text-sm font-medium text-black/55 transition-colors hover:text-black">
                            About
                        </Link>
                    </nav>
                </header>

                <section className="vts-panel rounded-[2rem] px-6 py-10 md:px-10 md:py-14">
                    <div className="max-w-5xl space-y-10">
                        <div className="space-y-5">
                            <p className="text-sm uppercase tracking-[0.22em] text-black/45">Platform Features</p>
                            <h1 className="vts-display text-5xl leading-[0.92] text-[#2c3034] md:text-7xl">
                                Built for structured, high-signal community communication.
                            </h1>
                            <div className="vts-soft-card max-w-3xl rounded-[1.5rem] p-5">
                                <p className="text-base leading-7 text-black/65">
                                    VTS Chat combines organized channels, real-time messaging, lockable spaces, and responsive design into one focused collaboration environment.
                                </p>
                            </div>
                        </div>

                        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {featureCards.map(([title, description]) => (
                                <article key={title} className="vts-soft-card rounded-[1.75rem] p-6">
                                    <h2 className="text-xl font-semibold text-[#2c3034]">{title}</h2>
                                    <p className="mt-3 text-base leading-7 text-black/65">{description}</p>
                                </article>
                            ))}
                        </section>
                    </div>
                </section>
            </div>
        </main>
    );
}
