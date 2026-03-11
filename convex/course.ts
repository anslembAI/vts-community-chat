/* eslint-disable @typescript-eslint/no-explicit-any */
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

        const progress = await ctx.db
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
            const channel = await ctx.db.get(args.channelId);
            const badgeName = channel?.name.toLowerCase().includes("futures") ? "Futures Trader" : "Forex Foundations";
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

        const progress = await ctx.db
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

        const progress = await ctx.db
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

export const seedFuturesCourseContent = mutation({
    args: {
        sessionId: v.id("sessions"),
        channelId: v.id("channels"),
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
                await ctx.db.delete(l._id);
            }
            await ctx.db.delete(mod._id);
        }

        const modules = [
            {
                title: "Module 1: What Are Futures",
                description: "The core mechanics of futures contracts.",
                lessons: [
                    { title: "What Are Futures Contracts", content: "A futures contract is a legal agreement to buy or sell a particular asset at a predetermined price at a specified time in the future. They are traded on centralized exchanges like the CME.", helpText: "Think of it as locking in a price today for something you'll receive or deliver later.", order: 1 },
                    { title: "Futures vs Forex vs Stocks", content: "Unlike stocks which represent ownership, futures are contracts. Unlike Forex which is decentralized (OTC), futures are traded on a regulated centralized exchange.", helpText: "Centralization means better transparency and standardized pricing.", order: 2 },
                    { title: "Chicago Mercantile Exchange (CME)", content: "The CME is the world's leading and most diverse derivatives marketplace. Most liquid futures contracts like ES and NQ are traded here.", helpText: "The CME provides the infrastructure that ensures every trade is cleared and settled.", order: 3 },
                    { title: "Contract Specifications", content: "Every futures contract has specific rules: the multiplier, the expiration date, and the minimum price fluctuation.", helpText: "Always check the contract spec for the instrument you are trading.", order: 4 },
                    { title: "Tick Size and Tick Value", content: "A 'tick' is the minimum price move. The 'tick value' is how much money you make or lose per contract for every tick move.", helpText: "For ES, 1 tick is 0.25 points, worth $12.50 per contract.", order: 5 }
                ]
            },
            {
                title: "Module 2: Understanding Futures Markets",
                description: "Exploring the major equity indices.",
                lessons: [
                    { title: "E-mini S&P 500 Futures (ES)", content: "The gold standard for futures traders. It tracks the 500 largest US companies. Highly liquid and excellent for technical analysis.", helpText: "ES is favored by many professionals for its stability and volume.", order: 6 },
                    { title: "Nasdaq Futures (NQ)", content: "Focuses on technology and growth companies. NQ is known for higher volatility and larger price swings compared to ES.", helpText: "NQ requires more precise risk management due to its speed.", order: 7 },
                    { title: "Dow Jones Futures (YM)", content: "Tracks the 30 major industrial companies in the US. Often moves slower than NQ but provides solid trend opportunities.", helpText: "YM is a price-weighted index, unlike ES which is market-cap weighted.", order: 8 },
                    { title: "Russell Futures (RTY)", content: "Tracks small-cap companies. RTY can often diverge from the tech-heavy NQ or broad-market ES.", helpText: "Use RTY to gauge small-cap market sentiment.", order: 9 },
                    { title: "Why Futures Markets Move", content: "Markets move based on supply and demand, influenced by economic data, interest rates, and institutional rebalancing.", helpText: "Price moves to where liquidity is found.", order: 10 }
                ]
            },
            {
                title: "Module 3: Futures Market Structure",
                description: "How markets function day-to-day.",
                lessons: [
                    { title: "Trading Sessions (Asia London New York)", content: "The New York session is the most liquid for US indices, but London often sets the early trend.", helpText: "Volume peaks during the 'overlap' periods between sessions.", order: 11 },
                    { title: "Opening Range", content: "The high and low of the first period of trading (e.g., first 30 mins) often dictates the day's bias.", helpText: "Watch for breakouts or reversals from the opening range.", order: 12 },
                    { title: "Liquidity in Futures Markets", content: "Liquidity represents the ability to enter/exit trades without significant price slippage. It often pools at previous highs and lows.", helpText: "Price is often 'drawn' to areas of high liquidity.", order: 13 },
                    { title: "Institutional Order Flow", content: "Big banks and funds don't trade like retail. They scale in and out of large positions, creating visible footprints on the chart.", helpText: "Learning to read order flow helps you follow the 'smart money'.", order: 14 },
                    { title: "Futures Volume and Participation", content: "Volume confirms price price moves. High volume at support or resistance suggests strong participation.", helpText: "Volume precedes price.", order: 15 }
                ]
            },
            {
                title: "Module 4: Futures Chart Analysis",
                description: "Identifying high-probability setups.",
                lessons: [
                    { title: "Reading Futures Charts", content: "Charts visualize the battle between buyers and sellers. We use candlesticks to understand market sentiment and momentum.", helpText: "Focus on the relationship between price and time.", order: 16 },
                    { title: "Support and Resistance", content: "Support is where buying interest is strong enough to stop a decline. Resistance is where selling interest stops a rally.", helpText: "The more a level is tested, the more significant it becomes.", order: 17 },
                    { title: "Trend vs Range", content: "A trend is a series of higher highs and higher lows (up) or lower highs and lower lows (down). A range is sideways consolidation.", helpText: "Most money is made in trends, but most time is spent in ranges.", order: 18 },
                    { title: "Key Levels", content: "Previous Day High, Previous Day Low, and the Overnight High/Low are critical reference points every day.", helpText: "Mark these levels on your chart before every session.", order: 19 },
                    { title: "Market Context", content: "Is the market trending on the higher timeframe? Is there a major economic news event? Context is more important than a single signal.", helpText: "Always ask: 'Where are we in the bigger picture?'", order: 20 }
                ]
            },
            {
                title: "Module 5: Futures Trade Execution",
                description: "Strategy, Execution, and Prop Firms.",
                lessons: [
                    { title: "Choosing the Right Futures Trading Prop Firm", content: "Prop firms provide capital for a fee and a profit split. Look for firms with transparent rules and reliable payouts. Instead of risking large personal funds, traders prove their ability in simulated evaluation accounts.", helpText: "Always read the prop firm's risk rules carefully before beginning an evaluation.", order: 21 },
                    { title: "Understanding Prop Firm Evaluation Rules", content: "Analyze parameters like profit targets, maximum drawdown limits, daily loss limits, and consistency rules. Understanding these is vital for passing.", helpText: "Respecting the loss limit is more important than hitting the profit target.", order: 22 },
                    { title: "Risk Management When Trading a Prop Account", content: "Proper position sizing and risk per trade (e.g., 0.5% - 1%) help preserve your drawdown cushion.", helpText: "Surviving is the first step to thriving.", order: 23 },
                    { title: "Placing a Futures Trade", content: "The process of selecting the specific contract (e.g., ESM5), choosing an order type (Limit vs Market), and setting initial protection.", helpText: "Use Limit orders for better entries whenever possible.", order: 24 },
                    { title: "Managing the Trade", content: "Adjusting your stop loss to break even, scaling out of profits, and maintaining emotional control during the trade duration.", helpText: "Let your winners run and cut your losses short.", order: 25 }
                ]
            },
            {
                title: "Module 6: Futures Trader Psychology",
                description: "Mastering your mind for long-term success.",
                lessons: [
                    { title: "Trading Discipline", content: "Discipline is the ability to follow your rules even when you don't feel like it. It's what separates pros from amateurs.", helpText: "Your trading plan is your boss. Listen to it.", order: 26 },
                    { title: "Handling Losses", content: "Losses are a cost of doing business. A loss is only a failure if you didn't follow your plan. Accept risk before you click the button.", helpText: "Every pro has losing days. The key is to keep them small.", order: 27 },
                    { title: "Avoiding Overtrading", content: "Trading more doesn't mean making more. Wait for high-probability setups and ignore the 'noise' during slow periods.", helpText: "Patience is a profitable skill.", order: 28 },
                    { title: "Building Consistency", content: "Consistency comes from doing the same high-quality things over and over again. Focus on the process, not the profit.", helpText: "A consistent process leads to consistent profits.", order: 29 },
                    { title: "Developing a Professional Trading Routine", content: "Establish a workflow that includes market analysis, execution hours, and rigorous trade journaling for continuous improvement.", helpText: "Treat trading like a professional business, not a hobby.", order: 30 }
                ]
            }
        ];

        for (let i = 0; i < modules.length; i++) {
            const m = modules[i];
            const moduleId = await ctx.db.insert("courseModules", {
                channelId: args.channelId,
                title: m.title,
                description: m.description,
                order: i + 1,
            });

            for (const l of m.lessons) {
                await ctx.db.insert("courseLessons", {
                    moduleId,
                    title: l.title,
                    content: l.content,
                    helpText: l.helpText,
                    order: l.order,
                });
            }
        }
    }
});

