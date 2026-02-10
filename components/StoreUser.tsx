
"use client";

import { useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

export default function StoreUser() {
    const { isLoading, isAuthenticated } = useConvexAuth();
    const { user } = useAuth();
    const [userId, setUserId] = useState<Id<"users"> | null>(null);
    const storeUser = useMutation(api.users.storeUser);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            return;
        }

        async function createUser() {
            const id = await storeUser({
                userId: user!.id,
                name: user!.fullName || user!.firstName || "Anonymous",
                email: user!.emailAddresses[0]?.emailAddress || "",
                imageUrl: user!.imageUrl,
            });
            setUserId(id);
        }

        createUser();
        return () => setUserId(null); // Cleanup on unmount/auth change
    }, [isAuthenticated, user, user?.id, storeUser]);

    return null; // This component handles side effects only
}
