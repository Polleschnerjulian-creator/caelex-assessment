import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  getSafeErrorMessage,
  parsePaginationLimit,
  CuidSchema,
} from "@/lib/validations";

const MarkUpdateReadSchema = z.object({
  updateId: CuidSchema,
});

/**
 * GET /api/regulatory-feed
 * Paginated list of regulatory updates with read status per org.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = parsePaginationLimit(searchParams.get("limit"), 20);
    const severity = searchParams.get("severity");
    const moduleFilter = searchParams.get("module");

    // Build where clause
    const where: Record<string, unknown> = {};
    if (severity && ["CRITICAL", "HIGH", "MEDIUM", "LOW"].includes(severity)) {
      where.severity = severity;
    }
    if (moduleFilter) {
      where.affectedModules = { has: moduleFilter };
    }

    const [updates, total] = await Promise.all([
      prisma.regulatoryUpdate.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reads: membership
            ? {
                where: { organizationId: membership.organizationId },
                select: { id: true, readByUserId: true, readAt: true },
              }
            : false,
        },
      }),
      prisma.regulatoryUpdate.count({ where }),
    ]);

    // Map to include isRead flag
    const mapped = updates.map((u) => ({
      id: u.id,
      celexNumber: u.celexNumber,
      title: u.title,
      documentType: u.documentType,
      sourceUrl: u.sourceUrl,
      publishedAt: u.publishedAt,
      severity: u.severity,
      affectedModules: u.affectedModules,
      matchReason: u.matchReason,
      summary: u.summary,
      createdAt: u.createdAt,
      isRead: Array.isArray(u.reads) && u.reads.length > 0,
    }));

    return NextResponse.json({
      updates: mapped,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to fetch regulatory feed") },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/regulatory-feed
 * Mark a regulatory update as read for the user's organization.
 */
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "No organization membership found" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const parsed = MarkUpdateReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { updateId } = parsed.data;

    // Verify the update exists
    const update = await prisma.regulatoryUpdate.findUnique({
      where: { id: updateId },
      select: { id: true },
    });

    if (!update) {
      return NextResponse.json(
        { error: "Regulatory update not found" },
        { status: 404 },
      );
    }

    // Upsert the read record
    await prisma.regulatoryUpdateRead.upsert({
      where: {
        regulatoryUpdateId_organizationId: {
          regulatoryUpdateId: updateId,
          organizationId: membership.organizationId,
        },
      },
      update: {
        readByUserId: session.user.id,
        readAt: new Date(),
      },
      create: {
        regulatoryUpdateId: updateId,
        organizationId: membership.organizationId,
        readByUserId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to mark update as read"),
      },
      { status: 500 },
    );
  }
}
