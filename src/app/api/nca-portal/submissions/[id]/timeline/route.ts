/**
 * NCA Portal Submission Timeline API
 * GET - Full submission timeline (status changes + correspondence)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSubmissionTimeline } from "@/lib/services/nca-portal-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const timeline = await getSubmissionTimeline(id, session.user.id);

    return NextResponse.json({ timeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Submission not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Failed to fetch timeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline" },
      { status: 500 },
    );
  }
}
