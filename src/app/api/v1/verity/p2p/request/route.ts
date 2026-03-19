import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildVerificationRequest } from "@/lib/verity/p2p/request-builder";

/**
 * POST /api/v1/verity/p2p/request
 * Creates a peer-to-peer verification request targeting another organisation.
 * Auth: Session required.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as {
      targetOrgId: string;
      targetNoradId?: string;
      regulationRefs: string[];
      purpose: string;
      message?: string;
    };

    const { targetOrgId, targetNoradId, regulationRefs, purpose, message } =
      body;

    if (!targetOrgId || !regulationRefs?.length || !purpose) {
      return NextResponse.json(
        { error: "targetOrgId, regulationRefs, and purpose are required" },
        { status: 400 },
      );
    }

    // Resolve requester's organisation
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

    const requesterOrgId = membership.organizationId;

    if (requesterOrgId === targetOrgId) {
      return NextResponse.json(
        {
          error: "Cannot send a verification request to your own organisation",
        },
        { status: 400 },
      );
    }

    const requesterName =
      session.user.name ?? session.user.email ?? "Unknown operator";
    const requesterEmail = session.user.email ?? undefined;

    const { requestId, expiresAt } = buildVerificationRequest({
      requesterName,
      regulationRefs,
      purpose,
      message,
    });

    await prisma.verityP2PRequest.create({
      data: {
        requestId,
        requesterOrgId,
        requesterName,
        requesterEmail,
        targetOrgId,
        targetNoradId: targetNoradId ?? null,
        regulationRefs,
        purpose,
        message: message ?? null,
        status: "PENDING",
        expiresAt: new Date(expiresAt),
      },
    });

    return NextResponse.json({ requestId, status: "PENDING" }, { status: 201 });
  } catch (error) {
    console.error("[p2p/request]", error);
    return NextResponse.json(
      { error: "Failed to create verification request" },
      { status: 500 },
    );
  }
}
