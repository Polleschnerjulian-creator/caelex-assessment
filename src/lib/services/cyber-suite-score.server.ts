import "server-only";
import { prisma } from "@/lib/prisma";
import { CROSS_REFERENCES } from "@/data/cross-references";

// ============================================================================
// Types
// ============================================================================

export interface ThemeScore {
  theme: string;
  label: string;
  status: "compliant" | "partial" | "gap";
  enisaStatus: RequirementAggStatus;
  nis2Status: RequirementAggStatus;
  craStatus: RequirementAggStatus;
}

interface RequirementAggStatus {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
}

export interface ModuleBreakdown {
  module: "enisa" | "nis2" | "cra";
  totalRequirements: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  score: number; // 0-100
}

export interface NexusModuleScore {
  score: number;
  total: number;
  compliant: number;
  partial: number;
}

export interface CyberSuiteScore {
  unifiedScore: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  themes: ThemeScore[];
  moduleBreakdowns: ModuleBreakdown[];
  moduleScores: {
    enisa: ModuleBreakdown | null;
    nis2: ModuleBreakdown | null;
    cra: ModuleBreakdown | null;
    nexus: NexusModuleScore | null;
  };
  evidenceCoverage: {
    totalRequirements: number;
    withEvidence: number;
    coveragePercent: number;
  };
  crossRegulationSynergies: number; // count of CROSS_REFERENCES that are satisfied
  lastCalculated: Date;
}

// ============================================================================
// Theme mapping: group requirements by compliance theme
// ============================================================================

const COMPLIANCE_THEMES: Record<
  string,
  {
    label: string;
    enisa: string[]; // Cybersecurity (ENISA/EU Space Act) requirement IDs
    nis2: string[]; // NIS2 Directive requirement IDs
    cra: string[]; // CRA requirement IDs
  }
> = {
  access_control: {
    label: "Access Control",
    enisa: ["access_control"],
    nis2: ["nis2-035", "nis2-037"],
    cra: ["cra-001"],
  },
  cryptography: {
    label: "Cryptography",
    enisa: ["crypto_policy", "space_link_encryption", "key_management"],
    nis2: ["nis2-030", "nis2-031", "nis2-032", "nis2-033"],
    cra: ["cra-002", "cra-008"],
  },
  incident_response: {
    label: "Incident Response",
    enisa: [
      "incident_response_plan",
      "early_warning",
      "detailed_notification",
      "final_report",
    ],
    nis2: ["nis2-006", "nis2-007", "nis2-044"],
    cra: ["cra-026", "cra-027"],
  },
  supply_chain: {
    label: "Supply Chain / SBOM",
    enisa: ["supply_chain_risk"],
    nis2: ["nis2-015", "nis2-016", "nis2-018"],
    cra: ["cra-015", "cra-016", "cra-038", "cra-039", "cra-040"],
  },
  risk_assessment: {
    label: "Risk Assessment",
    enisa: ["risk_assessment_regular", "threat_intelligence"],
    nis2: ["nis2-001", "nis2-002", "nis2-005"],
    cra: ["cra-018"],
  },
  business_continuity: {
    label: "Business Continuity",
    enisa: ["bcp", "backup_recovery"],
    nis2: ["nis2-011", "nis2-012", "nis2-013", "nis2-014"],
    cra: ["cra-006", "cra-030"],
  },
  vulnerability_handling: {
    label: "Vulnerability Handling",
    enisa: ["network_security"],
    nis2: ["nis2-021", "nis2-022"],
    cra: ["cra-011", "cra-012", "cra-013", "cra-014"],
  },
  secure_updates: {
    label: "Secure Updates",
    enisa: [],
    nis2: ["nis2-017"],
    cra: ["cra-035", "cra-036", "cra-037"],
  },
  monitoring: {
    label: "Monitoring & Logging",
    enisa: ["security_monitoring", "anomaly_detection", "log_management"],
    nis2: ["nis2-024", "nis2-025"],
    cra: ["cra-007"],
  },
  documentation: {
    label: "Documentation",
    enisa: [],
    nis2: [],
    cra: ["cra-017", "cra-019", "cra-020"],
  },
  authentication: {
    label: "Authentication & MFA",
    enisa: ["mfa"],
    nis2: ["nis2-038", "nis2-039", "nis2-040"],
    cra: ["cra-001"],
  },
  governance: {
    label: "Governance",
    enisa: ["sec_policy", "risk_mgmt_framework", "security_roles"],
    nis2: ["nis2-041", "nis2-042", "nis2-043"],
    cra: ["cra-021", "cra-022", "cra-023"],
  },
};

