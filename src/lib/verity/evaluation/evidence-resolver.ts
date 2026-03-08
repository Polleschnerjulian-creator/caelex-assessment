import type { PrismaClient } from "@prisma/client";
import { safeLog } from "../utils/redaction";
import type { ResolvedEvidence } from "../core/types";

/**
 * Resolves the latest compliance value for a regulation + satellite.
 *
 * Priority (highest trust first):
 * 1. SentinelPacket + CrossVerification (Trust 0.98) → source: "sentinel"
 * 2. SentinelPacket without CrossVerification (Trust 0.92) → source: "sentinel"
 * 3. ComplianceEvidence record (Trust 0.75-0.90) → source: "evidence_record"
 * 4. Assessment input (Trust 0.50-0.65) → source: "assessment"
 *
 * Returns null if no value available.
 *
 * ═══════════════════════════════════════════════════════════
 * DATA LEAKAGE PREVENTION — HARD RULES
 * ═══════════════════════════════════════════════════════════
 * 1. NEVER actual_value in errors
 * 2. NEVER console.log(req.body)
 * 3. NEVER actual_value in error objects going to clients
 * 4. NEVER actual_value in stack traces
 * 5. ALWAYS use safeLog()
 * ═══════════════════════════════════════════════════════════
 */
export async function resolveEvidence(
  prisma: PrismaClient,
  operatorId: string,
  satelliteNorad: string | null,
  dataPoint: string,
): Promise<ResolvedEvidence | null> {
  safeLog("Resolving evidence", {
    operatorId,
    satelliteNorad: satelliteNorad ?? "N/A",
    dataPoint,
  });

  // 1. Search latest SentinelPacket for this dataPoint
  try {
    const org = await prisma.organizationMember.findFirst({
      where: { userId: operatorId },
      select: { organizationId: true },
    });

    if (org) {
      const agent = await prisma.sentinelAgent.findFirst({
        where: {
          organizationId: org.organizationId,
          status: "ACTIVE",
        },
        select: { id: true, sentinelId: true },
      });

      if (agent) {
        // Find latest packet for this dataPoint
        const packetWhere: Record<string, unknown> = {
          agentId: agent.id,
          dataPoint,
          signatureValid: true,
          chainValid: true,
        };
        if (satelliteNorad) {
          packetWhere.satelliteNorad = satelliteNorad;
        }

        const packet = await prisma.sentinelPacket.findFirst({
          where: packetWhere,
          orderBy: { collectedAt: "desc" },
          include: {
            crossChecks: {
              where: { dataPoint },
              orderBy: { verifiedAt: "desc" },
              take: 1,
            },
          },
        });

        if (packet) {
          const values = packet.values as Record<string, unknown>;
          const rawValue = values[dataPoint];
          if (typeof rawValue === "number") {
            const crossCheck = packet.crossChecks[0] ?? null;
            const hasCrossVerification = crossCheck?.result === "MATCH";

            return {
              actual_value: rawValue,
              data_point: dataPoint,
              source: "sentinel",
              trust_score: hasCrossVerification ? 0.98 : 0.92,
              collected_at: packet.collectedAt.toISOString(),
              sentinel_anchor: {
                sentinel_id: agent.sentinelId,
                chain_position: packet.chainPosition,
                chain_hash: packet.contentHash,
                collected_at: packet.collectedAt.toISOString(),
              },
              cross_verification: crossCheck
                ? {
                    public_source: crossCheck.publicSource,
                    verification_result: crossCheck.result as
                      | "MATCH"
                      | "CLOSE"
                      | "MISMATCH",
                    verified_at: crossCheck.verifiedAt.toISOString(),
                  }
                : null,
            };
          }
        }
      }
    }
  } catch {
    safeLog("Sentinel evidence lookup failed", { dataPoint });
  }

  // 2. ComplianceEvidence does not store numeric values per data point.
  // In Phase 2, a dedicated evidence_values table may be added.
  // For now, Sentinel packets are the primary evidence source.

  // 3. No evidence found
  safeLog("No evidence available for dataPoint", { dataPoint });
  return null;
}