export const masterSeedFutures = mutation({
    args: {},
    handler: async (ctx) => {
        const name = "Futures Trading Course";
        const description = "Learn the fundamentals of trading futures markets including contracts, market structure, chart analysis, and discipline.";
        const slug = "futures-trading-course";

        let channelId: Id<"channels">;
        const firstUser = await ctx.db.query("users").first();
        const creatorId = firstUser?._id ?? ("dummy-user-id" as any);

        const existing = await ctx.db.query("channels").withIndex("by_slug", q => q.eq("slug", slug)).first();
        if (existing) {
            channelId = existing._id;
        } else {
            channelId = await ctx.db.insert("channels", {
                name,
                description,
                slug,
                type: "course",
                emoji: "📈",
                locked: false,
                createdBy: creatorId,
                createdAt: Date.now(),
                sortOrder: Date.now(),
                memberCount: 0,
                updatedAt: Date.now(),
                updatedBy: creatorId,
            });
        }

        // Wipe existing content for this channel to allow re-runs
        const existingModules = await ctx.db.query("courseModules").withIndex("by_channelId", q => q.eq("channelId", channelId)).collect();
        for (const mod of existingModules) {
            const lessons = await ctx.db.query("courseLessons").withIndex("by_moduleId", q => q.eq("moduleId", mod._id)).collect();
            for (const l of lessons) await ctx.db.delete(l._id);
            await ctx.db.delete(mod._id);
        }

        const modules = [
            {
                title: "Module 1: What Are Futures",
                description: "The core mechanics of futures contracts.",
                lessons: [
                    { title: "What Are Futures Contracts", content: "A futures contract is a legal agreement to buy or sell a particular asset at a predetermined price at a specified time in the future. They are traded on centralized exchanges like the CME.", helpText: "Think of it as locking in a price today for something you'll receive or deliver later.", order: 1 },
                    { title: "Futures vs Forex vs Stocks", content: "Unlike stocks which represent ownership, futures are contracts. Unlike Forex which is decentralized (OTC), futures are traded on a regulated centralized exchange.", helpText: "Centralization means better transparency and standardized pricing.", order: 2 },
                    { title: "Chicago Mercantile Exchange (CME)", content: "The CME is the world's leading and most diverse derivatives marketplace. Most liquid futures contracts like ES and NQ are traded here.", helpText: "The CME provides the infrastructure that ensures every trade is cleared and settled.", order: 3 },
                    { title: "Contract Specifications", content: "Every futures contract has specific rules: the multiplier, the expiration date, and the minimum price fluctuation.", helpText: "Always check the contract spec for the instrument you are trading.", order: 4 },
                    { title: "Tick Size and Tick Value", content: "A 'tick' is the minimum price move. The 'tick value' is how much money you make or lose per contract for every tick move.", helpText: "For ES, 1 tick is 0.25 points, worth $12.50 per contract.", order: 5 }
                ]
            },
            {
                title: "Module 2: Understanding Futures Markets",
                description: "Exploring the major equity indices.",
                lessons: [
                    { title: "E-mini S&P 500 Futures (ES)", content: "The gold standard for futures traders. It tracks the 500 largest US companies. Highly liquid and excellent for technical analysis.", helpText: "ES is favored by many professionals for its stability and volume.", order: 6 },
                    { title: "Nasdaq Futures (NQ)", content: "Focuses on technology and growth companies. NQ is known for higher volatility and larger price swings compared to ES.", helpText: "NQ requires more precise risk management due to its speed.", order: 7 },
                    { title: "Dow Jones Futures (YM)", content: "Tracks the 30 major industrial companies in the US. Often moves slower than NQ but provides solid trend opportunities.", helpText: "YM is a price-weighted index, unlike ES which is market-cap weighted.", order: 8 },
                    { title: "Russell Futures (RTY)", content: "Tracks small-cap companies. RTY can often diverge from the tech-heavy NQ or broad-market ES.", helpText: "Use RTY to gauge small-cap market sentiment.", order: 9 },
                    { title: "Why Futures Markets Move", content: "Markets move based on supply and demand, influenced by economic data, interest rates, and institutional rebalancing.", helpText: "Price moves to where liquidity is found.", order: 10 }
                ]
            },
            {
                title: "Module 3: Futures Market Structure",
                description: "How markets function day-to-day.",
                lessons: [
                    { title: "Trading Sessions (Asia London New York)", content: "The New York session is the most liquid for US indices, but London often sets the early trend.", helpText: "Volume peaks during the 'overlap' periods between sessions.", order: 11 },
                    { title: "Opening Range", content: "The high and low of the first period of trading (e.g., first 30 mins) often dictates the day's bias.", helpText: "Watch for breakouts or reversals from the opening range.", order: 12 },
                    { title: "Liquidity in Futures Markets", content: "Liquidity represents the ability to enter/exit trades without significant price slippage. It often pools at previous highs and lows.", helpText: "Price is often 'drawn' to areas of high liquidity.", order: 13 },
                    { title: "Institutional Order Flow", content: "Big banks and funds don't trade like retail. They scale in and out of large positions, creating visible footprints on the chart.", helpText: "Learning to read order flow helps you follow the 'smart money'.", order: 14 },
                    { title: "Futures Volume and Participation", content: "Volume confirms price price moves. High volume at support or resistance suggests strong participation.", helpText: "Volume precedes price.", order: 15 }
                ]
            },
            {
                title: "Module 4: Futures Chart Analysis",
                description: "Identifying high-probability setups.",
                lessons: [
                    { title: "Reading Futures Charts", content: "Charts visualize the battle between buyers and sellers. We use candlesticks to understand market sentiment and momentum.", helpText: "Focus on the relationship between price and time.", order: 16 },
                    { title: "Support and Resistance", content: "Support is where buying interest is strong enough to stop a decline. Resistance is where selling interest stops a rally.", helpText: "The more a level is tested, the more significant it becomes.", order: 17 },
                    { title: "Trend vs Range", content: "A trend is a series of higher highs and higher lows (up) or lower highs and lower lows (down). A range is sideways consolidation.", helpText: "Most money is made in trends, but most time is spent in ranges.", order: 18 },
                    { title: "Key Levels", content: "Previous Day High, Previous Day Low, and the Overnight High/Low are critical reference points every day.", helpText: "Mark these levels on your chart before every session.", order: 19 },
                    { title: "Market Context", content: "Is the market trending on the higher timeframe? Is there a major economic news event? Context is more important than a single signal.", helpText: "Always ask: 'Where are we in the bigger picture?'", order: 20 }
                ]
            },
            {
                title: "Module 5: Futures Trade Execution",
                description: "Strategy, Execution, and Prop Firms.",
                lessons: [
                    { title: "Choosing the Right Futures Trading Prop Firm", content: "Prop firms provide capital for a fee and a profit split. Look for firms with transparent rules and reliable payouts. Instead of risking large personal funds, traders prove their ability in simulated evaluation accounts.", helpText: "Always read the prop firm's risk rules carefully before beginning an evaluation.", order: 21 },
                    { title: "Understanding Prop Firm Evaluation Rules", content: "Analyze parameters like profit targets, maximum drawdown limits, daily loss limits, and consistency rules. Understanding these is vital for passing.", helpText: "Respecting the loss limit is more important than hitting the profit target.", order: 22 },
                    { title: "Risk Management When Trading a Prop Account", content: "Proper position sizing and risk per trade (e.g., 0.5% - 1%) help preserve your drawdown cushion.", helpText: "Surviving is the first step to thriving.", order: 23 },
                    { title: "Placing a Futures Trade", content: "The process of selecting the specific contract (e.g., ESM5), choosing an order type (Limit vs Market), and setting initial protection.", helpText: "Use Limit orders for better entries whenever possible.", order: 24 },
                    { title: "Managing the Trade", content: "Adjusting your stop loss to break even, scaling out of profits, and maintaining emotional control during the trade duration.", helpText: "Let your winners run and cut your losses short.", order: 25 }
                ]
            },
            {
                title: "Module 6: Futures Trader Psychology",
                description: "Mastering your mind for long-term success.",
                lessons: [
                    { title: "Trading Discipline", content: "Discipline is the ability to follow your rules even when you don't feel like it. It's what separates pros from amateurs.", helpText: "Your trading plan is your boss. Listen to it.", order: 26 },
                    { title: "Handling Losses", content: "Losses are a cost of doing business. A loss is only a failure if you didn't follow your plan. Accept risk before you click the button.", helpText: "Every pro has losing days. The key is to keep them small.", order: 27 },
                    { title: "Avoiding Overtrading", content: "Trading more doesn't mean making more. Wait for high-probability setups and ignore the 'noise' during slow periods.", helpText: "Patience is a profitable skill.", order: 28 },
                    { title: "Building Consistency", content: "Consistency comes from doing the same high-quality things over and over again. Focus on the process, not the profit.", helpText: "A consistent process leads to consistent profits.", order: 29 },
                    { title: "Developing a Professional Trading Routine", content: "Establish a workflow that includes market analysis, execution hours, and rigorous trade journaling for continuous improvement.", helpText: "Treat trading like a professional business, not a hobby.", order: 30 }
                ]
            }
        ];

        for (let i = 0; i < modules.length; i++) {
            const m = modules[i];
            const moduleId = await ctx.db.insert("courseModules", {
                channelId,
                title: m.title,
                description: m.description,
                order: i + 1,
            });

            for (const l of m.lessons) {
                await ctx.db.insert("courseLessons", {
                    moduleId,
                    title: l.title,
                    content: l.content,
                    helpText: l.helpText,
                    order: l.order,
                });
            }
        }
    }
});
