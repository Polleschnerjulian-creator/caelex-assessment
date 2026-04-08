/**
 * Admin CRM: Single Contact API
 *
 * GET    /api/admin/crm/contacts/[id] — full contact detail with activities
 * PATCH  /api/admin/crm/contacts/[id] — update fields, stage, owner
 * DELETE /api/admin/crm/contacts/[id] — soft delete (sets deletedAt)
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { CONTACT_DETAIL_INCLUDE } from "@/lib/crm/queries.server";
import { recomputeContactScore } from "@/lib/crm/lead-scoring.server";

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

    const contact = await prisma.crmContact.findUnique({
      where: { id, deletedAt: null },
      include: CONTACT_DETAIL_INCLUDE,
    });
    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Fetch activities separately (paginated timeline)
    const activities = await prisma.crmActivity.findMany({
      where: { contactId: id },
      orderBy: { occurredAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const notes = await prisma.crmNote.findMany({
      where: { contactId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Serialize BigInt valueCents on deals
    const { primaryFor, ...rest } = contact;
    const contactWithSerializedDeals = {
      ...rest,
      primaryFor: primaryFor.map((d) => ({
        ...d,
        valueCents: d.valueCents !== null ? Number(d.valueCents) : null,
      })),
    };

    return NextResponse.json({
      contact: contactWithSerializedDeals,
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
    logger.error("Failed to fetch CRM contact", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to fetch contact") },
      { status: 500 },
    );
  }
}

const updateSchema = z.object({
  firstName: z.string().min(1).max(100).nullable().optional(),
  lastName: z.string().min(1).max(100).nullable().optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(50).nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  linkedinUrl: z.string().url().max(500).nullable().optional(),
  companyId: z.string().cuid().nullable().optional(),
  lifecycleStage: z
    .enum([
      "SUBSCRIBER",
      "LEAD",
      "MQL",
      "SQL",
      "OPPORTUNITY",
      "CUSTOMER",
      "EVANGELIST",
      "CHURNED",
      "DISQUALIFIED",
    ])
    .optional(),
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

    const existing = await prisma.crmContact.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = { ...parsed.data };
    if (data.email) {
      data.email = (data.email as string).toLowerCase().trim();
    }

    const updated = await prisma.crmContact.update({
      where: { id },
      data: { ...data, lastTouchAt: new Date() },
    });

    // Log field changes as activities
    const changes: string[] = [];
    if (
      parsed.data.lifecycleStage &&
      parsed.data.lifecycleStage !== existing.lifecycleStage
    ) {
      changes.push(
        `Lifecycle: ${existing.lifecycleStage} → ${parsed.data.lifecycleStage}`,
      );
      await prisma.crmActivity.create({
        data: {
          type: "LIFECYCLE_CHANGED",
          source: "MANUAL",
          summary: `Lifecycle: ${existing.lifecycleStage} → ${parsed.data.lifecycleStage}`,
          contactId: id,
          companyId: existing.companyId,
          userId: session.user.id,
          metadata: {
            from: existing.lifecycleStage,
            to: parsed.data.lifecycleStage,
          },
        },
      });
    }
    if (parsed.data.ownerId && parsed.data.ownerId !== existing.ownerId) {
      changes.push("Owner changed");
      await prisma.crmActivity.create({
        data: {
          type: "OWNER_CHANGED",
          source: "MANUAL",
          summary: "Contact owner changed",
          contactId: id,
          companyId: existing.companyId,
          userId: session.user.id,
          metadata: { from: existing.ownerId, to: parsed.data.ownerId },
        },
      });
    }

    // Recompute score in case the update affected scoring inputs
    await recomputeContactScore(id);

    logger.info("CRM contact updated", {
      contactId: id,
      changes,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ contact: updated });
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
    logger.error("Failed to update CRM contact", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update contact") },
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

    const existing = await prisma.crmContact.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    await prisma.crmContact.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info("CRM contact soft-deleted", {
      contactId: id,
      deletedBy: session.user.id,
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
    logger.error("Failed to delete CRM contact", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to delete contact") },
      { status: 500 },
    );
  }
}
