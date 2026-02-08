import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { exportAuditLogs } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";

// GET /api/audit/export - Export audit logs for compliance reporting
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Rate limit: export tier (20/hr)
    const rateLimitResult = await checkRateLimit("export", userId);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const format = (searchParams.get("format") || "json") as "json" | "csv";
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Default to last 90 days if no dates specified
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);

    const data = await exportAuditLogs(userId, startDate, endDate, format);

    if (format === "csv") {
      // Return as CSV file download
      const filename = `audit-log-${startDate.toISOString().split("T")[0]}-to-${endDate.toISOString().split("T")[0]}.csv`;
      return new NextResponse(data as string, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Return as JSON
    return NextResponse.json({
      exportDate: new Date().toISOString(),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      logs: data,
    });
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
