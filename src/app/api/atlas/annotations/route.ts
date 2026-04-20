import { NextResponse } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/** H5: validate sourceId shape to prevent arbitrary garbage in the table. */
const SourceIdSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9_.-]+$/, {
    message: "sourceId must be alphanumeric with -_. only",
  });

const UpsertSchema = z.object({
  sourceId: SourceIdSchema,
  text: z.string().max(10_000),
});

/** GET /api/atlas/annotations?sourceId=xxx */
export async function GET(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawSourceId = searchParams.get("sourceId");
  const parsed = SourceIdSchema.safeParse(rawSourceId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sourceId" }, { status: 400 });
  }

  // H5: scope by organisation so annotations don't follow a user across orgs
  const annotation = await prisma.atlasAnnotation.findFirst({
    where: {
      userId: atlas.userId,
      sourceId: parsed.data,
      organizationId: atlas.organizationId,
    },
  });

  return NextResponse.json({ annotation });
}

/** POST /api/atlas/annotations — upsert */
export async function POST(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // H1: user-keyed rate limit on writes
  const rl = await checkRateLimit("api", getIdentifier(request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const rawBody = await request.json().catch(() => null);
  const parsed = UpsertSchema.safeParse(rawBody);
  if (!parsed.success) {
    // Audit L5: don't leak internal Zod schema shape to unauthenticated
    // probers. The server log has the full error, the client just gets
    // the field list (no types, no internal paths).
    logger.warn("Atlas annotation payload rejected", {
      issues: parsed.error.issues,
      userId: atlas.userId,
    });
    const fields = parsed.error.issues
      .map((i) => i.path.join("."))
      .filter(Boolean);
    return NextResponse.json(
      { error: "Invalid payload", fields },
      { status: 400 },
    );
  }

  try {
    const annotation = await prisma.atlasAnnotation.upsert({
      where: {
        userId_sourceId: {
          userId: atlas.userId,
          sourceId: parsed.data.sourceId,
        },
      },
      update: {
        text: parsed.data.text,
        organizationId: atlas.organizationId,
      },
      create: {
        userId: atlas.userId,
        organizationId: atlas.organizationId,
        sourceId: parsed.data.sourceId,
        text: parsed.data.text,
      },
    });

    return NextResponse.json({ annotation });
  } catch (err) {
    logger.error("Atlas annotation upsert failed", { error: err });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/** DELETE /api/atlas/annotations?sourceId=xxx */
export async function DELETE(request: Request) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = SourceIdSchema.safeParse(searchParams.get("sourceId"));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sourceId" }, { status: 400 });
  }

  // L7: use deleteMany as an idempotent no-op-on-missing. The unique
  // composite key would be (userId, sourceId) via prisma.delete, but the
  // row may legitimately not exist yet (users toggling annotations
  // before ever saving) and we don't want a 404 — a successful no-op
  // is the right UX.
  const result = await prisma.atlasAnnotation.deleteMany({
    where: {
      userId: atlas.userId,
      sourceId: parsed.data,
      organizationId: atlas.organizationId,
    },
  });

  return NextResponse.json({ success: true, deleted: result.count });
}
