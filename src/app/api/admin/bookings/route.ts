/**
 * Admin: Booking Management API
 *
 * GET /api/admin/bookings — List bookings (paginated, filterable)
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage, parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/bookings
 *
 * Platform-level admin only (User.role === "admin").
 *
 * Query params:
 *   - page (default: 1)
 *   - limit (default: 20, max: 100)
 *   - status (optional filter: CONFIRMED, CANCELLED, COMPLETED, NO_SHOW)
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

    const where: Prisma.BookingWhereInput = {
      ...(status && {
        status: status as Prisma.EnumBookingStatusFilter["equals"],
      }),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { scheduledAt: "asc" },
        skip: offset,
        take: limit,
        include: {
          demoRequest: {
            select: {
              operatorType: true,
              fundingStage: true,
              companyWebsite: true,
              demoTourCompleted: true,
            },
          },
        },
      }),
      prisma.booking.count({ where }),
    ]);

    return NextResponse.json({
      bookings,
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
    logger.error("Failed to list bookings", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list bookings") },
      { status: 500 },
    );
  }
}
