import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/atlas/updates — List published updates (for all users)
 * POST /api/atlas/updates — Create a new update (admin only)
 */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const updates = await prisma.atlasUpdate.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ updates });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { title, description, jurisdiction, sourceId, category } = body as {
    title: string;
    description: string;
    jurisdiction?: string;
    sourceId?: string;
    category?: string;
  };

  if (!title || !description) {
    return NextResponse.json(
      { error: "Title and description required" },
      { status: 400 },
    );
  }

  const update = await prisma.atlasUpdate.create({
    data: {
      title,
      description,
      jurisdiction: jurisdiction || null,
      sourceId: sourceId || null,
      category: (category as any) || "DATA_UPDATE",
      createdBy: session.user.id,
      isPublished: true,
    },
  });

  return NextResponse.json({ update }, { status: 201 });
}
