/**
 * ACE — Autonomous Compliance Evidence Engine
 *
 * Core service for evidence-based compliance scoring, gap analysis,
 * hash-chain integrity, and cross-regulation coverage tracking.
 *
 * Regulation-agnostic by design: works identically for NIS2, EU Space Act,
 * UK Space Act, COPUOS/IADC, ITU, and any future regulation.
 */

import "server-only";

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type {
  ComplianceEvidence,
  RegulatoryRequirement,
  EvidenceRequirementMapping,
  RegulationType,
  EvidenceStatus,
  EvidenceMappingType,
  Prisma,
} from "@prisma/client";

// ============================================================================
// Types
// ============================================================================

export interface DualComplianceScore {
  selfAssessmentScore: number; // Existing score (0-100)
  verifiedEvidenceScore: number; // Evidence-based score (0-100)
  verificationGap: number; // Difference between the two
  moduleBreakdown: ModuleEvidenceBreakdown[];
  byRegulation: RegulationCoverage[];
  lastCalculated: Date;
}

export interface ModuleEvidenceBreakdown {
  module: string;
  regulationType: string;
  selfAssessment: number;
  evidenceScore: number;
  gap: number;
  totalRequirements: number;
  coveredRequirements: number;
  missingEvidence: string[];
}

export interface RegulationCoverage {
  regulationType: string;
  regulationName: string;
  overallCoverage: number;
  requirementsMet: number;
  requirementsTotal: number;
  criticalGaps: string[];
}

export interface EvidenceAction {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  regulationType: string;
  jurisdiction: string;
  requirement: string;
  requirementTitle: string;
  action:
    | "UPLOAD_MISSING"
    | "RENEW_EXPIRED"
    | "REVIEW_SUBMITTED"
    | "UPDATE_OUTDATED";
  description: string;
  estimatedEffort: string;
  deadline?: Date;
  crossRegulationBenefit?: string;
}

export interface EvidenceGapAnalysis {
  totalRequirements: number;
  coveredRequirements: number;
  overallCoverage: number;
  missingCount: number;
  expiredCount: number;
  pendingReviewCount: number;
  actions: EvidenceAction[];
  byRegulation: RegulationCoverage[];
}

export interface EvidenceCoverageItem {
  requirement: RegulatoryRequirement;
  evidenceItems: Array<{
    evidence: ComplianceEvidence;
    mapping: EvidenceRequirementMapping;
  }>;
  coveragePercent: number;
  status: "covered" | "partial" | "missing" | "expired";
  expiringWithin30Days: boolean;
}

// ============================================================================
// Evidence Hash-Chain (mirrors AuditLog pattern from audit-hash.server.ts)
// ============================================================================

/**
 * Compute SHA-256 hash for a ComplianceEvidence record.
 * Covers all meaningful fields + previous hash for chain integrity.
 */
