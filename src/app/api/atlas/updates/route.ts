import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { AtlasUpdateCategory } from "@prisma/client";

/**
 * GET  /api/atlas/updates — List published updates (authenticated users)
 * POST /api/atlas/updates — Create a new update (platform admin only)
 */

export const runtime = "nodejs";

const CreateUpdateSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(5000),
  jurisdiction: z.string().max(10).nullish(),
  sourceId: z.string().max(200).nullish(),
  category: z.nativeEnum(AtlasUpdateCategory).default("DATA_UPDATE"),
  publish: z.boolean().optional().default(false),
});

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

  return NextResponse.json(
    { updates },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  // C1: Platform-admin gate — "admin only" now actually enforced.
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Platform-admin role required" },
      { status: 403 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = CreateUpdateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 },
    );
  }

  try {
    const update = await prisma.atlasUpdate.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        jurisdiction: parsed.data.jurisdiction ?? null,
        sourceId: parsed.data.sourceId ?? null,
        category: parsed.data.category,
        createdBy: admin.userId,
        isPublished: parsed.data.publish,
        publishedAt: parsed.data.publish ? new Date() : null,
      },
    });

    logger.info("Atlas update created", {
      updateId: update.id,
      createdBy: admin.userId,
      published: parsed.data.publish,
    });

    return NextResponse.json({ update }, { status: 201 });
  } catch (err) {
    logger.error("Atlas update creation failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
