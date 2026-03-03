import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCertificate } from "@/lib/verity/certificates/verifier";
import { getKeyByKeyId } from "@/lib/verity/keys/issuer-keys";
import { parseCertificate } from "@/lib/verity/certificates/serializer";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * POST /api/v1/verity/certificate/verify
 * Verifies a signed certificate with all embedded attestations.
 * Auth: NONE (public endpoint)
 *
 * Offline-capable logic: only needs the certificate JSON and public key.
 * DB lookup is for key trust validation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { certificate: rawCert } = body;

    if (!rawCert) {
      return NextResponse.json(
        { error: "certificate is required" },
        { status: 400 },
      );
    }

    // Parse certificate
    const certificate =
      typeof rawCert === "string" ? parseCertificate(rawCert) : rawCert;

    if (!certificate?.issuer?.key_id) {
      return NextResponse.json(
        { error: "Invalid certificate format or missing key_id" },
        { status: 400 },
      );
    }

    // Look up key by key_id in DB
    const keyInfo = await getKeyByKeyId(prisma, certificate.issuer.key_id);
    const publicKeyHex = keyInfo?.publicKeyHex ?? certificate.issuer.public_key;

    // Verify certificate
    const result = verifyCertificate(certificate, publicKeyHex);

    // If key not in our keyset, mark as invalid
    if (!keyInfo) {
      result.valid = false;
      result.errors.push("Issuer key_id not found in Caelex keyset");
      if (!result.reason)
        result.reason = "Issuer key_id not found in Caelex keyset";
    }

    // Increment verification count
    try {
      await prisma.verityCertificate.updateMany({
        where: { certificateId: certificate.certificate_id },
        data: {
          verificationCount: { increment: 1 },
          lastVerifiedAt: new Date(),
        },
      });
    } catch {
      // Not in our DB — external submission
    }

    safeLog("Certificate verification completed", {
      certificateId: certificate.certificate_id,
      valid: String(result.valid),
    });

    return NextResponse.json({
      valid: result.valid,
      certificate_id: certificate.certificate_id,
      checks: result.checks,
      claims: certificate.claims?.map(
        (c: {
          regulation_ref: string;
          claim_statement: string;
          result: boolean;
          trust_level: string;
        }) => ({
          regulation_ref: c.regulation_ref,
          claim_statement: c.claim_statement,
          result: c.result,
          trust_level: c.trust_level,
        }),
      ),
      issuer: certificate.issuer?.name,
      issuer_key_id: certificate.issuer?.key_id,
      verified_at: new Date().toISOString(),
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    safeLog("Certificate verification failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to verify certificate" },
      { status: 500 },
    );
  }
}
