/**
 * NCA Portal Package Submit API
 * POST - Submit package to NCA (creates NCASubmission + links package)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitPackage } from "@/lib/services/nca-portal-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { reportId, submissionMethod, coverLetter, priority } = body;

    if (!reportId || !submissionMethod) {
      return NextResponse.json(
        { error: "reportId and submissionMethod are required" },
        { status: 400 },
      );
    }

    const submission = await submitPackage(id, session.user.id, {
      reportId,
      submissionMethod,
      coverLetter,
      priority,
    });

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Package not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Failed to submit package:", error);
    return NextResponse.json(
      { error: "Failed to submit package" },
      { status: 500 },
    );
  }
}
