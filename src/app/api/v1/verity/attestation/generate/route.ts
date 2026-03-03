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
    const { regulation_ref, satellite_norad_id, expires_in_days = 90 } = body;

    if (!regulation_ref) {
      return NextResponse.json(
        { error: "regulation_ref is required" },
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
      verification_url: "https://caelex.eu/api/v1/verity/attestation/verify",
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
