/**
 * Export Registrations for UNOOSA
 * GET - Export registrations as CSV
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exportForUNOOSA } from "@/lib/services/registration-service";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user has access to organization
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: session.user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const csvContent = await exportForUNOOSA(organizationId);

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "registration_export",
        entityType: "registration",
        entityId: organizationId,
        description: "Exported registrations for UNOOSA submission",
      },
    });

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="urso-registrations-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting registrations:", error);
    return NextResponse.json(
      { error: "Failed to export registrations" },
      { status: 500 },
    );
  }
}
