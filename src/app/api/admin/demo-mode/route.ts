import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedDemoData } from "@/lib/demo/seed-demo.server";
import { cleanupDemoData } from "@/lib/demo/cleanup-demo.server";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!member) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "activate") {
      const result = await seedDemoData(member.organizationId, session.user.id);

      logger.info("Demo mode activated", {
        userId: session.user.id,
        organizationId: member.organizationId,
        created: result.created,
        duration: result.duration,
      });

      // Audit log
      await prisma.auditLog
        .create({
          data: {
            userId: session.user.id,
            action: "DEMO_MODE_ACTIVATED",
            entityType: "Organization",
            entityId: member.organizationId,
            description: `Demo mode activated — created ${Object.values(result.created).reduce((a, b) => a + b, 0)} records`,
          },
        })
        .catch(() => {});

      return NextResponse.json({ action: "activated", result });
    }

    if (action === "deactivate") {
      const result = await cleanupDemoData(member.organizationId);

      logger.info("Demo mode deactivated", {
        userId: session.user.id,
        organizationId: member.organizationId,
        deleted: result.deleted,
        duration: result.duration,
      });

      await prisma.auditLog
        .create({
          data: {
            userId: session.user.id,
            action: "DEMO_MODE_DEACTIVATED",
            entityType: "Organization",
            entityId: member.organizationId,
            description: `Demo mode deactivated — deleted ${Object.values(result.deleted).reduce((a, b) => a + b, 0)} records`,
          },
        })
        .catch(() => {});

      return NextResponse.json({ action: "deactivated", result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Demo mode error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// GET — check demo mode status
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const member = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!member) {
      return NextResponse.json({ active: false });
    }

    // Check if demo data exists
    const demoSpacecraft = await prisma.spacecraft.count({
      where: {
        organizationId: member.organizationId,
        name: { startsWith: "[DEMO]" },
      },
    });

    return NextResponse.json({
      active: demoSpacecraft > 0,
      demoRecords: demoSpacecraft,
    });
  } catch {
    return NextResponse.json({ active: false });
  }
}
