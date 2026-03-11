"use client";

import { MessageCircle } from "lucide-react";

export default function MessagesInboxPage() {
  return (
    <div className="vts-panel flex h-full flex-col items-center justify-center rounded-[2rem] p-6 text-center">
      <MessageCircle className="mb-4 h-12 w-12 text-black/30" />
      <h1 className="text-2xl font-semibold text-[#2c3034]">Direct Messages</h1>
      <p className="mt-2 max-w-md text-sm text-black/45">
        Select a conversation from the sidebar or start a new message.
      </p>
    </div>
  );
}
