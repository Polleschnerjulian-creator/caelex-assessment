import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { diffWords, cleanForRedline } from "@/lib/atlas/redline";

/**
 * GET /api/atlas/sources/:id/history
 *
 * Public read-only endpoint. Returns the amendment history for one
 * indexed legal source — each row carries the Claude summary, the
 * timestamp, and the pre-computed word-level redline segments so the
 * client can render the diff without doing work.
 *
 * Only returns APPROVED or INTEGRATED entries — PENDING candidates
 * that haven't been reviewed by an admin should not be public because
 * they may be noise the AI summariser misclassified. REJECTED entries
 * are also excluded.
 */

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id || id.length > 200) {
    return NextResponse.json({ error: "Invalid source id" }, { status: 400 });
  }

  try {
    const rows = await prisma.atlasSourceCheckHistory.findMany({
      where: {
        sourceId: id,
        reviewStatus: "APPROVED",
      },
      orderBy: [{ detectedAt: "desc" }],
      take: 50,
    });

    const amendments = rows.map((row) => {
      const before = row.previousContent
        ? cleanForRedline(row.previousContent)
        : "";
      const after = row.newContent ? cleanForRedline(row.newContent) : "";
      const segments = before || after ? diffWords(before, after) : [];
      return {
        id: row.id,
        detectedAt: row.detectedAt,
        diffSummaryAi: row.diffSummaryAi,
        diffKeyChanges: row.diffKeyChanges,
        integratedAt: row.integratedAt,
        segments,
      };
    });

    return NextResponse.json({ amendments });
  } catch (err) {
    logger.error("atlas source history fetch failed", {
      sourceId: id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load history" },
      { status: 500 },
    );
  }
}
