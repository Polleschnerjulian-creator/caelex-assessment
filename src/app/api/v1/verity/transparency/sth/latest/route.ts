import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

/**
 * GET /api/v1/verity/transparency/sth/latest
 *
 * Returns the most recently signed tree head of the Verity
 * transparency log. Third parties can pin this (RSS, GitHub release,
 * email digest) to detect retroactive tampering.
 *
 * Auth: NONE — public, rate-limited via verity_public tier.
 */
export async function GET(request: NextRequest) {
  const rl = await checkRateLimit("verity_public", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const sth = await prisma.verityLogSTH.findFirst({
    orderBy: { treeSize: "desc" },
  });

  if (!sth) {
    return NextResponse.json(
      { error: "No STH available yet — the log is empty or no cron has run" },
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
