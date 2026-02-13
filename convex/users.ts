import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "./authUtils";
import { hashPassword } from "./crypto";

export const getCurrentUser = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId || null);
        if (!userId) return null;

        return await ctx.db.get(userId);
    },
});

export const updateUserRole = mutation({
    args: {
        sessionId: v.id("sessions"),
        id: v.id("users"),
        role: v.union(v.literal("admin"), v.literal("moderator"), v.literal("user")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);

        // Only full admins can change roles
        if (!user || !user.isAdmin) {
            throw new Error("Unauthorized: Admin access required.");
        }

        await ctx.db.patch(args.id, {
            role: args.role,
            // Sync legacy isAdmin flag: true only for 'admin' role
            isAdmin: args.role === "admin",
        });
    },
});

export const createUser = mutation({
    args: {
        sessionId: v.id("sessions"),
        username: v.string(),
        password: v.string(),
        isAdmin: v.boolean(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const adminUser = await ctx.db.get(userId);
        if (!adminUser || !adminUser.isAdmin) {
            throw new Error("Unauthorized");
        }

        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();

        if (existingUser) {
            throw new Error("Username already taken");
        }

        const hashedPassword = await hashPassword(args.password);

        await ctx.db.insert("users", {
            username: args.username,
            password: hashedPassword,
            isAdmin: args.isAdmin,
            role: args.isAdmin ? "admin" : "user",
            createdAt: Date.now(),
        });
    },
});

export const deleteUser = mutation({
    args: {
        sessionId: v.id("sessions"),
        id: v.id("users"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const adminUser = await ctx.db.get(userId);
        if (!adminUser || !adminUser.isAdmin) {
            throw new Error("Unauthorized");
        }

        // Prevent deleting self (optional but good practice)
        if (args.id === userId) {
            throw new Error("Cannot delete yourself");
        }

        await ctx.db.delete(args.id);
    },
});


// export const requestAdminRole = mutation({ // For testing purposes in dev, make user admin
//     args: {
//         sessionId: v.id("sessions"),
//     },
//     handler: async (ctx, args) => {
//         const userId = await getAuthUserId(ctx, args.sessionId);
//         if (!userId) throw new Error("Unauthenticated");

//         const user = await ctx.db.get(userId);
//         if (!user) throw new Error("User not found");

//         // In production, this logic should be restricted or removed
//         await ctx.db.patch(user._id, { isAdmin: true });
//     }
// });

export const getAllUsers = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId || null);
        if (!userId) return [];

        const currentUser = await ctx.db.get(userId);

        if (!currentUser?.isAdmin) {
            return [];
        }

        return await ctx.db.query("users").collect();
    }
});

export const updateProfile = mutation({
    args: {
        sessionId: v.id("sessions"),
        name: v.optional(v.string()),
        bio: v.optional(v.string()),
        email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const patch: any = {};
        if (args.name !== undefined) patch.name = args.name;
        if (args.bio !== undefined) patch.bio = args.bio;
        if (args.email !== undefined) patch.email = args.email;

        await ctx.db.patch(userId, patch);
    },
});

export const listUsersForPicker = query({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) return [];

        const users = await ctx.db.query("users").collect();
        return users.map((u) => ({
            _id: u._id,
            username: u.username,
            name: u.name,
        }));
    },
});
