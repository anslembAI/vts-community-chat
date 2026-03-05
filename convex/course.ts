import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { requireAuth, requireAdmin } from "./permissions";

// ─────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────

/** Fetch all modules + nested lessons for a channel, sorted by order. */
export const getCourseData = query({
    args: { channelId: v.id("channels") },
    handler: async (ctx, args) => {
        const modules = await ctx.db
            .query("courseModules")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();

        modules.sort((a, b) => a.order - b.order);

        const result = await Promise.all(
            modules.map(async (mod) => {
                const lessons = await ctx.db
                    .query("courseLessons")
                    .withIndex("by_moduleId", (q) => q.eq("moduleId", mod._id))
                    .collect();
                lessons.sort((a, b) => a.order - b.order);

                const lessonsWithUrls = await Promise.all(
                    lessons.map(async (lesson) => {
                        let imageUrl = lesson.imageUrl;
                        if (lesson.imageStorageId) {
                            imageUrl = await ctx.storage.getUrl(lesson.imageStorageId) ?? undefined;
                        }
                        return { ...lesson, imageUrl };
                    })
                );

                return { ...mod, lessons: lessonsWithUrls };
            })
        );
        return result;
    },
});

/** Fetch user progress for a specific course channel. */
export const getUserProgress = query({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return null;
        const progress = await ctx.db
            .query("courseProgress")
            .withIndex("by_userId_channelId", (q) =>
                q.eq("userId", session.userId).eq("channelId", args.channelId)
            )
            .first();
        return progress ?? { completedLessonIds: [], struggledLessonIds: [], devicePreference: undefined };
    },
});

/** Fetch all module feedbacks for a user in a given channel's course. */
export const getUserFeedback = query({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return [];
        // Get module IDs for this channel
        const modules = await ctx.db
            .query("courseModules")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();
        const feedbacks = await Promise.all(
            modules.map(async (mod) => {
                const fb = await ctx.db
                    .query("courseFeedback")
                    .withIndex("by_userId_moduleId", (q) =>
                        q.eq("userId", session.userId).eq("moduleId", mod._id)
                    )
                    .first();
                return fb ? { moduleId: mod._id, rating: fb.rating, notes: fb.notes, _id: fb._id } : null;
            })
        );
        return feedbacks.filter(Boolean);
    },
});

// ─────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────

/** Mark a lesson as completed. Awards badge if course is 100%. */
export const markLessonComplete = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        lessonId: v.id("courseLessons"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        let progress = await ctx.db
            .query("courseProgress")
            .withIndex("by_userId_channelId", (q) =>
                q.eq("userId", user._id).eq("channelId", args.channelId)
            )
            .first();

        if (!progress) {
            await ctx.db.insert("courseProgress", {
                userId: user._id,
                channelId: args.channelId,
                completedLessonIds: [args.lessonId],
                struggledLessonIds: [],
            });
        } else {
            const ids = progress.completedLessonIds as Id<"courseLessons">[];
            if (!ids.includes(args.lessonId)) {
                await ctx.db.patch(progress._id, {
                    completedLessonIds: [...ids, args.lessonId],
                });
            }
        }

        // Check if all lessons completed for badge
        const modules = await ctx.db
            .query("courseModules")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();
        let totalLessons = 0;
        for (const mod of modules) {
            const lessons = await ctx.db
                .query("courseLessons")
                .withIndex("by_moduleId", (q) => q.eq("moduleId", mod._id))
                .collect();
            totalLessons += lessons.length;
        }

        // Re-fetch progress to get the latest
        const updatedProgress = await ctx.db
            .query("courseProgress")
            .withIndex("by_userId_channelId", (q) =>
                q.eq("userId", user._id).eq("channelId", args.channelId)
            )
            .first();
        const completedCount = updatedProgress?.completedLessonIds.length ?? 0;

        if (completedCount >= totalLessons && totalLessons > 0) {
            // Award badge
            const badgeName = "Forex Foundations";
            const currentBadges = user.badges ?? [];
            if (!currentBadges.includes(badgeName)) {
                await ctx.db.patch(user._id, {
                    badges: [...currentBadges, badgeName],
                });
            }
            return { courseComplete: true };
        }
        return { courseComplete: false };
    },
});

/** Mark a lesson as struggled (I don't understand). */
export const markLessonStruggled = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        lessonId: v.id("courseLessons"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        let progress = await ctx.db
            .query("courseProgress")
            .withIndex("by_userId_channelId", (q) =>
                q.eq("userId", user._id).eq("channelId", args.channelId)
            )
            .first();

        if (!progress) {
            await ctx.db.insert("courseProgress", {
                userId: user._id,
                channelId: args.channelId,
                completedLessonIds: [],
                struggledLessonIds: [args.lessonId],
            });
        } else {
            const ids = progress.struggledLessonIds as Id<"courseLessons">[];
            if (!ids.includes(args.lessonId)) {
                await ctx.db.patch(progress._id, {
                    struggledLessonIds: [...ids, args.lessonId],
                });
            }
        }
    },
});

