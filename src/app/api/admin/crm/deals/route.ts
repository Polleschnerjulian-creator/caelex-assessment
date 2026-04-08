/**
 * Admin CRM: Deals List + Create API
 *
 * GET  /api/admin/crm/deals — paginated, filterable by stage/status/owner
 * POST /api/admin/crm/deals — manually create a deal
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage, parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { DEAL_LIST_INCLUDE, serializeDeals } from "@/lib/crm/queries.server";
import { DEAL_STAGE_PROBABILITY } from "@/lib/crm/types";
import type { Prisma, CrmDealStage } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = parsePaginationLimit(searchParams.get("limit"), 100);
    const stage = searchParams.get("stage") || undefined;
    const status = searchParams.get("status") || "OPEN";
    const ownerId = searchParams.get("ownerId") || undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const view = searchParams.get("view") || "list"; // "list" or "kanban"
    const offset = (page - 1) * limit;

    const where: Prisma.CrmDealWhereInput = {
      deletedAt: null,
      ...(status &&
        status !== "ALL" && {
          status: status as Prisma.EnumCrmDealStatusFilter["equals"],
        }),
      ...(stage && { stage: stage as Prisma.EnumCrmDealStageFilter["equals"] }),
      ...(ownerId && { ownerId }),
      ...(companyId && { companyId }),
    };

    // Kanban view returns all open deals (no pagination)
    if (view === "kanban") {
      const deals = await prisma.crmDeal.findMany({
        where: { ...where, status: "OPEN" },
        orderBy: [{ stage: "asc" }, { stageChangedAt: "desc" }],
        include: DEAL_LIST_INCLUDE,
        take: 500, // safety cap
      });
      return NextResponse.json({ deals: serializeDeals(deals) });
    }

    const [deals, total] = await Promise.all([
      prisma.crmDeal.findMany({
        where,
        orderBy: { expectedCloseDate: "asc" },
        skip: offset,
        take: limit,
        include: DEAL_LIST_INCLUDE,
      }),
      prisma.crmDeal.count({ where }),
    ]);

    return NextResponse.json({
      deals: serializeDeals(deals),
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
    logger.error("Failed to list CRM deals", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list deals") },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  companyId: z.string().cuid(),
  primaryContactId: z.string().cuid().optional(),
  stage: z
    .enum([
      "IDENTIFIED",
      "ENGAGED",
      "ASSESSED",
      "PROPOSAL",
      "PROCUREMENT",
      "CLOSED_WON",
      "CLOSED_LOST",
      "ONBOARDING",
      "ACTIVE",
    ])
    .default("IDENTIFIED"),
  valueCents: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default("EUR"),
  expectedCloseDate: z.string().datetime({ offset: true }).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  ownerId: z.string().cuid().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const stage = parsed.data.stage as CrmDealStage;
    const deal = await prisma.crmDeal.create({
      data: {
        title: parsed.data.title,
        companyId: parsed.data.companyId,
        primaryContactId: parsed.data.primaryContactId,
        stage,
        status: "OPEN",
        valueCents: parsed.data.valueCents
          ? BigInt(parsed.data.valueCents)
          : undefined,
        currency: parsed.data.currency,
        expectedCloseDate: parsed.data.expectedCloseDate
          ? new Date(parsed.data.expectedCloseDate)
          : undefined,
        probability: parsed.data.probability ?? DEAL_STAGE_PROBABILITY[stage],
        ownerId: parsed.data.ownerId || session.user.id,
      },
      include: DEAL_LIST_INCLUDE,
    });

    await prisma.crmActivity.create({
      data: {
        type: "STAGE_CHANGED",
        source: "MANUAL",
        summary: `Deal created at stage ${stage}`,
        companyId: parsed.data.companyId,
        dealId: deal.id,
        contactId: parsed.data.primaryContactId,
        userId: session.user.id,
      },
    });

    logger.info("CRM deal created", {
      dealId: deal.id,
      createdBy: session.user.id,
    });

    return NextResponse.json(
      {
        deal: {
          ...deal,
          valueCents: deal.valueCents ? Number(deal.valueCents) : null,
        },
      },
      { status: 201 },
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
    logger.error("Failed to create CRM deal", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create deal") },
      { status: 500 },
    );
  }
}
