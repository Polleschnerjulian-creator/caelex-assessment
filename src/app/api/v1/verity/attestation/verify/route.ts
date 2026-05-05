import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAttestation } from "@/lib/verity/core/attestation";
import { getKeyByKeyId } from "@/lib/verity/keys/issuer-keys";
import { parseAttestation } from "@/lib/verity/certificates/serializer";
import { safeLog } from "@/lib/verity/utils/redaction";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

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
    const rl = await checkRateLimit("verity_public", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

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

    // Look up key by key_id in DB — STRICT: no fallback to embedded key
    const keyInfo = await getKeyByKeyId(prisma, attestation.issuer.key_id);

    if (!keyInfo) {
      return NextResponse.json({
        valid: false,
        attestation_id: attestation.attestation_id,
        issuer_known: false,
        errors: ["Issuer key not found in Caelex keyset. Cannot verify."],
        verified_at: new Date().toISOString(),
      });
    }

    const publicKeyHex = keyInfo.publicKeyHex;

    // Verify attestation
    const result = verifyAttestation(attestation, publicKeyHex, true);

    // Also check that the key from DB matches the one in the attestation
    if (keyInfo && keyInfo.publicKeyHex !== attestation.issuer.public_key) {
      result.valid = false;
      result.checks.issuer_key_matches = false;
      result.errors.push("Embedded public key does not match keyset");
      // T5-13 (audit fix 2026-05-05): set reason from the literal we
      // just pushed instead of pulling `errors[0]`. If verifyAttestation
      // had appended any prior errors, `errors[0]` would be a stale
      // earlier message — the reason should match THIS check.
      if (!result.reason) {
        result.reason = "Embedded public key does not match keyset";
      }
    }

    // Increment verification count if attestation is in DB
    try {
      await prisma.verityAttestation.updateMany({
        where: { attestationId: attestation.attestation_id },
        data: {}, // Just touching to confirm it exists
      });
    } catch {
      // Not in our DB — that's fine, could be externally submitted
    }

    safeLog("Attestation verification completed", {
      attestationId: attestation.attestation_id,
      valid: String(result.valid),
      issuer_known: "true",
    });

    return NextResponse.json({
      valid: result.valid,
      attestation_id: attestation.attestation_id,
      issuer_known: true,
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
