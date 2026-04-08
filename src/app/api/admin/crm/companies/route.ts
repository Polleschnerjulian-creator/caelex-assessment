/**
 * Admin CRM: Companies List + Create API
 *
 * GET  /api/admin/crm/companies — paginated, searchable, filterable
 * POST /api/admin/crm/companies — manually create a company
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage, parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { COMPANY_LIST_INCLUDE } from "@/lib/crm/queries.server";
import { recomputeCompanyScore } from "@/lib/crm/lead-scoring.server";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = parsePaginationLimit(searchParams.get("limit"), 25);
    const search = searchParams.get("search")?.trim();
    const lifecycleStage = searchParams.get("lifecycleStage") || undefined;
    const operatorType = searchParams.get("operatorType") || undefined;
    const ownerId = searchParams.get("ownerId") || undefined;
    const sortBy = searchParams.get("sortBy") || "leadScore";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
    const offset = (page - 1) * limit;

    const where: Prisma.CrmCompanyWhereInput = {
      deletedAt: null,
      ...(lifecycleStage && {
        lifecycleStage:
          lifecycleStage as Prisma.EnumCrmLifecycleStageFilter["equals"],
      }),
      ...(operatorType && {
        operatorType:
          operatorType as Prisma.EnumCrmOperatorTypeNullableFilter["equals"],
      }),
      ...(ownerId && { ownerId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { domain: { contains: search, mode: "insensitive" } },
          { website: { contains: search, mode: "insensitive" } },
        ],
      }),
    };

    const orderBy: Prisma.CrmCompanyOrderByWithRelationInput =
      sortBy === "createdAt"
        ? { createdAt: sortDir }
        : sortBy === "name"
          ? { name: sortDir }
          : { leadScore: sortDir };

    const [companies, total] = await Promise.all([
      prisma.crmCompany.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: COMPANY_LIST_INCLUDE,
      }),
      prisma.crmCompany.count({ where }),
    ]);

    return NextResponse.json({
      companies,
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
    logger.error("Failed to list CRM companies", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list companies") },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().max(255).optional(),
  website: z.string().url().max(500).optional(),
  description: z.string().max(5000).optional(),
  industry: z.string().max(200).optional(),
  country: z.string().max(2).optional(),
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
    .optional(),
  jurisdictions: z.array(z.string()).optional(),
  spacecraftCount: z.number().int().nonnegative().optional(),
  fundingStage: z.string().max(50).optional(),
  isRaising: z.boolean().optional(),
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

    const domain = parsed.data.domain
      ? parsed.data.domain
          .toLowerCase()
          .trim()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .split("/")[0]
      : undefined;

    if (domain) {
      const existing = await prisma.crmCompany.findUnique({
        where: { domain },
        select: { id: true, deletedAt: true },
      });
      if (existing && !existing.deletedAt) {
        return NextResponse.json(
          {
            error: "A company with this domain already exists",
            companyId: existing.id,
          },
          { status: 409 },
        );
      }
    }

    const company = await prisma.crmCompany.create({
      data: {
        ...parsed.data,
        domain,
        operatorType: parsed.data.operatorType || "OTHER",
      },
    });

    await prisma.crmActivity.create({
      data: {
        type: "OTHER",
        source: "MANUAL",
        summary: "Company created manually",
        companyId: company.id,
        userId: session.user.id,
      },
    });

    await recomputeCompanyScore(company.id);

    logger.info("CRM company created", {
      companyId: company.id,
      createdBy: session.user.id,
    });

    return NextResponse.json({ company }, { status: 201 });
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
    logger.error("Failed to create CRM company", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create company") },
      { status: 500 },
    );
  }
}
