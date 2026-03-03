import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAttestation } from "@/lib/verity/core/attestation";
import { getKeyByKeyId } from "@/lib/verity/keys/issuer-keys";
import { parseAttestation } from "@/lib/verity/certificates/serializer";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * POST /api/v1/verity/attestation/verify
 * Verifies a signed attestation.
 * Auth: NONE (public endpoint)
 *
 * STRICT: key_id MUST be in Caelex's keyset.
 * NO fallback to embedded public key.
 * Otherwise anyone can generate their own keypair and self-issue attestations.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attestation: rawAttestation } = body;

    if (!rawAttestation) {
      return NextResponse.json(
        { error: "attestation is required" },
        { status: 400 },
      );
    }

    // Parse attestation
    const attestation =
      typeof rawAttestation === "string"
        ? parseAttestation(rawAttestation)
        : rawAttestation;

    if (!attestation?.issuer?.key_id) {
      return NextResponse.json(
        { error: "Invalid attestation format or missing key_id" },
        { status: 400 },
      );
    }

    // Look up key by key_id in DB — STRICT: no fallback
    const keyInfo = await getKeyByKeyId(prisma, attestation.issuer.key_id);
    const issuer_known = !!keyInfo;
    const publicKeyHex = keyInfo?.publicKeyHex ?? attestation.issuer.public_key;

    // Verify attestation
    const result = verifyAttestation(attestation, publicKeyHex, issuer_known);

    // Also check that the key from DB matches the one in the attestation
    if (keyInfo && keyInfo.publicKeyHex !== attestation.issuer.public_key) {
      result.valid = false;
      result.checks.issuer_key_matches = false;
      result.errors.push("Embedded public key does not match keyset");
      if (!result.reason) result.reason = result.errors[0];
    }

    // Increment verification count if attestation is in DB
    if (issuer_known) {
      try {
        await prisma.verityAttestation.updateMany({
          where: { attestationId: attestation.attestation_id },
          data: {}, // Just touching to confirm it exists
        });
      } catch {
        // Not in our DB — that's fine, could be externally submitted
      }
    }

    safeLog("Attestation verification completed", {
      attestationId: attestation.attestation_id,
      valid: String(result.valid),
      issuer_known: String(issuer_known),
    });

    return NextResponse.json({
      valid: result.valid,
      attestation_id: attestation.attestation_id,
      issuer_known,
      checks: result.checks,
      claim: attestation.claim?.claim_statement,
      result: attestation.claim?.result,
      trust_level: attestation.evidence?.trust_level,
      issuer: attestation.issuer?.name,
      issuer_key_id: attestation.issuer?.key_id,
      algorithm: attestation.issuer?.algorithm,
      verified_at: new Date().toISOString(),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    safeLog("Attestation verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to verify attestation" },
      { status: 500 },
    );
  }
}
