import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { autoAttestFromSentinel } from "@/lib/verity/evaluation/auto-attestation.server";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";

export const runtime = "nodejs";
export const maxDuration = 60;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

/**
 * Cron: Sentinel → Verity Auto-Attestation
 * Schedule: Every 4 hours at :15 (15 min after sentinel-cross-verify)
 *
 * Scans all orgs with active Sentinel agents, matches telemetry data
 * against regulation thresholds, and auto-generates Verity attestations.
 * Handles PASS↔FAIL revocation when compliance status changes.
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Starting Sentinel auto-attestation cron...");

    const result = await autoAttestFromSentinel(prisma);

    const duration = Date.now() - startTime;

    logger.info("Sentinel auto-attestation cron complete", {
      orgs: result.orgs_processed,
      created: result.attestations_created,
      revoked: result.attestations_revoked,
      skipped: result.skipped,
      errors: result.errors,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      ...result,
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Sentinel auto-attestation cron failed", error);
    return NextResponse.json(
      {
        success: false,
        error: getSafeErrorMessage(error, "Auto-attestation failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
