/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    BookOpen,
    RotateCcw,
    CheckCircle2,
    HelpCircle,
    Loader2,
    Star,
    Trophy,
    ArrowDown,
    X,
    Smartphone,
    Monitor,
} from "lucide-react";
import Image from "next/image";

interface CourseViewProps {
    channelId: Id<"channels">;
    title: string;
    description?: string;
}

export function CourseView({ channelId, title, description }: CourseViewProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const scrollRef = useRef<HTMLDivElement>(null);

    const courseData = useQuery(api.course.getCourseData, { channelId });
    const userProgress = useQuery(
        api.course.getUserProgress,
        sessionId ? { sessionId, channelId } : "skip"
    );
    const userFeedback = useQuery(
        api.course.getUserFeedback,
        sessionId ? { sessionId, channelId } : "skip"
    );

    const markComplete = useMutation(api.course.markLessonComplete);
    const markStruggled = useMutation(api.course.markLessonStruggled);
    const submitFeedback = useMutation(api.course.submitModuleFeedback);
    const resetProgress = useMutation(api.course.resetCourseProgress);
    const setDevicePref = useMutation(api.course.setDevicePreference);

    const devicePreference: "mobile" | "desktop" =
        (userProgress && "devicePreference" in userProgress
            ? (userProgress as any).devicePreference
            : undefined) ?? "mobile";

    const [resetDialogOpen, setResetDialogOpen] = useState(false);
    const [resetConfirm, setResetConfirm] = useState("");
    const [isResetting, setIsResetting] = useState(false);
    const [expandedHelp, setExpandedHelp] = useState<Record<string, boolean>>({});
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [feedbackState, setFeedbackState] = useState<
        Record<string, { rating: number; notes: string; saved: boolean }>
    >({});

    // All lesson IDs in order (for progress calculation)
    const allLessonIds = useMemo(() => {
        if (!courseData) return [];
        return courseData.flatMap((mod) => mod.lessons.map((l) => l._id));
    }, [courseData]);

    const completedSet = useMemo(
        () => new Set(userProgress?.completedLessonIds ?? []),
        [userProgress]
    );

    const totalLessons = allLessonIds.length;
    const completedCount = completedSet.size;
    const courseComplete = totalLessons > 0 && completedCount >= totalLessons;

    // Initialize feedback state from server
    useEffect(() => {
        if (userFeedback && userFeedback.length > 0) {
            const initial: Record<string, { rating: number; notes: string; saved: boolean }> = {};
            for (const fb of userFeedback) {
                if (fb) {
                    initial[fb.moduleId] = { rating: fb.rating, notes: fb.notes, saved: true };
                }
            }
            setFeedbackState((prev) => ({ ...initial, ...prev }));
        }
    }, [userFeedback]);

    // Find the first incomplete lesson for "Continue"
    const firstIncompleteLessonId = useMemo(() => {
        for (const id of allLessonIds) {
            if (!completedSet.has(id)) return id;
        }
        return null;
    }, [allLessonIds, completedSet]);

    const scrollToLesson = useCallback((lessonId: string) => {
        const el = document.getElementById(`lesson-${lessonId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, []);

    const handleMarkComplete = async (lessonId: Id<"courseLessons">) => {
        if (!sessionId) return;
        try {
            const result = await markComplete({ sessionId, channelId, lessonId });
            if (result.courseComplete) {
                const badgeName = title.toLowerCase().includes("futures") ? "Futures Trader" : "Forex Foundations";
                toast({
                    title: "🎉 Course Complete!",
                    description: `You've earned the ${badgeName} badge!`,
                });
            }
            // Scroll to next lesson
            const idx = allLessonIds.indexOf(lessonId);
            if (idx >= 0 && idx < allLessonIds.length - 1) {
                setTimeout(() => scrollToLesson(allLessonIds[idx + 1]), 300);
            }
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        }
    };

    const handleMarkStruggled = async (lessonId: Id<"courseLessons">) => {
        if (!sessionId) return;
        setExpandedHelp((prev) => ({ ...prev, [lessonId]: true }));
        try {
            await markStruggled({ sessionId, channelId, lessonId });
        } catch { }
    };

    const handleSubmitFeedback = async (moduleId: Id<"courseModules">) => {
        if (!sessionId) return;
        const state = feedbackState[moduleId];
        if (!state || state.rating < 1) {
            toast({ variant: "destructive", description: "Please select a rating." });
            return;
        }
        try {
            await submitFeedback({
                sessionId,
                moduleId,
                rating: state.rating,
                notes: state.notes || "",
            });
            setFeedbackState((prev) => ({
                ...prev,
                [moduleId]: { ...state, saved: true },
            }));
            toast({ description: "Feedback saved ✅" });
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        }
    };

    const handleReset = async () => {
        if (!sessionId || resetConfirm !== "RESET") return;
        setIsResetting(true);
        try {
            await resetProgress({ sessionId, channelId });
            setFeedbackState({});
            setExpandedHelp({});
            setResetDialogOpen(false);
            setResetConfirm("");
            scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            toast({ description: "Progress reset." });
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        } finally {
            setIsResetting(false);
        }
    };

    if (!courseData || userProgress === undefined) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div ref={scrollRef} className="h-full overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">
                {/* ── Header Card ── */}
                <div className="rounded-2xl border border-[#E2D7C9] bg-gradient-to-br from-[#F4E9DD] to-[#EDE3D5] p-6 shadow-sm">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-orange-500/10">
                            <BookOpen className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl font-bold text-black">{title}</h1>
                                {courseComplete && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/20">
                                        <Trophy className="h-3.5 w-3.5" />
                                        Complete
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-[#5C5C5C] mt-1 leading-relaxed">
                                {description || "Welcome to the course! Progress at your own pace."}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        {firstIncompleteLessonId && (
                            <Button
                                size="sm"
                                className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                                onClick={() => scrollToLesson(firstIncompleteLessonId)}
                            >
                                <ArrowDown className="h-3.5 w-3.5" />
                                Continue
                            </Button>
                        )}
                        <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-[#D4C8BA] text-[#5C5C5C]"
                            onClick={() => setResetDialogOpen(true)}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Start Over
                        </Button>
                    </div>
                </div>

                {/* ── Progress ── */}
                <div className="rounded-xl border border-[#E2D7C9] bg-white/80 p-4 space-y-3">
                    {/* Overall */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-[#5C5C5C]">Course Progress</span>
                            <span className="text-xs text-[#7A7A7A]">
                                {completedCount} of {totalLessons} lessons
                            </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-[#E8DDD0] overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 ease-out"
                                style={{ width: `${totalLessons ? (completedCount / totalLessons) * 100 : 0}%` }}
                            />
                        </div>
                    </div>

                    {/* Per Module */}
                    {courseData.map((mod) => {
                        const modCompleted = mod.lessons.filter((l) =>
                            completedSet.has(l._id)
                        ).length;
                        const modTotal = mod.lessons.length;
                        return (
                            <div key={mod._id}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[11px] font-medium text-[#7A7A7A]">
                                        Module {mod.order}: {mod.title}
                                    </span>
                                    <span className="text-[11px] text-[#9A9A9A]">
                                        {modCompleted}/{modTotal}
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-[#E8DDD0] overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-orange-400/70 transition-all duration-500"
                                        style={{ width: `${modTotal ? (modCompleted / modTotal) * 100 : 0}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Modules + Lessons ── */}
                {courseData.map((mod) => {
                    const fb = feedbackState[mod._id] ?? { rating: 0, notes: "", saved: false };

                    return (
                        <div key={mod._id} className="space-y-4">
                            {/* Module Header */}
                            <div className="flex items-center gap-2 pt-2">
                                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-sm font-bold text-orange-600">
                                    {mod.order}
                                </div>
                                <h2 className="text-lg font-bold text-black">{mod.title}</h2>
                            </div>
                            {mod.description && (
                                <p className="text-sm text-[#6A6A6A] -mt-2">{mod.description}</p>
                            )}

                            {/* Device Selector — only for Module 4 */}
                            {mod.order === 4 && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                                    <p className="text-sm font-semibold text-[#3A3A3A]">Choose your device</p>
                                    <div className="flex gap-2">
                                        <button
                                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium transition-all border ${devicePreference === "mobile"
                                                ? "bg-orange-500 text-white border-orange-500 shadow-md"
                                                : "bg-white text-[#5C5C5C] border-[#D4C8BA] hover:border-orange-300"
                                                }`}
                                            onClick={() => {
                                                if (sessionId) setDevicePref({ sessionId, channelId, device: "mobile" });
                                            }}
                                        >
                                            <Smartphone className="h-4 w-4" />
                                            Mobile
                                        </button>
                                        <button
                                            className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-sm font-medium transition-all border ${devicePreference === "desktop"
                                                ? "bg-orange-500 text-white border-orange-500 shadow-md"
                                                : "bg-white text-[#5C5C5C] border-[#D4C8BA] hover:border-orange-300"
                                                }`}
                                            onClick={() => {
                                                if (sessionId) setDevicePref({ sessionId, channelId, device: "desktop" });
                                            }}
                                        >
                                            <Monitor className="h-4 w-4" />
                                            Desktop
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Lessons */}
                            {mod.lessons.map((lesson) => {
                                const isComplete = completedSet.has(lesson._id);
                                const helpOpen = expandedHelp[lesson._id] ?? false;
                                return (
                                    <div
                                        key={lesson._id}
                                        id={`lesson-${lesson._id}`}
                                        className={`rounded-xl border p-4 transition-all duration-300 ${isComplete
                                            ? "border-emerald-200 bg-emerald-50/50"
                                            : "border-[#E2D7C9] bg-white"
                                            }`}
                                    >
                                        <div className="flex items-start gap-2 mb-2">
                                            {isComplete ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                                            ) : (
                                                <div className="h-5 w-5 rounded-full border-2 border-[#D4C8BA] mt-0.5 shrink-0" />
                                            )}
                                            <h3 className="font-semibold text-[15px] text-black">{lesson.title}</h3>
                                        </div>

                                        {/* Image */}
                                        {lesson.imageUrl && (
                                            <button
                                                className="w-full rounded-lg overflow-hidden my-3 cursor-zoom-in hover:opacity-95 transition-opacity focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                                onClick={() => setZoomedImage(lesson.imageUrl ?? null)}
                                            >
                                                <Image
                                                    src={lesson.imageUrl}
                                                    alt={lesson.title}
                                                    width={600}
                                                    height={340}
                                                    className="w-full h-auto object-contain rounded-lg"
                                                    loading="lazy"
                                                    unoptimized
                                                />
                                            </button>
                                        )}

                                        {/* Explanation */}
                                        <p className="text-sm text-[#4A4A4A] leading-relaxed mb-3 whitespace-pre-wrap">
                                            {lesson.content}
                                        </p>

                                        {/* Device-specific content */}
                                        {devicePreference === "mobile" && (lesson as any).mobileContent && (
                                            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 mb-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Smartphone className="h-3.5 w-3.5 text-blue-600" />
                                                    <span className="text-xs font-semibold text-blue-700">Mobile Steps</span>
                                                </div>
                                                <p className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
                                                    {(lesson as any).mobileContent}
                                                </p>
                                            </div>
                                        )}
                                        {devicePreference === "desktop" && (lesson as any).desktopContent && (
                                            <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 mb-3">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <Monitor className="h-3.5 w-3.5 text-indigo-600" />
                                                    <span className="text-xs font-semibold text-indigo-700">Desktop Steps</span>
                                                </div>
                                                <p className="text-sm text-indigo-800 leading-relaxed whitespace-pre-wrap">
                                                    {(lesson as any).desktopContent}
                                                </p>
                                            </div>
                                        )}

                                        {/* Device hint */}
                                        {devicePreference === "mobile" && (lesson as any).mobileHint && (
                                            <div className="rounded-lg bg-sky-50 border border-sky-200 p-2.5 mb-3">
                                                <p className="text-xs text-sky-700 flex items-center gap-1.5">
                                                    <Smartphone className="h-3 w-3 shrink-0" />
                                                    {(lesson as any).mobileHint}
                                                </p>
                                            </div>
                                        )}
                                        {devicePreference === "desktop" && (lesson as any).desktopHint && (
                                            <div className="rounded-lg bg-violet-50 border border-violet-200 p-2.5 mb-3">
                                                <p className="text-xs text-violet-700 flex items-center gap-1.5">
                                                    <Monitor className="h-3 w-3 shrink-0" />
                                                    {(lesson as any).desktopHint}
                                                </p>
                                            </div>
                                        )}

                                        {/* Help Text (expanded) */}
                                        {helpOpen && lesson.helpText && (
                                            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-3 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <HelpCircle className="h-4 w-4 text-amber-600" />
                                                    <span className="text-xs font-semibold text-amber-700">Need help?</span>
                                                </div>
                                                <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                                                    {lesson.helpText}
                                                </p>
                                            </div>
                                        )}

                                        {/* A / B Buttons */}
                                        {!isComplete && (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                                                    onClick={() => handleMarkComplete(lesson._id)}
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                    I understand
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50 flex-1"
                                                    onClick={() => handleMarkStruggled(lesson._id)}
                                                >
                                                    <HelpCircle className="h-3.5 w-3.5" />
                                                    I don&apos;t understand
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* ── Module Reflection ── */}
                            <div className="rounded-xl border border-[#E2D7C9] bg-[#FDFAF6] p-4 space-y-3">
                                <h4 className="text-sm font-bold text-black flex items-center gap-1.5">
                                    <Star className="h-4 w-4 text-orange-500" />
                                    {mod.order === 5 ? "Notes" : `Module ${mod.order} Reflection`}
                                </h4>
                                <p className="text-xs text-[#7A7A7A]">
                                    {mod.order === 5
                                        ? "Write how you felt placing your first trade. What part was easiest and what felt confusing?"
                                        : "Write how you feel about this section. What concepts were clear and what needs more practice?"}
                                </p>
                                <Textarea
                                    value={fb.notes}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                        setFeedbackState((prev) => ({
                                            ...prev,
                                            [mod._id]: { ...fb, notes: e.target.value, saved: false },
                                        }))
                                    }
                                    placeholder="Your notes..."
                                    className="min-h-[80px] text-sm bg-white border-[#E2D7C9]"
                                />
                                {/* Rating 1-10 */}
                                <div>
                                    <span className="text-xs font-medium text-[#5C5C5C] mb-1.5 block">
                                        Rating: {fb.rating > 0 ? fb.rating : "—"} / 10
                                    </span>
                                    <div className="flex gap-1 flex-wrap">
                                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                            <button
                                                key={n}
                                                className={`h-9 w-9 rounded-lg text-sm font-bold transition-all ${fb.rating === n
                                                    ? "bg-orange-500 text-white shadow-md scale-105"
                                                    : "bg-[#E8DDD0] text-[#5C5C5C] hover:bg-orange-200"
                                                    }`}
                                                onClick={() =>
                                                    setFeedbackState((prev) => ({
                                                        ...prev,
                                                        [mod._id]: { ...fb, rating: n, saved: false },
                                                    }))
                                                }
                                            >
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        className="gap-1.5 bg-orange-600 hover:bg-orange-700 text-white"
                                        onClick={() => handleSubmitFeedback(mod._id)}
                                        disabled={fb.rating < 1}
                                    >
                                        Save Reflection
                                    </Button>
                                    {fb.saved && (
                                        <span className="text-xs text-emerald-600 font-medium">✅ Saved</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* ── Course Complete Banner ── */}
                {courseComplete && (
                    <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 p-6 text-center space-y-2">
                        <Trophy className="h-10 w-10 text-emerald-500 mx-auto" />
                        <h2 className="text-xl font-bold text-emerald-800">Course Complete! 🎉</h2>
                        <p className="text-sm text-emerald-700">
                            You&apos;ve completed the {title} and earned the <strong>{title.toLowerCase().includes("futures") ? "Futures Trader" : "Forex Foundations"}</strong> badge.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Reset Dialog ── */}
            <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <AlertDialogContent className="sm:max-w-[400px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <RotateCcw className="h-5 w-5" />
                            Start over?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This will reset your course progress, module ratings, and notes. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-2">
                        <label className="text-xs font-medium">
                            Type <strong>RESET</strong> to confirm
                        </label>
                        <Input
                            value={resetConfirm}
                            onChange={(e) => setResetConfirm(e.target.value)}
                            placeholder="RESET"
                            disabled={isResetting}
                        />
                    </div>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                        <Button
                            variant="destructive"
                            onClick={handleReset}
                            disabled={isResetting || resetConfirm !== "RESET"}
                        >
                            {isResetting && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                            Reset Progress
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── Image Zoom Dialog ── */}
            <Dialog open={!!zoomedImage} onOpenChange={(val) => !val && setZoomedImage(null)}>
                <DialogContent className="max-w-[90vw] md:max-w-4xl p-0 overflow-hidden bg-black/95 border-none [&>button]:hidden">
                    <DialogTitle className="sr-only">Lesson Image</DialogTitle>
                    <DialogDescription className="sr-only">Enlarged lesson view</DialogDescription>

                    {zoomedImage && (
                        <div className="relative w-full h-[80vh] flex items-center justify-center">
                            <button
                                onClick={() => setZoomedImage(null)}
                                className="absolute top-4 right-4 z-50 rounded-full bg-white/10 p-2 text-white/70 hover:text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                            >
                                <X className="h-6 w-6" />
                            </button>
                            <Image
                                src={zoomedImage}
                                alt="Zoomed lesson diagram"
                                fill
                                className="object-contain"
                                unoptimized
                            />
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
