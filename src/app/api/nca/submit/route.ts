/**
 * NCA Submit API
 * POST - Submit a report to NCA
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ncaSubmitSchema = z.object({
      reportId: z.string().min(1, "Report ID is required"),
      ncaAuthority: z.string().min(1, "NCA authority is required"),
      submissionMethod: z.string().min(1, "Submission method is required"),
      coverLetter: z.string().optional(),
      attachments: z.any().optional(),
    });

    const body = await request.json();
    const parsed = ncaSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      reportId,
      ncaAuthority,
      submissionMethod,
      coverLetter,
      attachments,
    } = parsed.data;

    // Validate NCA authority against known authorities
    if (!NCA_AUTHORITY_INFO[ncaAuthority as NCAAuthority]) {
      return NextResponse.json(
        { error: "Valid NCA authority is required" },
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
      description: `Submitted report to ${getNCAAuthorityLabel(ncaAuthority as NCAAuthority)} via ${getSubmissionMethodLabel(submissionMethod as SubmissionMethod)}`,
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
    logger.error("Failed to submit to NCA", error);
    return NextResponse.json(
      { error: "Failed to submit report to NCA" },
      { status: 500 },
    );
  }
}
