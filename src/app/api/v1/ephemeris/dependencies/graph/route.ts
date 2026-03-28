import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDependencyGraph } from "@/lib/ephemeris/cross-type/dependency-graph";

// GET /api/v1/ephemeris/dependencies/graph
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
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const graph = await buildDependencyGraph(membership.organizationId, prisma);

    return NextResponse.json({ graph });
  } catch (error) {
    logger.error("Failed to build dependency graph:", error);
    return NextResponse.json(
      { error: "Failed to build dependency graph" },
      { status: 500 },
    );
  }
}
