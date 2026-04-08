/**
 * Admin CRM: Contacts List + Create API
 *
 * GET  /api/admin/crm/contacts — paginated, searchable, filterable
 * POST /api/admin/crm/contacts — manually create a contact
 */

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage, parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { CONTACT_LIST_INCLUDE } from "@/lib/crm/queries.server";
import { recomputeContactScore } from "@/lib/crm/lead-scoring.server";
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
    const ownerId = searchParams.get("ownerId") || undefined;
    const companyId = searchParams.get("companyId") || undefined;
    const sortBy = searchParams.get("sortBy") || "leadScore";
    const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";
    const offset = (page - 1) * limit;

    const where: Prisma.CrmContactWhereInput = {
      deletedAt: null,
      ...(lifecycleStage && {
        lifecycleStage:
          lifecycleStage as Prisma.EnumCrmLifecycleStageFilter["equals"],
      }),
      ...(ownerId && { ownerId }),
      ...(companyId && { companyId }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { company: { name: { contains: search, mode: "insensitive" } } },
          { company: { domain: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const orderBy: Prisma.CrmContactOrderByWithRelationInput =
      sortBy === "createdAt"
        ? { createdAt: sortDir }
        : sortBy === "lastTouchAt"
          ? { lastTouchAt: sortDir }
          : sortBy === "name"
            ? { firstName: sortDir }
            : { leadScore: sortDir };

    const [contacts, total] = await Promise.all([
      prisma.crmContact.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        include: CONTACT_LIST_INCLUDE,
      }),
      prisma.crmContact.count({ where }),
    ]);

    return NextResponse.json({
      contacts,
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
    logger.error("Failed to list CRM contacts", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to list contacts") },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().max(320),
  phone: z.string().max(50).optional(),
  title: z.string().max(200).optional(),
  companyId: z.string().cuid().optional(),
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

    const normalizedEmail = parsed.data.email.toLowerCase().trim();

    // Check for existing
    const existing = await prisma.crmContact.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, deletedAt: true },
    });
    if (existing && !existing.deletedAt) {
      return NextResponse.json(
        {
          error: "A contact with this email already exists",
          contactId: existing.id,
        },
        { status: 409 },
      );
    }

    const now = new Date();
    const contact = await prisma.crmContact.upsert({
      where: { email: normalizedEmail },
      create: {
        ...parsed.data,
        email: normalizedEmail,
        sourceTags: ["manual"],
        firstTouchAt: now,
        lastTouchAt: now,
        lifecycleStage: parsed.data.lifecycleStage || "LEAD",
      },
      update: {
        ...parsed.data,
        email: normalizedEmail,
        deletedAt: null,
      },
    });

    // Log activity
    await prisma.crmActivity.create({
      data: {
        type: "OTHER",
        source: "MANUAL",
        summary: "Contact created manually",
        contactId: contact.id,
        companyId: contact.companyId,
        userId: session.user.id,
      },
    });

    // Initial score computation
    await recomputeContactScore(contact.id);

    logger.info("CRM contact created", {
      contactId: contact.id,
      createdBy: session.user.id,
    });

    return NextResponse.json({ contact }, { status: 201 });
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
    logger.error("Failed to create CRM contact", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to create contact") },
      { status: 500 },
    );
  }
}
