import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parsePaginationLimit } from "@/lib/validations";
import { logger } from "@/lib/logger";

const financialEntrySchema = z.object({
  type: z.enum(["revenue", "expense", "investment", "refund"]),
  category: z.string().min(1).max(100),
  amount: z.number().positive(),
  currency: z.string().length(3).default("EUR"),
  date: z.string().transform((s) => new Date(s)),
  description: z.string().max(500).optional(),
  isRecurring: z.boolean().default(false),
  recurringPeriod: z.enum(["monthly", "yearly"]).optional(),
  organizationId: z.string().optional(),
});

/**
 * GET /api/admin/analytics/financial-entry
 * List financial entries
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parsePaginationLimit(searchParams.get("limit"));
    const type = searchParams.get("type");

    const where = type ? { type } : {};

    const [entries, total] = await Promise.all([
      prisma.financialEntry.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.financialEntry.count({ where }),
    ]);

    return NextResponse.json({
      entries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
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
    logger.error("[Financial Entry] GET Error", error);
    return NextResponse.json(
      { error: "Failed to fetch entries" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/analytics/financial-entry
 * Create a manual financial entry
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const body = await request.json();
    const validation = financialEntrySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 },
      );
    }

    const data = validation.data;

    const entry = await prisma.financialEntry.create({
      data: {
        type: data.type,
        category: data.category,
        amount: data.amount,
        currency: data.currency,
        date: data.date,
        description: data.description,
        isRecurring: data.isRecurring,
        recurringPeriod: data.recurringPeriod,
        organizationId: data.organizationId,
        source: "manual",
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ success: true, entry });
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
    logger.error("[Financial Entry] POST Error", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
