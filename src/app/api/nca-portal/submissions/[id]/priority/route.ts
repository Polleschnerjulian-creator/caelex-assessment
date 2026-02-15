/**
 * NCA Portal Submission Priority API
 * PATCH - Update submission priority
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updatePriority } from "@/lib/services/nca-portal-service";
import type { SubmissionPriority } from "@prisma/client";

const VALID_PRIORITIES: SubmissionPriority[] = [
  "URGENT",
  "HIGH",
  "NORMAL",
  "LOW",
];

export async function PATCH(
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
    const { priority } = body;

    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      return NextResponse.json(
        { error: "Valid priority is required (URGENT, HIGH, NORMAL, LOW)" },
        { status: 400 },
      );
    }

    const submission = await updatePriority(
      id,
      session.user.id,
      priority as SubmissionPriority,
    );

    return NextResponse.json({ submission });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Submission not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    console.error("Failed to update priority:", error);
    return NextResponse.json(
      { error: "Failed to update priority" },
      { status: 500 },
    );
  }
}
