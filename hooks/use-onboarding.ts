"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

export function useOnboarding() {
    const { sessionId } = useAuth();
    const currentUser = useQuery(api.users.getCurrentUser, sessionId ? { sessionId } : "skip");
    const completeOnboardingMutation = useMutation(api.users.completeOnboarding);

    const [shouldShowTour, setShouldShowTour] = useState(false);

    useEffect(() => {
        // If we have a user and they haven't completed onboarding, show the tour.
        if (currentUser && currentUser.hasCompletedOnboarding === false) {
            // Slight delay to allow DOM to render
            const timer = setTimeout(() => {
                setShouldShowTour(true);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [currentUser]);

    useEffect(() => {
        const handleStartTour = () => setShouldShowTour(true);
        window.addEventListener("start-tour", handleStartTour);
        return () => window.removeEventListener("start-tour", handleStartTour);
    }, []);

    const completeTour = async () => {
        setShouldShowTour(false);
        if (sessionId) {
            try {
                await completeOnboardingMutation({ sessionId });
            } catch (e) {
                console.error("Failed to mark onboarding complete", e);
            }
        }
    };

    return {
        shouldShowTour,
        completeTour,
    };
}
