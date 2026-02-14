export default function DashboardPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.3)] tracking-tight">
                Welcome to Community Chat
            </h1>
            <p className="text-lg text-slate-400 max-w-md">
                Select a channel from the sidebar to start messaging.
            </p>
        </div>
    );
}
