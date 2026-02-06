/**
 * Audit Search API
 * GET: Search audit logs with full-text search
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { searchAuditLogs } from "@/lib/services/audit-export-service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);

    const query = searchParams.get("q");
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 },
      );
    }

    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await searchAuditLogs(userId, query, {
      limit: Math.min(limit, 100),
      offset,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error searching audit logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
