/**
 * NCA Submit API
 * POST - Submit a report to NCA
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { safeJsonParse, safeJsonParseArray } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import {
  submitToNCA,
  NCA_AUTHORITY_INFO,
  getNCAAuthorityLabel,
  getSubmissionMethodLabel,
} from "@/lib/services/nca-submission-service";
import type { NCAAuthority, SubmissionMethod } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      reportId,
      ncaAuthority,
      submissionMethod,
      coverLetter,
      attachments,
    } = body;

    // Validation
    if (!reportId) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 },
      );
    }

    if (!ncaAuthority || !NCA_AUTHORITY_INFO[ncaAuthority as NCAAuthority]) {
      return NextResponse.json(
        { error: "Valid NCA authority is required" },
        { status: 400 },
      );
    }

    if (!submissionMethod) {
      return NextResponse.json(
        { error: "Submission method is required" },
        { status: 400 },
      );
    }

    // Verify report exists and belongs to user (via supervision config)
    const report = await prisma.supervisionReport.findFirst({
      where: {
        id: reportId,
        supervision: { userId: session.user.id },
      },
      include: {
        supervision: {
          select: { userId: true },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 },
      );
    }

    // Check if report is in a submittable state
    if (!["generated", "ready"].includes(report.status)) {
      return NextResponse.json(
        {
          error: `Report must be in 'generated' or 'ready' state to submit. Current state: ${report.status}`,
        },
        { status: 400 },
      );
    }

    // Create submission
    const submission = await submitToNCA({
      userId: session.user.id,
      reportId,
      ncaAuthority: ncaAuthority as NCAAuthority,
      submissionMethod: submissionMethod as SubmissionMethod,
      coverLetter,
      attachments,
    });

    // Update report status
    await prisma.supervisionReport.update({
      where: { id: reportId },
      data: {
        status: "submitted",
        submittedAt: new Date(),
      },
    });

    await logAuditEvent({
      userId: session.user.id,
      action: "NCA_REPORT_SUBMITTED",
      entityType: "nca_submission",
      entityId: submission.id,
      description: `Submitted report to ${getNCAAuthorityLabel(ncaAuthority)} via ${getSubmissionMethodLabel(submissionMethod)}`,
      newValue: {
        reportId,
        ncaAuthority,
        submissionMethod,
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
    console.error("Failed to submit to NCA:", error);
    return NextResponse.json(
      { error: "Failed to submit report to NCA" },
      { status: 500 },
    );
  }
}
