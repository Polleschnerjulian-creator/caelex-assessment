import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAndAttest } from "@/lib/verity/evaluation/threshold-evaluator";
import { issueCertificate } from "@/lib/verity/certificates/generator";
import { getActiveIssuerKey } from "@/lib/verity/keys/issuer-keys";
import { safeLog } from "@/lib/verity/utils/redaction";
import type { ThresholdAttestation } from "@/lib/verity/core/types";

/**
 * POST /api/v1/verity/certificate/issue
 * Issues a certificate bundling attestations for multiple regulations.
 * Auth: Session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      satellite_norad_id,
      regulations,
      expires_in_days = 90,
      public: isPublic = false,
    } = body;

    if (
      !regulations ||
      !Array.isArray(regulations) ||
      regulations.length === 0
    ) {
      return NextResponse.json(
        { error: "regulations array is required" },
        { status: 400 },
      );
    }

    // Get operator info
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: { select: { name: true } },
      },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Get satellite name if NORAD ID provided
    let satelliteName: string | null = null;
    if (satellite_norad_id) {
      const spacecraft = await prisma.spacecraft.findFirst({
        where: {
          noradId: satellite_norad_id,
          organizationId: membership.organizationId,
        },
        select: { name: true },
      });
      satelliteName = spacecraft?.name ?? null;
    }

    // Generate attestations for each regulation
    const attestations: ThresholdAttestation[] = [];
    const failed: string[] = [];

    for (const reg of regulations) {
      const attestation = await evaluateAndAttest(prisma, {
        operatorId: session.user.id,
        satelliteNorad: satellite_norad_id ?? null,
        satelliteName,
        regulationRef: reg,
        expiresInDays: expires_in_days,
      });
      if (attestation) {
        attestations.push(attestation);
      } else {
        failed.push(reg);
      }
    }

    if (attestations.length === 0) {
      return NextResponse.json(
        {
          error: "No evidence available for any requested regulation",
          failed_regulations: failed,
        },
        { status: 400 },
      );
    }

    // Issue certificate
    const issuerKey = await getActiveIssuerKey(prisma);
    const certificate = issueCertificate({
      attestations,
      operator_id: session.user.id,
      operator_name: membership.organization.name,
      satellite_norad_id: satellite_norad_id ?? null,
      satellite_name: satelliteName,
      issuer_key_id: issuerKey.keyId,
      issuer_private_key_der: issuerKey.privateKeyDer,
      issuer_public_key_hex: issuerKey.publicKeyHex,
      expires_in_days: expires_in_days,
      is_public: isPublic,
    });

    // Store in DB
    const attestationRecords = await prisma.verityAttestation.findMany({
      where: {
        attestationId: {
          in: attestations.map((a) => a.attestation_id),
        },
      },
      select: { id: true },
    });

    await prisma.verityCertificate.create({
      data: {
        certificateId: certificate.certificate_id,
        operatorId: session.user.id,
        satelliteNorad: satellite_norad_id ?? null,
        certificate: structuredClone(certificate),
        claimsCount: certificate.claims.length,
        regulationRefs: certificate.claims.map((c) => c.regulation_ref),
        minTrustLevel: certificate.evidence_summary.min_trust_level,
        sentinelBacked: certificate.evidence_summary.sentinel_backed,
        crossVerified: certificate.evidence_summary.cross_verified,
        issuerKeyId: issuerKey.keyId,
        isPublic,
        expiresAt: new Date(certificate.expires_at),
        claims: {
          create: attestationRecords.map((ar) => ({
            attestationId: ar.id,
          })),
        },
      },
    });

    safeLog("Certificate issued via API", {
      certificateId: certificate.certificate_id,
      claims: String(certificate.claims.length),
    });

    return NextResponse.json({
      certificate,
      verification_url: "https://caelex.eu/api/v1/verity/certificate/verify",
      ...(failed.length > 0 ? { failed_regulations: failed } : {}),
    });
  } catch (error) {
    safeLog("Certificate issuance failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to issue certificate" },
      { status: 500 },
    );
  }
}
