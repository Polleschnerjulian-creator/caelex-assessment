import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { crossVerifyAgent } from "@/lib/services/cross-verification.server";
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
 * Cron: Automated Sentinel cross-verification
 * Schedule: Every 4 hours
 *
 * Finds all ACTIVE agents with unverified orbital packets
 * and runs cross-verification against CelesTrak GP data.
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
    logger.info("Starting Sentinel cross-verification cron...");

    // Find all active agents with unverified orbital packets
    const agents = await prisma.sentinelAgent.findMany({
      where: {
        status: "ACTIVE",
        packets: {
          some: {
            dataPoint: "orbital_parameters",
            crossVerified: false,
            satelliteNorad: { not: null },
          },
        },
      },
      select: { id: true, sentinelId: true, name: true },
    });

    const results: Array<{
      agent: string;
      total: number;
      verified: number;
      failed: number;
      skipped: number;
    }> = [];

    for (const agent of agents) {
      try {
        const result = await crossVerifyAgent(agent.id);
        results.push({
          agent: agent.sentinelId,
          ...result,
        });
        logger.info(`Cross-verified agent ${agent.sentinelId}`, result);
      } catch (err) {
        logger.error(`Cross-verify failed for agent ${agent.sentinelId}`, err);
        results.push({
          agent: agent.sentinelId,
          total: 0,
          verified: 0,
          failed: 0,
          skipped: 0,
        });
      }
    }

    const totalVerified = results.reduce((sum, r) => sum + r.verified, 0);
    const totalProcessed = results.reduce((sum, r) => sum + r.total, 0);
    const duration = Date.now() - startTime;

    logger.info("Sentinel cross-verification cron complete", {
      agents: agents.length,
      totalProcessed,
      totalVerified,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      agents_processed: agents.length,
      total_packets: totalProcessed,
      total_verified: totalVerified,
      results,
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Sentinel cross-verification cron failed", error);
    return NextResponse.json(
      {
        success: false,
        error: getSafeErrorMessage(error, "Cross-verification failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
