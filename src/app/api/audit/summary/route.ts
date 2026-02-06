/**
 * Audit Summary API
 * GET: Get comprehensive audit statistics and summary
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import {
  getAuditSummary,
  getAuditFilterOptions,
} from "@/lib/services/audit-export-service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const actions = searchParams.get("actions")?.split(",").filter(Boolean);
    const entityTypes = searchParams
      .get("entityTypes")
      ?.split(",")
      .filter(Boolean);

    // Get summary and filter options in parallel
    const [summary, filterOptions] = await Promise.all([
      getAuditSummary(userId, {
        startDate,
        endDate,
        actions,
        entityTypes,
      }),
      getAuditFilterOptions(userId),
    ]);

    return NextResponse.json({
      summary,
      filterOptions,
    });
  } catch (error) {
    console.error("Error fetching audit summary:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
