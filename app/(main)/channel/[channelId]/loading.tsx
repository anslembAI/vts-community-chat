import { Skeleton } from "@/components/ui/skeleton";

export default function ChannelLoading() {
    return (
        <div className="flex h-full flex-col">
            {/* Channel header skeleton */}
            <div className="flex h-16 items-center gap-3 border-b border-[#E2D7C9] bg-[#F4E9DD] px-6 shrink-0 shadow-sm">
                <Skeleton className="h-6 w-6 rounded" />
                <div className="flex-1 min-w-0">
                    <Skeleton className="h-5 w-32" />
                </div>
            </div>

            {/* Messages skeleton */}
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className={`flex items-start gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
                    >
                        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                        <div className={`space-y-2 ${i % 2 === 0 ? "items-end" : ""}`}>
                            <Skeleton className="h-3 w-20" />
                            <Skeleton
                                className="h-12 rounded-2xl"
                                style={{ width: `${120 + (i * 40)}px` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Input skeleton */}
            <div className="shrink-0 border-t border-[#E0D6C8] bg-[#F4E9DD] p-4">
                <Skeleton className="h-11 w-full rounded-full" />
            </div>
        </div>
    );
}
