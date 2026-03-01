/**
 * NIS2 Regulatory Requirements Seed Script
 *
 * Migrates all 51 NIS2 requirements from src/data/nis2-requirements.ts
 * into the RegulatoryRequirement table for ACE evidence tracking.
 *
 * This script runs as a Next.js API route for path alias support.
 * Use the admin API endpoint instead:
 *
 *   POST /api/admin/ace/seed-requirements
 *   Body: { "organizationId": "..." } or { "all": true }
 *
 * For standalone CLI usage (requires tsx):
 *   npx tsx prisma/seed-nis2-requirements.ts <organizationId | --all>
 *
 * Idempotent: safe to run multiple times (uses upsert on composite unique key).
 */

import { Prisma, PrismaClient, RegulationType } from "@prisma/client";

const prisma = new PrismaClient();

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

interface NIS2RequirementData {
  id: string;
  articleRef: string;
  category: string;
  title: string;
  description: string;
  complianceQuestion: string;
  spaceSpecificGuidance: string;
  applicableTo: Record<string, unknown>;
  euSpaceActRef?: string;
  euSpaceActArticleNumbers?: number[];
  enisaControlIds?: string[];
  iso27001Ref?: string;
  tips: string[];
  evidenceRequired: string[];
  severity: string;
  implementationTimeWeeks?: number;
  canBeSimplified: boolean;
  assessmentFields?: unknown[];
  complianceRule?: unknown;
}

/**
 * Seed NIS2 requirements for a single organization.
 * Exported for use by both CLI and API route.
 */
export async function seedNIS2ForOrganization(
  organizationId: string,
  requirements: NIS2RequirementData[],
  db = prisma,
): Promise<{ created: number; updated: number; total: number }> {
  let created = 0;
  let updated = 0;

  for (const req of requirements) {
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
        ? (req.assessmentFields as Prisma.InputJsonValue)
        : Prisma.DbNull,
      complianceRule: req.complianceRule
        ? (req.complianceRule as Prisma.InputJsonValue)
        : Prisma.DbNull,
      applicableTo: req.applicableTo as Prisma.InputJsonValue,
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

    const result = await db.regulatoryRequirement.upsert({
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

  return { created, updated, total: requirements.length };
}

// ─── CLI Entry Point ───

async function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error(
      "\nUsage: npx tsx prisma/seed-nis2-requirements.ts <organizationId | --all>",
    );
    console.error(
      "   Or: POST /api/admin/ace/seed-requirements { organizationId | all }\n",
    );
    process.exit(1);
  }

  // Dynamic import — tsx resolves @/ aliases via tsconfig
  let NIS2_REQUIREMENTS: NIS2RequirementData[];
  try {
    const mod = await import("../src/data/nis2-requirements");
    NIS2_REQUIREMENTS = mod.NIS2_REQUIREMENTS;
  } catch {
    console.error("\n  Cannot import NIS2 requirements (path alias issue).");
    console.error(
      "  Use the API endpoint instead: POST /api/admin/ace/seed-requirements\n",
    );
    process.exit(1);
  }

  console.log(`\n🔬 ACE — NIS2 Requirements Seed`);
  console.log(`   ${NIS2_REQUIREMENTS.length} requirements to seed\n`);

  if (arg === "--all") {
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    console.log(`   Found ${orgs.length} organizations`);

    let totalRecords = 0;
    for (const org of orgs) {
      console.log(`\n  Seeding for: ${org.name} (${org.id})`);
      const result = await seedNIS2ForOrganization(
        org.id,
        NIS2_REQUIREMENTS,
        prisma,
      );
      console.log(`  ✅ ${result.created} created, ${result.updated} updated`);
      totalRecords += result.total;
    }

    console.log(`\n   Done. ${totalRecords} total requirement records.\n`);
  } else {
    const org = await prisma.organization.findUnique({
      where: { id: arg },
      select: { id: true, name: true },
    });

    if (!org) {
      console.error(`  Organization ${arg} not found.`);
      process.exit(1);
    }

    console.log(`  Seeding for: ${org.name} (${org.id})`);
    const result = await seedNIS2ForOrganization(
      org.id,
      NIS2_REQUIREMENTS,
      prisma,
    );
    console.log(`  ✅ ${result.created} created, ${result.updated} updated`);
    console.log(`\n   Done.\n`);
  }
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
