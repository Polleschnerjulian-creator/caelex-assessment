/**
 * Assure DD Package PDF Export API
 * GET: Return package data formatted as ReportConfig for client-side PDF generation
 *
 * Returns a JSON response matching the ReportConfig type from src/lib/pdf/types.ts:
 * { metadata, header, footer, sections[] }
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
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface DDFactor {
  name: string;
  earnedPoints: number;
  maxPoints: number;
  completionPct: number;
  description: string;
}

interface DDComponent {
  name: string;
  score: number;
  weight: number;
  weightedScore: number;
  factors: DDFactor[];
}

interface DDRiskEntry {
  id: number;
  priority: string;
  component: string;
  risk: string;
  mitigation: string;
  impact: string;
}

interface DDPackageContent {
  executiveSummary: {
    organizationName: string;
    generatedAt: string;
    overallScore: number;
    grade: string;
    status: string;
    summaryText: string;
  };
  riskRegister: DDRiskEntry[];
  componentBreakdown: DDComponent[];
  methodology: {
    version: string;
    weights: Record<string, number>;
    description: string;
  };
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

    // Fetch the DD package
    const ddPackage = await prisma.assureDDPackage.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!ddPackage) {
      return NextResponse.json(
        { error: "DD package not found" },
        { status: 404 },
      );
    }

    // Verify package belongs to user's organization
    if (ddPackage.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "DD package not found" },
        { status: 404 },
      );
    }

    const content = ddPackage.content as unknown as DDPackageContent;

    // Build ReportConfig for client-side PDF rendering
    const reportConfig: ReportConfig = {
      metadata: {
        reportId: ddPackage.id,
        reportType: "compliance_certificate",
        title: ddPackage.title,
        generatedAt: ddPackage.generatedAt,
        generatedBy: ddPackage.createdBy?.name || "System",
        organization: ddPackage.organization.name,
        version: content.methodology?.version || "1.0",
      },
      header: {
        title: "Regulatory Due Diligence Package",
        subtitle: `${ddPackage.organization.name} — Regulatory Readiness Assessment`,
        reportNumber: `DD-${ddPackage.id.slice(-8).toUpperCase()}`,
        date: ddPackage.generatedAt,
        logo: true,
      },
      footer: {
        pageNumbers: true,
        confidentialityNotice:
          "CONFIDENTIAL — This document contains proprietary compliance information. " +
          "Do not distribute without authorization from the issuing organization.",
        disclaimer:
          "This regulatory readiness assessment is based on self-reported compliance data " +
          "and does not constitute legal advice or a binding regulatory opinion.",
      },
      sections: buildReportSections(content, ddPackage.generatedAt),
    };

    return NextResponse.json(reportConfig);
  } catch (error) {
    logger.error("DD package export API error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function buildReportSections(
  content: DDPackageContent,
  generatedAt: Date,
): ReportSection[] {
  const sections: ReportSection[] = [];

  // Section 1: Executive Summary
  const execContent: ReportSectionContent[] = [
    {
      type: "keyValue",
      items: [
        {
          key: "Organization",
          value: content.executiveSummary.organizationName,
        },
        {
          key: "Assessment Date",
          value: generatedAt.toISOString().split("T")[0],
        },
        {
          key: "Overall Score",
          value: `${content.executiveSummary.overallScore}/100`,
        },
        { key: "Grade", value: content.executiveSummary.grade },
        {
          key: "Status",
          value: content.executiveSummary.status.replace(/_/g, " "),
        },
      ],
    },
    { type: "spacer", height: 10 },
    { type: "text", value: content.executiveSummary.summaryText },
  ];
  sections.push({ title: "Executive Summary", content: execContent });

  // Section 2: Component Breakdown
  const compContent: ReportSectionContent[] = [];

  // Summary table
  compContent.push({
    type: "table",
    headers: ["Component", "Score", "Weight", "Weighted Score"],
    rows: content.componentBreakdown.map((c) => [
      c.name,
      `${c.score}/100`,
      `${Math.round(c.weight * 100)}%`,
      `${c.weightedScore}`,
    ]),
  });

  compContent.push({ type: "spacer", height: 10 });

  // Detailed factor breakdown per component
  for (const component of content.componentBreakdown) {
    compContent.push({
      type: "heading",
      value: component.name,
      level: 2,
    });

    compContent.push({
      type: "table",
      headers: ["Factor", "Score", "Max", "Completion", "Description"],
      rows: component.factors.map((f) => [
        f.name,
        `${f.earnedPoints}`,
        `${f.maxPoints}`,
        `${f.completionPct}%`,
        f.description,
      ]),
    });

    compContent.push({ type: "spacer", height: 5 });
  }

  sections.push({
    title: "Component Breakdown",
    content: compContent,
  });

  // Section 3: Risk Register
  if (content.riskRegister.length > 0) {
    const riskContent: ReportSectionContent[] = [];

    // Alert for critical items
    const criticalCount = content.riskRegister.filter(
      (r) => r.priority === "critical",
    ).length;
    if (criticalCount > 0) {
      riskContent.push({
        type: "alert",
        severity: "error",
        message: `${criticalCount} critical risk${criticalCount > 1 ? "s" : ""} identified requiring immediate attention.`,
      });
      riskContent.push({ type: "spacer", height: 5 });
    }

    riskContent.push({
      type: "table",
      headers: ["#", "Priority", "Component", "Risk", "Mitigation", "Impact"],
      rows: content.riskRegister.map((r) => [
        `${r.id}`,
        r.priority.toUpperCase(),
        r.component,
        r.risk,
        r.mitigation,
        r.impact,
      ]),
    });

    sections.push({ title: "Risk Register", content: riskContent });
  }

  // Section 4: Methodology
  const methContent: ReportSectionContent[] = [
    {
      type: "text",
      value: content.methodology.description,
    },
    { type: "spacer", height: 10 },
    {
      type: "keyValue",
      items: [
        { key: "Methodology Version", value: content.methodology.version },
        ...Object.entries(content.methodology.weights).map(([k, v]) => ({
          key: formatComponentName(k),
          value: `${Math.round(v * 100)}%`,
        })),
      ],
    },
  ];
  sections.push({ title: "Methodology", content: methContent });

  // Section 5: Disclaimer
  sections.push({
    title: "Disclaimer",
    content: [
      {
        type: "alert",
        severity: "info",
        message:
          "This Due Diligence Package is generated from self-reported compliance data within the Caelex platform. " +
          "It does not constitute a legal opinion or formal regulatory assessment. " +
          "Organizations should consult qualified legal counsel for binding regulatory advice.",
      },
    ],
  });

  return sections;
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
