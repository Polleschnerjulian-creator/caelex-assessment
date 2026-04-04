import "server-only";

import { prisma } from "@/lib/prisma";
import {
  isModuleInScope,
  isDataTypeInScope,
} from "./legal-scope-service.server";
import { CRA_REQUIREMENTS } from "@/data/cra-requirements";
import { NIS2_REQUIREMENTS } from "@/data/nis2-requirements";
import { cybersecurityRequirements } from "@/data/cybersecurity-requirements";

// ============================================================================
// Types
// ============================================================================

export interface LegalBriefing {
  client: {
    name: string;
    country: string | null;
  };
  engagement: {
    type: string;
    createdAt: string;
    expiresAt: string;
    scopedModules: string[];
  };
  executiveSummary: string;
  compliancePosture: {
    overallScore: number;
    moduleScores: Record<
      string,
      { score: number; total: number; compliant: number }
    >;
  };
  keyGaps: Array<{
    requirementId: string;
    title: string;
    severity: string;
    module: string;
    legalImplication: string;
  }>;
  keyStrengths: Array<{
    area: string;
    detail: string;
  }>;
  timeline: Array<{
    date: string;
    event: string;
    criticality: string;
  }>;
  documents: Array<{
    name: string;
    category: string;
    status: string;
    reviewStatus: string;
  }>;
}

// ============================================================================
// Internal Types
// ============================================================================

interface RequirementGap {
  requirementId: string;
  title: string;
  articleRef: string;
  severity: "critical" | "major" | "minor";
  status: string;
  module: string;
  category: string;
  nis2Ref?: string;
}

interface ModuleScoreData {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  score: number;
}

// ============================================================================
// CRA Penalty Reference Data
// ============================================================================

/**
 * CRA penalty amounts from Art. 64 CRA:
 * - Essential requirements (Annex I): up to EUR 15,000,000 or 2.5% of global turnover
 * - Other obligations: up to EUR 10,000,000 or 2% of global turnover
 * - Incorrect/incomplete info to authorities: up to EUR 5,000,000 or 1% of global turnover
 */
const CRA_PENALTIES: Record<string, { maxFine: string; basis: string }> = {
  security_by_design: {
    maxFine: "15,000,000",
    basis:
      "Art. 64(1) CRA — essential cybersecurity requirements (Annex I, Part I)",
  },
  vulnerability_handling: {
    maxFine: "15,000,000",
    basis:
      "Art. 64(1) CRA — essential cybersecurity requirements (Annex I, Part II)",
  },
  documentation: {
    maxFine: "10,000,000",
    basis: "Art. 64(2) CRA — technical documentation obligations",
  },
  conformity_assessment: {
    maxFine: "10,000,000",
    basis: "Art. 64(2) CRA — conformity assessment procedure obligations",
  },
  incident_reporting: {
    maxFine: "10,000,000",
    basis: "Art. 64(2) CRA — incident and vulnerability reporting obligations",
  },
  post_market_obligations: {
    maxFine: "10,000,000",
    basis: "Art. 64(2) CRA — post-market surveillance obligations",
  },
  software_update: {
    maxFine: "15,000,000",
    basis:
      "Art. 64(1) CRA — essential cybersecurity requirements (Annex I, Part I)",
  },
  sbom: {
    maxFine: "10,000,000",
    basis: "Art. 64(2) CRA — technical documentation obligations (SBOM)",
  },
  support_period: {
    maxFine: "10,000,000",
    basis: "Art. 64(2) CRA — support period obligations",
  },
};

/**
 * NIS2 penalty reference from Art. 34:
 * - Essential entities: up to EUR 10,000,000 or 2% of global turnover
 * - Important entities: up to EUR 7,000,000 or 1.4% of global turnover
 */
const NIS2_PENALTIES = {
  essential: { maxFine: "10,000,000", pct: "2%" },
  important: { maxFine: "7,000,000", pct: "1.4%" },
};

// ============================================================================
// Regulatory Deadlines (Statutory)
// ============================================================================

const STATUTORY_DEADLINES: Array<{
  date: string;
  event: string;
  criticality: string;
  modules: string[];
}> = [
  {
    date: "2025-12-11",
    event:
      "CRA enters into force — reporting obligations for manufacturers begin (Art. 14 CRA)",
    criticality: "critical",
    modules: ["cra"],
  },
  {
    date: "2026-09-11",
    event:
      "CRA conformity assessment bodies must be notified and operational (Art. 35 CRA)",
    criticality: "major",
    modules: ["cra"],
  },
  {
    date: "2027-12-11",
    event:
      "CRA full application — all essential requirements enforceable (Art. 69 CRA)",
    criticality: "critical",
    modules: ["cra"],
  },
  {
    date: "2024-10-18",
    event:
      "NIS2 transposition deadline — Member States must adopt national measures (Art. 41 NIS2)",
    criticality: "critical",
    modules: ["nis2"],
  },
  {
    date: "2025-04-17",
    event:
      "NIS2 entity registration deadline — essential and important entities must register with competent authorities (Art. 3(3) NIS2)",
    criticality: "critical",
    modules: ["nis2"],
  },
  {
    date: "2025-10-17",
    event:
      "NIS2 implementing acts on technical/methodological requirements due (Art. 21(5) NIS2)",
    criticality: "major",
    modules: ["nis2"],
  },
];

