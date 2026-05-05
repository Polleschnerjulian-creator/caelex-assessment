import "server-only";

import type { PrismaClient } from "@prisma/client";
import { evaluateAndAttest } from "./threshold-evaluator";
import { REGULATION_THRESHOLDS } from "./regulation-thresholds";
import { safeLog } from "../utils/redaction";
import { logger } from "@/lib/logger";
import { appendToChain } from "../audit-chain/chain-writer.server";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoAttestResult {
  orgs_processed: number;
  attestations_created: number;
  attestations_revoked: number;
  skipped: number;
  errors: number;
  details: OrgResult[];
}

interface OrgResult {
  organizationId: string;
  created: number;
  revoked: number;
  skipped: number;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const ATTESTATION_EXPIRY_DAYS = 90;

/** Map dataPoint → regulation refs that use it */
const DATA_POINT_TO_REGULATIONS: Map<string, string[]> = new Map();
for (const t of REGULATION_THRESHOLDS) {
  const existing = DATA_POINT_TO_REGULATIONS.get(t.data_point) ?? [];
  existing.push(t.regulation_ref);
  DATA_POINT_TO_REGULATIONS.set(t.data_point, existing);
}

// ─── Core ─────────────────────────────────────────────────────────────────────

/**
 * Auto-generate Verity attestations from verified Sentinel telemetry.
 *
 * Scans all orgs with active Sentinel agents, matches packet dataPoints
 * against regulation thresholds, deduplicates against existing attestations,
 * and handles PASS↔FAIL revocation.
 */
export async function autoAttestFromSentinel(
  prisma: PrismaClient,
): Promise<AutoAttestResult> {
  const result: AutoAttestResult = {
    orgs_processed: 0,
    attestations_created: 0,
    attestations_revoked: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  // 1. Find all orgs with at least one ACTIVE Sentinel agent
  const orgsWithAgents = await prisma.sentinelAgent.findMany({
    where: { status: "ACTIVE" },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  for (const { organizationId } of orgsWithAgents) {
    try {
      const orgResult = await processOrganization(prisma, organizationId);
      result.details.push(orgResult);
      result.attestations_created += orgResult.created;
      result.attestations_revoked += orgResult.revoked;
      result.skipped += orgResult.skipped;
      result.orgs_processed++;
    } catch (err) {
      logger.error(`[auto-attest] Org ${organizationId} failed`, err);
      result.errors++;
      result.details.push({
        organizationId,
        created: 0,
        revoked: 0,
        skipped: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // 2. Send notifications for orgs with new/revoked attestations
  for (const detail of result.details) {
    if (detail.created > 0 || detail.revoked > 0) {
      await notifyOrgAdmins(prisma, detail).catch((err) =>
        logger.error("[auto-attest] Notification failed", err),
      );
    }
  }

  return result;
}

// ─── Per-Organization Processing ──────────────────────────────────────────────

async function processOrganization(
  prisma: PrismaClient,
  organizationId: string,
): Promise<OrgResult> {
  const orgResult: OrgResult = {
    organizationId,
    created: 0,
    revoked: 0,
    skipped: 0,
  };

  // Find operator (OWNER, fallback ADMIN)
  const operatorId = await findOrgOperator(prisma, organizationId);
  if (!operatorId) {
    safeLog("[auto-attest] No owner/admin found for org", { organizationId });
    return orgResult;
  }

  const twentyFourHoursAgo = new Date(Date.now() - DEDUP_WINDOW_MS);

  // Find unique (satelliteNorad, dataPoint) from recent valid packets
  const recentPackets = await prisma.sentinelPacket.findMany({
    where: {
      agent: {
        organizationId,
        status: "ACTIVE",
      },
      signatureValid: true,
      collectedAt: { gt: twentyFourHoursAgo },
      satelliteNorad: { not: null },
    },
    select: {
      satelliteNorad: true,
      dataPoint: true,
    },
    distinct: ["satelliteNorad", "dataPoint"],
  });

  // Filter to dataPoints that match regulation thresholds
  const eligiblePairs = recentPackets.filter(
    (p) => p.satelliteNorad && DATA_POINT_TO_REGULATIONS.has(p.dataPoint),
  );

  for (const packet of eligiblePairs) {
    const regulationRefs = DATA_POINT_TO_REGULATIONS.get(packet.dataPoint)!;

    for (const regulationRef of regulationRefs) {
      try {
        const action = await processThreshold(prisma, {
          organizationId,
          operatorId,
          satelliteNorad: packet.satelliteNorad!,
          regulationRef,
          twentyFourHoursAgo,
        });

        if (action === "created") orgResult.created++;
        else if (action === "skipped") orgResult.skipped++;
        // revocations are counted separately in processThreshold
        orgResult.revoked += action === "revoked" ? 1 : 0;
      } catch (err) {
        safeLog("[auto-attest] Threshold processing failed", {
          organizationId,
          regulationRef,
          satelliteNorad: packet.satelliteNorad,
        });
        logger.error("[auto-attest] Threshold error", err);
      }
    }
  }

  return orgResult;
}

// ─── Threshold Processing ─────────────────────────────────────────────────────

type ThresholdAction = "created" | "skipped" | "revoked";

async function processThreshold(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    operatorId: string;
    satelliteNorad: string;
    regulationRef: string;
    twentyFourHoursAgo: Date;
  },
): Promise<ThresholdAction> {
  const {
    organizationId,
    operatorId,
    satelliteNorad,
    regulationRef,
    twentyFourHoursAgo,
  } = params;

  // Dedup: check for existing active attestation within 24h window
  const existingRecent = await prisma.verityAttestation.findFirst({
    where: {
      organizationId,
      satelliteNorad,
      regulationRef,
      revokedAt: null,
      expiresAt: { gt: new Date() },
      collectedAt: { gt: twentyFourHoursAgo },
    },
    select: { id: true, result: true },
  });

  if (existingRecent) {
    return "skipped";
  }

  // Look up satellite name for attestation subject
  const spacecraft = await prisma.spacecraft.findFirst({
    where: {
      organizationId,
      noradId: satelliteNorad,
    },
    select: { name: true },
  });

  // Generate attestation via existing pipeline
  const attestation = await evaluateAndAttest(prisma, {
    operatorId,
    organizationId,
    satelliteNorad,
    satelliteName: spacecraft?.name ?? null,
    regulationRef,
    expiresInDays: ATTESTATION_EXPIRY_DAYS,
  });

  if (!attestation) {
    return "skipped"; // No evidence available
  }

  // T5-4 (audit fix 2026-05-05): the ATTESTATION_CREATED audit-chain
  // entry is written by `evaluateAndAttest` already. Calling it again
  // here would either duplicate the entry or hit the
  // `@@unique(organizationId, sequenceNumber)` constraint after the
  // T1-C2 race fix, depending on call ordering. The revoke path below
  // still emits ATTESTATION_REVOKED — that's a distinct event, kept.

  // Handle PASS↔FAIL revocation
  const revoked = await revokeSupersededAttestations(prisma, {
    organizationId,
    satelliteNorad,
    regulationRef,
    newResult: attestation.claim.result,
    newAttestationId: attestation.attestation_id,
  });

  safeLog("[auto-attest] Attestation created", {
    attestationId: attestation.attestation_id,
    regulationRef,
    satelliteNorad,
    result: attestation.claim.result,
    trustLevel: attestation.evidence.trust_level,
    revoked,
  });

  return revoked > 0 ? "revoked" : "created";
}

// ─── Revocation ───────────────────────────────────────────────────────────────

/**
 * Revoke previous attestations when result has flipped.
 * PASS→FAIL: revoke old PASS attestations
 * FAIL→PASS: revoke old FAIL attestations
 */
async function revokeSupersededAttestations(
  prisma: PrismaClient,
  params: {
    organizationId: string;
    satelliteNorad: string;
    regulationRef: string;
    newResult: boolean;
    newAttestationId: string;
  },
): Promise<number> {
  const {
    organizationId,
    satelliteNorad,
    regulationRef,
    newResult,
    newAttestationId,
  } = params;

  // Find active attestations with the OPPOSITE result
  const superseded = await prisma.verityAttestation.findMany({
    where: {
      organizationId,
      satelliteNorad,
      regulationRef,
      result: !newResult, // Opposite of new result
      revokedAt: null,
      expiresAt: { gt: new Date() },
      attestationId: { not: newAttestationId },
    },
    select: { id: true, attestationId: true },
  });

  if (superseded.length === 0) return 0;

  const reason = newResult
    ? "Auto-revoked: threshold now met (Sentinel telemetry update)"
    : "Auto-revoked: threshold no longer met (Sentinel telemetry update)";

  await prisma.verityAttestation.updateMany({
    where: {
      id: { in: superseded.map((a) => a.id) },
    },
    data: {
      revokedAt: new Date(),
      revokedReason: reason,
    },
  });

  for (const att of superseded) {
    safeLog("[auto-attest] Revoked superseded attestation", {
      attestationId: att.attestationId,
      reason,
    });
    appendToChain({
      organizationId,
      eventType: "ATTESTATION_REVOKED",
      entityId: att.attestationId,
      entityType: "attestation",
      eventData: { reason: "threshold_flip", regulationRef },
    }).catch((err) => {
      // T1-C2: surface revocation audit-chain failures.
      logger.error("verity audit-chain append failed (revoke superseded)", {
        attestationId: att.attestationId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  return superseded.length;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Find the primary operator for an organization.
 * Priority: OWNER > ADMIN (first by creation date).
 */
async function findOrgOperator(
  prisma: PrismaClient,
  organizationId: string,
): Promise<string | null> {
  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      role: { in: ["OWNER", "ADMIN"] },
    },
    orderBy: [
      // OWNER sorts before ADMIN alphabetically — but explicit ordering is safer
      { role: "asc" },
      { joinedAt: "asc" },
    ],
    select: { userId: true },
  });

  return member?.userId ?? null;
}

// ─── Notifications ────────────────────────────────────────────────────────────

async function notifyOrgAdmins(
  prisma: PrismaClient,
  detail: OrgResult,
): Promise<void> {
  const admins = await prisma.organizationMember.findMany({
    where: {
      organizationId: detail.organizationId,
      role: { in: ["OWNER", "ADMIN"] },
    },
    select: { userId: true },
  });

  const dateKey = new Date().toISOString().slice(0, 10);
  const entityId = `auto_attest_${detail.organizationId}_${dateKey}`;

  const parts: string[] = [];
  if (detail.created > 0) parts.push(`${detail.created} new`);
  if (detail.revoked > 0) parts.push(`${detail.revoked} revoked`);
  const summary = parts.join(", ");

  for (const admin of admins) {
    // Dedup: one notification per org per day
    const existing = await prisma.notification.findFirst({
      where: {
        userId: admin.userId,
        entityType: "verity_auto_attest",
        entityId,
      },
    });

    if (existing) continue;

    await prisma.notification.create({
      data: {
        userId: admin.userId,
        type: "COMPLIANCE_UPDATED",
        title: `Sentinel Auto-Attestation: ${summary}`,
        message: `Verity hat automatisch ${summary} Compliance-Attestierungen aus Sentinel-Telemetrie erstellt. Prüfe die Details im Verity Dashboard.`,
        actionUrl: "/dashboard/verity",
        entityType: "verity_auto_attest",
        entityId,
        severity: detail.revoked > 0 ? "WARNING" : "INFO",
      },
    });
  }
}
