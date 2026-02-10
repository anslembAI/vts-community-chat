"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Hash, Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";


export function ChannelList() {
    const channels = useQuery(api.channels.getChannels);
    const pathname = usePathname();

    if (channels === undefined) {
        return (
            <div className="flex flex-col gap-2 p-2">
                <div className="px-2 py-1.5">
                    <Skeleton className="h-4 w-20" />
                </div>
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                ))}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Channels
                </h2>
                {/* Only admins should see this, logic to be added */}

            </div>

            {channels.length === 0 && (
                <div className="px-2 text-sm text-muted-foreground">No channels yet</div>
            )}

            {channels.map((channel) => (
                <Link
                    key={channel._id}
                    href={`/channel/${channel._id}`}
                >
                    <Button
                        variant="ghost"
                        className={cn(
                            "w-full justify-start gap-2 px-2",
                            pathname === `/channel/${channel._id}` && "bg-accent text-accent-foreground"
                        )}
                    >
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{channel.name}</span>
                    </Button>
                </Link>
            ))}
        </div>
    );
}
