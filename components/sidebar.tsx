"use client";

import { UserButton, useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
    LogOut,
    Settings,
    ShieldAlert,
    User,
    MessageSquare,
    MoreVertical
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
import { ChannelList } from "@/components/chat/channel-list";

export default function Sidebar() {
    const { user, isLoaded } = useUser();
    const { signOut } = useClerk();
    const convexUser = useQuery(api.users.getCurrentUser);

    if (!isLoaded) return <div className="w-60 bg-secondary/30 animate-pulse h-full" />;

    return (
        <div className="flex w-60 flex-col bg-background border-r h-full">
            {/* Header */}
            <div className="flex items-center h-14 min-h-14 px-4 border-b">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <div className="bg-primary text-primary-foreground rounded-md p-1">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <span>Community</span>
                </div>
            </div>

            {/* Main Content - Channel List */}
            <div className="flex-1 overflow-y-auto py-2">
                <ChannelList />
            </div>

            {/* Footer - User Profile */}
            <div className="border-t p-3 bg-secondary/10">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start px-2 h-auto py-2 hover:bg-secondary/50">
                            <div className="flex items-center gap-2 w-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.imageUrl} />
                                    <AvatarFallback>{user?.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col items-start min-w-0 flex-1">
                                    <span className="text-sm font-medium truncate w-full text-left">
                                        {user?.fullName}
                                    </span>
                                    <span className="text-xs text-muted-foreground truncate w-full text-left">
                                        {user?.primaryEmailAddress?.emailAddress}
                                    </span>
                                </div>
                                <MoreVertical className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56" side="top">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
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

                        <DropdownMenuItem disabled>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                        </DropdownMenuItem>
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
            </div>
        </div>
    );
}
