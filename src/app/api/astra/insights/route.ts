import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInsightsForUser } from "@/lib/astra/proactive-engine.server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    const orgId = membership?.organizationId || "";

    const [insights, rrsSnapshot, deadlineCount] = await Promise.all([
      generateInsightsForUser(session.user.id, orgId),
      orgId
        ? prisma.rRSSnapshot.findFirst({
            where: { organizationId: orgId },
            orderBy: { snapshotDate: "desc" },
            select: { overallScore: true },
          })
        : Promise.resolve(null),
      prisma.deadline.count({
        where: {
          userId: session.user.id,
          status: { not: "COMPLETED" },
          dueDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return NextResponse.json({
      rrsScore: rrsSnapshot?.overallScore ?? 0,
      deadlineCount,
      insights,
    });
  } catch (error) {
    logger.error("[astra-insights]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