// ============================================================================
// Main Function
// ============================================================================

export async function generateLegalBriefing(
  organizationId: string,
  engagementScope: {
    modules: string[];
    dataTypes: string[];
    assessmentIds: string[];
    includeNIS2Overlap: boolean;
  },
): Promise<LegalBriefing> {
  // 1. Fetch organization info
  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      name: true,
      timezone: true,
      billingAddress: true,
    },
  });

  // Derive country from billing address or timezone
  const billingAddr = org.billingAddress as Record<string, string> | null;
  const country =
    billingAddr?.country ?? deriveCountryFromTimezone(org.timezone);

  // 2. Fetch the engagement record
  const engagement = await prisma.legalEngagement.findFirst({
    where: {
      organizationId,
      scopedModules: { hasSome: engagementScope.modules },
      status: "active",
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Fetch all assessment data in parallel
  const [
    craAssessments,
    nis2Assessments,
    cyberAssessments,
    documents,
    deadlines,
  ] = await Promise.all([
    fetchCRAAssessments(organizationId, engagementScope),
    fetchNIS2Assessments(organizationId, engagementScope),
    fetchCybersecurityAssessments(organizationId, engagementScope),
    fetchScopedDocuments(organizationId, engagementScope),
    fetchUpcomingDeadlines(organizationId),
  ]);

  // 4. Compute compliance scores per module
  const moduleScores: Record<string, ModuleScoreData> = {};
  const allGaps: RequirementGap[] = [];
  const allStrengths: Array<{ area: string; detail: string }> = [];

  // --- CRA ---
  if (isModuleInScope(engagementScope.modules, "cra")) {
    const craData = analyzeCRACompliance(craAssessments);
    moduleScores.cra = craData.score;
    allGaps.push(...craData.gaps);
    allStrengths.push(...craData.strengths);
  }

  // --- NIS2 ---
  if (isModuleInScope(engagementScope.modules, "nis2")) {
    const nis2Data = analyzeNIS2Compliance(nis2Assessments);
    moduleScores.nis2 = nis2Data.score;
    allGaps.push(...nis2Data.gaps);
    allStrengths.push(...nis2Data.strengths);
  }

  // --- Cybersecurity (ENISA/EU Space Act) ---
  if (isModuleInScope(engagementScope.modules, "cybersecurity")) {
    const cyberData = analyzeCybersecurityCompliance(cyberAssessments);
    moduleScores.cybersecurity = cyberData.score;
    allGaps.push(...cyberData.gaps);
    allStrengths.push(...cyberData.strengths);
  }

  // --- NIS2 overlap for CRA engagements ---
  if (
    engagementScope.includeNIS2Overlap &&
    !isModuleInScope(engagementScope.modules, "nis2")
  ) {
    const nis2OverlapData = analyzeNIS2Compliance(nis2Assessments);
    moduleScores.nis2_overlap = nis2OverlapData.score;
    // Only include critical NIS2 gaps that overlap with CRA scope
    const overlappingGaps = nis2OverlapData.gaps.filter(
      (g) => g.severity === "critical",
    );
    allGaps.push(
      ...overlappingGaps.map((g) => ({ ...g, module: "nis2_overlap" })),
    );
  }

  // 5. Calculate overall score
  const moduleScopeEntries = Object.values(moduleScores);
  const overallScore =
    moduleScopeEntries.length > 0
      ? Math.round(
          moduleScopeEntries.reduce((sum, m) => sum + m.score, 0) /
            moduleScopeEntries.length,
        )
      : 0;

  // 6. Sort gaps by severity (critical > major > minor)
  const severityOrder: Record<string, number> = {
    critical: 0,
    major: 1,
    minor: 2,
  };
  allGaps.sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3),
  );

  // 7. Generate legal implications for each gap
  const keyGaps = allGaps.map((gap) => ({
    requirementId: gap.requirementId,
    title: gap.title,
    severity: gap.severity,
    module: gap.module,
    legalImplication: generateLegalImplication(gap),
  }));

  // 8. Build timeline from statutory deadlines + org-specific deadlines
  const timelineEntries = buildTimeline(engagementScope.modules, deadlines);

  // 9. Format documents
  const documentList = documents.map((doc) => ({
    name: doc.name,
    category: doc.category,
    status: doc.status,
    reviewStatus: deriveDocumentReviewStatus(doc),
  }));

  // 10. Generate executive summary
  const executiveSummary = generateExecutiveSummary(
    org.name,
    overallScore,
    moduleScores,
    allGaps,
    allStrengths,
    engagementScope.modules,
  );

  // 11. Format module scores for output
  const formattedModuleScores: Record<
    string,
    { score: number; total: number; compliant: number }
  > = {};
  for (const [key, data] of Object.entries(moduleScores)) {
    formattedModuleScores[key] = {
      score: data.score,
      total: data.total,
      compliant: data.compliant,
    };
  }

  return {
    client: {
      name: org.name,
      country,
    },
    engagement: {
      type: engagement?.engagementType ?? "custom",
      createdAt:
        engagement?.createdAt.toISOString() ?? new Date().toISOString(),
      expiresAt:
        engagement?.expiresAt.toISOString() ??
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      scopedModules: engagementScope.modules,
    },
    executiveSummary,
    compliancePosture: {
      overallScore,
      moduleScores: formattedModuleScores,
    },
    keyGaps,
    keyStrengths: allStrengths,
    timeline: timelineEntries,
    documents: documentList,
  };
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchCRAAssessments(
  organizationId: string,
  scope: { assessmentIds: string[]; dataTypes: string[] },
) {
  if (
    !isDataTypeInScope(scope.dataTypes, "assessment") &&
    !isDataTypeInScope(scope.dataTypes, "requirements")
  ) {
    return [];
  }

  const whereClause: Record<string, unknown> = { organizationId };
  if (scope.assessmentIds.length > 0) {
    whereClause.id = { in: scope.assessmentIds };
  }

  return prisma.cRAAssessment.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: {
          requirementId: true,
          status: true,
          notes: true,
        },
      },
    },
  });
}

