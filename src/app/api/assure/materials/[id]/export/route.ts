/**
 * Assure Material PDF Export API
 * GET: Return PDF ReportConfig JSON (like existing DD package export pattern).
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
  ReportType,
} from "@/lib/pdf/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const MATERIAL_TYPE_TO_REPORT_TYPE: Record<string, ReportType> = {
  EXECUTIVE_SUMMARY: "executive_summary",
  INVESTMENT_TEASER: "investment_teaser",
  COMPANY_PROFILE_MAT: "assure_company_profile",
  RISK_REPORT: "assure_risk_report",
  CUSTOM: "executive_summary",
};

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
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 },
      );
    }

    if (material.organizationId !== membership.organizationId) {
      return NextResponse.json(
        { error: "Material not found" },
        { status: 404 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snapshot = material.profileSnapshot as any;
    const reportType =
      MATERIAL_TYPE_TO_REPORT_TYPE[material.type] || "executive_summary";

    const reportConfig: ReportConfig = {
      metadata: {
        reportId: material.id,
        reportType,
        title: material.title,
        generatedAt: material.createdAt,
        generatedBy: material.createdBy?.name || "System",
        organization: material.organization.name,
        version: `v${material.version}`,
      },
      header: {
        title: material.title,
        subtitle: `${material.organization.name} — Investment Materials`,
        reportNumber: `MAT-${material.id.slice(-8).toUpperCase()}`,
        date: material.createdAt,
        logo: true,
      },
      footer: {
        pageNumbers: true,
        confidentialityNotice:
          "CONFIDENTIAL — This document contains proprietary business information. " +
          "Do not distribute without authorization from the issuing organization.",
        disclaimer:
          "This material is based on self-reported company data and does not constitute " +
          "investment advice or a solicitation to purchase securities.",
      },
      sections: buildMaterialSections(
        material.type,
        snapshot,
        material.organization.name,
      ),
    };

    return NextResponse.json(reportConfig);
  } catch (error) {
    logger.error("Assure material export error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function buildMaterialSections(
  type: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  snapshot: any,
  orgName: string,
): ReportSection[] {
  const sections: ReportSection[] = [];

  // Executive Summary section (always included)
  const execContent: ReportSectionContent[] = [
    {
      type: "keyValue",
      items: [
        { key: "Company", value: snapshot?.companyName || orgName },
        { key: "Stage", value: snapshot?.stage || "N/A" },
        {
          key: "Founded",
          value: snapshot?.foundedDate
            ? new Date(snapshot.foundedDate).getFullYear().toString()
            : "N/A",
        },
        { key: "Headquarters", value: snapshot?.headquarters || "N/A" },
        {
          key: "Team Size",
          value: snapshot?.employeeCount?.toString() || "N/A",
        },
      ],
    },
  ];

  if (snapshot?.oneLiner) {
    execContent.push({ type: "spacer", height: 10 });
    execContent.push({ type: "text", value: snapshot.oneLiner });
  }

  if (snapshot?.missionStatement) {
    execContent.push({ type: "spacer", height: 5 });
    execContent.push({ type: "text", value: snapshot.missionStatement });
  }

  sections.push({ title: "Company Overview", content: execContent });

  // Technology section
  if (snapshot?.techProfile && type !== "RISK_REPORT") {
    const tech = snapshot.techProfile;
    const techContent: ReportSectionContent[] = [];
    const techItems: Array<{ key: string; value: string }> = [];
    if (tech.trlLevel)
      techItems.push({ key: "TRL Level", value: `TRL ${tech.trlLevel}` });
    if (tech.productName)
      techItems.push({ key: "Product", value: tech.productName });
    if (tech.productStatus)
      techItems.push({ key: "Status", value: tech.productStatus });
    if (techItems.length > 0) {
      techContent.push({ type: "keyValue", items: techItems });
    }
    if (tech.productDescription) {
      techContent.push({ type: "text", value: tech.productDescription });
    }
    if (techContent.length > 0) {
      sections.push({ title: "Technology", content: techContent });
    }
  }

  // Financial section
  if (snapshot?.financialProfile) {
    const fin = snapshot.financialProfile;
    const finItems: Array<{ key: string; value: string }> = [];
    if (fin.annualRevenue != null)
      finItems.push({
        key: "Annual Revenue",
        value: `EUR ${fin.annualRevenue.toLocaleString()}`,
      });
    if (fin.totalRaised != null)
      finItems.push({
        key: "Total Raised",
        value: `EUR ${fin.totalRaised.toLocaleString()}`,
      });
    if (fin.runway != null)
      finItems.push({ key: "Runway", value: `${fin.runway} months` });
    if (fin.grossMargin != null)
      finItems.push({ key: "Gross Margin", value: `${fin.grossMargin}%` });
    if (finItems.length > 0) {
      sections.push({
        title: "Financials",
        content: [{ type: "keyValue", items: finItems }],
      });
    }
  }

  // Disclaimer
  sections.push({
    title: "Disclaimer",
    content: [
      {
        type: "alert",
        severity: "info",
        message:
          "This material is generated from self-reported data within the Caelex Assure platform. " +
          "It does not constitute investment advice, a prospectus, or an offer to sell securities.",
      },
    ],
  });

  return sections;
}
