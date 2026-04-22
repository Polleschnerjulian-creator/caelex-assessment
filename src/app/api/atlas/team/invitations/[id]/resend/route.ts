import { NextResponse } from "next/server";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { resendInvitation } from "@/lib/services/organization-service";
import { renderInvitationEmail } from "@/lib/email/invitation";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

/**
 * POST /api/atlas/team/invitations/[id]/resend
 *
 * Rotate the token on a pending invitation + dispatch a fresh
 * ATLAS-branded email via Resend. Owner-only.
 *
 * Behaviour:
 * - Generates a new 256-bit token and bumps expiresAt to now + 14 days
 *   (parity with fresh ATLAS invites; the generic Caelex flow uses 7).
 *   Old token becomes invalid immediately — if it leaked, the leak is
 *   contained at resend time.
 * - Sends the same Apple-style template as /api/atlas/team uses for
 *   fresh invites, with organizationName, inviterName, inviteUrl,
 *   expiresInDays plumbed through.
 * - Email failure is non-blocking: the token rotation still succeeds
 *   so the owner can manually share the fallback URL if Resend is
 *   temporarily unreachable.
 *
 * Rate limit: `sensitive` tier (5/hr per user) — matches the initial-
 * invite rate limit in /api/atlas/team POST, so a compromised owner
 * token can't mass-resend to flood targets with emails.
 */

export const runtime = "nodejs";

const INVITE_EXPIRY_DAYS = 14;

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can resend invitations" },
      { status: 403 },
    );
  }

  // Same tier as initial invites — resending is an email dispatch,
  // so the abuse surface is the same as inviting in the first place.
  const rl = await checkRateLimit(
    "sensitive",
    getIdentifier(request, atlas.userId),
  );
  if (!rl.success) return createRateLimitResponse(rl);

  const { id } = await ctx.params;
  if (!id || typeof id !== "string" || id.length > 200) {
    return NextResponse.json(
      { error: "Valid invitation id required" },
      { status: 400 },
    );
  }

  // Strip any trailing slash on the app URL so ${appUrl}/accept-invite
  // produces a clean URL. Same pattern as /api/atlas/team POST.
  const appUrl = (
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    ""
  ).replace(/\/+$/, "");
  if (!appUrl) {
    logger.error("Atlas resend: no NEXTAUTH_URL / AUTH_URL configured");
    return NextResponse.json(
      { error: "Service temporarily unavailable" },
      { status: 503 },
    );
  }

  try {
    const invitation = await resendInvitation(
      id,
      atlas.userId,
      atlas.organizationId,
      INVITE_EXPIRY_DAYS,
    );

    const inviteUrl = `${appUrl}/accept-invite?token=${encodeURIComponent(invitation.token)}`;

    // Re-send the branded email. Wrapped in try/catch so a Resend
    // outage doesn't unwind the token rotation — the owner can still
    // share the returned inviteUrl manually from the UI.
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html, text } = renderInvitationEmail({
        organizationName: atlas.organizationName,
        inviterName: atlas.userName || atlas.userEmail || "Ein Kollege",
        inviteUrl,
        recipientEmail: invitation.email,
        expiresInDays: INVITE_EXPIRY_DAYS,
      });
      await resend.emails.send({
        from: "Caelex ATLAS <noreply@caelex.eu>",
        to: invitation.email,
        replyTo: "hi@caelex.eu",
        subject,
        html,
        text,
      });
    } catch (emailErr) {
      logger.warn("Atlas invitation resend — email failed (non-blocking)", {
        error: emailErr,
        invitationId: invitation.id,
      });
    }

    logger.info("Atlas invitation resent", {
      invitationId: invitation.id,
      organizationId: atlas.organizationId,
      resentBy: atlas.userId,
    });

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
        inviteUrl,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "Invitation not found") {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }
    if (message === "Invitation has already been accepted") {
      // 409 because the target state is no longer "pending" — a UI
      // that sees this can refresh the team list to drop the row.
      return NextResponse.json(
        { error: "Invitation has already been accepted" },
        { status: 409 },
      );
    }
    logger.error("Atlas invitation resend failed", {
      invitationId: id,
      error: message,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
