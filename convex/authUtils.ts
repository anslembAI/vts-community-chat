
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function getAuthUserId(ctx: QueryCtx | MutationCtx, sessionId: Id<"sessions"> | null): Promise<Id<"users"> | null> {
    if (!sessionId) return null;

    const session = await ctx.db.get(sessionId);
    if (!session) return null;

    if (session.expiresAt < Date.now()) {
        return null;
    }

    return session.userId;
}
