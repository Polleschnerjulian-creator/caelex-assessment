import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listAllIssuerKeys } from "@/lib/verity/keys/key-rotation";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * GET /api/v1/verity/public-key
 * Returns all Caelex public keys (active + rotated).
 * Auth: NONE (public endpoint)
 *
 * Returns ALL keys so old attestations remain verifiable after key rotation.
 */
export async function GET() {
  try {
    const keys = await listAllIssuerKeys(prisma);

    const activeKey = keys.find((k) => k.active);

    safeLog("Public key endpoint accessed", {
      total_keys: String(keys.length),
    });

    // Only expose active key publicly (SVA-84).
    // Rotated keys are looked up internally by key_id during verification.
    return NextResponse.json({
      active_key: activeKey
        ? {
            key_id: activeKey.key_id,
            public_key: activeKey.public_key,
            algorithm: activeKey.algorithm,
            active_since: activeKey.active_since,
          }
        : null,
      total_keys: keys.length,
      verification_url:
        "https://www.caelex.eu/api/v1/verity/attestation/verify",
    });
  } catch (error) {
    safeLog("Public key endpoint failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to retrieve public keys" },
      { status: 500 },
    );
  }
}