// ============================================================================
// Main Score Calculation
// ============================================================================

export async function calculateCyberSuiteScore(
  userId: string,
  organizationId?: string,
): Promise<CyberSuiteScore> {
  // 1. Fetch all requirement statuses from all 3 modules + NEXUS assets in parallel
  const [
    enisaStatuses,
    nis2Statuses,
    craStatuses,
    evidenceRecords,
    nexusAssets,
  ] = await Promise.all([
    fetchEnisaStatuses(userId, organizationId),
    fetchNis2Statuses(userId, organizationId),
    fetchCraStatuses(userId, organizationId),
    fetchEvidenceCoverage(organizationId),
    fetchNexusAssets(organizationId),
  ]);

  // Build status maps: requirementId → status string
  const enisaMap = new Map(
    enisaStatuses.map((r) => [r.requirementId, r.status]),
  );
  const nis2Map = new Map(nis2Statuses.map((r) => [r.requirementId, r.status]));
  const craMap = new Map(craStatuses.map((r) => [r.requirementId, r.status]));

  // 2. Calculate per-theme scores
  const themes: ThemeScore[] = Object.entries(COMPLIANCE_THEMES).map(
    ([key, theme]) => {
      const enisaAgg = aggregateStatuses(theme.enisa, enisaMap);
      const nis2Agg = aggregateStatuses(theme.nis2, nis2Map);
      const craAgg = aggregateStatuses(theme.cra, craMap);

      // 3-5. Determine theme status
      const totalReqs = enisaAgg.total + nis2Agg.total + craAgg.total;
      const totalCompliant =
        enisaAgg.compliant + nis2Agg.compliant + craAgg.compliant;
      const totalPartial = enisaAgg.partial + nis2Agg.partial + craAgg.partial;

      let status: ThemeScore["status"];
      if (totalReqs === 0) {
        status = "gap";
      } else if (totalCompliant === totalReqs) {
        // All requirements compliant
        status = "compliant";
      } else if (totalCompliant > 0 || totalPartial > 0) {
        // At least one requirement is compliant or partial
        status = "partial";
      } else {
        // All non_compliant or not_assessed
        status = "gap";
      }

      return {
        theme: key,
        label: theme.label,
        status,
        enisaStatus: enisaAgg,
        nis2Status: nis2Agg,
        craStatus: craAgg,
      };
    },
  );

  // 6. Calculate unified score: ((compliant + 0.5 * partial) / total) * 100
  const allThemeReqs = themes.reduce(
    (acc, t) => {
      acc.compliant +=
        t.enisaStatus.compliant +
        t.nis2Status.compliant +
        t.craStatus.compliant;
      acc.partial +=
        t.enisaStatus.partial + t.nis2Status.partial + t.craStatus.partial;
      acc.total += t.enisaStatus.total + t.nis2Status.total + t.craStatus.total;
      return acc;
    },
    { compliant: 0, partial: 0, total: 0 },
  );

  const themeScore =
    allThemeReqs.total > 0
      ? Math.round(
          ((allThemeReqs.compliant + 0.5 * allThemeReqs.partial) /
            allThemeReqs.total) *
            100,
        )
      : 0;

  // 6b. Calculate NEXUS contribution
  const nexusScores = nexusAssets.filter((a) => a.complianceScore !== null);
  const avgNexusCompliance =
    nexusScores.length > 0
      ? nexusScores.reduce((sum, a) => sum + (a.complianceScore || 0), 0) /
        nexusScores.length
      : null;

  // Blend NEXUS into unified score (15% weight if data exists, otherwise pure theme score)
  const unifiedScore =
    avgNexusCompliance !== null
      ? Math.round(themeScore * 0.85 + avgNexusCompliance * 0.15)
      : themeScore;

  // 7. Calculate per-module scores
  const moduleBreakdowns: ModuleBreakdown[] = [
    buildModuleBreakdown("enisa", enisaStatuses),
    buildModuleBreakdown("nis2", nis2Statuses),
    buildModuleBreakdown("cra", craStatuses),
  ];

  // 8. Evidence coverage
  const allRequirementIds = new Set<string>();
  for (const theme of Object.values(COMPLIANCE_THEMES)) {
    theme.enisa.forEach((id) => allRequirementIds.add(id));
    theme.nis2.forEach((id) => allRequirementIds.add(id));
    theme.cra.forEach((id) => allRequirementIds.add(id));
  }

  const requirementIdsWithEvidence = new Set(
    evidenceRecords.map((e) => e.requirementId),
  );
  const withEvidence = [...allRequirementIds].filter((id) =>
    requirementIdsWithEvidence.has(id),
  ).length;

  const evidenceCoverage = {
    totalRequirements: allRequirementIds.size,
    withEvidence,
    coveragePercent:
      allRequirementIds.size > 0
        ? Math.round((withEvidence / allRequirementIds.size) * 100)
        : 0,
  };

  // Cross-regulation synergies: count how many cross-references have both source + target satisfied
  const allStatusMap = new Map<string, string>();
  enisaMap.forEach((v, k) => allStatusMap.set(k, v));
  nis2Map.forEach((v, k) => allStatusMap.set(k, v));
  craMap.forEach((v, k) => allStatusMap.set(k, v));

  const crossRegulationSynergies = countSatisfiedCrossReferences(allStatusMap);

  return {
    unifiedScore,
    grade: getGrade(unifiedScore),
    themes,
    moduleBreakdowns,
    moduleScores: {
      enisa: moduleBreakdowns.find((m) => m.module === "enisa") ?? null,
      nis2: moduleBreakdowns.find((m) => m.module === "nis2") ?? null,
      cra: moduleBreakdowns.find((m) => m.module === "cra") ?? null,
      nexus:
        avgNexusCompliance !== null
          ? {
              score: Math.round(avgNexusCompliance),
              total: nexusAssets.length,
              compliant: nexusAssets.filter(
                (a) => (a.complianceScore || 0) >= 80,
              ).length,
              partial: nexusAssets.filter(
                (a) =>
                  (a.complianceScore || 0) >= 40 &&
                  (a.complianceScore || 0) < 80,
              ).length,
            }
          : null,
    },
    evidenceCoverage,
    crossRegulationSynergies,
    lastCalculated: new Date(),
  };
}

