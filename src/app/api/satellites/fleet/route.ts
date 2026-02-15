import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { FleetResponse } from "@/lib/satellites/types";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find user's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({
        spacecraft: [],
        noradIds: [],
      } satisfies FleetResponse);
    }

    const spacecraft = await prisma.spacecraft.findMany({
      where: { organizationId: membership.organizationId },
      select: {
        id: true,
        name: true,
        noradId: true,
        cosparId: true,
        orbitType: true,
        altitudeKm: true,
        inclinationDeg: true,
        status: true,
        missionType: true,
      },
    });

    const noradIds = spacecraft
      .map((s) => s.noradId)
      .filter((id): id is string => id != null);

    return NextResponse.json({
      spacecraft,
      noradIds,
    } satisfies FleetResponse);
  } catch (error) {
    console.error("Fleet fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch fleet data" },
      { status: 500 },
    );
  }
}
