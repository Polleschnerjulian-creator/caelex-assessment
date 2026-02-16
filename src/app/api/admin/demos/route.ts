/**
 * Admin: Demo Request Management API
 *
 * GET   /api/admin/demos — List demo requests (paginated, filterable)
 * PATCH /api/admin/demos — Update demo request status/notes
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/demos
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 20, max: 100)
 *   - status (optional filter: NEW, CONTACTED, SCHEDULED, COMPLETED, NO_RESPONSE)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
      100,
    );
    const status = searchParams.get("status") || undefined;
    const offset = (page - 1) * limit;

    const where: Prisma.DemoRequestWhereInput = {
      ...(status && {
        status: status as Prisma.EnumDemoStatusFilter["equals"],
      }),
    };

    const [demos, total] = await Promise.all([
      prisma.demoRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.demoRequest.count({ where }),
    ]);

    return NextResponse.json({
      demos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("Failed to list demo requests", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list demo requests") },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/admin/demos
 *
 * Body:
 *   - id (required) — DemoRequest ID
 *   - status (optional) — NEW, CONTACTED, SCHEDULED, COMPLETED, NO_RESPONSE
 *   - notes (optional) — Admin notes
 *   - respondedAt (optional) — ISO date string
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, notes, respondedAt } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 },
      );
    }

    // Verify the demo request exists
    const existing = await prisma.demoRequest.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Demo request not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Prisma.DemoRequestUpdateInput = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (respondedAt !== undefined)
      updateData.respondedAt = new Date(respondedAt);

    const updated = await prisma.demoRequest.update({
      where: { id },
      data: updateData,
    });

    logger.info("Demo request updated", {
      id,
      status: status || existing.status,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ demo: updated });
  } catch (error) {
    logger.error("Failed to update demo request", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update demo request") },
      { status: 500 },
    );
  }
}
