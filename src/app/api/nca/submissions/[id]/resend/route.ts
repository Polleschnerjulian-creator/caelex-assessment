/**
 * NCA Submission Resend API
 * POST - Resend a failed or rejected submission
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { safeJsonParse, safeJsonParseArray } from "@/lib/validations";
import {
  getSubmission,
  resendSubmission,
  getNCAAuthorityLabel,
  getSubmissionMethodLabel,
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
} from "@/lib/services/nca-submission-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { coverLetter, additionalAttachments } = body;

    // Check if original submission exists
    const original = await getSubmission(id, session.user.id);
    if (!original) {
      return NextResponse.json(
        { error: "Original submission not found" },
        { status: 404 },
      );
    }

    // Only allow resend for certain statuses
    const resendableStatuses = [
      "REJECTED",
      "INFORMATION_REQUESTED",
      "SUBMITTED",
    ];
    if (!resendableStatuses.includes(original.status)) {
      return NextResponse.json(
        {
          error: `Cannot resend submission with status '${original.status}'. Resend is only allowed for: ${resendableStatuses.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Create resend
    const submission = await resendSubmission(id, session.user.id, {
      coverLetter,
      additionalAttachments,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "NCA_SUBMISSION_RESENT",
      entityType: "nca_submission",
      entityId: submission.id,
      description: `Resent submission to ${getNCAAuthorityLabel(submission.ncaAuthority)}`,
      previousValue: { originalSubmissionId: id },
      newValue: {
        newSubmissionId: submission.id,
        resendCount: submission.resendCount,
      },
    });

    return NextResponse.json({
      success: true,
      submission: {
        ...submission,
        ncaAuthorityLabel: getNCAAuthorityLabel(submission.ncaAuthority),
        submissionMethodLabel: getSubmissionMethodLabel(
          submission.submissionMethod,
        ),
        statusLabel: getSubmissionStatusLabel(submission.status),
        statusColor: getSubmissionStatusColor(submission.status),
        attachments: safeJsonParse(
          submission.attachments as string | null,
          null,
        ),
        statusHistory: safeJsonParseArray(
          submission.statusHistory as string | null,
        ),
      },
      originalSubmissionId: id,
    });
  } catch (error) {
    console.error("Failed to resend submission:", error);
    return NextResponse.json(
      { error: "Failed to resend submission" },
      { status: 500 },
    );
  }
}
