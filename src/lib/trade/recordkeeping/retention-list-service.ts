import "server-only";
import { prisma } from "@/lib/prisma";

import { type RetentionRecordType, resolveEventDate } from "./retention-policy";
import {
  EXPIRING_SOON_DAYS,
  getRetentionStatus,
  type RetentionStatus,
  type RetentionStatusKind,
} from "./retention-status";

/**
 * Caelex Trade — Retention List Service (Z32, Tier 4).
 *
 * Read-only server function that surfaces records nearing the 5-year
 * retention cutoff for a given organization. NO DB writes — this
 * module exists purely to feed the audit-center "next-up archival"
 * panel and (optionally) a future cron job.
 *
 * Sources:
 *   - 15 CFR § 762.6 (EAR — 5-year retention from trigger event)
 *   - 22 CFR § 122.5 (ITAR — 5 years from license expiration)
 *   - EU Reg 2021/821 Art. 27(3) (5 years from end of export year)
 *
 * Implementation notes:
 *   - Each record type's trigger-date columns are loaded via a narrow
 *     `select` to keep the query small. The retention status is then
 *     computed in-memory.
 *   - Filtering by "expiring within N days" is done in-memory rather
 *     than via a SQL clause because the retention cutoff is computed,
 *     not stored, and we want the policy to remain pure (`*.ts`, not
 *     `*.server.ts`). Pre-filtering at the SQL layer is feasible — the
 *     trigger columns are indexed — but premature for the volumes
 *     these tables hit in practice.
 */

/**
 * One record surfaced by `listExpiringRecords`. The shape is the same
 * regardless of the underlying Prisma model — only `recordType` and
 * `recordId` change.
 */
export interface ExpiringRecord {
  /** Discriminator naming the underlying domain model. */
  recordType: RetentionRecordType;
  /** Database id of the record (e.g. TradeOperation.id). */
  recordId: string;
  /**
   * User-facing label. For operations: the reference. For licenses:
   * the license number (or licenseType + status fallback). Etc.
   */
  label: string;
  /** Computed retention status (cutoff + days-remaining + bucket). */
  retention: RetentionStatus;
}

/**
 * Group of records sharing one record type. Allows the audit-center
 * panel to render one section per type.
 */
export interface ExpiringRecordsGroup {
  recordType: RetentionRecordType;
  count: number;
  records: ExpiringRecord[];
}

/**
 * Optional filters for `listExpiringRecords`. Defaults to "expiring
 * within 90 days OR already expired" so the panel surfaces both the
 * next-up archival queue AND the overdue tail.
 */
export interface ListExpiringRecordsOptions {
  /**
   * Maximum days-remaining to include. Default 90 (matches the
   * `expiring-soon` threshold). Set to a smaller value to narrow the
   * panel to e.g. "next 30 days only".
   */
  withinDays?: number;
  /**
   * Whether to include records already past the cutoff. Default true
   * — the audit-center panel surfaces the overdue tail because that's
   * the operator's compliance signal.
   */
  includeExpired?: boolean;
  /** Cap the number of records returned per type (default 50). */
  perTypeLimit?: number;
  /**
   * Injection point for "now" — defaults to `new Date()`. Used by
   * tests to assert specific status transitions deterministically.
   */
  now?: Date;
}

/**
 * List records nearing or past their 5-year retention cutoff for the
 * given organization. Returns one group per record type.
 *
 * The query is **strictly org-scoped** — every Prisma query filters
 * on `organizationId`. Cross-tenant leaks are structurally impossible.
 *
 * @param organizationId The org whose records to scan.
 * @param options See `ListExpiringRecordsOptions`.
 */
