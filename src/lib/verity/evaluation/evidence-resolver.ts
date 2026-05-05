import { Prisma, type PrismaClient } from "@prisma/client";
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
              // T1-H5 (audit fix 2026-05-05): Sentinel without cross-
              // verification is HIGH (0.92) per the doc-comment at the
              // top of this function, NOT MEDIUM (0.8). The previous
              // 0.8 wrongly downgraded all single-source Sentinel
              // attestations to MEDIUM, which both reduces the
              // compliance score (MEDIUM weight 0.7 vs HIGH 1.0) and
              // surfaces a misleading min_trust_level warning to
              // regulators on the certificate.
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

  // 2. ComplianceEvidence (B2 fix, 2026-04-20):
  //
  // The model does not have a dedicated numeric-value column, but it
  // does have a `metadata Json?` field that is designed for exactly
  // this purpose ("Additional structured metadata (scan job ID,
  // source URL, etc.)"). Callers can store a numeric measurement as:
  //
  //   metadata = { value: 42, dataPoint: "remaining_fuel_pct", unit: "%" }
  //
  // If an ACCEPTED ComplianceEvidence record exists for this operator
  // whose metadata matches the requested dataPoint and has a usable
  // numeric `value`, use it as fallback evidence. Trust is derived
  // from the record's `confidence` field, capped at 0.90 (still
  // strictly below Sentinel's 0.92/0.98 trust).
  try {
    const org = await prisma.organizationMember.findFirst({
      where: { userId: operatorId },
      select: { organizationId: true },
    });
    if (org) {
      const now = new Date();
      // Pull recent ACCEPTED evidence with non-null metadata. Cap the
      // lookup at 50 records so we can filter in memory without
      // materialising every evidence row for the org.
      const candidates = await prisma.complianceEvidence.findMany({
        where: {
          organizationId: org.organizationId,
          status: "ACCEPTED",
          metadata: {
            not: Prisma.JsonNull,
          } as unknown as Prisma.InputJsonValue,
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          metadata: true,
          confidence: true,
          createdAt: true,
          validUntil: true,
        },
      });
      for (const row of candidates) {
        const meta = row.metadata as unknown;
        if (!meta || typeof meta !== "object") continue;
        const m = meta as Record<string, unknown>;
        const metaPoint = typeof m.dataPoint === "string" ? m.dataPoint : null;
        const metaValue = typeof m.value === "number" ? m.value : null;
        // T5-1 (audit fix 2026-05-05): `!metaValue` previously skipped
        // legitimate `value: 0` measurements (debris-flag = 0 = compliant,
        // remaining-fuel = 0 = depleted, etc.). Use explicit null check
        // plus Number.isFinite (rejects NaN, ±Infinity) so 0 is allowed.
        if (metaValue === null || !Number.isFinite(metaValue)) continue;
        if (metaPoint && metaPoint !== dataPoint) continue;
        // Clamp trust to [0.50, 0.90] so evidence_record never outranks
        // Sentinel (0.92) even if confidence is reported as 1.0.
        const trust = Math.min(0.9, Math.max(0.5, row.confidence ?? 0.75));
        safeLog("ComplianceEvidence match", {
          evidenceId: row.id,
          dataPoint,
          trust,
        });
        return {
          actual_value: metaValue,
          data_point: dataPoint,
          source: "evidence_record",
          trust_score: trust,
          collected_at: row.createdAt.toISOString(),
          sentinel_anchor: null,
          cross_verification: null,
        };
      }
    }
  } catch {
    safeLog("ComplianceEvidence lookup failed", { dataPoint });
  }

  // 3. No evidence found
  safeLog("No evidence available for dataPoint", { dataPoint });
  return null;
}
