/**
 * Individual Attestation API
 * GET - Get attestation detail with verification status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { getAttestation, verifyAttestation } from "@/lib/services/attestation";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    // Verify membership and permissions
    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id, organizationId },
      select: { role: true, permissions: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 },
      );
    }

    const perms =
      member.permissions.length > 0
        ? member.permissions
        : getPermissionsForRole(member.role);
    if (!hasPermission(perms, "network:read")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const attestation = await getAttestation(id, organizationId);

    if (!attestation) {
      return NextResponse.json(
        { error: "Attestation not found" },
        { status: 404 },
      );
    }

    // Include verification status
    const verification = await verifyAttestation(id);

    return NextResponse.json({
      attestation,
      verification: {
        valid: verification.valid,
        hashValid:
          "hashValid" in verification ? verification.hashValid : undefined,
        chainValid:
          "chainValid" in verification ? verification.chainValid : undefined,
        error: "error" in verification ? verification.error : undefined,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch attestation", error);
    return NextResponse.json(
      { error: "Failed to fetch attestation" },
      { status: 500 },
    );
  }
}
