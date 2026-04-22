import { NextResponse } from "next/server";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { cancelInvitation } from "@/lib/services/organization-service";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

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
    await cancelInvitation(id, atlas.userId, atlas.organizationId);

    logger.info("Atlas invitation revoked", {
      invitationId: id,
      organizationId: atlas.organizationId,
      revokedBy: atlas.userId,
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
