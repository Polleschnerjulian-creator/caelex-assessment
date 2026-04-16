import { NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";

// GET /api/atlas/annotations?sourceId=xxx
export async function GET(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  const annotation = await prisma.atlasAnnotation.findUnique({
    where: {
      userId_sourceId: {
        userId: atlas.userId,
        sourceId,
      },
    },
  });

  return NextResponse.json({ annotation });
}

// POST /api/atlas/annotations — upsert
export async function POST(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { sourceId, text } = body;

  if (!sourceId || typeof text !== "string") {
    return NextResponse.json(
      { error: "sourceId and text required" },
      { status: 400 },
    );
  }

  const annotation = await prisma.atlasAnnotation.upsert({
    where: {
      userId_sourceId: {
        userId: atlas.userId,
        sourceId,
      },
    },
    update: { text },
    create: {
      userId: atlas.userId,
      organizationId: atlas.organizationId,
      sourceId,
      text,
    },
  });

  return NextResponse.json({ annotation });
}

// DELETE /api/atlas/annotations?sourceId=xxx
export async function DELETE(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json({ error: "sourceId required" }, { status: 400 });
  }

  await prisma.atlasAnnotation.deleteMany({
    where: {
      userId: atlas.userId,
      sourceId,
    },
  });

  return NextResponse.json({ success: true });
}
