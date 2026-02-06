/**
 * Public API - Compliance Overview
 * GET - Get compliance overview for organization
 *
 * Requires: read:compliance scope
 */

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth, apiSuccess, apiError, ApiContext } from "@/lib/api-auth";

async function handler(request: NextRequest, context: ApiContext) {
  try {
    const { organizationId } = context;

    // Get compliance data
    const [
      spacecraftCount,
      activeWorkflows,
      pendingDeadlines,
      recentIncidents,
      complianceScore,
    ] = await Promise.all([
      // Count spacecraft
      prisma.spacecraft.count({
        where: { organizationId },
      }),

      // Count active authorization workflows (through user's organization memberships)
      prisma.authorizationWorkflow.count({
        where: {
          user: {
            organizationMemberships: {
              some: { organizationId },
            },
          },
          status: { in: ["DRAFT", "IN_REVIEW", "PENDING_APPROVAL"] },
        },
      }),

      // Count pending deadlines (upcoming, due soon, or overdue)
      prisma.deadline.count({
        where: {
          user: {
            organizationMemberships: {
              some: { organizationId },
            },
          },
          status: { in: ["UPCOMING", "DUE_SOON", "OVERDUE"] },
        },
      }),

      // Count recent incidents (last 30 days, through supervision config)
      prisma.incident.count({
        where: {
          supervision: {
            user: {
              organizationMemberships: {
                some: { organizationId },
              },
            },
          },
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Calculate a simple compliance score
      // In a real implementation, this would be more sophisticated
      calculateComplianceScore(organizationId),
    ]);

    return apiSuccess({
      organizationId,
      overview: {
        spacecraftCount,
        activeWorkflows,
        pendingDeadlines,
        recentIncidents,
        complianceScore: {
          overall: complianceScore,
          trend: "stable", // Would be calculated from historical data
          lastUpdated: new Date().toISOString(),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching compliance overview:", error);
    return apiError("Failed to fetch compliance overview", 500);
  }
}

async function calculateComplianceScore(
  organizationId: string,
): Promise<number> {
  // This is a simplified compliance score calculation
  // In production, this would consider many more factors

  const [
    totalSpacecraft,
    approvedWorkflows,
    totalWorkflows,
    overdueDeadlines,
    completedDeadlines,
  ] = await Promise.all([
    prisma.spacecraft.count({
      where: { organizationId },
    }),
    // Count approved workflows for users in this organization
    prisma.authorizationWorkflow.count({
      where: {
        user: {
          organizationMemberships: {
            some: { organizationId },
          },
        },
        status: "approved",
      },
    }),
    // Count total workflows for users in this organization
    prisma.authorizationWorkflow.count({
      where: {
        user: {
          organizationMemberships: {
            some: { organizationId },
          },
        },
      },
    }),
    prisma.deadline.count({
      where: {
        user: {
          organizationMemberships: {
            some: { organizationId },
          },
        },
        status: "OVERDUE",
      },
    }),
    prisma.deadline.count({
      where: {
        user: {
          organizationMemberships: {
            some: { organizationId },
          },
        },
        status: "COMPLETED",
      },
    }),
  ]);

  // Calculate score components
  let score = 100;

  // Penalize for incomplete authorization workflows
  if (totalWorkflows > 0) {
    const authorizationRate = approvedWorkflows / totalWorkflows;
    score -= (1 - authorizationRate) * 30; // Up to 30 points penalty
  } else if (totalSpacecraft > 0) {
    // If there are spacecraft but no workflows started, penalize
    score -= 20;
  }

  // Penalize for overdue deadlines
  const totalDeadlines = overdueDeadlines + completedDeadlines;
  if (totalDeadlines > 0) {
    const overdueRate = overdueDeadlines / totalDeadlines;
    score -= overdueRate * 20; // Up to 20 points penalty
  }

  return Math.max(0, Math.round(score));
}

export const GET = withApiAuth(handler, {
  requiredScopes: ["read:compliance"],
});
