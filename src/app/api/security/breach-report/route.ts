/**
 * GDPR Breach Report API
 * POST - Report a new data breach (any authenticated user)
 * GET  - List breach reports (admin/owner only for org-wide, own reports for others)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  reportBreach,
  getBreachReports,
} from "@/lib/services/breach-notification-service";
import type { BreachSeverity, BreachStatus } from "@prisma/client";
import { verifyOrganizationAccess } from "@/lib/middleware/organization-guard";
import { logger } from "@/lib/logger";
import { getSafeErrorMessage } from "@/lib/validations";
import { z } from "zod";

// ─── Validation ───

const reportBreachSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(10000, "Description must be less than 10,000 characters"),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  affectedDataTypes: z
    .string()
    .min(1, "Affected data types are required")
    .max(500, "Affected data types must be less than 500 characters"),
  affectedDataSubjects: z
    .number()
    .int()
    .min(0, "Affected data subjects must be 0 or more"),
  discoveredAt: z.string().datetime(),
  organizationId: z.string().optional(),
});

// ─── POST: Report a new breach ───

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reportBreachSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { data } = parsed;

    // If org-scoped, verify the user is a member
    if (data.organizationId) {
      const access = await verifyOrganizationAccess(
        data.organizationId,
        session.user.id,
      );
      if (!access.success) {
        return NextResponse.json(
          { error: "You are not a member of this organization" },
          { status: 403 },
        );
      }
    }

    const breach = await reportBreach(session.user.id, {
      title: data.title,
      description: data.description,
      severity: data.severity as BreachSeverity,
      affectedDataTypes: data.affectedDataTypes,
      affectedDataSubjects: data.affectedDataSubjects,
      discoveredAt: new Date(data.discoveredAt),
      organizationId: data.organizationId,
    });

    return NextResponse.json({ breach }, { status: 201 });
  } catch (error) {
    logger.error("Failed to create breach report", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to create breach report"),
      },
      { status: 500 },
    );
  }
}

// ─── GET: List breach reports ───

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status") as BreachStatus | null;
    const severity = searchParams.get("severity") as BreachSeverity | null;
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = parseInt(searchParams.get("offset") || "0");

    // If org-scoped, verify admin/owner access
    if (organizationId) {
      const access = await verifyOrganizationAccess(
        organizationId,
        session.user.id,
        { requiredPermissions: ["audit:read"] },
      );
      if (!access.success) {
        return NextResponse.json(
          {
            error:
              "Insufficient permissions to view organization breach reports",
          },
          { status: 403 },
        );
      }
    }

    const result = await getBreachReports(session.user.id, {
      organizationId: organizationId || undefined,
      status: status || undefined,
      severity: severity || undefined,
      limit,
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch breach reports", error);
    return NextResponse.json(
      {
        error: getSafeErrorMessage(error, "Failed to fetch breach reports"),
      },
      { status: 500 },
    );
  }
}
