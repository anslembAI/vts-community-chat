import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./authUtils";
import { encrypt, decrypt, hashValue, generateRandomString, hashPassword } from "./crypto";
import { verifyTOTP, createTOTPKeyURI } from "@oslojs/otp";
import { decodeBase32, encodeBase32NoPadding } from "@oslojs/encoding";

// 2FA Setup
export const startTwoFactorSetup = mutation({
    args: {
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        if (user.twoFactorEnabled) {
            throw new Error("2FA is already enabled");
        }

        // Generate a random secret (20 bytes for TOTP)
        const secretBytes = crypto.getRandomValues(new Uint8Array(20));
        const secretBase32 = encodeBase32NoPadding(secretBytes);
        const encryptedSecret = await encrypt(secretBase32);

        // Save progress (not enabled yet)
        await ctx.db.patch(userId, {
            twoFactorSecretEnc: encryptedSecret,
        });

        // Generate otpauth URI for QR code
        const issuer = "VTS Chat";
        const otpauth = createTOTPKeyURI(issuer, user.username, secretBytes, 30, 6);

        return { otpauth, secret: secretBase32 };
    },
});

export const confirmTwoFactorSetup = mutation({
    args: {
        sessionId: v.id("sessions"),
        token: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId);
        if (!userId) throw new Error("Unauthenticated");

        const user = await ctx.db.get(userId);
        if (!user || !user.twoFactorSecretEnc) throw new Error("Setup not started");

        // Decrypt secret and verify token
        const secretBase32 = await decrypt(user.twoFactorSecretEnc);
        const secretBytes = decodeBase32(secretBase32);

        const valid = verifyTOTP(secretBytes, 30, 6, args.token);
        if (!valid) {
            throw new Error("Invalid verification code. Please try again.");
        }

        // Generate backup codes (e.g., 10 codes)
        const backupCodes = [];
        const backupCodesHashed = [];
        for (let i = 0; i < 10; i++) {
            const code = generateRandomString(8).toUpperCase();
            // Format: XXXX-XXXX for readability
            const formatted = code.slice(0, 4) + "-" + code.slice(4);
            backupCodes.push(formatted);
            const hashed = await hashValue(formatted);
            backupCodesHashed.push(hashed);
        }

        // Enable 2FA
        await ctx.db.patch(userId, {
            twoFactorEnabled: true,
            twoFactorEnrolledAt: Date.now(),
            twoFactorVerifiedAt: Date.now(),
            backupCodesHashed: backupCodesHashed,
        });

        // Log the action
        await ctx.db.insert("securityAuditLog", {
            targetUserId: userId,
            action: "2FA_ENABLED",
            createdAt: Date.now(),
        });

        return { backupCodes };
    },
});

export const getTwoFactorState = query({
    args: {
        sessionId: v.optional(v.id("sessions")),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx, args.sessionId || null);
        if (!userId) return { status: "unauthenticated" };

        const user = await ctx.db.get(userId);
        if (!user) return { status: "unauthenticated" };

        return {
            status: "authenticated",
            twoFactorEnabled: !!user.twoFactorEnabled,
            username: user.username,
        };
    },
});

// Admin Reset
export const adminResetUser2FA = mutation({
    args: {
        sessionId: v.id("sessions"),
        targetUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const actorUserId = await getAuthUserId(ctx, args.sessionId);
        if (!actorUserId) throw new Error("Unauthenticated");

        const actor = await ctx.db.get(actorUserId);
        if (!actor || !actor.isAdmin) {
            throw new Error("Unauthorized: Admin access required.");
        }

        await ctx.db.patch(args.targetUserId, {
            twoFactorEnabled: false,
            twoFactorSecretEnc: undefined,
            backupCodesHashed: undefined,
        });

        await ctx.db.insert("securityAuditLog", {
            actorUserId,
            targetUserId: args.targetUserId,
            action: "2FA_RESET_BY_ADMIN",
            createdAt: Date.now(),
        });
    },
});

