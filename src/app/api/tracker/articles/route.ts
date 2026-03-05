import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import {
  logAuditEvent,
  getRequestContext,
  generateAuditDescription,
} from "@/lib/audit";
import { UpdateArticleStatusSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const statuses = await prisma.articleStatus.findMany({
      where: { userId: session.user.id },
      select: { articleId: true, status: true, notes: true, updatedAt: true },
    });

    // Transform to { [articleId]: { status, notes, updatedAt } }
    const statusMap: Record<
      string,
      { status: string; notes: string | null; updatedAt: Date }
    > = {};
    for (const s of statuses) {
      statusMap[s.articleId] = {
        status: s.status,
        notes: s.notes,
        updatedAt: s.updatedAt,
      };
    }

    return NextResponse.json(statusMap, {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    });
  } catch (error) {
    logger.error("Error fetching article statuses", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const parsed = UpdateArticleStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { articleId, status, notes } = parsed.data;

    // Get previous value for audit logging
    const previous = await prisma.articleStatus.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    const updated = await prisma.articleStatus.upsert({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
      update: {
        status,
        notes: notes ?? undefined,
      },
      create: {
        userId,
        articleId,
        status,
        notes,
      },
    });

    // Log audit event if status changed
    if (!previous || previous.status !== status) {
      const { ipAddress, userAgent } = getRequestContext(request);
      await logAuditEvent({
        userId,
        action: "article_status_changed",
        entityType: "article",
        entityId: articleId,
        previousValue: previous
          ? { status: previous.status, notes: previous.notes }
          : null,
        newValue: { status, notes },
        description: generateAuditDescription(
          "article_status_changed",
          "article",
          previous ? { status: previous.status } : undefined,
          { status },
        ),
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    logger.error("Error updating article status", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
