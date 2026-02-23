/**
 * Admin: Churn Intervention Management API
 *
 * GET   /api/admin/interventions — List churn interventions (paginated, filterable)
 * PATCH /api/admin/interventions — Update intervention status/action
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/interventions
 *
 * Platform-level admin only (User.role === "admin").
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 20, max: 100)
 *   - status (optional filter: PENDING, IN_PROGRESS, RESOLVED, CHURNED)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
      100,
    );
    const status = searchParams.get("status") || undefined;
    const offset = (page - 1) * limit;

    const where: Prisma.ChurnInterventionWhereInput = {
      ...(status && {
        status: status as Prisma.EnumInterventionStatusFilter["equals"],
      }),
    };

    const [interventions, total] = await Promise.all([
      prisma.churnIntervention.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              healthScore: {
                select: {
                  score: true,
                  trend: true,
                  riskLevel: true,
                  lastLoginAt: true,
                  calculatedAt: true,
                },
              },
            },
          },
        },
      }),
      prisma.churnIntervention.count({ where }),
    ]);

    return NextResponse.json({
      interventions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("Failed to list churn interventions", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to list churn interventions"),
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/interventions
 *
 * Platform-level admin only (User.role === "admin").
 *
 * Body:
 *   - id (required) — ChurnIntervention ID
 *   - status (optional) — PENDING, IN_PROGRESS, RESOLVED, CHURNED
 *   - actionTaken (optional) — Description of action taken
 *   - resolvedAt (optional) — ISO date string
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const body = await request.json();
    const { id, status, actionTaken, resolvedAt } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 },
      );
    }

    // Verify the intervention exists
    const existing = await prisma.churnIntervention.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Intervention not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Prisma.ChurnInterventionUpdateInput = {};
    if (status !== undefined) updateData.status = status;
    if (actionTaken !== undefined) updateData.actionTaken = actionTaken;
    if (resolvedAt !== undefined) updateData.resolvedAt = new Date(resolvedAt);

    const updated = await prisma.churnIntervention.update({
      where: { id },
      data: updateData,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info("Churn intervention updated", {
      id,
      status: status || existing.status,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ intervention: updated });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("Failed to update churn intervention", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(
          error,
          "Failed to update churn intervention",
        ),
      },
      { status: 500 },
    );
  }
}