async function fetchNIS2Assessments(
  organizationId: string,
  scope: { assessmentIds: string[]; dataTypes: string[] },
) {
  if (
    !isDataTypeInScope(scope.dataTypes, "assessment") &&
    !isDataTypeInScope(scope.dataTypes, "requirements")
  ) {
    return [];
  }

  const whereClause: Record<string, unknown> = { organizationId };
  if (scope.assessmentIds.length > 0) {
    whereClause.id = { in: scope.assessmentIds };
  }

  return prisma.nIS2Assessment.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: {
          requirementId: true,
          status: true,
          notes: true,
        },
      },
    },
  });
}

async function fetchCybersecurityAssessments(
  organizationId: string,
  scope: { assessmentIds: string[]; dataTypes: string[] },
) {
  if (
    !isDataTypeInScope(scope.dataTypes, "assessment") &&
    !isDataTypeInScope(scope.dataTypes, "requirements")
  ) {
    return [];
  }

  const whereClause: Record<string, unknown> = { organizationId };
  if (scope.assessmentIds.length > 0) {
    whereClause.id = { in: scope.assessmentIds };
  }

  return prisma.cybersecurityAssessment.findMany({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: {
          requirementId: true,
          status: true,
          notes: true,
        },
      },
    },
  });
}

async function fetchScopedDocuments(
  organizationId: string,
  scope: { dataTypes: string[] },
) {
  if (!isDataTypeInScope(scope.dataTypes, "documents")) {
    return [];
  }

  return prisma.document.findMany({
    where: {
      organizationId,
      isLatest: true,
    },
    select: {
      name: true,
      category: true,
      status: true,
      reviewedBy: true,
      reviewedAt: true,
      approvedBy: true,
      approvedAt: true,
      expiryDate: true,
      isExpired: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

async function fetchUpcomingDeadlines(organizationId: string) {
  // Deadlines are user-scoped; fetch via org members
  const members = await prisma.organizationMember.findMany({
    where: { organizationId },
    select: { userId: true },
  });

  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return [];

  return prisma.deadline.findMany({
    where: {
      userId: { in: userIds },
      status: { in: ["UPCOMING", "DUE_SOON", "OVERDUE"] },
      dueDate: {
        gte: new Date(),
        lte: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      title: true,
      dueDate: true,
      priority: true,
      category: true,
      regulatoryRef: true,
      status: true,
    },
    orderBy: { dueDate: "asc" },
    take: 20,
  });
}

// ============================================================================
// Compliance Analysis
// ============================================================================

function analyzeCRACompliance(
  assessments: Array<{
    requirements: Array<{
      requirementId: string;
      status: string;
      notes: string | null;
    }>;
  }>,
): {
  score: ModuleScoreData;
  gaps: RequirementGap[];
  strengths: Array<{ area: string; detail: string }>;
} {
  // Merge all requirement statuses (latest status wins)
  const statusMap = mergeRequirementStatuses(assessments);
  const craReqMap = new Map(CRA_REQUIREMENTS.map((r) => [r.id, r]));

  let total = 0;
  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let notAssessed = 0;
  const gaps: RequirementGap[] = [];
  const strengths: Array<{ area: string; detail: string }> = [];

  // Track compliant categories for strength detection
  const categoryCompliance: Record<
    string,
    { compliant: number; total: number }
  > = {};

  for (const req of CRA_REQUIREMENTS) {
    const status = statusMap.get(req.id) ?? "not_assessed";
    total++;

    const cat = req.category;
    if (!categoryCompliance[cat]) {
      categoryCompliance[cat] = { compliant: 0, total: 0 };
    }
    categoryCompliance[cat].total++;

    switch (status) {
      case "compliant":
        compliant++;
        categoryCompliance[cat].compliant++;
        break;
      case "partial":
        partial++;
        // Partial is still a gap for legal purposes
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status,
          module: "cra",
          category: req.category,
          nis2Ref: req.nis2Ref,
        });
        break;
      case "non_compliant":
        nonCompliant++;
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status,
          module: "cra",
          category: req.category,
          nis2Ref: req.nis2Ref,
        });
        break;
      default:
        notAssessed++;
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status: "not_assessed",
          module: "cra",
          category: req.category,
          nis2Ref: req.nis2Ref,
        });
        break;
    }
  }

  // Identify strengths: categories where >= 80% requirements are compliant
  for (const [cat, data] of Object.entries(categoryCompliance)) {
    if (data.total > 0 && data.compliant / data.total >= 0.8) {
      const categoryLabel = formatCRACategory(cat);
      strengths.push({
        area: `CRA ${categoryLabel}`,
        detail: `${data.compliant}/${data.total} requirements compliant — strong posture in ${categoryLabel.toLowerCase()} under the Cyber Resilience Act.`,
      });
    }
  }

  const score =
    total > 0 ? Math.round(((compliant + 0.5 * partial) / total) * 100) : 0;

  return {
    score: { total, compliant, partial, nonCompliant, notAssessed, score },
    gaps,
    strengths,
  };
}

