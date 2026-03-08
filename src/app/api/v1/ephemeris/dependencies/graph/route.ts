import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildDependencyGraph } from "@/lib/ephemeris/cross-type/dependency-graph";

// GET /api/v1/ephemeris/dependencies/graph
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const graph = await buildDependencyGraph(
      session.user.organizationId,
      prisma,
    );

    return NextResponse.json({ graph });
  } catch (error) {
    console.error("Failed to build dependency graph:", error);
    return NextResponse.json(
      { error: "Failed to build dependency graph" },
      { status: 500 },
    );
  }
}
