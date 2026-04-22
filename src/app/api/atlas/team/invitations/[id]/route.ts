import { NextResponse } from "next/server";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { cancelInvitation } from "@/lib/services/organization-service";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger, maskEmail } from "@/lib/logger";
import { renderRevokeNotificationEmail } from "@/lib/email/revoke-notification";

/**
 * DELETE /api/atlas/team/invitations/[id]
 *
 * Revoke a pending invitation. Owner-only. Physically deletes the
 * `OrganizationInvitation` row (via cancelInvitation service) so the
 * invite URL becomes permanently invalid — matches the "once revoked,
 * gone" mental model expected by owners managing their team.
 *
 * Security notes:
 * - Owner-only: getAtlasAuth + isOwner() gate, enforced before any
 *   database access so probers can't distinguish "invitation exists
 *   but you can't touch it" from "invitation doesn't exist."
 * - Org-scoped: cancelInvitation verifies the invitation.organizationId
 *   matches the acting user's org, preventing IDOR across tenants.
 * - Rate-limited on the api tier (per-user identifier) to keep a
 *   compromised owner token from mass-revoking.
 * - Audit trail: cancelInvitation writes an `invitation_cancelled`
 *   AuditLog entry including previousValue (email + role).
 */
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can revoke invitations" },
      { status: 403 },
    );
  }

  const rl = await checkRateLimit("api", getIdentifier(_request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const { id } = await ctx.params;
  if (!id || typeof id !== "string" || id.length > 200) {
    return NextResponse.json(
      { error: "Valid invitation id required" },
      { status: 400 },
    );
  }

  try {
    // cancelInvitation now returns the row's email + organizationName
    // so we can dispatch a "your invitation was revoked" notification
    // to the former invitee. Non-blocking — if Resend fails the
    // revoke stays valid (the invite URL is already dead) and the
    // invitee will simply find the old link broken.
    const cancelled = await cancelInvitation(
      id,
      atlas.userId,
      atlas.organizationId,
    );

    // Fire-and-forget: don't await. A slow Resend endpoint shouldn't
    // block the UI response — the owner's revoke action has
    // succeeded the moment the DB row is gone.
    void sendRevokeNotification({
      recipientEmail: cancelled.email,
      organizationName: cancelled.organizationName,
    });

    logger.info("Atlas invitation revoked", {
      invitationId: id,
      organizationId: atlas.organizationId,
      revokedBy: atlas.userId,
      recipientEmail: maskEmail(cancelled.email),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Generic error surface — don't distinguish "not found" from
    // "wrong org", both manifest as the same 404 so probers can't
    // map out invitation-id space across tenants.
    if (message === "Invitation not found") {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 },
      );
    }
    logger.error("Atlas invitation revoke failed", {
      invitationId: id,
      error: message,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Dispatch the "your invitation was revoked" notification email.
 *
 * Fire-and-forget. Wrapped in try/catch so a Resend outage or a
 * misconfigured RESEND_API_KEY cannot propagate an unhandled rejection
 * back into the HTTP handler (void in the caller already suppresses
 * the return value, but we still want the error logged rather than
 * silently swallowed by the runtime).
 *
 * Intentionally separate from the main handler so the hot path —
 * DB revoke + audit log — stays readable and so testing the email
 * layer in isolation is straightforward.
 */
async function sendRevokeNotification(params: {
  recipientEmail: string;
  organizationName: string;
}): Promise<void> {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { subject, html, text } = renderRevokeNotificationEmail({
      organizationName: params.organizationName,
      recipientEmail: params.recipientEmail,
    });
    await resend.emails.send({
      from: "Caelex ATLAS <noreply@caelex.eu>",
      to: params.recipientEmail,
      replyTo: "hi@caelex.eu",
      subject,
      html,
      text,
    });
  } catch (emailErr) {
    logger.warn("Atlas revoke notification — email failed (non-blocking)", {
      error: emailErr,
      recipientEmail: maskEmail(params.recipientEmail),
    });
  }
}