// Password Reset Flow (2FA-Gated)
export const startPasswordReset = mutation({
    args: {
        username: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .first();

        // Standard timing attack protection/generic response
        if (!user || !user.twoFactorEnabled) {
            return { status: "not_applicable" }; // Show same screen to prevent user enumeration
        }

        // Check for lockout
        if (user.resetLockedUntil && user.resetLockedUntil > Date.now()) {
            throw new Error(`Try again in ${Math.ceil((user.resetLockedUntil - Date.now()) / 60000)} minutes.`);
        }

        return { status: "ready", userId: user._id };
    },
});

export const verifyResetSecondFactor = mutation({
    args: {
        userId: v.id("users"),
        code: v.string(), // Authenticator code OR backup code
    },
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user || !user.twoFactorEnabled) throw new Error("Invalid request");

        // Check lockout
        if (user.resetLockedUntil && user.resetLockedUntil > Date.now()) {
            throw new Error("Account locked. Please wait.");
        }

        let isValid = false;
        let method: "PASSWORD_RESET_TOTP" | "PASSWORD_RESET_BACKUP_CODE" = "PASSWORD_RESET_TOTP";

        // Try TOTP first (6 digits)
        if (args.code.length === 6 && /^\d+$/.test(args.code)) {
            if (user.twoFactorSecretEnc) {
                const secretBase32 = await decrypt(user.twoFactorSecretEnc);
                const secretBytes = decodeBase32(secretBase32);
                isValid = verifyTOTP(secretBytes, 30, 6, args.code);
            }
        } else {
            // Check backup codes (hashed)
            method = "PASSWORD_RESET_BACKUP_CODE";
            if (user.backupCodesHashed) {
                const targetHash = await hashValue(args.code.toUpperCase());
                const matchingIdx = user.backupCodesHashed.indexOf(targetHash);
                if (matchingIdx !== -1) {
                    isValid = true;
                    // Remove used backup code
                    const newHashed = [...user.backupCodesHashed];
                    newHashed.splice(matchingIdx, 1);
                    await ctx.db.patch(user._id, {
                        backupCodesHashed: newHashed,
                    });
                }
            }
        }

        if (!isValid) {
            const attempts = (user.failedResetAttempts || 0) + 1;
            const patch: any = { failedResetAttempts: attempts };
            if (attempts >= 5) {
                patch.resetLockedUntil = Date.now() + 1000 * 60 * 15; // 15 min lock
                patch.failedResetAttempts = 0;
            }
            await ctx.db.patch(user._id, patch);
            throw new Error("Invalid security code.");
        }

        // Clear failures on success
        await ctx.db.patch(user._id, {
            failedResetAttempts: 0,
            resetLockedUntil: undefined,
        });

        // Grant a one-time reset token (short-lived encrypted string)
        const resetPayload = JSON.stringify({ userId: user._id, expires: Date.now() + 1000 * 60 * 10 });
        const resetToken = await encrypt(resetPayload);

        // Log
        await ctx.db.insert("securityAuditLog", {
            targetUserId: user._id,
            action: method,
            createdAt: Date.now(),
        });

        return { resetToken };
    },
});

export const finalizePasswordReset = mutation({
    args: {
        resetToken: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            const decrypted = await decrypt(args.resetToken);
            const data = JSON.parse(decrypted);
            if (!data.userId || data.expires < Date.now()) {
                throw new Error("Token expired");
            }

            const hashedPassword = await hashPassword(args.newPassword);
            await ctx.db.patch(data.userId, {
                password: hashedPassword,
            });

            // CRITICAL: Invalidate ALL existing user sessions
            const sessions = await ctx.db
                .query("sessions")
                .filter((q) => q.eq(q.field("userId"), data.userId as any))
                .collect();

            for (const session of sessions) {
                await ctx.db.delete(session._id);
            }

            return { success: true };
        } catch (err) {
            throw new Error("Invalid or expired reset token.");
        }
    },
});