// ============================================================================
// Data Fetching
// ============================================================================

async function fetchEnisaStatuses(
  userId: string,
  organizationId?: string,
): Promise<Array<{ requirementId: string; status: string }>> {
  const whereClause = organizationId ? { userId, organizationId } : { userId };

  const assessment = await prisma.cybersecurityAssessment.findFirst({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: { requirementId: true, status: true },
      },
    },
  });

  return assessment?.requirements ?? [];
}

async function fetchNis2Statuses(
  userId: string,
  organizationId?: string,
): Promise<Array<{ requirementId: string; status: string }>> {
  const whereClause = organizationId ? { userId, organizationId } : { userId };

  const assessment = await prisma.nIS2Assessment.findFirst({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: { requirementId: true, status: true },
      },
    },
  });

  return assessment?.requirements ?? [];
}

async function fetchCraStatuses(
  userId: string,
  organizationId?: string,
): Promise<Array<{ requirementId: string; status: string }>> {
  const whereClause = organizationId ? { userId, organizationId } : { userId };

  const assessment = await prisma.cRAAssessment.findFirst({
    where: whereClause,
    orderBy: { updatedAt: "desc" },
    include: {
      requirements: {
        select: { requirementId: true, status: true },
      },
    },
  });

  return assessment?.requirements ?? [];
}

async function fetchNexusAssets(organizationId?: string): Promise<
  Array<{
    id: string;
    complianceScore: number | null;
    riskScore: number | null;
    criticality: string;
  }>
> {
  if (!organizationId) return [];

  try {
    return await prisma.asset.findMany({
      where: { organizationId, isDeleted: false },
      select: {
        id: true,
        complianceScore: true,
        riskScore: true,
        criticality: true,
      },
    });
  } catch {
    // Best-effort: if NEXUS tables are unavailable, return empty
    return [];
  }
}