function analyzeNIS2Compliance(
  assessments: Array<{
    requirements: Array<{
      requirementId: string;
      status: string;
      notes: string | null;
    }>;
    entityClassification?: string | null;
  }>,
): {
  score: ModuleScoreData;
  gaps: RequirementGap[];
  strengths: Array<{ area: string; detail: string }>;
} {
  const statusMap = mergeRequirementStatuses(assessments);
  const nis2ReqMap = new Map(NIS2_REQUIREMENTS.map((r) => [r.id, r]));

  // Determine entity classification from most recent assessment
  const entityClassification =
    assessments[0]?.entityClassification ?? "essential";

  let total = 0;
  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let notAssessed = 0;
  const gaps: RequirementGap[] = [];
  const strengths: Array<{ area: string; detail: string }> = [];

  const categoryCompliance: Record<
    string,
    { compliant: number; total: number }
  > = {};

  for (const req of NIS2_REQUIREMENTS) {
    const status = statusMap.get(req.id) ?? "not_assessed";
    total++;

    const cat = req.category;
    if (!categoryCompliance[cat]) {
      categoryCompliance[cat] = { compliant: 0, total: 0 };
    }
    categoryCompliance[cat].total++;

    switch (status) {
      case "compliant":
        compliant++;
        categoryCompliance[cat].compliant++;
        break;
      case "partial":
        partial++;
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status,
          module: "nis2",
          category: req.category,
        });
        break;
      case "non_compliant":
        nonCompliant++;
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status,
          module: "nis2",
          category: req.category,
        });
        break;
      case "not_applicable":
        // Not applicable does not count as a gap
        total--;
        break;
      default:
        notAssessed++;
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status: "not_assessed",
          module: "nis2",
          category: req.category,
        });
        break;
    }
  }

  for (const [cat, data] of Object.entries(categoryCompliance)) {
    if (data.total > 0 && data.compliant / data.total >= 0.8) {
      const categoryLabel = formatNIS2Category(cat);
      strengths.push({
        area: `NIS2 ${categoryLabel}`,
        detail: `${data.compliant}/${data.total} requirements compliant — ${categoryLabel.toLowerCase()} measures meet NIS2 Art. 21 standards.`,
      });
    }
  }

  const score =
    total > 0 ? Math.round(((compliant + 0.5 * partial) / total) * 100) : 0;

  return {
    score: { total, compliant, partial, nonCompliant, notAssessed, score },
    gaps,
    strengths,
  };
}

