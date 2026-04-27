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
import { logAuditEvent } from "@/lib/audit";

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

  // MED-3: read-path rate-limit. POST already has one; without this
  // the GET could be looped to enumerate which sourceIds a user has
  // annotated and to load the DB. Same `api` tier as the write path
  // for consistency.
  const rl = await checkRateLimit("api", getIdentifier(request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

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
    // Capture the previous value BEFORE the upsert so the audit log
    // records a real before/after diff instead of "unknown → new".
    const previous = await prisma.atlasAnnotation.findUnique({
      where: {
        userId_organizationId_sourceId: {
          userId: atlas.userId,
          organizationId: atlas.organizationId,
          sourceId: parsed.data.sourceId,
        },
      },
      select: { text: true },
    });

    // C-3 fix: composite key now includes organizationId so annotations
    // are uniquely scoped per (user, org, source) — prevents cross-org
    // silent overwrites for users with memberships in multiple firms.
    const annotation = await prisma.atlasAnnotation.upsert({
      where: {
        userId_organizationId_sourceId: {
          userId: atlas.userId,
          organizationId: atlas.organizationId,
          sourceId: parsed.data.sourceId,
        },
      },
      update: {
        text: parsed.data.text,
      },
      create: {
        userId: atlas.userId,
        organizationId: atlas.organizationId,
        sourceId: parsed.data.sourceId,
        text: parsed.data.text,
      },
    });

    // H-2 fix: annotations can contain firm-confidential case notes,
    // so every mutation belongs in the tamper-evident audit chain.
    await logAuditEvent({
      userId: atlas.userId,
      organizationId: atlas.organizationId,
      action: previous
        ? "atlas_annotation_updated"
        : "atlas_annotation_created",
      entityType: "atlas_annotation",
      entityId: parsed.data.sourceId,
      previousValue: previous ? { text: previous.text } : undefined,
      newValue: { text: parsed.data.text },
      description: `Annotation on source ${parsed.data.sourceId}`,
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
  // composite key would be (userId, organizationId, sourceId) via
  // prisma.delete, but the row may legitimately not exist yet (users
  // toggling annotations before ever saving) and we don't want a 404 —
  // a successful no-op is the right UX.
  const previous = await prisma.atlasAnnotation.findFirst({
    where: {
      userId: atlas.userId,
      sourceId: parsed.data,
      organizationId: atlas.organizationId,
    },
    select: { text: true },
  });

  const result = await prisma.atlasAnnotation.deleteMany({
    where: {
      userId: atlas.userId,
      sourceId: parsed.data,
      organizationId: atlas.organizationId,
    },
  });

  // H-2 fix: audit the deletion if a row actually existed. No-op
  // deletes (user toggling before ever saving) don't need audit noise.
  if (previous && result.count > 0) {
    await logAuditEvent({
      userId: atlas.userId,
      organizationId: atlas.organizationId,
      action: "atlas_annotation_deleted",
      entityType: "atlas_annotation",
      entityId: parsed.data,
      previousValue: { text: previous.text },
      description: `Annotation deleted from source ${parsed.data}`,
    });
  }

  return NextResponse.json({ success: true, deleted: result.count });
}
