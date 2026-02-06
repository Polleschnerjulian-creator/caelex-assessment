/**
 * Submit Registration to URSO API
 * POST - Submit registration for processing
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { submitToURSO } from "@/lib/services/registration-service";
import { getSafeErrorMessage } from "@/lib/validations";

export async function POST(
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
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user has access to organization with sufficient permissions
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
        role: { in: ["OWNER", "ADMIN", "MANAGER"] },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. Manager or higher role required." },
        { status: 403 },
      );
    }

    const result = await submitToURSO(id, organizationId, session.user.id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "registration_submitted",
        entityType: "registration",
        entityId: id,
        newValue: JSON.stringify({
          submittedAt: result.submittedAt,
          ncaReference: result.ncaReference,
        }),
        description: `Submitted URSO registration, NCA Reference: ${result.ncaReference}`,
      },
    });

    return NextResponse.json({
      success: true,
      submittedAt: result.submittedAt,
      ncaReference: result.ncaReference,
    });
  } catch (error) {
    console.error("Error submitting registration:", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to submit registration") },
      { status: 500 },
    );
  }
}