function analyzeCybersecurityCompliance(
  assessments: Array<{
    requirements: Array<{
      requirementId: string;
      status: string;
      notes: string | null;
    }>;
  }>,
): {
  score: ModuleScoreData;
  gaps: RequirementGap[];
  strengths: Array<{ area: string; detail: string }>;
} {
  const statusMap = mergeRequirementStatuses(assessments);

  let total = 0;
  let compliant = 0;
  let partial = 0;
  let nonCompliant = 0;
  let notAssessed = 0;
  const gaps: RequirementGap[] = [];
  const strengths: Array<{ area: string; detail: string }> = [];

  const categoryCompliance: Record<
    string,
    { compliant: number; total: number }
  > = {};

  for (const req of cybersecurityRequirements) {
    const status = statusMap.get(req.id) ?? "not_assessed";
    total++;

    const cat = req.category;
    if (!categoryCompliance[cat]) {
      categoryCompliance[cat] = { compliant: 0, total: 0 };
    }
    categoryCompliance[cat].total++;

    switch (status) {
      case "compliant":
        compliant++;
        categoryCompliance[cat].compliant++;
        break;
      case "partial":
        partial++;
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status,
          module: "cybersecurity",
          category: req.category,
        });
        break;
      case "non_compliant":
        nonCompliant++;
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status,
          module: "cybersecurity",
          category: req.category,
        });
        break;
      case "not_applicable":
        total--;
        break;
      default:
        notAssessed++;
        gaps.push({
          requirementId: req.id,
          title: req.title,
          articleRef: req.articleRef,
          severity: req.severity,
          status: "not_assessed",
          module: "cybersecurity",
          category: req.category,
        });
        break;
    }
  }

  for (const [cat, data] of Object.entries(categoryCompliance)) {
    if (data.total > 0 && data.compliant / data.total >= 0.8) {
      const categoryLabel = formatCyberCategory(cat);
      strengths.push({
        area: `Cybersecurity ${categoryLabel}`,
        detail: `${data.compliant}/${data.total} requirements compliant — ${categoryLabel.toLowerCase()} controls aligned with ENISA space cybersecurity guidelines.`,
      });
    }
  }

  const score =
    total > 0 ? Math.round(((compliant + 0.5 * partial) / total) * 100) : 0;

  return {
    score: { total, compliant, partial, nonCompliant, notAssessed, score },
    gaps,
    strengths,
  };
}

// ============================================================================
// Legal Implication Generator
// ============================================================================

function generateLegalImplication(gap: RequirementGap): string {
  const {
    module,
    severity,
    articleRef,
    status,
    category,
    requirementId,
    title,
    nis2Ref,
  } = gap;

  // --- CRA implications ---
  if (module === "cra" || module === "cra_overlap") {
    const penalty = CRA_PENALTIES[category];
    const maxFine = penalty?.maxFine ?? "15,000,000";

    if (severity === "critical" && status === "non_compliant") {
      return buildCRACriticalImplication(
        requirementId,
        articleRef,
        maxFine,
        title,
        nis2Ref,
      );
    }
    if (severity === "critical" && status === "not_assessed") {
      return `Assessment required under ${articleRef}. Until compliance status is established, CE marking cannot be presumed. Non-compliance may result in fines up to EUR ${maxFine} or 2.5% of global annual turnover (${penalty?.basis ?? "Art. 64 CRA"}).`;
    }
    if (severity === "critical" && status === "partial") {
      return `Partially addressed under ${articleRef}. Partial implementation does not satisfy essential requirements for CE marking. Notified Bodies will require full evidence of conformity. Potential fines up to EUR ${maxFine}.`;
    }
    if (
      severity === "major" &&
      (status === "non_compliant" || status === "not_assessed")
    ) {
      return `Required under ${articleRef}. Absence will delay conformity assessment and may prevent CE marking. Market surveillance authorities may request corrective action or product recall under Art. 52 CRA.`;
    }
    if (severity === "major" && status === "partial") {
      return `Partially addressed under ${articleRef}. Auditors and Notified Bodies will likely require additional evidence before issuing EU declaration of conformity.`;
    }
    // Minor
    return `Recommended under ${articleRef}. Not blocking for CE marking but will be flagged by auditors during conformity assessment. Best practice for ongoing market surveillance readiness.`;
  }

  // --- NIS2 implications ---
  if (module === "nis2" || module === "nis2_overlap") {
    if (severity === "critical" && status === "non_compliant") {
      return `Non-compliance with ${articleRef} may result in administrative fines up to EUR ${NIS2_PENALTIES.essential.maxFine} or ${NIS2_PENALTIES.essential.pct} of global annual turnover for essential entities (Art. 34(4) NIS2). National competent authorities may impose binding instructions and compliance monitoring orders.`;
    }
    if (
      severity === "critical" &&
      (status === "not_assessed" || status === "partial")
    ) {
      return `${articleRef} mandates this measure for space sector entities (Annex I, Sector 11). Until fully implemented, the entity remains non-compliant and subject to supervisory measures under Art. 32 NIS2, including on-site inspections and targeted security audits.`;
    }
    if (
      severity === "major" &&
      (status === "non_compliant" || status === "not_assessed")
    ) {
      return `Required under ${articleRef}. Absence constitutes a deficiency in the Art. 21 risk management framework. NCAs may issue warnings and require remediation within a defined timeline.`;
    }
    if (severity === "major" && status === "partial") {
      return `Partially addressed under ${articleRef}. NCA audit may require evidence of full implementation. Incomplete measures reduce the overall effectiveness of the Art. 21 cybersecurity risk-management posture.`;
    }
    return `Recommended under ${articleRef}. Not a primary enforcement target but may be flagged during NCA audits or peer reviews. Addresses defense-in-depth expectations.`;
  }

  // --- Cybersecurity / ENISA implications ---
  if (module === "cybersecurity") {
    if (
      severity === "critical" &&
      (status === "non_compliant" || status === "not_assessed")
    ) {
      return `Non-compliance with ${articleRef} of the EU Space Act cybersecurity framework. Space operators must implement this measure to maintain operational authorization. Failure may trigger supervisory review and potential suspension of space operations permits.`;
    }
    if (severity === "critical" && status === "partial") {
      return `Partially addressed under ${articleRef}. ENISA guidelines require full implementation for space operators. Partial compliance may be flagged during supervisory audits and could affect operational certification renewal.`;
    }
    if (
      severity === "major" &&
      (status === "non_compliant" || status === "not_assessed")
    ) {
      return `Required under ${articleRef}. Gap in this area weakens the overall cybersecurity posture required for space operations. Regulators may require remediation as a condition for continued operational approval.`;
    }
    if (severity === "major" && status === "partial") {
      return `Partially addressed under ${articleRef}. Full implementation expected by regulatory authorities for space system operators under the EU cybersecurity framework.`;
    }
    return `Recommended under ${articleRef}. Aligns with ENISA best practices for space sector cybersecurity. Auditors may note this as an area for improvement.`;
  }

  // Fallback
  return `Gap identified for ${articleRef} (${title}). Review required to determine legal exposure.`;
}

