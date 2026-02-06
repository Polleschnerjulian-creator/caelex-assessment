/**
 * Security Audit Logs API
 * GET - Get security audit logs with filtering
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getSecurityLogs,
  getSecurityStats,
  getDailyEventCounts,
  getUserSecurityLogs,
  getHighRiskEvents,
} from "@/lib/services/security-audit-service";
import { SecurityAuditEventType, RiskLevel } from "@prisma/client";
import { verifyOrganizationAccess } from "@/lib/middleware/organization-guard";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "50"),
      100,
    );
    const organizationId = searchParams.get("organizationId");
    const requestedUserId = searchParams.get("userId");
    const event = searchParams.get("event") as SecurityAuditEventType | null;
    const riskLevel = searchParams.get("riskLevel") as RiskLevel | null;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");
    const view = searchParams.get("view"); // 'logs', 'stats', 'chart', 'high-risk'

    // SECURITY: Verify permissions for viewing logs
    // Regular users can only view their own logs
    // Org admins can view logs for their organization members
    let effectiveUserId = session.user.id;

    if (requestedUserId && requestedUserId !== session.user.id) {
      // User is trying to view someone else's logs - check if they're an admin
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
                "You don't have permission to view other users' security logs",
            },
            { status: 403 },
          );
        }
        effectiveUserId = requestedUserId;
      } else {
        // No org context - only system admins can view other users' logs
        if (session.user.role !== "admin") {
          return NextResponse.json(
            { error: "You can only view your own security logs" },
            { status: 403 },
          );
        }
        effectiveUserId = requestedUserId;
      }
    }

    // Handle different views
    if (view === "stats") {
      // Stats view requires org admin permission if viewing org stats
      if (organizationId) {
        const access = await verifyOrganizationAccess(
          organizationId,
          session.user.id,
          { requiredPermissions: ["audit:read"] },
        );
        if (!access.success) {
          return NextResponse.json({ error: access.error }, { status: 403 });
        }
      }
      const stats = await getSecurityStats(organizationId || undefined);
      return NextResponse.json({ stats });
    }

    if (view === "chart") {
      // Chart view requires org admin permission if viewing org data
      if (organizationId) {
        const access = await verifyOrganizationAccess(
          organizationId,
          session.user.id,
          { requiredPermissions: ["audit:read"] },
        );
        if (!access.success) {
          return NextResponse.json({ error: access.error }, { status: 403 });
        }
      }
      const days = parseInt(searchParams.get("days") || "30");
      const chartData = await getDailyEventCounts(
        organizationId || undefined,
        days,
      );
      return NextResponse.json({ chartData });
    }

    if (view === "high-risk") {
      // High-risk view requires org admin permission
      if (organizationId) {
        const access = await verifyOrganizationAccess(
          organizationId,
          session.user.id,
          { requiredPermissions: ["audit:read"] },
        );
        if (!access.success) {
          return NextResponse.json({ error: access.error }, { status: 403 });
        }
      } else if (session.user.role !== "admin") {
        // Without org context, only system admins can view high-risk events
        return NextResponse.json(
          { error: "Admin access required for high-risk events view" },
          { status: 403 },
        );
      }
      const limit = parseInt(searchParams.get("limit") || "20");
      const logs = await getHighRiskEvents(limit, organizationId || undefined);
      return NextResponse.json({ logs });
    }

    if (view === "user") {
      const limit = parseInt(searchParams.get("limit") || "100");
      const logs = await getUserSecurityLogs(effectiveUserId, limit);
      return NextResponse.json({ logs });
    }

    // Default: paginated logs with filters
    const result = await getSecurityLogs(
      {
        userId: effectiveUserId,
        organizationId: organizationId || undefined,
        event: event || undefined,
        riskLevel: riskLevel || undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        search: search || undefined,
      },
      page,
      pageSize,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching security logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch security logs" },
      { status: 500 },
    );
  }
}
