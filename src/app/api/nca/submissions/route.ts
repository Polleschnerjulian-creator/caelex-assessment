/**
 * NCA Submissions List API
 * GET - List all NCA submissions for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { safeJsonParse, safeJsonParseArray } from "@/lib/validations";
import {
  getSubmissions,
  getSubmissionStats,
  getNCAAuthorityLabel,
  getSubmissionMethodLabel,
  getSubmissionStatusLabel,
  getSubmissionStatusColor,
} from "@/lib/services/nca-submission-service";
import type { NCAAuthority, NCASubmissionStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const ncaAuthority = searchParams.get(
      "ncaAuthority",
    ) as NCAAuthority | null;
    const status = searchParams.get("status") as NCASubmissionStatus | null;
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const includeStats = searchParams.get("includeStats") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const [{ submissions, total }, stats] = await Promise.all([
      getSubmissions(session.user.id, {
        reportId: reportId || undefined,
        ncaAuthority: ncaAuthority || undefined,
        status: status || undefined,
        fromDate: fromDate ? new Date(fromDate) : undefined,
        toDate: toDate ? new Date(toDate) : undefined,
        limit,
        offset,
      }),
      includeStats ? getSubmissionStats(session.user.id) : null,
    ]);

    // Enrich submissions with labels
    const enrichedSubmissions = submissions.map((submission) => ({
      ...submission,
      ncaAuthorityLabel: getNCAAuthorityLabel(submission.ncaAuthority),
      submissionMethodLabel: getSubmissionMethodLabel(
        submission.submissionMethod,
      ),
      statusLabel: getSubmissionStatusLabel(submission.status),
      statusColor: getSubmissionStatusColor(submission.status),
      attachments: safeJsonParse(submission.attachments as string | null, null),
      statusHistory: safeJsonParseArray(
        submission.statusHistory as string | null,
      ),
    }));

    return NextResponse.json({
      submissions: enrichedSubmissions,
      total,
      limit,
      offset,
      ...(stats && { stats }),
    });
  } catch (error) {
    console.error("Failed to fetch NCA submissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch submissions" },
      { status: 500 },
    );
  }
}
