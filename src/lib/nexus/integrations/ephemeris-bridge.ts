import { prisma } from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════
// NEXUS ↔ Ephemeris — Forecasting Metrics Bridge
// ═══════════════════════════════════════════════════════════

/**
 * Aggregate NEXUS security metrics for the Ephemeris forecasting system.
 *
 * Calculates directly via Prisma to avoid circular server-only imports from
 * the vulnerability and personnel services.
 *
 * Returns:
 *  - patchRate:           % of available patches that have been applied (0–100)
 *  - mfaRate:             % of active personnel with MFA enabled (0–100)
 *  - openCriticalVulns:   count of open or in-progress CRITICAL vulnerabilities
 *  - mttrMinutes:         mean time to resolve vulnerabilities (last 90 days)
 */
export async function getNexusMetricsForEphemeris(orgId: string): Promise<{
  patchRate: number;
  mfaRate: number;
  openCriticalVulns: number;
  mttrMinutes: number;
}> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const [
    patchAvailable,
    patchApplied,
    totalActivePersonnel,
    mfaEnabledPersonnel,
    openCriticalVulns,
    resolvedVulns,
  ] = await Promise.all([
    // Patch rate — numerator
    prisma.assetVulnerability.count({
      where: {
        patchAvailable: true,
        asset: { organizationId: orgId },
      },
    }),
    // Patch rate — denominator
    prisma.assetVulnerability.count({
      where: {
        patchAvailable: true,
        patchApplied: true,
        asset: { organizationId: orgId },
      },
    }),
    // MFA rate — denominator
    prisma.assetPersonnel.count({
      where: {
        isActive: true,
        asset: { organizationId: orgId },
      },
    }),
    // MFA rate — numerator
    prisma.assetPersonnel.count({
      where: {
        isActive: true,
        mfaEnabled: true,
        asset: { organizationId: orgId },
      },
    }),
    // Open critical vulnerabilities
    prisma.assetVulnerability.count({
      where: {
        severity: "CRITICAL",
        status: { in: ["OPEN", "IN_PROGRESS"] },
        asset: { organizationId: orgId },
      },
    }),
    // MTTR source data
    prisma.assetVulnerability.findMany({
      where: {
        status: "RESOLVED",
        resolvedAt: { gte: ninetyDaysAgo },
        asset: { organizationId: orgId },
      },
      select: { discoveredAt: true, resolvedAt: true },
    }),
  ]);

  // Patch rate
  const patchRate =
    patchAvailable === 0 ? 100 : (patchApplied / patchAvailable) * 100;

  // MFA rate
  const mfaRate =
    totalActivePersonnel === 0
      ? 100
      : (mfaEnabledPersonnel / totalActivePersonnel) * 100;

  // Mean time to resolve (minutes)
  let mttrMinutes = 0;
  if (resolvedVulns.length > 0) {
    const totalMs = resolvedVulns.reduce((acc, v) => {
      if (!v.resolvedAt) return acc;
      return acc + (v.resolvedAt.getTime() - v.discoveredAt.getTime());
    }, 0);
    mttrMinutes = totalMs / resolvedVulns.length / (1000 * 60);
  }

  return { patchRate, mfaRate, openCriticalVulns, mttrMinutes };
}

/**
 * Return the NEXUS compliance and risk scores for a spacecraft.
 *
 * Looks up the Asset linked to the given spacecraftId and returns its
 * complianceScore and riskScore, or null if no asset is linked.
 */
export async function getSpacecraftComplianceFromNexus(
  spacecraftId: string,
): Promise<{
  complianceScore: number | null;
  riskScore: number | null;
} | null> {
  const asset = await prisma.asset.findFirst({
    where: { spacecraftId, isDeleted: false },
    select: { complianceScore: true, riskScore: true },
  });

  if (!asset) return null;

  return {
    complianceScore: asset.complianceScore,
    riskScore: asset.riskScore,
  };
}
