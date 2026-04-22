import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * GET   /api/admin/atlas-amendments — list detected amendment candidates
 * PATCH /api/admin/atlas-amendments  — approve / reject one by id
 *
 * An "amendment candidate" is an AtlasSourceCheckHistory row. The cron
 * writes one every time a source URL's content hash changes and the
 * diff-summariser has classified the change. Admins review and either:
 *   - APPROVED: this is a real legal change, flag for data-file update
 *   - REJECTED: false positive, noise, or already integrated
 *
 * Cosmetic-only diffs are auto-REJECTED by the cron, so this queue
 * only shows changes Claude thought were substantive.
 */

export const runtime = "nodejs";

const QuerySchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ALL"]).default("PENDING"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const PatchSchema = z.object({
  id: z.string().min(1).max(200),
  action: z.enum(["approve", "reject", "mark_integrated"]),
  note: z.string().max(2000).optional(),
});

export async function GET(request: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Platform-admin role required" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const parsedQuery = QuerySchema.safeParse(
    Object.fromEntries(url.searchParams),
  );
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "Invalid query params", details: parsedQuery.error.format() },
      { status: 400 },
    );
  }

  const { status, limit } = parsedQuery.data;
  const where = status === "ALL" ? {} : { reviewStatus: status };

  const rows = await prisma.atlasSourceCheckHistory.findMany({
    where,
    orderBy: [{ detectedAt: "desc" }],
    take: limit,
  });

  // Attach the underlying source URL so the UI can link to it without
  // another round-trip. Cheap join — we already have the sourceIds.
  const sourceIds = Array.from(new Set(rows.map((r) => r.sourceId)));
  const checks = await prisma.atlasSourceCheck.findMany({
    where: { sourceId: { in: sourceIds } },
    select: { sourceId: true, sourceUrl: true },
  });
  const urlMap = new Map(checks.map((c) => [c.sourceId, c.sourceUrl]));

  return NextResponse.json({
    amendments: rows.map((r) => ({
      ...r,
      sourceUrl: urlMap.get(r.sourceId) ?? null,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Platform-admin role required" },
      { status: 403 },
    );
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.format() },
      { status: 400 },
    );
  }

  const { id, action, note } = parsed.data;
  const now = new Date();

  try {
    const update =
      action === "approve"
        ? {
            reviewStatus: "APPROVED" as const,
            reviewedAt: now,
            reviewedBy: admin.userId,
            reviewNote: note ?? null,
          }
        : action === "reject"
          ? {
              reviewStatus: "REJECTED" as const,
              reviewedAt: now,
              reviewedBy: admin.userId,
              reviewNote: note ?? null,
            }
          : {
              // mark_integrated — the amendment has been written into
              // the static data file; keep the APPROVED state but stamp
              // integratedAt so it drops out of the active queue.
              integratedAt: now,
              reviewedBy: admin.userId,
              reviewNote: note ?? null,
            };

    const updated = await prisma.atlasSourceCheckHistory.update({
      where: { id },
      data: update,
    });

    logger.info("Atlas amendment reviewed", {
      id,
      action,
      reviewedBy: admin.userId,
    });

    return NextResponse.json({ amendment: updated });
  } catch (err) {
    logger.error("Atlas amendment update failed", { id, error: err });
    return NextResponse.json(
      { error: "Amendment not found or update failed" },
      { status: 404 },
    );
  }
}
