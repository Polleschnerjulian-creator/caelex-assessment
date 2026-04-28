import { NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { PasswordChangeSchema, formatZodErrors } from "@/lib/validations";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/atlas/settings/password
 *
 * Authenticated password change for Atlas users — current password must
 * verify before the new hash is written. OAuth-only users (no DB password
 * yet) are rejected because they have nothing to verify against; for
 * those, password is set via the credential-link flow on the dashboard.
 *
 * Rate-limited via the "sensitive" tier (5/hr per identifier) so a hijacked
 * session can't grind through dictionary attempts. Bcrypt 12-rounds is
 * applied via the shared hashPassword helper to match signup + seed.
 *
 * The route does NOT invalidate other active sessions — that would log the
 * lawyer out of their second tab unexpectedly. If we later add a "log out
 * all other devices" toggle, that gets its own endpoint.
 */
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate-limit (sensitive tier — 5/hr per user+IP) BEFORE any password
  // verification so a leaked session token can't pump the bcrypt-compare
  // CPU loop. checkRateLimit also no-ops gracefully in dev when Upstash
  // env vars are unset.
  const rl = await checkRateLimit(
    "sensitive",
    getIdentifier(request, atlas.userId),
  );
  if (!rl.success) {
    return NextResponse.json(
      {
        error: "Too many password-change attempts. Please try again later.",
        retryAfterMs: rl.reset - Date.now(),
      },
      { status: 429 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = PasswordChangeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: formatZodErrors(parsed.error),
      },
      { status: 400 },
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  // Read the current hash directly from the DB — auth() session doesn't
  // carry the hash for obvious reasons. If the user is OAuth-only their
  // password column is null and we reject the change attempt with a 400
  // that names the situation; rather than a generic "wrong password" we
  // tell them why so they can use the OAuth-link flow instead.
  const user = await prisma.user.findUnique({
    where: { id: atlas.userId },
    select: { id: true, password: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.password) {
    return NextResponse.json(
      {
        error:
          "No password is set on this account. Set one via the dashboard before changing it from Atlas.",
      },
      { status: 400 },
    );
  }

  const currentMatches = await verifyPassword(currentPassword, user.password);
  if (!currentMatches) {
    // Generic "current password incorrect" — don't leak whether the user
    // even has a password (we already gated on user.password above for
    // the OAuth-only path; here we just refuse the change).
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 400 },
    );
  }

  // Hash + persist. We log the audit event (without ANY password material)
  // so an admin can later confirm the change happened on the user's
  // initiative — useful for incident response if someone's account is
  // claimed-compromised after the fact.
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: newHash },
  });

  logger.info("Atlas user changed password", {
    userId: user.id,
    email: user.email ?? undefined,
  });

  return NextResponse.json({ success: true });
}
