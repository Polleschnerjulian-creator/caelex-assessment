import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { sendEmail, isEmailConfigured } from "@/lib/email";

export const runtime = "nodejs";
export const maxDuration = 30;

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

// ─── Tier Colors ────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  EMERGENCY: "#EF4444",
  HIGH: "#F59E0B",
  ELEVATED: "#EAB308",
  MONITOR: "#3B82F6",
  INFORMATIONAL: "#64748B",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface DigestResult {
  orgsProcessed: number;
  emailsSent: number;
  errors: string[];
  durationMs: number;
}

interface EventRow {
  id: string;
  riskTier: string;
  noradId: string;
  threatNoradId: string;
  latestPc: number;
  tca: Date;
  status: string;
}

/**
 * Cron endpoint for daily CA (Conjunction Assessment) digest emails.
 * Schedule: Daily at 07:30 UTC
 *
 * For each org with active (non-CLOSED) conjunction events:
 * 1. Fetches top 20 events sorted by risk tier then TCA
 * 2. Counts EMERGENCY, HIGH, and overdue events
 * 3. Builds an HTML summary email
 * 4. Sends to org OWNER/ADMIN/MANAGER members
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[Shield] CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    logger.info("[Shield] Email not configured, skipping CA digest");
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Email not configured",
      processedAt: new Date().toISOString(),
    });
  }

  try {
    logger.info("[Shield] Starting daily CA digest...");
    const result = await buildAndSendDigests();

    logger.info("[Shield] CA digest complete", {
      orgsProcessed: result.orgsProcessed,
      emailsSent: result.emailsSent,
      errors: result.errors.length,
      duration: `${result.durationMs}ms`,
    });

    return NextResponse.json({
      success: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Shield] CA digest failed", error);
    return NextResponse.json(
      {
        success: false,
        error: getSafeErrorMessage(error, "CA digest failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}

// ─── Core Digest Logic ──────────────────────────────────────────────────────

async function buildAndSendDigests(): Promise<DigestResult> {
  const startTime = Date.now();
  let orgsProcessed = 0;
  let emailsSent = 0;
  const errors: string[] = [];

  // Find all org IDs that have at least one non-CLOSED conjunction event
  const orgGroups = await prisma.conjunctionEvent.groupBy({
    by: ["organizationId"],
    where: {
      status: { not: "CLOSED" },
    },
  });

  for (const group of orgGroups) {
    try {
      const orgId = group.organizationId;

      // Fetch top 20 active events, sorted by riskTier asc (EMERGENCY first) then TCA asc
      const events = await prisma.conjunctionEvent.findMany({
        where: {
          organizationId: orgId,
          status: { not: "CLOSED" },
        },
        orderBy: [{ riskTier: "asc" }, { tca: "asc" }],
        take: 20,
        select: {
          id: true,
          riskTier: true,
          noradId: true,
          threatNoradId: true,
          latestPc: true,
          tca: true,
          status: true,
          decision: true,
        },
      });

      if (events.length === 0) continue;

      // Count totals
      const totalActive = events.length;
      const emergencyCount = events.filter(
        (e) => e.riskTier === "EMERGENCY",
      ).length;
      const highCount = events.filter((e) => e.riskTier === "HIGH").length;
      const overdueCount = events.filter(
        (e) => e.status === "ASSESSMENT_REQUIRED" && !e.decision,
      ).length;

      // Build HTML email
      const html = buildDigestHtml(events, {
        totalActive,
        emergencyCount,
        highCount,
        overdueCount,
      });

      // Build subject
      const subject = buildSubject(totalActive, emergencyCount);

      // Find org OWNER/ADMIN/MANAGER members with email addresses
      const recipients = await prisma.organizationMember.findMany({
        where: {
          organizationId: orgId,
          role: { in: ["OWNER", "ADMIN", "MANAGER"] },
          user: {
            email: { not: null },
          },
        },
        select: {
          userId: true,
          user: {
            select: { email: true },
          },
        },
      });

      // Send email to each recipient
      for (const recipient of recipients) {
        if (!recipient.user.email) continue;

        try {
          const result = await sendEmail({
            to: recipient.user.email,
            subject,
            html,
            userId: recipient.userId,
            notificationType: "weekly_digest",
            entityType: "summary",
          });

          if (result.success) {
            emailsSent++;
          } else {
            errors.push(
              `Failed to send to ${recipient.user.email}: ${result.error}`,
            );
          }
        } catch (error) {
          const msg = `Email to ${recipient.user.email}: ${error instanceof Error ? error.message : "Unknown"}`;
          errors.push(msg);
          logger.error(`[Shield] ${msg}`);
        }
      }

      orgsProcessed++;
    } catch (error) {
      const msg = `Org ${group.organizationId}: ${error instanceof Error ? error.message : "Unknown"}`;
      errors.push(msg);
      logger.error(`[Shield] ${msg}`);
    }
  }

  return {
    orgsProcessed,
    emailsSent,
    errors: errors.slice(0, 20),
    durationMs: Date.now() - startTime,
  };
}

// ─── Email Building ─────────────────────────────────────────────────────────

function buildSubject(totalActive: number, emergencyCount: number): string {
  const base = `Shield CA Digest: ${totalActive} active event${totalActive === 1 ? "" : "s"}`;
  return emergencyCount > 0 ? `${base} — EMERGENCY` : base;
}

function buildDigestHtml(
  events: EventRow[],
  counts: {
    totalActive: number;
    emergencyCount: number;
    highCount: number;
    overdueCount: number;
  },
): string {
  const headerColor = counts.emergencyCount > 0 ? "#EF4444" : "#1E293B";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.caelex.io";
  const dashboardUrl = `${appUrl}/dashboard/shield`;

  // Build summary highlights
  const highlights: string[] = [];
  if (counts.emergencyCount > 0) {
    highlights.push(
      `<span style="color: #EF4444; font-weight: 700;">${counts.emergencyCount} EMERGENCY</span>`,
    );
  }
  if (counts.highCount > 0) {
    highlights.push(
      `<span style="color: #F59E0B; font-weight: 700;">${counts.highCount} HIGH</span>`,
    );
  }
  if (counts.overdueCount > 0) {
    highlights.push(
      `<span style="color: #EF4444; font-weight: 700;">${counts.overdueCount} overdue</span>`,
    );
  }

  const highlightLine =
    highlights.length > 0 ? ` (${highlights.join(", ")})` : "";

  // Build table rows (max 10)
  const displayEvents = events.slice(0, 10);
  const tableRows = displayEvents
    .map((event) => {
      const tierColor = TIER_COLORS[event.riskTier] || "#64748B";
      const pcFormatted =
        event.latestPc < 0.001
          ? event.latestPc.toExponential(2)
          : event.latestPc.toFixed(4);
      const tcaFormatted =
        new Date(event.tca).toISOString().slice(0, 16).replace("T", " ") +
        " UTC";

      return `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; background: ${tierColor}20; color: ${tierColor}; font-weight: 600; font-size: 12px;">
              ${event.riskTier}
            </span>
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155; color: #E2E8F0; font-family: monospace; font-size: 13px;">
            ${event.noradId} / ${event.threatNoradId}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155; color: #E2E8F0; font-family: monospace; font-size: 13px;">
            ${pcFormatted}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155; color: #94A3B8; font-size: 13px;">
            ${tcaFormatted}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #334155; color: #94A3B8; font-size: 13px;">
            ${event.status.replace(/_/g, " ")}
          </td>
        </tr>`;
    })
    .join("");

  const remainingNote =
    events.length > 10
      ? `<p style="color: #94A3B8; font-size: 13px; margin-top: 12px;">+ ${events.length - 10} more event${events.length - 10 === 1 ? "" : "s"} not shown</p>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #0A0F1E; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0F1E;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width: 640px; width: 100%;">

          <!-- Header Bar -->
          <tr>
            <td style="background: ${headerColor}; padding: 20px 24px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 700;">
                Shield — Daily CA Digest
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background: #0F172A; padding: 24px; border: 1px solid #334155; border-top: none;">

              <!-- Summary -->
              <p style="color: #E2E8F0; font-size: 15px; margin: 0 0 20px 0;">
                <strong>${counts.totalActive} active event${counts.totalActive === 1 ? "" : "s"}</strong>${highlightLine}
              </p>

              <!-- Events Table -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background: #1E293B;">
                    <th style="padding: 10px 12px; text-align: left; color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155;">Tier</th>
                    <th style="padding: 10px 12px; text-align: left; color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155;">Objects</th>
                    <th style="padding: 10px 12px; text-align: left; color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155;">Pc</th>
                    <th style="padding: 10px 12px; text-align: left; color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155;">TCA</th>
                    <th style="padding: 10px 12px; text-align: left; color: #94A3B8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #334155;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>

              ${remainingNote}

              <!-- CTA Button -->
              <div style="text-align: center; margin-top: 28px;">
                <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 28px; background: #10B981; color: #FFFFFF; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  View Shield Dashboard
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 16px 24px; border: 1px solid #334155; border-top: none; border-radius: 0 0 8px 8px; background: #0F172A;">
              <p style="margin: 0; color: #64748B; font-size: 12px; text-align: center;">
                Generated by Caelex Shield
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
