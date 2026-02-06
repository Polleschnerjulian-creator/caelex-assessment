import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendSupplierOutreach, createSupplierRequest } from "@/lib/services";
import { logAuditEvent, getRequestContext } from "@/lib/audit";

/**
 * POST /api/environmental/suppliers/outreach
 *
 * Send a data request to a supplier. Can either:
 * 1. Send to an existing supplier request (requestId)
 * 2. Create a new supplier request and send (assessmentId + supplier details)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      requestId,
      assessmentId,
      supplierName,
      supplierEmail,
      componentType,
      dataRequired,
      notes,
      deadline,
      expirationDays,
    } = body;

    let targetRequestId = requestId;

    // If no requestId provided, create a new supplier request
    if (!targetRequestId) {
      if (!assessmentId || !supplierName || !componentType) {
        return NextResponse.json(
          {
            error:
              "Either requestId OR (assessmentId, supplierName, componentType) required",
          },
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

      // Create the supplier request
      const createResult = await createSupplierRequest({
        assessmentId,
        supplierName,
        supplierEmail,
        componentType,
        dataRequired: dataRequired || [
          "Manufacturing energy consumption",
          "Raw material composition",
          "Transport distance and mode",
        ],
        notes,
        deadline: deadline ? new Date(deadline) : undefined,
      });

      if (!createResult.success) {
        return NextResponse.json(
          { error: createResult.error || "Failed to create supplier request" },
          { status: 500 },
        );
      }

      targetRequestId = createResult.requestId;
    } else {
      // Verify request ownership (through assessment)
      const existingRequest = await prisma.supplierDataRequest.findUnique({
        where: { id: targetRequestId },
        include: {
          assessment: {
            select: { userId: true },
          },
        },
      });

      if (!existingRequest || existingRequest.assessment.userId !== userId) {
        return NextResponse.json(
          { error: "Supplier request not found" },
          { status: 404 },
        );
      }
    }

    // Send the outreach
    const result = await sendSupplierOutreach({
      requestId: targetRequestId!,
      expirationDays,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send outreach" },
        { status: 500 },
      );
    }

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "supplier_outreach_sent",
      entityType: "supplier_request",
      entityId: targetRequestId!,
      newValue: {
        portalUrl: result.portalUrl,
        emailSent: result.emailSent,
      },
      description: `Supplier data request sent to ${supplierName || "supplier"}`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      requestId: targetRequestId,
      tokenId: result.tokenId,
      portalUrl: result.portalUrl,
      emailSent: result.emailSent,
    });
  } catch (error) {
    console.error("Outreach error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/environmental/suppliers/outreach
 *
 * Get outreach status for an assessment
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    const assessmentId = url.searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId required" },
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

    // Get all supplier requests with their tokens
    const requests = await prisma.supplierDataRequest.findMany({
      where: { assessmentId },
      include: {
        portalTokens: {
          where: {
            isRevoked: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const now = new Date();

    return NextResponse.json({
      assessmentId,
      totalRequests: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      sent: requests.filter((r) => r.status === "sent").length,
      received: requests.filter((r) => r.status === "received").length,
      overdue: requests.filter(
        (r) => r.status === "sent" && r.deadline && new Date(r.deadline) < now,
      ).length,
      requests: requests.map((r) => ({
        id: r.id,
        supplierName: r.supplierName,
        supplierEmail: r.supplierEmail,
        componentType: r.componentType,
        status: r.status,
        sentAt: r.sentAt?.toISOString(),
        receivedAt: r.receivedAt?.toISOString(),
        deadline: r.deadline?.toISOString(),
        hasActiveToken: r.portalTokens.length > 0,
        tokenExpiresAt: r.portalTokens[0]?.expiresAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get outreach status error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
