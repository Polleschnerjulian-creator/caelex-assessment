import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

// GET /api/environmental/[assessmentId] - Get assessment details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    const assessment = await prisma.environmentalAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        impactResults: {
          orderBy: { phase: "asc" },
        },
        supplierRequests: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ assessment });
  } catch (error) {
    console.error("Error fetching environmental assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/environmental/[assessmentId] - Update assessment
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;
    const body = await request.json();

    const patchSchema = z.object({
      assessmentName: z.string().optional(),
      status: z.string().optional(),
      missionName: z.string().optional(),
      operatorType: z.enum(["spacecraft", "launch", "launch_site"]).optional(),
      missionType: z
        .enum(["commercial", "research", "government", "educational"])
        .optional(),
      spacecraftMassKg: z.number().optional(),
      spacecraftCount: z.number().optional(),
      orbitType: z
        .enum(["LEO", "MEO", "GEO", "HEO", "cislunar", "deep_space"])
        .optional(),
      altitudeKm: z.number().optional(),
      missionDurationYears: z.number().optional(),
      launchVehicle: z.string().optional(),
      launchSharePercent: z.number().optional(),
      launchSiteCountry: z.string().optional(),
      spacecraftPropellant: z.string().optional(),
      propellantMassKg: z.number().optional(),
      groundStationCount: z.number().optional(),
      dailyContactHours: z.number().optional(),
      deorbitStrategy: z
        .enum([
          "controlled_deorbit",
          "passive_decay",
          "graveyard_orbit",
          "retrieval",
        ])
        .optional(),
      isSmallEnterprise: z.boolean().optional(),
      isResearchEducation: z.boolean().optional(),
    });

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify ownership
    const existing = await prisma.environmentalAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Build update data from validated fields
    const updateData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    const updated = await prisma.environmentalAssessment.update({
      where: { id: assessmentId },
      data: updateData,
      include: {
        impactResults: true,
        supplierRequests: true,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "environmental_assessment_updated",
      entityType: "environmental_assessment",
      entityId: assessmentId,
      previousValue: existing,
      newValue: parsed.data,
      description: "Updated environmental assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error("Error updating environmental assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/environmental/[assessmentId] - Delete assessment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    // Verify ownership
    const existing = await prisma.environmentalAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete (cascades to impact results and supplier requests)
    await prisma.environmentalAssessment.delete({
      where: { id: assessmentId },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "environmental_assessment_deleted",
      entityType: "environmental_assessment",
      entityId: assessmentId,
      previousValue: { deleted: true, assessmentName: existing.assessmentName },
      description: "Deleted environmental assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting environmental assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