/** Save module reflection feedback (notes + 1-10 rating). */
export const submitModuleFeedback = mutation({
    args: {
        sessionId: v.id("sessions"),
        moduleId: v.id("courseModules"),
        rating: v.number(),
        notes: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        const existing = await ctx.db
            .query("courseFeedback")
            .withIndex("by_userId_moduleId", (q) =>
                q.eq("userId", user._id).eq("moduleId", args.moduleId)
            )
            .first();
        if (existing) {
            await ctx.db.patch(existing._id, {
                rating: args.rating,
                notes: args.notes,
            });
        } else {
            await ctx.db.insert("courseFeedback", {
                userId: user._id,
                moduleId: args.moduleId,
                rating: args.rating,
                notes: args.notes,
            });
        }
    },
});

/** Reset all progress and feedback for a user in this course. */
export const resetCourseProgress = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        // Delete progress
        const progress = await ctx.db
            .query("courseProgress")
            .withIndex("by_userId_channelId", (q) =>
                q.eq("userId", user._id).eq("channelId", args.channelId)
            )
            .first();
        if (progress) {
            await ctx.db.patch(progress._id, {
                completedLessonIds: [],
                struggledLessonIds: [],
                devicePreference: undefined,
            });
        }

        // Delete feedbacks
        const modules = await ctx.db
            .query("courseModules")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();
        for (const mod of modules) {
            const fb = await ctx.db
                .query("courseFeedback")
                .withIndex("by_userId_moduleId", (q) =>
                    q.eq("userId", user._id).eq("moduleId", mod._id)
                )
                .first();
            if (fb) await ctx.db.delete(fb._id);
        }
    },
});

/** Set device preference (mobile/desktop) for a user in a course. */
export const setDevicePreference = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        device: v.union(v.literal("mobile"), v.literal("desktop")),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);

        let progress = await ctx.db
            .query("courseProgress")
            .withIndex("by_userId_channelId", (q) =>
                q.eq("userId", user._id).eq("channelId", args.channelId)
            )
            .first();

        if (!progress) {
            await ctx.db.insert("courseProgress", {
                userId: user._id,
                channelId: args.channelId,
                completedLessonIds: [],
                struggledLessonIds: [],
                devicePreference: args.device,
            });
        } else {
            await ctx.db.patch(progress._id, {
                devicePreference: args.device,
            });
        }
    },
});

// ─────────────────────────────────────────────────
// Admin Mutations
// ─────────────────────────────────────────────────

export const createModule = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        title: v.string(),
        description: v.optional(v.string()),
        order: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);
        return await ctx.db.insert("courseModules", {
            channelId: args.channelId,
            title: args.title,
            description: args.description,
            order: args.order,
        });
    },
});

export const updateModule = mutation({
    args: {
        sessionId: v.id("sessions"),
        moduleId: v.id("courseModules"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        order: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);
        const patch: Record<string, unknown> = {};
        if (args.title !== undefined) patch.title = args.title;
        if (args.description !== undefined) patch.description = args.description;
        if (args.order !== undefined) patch.order = args.order;
        await ctx.db.patch(args.moduleId, patch);
    },
});

export const createLesson = mutation({
    args: {
        sessionId: v.id("sessions"),
        moduleId: v.id("courseModules"),
        title: v.string(),
        content: v.string(),
        helpText: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        imageUrl: v.optional(v.string()),
        mobileContent: v.optional(v.string()),
        desktopContent: v.optional(v.string()),
        mobileHint: v.optional(v.string()),
        desktopHint: v.optional(v.string()),
        order: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);
        return await ctx.db.insert("courseLessons", {
            moduleId: args.moduleId,
            title: args.title,
            content: args.content,
            helpText: args.helpText,
            imageStorageId: args.imageStorageId,
            imageUrl: args.imageUrl,
            mobileContent: args.mobileContent,
            desktopContent: args.desktopContent,
            mobileHint: args.mobileHint,
            desktopHint: args.desktopHint,
            order: args.order,
        });
    },
});

