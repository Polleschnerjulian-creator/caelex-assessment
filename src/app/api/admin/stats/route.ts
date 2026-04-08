/**
 * Admin: Lightweight Stats API
 *
 * GET /api/admin/stats — Returns counts for admin sidebar badges.
 *
 * Called by the Sidebar component on mount for admin users. Cached for
 * 30s to avoid hammering the DB on every navigation event.
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    // Run all count queries in parallel
    const [newBookings, newContactRequests, newDemoRequests] =
      await Promise.all([
        prisma.booking.count({ where: { status: "CONFIRMED" } }),
        prisma.contactRequest.count({ where: { status: "NEW" } }),
        prisma.demoRequest.count({ where: { status: "NEW" } }),
      ]);

    return NextResponse.json(
      {
        newBookings,
        newContactRequests,
        newDemoRequests,
      },
      {
        headers: {
          // Private cache — this is per-admin data
          "Cache-Control": "private, max-age=30",
        },
      },
    );
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
    logger.error("Failed to fetch admin stats", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to fetch admin stats") },
      { status: 500 },
    );
  }
}
