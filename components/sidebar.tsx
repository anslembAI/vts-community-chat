import { Button } from "@/components/ui/button";
import { ChannelList } from "@/components/chat/channel-list";
import { MessageSquare } from "lucide-react";

export default function Sidebar() {
    // Basic sidebar structure simply rendering ChannelList
    // User logic moved to UserMenu component
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
            {/* Footer Removed - moved to top header */}
        </div>
    );
}