/**
 * Generate specific CRA critical-severity implications with contextual detail.
 */
function buildCRACriticalImplication(
  requirementId: string,
  articleRef: string,
  maxFine: string,
  title: string,
  nis2Ref?: string,
): string {
  // Specific high-value implications based on requirement type
  const specificContext = getCRASpecificContext(requirementId, title);
  const nis2Note = nis2Ref
    ? ` Additionally, this overlaps with NIS2 ${nis2Ref}, creating dual regulatory exposure.`
    : "";

  return `Non-compliance with ${articleRef} may result in fines up to EUR ${maxFine} or 2.5% of global annual turnover (Art. 64(1) CRA). ${specificContext}${nis2Note}`;
}

/**
 * Contextual detail for specific CRA requirement gaps.
 * These are concrete, not generic — each explains the operational impact.
 */
function getCRASpecificContext(requirementId: string, title: string): string {
  const contextMap: Record<string, string> = {
    "cra-001":
      "Without adequate access control mechanisms, the product cannot meet essential cybersecurity requirements and CE marking will be refused.",
    "cra-002":
      "Absence of data protection at rest and in transit violates core confidentiality requirements. Market surveillance authorities may order product withdrawal.",
    "cra-003":
      "Unminimized attack surface indicates failure to apply security-by-design principles. Notified Bodies will not certify products with unnecessary exposed interfaces.",
    "cra-004":
      "Products shipped without secure default configuration violate Art. 10(1) manufacturer obligations. This is a common enforcement priority.",
    "cra-005":
      "Lack of data minimization mechanisms violates privacy-by-design requirements integral to CRA Annex I.",
    "cra-006":
      "Failure to ensure availability and resilience means the product does not meet the essential requirements for continuity of service.",
    "cra-007":
      "Without monitoring and logging capabilities, incident detection and forensic analysis obligations under Art. 14 CRA cannot be fulfilled.",
    "cra-008":
      "Cryptographic protection gaps prevent compliance with data integrity requirements. CCSDS SDLS protocol compliance is expected for space-link products.",
    "cra-011":
      "Without a vulnerability handling process, the manufacturer cannot fulfill the mandatory coordinated vulnerability disclosure obligations under Art. 15 CRA.",
    "cra-012":
      "Absence of vulnerability testing means known exploitable vulnerabilities may persist, violating Art. 13(6) CRA manufacturer obligations.",
    "cra-013":
      "Failure to document vulnerabilities and their resolution undermines the technical documentation required for conformity assessment.",
    "cra-014":
      "Without CSIRT notification capability, the manufacturer cannot meet the 24-hour early warning obligation for actively exploited vulnerabilities (Art. 14(2)(a) CRA).",
    "cra-015":
      "Without SBOM (Software Bill of Materials), CE marking cannot be applied. SBOM is a mandatory element of technical documentation under Annex VII CRA.",
    "cra-016":
      "Incomplete dependency tracking prevents effective vulnerability management across the software supply chain.",
    "cra-017":
      "Insufficient technical documentation blocks the conformity assessment process entirely — no documentation, no CE mark.",
    "cra-018":
      "Missing cybersecurity risk assessment means the product's risk level cannot be established, preventing classification and route-to-market determination.",
    "cra-019":
      "Without EU Declaration of Conformity (Art. 28 CRA), the product cannot legally be placed on the EU internal market.",
    "cra-020":
      "Missing user information and instructions violate Art. 13(15) CRA. End users must be informed of cybersecurity properties and secure configuration.",
    "cra-026":
      "Failure to notify ENISA of actively exploited vulnerabilities within 24 hours violates Art. 14(2)(a) CRA. Late notification is independently sanctionable.",
    "cra-027":
      "Missing incident reporting capability prevents compliance with the mandatory 72-hour notification to ENISA for severe incidents (Art. 14(2)(b) CRA).",
    "cra-035":
      "Without secure update mechanisms, the manufacturer cannot deliver security patches throughout the support period, violating Art. 13(8) CRA.",
    "cra-036":
      "Automatic security updates are required by default under Annex I, Part I, §2. Manual-only update mechanisms are non-compliant unless users can opt-in.",
    "cra-038":
      "Missing third-party component inventory means supply chain risk cannot be assessed, violating Annex I, Part II requirements.",
    "cra-039":
      "Without supply chain due diligence, the manufacturer cannot attest to the security of integrated components as required by Art. 13(5) CRA.",
    "cra-040":
      "Missing open-source component governance creates untracked license and vulnerability exposure in the software supply chain.",
  };

  return (
    contextMap[requirementId] ??
    `${title} is an essential requirement — failure to implement blocks CE marking and market access.`
  );
}

