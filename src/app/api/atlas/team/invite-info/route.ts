import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/atlas/team/invite-info?token=...
 *
 * Public (no auth) lookup of an invitation's visible context so the
 * invite-accept page and the signup page can show who invited, which
 * org the invitee is joining, and lock the email field to the right
 * address. Only leaks the fields a legitimate invitee would already
 * see in the email body.
 *
 * Rate-limited at public_api (5/hr/IP) so attackers can't brute-probe
 * tokens at scale — 256-bit entropy makes any one token infeasible to
 * guess, but without a limit an attacker could scan for in-flight
 * invitations over time and harvest (firm → email) pairs for phishing.
 * Audit: docs/security/atlas-audit-2026-04-22.md (C-1).
 *
 * Returns:
 *   200 { email, organizationName, inviterName, expiresAt }
 *   404 when the token doesn't exist, is already accepted, or expired
 *       (unified — don't leak which of these states applies)
 */

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Tight rate-limit before any DB access. IP-based — this endpoint is
  // pre-auth so no user context to key on.
  const rl = await checkRateLimit("public_api", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token || token.length > 500) {
    return NextResponse.json(
      { error: "token query param required" },
      { status: 400 },
    );
  }

  // Unified "not found" — previously we returned 404 / 410 depending on
  // whether the token was unknown vs. accepted vs. expired. That state
  // distinction was a trivial oracle for attackers: 410 confirms a
  // token once existed. Return the same shape for all three.
  const notFound = () =>
    NextResponse.json({ error: "Invitation not found" }, { status: 404 });

  try {
    const invitation = await prisma.organizationInvitation.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
      },
    });
    if (!invitation) return notFound();
    if (invitation.acceptedAt) return notFound();
    if (invitation.expiresAt < new Date()) return notFound();

    // Whether a User already exists for this email — the client uses
    // this to decide whether to send the accept flow via signup or via
    // login. Doesn't leak whether the user is elsewhere in the system;
    // by definition the inviter knew this email.
    const [existingUser, inviter] = await Promise.all([
      prisma.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: invitation.invitedBy },
        select: { name: true },
      }),
    ]);

    return NextResponse.json({
      email: invitation.email,
      organizationName: invitation.organization.name,
      // Never fall back to the inviter email — combined with an invite
      // lookup it would hand phishers (firm → partner email) pairs.
      inviterName: inviter?.name || "A colleague",
      expiresAt: invitation.expiresAt,
      accountExists: Boolean(existingUser),
    });
  } catch (err) {
    logger.error("invite-info lookup failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
