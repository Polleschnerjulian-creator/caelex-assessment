import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { z } from "zod";
import { logger } from "@/lib/logger";

// H-API1 fix: lcaData used to accept z.record(z.string(), z.unknown())
// with no size/depth/type constraints. Any supplier holding a leaked
// token could push multi-megabyte json blobs into SupplierDataRequest.
// responseData, causing db bloat + second-order xss in the operator
// dashboard (the blob was rendered as-is).
//
// Schema below captures the LCA fields we actually need + allows an
// "additionalFields" escape hatch with bounded string values.

const LcaNumber = z.number().finite().min(0).max(1e12);
const LcaString = z.string().max(1000);

const SupplierSubmissionSchema = z
  .object({
    componentType: z.string().max(200).optional(),
    lcaData: z
      .object({
        // ─── core lifecycle-assessment fields ─────────────────
        materialName: LcaString.optional(),
        massKg: LcaNumber.optional(),
        gwpKgCo2e: LcaNumber.optional(), // global warming potential
        embodiedEnergyMj: LcaNumber.optional(),
        recycledContentPct: z.number().min(0).max(100).optional(),
        manufacturingLocation: LcaString.optional(),
        supplierCountry: z.string().length(2).toUpperCase().optional(),
        standard: LcaString.optional(), // e.g. "ISO 14040"
        certificationUrl: z.string().url().max(2048).optional(),
        dataSource: LcaString.optional(),
        assumptions: LcaString.optional(),
        validThroughDate: z.string().datetime().optional(),
        // ─── freeform escape hatch (bounded) ──────────────────
        notes: z.string().max(5000).optional(),
        additionalFields: z
          .record(z.string(), z.union([LcaNumber, LcaString, z.boolean()]))
          .refine((val) => Object.keys(val).length <= 50, {
            message: "additionalFields limited to 50 entries",
          })
          .optional(),
      })
      .strict()
      .refine((val) => Object.keys(val).length > 0, {
        message: "LCA data must not be empty",
      }),
    submittedAt: z.string().datetime().optional(),
  })
  .strict();

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
    logger.error("Error fetching supplier config", error);
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
    const parsed = SupplierSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { componentType, lcaData, submittedAt } = parsed.data;

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

    // Mark token as completed.
    // H-API4: previously used leftmost x-forwarded-for (spoofable). The
    // shared getIdentifier() helper returns "ip:<x>" / "user:<id>" — we
    // strip the prefix to store the raw IP, then fall back to the
    // already-recorded token IP on unknown.
    const idString = getIdentifier(request);
    const supplierIp = idString.startsWith("ip:")
      ? idString.slice(3)
      : portalToken.ipAddress;
    await prisma.supplierPortalToken.update({
      where: { id: portalToken.id },
      data: {
        completedAt: new Date(),
        ipAddress: supplierIp,
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
    logger.error("Error submitting supplier data", error);
    return NextResponse.json(
      { error: "Failed to submit data" },
      { status: 500 },
    );
  }
}