export function computeEvidenceHash(entry: {
  id: string;
  organizationId: string;
  createdBy: string;
  regulationType: string;
  requirementId: string;
  title: string;
  description?: string | null;
  evidenceType: string;
  status: string;
  validFrom?: Date | null;
  validUntil?: Date | null;
  createdAt: Date;
  previousHash: string;
}): string {
  const payload = JSON.stringify({
    id: entry.id,
    organizationId: entry.organizationId,
    createdBy: entry.createdBy,
    regulationType: entry.regulationType,
    requirementId: entry.requirementId,
    title: entry.title,
    description: entry.description || null,
    evidenceType: entry.evidenceType,
    status: entry.status,
    validFrom: entry.validFrom?.toISOString() || null,
    validUntil: entry.validUntil?.toISOString() || null,
    createdAt: entry.createdAt.toISOString(),
    previousHash: entry.previousHash,
  });

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Get the latest evidence hash in the chain for an organization.
 * Falls back to a genesis hash if no entries exist.
 */
export async function getLatestEvidenceHash(
  organizationId: string,
): Promise<string> {
  try {
    const latestEntry = await prisma.complianceEvidence.findFirst({
      where: {
        organizationId,
        entryHash: { not: null },
      },
      orderBy: { createdAt: "desc" },
      select: { entryHash: true },
    });

    return latestEntry?.entryHash || `EVIDENCE_GENESIS_${organizationId}`;
  } catch (error) {
    logger.error("Failed to get latest evidence hash", error);
    return `EVIDENCE_GENESIS_${organizationId}`;
  }
}

/**
 * Compute hash fields for a new evidence record.
 * Returns null on failure — hash chain is best-effort, never breaks creation.
 */
export async function computeEvidenceHashFields(
  organizationId: string,
  entry: {
    id: string;
    createdBy: string;
    regulationType: string;
    requirementId: string;
    title: string;
    description?: string | null;
    evidenceType: string;
    status: string;
    validFrom?: Date | null;
    validUntil?: Date | null;
    createdAt: Date;
  },
): Promise<{ entryHash: string; previousHash: string } | null> {
  try {
    const previousHash = await getLatestEvidenceHash(organizationId);
    const entryHash = computeEvidenceHash({
      ...entry,
      organizationId,
      previousHash,
    });
    return { entryHash, previousHash };
  } catch (error) {
    logger.error("Failed to compute evidence hash", error);
    return null;
  }
}

/**
 * Verify the integrity of the evidence hash chain for an organization.
 */
export async function verifyEvidenceChain(organizationId: string): Promise<{
  valid: boolean;
  checkedEntries: number;
  brokenAt?: { entryId: string; timestamp: Date };
}> {
  try {
    const entries = await prisma.complianceEvidence.findMany({
      where: {
        organizationId,
        entryHash: { not: null },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        organizationId: true,
        createdBy: true,
        regulationType: true,
        requirementId: true,
        title: true,
        description: true,
        evidenceType: true,
        status: true,
        validFrom: true,
        validUntil: true,
        createdAt: true,
        entryHash: true,
        previousHash: true,
      },
    });

    if (entries.length === 0) {
      return { valid: true, checkedEntries: 0 };
    }

    for (const entry of entries) {
      const recomputedHash = computeEvidenceHash({
        id: entry.id,
        organizationId: entry.organizationId,
        createdBy: entry.createdBy,
        regulationType: entry.regulationType,
        requirementId: entry.requirementId,
        title: entry.title,
        description: entry.description,
        evidenceType: entry.evidenceType,
        status: entry.status,
        validFrom: entry.validFrom,
        validUntil: entry.validUntil,
        createdAt: entry.createdAt,
        previousHash:
          entry.previousHash || `EVIDENCE_GENESIS_${entry.organizationId}`,
      });

      if (recomputedHash !== entry.entryHash) {
        return {
          valid: false,
          checkedEntries: entries.indexOf(entry) + 1,
          brokenAt: { entryId: entry.id, timestamp: entry.createdAt },
        };
      }
    }

    return { valid: true, checkedEntries: entries.length };
  } catch (error) {
    logger.error("Failed to verify evidence hash chain", error);
    return { valid: false, checkedEntries: 0 };
  }
}

// ============================================================================
// Evidence Coverage & Scoring
// ============================================================================

// Regulation display names
const REGULATION_NAMES: Record<string, string> = {
  EU_SPACE_ACT: "EU Space Act",
  NIS2: "NIS2 Directive",
  CYBERSECURITY: "Cybersecurity",
  DEBRIS: "Debris Mitigation",
  ENVIRONMENTAL: "Environmental",
  INSURANCE: "Insurance",
  AUTHORIZATION: "Authorization",
  REGISTRATION: "Registration",
  SUPERVISION: "Supervision",
  NATIONAL_SPACE_LAW: "National Space Law",
  UK_SPACE_ACT: "UK Space Act",
  US_REGULATORY: "US Regulatory",
  COPUOS_IADC: "COPUOS/IADC",
  ITU_SPECTRUM: "ITU/Spectrum",
  EXPORT_CONTROL: "Export Control",
};

/**
 * Calculate the Verified Evidence Score for an organization.
 * This runs PARALLEL to the existing Self-Assessment Score.
 *
 * Evidence Score = Σ (covered_requirements / total_requirements) × regulation_weight
 */
export async function calculateEvidenceScore(
  organizationId: string,
): Promise<DualComplianceScore> {
  // Get all requirements for this organization
  const requirements = await prisma.regulatoryRequirement.findMany({
    where: { organizationId },
    include: {
      evidenceMappings: {
        include: {
          evidence: {
            select: {
              id: true,
              status: true,
              validUntil: true,
            },
          },
        },
      },
    },
  });

  if (requirements.length === 0) {
    return {
      selfAssessmentScore: 0,
      verifiedEvidenceScore: 0,
      verificationGap: 0,
      moduleBreakdown: [],
      byRegulation: [],
      lastCalculated: new Date(),
    };
  }

  const now = new Date();

  // Group requirements by regulationType
  const byRegulation = new Map<
    string,
    Array<
      RegulatoryRequirement & {
        evidenceMappings: Array<
          EvidenceRequirementMapping & {
            evidence: {
              id: string;
              status: EvidenceStatus;
              validUntil: Date | null;
            };
          }
        >;
      }
    >
  >();

  for (const req of requirements) {
    const key = req.regulationType;
    if (!byRegulation.has(key)) {
      byRegulation.set(key, []);
    }
    byRegulation.get(key)!.push(req);
  }

  // Calculate coverage per regulation
  const regulationCoverages: RegulationCoverage[] = [];
  const moduleBreakdowns: ModuleEvidenceBreakdown[] = [];
  let totalWeightedCoverage = 0;
  let totalWeight = 0;

  for (const [regType, reqs] of byRegulation) {
    let covered = 0;
    const criticalGaps: string[] = [];
    const missingEvidence: string[] = [];

    for (const req of reqs) {
      // A requirement is "covered" if it has at least one ACCEPTED evidence
      // that hasn't expired
      const hasAcceptedEvidence = req.evidenceMappings.some((m) => {
        const ev = m.evidence;
        if (ev.status !== "ACCEPTED") return false;
        if (ev.validUntil && ev.validUntil < now) return false;
        return true;
      });

      if (hasAcceptedEvidence) {
        covered++;
      } else {
        if (req.mandatory && req.severity === "critical") {
          criticalGaps.push(req.title);
        }
        missingEvidence.push(req.title);
      }
    }

    const coverage =
      reqs.length > 0 ? Math.round((covered / reqs.length) * 100) : 0;

    // Equal weight per regulation (can be customized later)
    const weight = 1;
    totalWeightedCoverage += coverage * weight;
    totalWeight += weight;

    regulationCoverages.push({
      regulationType: regType,
      regulationName: REGULATION_NAMES[regType] || regType,
      overallCoverage: coverage,
      requirementsMet: covered,
      requirementsTotal: reqs.length,
      criticalGaps: criticalGaps.slice(0, 5),
    });

    // Group by category within this regulation for module breakdown
    const categories = new Map<string, typeof reqs>();
    for (const req of reqs) {
      if (!categories.has(req.category)) {
        categories.set(req.category, []);
      }
      categories.get(req.category)!.push(req);
    }

    for (const [category, catReqs] of categories) {
      const catCovered = catReqs.filter((r) =>
        r.evidenceMappings.some((m) => {
          const ev = m.evidence;
          return (
            ev.status === "ACCEPTED" && (!ev.validUntil || ev.validUntil >= now)
          );
        }),
      ).length;

      const catCoverage =
        catReqs.length > 0
          ? Math.round((catCovered / catReqs.length) * 100)
          : 0;

      moduleBreakdowns.push({
        module: category,
        regulationType: regType,
        selfAssessment: 0, // Will be filled by caller if needed
        evidenceScore: catCoverage,
        gap: 0, // Will be computed by caller
        totalRequirements: catReqs.length,
        coveredRequirements: catCovered,
        missingEvidence: catReqs
          .filter(
            (r) =>
              !r.evidenceMappings.some(
                (m) =>
                  m.evidence.status === "ACCEPTED" &&
                  (!m.evidence.validUntil || m.evidence.validUntil >= now),
              ),
          )
          .map((r) => r.title)
          .slice(0, 5),
      });
    }
  }

  const verifiedEvidenceScore =
    totalWeight > 0 ? Math.round(totalWeightedCoverage / totalWeight) : 0;

  return {
    selfAssessmentScore: 0, // Caller fills this from existing scoring service
    verifiedEvidenceScore,
    verificationGap: 0, // Caller computes: selfAssessment - verified
    moduleBreakdown: moduleBreakdowns,
    byRegulation: regulationCoverages,
    lastCalculated: new Date(),
  };
}

/**
 * Calculate evidence coverage percentage for a specific regulation type.
 * Used by the Digital Twin's per-module evidencePct.
 */
export async function calculateRegulationEvidencePct(
  organizationId: string,
  regulationType: RegulationType,
): Promise<number> {
  const requirements = await prisma.regulatoryRequirement.count({
    where: { organizationId, regulationType },
  });

  if (requirements === 0) return 0;

  const now = new Date();

  // Count requirements that have at least one accepted, non-expired evidence
  const coveredRequirements = await prisma.regulatoryRequirement.count({
    where: {
      organizationId,
      regulationType,
      evidenceMappings: {
        some: {
          evidence: {
            status: "ACCEPTED",
            OR: [{ validUntil: null }, { validUntil: { gte: now } }],
          },
        },
      },
    },
  });

  return Math.round((coveredRequirements / requirements) * 100);
}

/**
 * Get per-module evidence coverage map for the Digital Twin.
 * Returns { moduleName: evidencePct } for all modules with requirements.
 */
export async function getModuleEvidencePctMap(
  organizationId: string,
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};

  // Map regulation types to module IDs used by the scoring service
  const regToModule: Record<string, string> = {
    AUTHORIZATION: "authorization",
    DEBRIS: "debris",
    CYBERSECURITY: "cybersecurity",
    INSURANCE: "insurance",
    ENVIRONMENTAL: "environmental",
    NIS2: "nis2",
    SUPERVISION: "reporting",
  };

  const regulationTypes = Object.keys(regToModule) as RegulationType[];

  const pcts = await Promise.all(
    regulationTypes.map((rt) =>
      calculateRegulationEvidencePct(organizationId, rt),
    ),
  );

  for (let i = 0; i < regulationTypes.length; i++) {
    const moduleId = regToModule[regulationTypes[i]];
    result[moduleId] = pcts[i];
  }

  return result;
}

