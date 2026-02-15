/**
 * GDPR Breach Report Detail API
 * GET   - Get single breach report
 * PATCH - Update breach status, record authority/subject notification
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getBreachReport,
  updateBreachStatus,
  notifyAuthority,
  notifySubjects,
} from "@/lib/services/breach-notification-service";
import type { BreachStatus } from "@prisma/client";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";
import { z } from "zod";

// ─── Validation ───

const updateBreachSchema = z.object({
  action: z.enum(["update_status", "notify_authority", "notify_subjects"]),
  status: z
    .enum(["DETECTED", "INVESTIGATING", "CONTAINED", "RESOLVED", "CLOSED"])
    .optional(),
  notes: z
    .string()
    .max(2000, "Notes must be less than 2,000 characters")
    .optional(),
});

// ─── GET: Single breach report ───

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const report = await getBreachReport(id, session.user.id);

    if (!report) {
      return NextResponse.json(
        { error: "Breach report not found" },
        { status: 404 },
      );
    }

    // Calculate deadline information
    const authorityDeadline = new Date(
      report.discoveredAt.getTime() + 72 * 60 * 60 * 1000,
    );
    const hoursRemaining = Math.max(
      0,
      (authorityDeadline.getTime() - Date.now()) / (1000 * 60 * 60),
    );

    return NextResponse.json({
      report,
      deadlineInfo: {
        authorityDeadline: authorityDeadline.toISOString(),
        hoursRemaining: Math.round(hoursRemaining * 10) / 10,
        isOverdue: hoursRemaining === 0 && !report.authorityNotifiedAt,
        authorityNotified: !!report.authorityNotifiedAt,
        subjectsNotified: !!report.subjectsNotifiedAt,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch breach report", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to fetch breach report"),
      },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update breach (status change, authority/subject notification) ───

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify user has access to this breach report
    const existing = await getBreachReport(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Breach report not found" },
        { status: 404 },
      );
    }

    // For status updates beyond reading, require admin role or report ownership
    const isReporter = existing.reportedById === session.user.id;
    const isAdmin = session.user.role === "admin";
    if (!isReporter && !isAdmin) {
      return NextResponse.json(
        {
          error: "Only the reporter or an admin can modify this breach report",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = updateBreachSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data } = parsed;
    let updatedReport;

    switch (data.action) {
      case "update_status": {
        if (!data.status) {
          return NextResponse.json(
            { error: "Status is required for status updates" },
            { status: 400 },
          );
        }
        updatedReport = await updateBreachStatus(id, session.user.id, {
          status: data.status as BreachStatus,
          notes: data.notes,
        });
        break;
      }

      case "notify_authority": {
        updatedReport = await notifyAuthority(id, session.user.id);
        break;
      }

      case "notify_subjects": {
        updatedReport = await notifySubjects(id, session.user.id);
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ report: updatedReport });
  } catch (error) {
    logger.error("Failed to update breach report", error);

    // Surface business logic errors (e.g., "Authority already notified")
    if (error instanceof Error && error.message.includes("already")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to update breach report"),
      },
      { status: 500 },
    );
  }
}
