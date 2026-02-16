/**
 * Admin: Newsletter Subscribers API
 *
 * GET /api/admin/newsletter — List newsletter subscribers (admin only)
 *
 * Supports pagination, status filtering, and CSV export.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "50", 10),
      100,
    );
    const status = searchParams.get("status");
    const exportFormat = searchParams.get("export");

    // Build filter
    const where: Prisma.NewsletterSubscriptionWhereInput = {
      ...(status && {
        status: status.toUpperCase() as "ACTIVE" | "UNSUBSCRIBED",
      }),
    };

    // CSV export
    if (exportFormat === "csv") {
      const subscribers = await prisma.newsletterSubscription.findMany({
        where,
        orderBy: { subscribedAt: "desc" },
      });

      const csvHeader = "id,email,status,source,subscribedAt,unsubscribedAt";
      const csvRows = subscribers.map((sub) =>
        [
          sub.id,
          sub.email,
          sub.status,
          sub.source,
          sub.subscribedAt.toISOString(),
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
  } catch (error) {
    console.error("Admin: Error fetching newsletter subscribers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
