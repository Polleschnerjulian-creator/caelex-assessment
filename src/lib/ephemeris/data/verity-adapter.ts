import "server-only";
import type { PrismaClient } from "@prisma/client";
import { safeLog } from "@/lib/verity/utils/redaction";
import type { VerityAttestationSummary } from "../core/types";

/**
 * Verity Attestation Adapter
 *
 * Loads Verity attestation summaries for a satellite to determine
 * which regulations have active, verified attestations.
 */

/**
 * Get Verity attestations for a specific satellite.
 * Returns summaries (no secrets/commitments — safe for Ephemeris consumption).
 */
export async function getVerityAttestations(
  prisma: PrismaClient,
  operatorId: string,
  noradId: string | null,
): Promise<VerityAttestationSummary[]> {
  safeLog("Fetching Verity attestations", { operatorId, noradId });

  try {
    const where: Record<string, unknown> = {
      operatorId,
      expiresAt: { gt: new Date() }, // Only non-expired
    };
    if (noradId) {
      where.satelliteNorad = noradId;
    }

    const attestations = await prisma.verityAttestation.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      select: {
        attestationId: true,
        regulationRef: true,
        dataPoint: true,
        result: true,
        trustScore: true,
        trustLevel: true,
        issuedAt: true,
        expiresAt: true,
      },
    });

    return attestations.map((a) => ({
      attestationId: a.attestationId,
      regulationRef: a.regulationRef,
      dataPoint: a.dataPoint,
      result: a.result,
      trustScore: a.trustScore,
      trustLevel: a.trustLevel,
      issuedAt: a.issuedAt.toISOString(),
      expiresAt: a.expiresAt.toISOString(),
    }));
  } catch (error) {
    safeLog("Error fetching Verity attestations", {
      operatorId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

/**
 * Get Verity status summary for data sources panel.
 */
export async function getVerityStatus(
  prisma: PrismaClient,
  operatorId: string,
  noradId: string | null,
): Promise<{
  attestations: number;
  latestTrustLevel: string | null;
}> {
  try {
    const where: Record<string, unknown> = {
      operatorId,
      expiresAt: { gt: new Date() },
    };
    if (noradId) {
      where.satelliteNorad = noradId;
    }

    const [count, latest] = await Promise.all([
      prisma.verityAttestation.count({ where }),
      prisma.verityAttestation.findFirst({
        where,
        orderBy: { issuedAt: "desc" },
        select: { trustLevel: true },
      }),
    ]);

    return {
      attestations: count,
      latestTrustLevel: latest?.trustLevel ?? null,
    };
  } catch {
    return { attestations: 0, latestTrustLevel: null };
  }
}
