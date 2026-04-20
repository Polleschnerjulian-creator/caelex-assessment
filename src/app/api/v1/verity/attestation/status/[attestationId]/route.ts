import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/attestation/status/:attestationId
 *
 * Revocation + expiry status for a single attestation. This is the
 * dereference target of the `credentialStatus.id` field embedded in
 * every Verity W3C Verifiable Credential (see
 * `src/lib/verity/vc/verifiable-credential.ts`). Without this
 * endpoint, any VC-aware verifier that follows the standard status
 * resolution loop per W3C VC Data Model 2.0 §4.5 would hit 404.
 *
 * Status semantics:
 *   "valid"    — not revoked, not yet expired
 *   "revoked"  — VerityAttestation.revokedAt is set (wins over expired)
 *   "expired"  — expiresAt is in the past
 *   "unknown"  — attestationId not found in the DB
 *
 * Auth: none (public, rate-limited via verity_public tier).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attestationId: string }> },
) {
  const rl = await checkRateLimit("verity_public", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const { attestationId } = await params;
  if (!attestationId || !/^va_[a-z0-9_]+$/i.test(attestationId)) {
    return NextResponse.json(
      { error: "invalid attestationId format" },
      { status: 400 },
    );
  }

  const row = await prisma.verityAttestation.findUnique({
    where: { attestationId },
    select: {
      attestationId: true,
      issuedAt: true,
      expiresAt: true,
      revokedAt: true,
      revokedReason: true,
    },
  });

  if (!row) {
    return NextResponse.json(
      {
        attestationId,
        status: "unknown",
        issuedAt: null,
        expiresAt: null,
        revokedAt: null,
        revocationReason: null,
      },
      { status: 404 },
    );
  }

  // Revoked wins over expired (a revoked-then-expiring credential stays
  // labelled "revoked" so verifiers don't think the revocation lapsed).
  let status: "valid" | "revoked" | "expired";
  if (row.revokedAt) {
    status = "revoked";
  } else if (row.expiresAt.getTime() < Date.now()) {
    status = "expired";
  } else {
    status = "valid";
  }

  return NextResponse.json({
    attestationId: row.attestationId,
    status,
    issuedAt: row.issuedAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    revocationReason: row.revokedReason ?? null,
  });
}
