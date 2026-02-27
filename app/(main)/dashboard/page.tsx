export default function DashboardPage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#EFE5D8]/30">
            <h1 className="text-4xl md:text-6xl font-black mb-4 text-black tracking-tighter font-outfit">
                Welcome to VTS Community
            </h1>
            <p className="text-xl text-black/80 max-w-lg font-medium font-outfit leading-relaxed">
                Select a channel from the sidebar to start messaging.
            </p>
        </div>
    );
}
