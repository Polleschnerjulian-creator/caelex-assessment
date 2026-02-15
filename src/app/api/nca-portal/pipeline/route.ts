/**
 * NCA Portal Pipeline API
 * GET - Submissions grouped by status for pipeline/Kanban view
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubmissionPipeline } from "@/lib/services/nca-portal-service";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pipeline = await getSubmissionPipeline(session.user.id);

    return NextResponse.json({ pipeline });
  } catch (error) {
    console.error("Failed to fetch submission pipeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline data" },
      { status: 500 },
    );
  }
}
