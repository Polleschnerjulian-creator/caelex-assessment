/**
 * Admin: ACE — Seed Regulatory Requirements
 *
 * POST /api/admin/ace/seed-requirements
 *
 * Seeds NIS2 requirements into the RegulatoryRequirement table for ACE.
 *
 * Body:
 *   { "organizationId": "clxx..." }  — seed for a specific org
 *   { "all": true }                  — seed for all organizations
 */

import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NIS2_REQUIREMENTS } from "@/data/nis2-requirements";
import { Prisma, RegulationType } from "@prisma/client";
import { logger } from "@/lib/logger";

// ─── NIS2 Category → Regulation-Agnostic Category Mapping ───

const CATEGORY_MAP: Record<string, string> = {
  policies_risk_analysis: "cybersecurity",
  incident_handling: "incident_management",
  business_continuity: "business_continuity",
  supply_chain: "supply_chain_security",
  network_acquisition: "cybersecurity",
  effectiveness_assessment: "governance",
  cyber_hygiene: "cybersecurity",
  cryptography: "cybersecurity",
  hr_access_asset: "access_control",
  mfa_authentication: "access_control",
  governance: "governance",
  registration: "registration",
  reporting: "incident_reporting",
  information_sharing: "information_sharing",
};

async function seedForOrganization(organizationId: string) {
  let created = 0;
  let updated = 0;

  for (const req of NIS2_REQUIREMENTS) {
    const crossReferences: Record<string, unknown> = {};
    if (req.euSpaceActRef) crossReferences.euSpaceActRef = req.euSpaceActRef;
    if (req.euSpaceActArticleNumbers)
      crossReferences.euSpaceActArticleNumbers = req.euSpaceActArticleNumbers;
    if (req.enisaControlIds)
      crossReferences.enisaControlIds = req.enisaControlIds;
    if (req.iso27001Ref) crossReferences.iso27001Ref = req.iso27001Ref;

    const data = {
      title: req.title,
      description: req.description,
      category: CATEGORY_MAP[req.category] ?? req.category,
      subcategory: req.category,
      jurisdiction: "EU",
      evidenceRequired: req.evidenceRequired,
      assessmentFields: req.assessmentFields
        ? (req.assessmentFields as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      complianceRule: req.complianceRule
        ? (req.complianceRule as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      applicableTo: req.applicableTo as unknown as Prisma.InputJsonValue,
      severity: req.severity,
      implementationGuide: req.spaceSpecificGuidance,
      implementationTimeWeeks: req.implementationTimeWeeks ?? null,
      sourceArticle: req.articleRef,
      sourceDocument: "Directive (EU) 2022/2555 (NIS2)",
      crossReferences:
        Object.keys(crossReferences).length > 0
          ? (crossReferences as Prisma.InputJsonValue)
          : Prisma.DbNull,
    };

    const result = await prisma.regulatoryRequirement.upsert({
      where: {
        organizationId_regulationType_requirementId: {
          organizationId,
          regulationType: RegulationType.NIS2,
          requirementId: req.id,
        },
      },
      create: {
        organizationId,
        regulationType: RegulationType.NIS2,
        requirementId: req.id,
        mandatory: true,
        ...data,
      },
      update: data,
    });

    const isNew =
      Math.abs(result.createdAt.getTime() - result.updatedAt.getTime()) < 1000;
    if (isNew) created++;
    else updated++;
  }

  return { created, updated, total: NIS2_REQUIREMENTS.length };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const body = await request.json();
    const { organizationId, all } = body as {
      organizationId?: string;
      all?: boolean;
    };

    if (!organizationId && !all) {
      return NextResponse.json(
        {
          error: 'Provide either "organizationId" or "all": true',
        },
        { status: 400 },
      );
    }

    const results: Array<{
      organizationId: string;
      organizationName: string;
      created: number;
      updated: number;
      total: number;
    }> = [];

    if (all) {
      const orgs = await prisma.organization.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      for (const org of orgs) {
        const result = await seedForOrganization(org.id);
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          ...result,
        });
      }
    } else {
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true },
      });

      if (!org) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 404 },
        );
      }

      const result = await seedForOrganization(org.id);
      results.push({
        organizationId: org.id,
        organizationName: org.name,
        ...result,
      });
    }

    return NextResponse.json({
      success: true,
      regulation: "NIS2",
      requirementCount: NIS2_REQUIREMENTS.length,
      results,
    });
  } catch (error) {
    logger.error("[ACE Seed] Error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
