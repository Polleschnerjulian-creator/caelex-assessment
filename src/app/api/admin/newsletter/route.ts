/**
 * Admin: Newsletter Subscribers API
 *
 * GET /api/admin/newsletter — List newsletter subscribers (admin only)
 *
 * Supports pagination, status filtering, and CSV export.
 */

import { auth } from "@/lib/auth";
import { parsePaginationLimit } from "@/lib/validations";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify platform-level admin role via DAL
    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = parsePaginationLimit(searchParams.get("limit"));
    const status = searchParams.get("status");
    const exportFormat = searchParams.get("export");

    // Build filter
    const where: Prisma.NewsletterSubscriptionWhereInput = {
      ...(status && {
        status: status.toUpperCase() as "PENDING" | "ACTIVE" | "UNSUBSCRIBED",
      }),
    };

    // CSV export
    if (exportFormat === "csv") {
      const subscribers = await prisma.newsletterSubscription.findMany({
        where,
        orderBy: { subscribedAt: "desc" },
      });

      const csvHeader =
        "id,email,status,source,subscribedAt,confirmedAt,unsubscribedAt";
      const csvRows = subscribers.map((sub) =>
        [
          sub.id,
          sub.email,
          sub.status,
          sub.source,
          sub.subscribedAt.toISOString(),
          sub.confirmedAt ? sub.confirmedAt.toISOString() : "",
          sub.unsubscribedAt ? sub.unsubscribedAt.toISOString() : "",
        ].join(","),
      );
      const csv = [csvHeader, ...csvRows].join("\n");

      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="newsletter-subscribers-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // Paginated list
    const offset = (page - 1) * limit;

    const [subscribers, total] = await Promise.all([
      prisma.newsletterSubscription.findMany({
        where,
        orderBy: { subscribedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.newsletterSubscription.count({ where }),
    ]);

    return NextResponse.json({
      subscribers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
    logger.error("Admin: Error fetching newsletter subscribers", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
