import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";
import { verifyChain, getLatestHash } from "@/lib/audit-hash.server";

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
 * Cron: Audit chain external anchoring (SVA-38)
 *
 * Verifies the audit hash chain for all organizations and logs the latest
 * chain checkpoint hash to Vercel logs, which serve as the external anchor
 * since they are immutable and externally accessible.
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
    logger.info("[audit-chain-anchor] Starting audit chain verification...");

    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    const anchors: Array<{
      org_id: string;
      org_name: string;
      valid: boolean;
      entries_checked: number;
      latest_hash_prefix: string;
    }> = [];

    let allValid = true;

    for (const org of organizations) {
      try {
        const result = await verifyChain(org.id);
        const latestHash = await getLatestHash(org.id);

        const hashPrefix = latestHash.slice(0, 16);

        logger.info(
          `[audit-chain-anchor] Org ${org.name}: valid=${result.valid}, entries=${result.checkedEntries}, latestHash=${hashPrefix}...`,
        );

        if (!result.valid) {
          allValid = false;
        }

        anchors.push({
          org_id: org.id,
          org_name: org.name,
          valid: result.valid,
          entries_checked: result.checkedEntries,
          latest_hash_prefix: hashPrefix,
        });
      } catch (err) {
        logger.error(
          `[audit-chain-anchor] Failed to verify chain for org ${org.name}`,
          err,
        );
        allValid = false;
        anchors.push({
          org_id: org.id,
          org_name: org.name,
          valid: false,
          entries_checked: 0,
          latest_hash_prefix: "ERROR",
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info("[audit-chain-anchor] Anchoring complete", {
      organizations_checked: organizations.length,
      all_valid: allValid,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      organizations_checked: organizations.length,
      all_valid: allValid,
      anchors,
      anchored_at: new Date().toISOString(),
      duration: `${duration}ms`,
    });
  } catch (error) {
    logger.error("[audit-chain-anchor] Cron failed", error);
    return NextResponse.json(
      {
        success: false,
        error: getSafeErrorMessage(error, "Audit chain anchoring failed"),
        anchored_at: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
