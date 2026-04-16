import { NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";

// GET /api/atlas/settings/profile
export async function GET() {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    name: atlas.userName,
    email: atlas.userEmail,
    language: atlas.userLanguage,
  });
}

// PATCH /api/atlas/settings/profile
export async function PATCH(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const updates: Record<string, string> = {};

  if (typeof body.name === "string") {
    updates.name = body.name.trim();
  }
  if (
    typeof body.language === "string" &&
    ["en", "de"].includes(body.language)
  ) {
    updates.language = body.language;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: atlas.userId },
    data: updates,
    select: { name: true, language: true },
  });

  return NextResponse.json(user);
}
