/**
 * Admin CRM: AI Next-Best-Action Endpoint
 *
 * POST /api/admin/crm/ai/next-action
 * Body: { dealId: string }
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { suggestNextAction } from "@/lib/crm/ai.server";

const schema = z.object({
  dealId: z.string().cuid(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const deal = await prisma.crmDeal.findUnique({
      where: { id: parsed.data.dealId, deletedAt: null },
      include: { company: true },
    });
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const recentActivities = await prisma.crmActivity.findMany({
      where: { dealId: parsed.data.dealId },
      orderBy: { occurredAt: "desc" },
      take: 15,
      select: { type: true, summary: true, occurredAt: true },
    });

    const result = await suggestNextAction({
      deal,
      company: deal.company,
      recentActivities,
    });

    return NextResponse.json(result);
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
    logger.error("CRM next-action failed", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Next-action failed") },
      { status: 500 },
    );
  }
}
