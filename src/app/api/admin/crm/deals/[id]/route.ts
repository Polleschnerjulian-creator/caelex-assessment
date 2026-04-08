/**
 * Admin CRM: Single Deal API
 *
 * GET    /api/admin/crm/deals/[id] — full detail
 * PATCH  /api/admin/crm/deals/[id] — update fields (including stage via Kanban drop)
 * DELETE /api/admin/crm/deals/[id] — soft delete
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { DEAL_LIST_INCLUDE, serializeDeal } from "@/lib/crm/queries.server";
import { DEAL_STAGE_PROBABILITY } from "@/lib/crm/types";
import type { CrmDealStage } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const { id } = await params;

    const deal = await prisma.crmDeal.findUnique({
      where: { id, deletedAt: null },
      include: {
        ...DEAL_LIST_INCLUDE,
        company: {
          select: {
            id: true,
            name: true,
            domain: true,
            logoUrl: true,
            operatorType: true,
            jurisdictions: true,
            spacecraftCount: true,
            nextLaunchDate: true,
            leadScore: true,
          },
        },
      },
    });
    if (!deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const activities = await prisma.crmActivity.findMany({
      where: { dealId: id },
      orderBy: { occurredAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const notes = await prisma.crmNote.findMany({
      where: { dealId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      deal: serializeDeal(deal),
      activities,
      notes,
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
    logger.error("Failed to fetch CRM deal", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to fetch deal") },
      { status: 500 },
    );
  }
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
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
    .optional(),
  status: z.enum(["OPEN", "WON", "LOST"]).optional(),
  valueCents: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().length(3).optional(),
  expectedCloseDate: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  actualCloseDate: z.string().datetime({ offset: true }).nullable().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  lossReason: z.string().max(1000).nullable().optional(),
  primaryContactId: z.string().cuid().nullable().optional(),
  ownerId: z.string().cuid().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const { id } = await params;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const existing = await prisma.crmDeal.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = { ...parsed.data };

    if (typeof data.valueCents === "number") {
      data.valueCents = BigInt(data.valueCents);
    }
    if (typeof data.expectedCloseDate === "string") {
      data.expectedCloseDate = new Date(data.expectedCloseDate);
    }
    if (typeof data.actualCloseDate === "string") {
      data.actualCloseDate = new Date(data.actualCloseDate);
    }

    // When stage changes, track it
    const stageChanged =
      parsed.data.stage && parsed.data.stage !== existing.stage;
    if (stageChanged) {
      data.stageChangedAt = new Date();
      const newStage = parsed.data.stage as CrmDealStage;
      // Auto-update probability to stage default unless explicitly provided
      if (parsed.data.probability === undefined) {
        data.probability = DEAL_STAGE_PROBABILITY[newStage];
      }
      // Auto-close
      if (newStage === "CLOSED_WON") {
        data.status = "WON";
        data.actualCloseDate = data.actualCloseDate || new Date();
      } else if (newStage === "CLOSED_LOST") {
        data.status = "LOST";
        data.actualCloseDate = data.actualCloseDate || new Date();
      }
    }

    const updated = await prisma.crmDeal.update({
      where: { id },
      data,
      include: DEAL_LIST_INCLUDE,
    });

    if (stageChanged) {
      await prisma.crmActivity.create({
        data: {
          type: "STAGE_CHANGED",
          source: "MANUAL",
          summary: `Stage: ${existing.stage} → ${parsed.data.stage}`,
          companyId: existing.companyId,
          dealId: id,
          userId: session.user.id,
          metadata: { from: existing.stage, to: parsed.data.stage },
        },
      });
    }

    logger.info("CRM deal updated", {
      dealId: id,
      stageChanged,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ deal: serializeDeal(updated) });
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
    logger.error("Failed to update CRM deal", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update deal") },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const { id } = await params;

    const existing = await prisma.crmDeal.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    await prisma.crmDeal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
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
    logger.error("Failed to delete CRM deal", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to delete deal") },
      { status: 500 },
    );
  }
}
