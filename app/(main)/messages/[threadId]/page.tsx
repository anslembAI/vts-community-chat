"use client";

import { useParams } from "next/navigation";
import { DirectMessageView } from "@/components/dm/direct-message-view";
import { Id } from "@/convex/_generated/dataModel";

export default function DirectMessageThreadPage() {
  const params = useParams();
  return <DirectMessageView threadId={params.threadId as Id<"directMessageThreads">} />;
}
