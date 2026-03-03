import "server-only";
import type { PrismaClient } from "@prisma/client";
import { safeLog } from "@/lib/verity/utils/redaction";
import type { AssessmentDataBundle } from "../core/types";

/**
 * Assessment Data Adapter
 *
 * Loads org-level assessment data (Debris, Cyber, Insurance, Environmental, NIS2)
 * and transforms it into a normalized bundle for Ephemeris consumption.
 */

/**
 * Load all assessment data for an organization.
 * Each module returns null if no assessment exists.
 */
export async function getAssessmentData(
  prisma: PrismaClient,
  orgId: string,
): Promise<AssessmentDataBundle> {
  safeLog("Fetching assessment data", { orgId });

  const [debris, cyber, insurance, environmental, nis2] = await Promise.all([
    loadDebrisData(prisma, orgId),
    loadCyberData(prisma, orgId),
    loadInsuranceData(prisma, orgId),
    loadEnvironmentalData(prisma, orgId),
    loadNIS2Data(prisma, orgId),
  ]);

  return { debris, cyber, insurance, environmental, nis2 };
}

/**
 * Get assessment completion status for data sources panel.
 */
export async function getAssessmentStatus(
  prisma: PrismaClient,
  orgId: string,
): Promise<{
  completedModules: number;
  totalModules: number;
  lastUpdated: string | null;
}> {
  const bundle = await getAssessmentData(prisma, orgId);
  const modules = [
    bundle.debris,
    bundle.cyber,
    bundle.insurance,
    bundle.environmental,
    bundle.nis2,
  ];
  const completed = modules.filter((m) => m !== null).length;

  const dates = modules
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .map((m) => m.lastUpdated)
    .filter((d): d is string => d !== null)
    .sort()
    .reverse();

  return {
    completedModules: completed,
    totalModules: 5,
    lastUpdated: dates[0] ?? null,
  };
}

async function loadDebrisData(
  prisma: PrismaClient,
  orgId: string,
): Promise<AssessmentDataBundle["debris"]> {
  try {
    const assessment = await prisma.debrisAssessment.findFirst({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        deorbitStrategy: true,
        hasPassivationCap: true,
        updatedAt: true,
      },
    });

    if (!assessment) return null;

    return {
      deorbitPlanExists: assessment.deorbitStrategy !== null,
      passivationPlanExists: assessment.hasPassivationCap === true,
      lastUpdated: assessment.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

async function loadCyberData(
  prisma: PrismaClient,
  orgId: string,
): Promise<AssessmentDataBundle["cyber"]> {
  try {
    // CybersecurityAssessment has maturityScore but not individual metrics.
    // Patch compliance, MFA adoption, and critical vulns come from Sentinel.
    // We return what the assessment has: maturity score as a proxy.
    const assessment = await prisma.cybersecurityAssessment.findFirst({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        maturityScore: true,
        hasIncidentResponsePlan: true,
        updatedAt: true,
      },
    });

    if (!assessment) return null;

    return {
      patchCompliancePct: null, // Comes from Sentinel, not assessment
      mfaAdoptionPct: null, // Comes from Sentinel, not assessment
      criticalVulns: null, // Comes from Sentinel, not assessment
      lastUpdated: assessment.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

async function loadInsuranceData(
  prisma: PrismaClient,
  orgId: string,
): Promise<AssessmentDataBundle["insurance"]> {
  try {
    const assessment = await prisma.insuranceAssessment.findFirst({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        calculatedTPL: true,
        updatedAt: true,
      },
    });

    if (!assessment) return null;

    // Check for active TPL policies
    const activePolicy = await prisma.insurancePolicy.findFirst({
      where: {
        assessmentId: assessment.id,
        insuranceType: "third_party_liability",
        expirationDate: { gt: new Date() },
        status: { in: ["active", "bound"] },
      },
      select: {
        coverageAmount: true,
        expirationDate: true,
      },
      orderBy: { expirationDate: "desc" },
    });

    return {
      hasActivePolicy: activePolicy !== null,
      coverageEur: activePolicy?.coverageAmount ?? assessment.calculatedTPL,
      expiresAt: activePolicy?.expirationDate?.toISOString() ?? null,
      lastUpdated: assessment.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

async function loadEnvironmentalData(
  prisma: PrismaClient,
  orgId: string,
): Promise<AssessmentDataBundle["environmental"]> {
  try {
    const assessment = await prisma.environmentalAssessment.findFirst({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        status: true,
        updatedAt: true,
      },
    });

    if (!assessment) return null;

    return {
      impactAssessed:
        assessment.status === "submitted" || assessment.status === "approved",
      lastUpdated: assessment.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}

async function loadNIS2Data(
  prisma: PrismaClient,
  orgId: string,
): Promise<AssessmentDataBundle["nis2"]> {
  try {
    const assessment = await prisma.nIS2Assessment.findFirst({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        entityClassification: true,
        complianceScore: true,
        updatedAt: true,
      },
    });

    if (!assessment) return null;

    return {
      isEssential: assessment.entityClassification === "essential",
      complianceScore:
        typeof assessment.complianceScore === "number"
          ? assessment.complianceScore
          : null,
      lastUpdated: assessment.updatedAt.toISOString(),
    };
  } catch {
    return null;
  }
}
