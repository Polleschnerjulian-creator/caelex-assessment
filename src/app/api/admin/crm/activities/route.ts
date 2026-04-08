/**
 * Admin CRM: Activities Timeline API
 *
 * GET /api/admin/crm/activities — unified activity feed
 *
 * Query params:
 *   - contactId / companyId / dealId — scope the feed
 *   - type — filter by activity type
 *   - category — filter by category (form/meeting/communication/manual/system/product/regulatory/ai)
 *   - limit (default 50, max 200)
 *   - cursor — ISO date for pagination (fetch older than)
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage, parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { ACTIVITY_TYPE_CATEGORY } from "@/lib/crm/types";
import type { Prisma, CrmActivityType } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get("contactId") || undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const dealId = searchParams.get("dealId") || undefined;
    const type = searchParams.get("type") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = parsePaginationLimit(searchParams.get("limit"), 50);
    const cursor = searchParams.get("cursor"); // ISO date string

    // Filter activity types by category if requested
    let typeFilter: CrmActivityType[] | undefined;
    if (category) {
      typeFilter = (
        Object.entries(ACTIVITY_TYPE_CATEGORY) as Array<
          [CrmActivityType, string]
        >
      )
        .filter(([, cat]) => cat === category)
        .map(([t]) => t);
    }

    const where: Prisma.CrmActivityWhereInput = {
      ...(contactId && { contactId }),
      ...(companyId && { companyId }),
      ...(dealId && { dealId }),
      ...(type && { type: type as CrmActivityType }),
      ...(typeFilter && { type: { in: typeFilter } }),
      ...(cursor && { occurredAt: { lt: new Date(cursor) } }),
    };

    const activities = await prisma.crmActivity.findMany({
      where,
      orderBy: { occurredAt: "desc" },
      take: limit + 1, // fetch one extra to determine if there's more
      include: {
        user: { select: { id: true, name: true, email: true } },
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        company: { select: { id: true, name: true, domain: true } },
        deal: { select: { id: true, title: true } },
      },
    });

    const hasMore = activities.length > limit;
    const results = hasMore ? activities.slice(0, limit) : activities;
    const nextCursor = hasMore
      ? results[results.length - 1].occurredAt.toISOString()
      : null;

    return NextResponse.json({
      activities: results,
      nextCursor,
      hasMore,
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
    logger.error("Failed to list CRM activities", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list activities") },
      { status: 500 },
    );
  }
}
