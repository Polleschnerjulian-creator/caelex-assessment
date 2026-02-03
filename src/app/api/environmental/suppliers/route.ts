import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  generateSupplierDataRequests,
  type MissionProfile,
  type LaunchVehicleId,
  type PropellantType,
} from "@/data/environmental-requirements";

// GET /api/environmental/suppliers - Get supplier requests for an assessment
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const assessment = await prisma.environmentalAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
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

    return NextResponse.json({ suppliers: assessment.supplierRequests });
  } catch (error) {
    console.error("Error fetching supplier requests:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/environmental/suppliers - Create supplier data requests
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      assessmentId,
      generateDefaults,
      supplierName,
      componentType,
      dataRequired,
      deadline,
    } = body;

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId is required" },
        { status: 400 },
      );
    }

    // Verify assessment ownership
    const assessment = await prisma.environmentalAssessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    const { ipAddress, userAgent } = getRequestContext(request);

    if (generateDefaults) {
      // Generate default supplier requests based on mission profile
      const missionProfile: MissionProfile = {
        missionName: assessment.missionName || "Mission",
        operatorType: assessment.operatorType as
          | "spacecraft"
          | "launch"
          | "launch_site",
        missionType: assessment.missionType as
          | "commercial"
          | "research"
          | "government"
          | "educational",
        spacecraftMassKg: assessment.spacecraftMassKg,
        spacecraftCount: assessment.spacecraftCount,
        orbitType: assessment.orbitType as any,
        missionDurationYears: assessment.missionDurationYears,
        launchVehicle: assessment.launchVehicle as LaunchVehicleId,
        launchSharePercent: assessment.launchSharePercent,
        launchSiteCountry: assessment.launchSiteCountry || "",
        spacecraftPropellant: assessment.spacecraftPropellant as
          | PropellantType
          | undefined,
        propellantMassKg: assessment.propellantMassKg || undefined,
        groundStationCount: assessment.groundStationCount,
        dailyContactHours: assessment.dailyContactHours,
        deorbitStrategy: assessment.deorbitStrategy as any,
        isSmallEnterprise: assessment.isSmallEnterprise,
        isResearchEducation: assessment.isResearchEducation,
      };

      const defaultRequests = generateSupplierDataRequests(missionProfile);

      // Create supplier requests
      const created = await Promise.all(
        defaultRequests.map((req) =>
          prisma.supplierDataRequest.create({
            data: {
              assessmentId,
              supplierName: req.supplierName,
              componentType: req.componentType,
              dataRequired: JSON.stringify(req.dataRequired),
              status: "pending",
              deadline: req.deadline,
            },
          }),
        ),
      );

      // Log audit event
      await logAuditEvent({
        userId,
        action: "supplier_request_created",
        entityType: "supplier_request",
        entityId: assessmentId,
        newValue: { count: created.length, generated: true },
        description: `Generated ${created.length} default supplier data requests`,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ suppliers: created }, { status: 201 });
    } else {
      // Create single supplier request
      if (!supplierName || !componentType || !dataRequired) {
        return NextResponse.json(
          {
            error: "supplierName, componentType, and dataRequired are required",
          },
          { status: 400 },
        );
      }

      const supplier = await prisma.supplierDataRequest.create({
        data: {
          assessmentId,
          supplierName,
          componentType,
          dataRequired: JSON.stringify(dataRequired),
          status: "pending",
          deadline: deadline ? new Date(deadline) : null,
        },
      });

      // Log audit event
      await logAuditEvent({
        userId,
        action: "supplier_request_created",
        entityType: "supplier_request",
        entityId: supplier.id,
        newValue: { supplierName, componentType },
        description: `Created supplier data request for ${supplierName}`,
        ipAddress,
        userAgent,
      });

      return NextResponse.json({ supplier }, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating supplier request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PATCH /api/environmental/suppliers - Update supplier request
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      supplierId,
      status,
      supplierName,
      supplierEmail,
      responseData,
      notes,
    } = body;

    if (!supplierId) {
      return NextResponse.json(
        { error: "supplierId is required" },
        { status: 400 },
      );
    }

    // Get supplier request and verify ownership through assessment
    const existing = await prisma.supplierDataRequest.findUnique({
      where: { id: supplierId },
      include: {
        assessment: {
          select: { userId: true },
        },
      },
    });

    if (!existing || existing.assessment.userId !== userId) {
      return NextResponse.json(
        { error: "Supplier request not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === "sent" && !existing.sentAt) {
        updateData.sentAt = new Date();
      }
      if (status === "received" && !existing.receivedAt) {
        updateData.receivedAt = new Date();
      }
    }
    if (supplierName !== undefined) updateData.supplierName = supplierName;
    if (supplierEmail !== undefined) updateData.supplierEmail = supplierEmail;
    if (responseData !== undefined)
      updateData.responseData = JSON.stringify(responseData);
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.supplierDataRequest.update({
      where: { id: supplierId },
      data: updateData,
    });

    // Log audit event for status changes
    if (status && status !== existing.status) {
      const { ipAddress, userAgent } = getRequestContext(request);

      const action =
        status === "sent"
          ? "supplier_request_sent"
          : status === "received"
            ? "supplier_data_received"
            : "supplier_request_created";

      await logAuditEvent({
        userId,
        action,
        entityType: "supplier_request",
        entityId: supplierId,
        previousValue: { status: existing.status },
        newValue: { status },
        description: `Updated supplier request status to ${status}`,
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({ supplier: updated });
  } catch (error) {
    console.error("Error updating supplier request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/environmental/suppliers - Delete supplier request
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    if (!supplierId) {
      return NextResponse.json(
        { error: "supplierId is required" },
        { status: 400 },
      );
    }

    // Get supplier request and verify ownership through assessment
    const existing = await prisma.supplierDataRequest.findUnique({
      where: { id: supplierId },
      include: {
        assessment: {
          select: { userId: true },
        },
      },
    });

    if (!existing || existing.assessment.userId !== userId) {
      return NextResponse.json(
        { error: "Supplier request not found" },
        { status: 404 },
      );
    }

    await prisma.supplierDataRequest.delete({
      where: { id: supplierId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting supplier request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