export const updateLesson = mutation({
    args: {
        sessionId: v.id("sessions"),
        lessonId: v.id("courseLessons"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        helpText: v.optional(v.string()),
        imageStorageId: v.optional(v.id("_storage")),
        imageUrl: v.optional(v.string()),
        mobileContent: v.optional(v.string()),
        desktopContent: v.optional(v.string()),
        mobileHint: v.optional(v.string()),
        desktopHint: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);
        const patch: Record<string, unknown> = {};
        if (args.title !== undefined) patch.title = args.title;
        if (args.content !== undefined) patch.content = args.content;
        if (args.helpText !== undefined) patch.helpText = args.helpText;
        if (args.imageStorageId !== undefined) {
            patch.imageStorageId = args.imageStorageId;
            patch.imageUrl = undefined; // clear static URL if using storage
        }
        if (args.imageUrl !== undefined) {
            patch.imageUrl = args.imageUrl;
        }
        if (args.mobileContent !== undefined) patch.mobileContent = args.mobileContent;
        if (args.desktopContent !== undefined) patch.desktopContent = args.desktopContent;
        if (args.mobileHint !== undefined) patch.mobileHint = args.mobileHint;
        if (args.desktopHint !== undefined) patch.desktopHint = args.desktopHint;
        await ctx.db.patch(args.lessonId, patch);
    },
});

export const deleteLesson = mutation({
    args: {
        sessionId: v.id("sessions"),
        lessonId: v.id("courseLessons"),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);
        const lesson = await ctx.db.get(args.lessonId);
        if (lesson?.imageStorageId) {
            await ctx.storage.delete(lesson.imageStorageId).catch(() => { });
        }
        await ctx.db.delete(args.lessonId);
    },
});

/** Admin seed: bulk insert modules and lessons. */
export const seedCourse = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        modules: v.array(
            v.object({
                title: v.string(),
                description: v.optional(v.string()),
                order: v.number(),
                lessons: v.array(
                    v.object({
                        title: v.string(),
                        content: v.string(),
                        helpText: v.optional(v.string()),
                        imageUrl: v.optional(v.string()),
                        mobileContent: v.optional(v.string()),
                        desktopContent: v.optional(v.string()),
                        mobileHint: v.optional(v.string()),
                        desktopHint: v.optional(v.string()),
                        order: v.number(),
                    })
                ),
            })
        ),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        // Delete existing modules/lessons for this channel
        const existingModules = await ctx.db
            .query("courseModules")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();
        for (const mod of existingModules) {
            const lessons = await ctx.db
                .query("courseLessons")
                .withIndex("by_moduleId", (q) => q.eq("moduleId", mod._id))
                .collect();
            for (const l of lessons) {
                if (l.imageStorageId) await ctx.storage.delete(l.imageStorageId).catch(() => { });
                await ctx.db.delete(l._id);
            }
            await ctx.db.delete(mod._id);
        }

        // Insert new data
        for (const mod of args.modules) {
            const moduleId = await ctx.db.insert("courseModules", {
                channelId: args.channelId,
                title: mod.title,
                description: mod.description,
                order: mod.order,
            });
            for (const lesson of mod.lessons) {
                await ctx.db.insert("courseLessons", {
                    moduleId,
                    title: lesson.title,
                    content: lesson.content,
                    helpText: lesson.helpText,
                    imageUrl: lesson.imageUrl,
                    mobileContent: lesson.mobileContent,
                    desktopContent: lesson.desktopContent,
                    mobileHint: lesson.mobileHint,
                    desktopHint: lesson.desktopHint,
                    order: lesson.order,
                });
            }
        }
    },
});

/** Admin: Add a single module with lessons — does NOT delete existing data. */
export const addModule = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
        title: v.string(),
        description: v.optional(v.string()),
        order: v.number(),
        lessons: v.array(
            v.object({
                title: v.string(),
                content: v.string(),
                helpText: v.optional(v.string()),
                imageUrl: v.optional(v.string()),
                imageStorageId: v.optional(v.id("_storage")),
                mobileContent: v.optional(v.string()),
                desktopContent: v.optional(v.string()),
                mobileHint: v.optional(v.string()),
                desktopHint: v.optional(v.string()),
                order: v.number(),
            })
        ),
    },
    handler: async (ctx, args) => {
        const user = await requireAuth(ctx, args.sessionId);
        requireAdmin(user);

        // Check if module with this order already exists
        const existingModules = await ctx.db
            .query("courseModules")
            .withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
            .collect();
        const alreadyExists = existingModules.some((m) => m.order === args.order);
        if (alreadyExists) {
            throw new Error(`Module ${args.order} already exists. Delete it first if you want to re-add.`);
        }

        const moduleId = await ctx.db.insert("courseModules", {
            channelId: args.channelId,
            title: args.title,
            description: args.description,
            order: args.order,
        });
        for (const lesson of args.lessons) {
            await ctx.db.insert("courseLessons", {
                moduleId,
                title: lesson.title,
                content: lesson.content,
                helpText: lesson.helpText,
                imageStorageId: lesson.imageStorageId,
                imageUrl: lesson.imageUrl,
                mobileContent: lesson.mobileContent,
                desktopContent: lesson.desktopContent,
                mobileHint: lesson.mobileHint,
                desktopHint: lesson.desktopHint,
                order: lesson.order,
            });
        }
    },
});
