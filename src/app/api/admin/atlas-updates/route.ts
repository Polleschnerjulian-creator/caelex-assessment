import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/atlas-updates — List source checks for admin review
 * PATCH /api/admin/atlas-updates — Mark a check as reviewed/dismissed
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checks = await prisma.atlasSourceCheck.findMany({
    orderBy: [
      { status: "asc" }, // CHANGED first
      { lastChanged: "desc" },
      { lastChecked: "desc" },
    ],
  });

  return NextResponse.json({ checks });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sourceId, action, note } = body as {
    sourceId: string;
    action: "reviewed" | "dismissed";
    note?: string;
  };

  if (!sourceId || !action) {
    return NextResponse.json(
      { error: "Missing sourceId or action" },
      { status: 400 },
    );
  }

  const updated = await prisma.atlasSourceCheck.update({
    where: { sourceId },
    data: {
      status: action === "reviewed" ? "REVIEWED" : "DISMISSED",
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
      reviewNote: note || null,
    },
  });

  return NextResponse.json({ check: updated });
}