// ============================================================================
// Executive Summary Generator
// ============================================================================

function generateExecutiveSummary(
  orgName: string,
  overallScore: number,
  moduleScores: Record<string, ModuleScoreData>,
  gaps: RequirementGap[],
  strengths: Array<{ area: string; detail: string }>,
  modules: string[],
): string {
  const criticalGaps = gaps.filter((g) => g.severity === "critical");
  const majorGaps = gaps.filter((g) => g.severity === "major");
  const minorGaps = gaps.filter((g) => g.severity === "minor");

  const grade = getGrade(overallScore);
  const moduleList = modules.join(", ").toUpperCase();

  // Sentence 1: Overall posture
  const postureSentence = `${orgName} demonstrates ${describePosture(overallScore)} across the assessed regulatory modules (${moduleList}), with an overall compliance score of ${overallScore}% (Grade ${grade}).`;

  // Sentence 2: Critical gaps
  let criticalSentence: string;
  if (criticalGaps.length === 0) {
    criticalSentence =
      "No critical compliance gaps were identified in the assessed scope.";
  } else {
    const criticalModules = [
      ...new Set(criticalGaps.map((g) => g.module.toUpperCase())),
    ];
    criticalSentence = `${criticalGaps.length} critical gap${criticalGaps.length === 1 ? "" : "s"} requiring immediate attention ${criticalGaps.length === 1 ? "was" : "were"} identified across ${criticalModules.join(" and ")}, carrying potential exposure to significant administrative fines.`;
  }

  // Sentence 3: Major/minor gap summary
  const gapCountSentence =
    majorGaps.length > 0 || minorGaps.length > 0
      ? `Additionally, ${majorGaps.length} major and ${minorGaps.length} minor gaps were identified that may delay conformity processes or be flagged during regulatory audits.`
      : "No major or minor compliance deficiencies were identified.";

  // Sentence 4: Strengths
  let strengthSentence: string;
  if (strengths.length > 0) {
    const topStrengths = strengths.slice(0, 3).map((s) => s.area);
    strengthSentence = `Notable compliance strengths include ${topStrengths.join(", ")}, which provide a solid foundation for regulatory engagement.`;
  } else {
    strengthSentence =
      "The compliance posture does not yet demonstrate established strengths in any assessed category.";
  }

  // Sentence 5: Recommendation
  const recommendation =
    criticalGaps.length > 0
      ? "Immediate prioritization of critical gaps is recommended to mitigate regulatory risk and enable timely market access or registration."
      : overallScore >= 75
        ? "The overall posture supports proceeding with regulatory filings, with targeted remediation of remaining gaps recommended."
        : "A structured remediation program is recommended before initiating formal regulatory submissions.";

  return [
    postureSentence,
    criticalSentence,
    gapCountSentence,
    strengthSentence,
    recommendation,
  ].join(" ");
}

function describePosture(score: number): string {
  if (score >= 90) return "a strong compliance posture";
  if (score >= 75) return "a solid compliance posture with limited gaps";
  if (score >= 60) return "a developing compliance posture with notable gaps";
  if (score >= 40) return "a partial compliance posture with significant gaps";
  return "an early-stage compliance posture with extensive gaps";
}

function getGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ============================================================================
// Timeline Builder
// ============================================================================

