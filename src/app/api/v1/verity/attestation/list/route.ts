import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";

/**
 * GET /api/v1/verity/attestation/list
 * Lists all attestations for the current user's organization.
 * Auth: Session
 */

type AttestationStatus = "VALID" | "EXPIRED" | "REVOKED";

function getAttestationStatus(
  expiresAt: Date,
  revokedAt: Date | null,
): AttestationStatus {
  if (revokedAt) return "REVOKED";
  if (expiresAt < new Date()) return "EXPIRED";
  return "VALID";
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 403 },
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const regulationFilter = searchParams.get("regulation");
    const statusFilter = searchParams.get("status") as AttestationStatus | null;
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? "50", 10),
      200,
    );
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Find all org members to get attestations across the org
    const orgMembers = await prisma.organizationMember.findMany({
      where: { organizationId: membership.organizationId },
      select: { userId: true },
    });
    const orgUserIds = orgMembers.map((m) => m.userId);

    // Build where clause
    const where: Record<string, unknown> = {
      operatorId: { in: orgUserIds },
    };
    if (regulationFilter) {
      where.regulationRef = regulationFilter;
    }

    // Fetch attestations
    const [attestations, total] = await Promise.all([
      prisma.verityAttestation.findMany({
        where,
        orderBy: { issuedAt: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          attestationId: true,
          operatorId: true,
          satelliteNorad: true,
          regulationRef: true,
          dataPoint: true,
          result: true,
          claimStatement: true,
          evidenceSource: true,
          trustScore: true,
          trustLevel: true,
          issuedAt: true,
          expiresAt: true,
          revokedAt: true,
          revokedReason: true,
          description: true,
          entityId: true,
        },
      }),
      prisma.verityAttestation.count({ where }),
    ]);

    // Map to response format with status
    const items = attestations
      .map((a) => {
        const status = getAttestationStatus(a.expiresAt, a.revokedAt);
        return {
          id: a.id,
          attestationId: a.attestationId,
          operatorId: a.operatorId,
          satelliteNorad: a.satelliteNorad,
          regulationRef: a.regulationRef,
          dataPoint: a.dataPoint,
          result: a.result,
          claimStatement: a.claimStatement,
          evidenceSource: a.evidenceSource,
          trustLevel: a.trustLevel,
          status,
          issuedAt: a.issuedAt.toISOString(),
          expiresAt: a.expiresAt.toISOString(),
          revokedAt: a.revokedAt?.toISOString() ?? null,
          revokedReason: a.revokedReason,
          description: a.description,
          entityId: a.entityId,
          isManual: a.evidenceSource === "manual",
          verifyUrl: `https://www.caelex.eu/verity/verify?id=${a.attestationId}`,
        };
      })
      .filter((a) => !statusFilter || a.status === statusFilter);

    return NextResponse.json({
      items,
      total,
      limit,
      offset,
    });
  } catch (error) {
    safeLog("Attestation list failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to list attestations" },
      { status: 500 },
    );
  }
}
