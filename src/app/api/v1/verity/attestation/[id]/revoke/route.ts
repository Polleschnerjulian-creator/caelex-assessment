import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeLog } from "@/lib/verity/utils/redaction";
import { z } from "zod";

/**
 * PATCH /api/v1/verity/attestation/[id]/revoke
 * Revokes an attestation with a reason.
 * Auth: Session (must be in same org)
 */

const RevokeSchema = z.object({
  reason: z.string().min(1).max(500),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = RevokeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Find the attestation
    const attestation = await prisma.verityAttestation.findUnique({
      where: { id },
      select: {
        id: true,
        attestationId: true,
        operatorId: true,
        revokedAt: true,
      },
    });

    if (!attestation) {
      return NextResponse.json(
        { error: "Attestation not found" },
        { status: 404 },
      );
    }

    if (attestation.revokedAt) {
      return NextResponse.json(
        { error: "Attestation already revoked" },
        { status: 400 },
      );
    }

    // Verify user is in the same organization as the attestation creator
    const userMembership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    const attestationOwnerMembership =
      await prisma.organizationMember.findFirst({
        where: { userId: attestation.operatorId },
        select: { organizationId: true },
      });

    if (
      !userMembership ||
      !attestationOwnerMembership ||
      userMembership.organizationId !==
        attestationOwnerMembership.organizationId
    ) {
      return NextResponse.json(
        { error: "Not authorized to revoke this attestation" },
        { status: 403 },
      );
    }

    // Revoke
    const updated = await prisma.verityAttestation.update({
      where: { id },
      data: {
        revokedAt: new Date(),
        revokedReason: parsed.data.reason,
      },
      select: {
        id: true,
        attestationId: true,
        revokedAt: true,
        revokedReason: true,
      },
    });

    safeLog("Attestation revoked", {
      attestationId: attestation.attestationId,
      userId: session.user.id,
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      success: true,
      attestationId: updated.attestationId,
      revokedAt: updated.revokedAt?.toISOString(),
      revokedReason: updated.revokedReason,
    });
  } catch (error) {
    safeLog("Attestation revocation failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Failed to revoke attestation" },
      { status: 500 },
    );
  }
}
