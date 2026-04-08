/**
 * Admin: Contact Request Management API
 *
 * GET /api/admin/contact-requests — List contact requests (paginated, filterable)
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage, parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/contact-requests
 *
 * Platform-level admin only (User.role === "admin").
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 20, max: 100)
 *   - status (optional filter: NEW, IN_PROGRESS, RESOLVED, ARCHIVED)
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
    const limit = parsePaginationLimit(searchParams.get("limit"), 20);
    const status = searchParams.get("status") || undefined;
    const offset = (page - 1) * limit;

    const where: Prisma.ContactRequestWhereInput = {
      ...(status && {
        status: status as Prisma.EnumContactRequestStatusFilter["equals"],
      }),
    };

    const [contactRequests, total] = await Promise.all([
      prisma.contactRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.contactRequest.count({ where }),
    ]);

    return NextResponse.json({
      contactRequests,
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
    logger.error("Failed to list contact requests", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list contact requests") },
      { status: 500 },
    );
  }
}
