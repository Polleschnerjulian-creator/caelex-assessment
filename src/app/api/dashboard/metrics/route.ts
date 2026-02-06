/**
 * Dashboard Metrics API
 *
 * GET /api/dashboard/metrics
 * Returns detailed metrics for each module
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardMetrics } from "@/lib/services";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await getDashboardMetrics(session.user.id);

    return NextResponse.json({
      success: true,
      metrics,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get dashboard metrics:", error);
    return NextResponse.json(
      { error: "Failed to get dashboard metrics" },
      { status: 500 },
    );
  }
}
