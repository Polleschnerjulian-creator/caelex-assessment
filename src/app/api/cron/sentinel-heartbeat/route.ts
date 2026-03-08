import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
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
 * Cron: Sentinel agent heartbeat monitoring
 * Schedule: Daily at 00:30 UTC
 *
 * Detects ACTIVE agents that haven't sent packets in 24 hours.
 * Creates notifications for org admins.
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
    logger.info("Starting Sentinel heartbeat check...");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Find active agents with no recent packets
    const silentAgents = await prisma.sentinelAgent.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { lastPacketAt: { lt: twentyFourHoursAgo } },
          { lastPacketAt: null },
        ],
      },
      select: {
        id: true,
        sentinelId: true,
        name: true,
        organizationId: true,
        lastPacketAt: true,
        lastSeen: true,
      },
    });

    let notified = 0;

    for (const agent of silentAgents) {
      try {
        // Find org admins to notify
        const admins = await prisma.organizationMember.findMany({
          where: {
            organizationId: agent.organizationId,
            role: { in: ["OWNER", "ADMIN"] },
          },
          select: { userId: true },
        });

        const lastSeen = agent.lastPacketAt
          ? agent.lastPacketAt.toISOString()
          : "never";

        for (const admin of admins) {
          // Dedup: only one notification per agent per day
          const entityId = `heartbeat_${agent.id}_${new Date().toISOString().slice(0, 10)}`;
          const existing = await prisma.notification.findFirst({
            where: {
              userId: admin.userId,
              entityType: "sentinel_agent",
              entityId,
            },
          });

          if (existing) continue;

          await prisma.notification.create({
            data: {
              userId: admin.userId,
              type: "DEADLINE_REMINDER",
              title: `Sentinel agent "${agent.name}" is silent`,
              message: `Agent ${agent.sentinelId} has not reported any data in over 24 hours (last seen: ${lastSeen}). Check agent status and connectivity.`,
              actionUrl: "/dashboard/sentinel",
              entityType: "sentinel_agent",
              entityId,
              severity: "WARNING",
            },
          });
          notified++;
        }
      } catch (err) {
        logger.error(
          `Heartbeat notification failed for agent ${agent.sentinelId}`,
          err,
        );
      }
    }

    const duration = Date.now() - startTime;

    logger.info("Sentinel heartbeat check complete", {
      silentAgents: silentAgents.length,
      notified,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      silent_agents: silentAgents.length,
      notifications_sent: notified,
      agents: silentAgents.map((a) => ({
        sentinel_id: a.sentinelId,
        name: a.name,
        last_packet_at: a.lastPacketAt,
      })),
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Sentinel heartbeat cron failed", error);
    return NextResponse.json(
      {
        success: false,
        error: getSafeErrorMessage(error, "Heartbeat check failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
