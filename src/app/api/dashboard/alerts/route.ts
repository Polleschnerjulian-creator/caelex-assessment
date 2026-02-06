/**
 * Dashboard Alerts API
 *
 * GET /api/dashboard/alerts
 * Returns active alerts and upcoming deadlines
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardAlerts } from "@/lib/services";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);

    const alerts = await getDashboardAlerts(session.user.id, limit);

    // Group alerts by severity
    const groupedAlerts = {
      critical: alerts.filter((a) => a.severity === "critical"),
      high: alerts.filter((a) => a.severity === "high"),
      medium: alerts.filter((a) => a.severity === "medium"),
      low: alerts.filter((a) => a.severity === "low"),
    };

    // Group alerts by type
    const byType = {
      deadlines: alerts.filter((a) => a.type === "deadline"),
      incidents: alerts.filter((a) => a.type === "incident"),
      expiries: alerts.filter((a) => a.type === "expiry"),
      compliance: alerts.filter((a) => a.type === "compliance"),
      actionRequired: alerts.filter((a) => a.type === "action_required"),
    };

    return NextResponse.json({
      success: true,
      alerts,
      summary: {
        total: alerts.length,
        critical: groupedAlerts.critical.length,
        high: groupedAlerts.high.length,
        medium: groupedAlerts.medium.length,
        low: groupedAlerts.low.length,
      },
      byType: {
        deadlines: byType.deadlines.length,
        incidents: byType.incidents.length,
        expiries: byType.expiries.length,
        compliance: byType.compliance.length,
        actionRequired: byType.actionRequired.length,
      },
      groupedBySeverity: groupedAlerts,
    });
  } catch (error) {
    console.error("Failed to get dashboard alerts:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard alerts" },
      { status: 500 },
    );
  }
}
