/**
 * NCA Portal Dashboard API
 * GET - Portal dashboard data (active submissions, stats, deadlines, correspondence)
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPortalDashboard } from "@/lib/services/nca-portal-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dashboard = await getPortalDashboard(session.user.id);

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Failed to fetch portal dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 },
    );
  }
}
