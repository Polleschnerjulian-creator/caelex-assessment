import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateCompletenessReport,
  getPrioritizedActions,
  estimateCompletionTime,
} from "@/lib/services";

/**
 * GET /api/authorization/[workflowId]/completeness
 *
 * Get a detailed completeness report for the authorization workflow.
 * Includes:
 * - Overall and mandatory completion percentages
 * - Document gaps with suggested actions
 * - Submission blockers
 * - Recommendations
 * - Category breakdown
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await params;
    const userId = session.user.id;

    // Verify workflow ownership
    const workflow = await prisma.authorizationWorkflow.findFirst({
      where: {
        id: workflowId,
        userId,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 },
      );
    }

    // Get query params for optional features
    const url = new URL(request.url);
    const includeEstimate = url.searchParams.get("estimate") === "true";
    const priorityLimit = parseInt(
      url.searchParams.get("priorityLimit") || "5",
    );

    // Calculate completeness report
    const report = await calculateCompletenessReport(workflowId);

    if (!report) {
      return NextResponse.json(
        { error: "Failed to calculate completeness" },
        { status: 500 },
      );
    }

    // Get prioritized actions
    const prioritizedActions = await getPrioritizedActions(
      workflowId,
      priorityLimit,
    );

    // Build response
    const response: Record<string, unknown> = {
      workflowId: report.workflowId,
      operatorType: report.operatorType,
      evaluatedAt: report.evaluatedAt,

      // Summary metrics
      summary: {
        overallPercentage: report.overallPercentage,
        mandatoryPercentage: report.mandatoryPercentage,
        optionalPercentage: report.optionalPercentage,
        mandatoryComplete: report.mandatoryComplete,
        readyForSubmission: report.readyForSubmission,
      },

      // Counts
      counts: {
        totalDocuments: report.totalDocuments,
        totalRequired: report.totalRequired,
        totalOptional: report.totalOptional,
        completedDocuments: report.completedDocuments,
        completedMandatory: report.completedMandatory,
        completedOptional: report.completedOptional,
        inProgressDocuments: report.inProgressDocuments,
        gapsCount: report.gaps.length,
        blockersCount: report.blockers.length,
      },

      // Prioritized next actions
      prioritizedActions,

      // Blockers (errors that prevent submission)
      blockers: report.blockers,

      // All gaps (sorted by criticality)
      gaps: report.gaps.sort((a, b) => {
        const criticalityOrder = {
          mandatory: 0,
          conditional: 1,
          recommended: 2,
        };
        return (
          criticalityOrder[a.criticality] - criticalityOrder[b.criticality]
        );
      }),

      // Completed documents
      completed: report.completedList,

      // Recommendations
      recommendations: report.recommendations,

      // Category breakdown
      byCategory: report.byCategory,
    };

    // Add time estimate if requested
    if (includeEstimate) {
      const estimate = await estimateCompletionTime(workflowId);
      if (estimate) {
        response.completionEstimate = estimate;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error calculating completeness:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
