import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { diffWords, cleanForRedline } from "@/lib/atlas/redline";

/**
 * GET /api/admin/atlas-amendments/:id
 *
 * Detail endpoint for one amendment candidate. Returns everything the
 * list endpoint returns plus pre-computed word-level redline segments
 * so the admin UI can render the diff without shipping the full
 * (potentially 400 KB) before/after snapshots.
 *
 * Lazy-fetched on demand — the list view stays lightweight.
 */

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json(
      { error: "Platform-admin role required" },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!id || id.length > 200) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const row = await prisma.atlasSourceCheckHistory.findUnique({
      where: { id },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const before = row.previousContent
      ? cleanForRedline(row.previousContent)
      : "";
    const after = row.newContent ? cleanForRedline(row.newContent) : "";
    const segments = before || after ? diffWords(before, after) : [];

    return NextResponse.json({
      amendment: {
        id: row.id,
        sourceId: row.sourceId,
        jurisdiction: row.jurisdiction,
        contentHash: row.contentHash,
        previousHash: row.previousHash,
        httpStatus: row.httpStatus,
        detectedAt: row.detectedAt,
        diffSummaryAi: row.diffSummaryAi,
        diffKeyChanges: row.diffKeyChanges,
        reviewStatus: row.reviewStatus,
        reviewedAt: row.reviewedAt,
        reviewedBy: row.reviewedBy,
        reviewNote: row.reviewNote,
        integratedAt: row.integratedAt,
        segments,
      },
    });
  } catch (err) {
    logger.error("atlas amendment detail fetch failed", {
      id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
