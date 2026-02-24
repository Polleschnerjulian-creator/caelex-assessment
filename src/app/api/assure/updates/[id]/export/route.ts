/**
 * Assure Investor Update PDF Export API
 * GET: Return PDF ReportConfig for an investor update.
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

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const identifier = getIdentifier(request, session.user.id);
    const rateLimit = await checkRateLimit("export", identifier);
    if (!rateLimit.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const material = await prisma.assureMaterial.findUnique({
      where: { id },
      include: {
        organization: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    });

    if (!material) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    if (material.organizationId !== membership.organizationId) {
      return NextResponse.json({ error: "Update not found" }, { status: 404 });
    }

    if (material.type !== "CUSTOM") {
      return NextResponse.json(
        { error: "Not an investor update" },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = material.profileSnapshot as any;

    const reportConfig: ReportConfig = {
      metadata: {
        reportId: material.id,
        reportType: "investor_update",
        title: material.title,
        generatedAt: material.createdAt,
        generatedBy: material.createdBy?.name || "System",
        organization: material.organization.name,
        version: `v${material.version}`,
      },
      header: {
        title: material.title,
        subtitle: `${material.organization.name} — Investor Update`,
        reportNumber: `UPDATE-${material.id.slice(-8).toUpperCase()}`,
        date: material.createdAt,
        logo: true,
      },
      footer: {
        pageNumbers: true,
        confidentialityNotice:
          "CONFIDENTIAL — This investor update contains proprietary business information. " +
          "Do not distribute without authorization.",
        disclaimer:
          "Forward-looking statements in this update are based on current expectations " +
          "and are subject to risks and uncertainties.",
      },
      sections: buildUpdateSections(content),
    };

    return NextResponse.json(reportConfig);
  } catch (error) {
    console.error("Assure investor update export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildUpdateSections(content: any): ReportSection[] {
  const sections: ReportSection[] = [];

  // Highlights
  if (content?.highlights?.length > 0) {
    sections.push({
      title: "Highlights",
      content: [{ type: "list", items: content.highlights, ordered: false }],
    });
  }

  // Key Metrics
  if (content?.metrics) {
    const m = content.metrics;
    const metricItems: Array<{ key: string; value: string }> = [];
    if (m.irsScore != null)
      metricItems.push({
        key: "Investment Readiness Score",
        value: `${m.irsScore}/100 (${m.irsGrade || "N/A"})`,
      });
    if (m.annualRevenue != null)
      metricItems.push({
        key: "Annual Revenue",
        value: `EUR ${m.annualRevenue.toLocaleString()}`,
      });
    if (m.revenueGrowthYoY != null)
      metricItems.push({
        key: "Revenue Growth YoY",
        value: `${m.revenueGrowthYoY}%`,
      });
    if (m.runway != null)
      metricItems.push({ key: "Cash Runway", value: `${m.runway} months` });
    if (m.cashPosition != null)
      metricItems.push({
        key: "Cash Position",
        value: `EUR ${m.cashPosition.toLocaleString()}`,
      });
    if (m.employeeCount != null)
      metricItems.push({ key: "Team Size", value: `${m.employeeCount}` });
    if (m.trlLevel != null)
      metricItems.push({ key: "TRL Level", value: `TRL ${m.trlLevel}` });

    if (metricItems.length > 0) {
      sections.push({
        title: "Key Metrics",
        content: [{ type: "keyValue", items: metricItems }],
      });
    }
  }

  // Milestones
  if (content?.milestones?.length > 0) {
    const milestoneContent: ReportSectionContent[] = [
      {
        type: "table",
        headers: ["Milestone", "Category", "Status", "Target Date", "Note"],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rows: content.milestones.map((m: any) => [
          m.title,
          m.category || "",
          m.status || "",
          m.targetDate ? new Date(m.targetDate).toLocaleDateString() : "N/A",
          m.investorNote || "",
        ]),
      },
    ];
    sections.push({ title: "Milestones", content: milestoneContent });
  }

  // Financials
  if (content?.financials) {
    const f = content.financials;
    const finItems: Array<{ key: string; value: string }> = [];
    if (f.annualRevenue != null)
      finItems.push({
        key: "Annual Revenue",
        value: `EUR ${f.annualRevenue.toLocaleString()}`,
      });
    if (f.monthlyBurnRate != null)
      finItems.push({
        key: "Monthly Burn Rate",
        value: `EUR ${f.monthlyBurnRate.toLocaleString()}`,
      });
    if (f.grossMargin != null)
      finItems.push({ key: "Gross Margin", value: `${f.grossMargin}%` });
    if (f.runway != null)
      finItems.push({ key: "Runway", value: `${f.runway} months` });
    if (f.isRaising)
      finItems.push({
        key: "Fundraising",
        value: f.targetRaise
          ? `EUR ${f.targetRaise.toLocaleString()}`
          : "Active",
      });

    if (finItems.length > 0) {
      sections.push({
        title: "Financial Summary",
        content: [{ type: "keyValue", items: finItems }],
      });
    }
  }

  // Custom Sections
  if (content?.customSections?.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const cs of content.customSections) {
      sections.push({
        title: cs.title,
        content: [{ type: "text", value: cs.content }],
      });
    }
  }

  return sections;
}
