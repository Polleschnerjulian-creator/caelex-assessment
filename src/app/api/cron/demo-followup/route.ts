/**
 * Cron: Demo Follow-Up
 *
 * GET /api/cron/demo-followup — Auto follow-up for NEW demo requests older than 48h
 *
 * Queries DemoRequests where status=NEW and followUpAt <= now,
 * updates status to CONTACTED, and sends a follow-up email to each.
 *
 * Schedule: Daily (recommended alongside other cron jobs)
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(req: Request) {
  const startTime = Date.now();

  // ─── Cron Auth ───
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isDev = process.env.NODE_ENV === "development";

  if (!isDev && !cronSecret) {
    logger.error("CRON_SECRET not configured in production");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isDev) {
    try {
      const headerBuffer = Buffer.from(authHeader || "");
      const expectedBuffer = Buffer.from(`Bearer ${cronSecret}`);
      if (
        headerBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(headerBuffer, expectedBuffer)
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (isDev && !cronSecret) {
    logger.warn("[DEV] CRON_SECRET not set - bypassing auth for development");
  }

  // ─── Process Follow-Ups ───
  try {
    logger.info("Starting demo follow-up processing...");

    const now = new Date();

    // Find NEW demo requests past their follow-up time
    const pendingFollowUps = await prisma.demoRequest.findMany({
      where: {
        status: "NEW",
        followUpAt: { lte: now },
      },
    });

    if (pendingFollowUps.length === 0) {
      const duration = Date.now() - startTime;
      logger.info("No demo follow-ups to process", {
        duration: `${duration}ms`,
      });
      return NextResponse.json({
        success: true,
        processed: 0,
        duration: `${duration}ms`,
        processedAt: now.toISOString(),
      });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const demo of pendingFollowUps) {
      try {
        // Update status to CONTACTED
        await prisma.demoRequest.update({
          where: { id: demo.id },
          data: { status: "CONTACTED" },
        });

        // Send follow-up email
        const result = await sendEmail({
          to: demo.email,
          subject: "Following up on your Caelex demo request",
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3B82F6; margin-bottom: 24px;">Following up on your demo request</h2>
              <p style="color: #333; line-height: 1.6;">
                Hi ${escapeHtml(demo.name)},
              </p>
              <p style="color: #333; line-height: 1.6;">
                We wanted to follow up on your recent demo request for the Caelex platform.
                Our team is ready to give you a personalized walkthrough of our space regulatory
                compliance tools.
              </p>
              <p style="color: #333; line-height: 1.6;">
                Simply reply to this email or
                <a href="https://caelex.eu/contact" style="color: #3B82F6;">contact us</a>
                to schedule a time that works best for you.
              </p>
              <div style="margin: 24px 0; text-align: center;">
                <a href="https://caelex.eu/contact"
                   style="display: inline-block; background: #3B82F6; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
                  Schedule Your Demo
                </a>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
              <p style="font-size: 12px; color: #999;">
                Caelex — Space Regulatory Compliance Platform
              </p>
            </div>
          `,
        });

        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push(`${demo.email}: ${result.error}`);
        }
      } catch (error) {
        failed++;
        errors.push(
          `${demo.email}: ${getSafeErrorMessage(error, "Failed to process follow-up")}`,
        );
      }
    }

    const duration = Date.now() - startTime;

    logger.info("Demo follow-up processing complete", {
      processed: pendingFollowUps.length,
      sent,
      failed,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      processed: pendingFollowUps.length,
      sent,
      failed,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
      duration: `${duration}ms`,
      processedAt: now.toISOString(),
    });
  } catch (error) {
    logger.error("Demo follow-up cron job failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(error, "Demo follow-up processing failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