async function fetchEvidenceCoverage(
  organizationId?: string,
): Promise<Array<{ requirementId: string }>> {
  if (!organizationId) return [];

  return prisma.complianceEvidence.findMany({
    where: {
      organizationId,
      status: { in: ["SUBMITTED", "ACCEPTED"] },
    },
    select: { requirementId: true },
    distinct: ["requirementId"],
  });
}

// ============================================================================
// Helpers
// ============================================================================

function aggregateStatuses(
  requirementIds: string[],
  statusMap: Map<string, string>,
): RequirementAggStatus {
  const result: RequirementAggStatus = {
    total: requirementIds.length,
    compliant: 0,
    partial: 0,
    nonCompliant: 0,
    notAssessed: 0,
  };

  for (const id of requirementIds) {
    const status = statusMap.get(id) ?? "not_assessed";
    switch (status) {
      case "compliant":
        result.compliant++;
        break;
      case "partial":
        result.partial++;
        break;
      case "non_compliant":
        result.nonCompliant++;
        break;
      default:
        result.notAssessed++;
        break;
    }
  }

  return result;
}

function buildModuleBreakdown(
  module: "enisa" | "nis2" | "cra",
  statuses: Array<{ requirementId: string; status: string }>,
): ModuleBreakdown {
  const compliant = statuses.filter((s) => s.status === "compliant").length;
  const partial = statuses.filter((s) => s.status === "partial").length;
  const nonCompliant = statuses.filter(
    (s) => s.status === "non_compliant",
  ).length;
  const notAssessed = statuses.filter(
    (s) => s.status === "not_assessed" || s.status === "not_applicable",
  ).length;
  const total = statuses.length;

  const score =
    total > 0 ? Math.round(((compliant + 0.5 * partial) / total) * 100) : 0;

  return {
    module,
    totalRequirements: total,
    compliant,
    partial,
    nonCompliant,
    notAssessed,
    score,
  };
}

function getGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function countSatisfiedCrossReferences(
  allStatusMap: Map<string, string>,
): number {
  // A cross-reference synergy is "satisfied" when both source and target
  // regulation requirements are at least partially addressed.
  // We use the CROSS_REFERENCES data to count how many overlapping/extending
  // relationships have evidence of work on both sides.
  let satisfied = 0;

  for (const xref of CROSS_REFERENCES) {
    // Check if any requirement from the source regulation is compliant/partial
    const sourceCompliant = hasAnyCompliantRequirement(
      xref.sourceRegulation,
      allStatusMap,
    );
    const targetCompliant = hasAnyCompliantRequirement(
      xref.targetRegulation,
      allStatusMap,
    );

    if (sourceCompliant && targetCompliant) {
      satisfied++;
    }
  }

  return satisfied;
}

function hasAnyCompliantRequirement(
  regulation: string,
  statusMap: Map<string, string>,
): boolean {
  // Map regulation type to requirement ID prefixes
  const prefixMap: Record<string, string[]> = {
    nis2: ["nis2-"],
    enisa_space: [
      "sec_policy",
      "risk_mgmt",
      "security_roles",
      "risk_assessment",
      "threat_intelligence",
      "supply_chain",
      "access_control",
      "mfa",
      "data_protection",
      "network_security",
      "crypto_policy",
      "space_link",
      "key_management",
      "security_monitoring",
      "anomaly_detection",
      "log_management",
      "bcp",
      "backup_recovery",
      "incident_response",
      "early_warning",
      "detailed_notification",
      "final_report",
      "eusrn",
    ],
    eu_space_act: [], // EU Space Act requirements not tracked via this system
    iso27001: [], // ISO 27001 tracked indirectly through ENISA controls
  };

  const prefixes = prefixMap[regulation] ?? [];
  if (prefixes.length === 0) return false;

  for (const [reqId, status] of statusMap) {
    if (
      prefixes.some((p) => reqId.startsWith(p)) &&
      (status === "compliant" || status === "partial")
    ) {
      return true;
    }
  }

  return false;
}

// Export theme definitions for use by the actions service
export { COMPLIANCE_THEMES };
