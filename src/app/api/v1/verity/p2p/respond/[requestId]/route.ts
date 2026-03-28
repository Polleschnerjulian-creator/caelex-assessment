import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/v1/verity/p2p/respond/[requestId]
 * Allows the target organisation to approve or decline an incoming
 * peer-to-peer verification request.
 * Auth: Session required — caller must belong to the request's targetOrgId.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  try {
    const { requestId } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve caller's organisation
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organisation found for this user" },
        { status: 403 },
      );
    }

    const callerOrgId = membership.organizationId;

    // Fetch the request
    const p2pRequest = await prisma.verityP2PRequest.findFirst({
      where: { requestId },
    });

    if (!p2pRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    // Only the target org may respond
    if (p2pRequest.targetOrgId !== callerOrgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (p2pRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Request has already been responded to" },
        { status: 409 },
      );
    }

    if (p2pRequest.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Request has expired" },
        { status: 410 },
      );
    }

    const body = (await request.json()) as {
      status: "APPROVED" | "DECLINED";
      message?: string;
      attestationIds?: string[];
    };

    const { status, message, attestationIds } = body;

    if (!status || !["APPROVED", "DECLINED"].includes(status)) {
      return NextResponse.json(
        { error: 'status must be "APPROVED" or "DECLINED"' },
        { status: 400 },
      );
    }

    let validatedAttestationIds: string[] = [];

    if (status === "APPROVED" && attestationIds?.length) {
      // Validate that all provided attestationIds belong to the target org
      const owned = await prisma.verityAttestation.findMany({
        where: {
          attestationId: { in: attestationIds },
          organizationId: callerOrgId,
          revokedAt: null,
        },
        select: { attestationId: true },
      });

      const ownedIds = new Set(owned.map((a) => a.attestationId));
      const invalid = attestationIds.filter((id) => !ownedIds.has(id));

      if (invalid.length > 0) {
        return NextResponse.json(
          {
            error:
              "One or more attestationIds are invalid or not owned by your organisation",
            invalid,
          },
          { status: 400 },
        );
      }

      validatedAttestationIds = attestationIds;
    }

    const updated = await prisma.verityP2PRequest.update({
      where: { requestId },
      data: {
        status,
        responseAt: new Date(),
        responseMessage: message ?? null,
        attestationIds: validatedAttestationIds,
      },
    });

    return NextResponse.json({
      requestId: updated.requestId,
      status: updated.status,
      responseAt: updated.responseAt?.toISOString(),
      responseMessage: updated.responseMessage,
      attestationIds: updated.attestationIds,
    });
  } catch (error) {
    logger.error("[p2p/respond/[requestId]]", error);
    return NextResponse.json(
      { error: "Failed to respond to verification request" },
      { status: 500 },
    );
  }
}