// ============================================================================
// Gap Analysis
// ============================================================================

// Severity priority for sorting
const SEVERITY_PRIORITY: Record<string, number> = {
  critical: 0,
  major: 1,
  moderate: 2,
  minor: 3,
};

// Regulation urgency (NIS2 = NOW, EU Space Act = 2030)
const REGULATION_URGENCY: Record<string, number> = {
  NIS2: 0,
  CYBERSECURITY: 1,
  UK_SPACE_ACT: 1,
  US_REGULATORY: 1,
  COPUOS_IADC: 2,
  DEBRIS: 2,
  INSURANCE: 2,
  ENVIRONMENTAL: 3,
  AUTHORIZATION: 3,
  EU_SPACE_ACT: 4,
  REGISTRATION: 4,
  SUPERVISION: 4,
  ITU_SPECTRUM: 3,
  EXPORT_CONTROL: 2,
  NATIONAL_SPACE_LAW: 3,
};

/**
 * Perform a comprehensive gap analysis across ALL regulations for an organization.
 * Identifies missing, expired, and pending evidence with prioritized next actions.
 */
export async function performGapAnalysis(
  organizationId: string,
  regulationFilter?: RegulationType,
): Promise<EvidenceGapAnalysis> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Get all requirements with their evidence mappings
  const requirements = await prisma.regulatoryRequirement.findMany({
    where: {
      organizationId,
      ...(regulationFilter ? { regulationType: regulationFilter } : {}),
    },
    include: {
      evidenceMappings: {
        include: {
          evidence: {
            select: {
              id: true,
              title: true,
              status: true,
              validUntil: true,
              regulationType: true,
            },
          },
        },
      },
    },
    orderBy: [{ regulationType: "asc" }, { category: "asc" }],
  });

  const actions: EvidenceAction[] = [];
  let coveredCount = 0;
  let missingCount = 0;
  let expiredCount = 0;
  let pendingReviewCount = 0;

  for (const req of requirements) {
    const acceptedEvidence = req.evidenceMappings.filter((m) => {
      const ev = m.evidence;
      return (
        ev.status === "ACCEPTED" && (!ev.validUntil || ev.validUntil >= now)
      );
    });

    const expiredEvidence = req.evidenceMappings.filter(
      (m) => m.evidence.validUntil && m.evidence.validUntil < now,
    );

    const submittedEvidence = req.evidenceMappings.filter(
      (m) => m.evidence.status === "SUBMITTED",
    );

    const expiringEvidence = req.evidenceMappings.filter(
      (m) =>
        m.evidence.status === "ACCEPTED" &&
        m.evidence.validUntil &&
        m.evidence.validUntil >= now &&
        m.evidence.validUntil <= thirtyDaysFromNow,
    );

    if (acceptedEvidence.length > 0 && expiredEvidence.length === 0) {
      coveredCount++;

      // Check for soon-to-expire evidence
      if (expiringEvidence.length > 0) {
        actions.push({
          priority: "MEDIUM",
          regulationType: req.regulationType,
          jurisdiction: req.jurisdiction || "global",
          requirement: req.requirementId,
          requirementTitle: req.title,
          action: "RENEW_EXPIRED",
          description: `Evidence for "${req.title}" expires within 30 days. Upload renewed documentation.`,
          estimatedEffort: "~30 minutes",
        });
      }
    } else if (expiredEvidence.length > 0 && acceptedEvidence.length === 0) {
      expiredCount++;
      actions.push({
        priority: req.severity === "critical" ? "CRITICAL" : "HIGH",
        regulationType: req.regulationType,
        jurisdiction: req.jurisdiction || "global",
        requirement: req.requirementId,
        requirementTitle: req.title,
        action: "RENEW_EXPIRED",
        description: `Evidence for "${req.title}" has expired. Upload current documentation to restore compliance.`,
        estimatedEffort: "~1 hour",
      });
    } else if (submittedEvidence.length > 0 && acceptedEvidence.length === 0) {
      pendingReviewCount++;
      actions.push({
        priority: "MEDIUM",
        regulationType: req.regulationType,
        jurisdiction: req.jurisdiction || "global",
        requirement: req.requirementId,
        requirementTitle: req.title,
        action: "REVIEW_SUBMITTED",
        description: `Evidence for "${req.title}" is submitted but awaiting review. Approve or request changes.`,
        estimatedEffort: "~15 minutes",
      });
    } else if (req.evidenceMappings.length === 0) {
      missingCount++;
      actions.push({
        priority:
          req.mandatory && req.severity === "critical" ? "CRITICAL" : "HIGH",
        regulationType: req.regulationType,
        jurisdiction: req.jurisdiction || "global",
        requirement: req.requirementId,
        requirementTitle: req.title,
        action: "UPLOAD_MISSING",
        description: `No evidence uploaded for "${req.title}". ${
          Array.isArray(req.evidenceRequired)
            ? `Required: ${(req.evidenceRequired as string[]).slice(0, 2).join(", ")}`
            : ""
        }`,
        estimatedEffort:
          req.implementationTimeWeeks && req.implementationTimeWeeks <= 1
            ? "~1 hour"
            : req.implementationTimeWeeks && req.implementationTimeWeeks <= 4
              ? "~1 day"
              : "~1 week",
      });
    }
  }

  // Sort actions by priority (regulation urgency + severity)
  actions.sort((a, b) => {
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;

    const urgA = REGULATION_URGENCY[a.regulationType] ?? 5;
    const urgB = REGULATION_URGENCY[b.regulationType] ?? 5;
    return urgA - urgB;
  });

  // Build per-regulation coverage
  const regMap = new Map<
    string,
    { met: number; total: number; gaps: string[] }
  >();
  for (const req of requirements) {
    const key = req.regulationType;
    if (!regMap.has(key)) {
      regMap.set(key, { met: 0, total: 0, gaps: [] });
    }
    const entry = regMap.get(key)!;
    entry.total++;
    const hasCoverage = req.evidenceMappings.some(
      (m) =>
        m.evidence.status === "ACCEPTED" &&
        (!m.evidence.validUntil || m.evidence.validUntil >= now),
    );
    if (hasCoverage) {
      entry.met++;
    } else if (req.mandatory) {
      entry.gaps.push(req.title);
    }
  }

  const byRegulation: RegulationCoverage[] = Array.from(regMap.entries()).map(
    ([regType, data]) => ({
      regulationType: regType,
      regulationName: REGULATION_NAMES[regType] || regType,
      overallCoverage:
        data.total > 0 ? Math.round((data.met / data.total) * 100) : 0,
      requirementsMet: data.met,
      requirementsTotal: data.total,
      criticalGaps: data.gaps.slice(0, 5),
    }),
  );

  return {
    totalRequirements: requirements.length,
    coveredRequirements: coveredCount,
    overallCoverage:
      requirements.length > 0
        ? Math.round((coveredCount / requirements.length) * 100)
        : 0,
    missingCount,
    expiredCount,
    pendingReviewCount,
    actions: actions.slice(0, 50), // Cap at 50 actions
    byRegulation,
  };
}

