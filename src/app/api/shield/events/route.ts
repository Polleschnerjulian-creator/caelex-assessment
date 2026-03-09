/**
 * Shield Events List API
 *
 * GET /api/shield/events
 * Returns paginated, filterable conjunction events for the user's organization.
 *
 * Query params (Zod validated):
 *   status    — ConjunctionStatus filter
 *   riskTier  — RiskTier filter
 *   noradId   — NORAD catalog ID filter
 *   limit     — Page size (1-100, default 20)
 *   offset    — Pagination offset (default 0)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

const querySchema = z.object({
  status: z.string().optional(),
  riskTier: z.string().optional(),
  noradId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 404 });
    }

    // Parse and validate query params
    const url = new URL(req.url);
    const parseResult = querySchema.safeParse({
      status: url.searchParams.get("status") ?? undefined,
      riskTier: url.searchParams.get("riskTier") ?? undefined,
      noradId: url.searchParams.get("noradId") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          details: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { status, riskTier, noradId, limit, offset } = parseResult.data;

    // Build where clause
    const where: Prisma.ConjunctionEventWhereInput = {
      organizationId: membership.organizationId,
      ...(status && {
        status: status as Prisma.ConjunctionEventWhereInput["status"],
      }),
      ...(riskTier && {
        riskTier: riskTier as Prisma.ConjunctionEventWhereInput["riskTier"],
      }),
      ...(noradId && { noradId }),
    };

    const [events, total] = await Promise.all([
      prisma.conjunctionEvent.findMany({
        where,
        orderBy: [
          { riskTier: "asc" }, // EMERGENCY first alphabetically
          { tca: "asc" }, // Soonest first
        ],
        include: {
          _count: { select: { cdmRecords: true } },
        },
        take: limit,
        skip: offset,
      }),
      prisma.conjunctionEvent.count({ where }),
    ]);

    return NextResponse.json({
      data: events,
      meta: { total, limit, offset },
    });
  } catch (error) {
    logger.error("Failed to list conjunction events", error);
    return NextResponse.json(
      { error: "Failed to list conjunction events" },
      { status: 500 },
    );
  }
}
