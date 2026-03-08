import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeCrossTypeIntelligence } from "@/lib/ephemeris/fleet/cross-type-intelligence";

// GET /api/v1/ephemeris/fleet/cross-type
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const intelligence = await computeCrossTypeIntelligence(
      session.user.organizationId,
      prisma,
    );

    return NextResponse.json({ intelligence });
  } catch (error) {
    console.error("Failed to compute cross-type intelligence:", error);
    return NextResponse.json(
      { error: "Failed to compute cross-type intelligence" },
      { status: 500 },
    );
  }
}
