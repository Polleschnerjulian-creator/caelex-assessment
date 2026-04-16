import { NextResponse } from "next/server";
import { getAtlasAuth, isOwner } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";

// GET /api/atlas/settings/firm
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    name: atlas.organizationName,
    logoUrl: atlas.organizationLogo,
    slug: atlas.organizationSlug,
    isOwner: isOwner(atlas.role),
  });
}

// PATCH /api/atlas/settings/firm — Owner only
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isOwner(atlas.role)) {
    return NextResponse.json(
      { error: "Only the owner can edit firm settings" },
      { status: 403 },
    );
  }

  const body = await request.json();
  const updates: Record<string, string | null> = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (body.logoUrl !== undefined) {
    updates.logoUrl = body.logoUrl; // null to remove
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const org = await prisma.organization.update({
    where: { id: atlas.organizationId },
    data: updates,
    select: { name: true, logoUrl: true },
  });

  return NextResponse.json(org);
}
