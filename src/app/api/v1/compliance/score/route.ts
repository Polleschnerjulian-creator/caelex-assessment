/**
 * GET /api/v1/compliance/score
 *
 * Organization compliance score (A-F grade).
 * Requires API key with `read:compliance` scope.
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, apiSuccess, ApiContext } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function calculateGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  if (score >= 50) return "E";
  return "F";
}

export const GET = withApiAuth(
  async (_request: NextRequest, context: ApiContext) => {
    try {
      const orgId = context.organizationId;

      // Gather metrics for score calculation
      const [spacecraftCount, workflowStats, deadlineStats] = await Promise.all(
        [
          prisma.spacecraft.count({ where: { organizationId: orgId } }),
          prisma.authorizationWorkflow.groupBy({
            by: ["status"],
            where: {
              user: {
                organizationMemberships: { some: { organizationId: orgId } },
              },
            },
            _count: true,
          }),
          prisma.deadline.groupBy({
            by: ["status"],
            where: {
              user: {
                organizationMemberships: { some: { organizationId: orgId } },
              },
            },
            _count: true,
          }),
        ],
      );

      // Calculate score (0-100)
      let score = 100;

      // Deduct for incomplete workflows
      const totalWorkflows = workflowStats.reduce(
        (sum, s) => sum + s._count,
        0,
      );
      const completedWorkflows =
        workflowStats.find((s) => s.status === "approved")?._count || 0;
      if (totalWorkflows > 0) {
        const workflowCompletion = completedWorkflows / totalWorkflows;
        score -= Math.round((1 - workflowCompletion) * 30);
      }

      // Deduct for overdue deadlines
      const overdueDeadlines =
        deadlineStats.find((s) => s.status === "OVERDUE")?._count || 0;
      const totalDeadlines = deadlineStats.reduce(
        (sum, s) => sum + s._count,
        0,
      );
      if (totalDeadlines > 0) {
        score -= Math.round((overdueDeadlines / totalDeadlines) * 20);
      }

      // Deduct if no workflows started but spacecraft exist
      if (spacecraftCount > 0 && totalWorkflows === 0) {
        score -= 20;
      }

      score = Math.max(0, Math.min(100, score));
      const grade = calculateGrade(score);

      return apiSuccess(
        {
          score,
          grade,
          spacecraftCount,
          totalWorkflows,
          completedWorkflows,
          overdueDeadlines,
        },
        200,
        { timestamp: new Date().toISOString() },
      );
    } catch (error) {
      logger.error("[compliance/score]", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  { requiredScopes: ["read:compliance"] },
);