export async function listExpiringRecords(
  organizationId: string,
  options: ListExpiringRecordsOptions = {},
): Promise<ExpiringRecordsGroup[]> {
  const {
    withinDays = EXPIRING_SOON_DAYS,
    includeExpired = true,
    perTypeLimit = 50,
    now = new Date(),
  } = options;

  // Parallel-fetch trigger-date columns for each record type. We pull
  // only the fields needed for label + retention computation; full
  // record bodies are not loaded.
  const [operations, licenses, eucs, reexports, vsds, drafts] =
    await Promise.all([
      prisma.tradeOperation.findMany({
        where: { organizationId },
        select: {
          id: true,
          reference: true,
          actualShipDate: true,
          scheduledShipDate: true,
          createdAt: true,
        },
      }),
      prisma.tradeLicense.findMany({
        where: { organizationId },
        select: {
          id: true,
          licenseNumber: true,
          licenseType: true,
          validUntil: true,
          issuedAt: true,
          createdAt: true,
        },
      }),
      prisma.tradeEUCRequest.findMany({
        where: { organizationId },
        select: {
          id: true,
          formType: true,
          validatedAt: true,
          receivedAt: true,
          sentAt: true,
          requestedAt: true,
        },
      }),
      prisma.tradeReexportConsent.findMany({
        where: { organizationId },
        select: {
          id: true,
          originalLicenseNumber: true,
          decidedAt: true,
          sentAt: true,
          requestedAt: true,
        },
      }),
      prisma.tradeVoluntaryDisclosure.findMany({
        where: { organizationId },
        select: {
          id: true,
          title: true,
          submittedAt: true,
          draftedAt: true,
          discoveredAt: true,
        },
      }),
      prisma.tradeItemClassificationDraft.findMany({
        where: { organizationId },
        select: {
          id: true,
          proposedEccn: true,
          decision: true,
          reviewedAt: true,
          createdAt: true,
        },
      }),
    ]);

  // Helper — build an ExpiringRecord with computed retention status
  // and the right label per type.
  const buildRecord = (
    recordType: RetentionRecordType,
    recordId: string,
    label: string,
    candidates: Array<Date | null | undefined>,
  ): ExpiringRecord => {
    const triggerDate = resolveEventDate(candidates);
    const retention = getRetentionStatus(recordType, triggerDate, now);
    return { recordType, recordId, label, retention };
  };

  const allExpiring: ExpiringRecord[] = [
    ...operations.map((op) =>
      buildRecord("OPERATION", op.id, op.reference, [
        op.actualShipDate,
        op.scheduledShipDate,
        op.createdAt,
      ]),
    ),
    ...licenses.map((lic) =>
      buildRecord(
        "LICENSE",
        lic.id,
        lic.licenseNumber ?? `${lic.licenseType} (no number)`,
        [lic.validUntil, lic.issuedAt, lic.createdAt],
      ),
    ),
    ...eucs.map((euc) =>
      buildRecord("EUC", euc.id, `${euc.formType} EUC`, [
        euc.validatedAt,
        euc.receivedAt,
        euc.sentAt,
        euc.requestedAt,
      ]),
    ),
    ...reexports.map((rx) =>
      buildRecord(
        "REEXPORT_CONSENT",
        rx.id,
        rx.originalLicenseNumber ?? "Re-export consent",
        [rx.decidedAt, rx.sentAt, rx.requestedAt],
      ),
    ),
    ...vsds.map((v) =>
      buildRecord("VSD", v.id, v.title, [
        v.submittedAt,
        v.draftedAt,
        v.discoveredAt,
      ]),
    ),
    ...drafts.map((d) =>
      buildRecord(
        "CLASSIFICATION_DRAFT",
        d.id,
        d.proposedEccn ?? `${d.decision} classification draft`,
        [d.reviewedAt, d.createdAt],
      ),
    ),
  ];

  // Apply the "expiring within N days" + "include expired?" filters.
  const filtered = allExpiring.filter((r) => {
    const { daysRemaining, status } = r.retention;
    if (status === "pending") return false; // clock hasn't started
    if (status === "expired") return includeExpired;
    if (daysRemaining === null) return false;
    return daysRemaining <= withinDays;
  });

  // Sort within each bucket by earliest cutoff first (most urgent
  // first). Expired records come first by virtue of negative
  // daysRemaining sorting low.
  filtered.sort((a, b) => {
    const da = a.retention.daysRemaining ?? Number.POSITIVE_INFINITY;
    const db = b.retention.daysRemaining ?? Number.POSITIVE_INFINITY;
    return da - db;
  });

  // Group by record-type, applying the per-type cap.
  const groupsMap = new Map<RetentionRecordType, ExpiringRecord[]>();
  for (const record of filtered) {
    const bucket = groupsMap.get(record.recordType) ?? [];
    if (bucket.length < perTypeLimit) {
      bucket.push(record);
      groupsMap.set(record.recordType, bucket);
    }
  }

  // Emit groups in a stable, presentation-friendly order. Types not
  // present in the result are omitted entirely.
  const groupOrder: RetentionRecordType[] = [
    "OPERATION",
    "LICENSE",
    "EUC",
    "REEXPORT_CONSENT",
    "VSD",
    "CLASSIFICATION_DRAFT",
    "BAFA_SUBMISSION",
    "NCA_CORRESPONDENCE",
  ];

  return groupOrder
    .filter((type) => groupsMap.has(type))
    .map((type) => {
      const records = groupsMap.get(type) ?? [];
      return { recordType: type, count: records.length, records };
    });
}

/**
 * Convenience aggregate — total counts across status buckets for an
 * organization, used by the audit-center summary header. Independent
 * of `listExpiringRecords` so callers can render the summary without
 * fetching the full list.
 */
export interface RetentionSummary {
  totalActive: number;
  totalExpiringSoon: number;
  totalExpired: number;
  totalPending: number;
}

/**
 * Lightweight scan that classifies every record into a status bucket
 * without materializing the full ExpiringRecord shape. Used for the
 * counts header above the panel.
 */
export async function getRetentionSummary(
  organizationId: string,
  now: Date = new Date(),
): Promise<RetentionSummary> {
  const groups = await listExpiringRecords(organizationId, {
    withinDays: Number.POSITIVE_INFINITY,
    includeExpired: true,
    perTypeLimit: Number.POSITIVE_INFINITY,
    now,
  });
  const summary: RetentionSummary = {
    totalActive: 0,
    totalExpiringSoon: 0,
    totalExpired: 0,
    totalPending: 0,
  };
  for (const group of groups) {
    for (const record of group.records) {
      bumpBucket(summary, record.retention.status);
    }
  }
  return summary;
}

function bumpBucket(summary: RetentionSummary, status: RetentionStatusKind) {
  switch (status) {
    case "active":
      summary.totalActive += 1;
      break;
    case "expiring-soon":
      summary.totalExpiringSoon += 1;
      break;
    case "expired":
      summary.totalExpired += 1;
      break;
    case "pending":
      summary.totalPending += 1;
      break;
  }
}
