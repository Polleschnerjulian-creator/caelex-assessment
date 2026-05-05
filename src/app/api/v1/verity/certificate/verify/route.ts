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

    // T1-H1 (audit fix 2026-05-05): strict trust gate — reject before
    // signature verification when the key_id is not in the issuer DB.
    //
    // Previously the code fell back to `certificate.issuer.public_key`
    // (the key embedded in the cert itself) and only later marked the
    // result as invalid. That left `checks.certificate_signature_valid:
    // true` in the response if the embedded key happened to verify the
    // payload — confusing for downstream clients that read partial
    // checks. Mirror the strict pattern from /api/v1/verity/attestation/
    // verify which never falls back to embedded keys.
    const keyInfo = await getKeyByKeyId(prisma, certificate.issuer.key_id);
    if (!keyInfo) {
      safeLog("Certificate verification rejected — unknown key_id", {
        certificateId: certificate.certificate_id,
        keyId: certificate.issuer.key_id,
      });
      return NextResponse.json({
        valid: false,
        certificate_id: certificate.certificate_id,
        checks: {
          certificate_signature_valid: false,
          all_attestations_valid: false,
          claims_match_attestations: false,
          issuer_key_known: false,
        },
        issuer: certificate.issuer?.name,
        issuer_key_id: certificate.issuer.key_id,
        verified_at: new Date().toISOString(),
        reason: "Issuer key_id not found in Caelex keyset",
        errors: ["Issuer key_id not found in Caelex keyset"],
      });
    }

    // Verify certificate against the trusted public key from the DB.
    const result = verifyCertificate(certificate, keyInfo.publicKeyHex);

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
