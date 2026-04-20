import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { signNewSTH } from "@/lib/verity/transparency/log-store";

export const runtime = "nodejs";
export const maxDuration = 120;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(`Bearer ${secret}`);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Cron: verity-sth-sign
 * Schedule: daily at 13:00 UTC (see vercel.json)
 *
 * Backfills any missing VerityLogLeaf rows, then signs a new
 * VerityLogSTH if the tree has grown since the previous STH.
 * Idempotent — rerunning within the same tree state is a no-op.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sth = await signNewSTH(prisma);
    if (!sth) {
      logger.info("Verity STH cron — no new leaves, skipped");
      return NextResponse.json({ ok: true, signed: false });
    }
    logger.info("Verity STH cron — signed new STH", {
      treeSize: sth.treeSize,
      rootHash: sth.rootHash,
      issuerKeyId: sth.issuerKeyId,
    });
    return NextResponse.json({
      ok: true,
      signed: true,
      treeSize: sth.treeSize,
      rootHash: sth.rootHash,
      issuerKeyId: sth.issuerKeyId,
      timestamp: sth.timestamp,
    });
  } catch (err) {
    logger.error("Verity STH cron failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
