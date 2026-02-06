import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/supplier/[token]
 *
 * Get supplier request configuration.
 * This endpoint is PUBLIC - no authentication required.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    // Rate limiting for public endpoint
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("supplier", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { token } = await params;

    // Find and validate token
    const portalToken = await prisma.supplierPortalToken.findUnique({
      where: { token },
      include: {
        request: {
          include: {
            assessment: {
              select: {
                missionName: true,
                operatorType: true,
                spacecraftMassKg: true,
              },
            },
          },
        },
      },
    });

    if (!portalToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (portalToken.isRevoked) {
      return NextResponse.json(
        { error: "Token has been revoked" },
        { status: 403 },
      );
    }

    if (new Date() > portalToken.expiresAt) {
      return NextResponse.json({ error: "Token has expired" }, { status: 410 });
    }

    // Parse data required
    let dataRequired: string[] = [];
    try {
      dataRequired = JSON.parse(portalToken.request.dataRequired);
    } catch {
      dataRequired = [];
    }

    return NextResponse.json({
      request: {
        id: portalToken.request.id,
        supplierName: portalToken.request.supplierName,
        componentType: portalToken.request.componentType,
        dataRequired,
        notes: portalToken.request.notes,
        deadline: portalToken.request.deadline?.toISOString(),
        status: portalToken.request.status,
      },
      assessment: {
        missionName: portalToken.request.assessment.missionName,
        operatorType: portalToken.request.assessment.operatorType,
        spacecraftMassKg: portalToken.request.assessment.spacecraftMassKg,
      },
      tokenInfo: {
        expiresAt: portalToken.expiresAt.toISOString(),
        isCompleted: !!portalToken.completedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching supplier config:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/supplier/[token]
 *
 * Submit supplier environmental data.
 * This endpoint is PUBLIC - no authentication required.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    // Rate limiting for public endpoint
    const identifier = getIdentifier(request);
    const rateLimitResult = await checkRateLimit("supplier", identifier);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { token } = await params;
    const body = await request.json();

    // Find and validate token
    const portalToken = await prisma.supplierPortalToken.findUnique({
      where: { token },
      include: {
        request: {
          include: {
            assessment: {
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!portalToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 404 });
    }

    if (portalToken.isRevoked) {
      return NextResponse.json(
        { error: "Token has been revoked" },
        { status: 403 },
      );
    }

    if (new Date() > portalToken.expiresAt) {
      return NextResponse.json({ error: "Token has expired" }, { status: 410 });
    }

    if (portalToken.completedAt) {
      return NextResponse.json(
        { error: "Data has already been submitted for this request" },
        { status: 409 },
      );
    }

    // Validate submission data
    const { componentType, lcaData, submittedAt } = body;

    if (!lcaData) {
      return NextResponse.json(
        { error: "Missing LCA data in submission" },
        { status: 400 },
      );
    }

    // Update supplier data request with response
    const updatedRequest = await prisma.supplierDataRequest.update({
      where: { id: portalToken.requestId },
      data: {
        status: "received",
        receivedAt: new Date(),
        responseData: JSON.stringify({
          componentType,
          lcaData,
          submittedAt,
          tokenId: portalToken.id,
        }),
      },
    });

    // Mark token as completed
    await prisma.supplierPortalToken.update({
      where: { id: portalToken.id },
      data: {
        completedAt: new Date(),
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0] ||
          request.headers.get("x-real-ip") ||
          portalToken.ipAddress,
        userAgent: request.headers.get("user-agent") || portalToken.userAgent,
      },
    });

    // Log audit event for the assessment owner
    const userId = portalToken.request.assessment.userId;
    await logAuditEvent({
      userId,
      action: "supplier_data_received",
      entityType: "supplier_request",
      entityId: portalToken.requestId,
      newValue: {
        supplierName: portalToken.request.supplierName,
        componentType: portalToken.request.componentType,
        hasLCAData: true,
      },
      description: `Supplier data received from ${portalToken.request.supplierName} for ${portalToken.request.componentType}`,
    });

    return NextResponse.json({
      success: true,
      message: "Data submitted successfully",
      request: {
        id: updatedRequest.id,
        status: updatedRequest.status,
        receivedAt: updatedRequest.receivedAt?.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error submitting supplier data:", error);
    return NextResponse.json(
      { error: "Failed to submit data" },
      { status: 500 },
    );
  }
}
