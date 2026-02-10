
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
    LogOut,
    Settings,
    ShieldAlert,
    User,
    Crown
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { ProfileModal } from "@/components/profile/profile-modal";

export function UserMenu() {
    const { signOut, sessionId } = useAuth();
    const convexUser = useQuery(api.users.getCurrentUser, { sessionId: sessionId ?? undefined });

    if (convexUser === undefined) return <div className="w-8 h-8 bg-secondary/30 animate-pulse rounded-full" />;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={convexUser?.imageUrl} />
                        <AvatarFallback>{convexUser?.name?.charAt(0) || convexUser?.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {convexUser?.isAdmin && (
                        <Crown className="w-4 h-4 text-yellow-500 absolute -top-1 -right-1 fill-current stroke-[1.5] drop-shadow-md" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" side="bottom">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{convexUser?.name || convexUser?.username}</p>
                        <p className="text-xs leading-none text-muted-foreground">{convexUser?.email || "No email"}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {convexUser?.isAdmin && (
                    <>
                        <Link href="/admin">
                            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                <span>Admin Panel</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                    </>
                )}

                <ProfileModal
                    user={convexUser}
                    trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
                    }
                />

                <DropdownMenuItem disabled>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => signOut()}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
