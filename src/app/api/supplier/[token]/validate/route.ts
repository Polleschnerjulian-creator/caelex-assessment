import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/supplier/[token]/validate
 *
 * Validate a supplier portal token and return request details.
 * This endpoint is PUBLIC - no authentication required.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;

    // Find the token
    const portalToken = await prisma.supplierPortalToken.findUnique({
      where: { token },
      include: {
        request: {
          include: {
            assessment: {
              select: {
                missionName: true,
                userId: true,
                user: {
                  select: {
                    organization: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Token not found
    if (!portalToken) {
      return NextResponse.json({
        valid: false,
        error: "Invalid or unknown access token",
      });
    }

    // Token has been revoked
    if (portalToken.isRevoked) {
      return NextResponse.json({
        valid: false,
        revoked: true,
        error: "This access link has been revoked",
      });
    }

    // Token has expired
    if (new Date() > portalToken.expiresAt) {
      return NextResponse.json({
        valid: false,
        expired: true,
        error: "This access link has expired",
      });
    }

    // Token has already been completed
    if (portalToken.completedAt) {
      return NextResponse.json({
        valid: true,
        completed: true,
        request: {
          id: portalToken.request.id,
          supplierName: portalToken.request.supplierName,
          componentType: portalToken.request.componentType,
        },
      });
    }

    // Update access tracking
    await prisma.supplierPortalToken.update({
      where: { id: portalToken.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessAt: new Date(),
        usedAt: portalToken.usedAt ?? new Date(),
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0] ||
          request.headers.get("x-real-ip") ||
          null,
        userAgent: request.headers.get("user-agent") || null,
      },
    });

    // Parse data required (stored as JSON string)
    let dataRequired: string[] = [];
    try {
      dataRequired = JSON.parse(portalToken.request.dataRequired);
    } catch {
      dataRequired = [];
    }

    // Valid token - return request details
    return NextResponse.json({
      valid: true,
      request: {
        id: portalToken.request.id,
        supplierName: portalToken.request.supplierName,
        componentType: portalToken.request.componentType,
        dataRequired,
        notes: portalToken.request.notes,
        deadline: portalToken.request.deadline?.toISOString(),
        companyName:
          portalToken.request.assessment.user?.organization || "Customer",
        missionName: portalToken.request.assessment.missionName,
      },
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return NextResponse.json(
      {
        valid: false,
        error: "An error occurred while validating the access token",
      },
      { status: 500 },
    );
  }
}
