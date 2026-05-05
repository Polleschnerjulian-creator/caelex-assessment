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

  // T4-9 (audit fix 2026-05-05): cache the latest STH for 5 minutes
  // at the edge with a 1-hour stale-while-revalidate window. STHs
  // are signed periodically by the cron, so a 5-minute lag is well
  // within the consistency tolerance — the consistency-proof endpoint
  // covers any gap a verifier needs to reconcile. Greatly reduces
  // load on `/sth/latest`, which monitoring services and pinning
  // infrastructure poll regularly.
  return NextResponse.json(
    {
      treeSize: sth.treeSize,
      rootHash: sth.rootHash,
      issuerKeyId: sth.issuerKeyId,
      signature: sth.signature,
      timestamp: sth.timestamp.toISOString(),
      version: sth.version,
    },
    {
      headers: {
        "Cache-Control":
          "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
