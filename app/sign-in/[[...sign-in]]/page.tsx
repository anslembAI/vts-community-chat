
import { SignInCard } from "@/components/auth/sign-in-card";

export default function Page() {
    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
            <div className="h-full flex flex-col items-center justify-center px-4 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                <SignInCard />
            </div>
            <div className="hidden lg:flex h-full items-center justify-center relative overflow-hidden bg-zinc-900">
                {/* CSS Background Fallback */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/40 via-zinc-900 to-black">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                    <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                {/* Text Overlay */}
                <div className="relative z-10 text-white text-center p-12 max-w-lg">
                    <h1 className="text-4xl font-bold mb-6 drop-shadow-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                        Welcome to the VTS Chat Community
                    </h1>
                    <p className="text-lg text-zinc-300 drop-shadow-md font-light">
                        Experience the joy of secure, seamless connection.
                    </p>
                </div>
            </div>
        </div>
    );
}
