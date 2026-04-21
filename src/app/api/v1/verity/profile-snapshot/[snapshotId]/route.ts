/**
 * Public verification endpoint for Profile Snapshots.
 *
 * GET /api/v1/verity/profile-snapshot/:snapshotId
 *
 *   Response:
 *   {
 *     snapshot: { id, snapshotHash, issuerKeyId, signature, frozenAt,
 *                 frozenBy, purpose, canonicalJson },
 *     verification: {
 *       valid, hashValid, signatureValid, computedHash,
 *       issuerKeyId, issuerPublicKeyHex, reason
 *     }
 *   }
 *
 * NO AUTH. Rate-limited via `verity_public` (30/hr/IP). Any third party
 * handed a snapshot id can call this endpoint to confirm:
 *   1. The canonical JSON hashes to the stored hash (untampered).
 *   2. The stored signature verifies against the issuer public key.
 *
 * If the verifier wants full independence they can also:
 *   - download the public key from `/api/v1/verity/public-key`
 *   - re-hash canonicalJson themselves with SHA-256
 *   - verify the signature offline using any Ed25519 library
 *
 * 404s when the id is not found — no distinction between "does not
 * exist" and "not available". This endpoint is a purely reactive
 * disclosure of snapshots the operator has already chosen to make
 * verifiable by sharing the id externally.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { verifyProfileSnapshot } from "@/lib/services/profile-snapshot-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ snapshotId: string }> },
) {
  try {
    const rl = await checkRateLimit("verity_public", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const { snapshotId } = await params;
    if (!snapshotId || typeof snapshotId !== "string") {
      return NextResponse.json(
        { error: "Invalid snapshot id" },
        { status: 400 },
      );
    }

    const { snapshot, report } = await verifyProfileSnapshot(snapshotId);

    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found", verification: report },
        { status: 404 },
      );
    }

    return NextResponse.json({
      snapshot: {
        id: snapshot.id,
        snapshotHash: snapshot.snapshotHash,
        issuerKeyId: snapshot.issuerKeyId,
        signature: snapshot.signature,
        frozenAt: snapshot.frozenAt.toISOString(),
        frozenBy: snapshot.frozenBy,
        purpose: snapshot.purpose,
        canonicalJson: snapshot.canonicalJson,
      },
      verification: report,
    });
  } catch (err) {
    logger.error("Error verifying profile snapshot", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
