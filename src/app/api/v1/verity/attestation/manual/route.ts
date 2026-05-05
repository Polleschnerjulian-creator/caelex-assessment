import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAttestation } from "@/lib/verity/core/attestation";
import { getActiveIssuerKey } from "@/lib/verity/keys/issuer-keys";
import { resolveCommitmentScheme } from "@/lib/verity/feature-flags";
import { safeLog } from "@/lib/verity/utils/redaction";
import { appendToLog } from "@/lib/verity/transparency/log-store";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/**
 * POST /api/v1/verity/attestation/manual
 * Creates a manual (user-declared) attestation with trust_level: LOW.
 * Auth: Session
 */

const ManualAttestationSchema = z.object({
  regulation_ref: z.string().min(1),
  regulation_name: z.string().min(1),
  claim_statement: z.string().min(1).max(500),
  description: z.string().max(1000).optional(),
  entity_id: z.string().optional(),
  satellite_norad_id: z.string().optional(),
  expires_in_days: z.number().int().min(1).max(365).default(90),
  threshold_type: z.enum(["ABOVE", "BELOW"]).default("ABOVE"),
  threshold_value: z.number().default(1),
  // T3-1 (audit fix 2026-05-05): Phase-2 crypto opt-in. Default
  // resolves via the VERITY_CRYPTO_VERSION env var (currently "v1").
  // Manual attestations are LOW-trust by definition (self-declared),
  // but the commitment scheme they use is the same as auto-attested
  // ones — this keeps the verifier path uniform across sources.
  commitment_scheme: z.enum(["v1", "v2", "v3"]).optional(),
  range_encoding: z
    .object({
      scale: z.number().int().positive(),
      bits: z.number().int().min(1).max(52),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ManualAttestationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      regulation_ref,
      regulation_name,
      claim_statement,
      description,
      entity_id,
      satellite_norad_id,
      expires_in_days,
      threshold_type,
      threshold_value,
      commitment_scheme,
      range_encoding,
    } = parsed.data;

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

    // T5-11 (audit fix 2026-05-05): VIEWER role is read-only by
    // policy. Manual attestations create persistent compliance
    // claims attributable to the organization, so they require at
    // least MEMBER write access. Without this check a VIEWER could
    // self-issue LOW-trust attestations against the org's name.
    if (membership.role === "VIEWER") {
      return NextResponse.json(
        { error: "VIEWER role cannot issue attestations" },
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

    // Get issuer key
    const issuerKey = await getActiveIssuerKey(prisma);

    // Manual attestations use a self-declared commitment
    // The "actual_value" is 1 (declared compliant), threshold is 1
    // This produces result: true with a commitment hash binding to these values
    const attestation = generateAttestation({
      regulation_ref,
      regulation_name,
      threshold_type,
      threshold_value,
      actual_value: 1, // Self-declared: "I meet this requirement"
      data_point: "manual_declaration",
      claim_statement,
      subject: {
        operator_id: session.user.id,
        satellite_norad_id: satellite_norad_id ?? null,
        satellite_name: satelliteName,
      },
      evidence_source: "manual",
      trust_score: 0.6, // LOW trust level (0.50–0.69)
      collected_at: new Date().toISOString(),
      sentinel_anchor: null,
      cross_verification: null,
      issuer_key_id: issuerKey.keyId,
      issuer_private_key_der: issuerKey.privateKeyDer,
      issuer_public_key_hex: issuerKey.publicKeyHex,
      expires_in_days,
      // T3-1: route caller's choice → resolveCommitmentScheme → server
      // default (VERITY_CRYPTO_VERSION). Manual attestations are
      // self-declared (LOW trust) but the commitment scheme is the
      // same as auto-attested ones for verifier-path uniformity.
      commitment_scheme: resolveCommitmentScheme(commitment_scheme),
      range_encoding,
    });

    // Generate encryption of the commitment secret for manual attestations
    // Since manual has no real secret, we hash a marker
    const manualSecretHash = createHash("sha256")
      .update(
        `manual:${attestation.attestation_id}:${randomBytes(16).toString("hex")}`,
      )
      .digest("hex");

    // Store in database
    await prisma.verityAttestation.create({
      data: {
        attestationId: attestation.attestation_id,
        operatorId: session.user.id,
        // T5-3 (audit fix 2026-05-05): every other attestation-create
        // path (threshold-evaluator, auto-attestation) writes
        // organizationId — manual was the only one missing it. Without
        // it, list/revoke/visibility queries that filter by
        // organizationId silently dropped manual attestations from the
        // org's view, breaking T4-1's planned NOT NULL migration.
        organizationId: membership.organizationId,
        satelliteNorad: satellite_norad_id ?? null,
        regulationRef: regulation_ref,
        dataPoint: "manual_declaration",
        thresholdType: threshold_type,
        thresholdValue: threshold_value,
        result: true,
        claimStatement: claim_statement,
        valueCommitment: attestation.evidence.value_commitment,
        evidenceSource: "manual",
        trustScore: 0.6,
        trustLevel: "LOW",
        collectedAt: new Date(),
        issuerKeyId: issuerKey.keyId,
        issuerPublicKey: issuerKey.publicKeyHex,
        signature: attestation.signature,
        fullAttestation: structuredClone(attestation),
        encryptedSecret: manualSecretHash,
        issuedAt: new Date(attestation.issued_at),
        expiresAt: new Date(attestation.expires_at),
        // Manual-specific fields
        description,
        entityId: entity_id,
      },
    });

    safeLog("Manual attestation created", {
      attestationId: attestation.attestation_id,
      userId: session.user.id,
      regulationRef: regulation_ref,
    });

    // Append to Merkle transparency log (idempotent).
    try {
      await appendToLog(
        prisma,
        attestation as unknown as Record<string, unknown>,
      );
    } catch (err) {
      safeLog("Transparency log append failed — will be retried by backfill", {
        attestationId: attestation.attestation_id,
        error: String(err),
      });
    }

    return NextResponse.json({
      attestation,
      verification_url:
        "https://www.caelex.eu/api/v1/verity/attestation/verify",
    });
  } catch (error) {
    safeLog("Manual attestation creation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to create manual attestation" },
      { status: 500 },
    );
  }
}
