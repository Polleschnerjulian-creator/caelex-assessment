/**
 * Stakeholder Attestation Detail API
 * GET - Return a single attestation if it belongs to the authenticated engagement
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  validateToken,
  logStakeholderAccess,
} from "@/lib/services/stakeholder-engagement";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      new URL(request.url).searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 401 });
    }

    const ipAddress =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      undefined;
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await validateToken(token, ipAddress);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    const engagement = result.engagement;

    // Fetch the attestation, ensuring it belongs to this engagement
    const attestation = await prisma.complianceAttestation.findFirst({
      where: {
        id,
        engagementId: engagement.id,
      },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!attestation) {
      return NextResponse.json(
        { error: "Attestation not found or not accessible" },
        { status: 404 },
      );
    }

    // Log access
    await logStakeholderAccess(engagement.id, "attestation_viewed", {
      entityType: "compliance_attestation",
      entityId: id,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ attestation });
  } catch (error) {
    logger.error("Stakeholder attestation detail error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
