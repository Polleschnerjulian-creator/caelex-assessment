/**
 * Assure Data Room Analytics API
 * GET: Return engagement analytics (aggregate views, top documents, etc.).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("assure", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const dataRoom = await prisma.assureDataRoom.findFirst({
      where: { organizationId: membership.organizationId },
    });

    if (!dataRoom) {
      return NextResponse.json({
        totalViews: 0,
        uniqueViewers: 0,
        activeLinks: 0,
        topDocuments: [],
        recentViews: [],
        viewsByDay: [],
      });
    }

    // Get all links for this data room
    const links = await prisma.assureDataRoomLink.findMany({
      where: { dataRoomId: dataRoom.id },
      select: {
        id: true,
        recipientName: true,
        recipientEmail: true,
        recipientOrg: true,
        isActive: true,
        totalViews: true,
      },
    });

    const linkIds = links.map((l) => l.id);

    // Get all views
    const views = await prisma.assureDataRoomView.findMany({
      where: { linkId: { in: linkIds } },
      orderBy: { viewedAt: "desc" },
      take: 500,
    });

    // Aggregate total views
    const totalViews = views.length;

    // Unique viewers (by linkId)
    const uniqueViewers = new Set(views.map((v) => v.linkId)).size;

    // Active links
    const activeLinks = links.filter((l) => l.isActive).length;

    // Top documents by view count
    const docViewCounts: Record<string, number> = {};
    for (const view of views) {
      if (view.documentId) {
        docViewCounts[view.documentId] =
          (docViewCounts[view.documentId] || 0) + 1;
      }
    }

    const topDocuments = Object.entries(docViewCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([documentId, viewCount]) => ({ documentId, viewCount }));

    // Recent views with recipient info
    const recentViews = views.slice(0, 20).map((v) => {
      const link = links.find((l) => l.id === v.linkId);
      return {
        id: v.id,
        action: v.action,
        documentId: v.documentId,
        durationSec: v.durationSec,
        viewedAt: v.viewedAt,
        recipientName: link?.recipientName || "Unknown",
        recipientOrg: link?.recipientOrg || null,
      };
    });

    // Views by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentDayViews = views.filter((v) => v.viewedAt >= thirtyDaysAgo);

    const viewsByDay: Record<string, number> = {};
    for (const view of recentDayViews) {
      const day = view.viewedAt.toISOString().split("T")[0];
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    }

    return NextResponse.json({
      totalViews,
      uniqueViewers,
      activeLinks,
      totalLinks: links.length,
      topDocuments,
      recentViews,
      viewsByDay: Object.entries(viewsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    logger.error("Assure data room analytics error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
