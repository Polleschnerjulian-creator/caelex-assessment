/**
 * Assure Due Diligence Package Generation API
 * POST: Generate a new DD package for the user's organization
 *
 * Computes a fresh RRS, builds the DD package content,
 * stores it as a point-in-time snapshot, and returns the package.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logAuditEvent } from "@/lib/audit";
import { computeAndSaveRRS } from "@/lib/rrs-engine.server";
import type { RRSResult, RRSRecommendation } from "@/lib/rrs-engine.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

interface DDPackageContent {
  executiveSummary: {
    organizationName: string;
    generatedAt: string;
    overallScore: number;
    grade: string;
    status: string;
    summaryText: string;
  };
  riskRegister: Array<{
    id: number;
    priority: string;
    component: string;
    risk: string;
    mitigation: string;
    impact: string;
  }>;
  componentBreakdown: Array<{
    name: string;
    score: number;
    weight: number;
    weightedScore: number;
    factors: Array<{
      id: string;
      name: string;
      maxPoints: number;
      earnedPoints: number;
      description: string;
      completionPct: number;
    }>;
  }>;
  methodology: {
    version: string;
    weights: Record<string, number>;
    description: string;
  };
}

function buildDDPackageContent(
  result: RRSResult,
  organizationName: string,
): DDPackageContent {
  // Executive Summary
  const executiveSummary = {
    organizationName,
    generatedAt: result.computedAt.toISOString(),
    overallScore: result.overallScore,
    grade: result.grade,
    status: result.status,
    summaryText: generateSummaryText(result),
  };

  // Risk Register from recommendations
  const riskRegister = result.recommendations.map(
    (rec: RRSRecommendation, idx: number) => ({
      id: idx + 1,
      priority: rec.priority,
      component: formatComponentName(rec.component),
      risk: `Incomplete: ${rec.action}`,
      mitigation: rec.action,
      impact: rec.impact,
    }),
  );

  // Component Breakdown
  const componentBreakdown = Object.entries(result.components).map(
    ([key, comp]) => ({
      name: formatComponentName(key),
      score: comp.score,
      weight: comp.weight,
      weightedScore: comp.weightedScore,
      factors: comp.factors.map((f) => ({
        id: f.id,
        name: f.name,
        maxPoints: f.maxPoints,
        earnedPoints: f.earnedPoints,
        description: f.description,
        completionPct:
          f.maxPoints > 0
            ? Math.round((f.earnedPoints / f.maxPoints) * 100)
            : 0,
      })),
    }),
  );

  return {
    executiveSummary,
    riskRegister,
    componentBreakdown,
    methodology: result.methodology,
  };
}

function generateSummaryText(result: RRSResult): string {
  const { overallScore, grade, status } = result;

  const statusDescriptions: Record<string, string> = {
    compliant:
      "The organization demonstrates strong regulatory readiness across all compliance dimensions.",
    mostly_compliant:
      "The organization shows solid regulatory readiness with minor gaps that should be addressed.",
    partial:
      "The organization has made progress on regulatory compliance but significant gaps remain.",
    non_compliant:
      "The organization has critical compliance gaps that require immediate attention.",
    not_assessed:
      "The organization has not yet completed sufficient assessments to determine compliance readiness.",
  };

  const criticalCount = result.recommendations.filter(
    (r) => r.priority === "critical",
  ).length;
  const highCount = result.recommendations.filter(
    (r) => r.priority === "high",
  ).length;

  let text = `Regulatory Readiness Score: ${overallScore}/100 (Grade ${grade}). `;
  text += statusDescriptions[status] || "";

  if (criticalCount > 0 || highCount > 0) {
    text += ` There are ${criticalCount} critical and ${highCount} high-priority items requiring attention.`;
  }

  return text;
}

function formatComponentName(key: string): string {
  const names: Record<string, string> = {
    authorizationReadiness: "Authorization Readiness",
    cybersecurityPosture: "Cybersecurity Posture",
    operationalCompliance: "Operational Compliance",
    jurisdictionalCoverage: "Multi-Jurisdictional Coverage",
    regulatoryTrajectory: "Regulatory Trajectory",
    governanceProcess: "Governance & Process",
  };
  return names[key] || key;
}

export async function POST(request: Request) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("api", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Role check: MANAGER+
    if (!MANAGER_ROLES.includes(membership.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions. Requires MANAGER role or above." },
        { status: 403 },
      );
    }

    const organizationId = membership.organizationId;
    const organizationName = membership.organization.name;

    // Compute fresh RRS
    const result = await computeAndSaveRRS(organizationId);

    // Build DD package content
    const content = buildDDPackageContent(result, organizationName);

    // Store the package
    const ddPackage = await prisma.assureDDPackage.create({
      data: {
        organizationId,
        createdById: session.user.id,
        content: JSON.parse(JSON.stringify(content)),
        rrsScore: result.overallScore,
        grade: result.grade,
        status: result.status,
        title: `Due Diligence Package — ${organizationName}`,
        generatedAt: new Date(),
      },
    });

    // Audit log
    await logAuditEvent({
      userId: session.user.id,
      action: "assure_dd_generated",
      entityType: "assure_dd_package",
      entityId: ddPackage.id,
      metadata: {
        rrsScore: result.overallScore,
        grade: result.grade,
        organizationName,
      },
      organizationId,
    });

    return NextResponse.json({
      id: ddPackage.id,
      title: ddPackage.title,
      rrsScore: ddPackage.rrsScore,
      grade: ddPackage.grade,
      status: ddPackage.status,
      content,
      generatedAt: ddPackage.generatedAt,
    });
  } catch (error) {
    logger.error("DD package generation error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
