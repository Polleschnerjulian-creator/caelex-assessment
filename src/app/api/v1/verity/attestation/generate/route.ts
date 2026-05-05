import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { evaluateAndAttest } from "@/lib/verity/evaluation/threshold-evaluator";
import { findThreshold } from "@/lib/verity/evaluation/regulation-thresholds";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * POST /api/v1/verity/attestation/generate
 * Generates a signed threshold attestation.
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
      regulation_ref,
      satellite_norad_id,
      expires_in_days = 90,
      // T3-1 (audit fix 2026-05-05): optional Phase-2 crypto opt-in.
      // "v1" (default; SHA-256), "v2" (Pedersen + Schnorr PoK), or "v3"
      // (Pedersen + zero-knowledge range proof). Falls back to the
      // server-wide VERITY_CRYPTO_VERSION env var when unset. Existing
      // integrators see no behaviour change unless they explicitly
      // opt in or until ops flips the env var per the migration plan
      // in docs/VERITY-AUDIT-FIX-PLAN.md (T3-4).
      commitment_scheme,
      range_encoding,
    } = body;

    if (!regulation_ref) {
      return NextResponse.json(
        { error: "regulation_ref is required" },
        { status: 400 },
      );
    }

    // Validate the optional commitment_scheme — narrow the input so we
    // never pass garbage to the threshold evaluator.
    if (
      commitment_scheme !== undefined &&
      commitment_scheme !== "v1" &&
      commitment_scheme !== "v2" &&
      commitment_scheme !== "v3"
    ) {
      return NextResponse.json(
        {
          error: "Invalid commitment_scheme — must be 'v1', 'v2', or 'v3'",
        },
        { status: 400 },
      );
    }

    // Validate regulation exists
    const threshold = findThreshold(regulation_ref);
    if (!threshold) {
      return NextResponse.json(
        { error: "Unknown regulation reference" },
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

    // Generate attestation
    const attestation = await evaluateAndAttest(prisma, {
      operatorId: session.user.id,
      satelliteNorad: satellite_norad_id ?? null,
      satelliteName,
      regulationRef: regulation_ref,
      expiresInDays: expires_in_days,
      // T3-1: pass-through to threshold evaluator → generateAttestation.
      // resolveCommitmentScheme() handles undefined → env-default fallback.
      commitment_scheme,
      range_encoding,
    });

    if (!attestation) {
      return NextResponse.json(
        { error: "No evidence available for this regulation" },
        { status: 400 },
      );
    }

    safeLog("Attestation generated via API", {
      attestationId: attestation.attestation_id,
      userId: session.user.id,
    });

    return NextResponse.json({
      attestation,
      verification_url:
        "https://www.caelex.eu/api/v1/verity/attestation/verify",
    });
  } catch (error) {
    safeLog("Attestation generation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to generate attestation" },
      { status: 500 },
    );
  }
}
