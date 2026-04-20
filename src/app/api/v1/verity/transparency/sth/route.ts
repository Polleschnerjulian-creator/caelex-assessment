import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/transparency/sth?size=N
 *
 * Returns the signed tree head at exactly treeSize=N, if present.
 * Used for historical comparison (and, in a later pillar, consistency
 * proofs between two STHs).
 *
 * Auth: NONE — public, rate-limited via verity_public tier.
 */
export async function GET(request: NextRequest) {
  const rl = await checkRateLimit("verity_public", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const sizeParam = request.nextUrl.searchParams.get("size");
  if (!sizeParam) {
    return NextResponse.json(
      { error: "query param `size` is required" },
      { status: 400 },
    );
  }
  const treeSize = Number(sizeParam);
  if (!Number.isInteger(treeSize) || treeSize < 1) {
    return NextResponse.json(
      { error: "`size` must be a positive integer" },
      { status: 400 },
    );
  }

  const sth = await prisma.verityLogSTH.findUnique({ where: { treeSize } });
  if (!sth) {
    return NextResponse.json(
      { error: `No STH at treeSize=${treeSize}` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    treeSize: sth.treeSize,
    rootHash: sth.rootHash,
    issuerKeyId: sth.issuerKeyId,
    signature: sth.signature,
    timestamp: sth.timestamp.toISOString(),
    version: sth.version,
  });
}
