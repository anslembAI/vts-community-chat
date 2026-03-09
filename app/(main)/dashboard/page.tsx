export default function DashboardPage() {
    return (
        <div className="vts-panel relative flex h-full min-h-0 items-center justify-center overflow-hidden rounded-[2rem] px-8 py-12 text-center md:px-12">
            <div className="pointer-events-none absolute inset-0 opacity-95">
                <div className="absolute inset-y-0 left-0 w-[38%] bg-[radial-gradient(circle_at_center,rgba(182,219,241,0.55),transparent_68%)]" />
                <div className="absolute inset-y-0 right-[18%] w-[30%] bg-[radial-gradient(circle_at_center,rgba(246,233,191,0.46),transparent_72%)]" />
                <div className="absolute bottom-[-8%] left-1/2 h-[34%] w-[42%] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(244,204,187,0.4),transparent_68%)]" />
            </div>

            <div className="relative z-10 max-w-4xl">
                <h1 className="vts-display text-[3.4rem] font-semibold leading-[0.92] text-[#2c3034] sm:text-[4.4rem] md:text-[5.6rem]">
                    Welcome to the
                    <br />
                    VTS Community
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg font-medium text-black/75 md:text-[1.95rem]">
                    Select a channel from the menu to start messaging.
                </p>
            </div>
        </div>
    );
}
