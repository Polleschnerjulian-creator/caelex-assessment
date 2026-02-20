/**
 * Attestation Revocation API
 * POST - Revoke a compliance attestation
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, getPermissionsForRole } from "@/lib/permissions";
import { revokeAttestation } from "@/lib/services/attestation";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { organizationId, reason } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
        { status: 400 },
      );
    }

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "A reason is required to revoke an attestation" },
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
    if (!hasPermission(perms, "network:manage")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const attestation = await revokeAttestation(
      id,
      organizationId,
      reason.trim(),
      session.user.id,
    );

    return NextResponse.json({ success: true, attestation });
  } catch (error) {
    console.error("Failed to revoke attestation:", error);
    return NextResponse.json(
      { error: "Failed to revoke attestation" },
      { status: 500 },
    );
  }
}
