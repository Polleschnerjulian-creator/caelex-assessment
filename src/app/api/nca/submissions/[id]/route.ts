/**
 * Individual NCA Submission API
 * GET - Get submission details
 * PATCH - Update submission status/acknowledgment
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { safeJsonParse, safeJsonParseArray } from "@/lib/validations";
import {
  getSubmission,
  updateSubmissionStatus,
  recordAcknowledgment,
  getNCAAuthorityLabel,
  getSubmissionMethodLabel,
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
  NCA_AUTHORITY_INFO,
} from "@/lib/services/nca-submission-service";
import type { NCASubmissionStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ─── GET: Get Submission Details ───

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const submission = await getSubmission(id, session.user.id);

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    const ncaInfo = NCA_AUTHORITY_INFO[submission.ncaAuthority];

    return NextResponse.json({
      submission: {
        ...submission,
        ncaAuthorityLabel: getNCAAuthorityLabel(submission.ncaAuthority),
        ncaAuthorityInfo: ncaInfo,
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
    });
  } catch (error) {
    console.error("Failed to fetch submission:", error);
    return NextResponse.json(
      { error: "Failed to fetch submission" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update Submission ───

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      status,
      ncaReference,
      acknowledgedBy,
      notes,
      rejectionReason,
      followUpRequired,
      followUpDeadline,
      followUpNotes,
    } = body;

    // Check if submission exists
    const existing = await getSubmission(id, session.user.id);
    if (!existing) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 },
      );
    }

    // Handle acknowledgment specifically
    if (status === "ACKNOWLEDGED" && ncaReference) {
      const submission = await recordAcknowledgment(id, session.user.id, {
        ncaReference,
        acknowledgedBy,
        notes,
      });

      await logAuditEvent({
        userId: session.user.id,
        action: "NCA_SUBMISSION_ACKNOWLEDGED",
        entityType: "nca_submission",
        entityId: id,
        description: `NCA acknowledged submission with reference: ${ncaReference}`,
        newValue: { ncaReference, acknowledgedBy },
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
      });
    }

    // General status update
    if (!status) {
      return NextResponse.json(
        { error: "Status is required for update" },
        { status: 400 },
      );
    }

    const submission = await updateSubmissionStatus(id, session.user.id, {
      status: status as NCASubmissionStatus,
      notes,
      ncaReference,
      acknowledgedBy,
      rejectionReason,
      followUpRequired,
      followUpDeadline: followUpDeadline
        ? new Date(followUpDeadline)
        : undefined,
      followUpNotes,
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "NCA_SUBMISSION_STATUS_UPDATED",
      entityType: "nca_submission",
      entityId: id,
      description: `Updated submission status to ${getSubmissionStatusLabel(status)}`,
      previousValue: { status: existing.status },
      newValue: { status },
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
    });
  } catch (error) {
    console.error("Failed to update submission:", error);
    return NextResponse.json(
      { error: "Failed to update submission" },
      { status: 500 },
    );
  }
}
