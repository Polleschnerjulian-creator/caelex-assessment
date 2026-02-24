/**
 * Assure RCR Rating PDF Export API
 * GET: Return rating data formatted as ReportConfig for client-side PDF generation
 *
 * Auth required. Builds a ReportConfig (from src/lib/pdf/types.ts) with sections:
 * - Rating Summary (grade, outlook, numeric score, confidence, valid-until)
 * - Component Breakdown (table of all 6 components)
 * - Risk Register (table: description, severity, likelihood, mitigation, reg reference)
 * - Rating Action (type, rationale, previous grade)
 * - Methodology Summary (weights, scale)
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "@/lib/pdf/types";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface RCRComponentScore {
  name: string;
  key: string;
  score: number;
  weight: number;
  weightedScore: number;
  maxScore: number;
}

interface RCRRisk {
  description: string;
  severity: string;
  likelihood: string;
  mitigation: string;
  regulatoryReference: string;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Auth
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("export", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;

    // Get user's organization membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Fetch the rating with organization info
    const rating = await prisma.regulatoryCreditRating.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
      },
    });

    if (!rating) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    // Verify rating belongs to user's organization
    if (rating.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Rating not found" }, { status: 404 });
    }

    const componentScores =
      rating.componentScores as unknown as RCRComponentScore[];
    const riskRegister = rating.riskRegister as unknown as RCRRisk[];

    // Build ReportConfig for client-side PDF rendering
    const reportConfig: ReportConfig = {
      metadata: {
        reportId: rating.id,
        reportType: "compliance_certificate",
        title: `Regulatory Credit Rating Report - ${rating.organization.name}`,
        generatedAt: new Date(),
        generatedBy: session.user.name || "System",
        organization: rating.organization.name,
        version: rating.methodologyVersion,
      },
      header: {
        title: "Regulatory Credit Rating Report",
        subtitle: `${rating.organization.name} - Grade ${rating.grade}`,
        reportNumber: `RCR-${rating.id.slice(-8).toUpperCase()}`,
        date: rating.computedAt,
        logo: true,
      },
      footer: {
        pageNumbers: true,
        confidentialityNotice:
          "CONFIDENTIAL - This document contains proprietary credit rating information. " +
          "Do not distribute without authorization from the issuing organization.",
        disclaimer:
          "This Regulatory Credit Rating is based on self-reported compliance data " +
          "and algorithmic analysis. It does not constitute a legally binding regulatory opinion " +
          "or financial advice.",
      },
      sections: buildReportSections(rating, componentScores, riskRegister),
    };

    return NextResponse.json(reportConfig);
  } catch (error) {
    console.error("RCR report export API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function buildReportSections(
  rating: {
    grade: string;
    previousGrade: string | null;
    numericScore: number;
    outlook: string;
    onWatch: boolean;
    watchReason: string | null;
    confidence: number;
    validUntil: Date;
    actionType: string;
    actionRationale: string | null;
    methodologyVersion: string;
    computedAt: Date;
  },
  componentScores: RCRComponentScore[],
  riskRegister: RCRRisk[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  // Section 1: Rating Summary
  const summaryContent: ReportSectionContent[] = [
    {
      type: "keyValue",
      items: [
        { key: "Grade", value: rating.grade },
        { key: "Outlook", value: rating.outlook },
        {
          key: "Numeric Score",
          value: `${rating.numericScore.toFixed(1)}/100`,
        },
        {
          key: "Confidence",
          value: `${(rating.confidence * 100).toFixed(0)}%`,
        },
        {
          key: "Valid Until",
          value: rating.validUntil.toISOString().split("T")[0],
        },
        {
          key: "Computed At",
          value: rating.computedAt.toISOString().split("T")[0],
        },
      ],
    },
  ];

  if (rating.onWatch) {
    summaryContent.push({ type: "spacer", height: 5 });
    summaryContent.push({
      type: "alert",
      severity: "warning",
      message: `Rating is on watch. Reason: ${rating.watchReason || "Under review"}`,
    });
  }

  sections.push({ title: "Rating Summary", content: summaryContent });

  // Section 2: Component Breakdown
  const compContent: ReportSectionContent[] = [];

  if (componentScores && componentScores.length > 0) {
    compContent.push({
      type: "table",
      headers: ["Component", "Score", "Weight", "Weighted Score", "Max Score"],
      rows: componentScores.map((c) => [
        c.name,
        `${c.score.toFixed(1)}`,
        `${Math.round(c.weight * 100)}%`,
        `${c.weightedScore.toFixed(1)}`,
        `${c.maxScore}`,
      ]),
    });
  } else {
    compContent.push({
      type: "text",
      value: "No component score breakdown available for this rating.",
    });
  }

  sections.push({ title: "Component Breakdown", content: compContent });

  // Section 3: Risk Register
  const riskContent: ReportSectionContent[] = [];

  if (riskRegister && riskRegister.length > 0) {
    const criticalCount = riskRegister.filter(
      (r) =>
        r.severity.toLowerCase() === "critical" ||
        r.severity.toLowerCase() === "high",
    ).length;

    if (criticalCount > 0) {
      riskContent.push({
        type: "alert",
        severity: "error",
        message: `${criticalCount} high/critical risk${criticalCount > 1 ? "s" : ""} identified requiring attention.`,
      });
      riskContent.push({ type: "spacer", height: 5 });
    }

    riskContent.push({
      type: "table",
      headers: [
        "Description",
        "Severity",
        "Likelihood",
        "Mitigation",
        "Reg. Reference",
      ],
      rows: riskRegister.map((r) => [
        r.description,
        r.severity,
        r.likelihood,
        r.mitigation,
        r.regulatoryReference,
      ]),
    });
  } else {
    riskContent.push({
      type: "text",
      value: "No risks identified in the current assessment.",
    });
  }

  sections.push({ title: "Risk Register", content: riskContent });

  // Section 4: Rating Action
  const actionContent: ReportSectionContent[] = [
    {
      type: "keyValue",
      items: [
        { key: "Action Type", value: formatActionType(rating.actionType) },
        {
          key: "Previous Grade",
          value: rating.previousGrade || "N/A (initial rating)",
        },
        {
          key: "Rationale",
          value: rating.actionRationale || "No specific rationale provided.",
        },
      ],
    },
  ];

  sections.push({ title: "Rating Action", content: actionContent });

  // Section 5: Methodology Summary
  const methContent: ReportSectionContent[] = [
    {
      type: "keyValue",
      items: [{ key: "Methodology Version", value: rating.methodologyVersion }],
    },
    { type: "spacer", height: 5 },
    {
      type: "text",
      value:
        "The Regulatory Credit Rating is computed using a weighted composite of six compliance dimensions: " +
        "Authorization Readiness, Cybersecurity Posture, Operational Compliance, " +
        "Multi-Jurisdictional Coverage, Regulatory Trajectory, and Governance & Process. " +
        "Each dimension is scored on a 0-100 scale and weighted according to its regulatory significance.",
    },
    { type: "spacer", height: 5 },
    {
      type: "text",
      value:
        "Grade Scale: AAA (95-100), AA+ (90-94), AA (85-89), AA- (80-84), " +
        "A+ (75-79), A (70-74), A- (65-69), BBB+ (60-64), BBB (55-59), BBB- (50-54), " +
        "BB+ (45-49), BB (40-44), BB- (35-39), B+ (30-34), B (25-29), B- (20-24), " +
        "CCC (15-19), CC (10-14), C (5-9), D (0-4).",
    },
  ];

  sections.push({ title: "Methodology Summary", content: methContent });

  // Section 6: Disclaimer
  sections.push({
    title: "Disclaimer",
    content: [
      {
        type: "alert",
        severity: "info",
        message:
          "This Regulatory Credit Rating is generated from self-reported compliance data " +
          "within the Caelex platform. It does not constitute a legal opinion, formal regulatory " +
          "assessment, or financial credit rating. Organizations should consult qualified legal " +
          "counsel for binding regulatory advice.",
      },
    ],
  });

  return sections;
}

function formatActionType(action: string): string {
  const labels: Record<string, string> = {
    INITIAL: "Initial Rating",
    AFFIRM: "Rating Affirmed",
    UPGRADE: "Rating Upgraded",
    DOWNGRADE: "Rating Downgraded",
    WATCH_ON: "Placed on Watch",
    WATCH_OFF: "Removed from Watch",
    WITHDRAWN: "Rating Withdrawn",
  };
  return labels[action] || action;
}