function buildTimeline(
  scopedModules: string[],
  deadlines: Array<{
    title: string;
    dueDate: Date;
    priority: string;
    category: string;
    regulatoryRef: string | null;
    status: string;
  }>,
): Array<{ date: string; event: string; criticality: string }> {
  const entries: Array<{ date: string; event: string; criticality: string }> =
    [];

  // Add relevant statutory deadlines
  for (const sd of STATUTORY_DEADLINES) {
    if (sd.modules.some((m) => isModuleInScope(scopedModules, m))) {
      entries.push({
        date: sd.date,
        event: sd.event,
        criticality: sd.criticality,
      });
    }
  }

  // Add organization-specific deadlines
  for (const d of deadlines) {
    entries.push({
      date: d.dueDate.toISOString().split("T")[0],
      event: `${d.title}${d.regulatoryRef ? ` (${d.regulatoryRef})` : ""}`,
      criticality: mapPriorityToCriticality(d.priority),
    });
  }

  // Sort chronologically
  entries.sort((a, b) => a.date.localeCompare(b.date));

  return entries;
}

function mapPriorityToCriticality(priority: string): string {
  switch (priority) {
    case "CRITICAL":
      return "critical";
    case "HIGH":
      return "major";
    case "MEDIUM":
      return "minor";
    case "LOW":
      return "informational";
    default:
      return "minor";
  }
}

// ============================================================================
// Document Review Status
// ============================================================================

function deriveDocumentReviewStatus(doc: {
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  expiryDate: Date | null;
  isExpired: boolean;
}): string {
  if (doc.isExpired) return "expired";
  if (doc.approvedBy && doc.approvedAt) return "approved";
  if (doc.reviewedBy && doc.reviewedAt) return "reviewed";
  if (doc.status === "UNDER_REVIEW" || doc.status === "PENDING_REVIEW")
    return "pending_review";
  if (doc.status === "DRAFT") return "draft";
  if (doc.status === "ACTIVE") return "active";
  return "unknown";
}

// ============================================================================
// Helpers
// ============================================================================

function mergeRequirementStatuses(
  assessments: Array<{
    requirements: Array<{ requirementId: string; status: string }>;
  }>,
): Map<string, string> {
  const statusMap = new Map<string, string>();

  // Assessments are ordered by updatedAt desc — first (latest) wins
  for (const assessment of assessments) {
    for (const req of assessment.requirements) {
      if (!statusMap.has(req.requirementId)) {
        statusMap.set(req.requirementId, req.status);
      }
    }
  }

  return statusMap;
}

function deriveCountryFromTimezone(timezone: string): string | null {
  const tzCountryMap: Record<string, string> = {
    "Europe/Berlin": "DE",
    "Europe/Vienna": "AT",
    "Europe/Zurich": "CH",
    "Europe/Paris": "FR",
    "Europe/London": "GB",
    "Europe/Amsterdam": "NL",
    "Europe/Brussels": "BE",
    "Europe/Rome": "IT",
    "Europe/Madrid": "ES",
    "Europe/Lisbon": "PT",
    "Europe/Stockholm": "SE",
    "Europe/Helsinki": "FI",
    "Europe/Copenhagen": "DK",
    "Europe/Oslo": "NO",
    "Europe/Warsaw": "PL",
    "Europe/Prague": "CZ",
    "Europe/Bucharest": "RO",
    "Europe/Dublin": "IE",
    "Europe/Luxembourg": "LU",
    "Europe/Athens": "GR",
  };

  return tzCountryMap[timezone] ?? null;
}

function formatCRACategory(category: string): string {
  const labels: Record<string, string> = {
    security_by_design: "Security by Design",
    vulnerability_handling: "Vulnerability Handling",
    documentation: "Documentation",
    conformity_assessment: "Conformity Assessment",
    incident_reporting: "Incident Reporting",
    post_market_obligations: "Post-Market Obligations",
    software_update: "Software Updates",
    sbom: "SBOM (Software Bill of Materials)",
    support_period: "Support Period",
  };
  return labels[category] ?? category;
}

function formatNIS2Category(category: string): string {
  const labels: Record<string, string> = {
    policies_risk_analysis: "Risk Analysis & Policies",
    incident_handling: "Incident Handling",
    business_continuity: "Business Continuity",
    supply_chain: "Supply Chain Security",
    network_acquisition: "Network & IS Acquisition",
    effectiveness_assessment: "Effectiveness Assessment",
    cyber_hygiene: "Cyber Hygiene & Training",
    cryptography: "Cryptography",
    hr_access_asset: "HR Security & Access Control",
    mfa_authentication: "MFA & Authentication",
    governance: "Governance & Accountability",
    registration: "NCA Registration",
    reporting: "Incident Reporting",
    information_sharing: "Information Sharing",
  };
  return labels[category] ?? category;
}

function formatCyberCategory(category: string): string {
  const labels: Record<string, string> = {
    governance: "Governance",
    risk_assessment: "Risk Assessment",
    infosec: "Information Security",
    cryptography: "Cryptography",
    detection_monitoring: "Detection & Monitoring",
    business_continuity: "Business Continuity",
    incident_reporting: "Incident Reporting",
    eusrn: "EU Space Registry Notification",
  };
  return labels[category] ?? category;
}
