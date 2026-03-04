"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Settings,
    Plus,
    Trash2,
    Upload,
    Loader2,
    GripVertical,
    Save,
} from "lucide-react";

interface AdminCourseManagerProps {
    channelId: Id<"channels">;
}

export function AdminCourseManager({ channelId }: AdminCourseManagerProps) {
    const { sessionId } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const courseData = useQuery(api.course.getCourseData, { channelId });
    const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
    const createModule = useMutation(api.course.createModule);
    const updateModule = useMutation(api.course.updateModule);
    const createLesson = useMutation(api.course.createLesson);
    const updateLesson = useMutation(api.course.updateLesson);
    const deleteLesson = useMutation(api.course.deleteLesson);
    const seedCourse = useMutation(api.course.seedCourse);

    const [newModuleTitle, setNewModuleTitle] = useState("");
    const [isSeeding, setIsSeeding] = useState(false);

    // Edit state
    const [editingLesson, setEditingLesson] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editContent, setEditContent] = useState("");
    const [editHelpText, setEditHelpText] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    // New lesson state
    const [addingToModule, setAddingToModule] = useState<string | null>(null);
    const [newLessonTitle, setNewLessonTitle] = useState("");
    const [newLessonContent, setNewLessonContent] = useState("");
    const [newLessonHelp, setNewLessonHelp] = useState("");

    const handleSeed = async () => {
        if (!sessionId) return;
        setIsSeeding(true);
        try {
            await seedCourse({
                sessionId,
                channelId,
                modules: [
                    {
                        title: "What a Chart Consists Of",
                        description: "Learn the building blocks of any forex chart.",
                        order: 1,
                        lessons: [
                            {
                                title: "Candlesticks (OHLC + Wicks)",
                                content: "A candlestick represents price movement over a specific time period. Each candle has four key values:\n\n• Open – the price at the start of the period\n• High – the highest price reached\n• Low – the lowest price reached\n• Close – the price at the end of the period\n\nThe body of the candle fills the space between the open and close. Wicks (shadows) extend above and below, showing the full range of price movement. A green/bullish candle means the close was above the open. A red/bearish candle means the close was below the open.",
                                helpText: "Think of each candle as a summary of a battle between buyers and sellers. The body shows who won, and the wicks show how far each side pushed.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Candlestick+Diagram",
                                order: 1,
                            },
                            {
                                title: "Timeframes and Why They Matter",
                                content: "Timeframes control how much time each candle represents. Common timeframes include M1 (1 minute), M5, M15, H1 (1 hour), H4, D1 (daily), and W1 (weekly).\n\nThe same market looks completely different on different timeframes. A trend on the 5-minute chart might just be a small pullback on the daily chart.\n\nHigher timeframes provide the big picture narrative. Lower timeframes offer precise entries. Always align your trades with the higher timeframe direction.",
                                helpText: "Start by analyzing the daily chart to understand the overall trend, then zoom into H1 or M15 for entries. Never trade against the daily direction as a beginner.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Timeframes+Comparison",
                                order: 2,
                            },
                            {
                                title: "Trend vs Range",
                                content: "Markets move in two main ways:\n\n1. Trending – price makes consistent higher highs and higher lows (uptrend) or lower lows and lower highs (downtrend). Strong direction.\n\n2. Ranging – price bounces between a clear support and resistance level without making new highs or lows. The market is undecided.\n\nIdentifying whether the market is trending or ranging is the first step before placing any trade. Trends reward breakout strategies. Ranges reward reversal strategies.",
                                helpText: "If you can't clearly identify a trend, assume it's a range. Trading ranges requires patience and discipline – buy near support, sell near resistance.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Trend+Vs+Range",
                                order: 3,
                            },
                            {
                                title: "Support & Resistance Basics",
                                content: "Support is a price level where buying pressure tends to overcome selling pressure – price bounces up from this level.\n\nResistance is a price level where selling pressure tends to overcome buying pressure – price drops down from this level.\n\nThese levels form because of market memory. Traders remember where price reversed before and place orders around those levels again. The more times a level is tested, the more significant it becomes.\n\nWhen support breaks, it often becomes resistance (and vice versa). This concept is called a flip zone.",
                                helpText: "Draw horizontal lines at levels where you see price reverse at least twice. These become your key levels. The cleaner the bounce, the stronger the level.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Support+%26+Resistance",
                                order: 4,
                            },
                            {
                                title: "Swing High / Swing Low Foundation",
                                content: "A swing high is a point where price reaches a temporary peak and then reverses downward. The candle at the peak has lower highs on both sides.\n\nA swing low is a point where price reaches a temporary trough and then reverses upward. The candle at the trough has higher lows on both sides.\n\nSwing points are the building blocks of market structure. They define the 'steps' in a trend:\n\n• Uptrend: series of higher swing highs and higher swing lows\n• Downtrend: series of lower swing highs and lower swing lows\n\nLearning to identify swing points is essential before moving to structure analysis.",
                                helpText: "Look for clear turning points – not every small candle is a swing point. Focus on obvious, clean reversals that stand out on the chart.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Swing+Points",
                                order: 5,
                            },
                        ],
                    },
                    {
                        title: "Higher Timeframe Narrative",
                        description: "Understand the bigger picture before zooming in.",
                        order: 2,
                        lessons: [
                            {
                                title: "HTF Bias (Bullish/Bearish/Neutral)",
                                content: "Higher Timeframe (HTF) bias is the overall directional expectation based on the daily or weekly chart.\n\n• Bullish bias – HTF structure is making higher highs and higher lows. Look for buys.\n• Bearish bias – HTF structure is making lower highs and lower lows. Look for sells.\n• Neutral bias – HTF structure is unclear, ranging, or at a major decision point. Wait or trade ranges carefully.\n\nYour HTF bias acts as a filter. On lower timeframes, you only take trades that align with this bias. This single rule eliminates many losing trades.",
                                helpText: "Check the daily chart every morning before you trade. Mark the last clear swing high and swing low. If both are moving up, your bias is bullish. If both are moving down, bearish. If mixed, neutral.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=HTF+Bias",
                                order: 1,
                            },
                            {
                                title: "Premium/Discount + Equilibrium",
                                content: "Think of any range as having three zones:\n\n• Premium zone (upper half) – price is expensive. Smart money sells here.\n• Discount zone (lower half) – price is cheap. Smart money buys here.\n• Equilibrium (50% level) – the midpoint. Price often reacts here.\n\nIn an uptrend, you want to buy in the discount zone of a pullback. In a downtrend, you want to sell in the premium zone of a rally.\n\nThis concept keeps you from chasing price. Instead of buying at the top of a move, you wait for price to pull back into your zone.",
                                helpText: "Use a Fibonacci retracement tool from the swing low to swing high. The 50% level is equilibrium. Below 50% is discount (for buys), above 50% is premium (for sells).",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Premium+Discount",
                                order: 2,
                            },
                            {
                                title: "Weekly/Daily Key Levels",
                                content: "Key levels derived from higher timeframes act as major magnets and reaction zones:\n\n• Previous Day High (PDH) / Previous Day Low (PDL) – price often reacts at these levels during the current day.\n• Previous Week High (PWH) / Previous Week Low (PWL) – strong weekly reference points.\n• Daily Open – serves as a bias line. Above the daily open = bullish intraday sentiment. Below = bearish.\n\nThese levels are objective and easy to mark. They give you a framework for where price might react, saving you from random line drawing.",
                                helpText: "Each morning, mark the previous day's high and low with horizontal lines. Watch how price reacts when it reaches these levels during the new trading session.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Key+Levels",
                                order: 3,
                            },
                            {
                                title: "HTF Range Positioning",
                                content: "When the higher timeframe is in a range, price oscillates between a clearly defined high and low boundary.\n\nYour job is to identify where price currently sits within this range:\n\n• Near the top (resistance) → expect a move down, look for sells\n• Near the bottom (support) → expect a move up, look for buys\n• At equilibrium (middle) → no clear edge, wait\n\nThis concept prevents you from blindly buying into resistance or selling into support. Always know where you are in the bigger picture before taking a trade.",
                                helpText: "Draw a box around the HTF range (connect the highs and lows). Divide it in half for equilibrium. Only trade from the edges, not the middle.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Range+Positioning",
                                order: 4,
                            },
                        ],
                    },
                    {
                        title: "Market Structure",
                        description: "Learn to read the story structure tells.",
                        order: 3,
                        lessons: [
                            {
                                title: "Uptrend Structure (HH/HL)",
                                content: "An uptrend is defined by a sequence of:\n\n• Higher Highs (HH) – each peak is higher than the previous peak\n• Higher Lows (HL) – each pullback low is higher than the previous low\n\nThis staircase pattern shows that buyers are in control. Each time price pulls back, buyers step in at a higher level than before, pushing price to new highs.\n\nTo trade an uptrend:\n1. Wait for a pullback (HL)\n2. Look for a bullish entry signal\n3. Target the next higher high\n\nThe trend continues until the pattern breaks – when price makes a lower low.",
                                helpText: "Label the swing points on your chart with HH and HL. If you can see this pattern clearly, the uptrend is intact. When it stops, the trend may be ending.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Uptrend",
                                order: 1,
                            },
                            {
                                title: "Downtrend Structure (LL/LH)",
                                content: "A downtrend is the mirror of an uptrend:\n\n• Lower Lows (LL) – each trough is lower than the previous trough\n• Lower Highs (LH) – each rally high is lower than the previous high\n\nThis pattern shows sellers are in control. Each time price rallies, sellers step in at a lower level, pushing price to new lows.\n\nTo trade a downtrend:\n1. Wait for a rally (LH)\n2. Look for a bearish entry signal\n3. Target the next lower low\n\nThe downtrend continues until price makes a higher high, breaking the pattern.",
                                helpText: "Mirror the uptrend logic. Mark the swings with LL and LH. If you see stepping down consistently, sellers are winning. Trade with them, not against them.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Downtrend",
                                order: 2,
                            },
                            {
                                title: "BOS vs CHoCH",
                                content: "Two critical concepts in market structure:\n\nBOS (Break of Structure):\nA continuation signal. In an uptrend, BOS is when price breaks above the previous HH. In a downtrend, BOS is when price breaks below the previous LL. BOS confirms the trend continues.\n\nCHoCH (Change of Character):\nA reversal signal. In an uptrend, CHoCH happens when price breaks below the most recent HL (higher low). In a downtrend, CHoCH is when price breaks above the most recent LH.\n\nBOS = trend continues → trade with it\nCHoCH = trend might reverse → be cautious, look for new direction\n\nThese concepts help you anticipate whether to hold your position or prepare for a reversal.",
                                helpText: "Draw a horizontal line at the last significant swing point. If price breaks it in the trending direction, it's BOS. If it breaks it against the trend, it's CHoCH. Practice labeling these on historical charts.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=BOS+%26+CHoCH",
                                order: 3,
                            },
                            {
                                title: "Pullbacks vs Reversals",
                                content: "Not every move against the trend is a reversal. Most are pullbacks:\n\nPullback:\n• Temporary move against the trend\n• Stays within the overall structure (doesn't break key levels)\n• An opportunity to enter in the trend direction at a better price\n\nReversal:\n• A structural shift – CHoCH occurs\n• Key levels are broken\n• The market begins forming structure in the opposite direction\n\nThe key difference: a pullback respects the trend structure. A reversal breaks it.\n\nAs a beginner, assume every counter-trend move is a pullback until proven otherwise. Only call it a reversal when you see confirmed CHoCH on your trading timeframe.",
                                helpText: "If price pulls back but holds above the last HL (in an uptrend), it's probably just a pullback. If it breaks below the HL, that's your CHoCH signal – potential reversal. Wait for confirmation before switching bias.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Pullbacks+%26+Reversals",
                                order: 4,
                            },
                        ],
                    },
                    {
                        title: "Demo Account Setup (Exness + MT5)",
                        description: "In this module you'll create a demo trading account and connect it to MetaTrader 5 (MT5). Follow each step on your device. Take your time.",
                        order: 4,
                        lessons: [
                            {
                                title: "What You Need Before You Start",
                                content: "Before opening a demo account, make sure you have:\n\n• A working email address\n• Your phone nearby (for verification if required)\n• MT5 installed (mobile or desktop)\n\nYou can complete this module on mobile or desktop.",
                                helpText: "If you don't have MT5 yet, don't worry — the next lesson walks you through installing it.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Before+You+Start",
                                mobileHint: "Recommended: do the setup on your phone first, then optionally add MT5 on desktop later.",
                                desktopHint: "Make sure you can access your email easily on desktop for verification links.",
                                order: 1,
                            },
                            {
                                title: "Install MetaTrader 5 (MT5)",
                                content: "Install MT5 on the device you'll trade on. After installation, open MT5 and keep it ready.",
                                helpText: "Make sure it's MetaTrader 5, not MetaTrader 4. If you already have MT5 installed, continue to the next lesson.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Install+MT5",
                                mobileContent: "Open the App Store (iPhone) or Google Play (Android) → search \"MetaTrader 5\" → install → open the app.",
                                desktopContent: "Download MT5 from the official MetaQuotes site (or via Exness download links) → run the installer → open MT5.",
                                order: 2,
                            },
                            {
                                title: "Create an Exness Account",
                                content: "Create your Exness account:\n\n1. Go to the Exness website or Exness app\n2. Tap Sign Up / Register\n3. Enter your email and create a strong password\n4. Confirm your email if asked",
                                helpText: "If you don't see the email immediately, check Spam/Junk. Use a password you can remember.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Create+Exness+Account",
                                mobileHint: "Use the Exness mobile app if it's easier, but web is fine too.",
                                desktopHint: "Use the web dashboard — easier to manage credentials and copy/paste.",
                                order: 3,
                            },
                            {
                                title: "Create a Demo Account in Exness",
                                content: "Inside Exness:\n\n1. Go to Accounts\n2. Choose Open new account\n3. Select Demo\n4. Choose platform: MT5\n5. Set currency (USD), leverage (start moderate like 1:100 or 1:200), and demo balance (e.g., $10,000)\n6. Create the demo account",
                                helpText: "If you're unsure about leverage, choose something moderate. You can always create a second demo later.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Open+Demo+Account",
                                order: 4,
                            },
                            {
                                title: "Find Your MT5 Login Details",
                                content: "To connect Exness to MT5 you need:\n\n• Login (account number)\n• Password (trading password)\n• Server name\n\nIn Exness, open the demo account details and locate MT5 credentials.",
                                helpText: "The server name matters. If MT5 cannot connect, it's usually the wrong server or wrong password.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=MT5+Login+Details",
                                mobileHint: "Use copy buttons if available to avoid typos.",
                                desktopHint: "Keep the credentials window open so you can copy/paste into MT5.",
                                order: 5,
                            },
                            {
                                title: "Log in to Exness Demo on MT5",
                                content: "On MT5, log in to your Exness demo:\n\n1. Enter Login\n2. Enter Password\n3. Select the exact Exness Server\n4. Sign in",
                                helpText: "If you can't find the server, use search inside MT5 and type \"Exness\".",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=MT5+Login",
                                mobileContent: "MT5 → Manage Accounts → Login to an existing account → enter credentials → Sign In",
                                desktopContent: "MT5 → File → Login to Trade Account → enter credentials → choose server → OK",
                                order: 6,
                            },
                            {
                                title: "Confirm It's Working (Quotes + Trade Access)",
                                content: "Confirm the demo is active:\n\n• Quotes/prices are moving\n• You can open a chart\n• Your balance/equity shows in the Trade tab\n\nIf everything updates, you're connected successfully.",
                                helpText: "If quotes are frozen, check internet connection and re-check server selection.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Confirm+Working",
                                order: 7,
                            },
                            {
                                title: "Optional: Add Symbols (Forex Pairs)",
                                content: "If you don't see the pairs you want:\n\n1. Open Symbols (or the + icon)\n2. Search EURUSD, GBPUSD, XAUUSD\n3. Tap to add them to your watchlist",
                                helpText: "If symbols have suffixes, that's normal (broker-specific). Add the main pairs you'll practice with.",
                                imageUrl: "https://placehold.co/600x340/1B1B1B/EEEEEE/png?text=Add+Symbols",
                                order: 8,
                            },
                        ],
                    },
                ],
            });
            toast({ description: "Course seeded successfully! ✅" });
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        } finally {
            setIsSeeding(false);
        }
    };

    const handleAddModule = async () => {
        if (!sessionId || !newModuleTitle.trim()) return;
        const order = (courseData?.length ?? 0) + 1;
        try {
            await createModule({ sessionId, channelId, title: newModuleTitle.trim(), order });
            setNewModuleTitle("");
            toast({ description: "Module created." });
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        }
    };

    const handleSaveLesson = async (lessonId: Id<"courseLessons">) => {
        if (!sessionId) return;
        setIsSaving(true);
        try {
            await updateLesson({
                sessionId,
                lessonId,
                title: editTitle,
                content: editContent,
                helpText: editHelpText,
            });
            setEditingLesson(null);
            toast({ description: "Lesson updated." });
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddLesson = async (moduleId: Id<"courseModules">) => {
        if (!sessionId || !newLessonTitle.trim()) return;
        const mod = courseData?.find((m) => m._id === moduleId);
        const order = (mod?.lessons.length ?? 0) + 1;
        try {
            await createLesson({
                sessionId,
                moduleId,
                title: newLessonTitle.trim(),
                content: newLessonContent.trim(),
                helpText: newLessonHelp.trim() || undefined,
                order,
            });
            setAddingToModule(null);
            setNewLessonTitle("");
            setNewLessonContent("");
            setNewLessonHelp("");
            toast({ description: "Lesson added." });
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        }
    };

    const handleDeleteLesson = async (lessonId: Id<"courseLessons">) => {
        if (!sessionId) return;
        try {
            await deleteLesson({ sessionId, lessonId });
            toast({ description: "Lesson deleted." });
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        }
    };

    const handleImageUpload = async (lessonId: Id<"courseLessons">, file: File) => {
        if (!sessionId) return;
        try {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });
            if (!result.ok) throw new Error("Upload failed");
            const { storageId } = await result.json();
            await updateLesson({ sessionId, lessonId, imageStorageId: storageId });
            toast({ description: "Image uploaded." });
        } catch (err: any) {
            toast({ variant: "destructive", description: err.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" title="Course Manager">
                    <Settings className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Course Manager
                    </DialogTitle>
                </DialogHeader>

                {/* Seed Button */}
                {(!courseData || courseData.length === 0) && (
                    <div className="rounded-lg border border-dashed border-orange-300 p-4 text-center space-y-2">
                        <p className="text-sm text-[#7A7A7A]">No course content yet.</p>
                        <Button
                            onClick={handleSeed}
                            disabled={isSeeding}
                            className="bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                        >
                            {isSeeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Seed Default Course
                        </Button>
                    </div>
                )}

                {/* Modules + Lessons */}
                <div className="space-y-4">
                    {courseData?.map((mod) => (
                        <div key={mod._id} className="space-y-2">
                            <div className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm">{mod.title}</h3>
                            </div>

                            {mod.lessons.map((lesson) => (
                                <div key={lesson._id} className="ml-6 rounded-lg border p-3 space-y-2 text-sm">
                                    {editingLesson === lesson._id ? (
                                        <div className="space-y-2">
                                            <Input
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                placeholder="Title"
                                            />
                                            <Textarea
                                                value={editContent}
                                                onChange={(e) => setEditContent(e.target.value)}
                                                placeholder="Content"
                                                className="min-h-[80px]"
                                            />
                                            <Textarea
                                                value={editHelpText}
                                                onChange={(e) => setEditHelpText(e.target.value)}
                                                placeholder="Help text (optional)"
                                                className="min-h-[50px]"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSaveLesson(lesson._id)}
                                                    disabled={isSaving}
                                                    className="gap-1"
                                                >
                                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                                    Save
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => setEditingLesson(null)}>
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="font-medium">{lesson.title}</span>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <label className="cursor-pointer" title="Upload image">
                                                    <Upload className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleImageUpload(lesson._id, file);
                                                        }}
                                                    />
                                                </label>
                                                <button
                                                    onClick={() => {
                                                        setEditingLesson(lesson._id);
                                                        setEditTitle(lesson.title);
                                                        setEditContent(lesson.content);
                                                        setEditHelpText(lesson.helpText ?? "");
                                                    }}
                                                    className="text-muted-foreground hover:text-foreground"
                                                    title="Edit"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLesson(lesson._id)}
                                                    className="text-destructive/60 hover:text-destructive"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Add lesson to module */}
                            {addingToModule === mod._id ? (
                                <div className="ml-6 rounded-lg border border-dashed p-3 space-y-2">
                                    <Input
                                        value={newLessonTitle}
                                        onChange={(e) => setNewLessonTitle(e.target.value)}
                                        placeholder="Lesson title"
                                    />
                                    <Textarea
                                        value={newLessonContent}
                                        onChange={(e) => setNewLessonContent(e.target.value)}
                                        placeholder="Explanation content"
                                        className="min-h-[60px]"
                                    />
                                    <Textarea
                                        value={newLessonHelp}
                                        onChange={(e) => setNewLessonHelp(e.target.value)}
                                        placeholder="Help text (optional)"
                                        className="min-h-[40px]"
                                    />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => handleAddLesson(mod._id)} disabled={!newLessonTitle.trim()}>
                                            Add Lesson
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setAddingToModule(null)}>
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="ml-6 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                    onClick={() => setAddingToModule(mod._id)}
                                >
                                    <Plus className="h-3 w-3" /> Add lesson
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Module */}
                <div className="flex items-center gap-2 mt-2">
                    <Input
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        placeholder="New module title..."
                        className="flex-1"
                    />
                    <Button size="sm" onClick={handleAddModule} disabled={!newModuleTitle.trim()}>
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Module
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
