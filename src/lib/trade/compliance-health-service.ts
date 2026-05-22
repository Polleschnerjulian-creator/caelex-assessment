import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Caelex Trade — Compliance Health aggregator (Sprint X1).
 *
 * Org-scoped aggregations across the document workflow surfaces
 * (EUC, Re-Export Consent, VSD). Returns a single object that the
 * /trade welcome page renders as a "what needs my attention today"
 * panel.
 *
 * All queries run in parallel via Promise.all so the total latency is
 * the slowest single query, not their sum. Counts are denormalised
 * grouping queries rather than full row fetches — we never need the
 * underlying rows for this view.
 */

export interface ComplianceHealthSummary {
  /** End-Use Certificates */
  euc: {
    total: number;
    requested: number;
    sentToParty: number;
    received: number;
    validated: number;
    expiringSoon: number;
    /** EUCs needing immediate attention: REQUESTED (not yet dispatched) +
     *  RECEIVED (awaiting validation review) + soon-to-expire. */
    needsAction: number;
  };
  /** Re-Export Consents */
  reexport: {
    total: number;
    drafted: number;
    sent: number;
    approved: number;
    denied: number;
    expiringSoon: number;
    /** Re-exports needing immediate attention: DRAFTED (not yet sent) +
     *  SENT (awaiting authority response) + soon-to-expire. */
    needsAction: number;
  };
  /** Voluntary Self-Disclosures */
  vsd: {
    total: number;
    discovered: number;
    investigating: number;
    drafted: number;
    submitted: number;
    acknowledged: number;
    resolved: number;
    /** Open VSDs (non-terminal): any status before RESOLVED/WITHDRAWN. */
    open: number;
    /** Pre-filing stages (DISCOVERED + INVESTIGATING + DRAFTED) — the
     *  most time-sensitive bucket because BIS §764.5 wants "as soon
     *  as possible" and OFAC sets a 60-day clock from discovery. */
    preFilingOpen: number;
  };
}

export async function getComplianceHealth(
  organizationId: string,
): Promise<ComplianceHealthSummary> {
  const now = new Date();
  const ninetyDaysFromNow = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  // Run all aggregations in parallel — the Prisma client batches them
  // via a single connection.
  const [
    eucByStatus,
    eucExpiringSoon,
    reexportByStatus,
    reexportExpiringSoon,
    vsdByStatus,
  ] = await Promise.all([
    prisma.tradeEUCRequest.groupBy({
      where: { organizationId },
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.tradeEUCRequest.count({
      where: {
        organizationId,
        status: "VALIDATED",
        validUntil: { gte: now, lte: ninetyDaysFromNow },
      },
    }),
    prisma.tradeReexportConsent.groupBy({
      where: { organizationId },
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.tradeReexportConsent.count({
      where: {
        organizationId,
        status: "APPROVED",
        validUntil: { gte: now, lte: ninetyDaysFromNow },
      },
    }),
    prisma.tradeVoluntaryDisclosure.groupBy({
      where: { organizationId },
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  // Reshape group-by rows into status-keyed maps.
  const eucMap = mapByStatus(eucByStatus);
  const reexportMap = mapByStatus(reexportByStatus);
  const vsdMap = mapByStatus(vsdByStatus);

  const eucTotal = sumMap(eucMap);
  const reexportTotal = sumMap(reexportMap);
  const vsdTotal = sumMap(vsdMap);

  // "Needs action" buckets — surfaced prominently in the UI.
  const eucNeedsAction =
    (eucMap.REQUESTED ?? 0) + (eucMap.RECEIVED ?? 0) + eucExpiringSoon;

  const reexportNeedsAction =
    (reexportMap.DRAFTED ?? 0) + (reexportMap.SENT ?? 0) + reexportExpiringSoon;

  const vsdOpen =
    (vsdMap.DISCOVERED ?? 0) +
    (vsdMap.INVESTIGATING ?? 0) +
    (vsdMap.DRAFTED ?? 0) +
    (vsdMap.SUBMITTED ?? 0) +
    (vsdMap.ACKNOWLEDGED ?? 0);

  const vsdPreFilingOpen =
    (vsdMap.DISCOVERED ?? 0) +
    (vsdMap.INVESTIGATING ?? 0) +
    (vsdMap.DRAFTED ?? 0);

  return {
    euc: {
      total: eucTotal,
      requested: eucMap.REQUESTED ?? 0,
      sentToParty: eucMap.SENT_TO_PARTY ?? 0,
      received: eucMap.RECEIVED ?? 0,
      validated: eucMap.VALIDATED ?? 0,
      expiringSoon: eucExpiringSoon,
      needsAction: eucNeedsAction,
    },
    reexport: {
      total: reexportTotal,
      drafted: reexportMap.DRAFTED ?? 0,
      sent: reexportMap.SENT ?? 0,
      approved: reexportMap.APPROVED ?? 0,
      denied: reexportMap.DENIED ?? 0,
      expiringSoon: reexportExpiringSoon,
      needsAction: reexportNeedsAction,
    },
    vsd: {
      total: vsdTotal,
      discovered: vsdMap.DISCOVERED ?? 0,
      investigating: vsdMap.INVESTIGATING ?? 0,
      drafted: vsdMap.DRAFTED ?? 0,
      submitted: vsdMap.SUBMITTED ?? 0,
      acknowledged: vsdMap.ACKNOWLEDGED ?? 0,
      resolved: vsdMap.RESOLVED ?? 0,
      open: vsdOpen,
      preFilingOpen: vsdPreFilingOpen,
    },
  };
}

// ─── Internals ──────────────────────────────────────────────────────

function mapByStatus(
  rows: Array<{ status: string; _count: { _all: number } }>,
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.status] = row._count._all;
  }
  return map;
}

function sumMap(map: Record<string, number>): number {
  return Object.values(map).reduce((acc, n) => acc + n, 0);
}
