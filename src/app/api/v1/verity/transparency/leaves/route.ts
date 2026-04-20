import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/transparency/leaves?from=N&limit=M
 *
 * Paginated dump of log leaves, ordered by leafIndex. Used by
 * external auditors/mirrors that want to reconstruct the tree
 * from scratch and re-derive each STH's root locally.
 *
 * Auth: NONE — public, rate-limited via verity_public tier.
 * Limits: from >= 0 (default 0), 1 <= limit <= 500 (default 100).
 */
export async function GET(request: NextRequest) {
  const rl = await checkRateLimit("verity_public", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const { searchParams } = request.nextUrl;
  const from = Number(searchParams.get("from") ?? "0");
  const limit = Number(searchParams.get("limit") ?? "100");

  if (!Number.isInteger(from) || from < 0) {
    return NextResponse.json(
      { error: "`from` must be a non-negative integer" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return NextResponse.json(
      { error: "`limit` must be an integer in [1, 500]" },
      { status: 400 },
    );
  }

  const leaves = await prisma.verityLogLeaf.findMany({
    where: { leafIndex: { gte: from } },
    orderBy: { leafIndex: "asc" },
    take: limit,
    select: {
      leafIndex: true,
      attestationId: true,
      leafHash: true,
      appendedAt: true,
    },
  });

  const total = await prisma.verityLogLeaf.count();

  return NextResponse.json({
    from,
    limit,
    count: leaves.length,
    total,
    leaves: leaves.map((l) => ({
      leafIndex: l.leafIndex,
      attestationId: l.attestationId,
      leafHash: l.leafHash,
      appendedAt: l.appendedAt.toISOString(),
    })),
  });
}
