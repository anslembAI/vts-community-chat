export default function DashboardPage() {
    return (
        <div className="vts-panel relative flex min-h-[calc(100dvh-var(--header-height)-1.5rem-var(--safe-area-bottom))] items-center justify-center overflow-hidden rounded-[1.75rem] px-5 py-10 text-center md:h-full md:min-h-0 md:rounded-[2rem] md:px-12 md:py-12">
            <div className="pointer-events-none absolute inset-0 opacity-95">
                <div className="absolute inset-y-0 left-[-8%] w-[62%] bg-[radial-gradient(circle_at_center,rgba(182,219,241,0.55),transparent_68%)] md:left-0 md:w-[38%]" />
                <div className="absolute inset-y-0 right-[4%] w-[42%] bg-[radial-gradient(circle_at_center,rgba(246,233,191,0.46),transparent_72%)] md:right-[18%] md:w-[30%]" />
                <div className="absolute bottom-[-10%] left-1/2 h-[24%] w-[56%] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(244,204,187,0.4),transparent_68%)] md:bottom-[-8%] md:h-[34%] md:w-[42%]" />
            </div>

            <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
                <h1 className="vts-display max-w-[10ch] text-[2.85rem] font-semibold leading-[0.94] text-[#2c3034] sm:text-[3.6rem] md:max-w-none md:text-[5.6rem]">
                    Welcome to the VTS Community
                </h1>
                <p className="mx-auto mt-5 max-w-[19rem] text-base font-medium leading-8 text-black/70 sm:max-w-[24rem] sm:text-lg md:mt-6 md:max-w-2xl md:text-[1.95rem]">
                    Select a channel from the menu to start messaging.
                </p>
            </div>
        </div>
    );
}