// ============================================================================
// Evidence Coverage Detail (for Dashboard)
// ============================================================================

/**
 * Get detailed evidence coverage for each requirement.
 * Used by the Evidence Coverage Dashboard.
 */
export async function getEvidenceCoverage(
  organizationId: string,
  options?: {
    regulationType?: RegulationType;
    status?: "covered" | "partial" | "missing" | "expired";
    category?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ items: EvidenceCoverageItem[]; total: number }> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const where: Prisma.RegulatoryRequirementWhereInput = {
    organizationId,
    ...(options?.regulationType
      ? { regulationType: options.regulationType }
      : {}),
    ...(options?.category ? { category: options.category } : {}),
  };

  const [requirements, total] = await Promise.all([
    prisma.regulatoryRequirement.findMany({
      where,
      include: {
        evidenceMappings: {
          include: {
            evidence: true,
          },
        },
      },
      orderBy: [{ regulationType: "asc" }, { category: "asc" }],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.regulatoryRequirement.count({ where }),
  ]);

  const items: EvidenceCoverageItem[] = requirements.map((req) => {
    const evidenceItems = req.evidenceMappings.map((m) => ({
      evidence: m.evidence,
      mapping: m,
    }));

    // Calculate coverage
    const acceptedMappings = req.evidenceMappings.filter((m) => {
      const ev = m.evidence;
      return (
        ev.status === "ACCEPTED" && (!ev.validUntil || ev.validUntil >= now)
      );
    });

    const totalCoverage =
      acceptedMappings.length > 0
        ? Math.min(
            100,
            acceptedMappings.reduce(
              (sum, m) => sum + (m.coveragePercent || 0),
              0,
            ),
          )
        : 0;

    // Determine status
    let status: EvidenceCoverageItem["status"];
    const hasExpiredOnly =
      req.evidenceMappings.length > 0 &&
      req.evidenceMappings.every(
        (m) => m.evidence.validUntil && m.evidence.validUntil < now,
      );

    if (hasExpiredOnly) {
      status = "expired";
    } else if (totalCoverage >= 80) {
      status = "covered";
    } else if (totalCoverage > 0) {
      status = "partial";
    } else {
      status = "missing";
    }

    // Check for expiring evidence
    const expiringWithin30Days = req.evidenceMappings.some(
      (m) =>
        m.evidence.status === "ACCEPTED" &&
        m.evidence.validUntil &&
        m.evidence.validUntil >= now &&
        m.evidence.validUntil <= thirtyDaysFromNow,
    );

    return {
      requirement: req,
      evidenceItems,
      coveragePercent: totalCoverage,
      status,
      expiringWithin30Days,
    };
  });

  // Filter by status if requested
  const filteredItems = options?.status
    ? items.filter((item) => item.status === options.status)
    : items;

  return { items: filteredItems, total };
}

// ============================================================================
// Cross-Regulation Evidence Reuse
// ============================================================================

/**
 * Find evidence that satisfies requirements in multiple regulations.
 * Returns evidence items with their cross-regulation mappings.
 */
export async function getCrossRegulationEvidence(
  organizationId: string,
): Promise<
  Array<{
    evidenceId: string;
    evidenceTitle: string;
    regulationsCovered: string[];
    requirementsCovered: number;
  }>
> {
  const mappings = await prisma.evidenceRequirementMapping.findMany({
    where: { organizationId },
    include: {
      evidence: {
        select: { id: true, title: true, status: true },
      },
      requirement: {
        select: { regulationType: true, title: true },
      },
    },
  });

  // Group by evidence ID
  const byEvidence = new Map<
    string,
    {
      title: string;
      regulations: Set<string>;
      requirementCount: number;
    }
  >();

  for (const m of mappings) {
    if (m.evidence.status !== "ACCEPTED") continue;

    if (!byEvidence.has(m.evidenceId)) {
      byEvidence.set(m.evidenceId, {
        title: m.evidence.title,
        regulations: new Set(),
        requirementCount: 0,
      });
    }
    const entry = byEvidence.get(m.evidenceId)!;
    entry.regulations.add(m.requirement.regulationType);
    entry.requirementCount++;
  }

  // Return only evidence that covers 2+ regulations
  return Array.from(byEvidence.entries())
    .filter(([, data]) => data.regulations.size >= 2)
    .map(([evidenceId, data]) => ({
      evidenceId,
      evidenceTitle: data.title,
      regulationsCovered: Array.from(data.regulations),
      requirementsCovered: data.requirementCount,
    }))
    .sort((a, b) => b.requirementsCovered - a.requirementsCovered);
}

// ============================================================================
// Summary Statistics (for widgets)
// ============================================================================

/**
 * Get summary statistics for the Verification Dashboard Widget.
 */
export async function getVerificationSummary(organizationId: string): Promise<{
  totalRequirements: number;
  coveredRequirements: number;
  missingEvidence: number;
  expiringWithin30Days: number;
  crossRegulationItems: number;
  byRegulation: Array<{
    regulationType: string;
    regulationName: string;
    evidencePct: number;
    requirementsTotal: number;
    requirementsCovered: number;
  }>;
}> {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const requirements = await prisma.regulatoryRequirement.findMany({
    where: { organizationId },
    select: {
      regulationType: true,
      evidenceMappings: {
        select: {
          evidence: {
            select: {
              status: true,
              validUntil: true,
            },
          },
        },
      },
    },
  });

  let covered = 0;
  let missing = 0;
  let expiring = 0;

  const regStats = new Map<string, { total: number; covered: number }>();

  for (const req of requirements) {
    const regKey = req.regulationType;
    if (!regStats.has(regKey)) {
      regStats.set(regKey, { total: 0, covered: 0 });
    }
    const stat = regStats.get(regKey)!;
    stat.total++;

    const hasAccepted = req.evidenceMappings.some(
      (m) =>
        m.evidence.status === "ACCEPTED" &&
        (!m.evidence.validUntil || m.evidence.validUntil >= now),
    );

    if (hasAccepted) {
      covered++;
      stat.covered++;
    } else {
      missing++;
    }

    // Check expiring
    const hasExpiring = req.evidenceMappings.some(
      (m) =>
        m.evidence.status === "ACCEPTED" &&
        m.evidence.validUntil &&
        m.evidence.validUntil >= now &&
        m.evidence.validUntil <= thirtyDaysFromNow,
    );
    if (hasExpiring) expiring++;
  }

  // Count cross-regulation evidence
  const crossRegEvidence = await getCrossRegulationEvidence(organizationId);

  const byRegulation = Array.from(regStats.entries()).map(
    ([regType, stats]) => ({
      regulationType: regType,
      regulationName: REGULATION_NAMES[regType] || regType,
      evidencePct:
        stats.total > 0 ? Math.round((stats.covered / stats.total) * 100) : 0,
      requirementsTotal: stats.total,
      requirementsCovered: stats.covered,
    }),
  );

  return {
    totalRequirements: requirements.length,
    coveredRequirements: covered,
    missingEvidence: missing,
    expiringWithin30Days: expiring,
    crossRegulationItems: crossRegEvidence.length,
    byRegulation,
  };
}
