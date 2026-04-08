/**
 * Admin CRM: Single Company API
 *
 * GET    /api/admin/crm/companies/[id] — full detail with contacts, deals, activities
 * PATCH  /api/admin/crm/companies/[id] — update fields
 * DELETE /api/admin/crm/companies/[id] — soft delete
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { COMPANY_DETAIL_INCLUDE } from "@/lib/crm/queries.server";
import { recomputeCompanyScore } from "@/lib/crm/lead-scoring.server";

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

    const company = await prisma.crmCompany.findUnique({
      where: { id, deletedAt: null },
      include: COMPANY_DETAIL_INCLUDE,
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const activities = await prisma.crmActivity.findMany({
      where: { companyId: id },
      orderBy: { occurredAt: "desc" },
      take: 50,
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
      },
    });

    const notes = await prisma.crmNote.findMany({
      where: { companyId: id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    // Serialize BigInt on deals
    const { deals, ...rest } = company;
    const serialized = {
      ...rest,
      deals: deals.map((d) => ({
        ...d,
        valueCents: d.valueCents !== null ? Number(d.valueCents) : null,
      })),
    };

    return NextResponse.json({
      company: serialized,
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
    logger.error("Failed to fetch CRM company", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to fetch company") },
      { status: 500 },
    );
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  domain: z.string().max(255).nullable().optional(),
  website: z.string().url().max(500).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  industry: z.string().max(200).nullable().optional(),
  sizeBand: z.string().max(50).nullable().optional(),
  country: z.string().max(2).nullable().optional(),
  city: z.string().max(200).nullable().optional(),
  operatorType: z
    .enum([
      "SPACECRAFT_OPERATOR",
      "LAUNCH_PROVIDER",
      "LAUNCH_SITE",
      "IN_SPACE_SERVICE",
      "COLLISION_AVOIDANCE",
      "POSITIONAL_DATA",
      "THIRD_COUNTRY",
      "GOVERNMENT",
      "HARDWARE_MANUFACTURER",
      "DEFENSE",
      "INSURANCE",
      "LEGAL_CONSULTING",
      "STARTUP",
      "OTHER",
    ])
    .nullable()
    .optional(),
  jurisdictions: z.array(z.string()).optional(),
  spacecraftCount: z.number().int().nonnegative().nullable().optional(),
  plannedSpacecraft: z.number().int().nonnegative().nullable().optional(),
  primaryOrbit: z.string().max(50).nullable().optional(),
  fundingStage: z.string().max(50).nullable().optional(),
  isRaising: z.boolean().nullable().optional(),
  nextLaunchDate: z.string().datetime({ offset: true }).nullable().optional(),
  licenseExpiryDate: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
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

    const existing = await prisma.crmCompany.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Convert ISO date strings to Date
    const data: Record<string, unknown> = { ...parsed.data };
    if (typeof data.nextLaunchDate === "string") {
      data.nextLaunchDate = new Date(data.nextLaunchDate);
    }
    if (typeof data.licenseExpiryDate === "string") {
      data.licenseExpiryDate = new Date(data.licenseExpiryDate);
    }

    const updated = await prisma.crmCompany.update({
      where: { id },
      data,
    });

    if (
      parsed.data.lifecycleStage &&
      parsed.data.lifecycleStage !== existing.lifecycleStage
    ) {
      await prisma.crmActivity.create({
        data: {
          type: "LIFECYCLE_CHANGED",
          source: "MANUAL",
          summary: `Lifecycle: ${existing.lifecycleStage} → ${parsed.data.lifecycleStage}`,
          companyId: id,
          userId: session.user.id,
          metadata: {
            from: existing.lifecycleStage,
            to: parsed.data.lifecycleStage,
          },
        },
      });
    }

    await recomputeCompanyScore(id);

    logger.info("CRM company updated", {
      companyId: id,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ company: updated });
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
    logger.error("Failed to update CRM company", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to update company") },
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

    const existing = await prisma.crmCompany.findUnique({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    await prisma.crmCompany.update({
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
    logger.error("Failed to delete CRM company", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to delete company") },
      { status: 500 },
    );
  }
}
