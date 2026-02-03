import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/documents/dashboard - Get document dashboard stats
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const ninetyDaysFromNow = new Date(
      now.getTime() + 90 * 24 * 60 * 60 * 1000,
    );

    // Get counts
    const [
      total,
      expired,
      expiringThisMonth,
      expiringNext90Days,
      draft,
      active,
    ] = await Promise.all([
      prisma.document.count({
        where: { userId: session.user.id, isLatest: true },
      }),
      prisma.document.count({
        where: {
          userId: session.user.id,
          isLatest: true,
          isExpired: true,
        },
      }),
      prisma.document.count({
        where: {
          userId: session.user.id,
          isLatest: true,
          expiryDate: { gte: now, lte: thirtyDaysFromNow },
          isExpired: false,
        },
      }),
      prisma.document.count({
        where: {
          userId: session.user.id,
          isLatest: true,
          expiryDate: { gte: now, lte: ninetyDaysFromNow },
          isExpired: false,
        },
      }),
      prisma.document.count({
        where: {
          userId: session.user.id,
          isLatest: true,
          status: "DRAFT",
        },
      }),
      prisma.document.count({
        where: {
          userId: session.user.id,
          isLatest: true,
          status: "ACTIVE",
        },
      }),
    ]);

    // Get by category
    const byCategory = await prisma.document.groupBy({
      by: ["category"],
      where: {
        userId: session.user.id,
        isLatest: true,
        status: { notIn: ["ARCHIVED", "REJECTED"] },
      },
      _count: { id: true },
    });

    // Get expiring documents
    const expiringDocuments = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        isLatest: true,
        expiryDate: { gte: now, lte: ninetyDaysFromNow },
        isExpired: false,
      },
      orderBy: { expiryDate: "asc" },
      take: 10,
    });

    // Get expired documents
    const expiredDocuments = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        isLatest: true,
        isExpired: true,
      },
      orderBy: { expiryDate: "desc" },
      take: 5,
    });

    // Get recent documents
    const recentDocuments = await prisma.document.findMany({
      where: {
        userId: session.user.id,
        isLatest: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Calculate compliance completeness (simplified)
    const activeDocuments = total - expired - draft;
    const completeness =
      total > 0 ? Math.round((activeDocuments / total) * 100) : 0;

    return NextResponse.json({
      stats: {
        total,
        expired,
        expiringThisMonth,
        expiringNext90Days,
        draft,
        active,
        completeness,
      },
      byCategory: byCategory.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
      expiringDocuments,
      expiredDocuments,
      recentDocuments,
    });
  } catch (error) {
    console.error("Error fetching document dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch document dashboard" },
      { status: 500 },
    );
  }
}
