import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeSupplement2Report,
  type TradeSupplement2Status,
} from "@prisma/client";

import { isEligibleEccn } from "./eligible-eccns";
import { fromCents } from "@/lib/trade/money";
import {
  type ReportingPeriod,
  makeReportingPeriod,
  parseReportingPeriod,
} from "./reporting-period";

/**
 * Caelex Trade — Supplement No. 2 One-Time Report service (Z29, Tier 4).
 *
 * Thin Prisma wrapper for the TradeSupplement2Report model. All reads
 * are org-scoped — the caller passes orgId resolved from the session
 * and the service refuses to fetch rows outside that org boundary.
 *
 * Functional surface:
 *   - listEligibleOperations(orgId, period) — scan operations that
 *     shipped in the period with at least one in-scope ECCN line.
 *   - generateReport(orgId, period) — create-or-update the DRAFT row
 *     and rebuild its child items snapshot. Idempotent — safe for the
 *     cron to retry.
 *   - markFiled(orgId, reportId, filedAt, bisReferenceNumber, userId)
 *     — transition DRAFT → FILED (or AMENDED if previously FILED).
 *   - getOverdueReports(orgId, now) — list DRAFT rows past dueDate.
 *   - markOverdue(now) — bulk transition DRAFT → OVERDUE for all
 *     orgs whose due-dates have passed.
 *
 * Sources:
 *   - 15 CFR § 743.2 (Annual reporting)
 *   - 15 CFR Supplement No. 2 to Part 743
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface EligibleOperationLine {
  /** Operation that shipped at least one qualifying item. */
  operationId: string;
  operationReference: string;
  destinationCountry: string;
  /** Date used to bin the operation into the period. */
  shipDate: Date;
  /** Eligible items inside the operation. */
  items: EligibleItem[];
  /** Operation total value in operation currency (sum of line values). */
  totalValue: number;
  /** ISO 4217 currency code (defaults to "EUR"). */
  currency: string;
}

export interface EligibleItem {
  /** Operation line id (not the underlying TradeItem id). */
  lineId: string;
  /** The matching ECCN that triggered eligibility. */
  eccn: string;
  /** Quantity shipped on this line. */
  quantity: number;
  /** Line value (quantity * unitValue). */
  lineValue: number;
  /** ISO 4217 currency for this line. */
  currency: string;
}

export type Supplement2ReportWithItems = TradeSupplement2Report & {
  items: Array<{
    id: string;
    operationId: string | null;
    operationReference: string;
    eccn: string;
    destinationCountry: string;
    quantity: number;
    totalValue: number;
    currency: string;
    shipDate: Date;
  }>;
};

// ─── Reads ──────────────────────────────────────────────────────────

/**
 * Scan operations shipped in the given reporting period and return
 * those with at least one line in the Supplement No. 2 ECCN scope.
 *
 * Operations qualify when:
 *   1. status ∈ {EXECUTED, BLOCKED_PENDING_DISCLOSURE} (i.e. the
 *      shipment happened — drafts and licensed-but-unshipped don't
 *      count).
 *   2. actualShipDate ∈ [period.start, period.end) OR (when
 *      actualShipDate is null) scheduledShipDate ∈ [period.start,
 *      period.end).
 *   3. At least one line item has an in-scope ECCN (per
 *      isEligibleEccn) on either eccnEU or eccnUS.
 *
 * Returned rows include only the qualifying line items, not the full
 * operation BOM.
 */
export async function listEligibleOperations(
  organizationId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<EligibleOperationLine[]> {
  const operations = await prisma.tradeOperation.findMany({
    where: {
      organizationId,
      // T-H8: Only EXECUTED operations (goods physically shipped) belong
      // in a BIS Supplement No. 2 report. The report covers exports that
      // ACTUALLY OCCURRED in the period. DRAFT / AWAITING_* / LICENSED /
      // BLOCKED ops have not shipped and must not be reported to BIS.
      // The scheduled-ship-date-only branch that existed here was a bug:
      // it let unshipped operations appear as filed exports.
      status: "EXECUTED",
      actualShipDate: { gte: periodStart, lt: periodEnd },
    },
    select: {
      id: true,
      reference: true,
      shipToCountry: true,
      actualShipDate: true,
      scheduledShipDate: true,
      lines: {
        select: {
          id: true,
          quantity: true,
          unitValue: true,
          unitCurrency: true,
          item: {
            select: {
              eccnEU: true,
              eccnUS: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const result: EligibleOperationLine[] = [];

  for (const op of operations) {
    const eligible: EligibleItem[] = [];
    for (const line of op.lines) {
      // Prefer the US ECCN since Supplement No. 2 is a US regulation,
      // but fall back to EU classification — operators sometimes only
      // classify against EU Annex I if shipping out of an EU subsidiary.
      const eccn = line.item.eccnUS ?? line.item.eccnEU;
      if (isEligibleEccn(eccn)) {
        eligible.push({
          lineId: line.id,
          eccn: eccn as string,
          quantity: line.quantity,
          lineValue: line.quantity * fromCents(line.unitValue),
          currency: line.unitCurrency,
        });
      }
    }
    if (eligible.length === 0) continue;

    // T-H8: status=EXECUTED guarantees actualShipDate is set; the
    // scheduledShipDate fallback is gone along with the bug. The null
    // guard below is a belt-and-suspenders TypeScript safety check only.
    const shipDate = op.actualShipDate;
    if (!shipDate) continue; // unreachable post-T-H8 (EXECUTED implies actualShipDate set)

    // Use the first eligible line's currency as the operation's
    // reporting currency. In practice all lines on one operation share
    // a currency; mixed currency lines are explicitly summed at face
    // value and the operator must reconcile in their filing.
    const reportingCurrency = eligible[0].currency;
    const totalValue = eligible.reduce((sum, item) => sum + item.lineValue, 0);

    result.push({
      operationId: op.id,
      operationReference: op.reference,
      destinationCountry: op.shipToCountry,
      shipDate,
      items: eligible,
      totalValue,
      currency: reportingCurrency,
    });
  }

  return result;
}

/**
 * Fetch one report by id (org-scoped) with all its child items.
 * Returns null when the id doesn't belong to the org — callers must
 * treat null as 404 to avoid leaking cross-org existence.
 */
export async function getReport(
  organizationId: string,
  reportId: string,
): Promise<Supplement2ReportWithItems | null> {
  return prisma.tradeSupplement2Report.findFirst({
    where: { id: reportId, organizationId },
    include: {
      items: {
        orderBy: { shipDate: "asc" },
      },
    },
  });
}

/**
 * List all reports for an org, ordered by reporting period descending.
 */
export async function listReports(
  organizationId: string,
  options: { status?: TradeSupplement2Status } = {},
): Promise<Supplement2ReportWithItems[]> {
  return prisma.tradeSupplement2Report.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
    },
    orderBy: { periodStart: "desc" },
    include: {
      items: {
        orderBy: { shipDate: "asc" },
      },
    },
  });
}

/**
 * List DRAFT reports for an org whose due-date has already passed.
 * The cron uses this for the OVERDUE transition; the UI uses it for
 * the "needs action" badge.
 */
export async function getOverdueReports(
  organizationId: string,
  now: Date = new Date(),
): Promise<TradeSupplement2Report[]> {
  return prisma.tradeSupplement2Report.findMany({
    where: {
      organizationId,
      status: "DRAFT",
      dueDate: { lt: now },
    },
    orderBy: { dueDate: "asc" },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

/**
 * Generate (or refresh) the DRAFT report for an org + period. Pulls
 * eligible operations, snapshots them as TradeSupplement2ReportItem
 * rows, and upserts the parent report. Safe to call repeatedly — old
 * child items are pruned + replaced.
 *
 * Returns the resulting report (with items).
 */
export async function generateReport(
  organizationId: string,
  period: ReportingPeriod,
  lastActionById: string | null = null,
): Promise<Supplement2ReportWithItems> {
  const eligible = await listEligibleOperations(
    organizationId,
    period.start,
    period.end,
  );

  // Build the snapshot rows. One TradeSupplement2ReportItem per
  // (operation, eccn) — operations with multiple eligible ECCNs get
  // multiple rows so the report breaks out by classification code.
  const snapshotItems: Array<{
    operationId: string;
    operationReference: string;
    eccn: string;
    destinationCountry: string;
    quantity: number;
    totalValue: number;
    currency: string;
    shipDate: Date;
  }> = [];
  for (const op of eligible) {
    // Aggregate by ECCN within the operation
    const byEccn = new Map<
      string,
      { quantity: number; totalValue: number; currency: string }
    >();
    for (const item of op.items) {
      const existing = byEccn.get(item.eccn);
      if (existing) {
        existing.quantity += item.quantity;
        existing.totalValue += item.lineValue;
      } else {
        byEccn.set(item.eccn, {
          quantity: item.quantity,
          totalValue: item.lineValue,
          currency: item.currency,
        });
      }
    }
    for (const [eccn, agg] of byEccn) {
      snapshotItems.push({
        operationId: op.operationId,
        operationReference: op.operationReference,
        eccn,
        destinationCountry: op.destinationCountry,
        quantity: agg.quantity,
        totalValue: agg.totalValue,
        currency: agg.currency,
        shipDate: op.shipDate,
      });
    }
  }

  // Atomic upsert + child rebuild. We delete-then-insert children so
  // re-runs reflect the latest operation state. This is fine because
  // child rows are pure snapshots, not authoritative.
  return prisma.$transaction(async (tx) => {
    const existing = await tx.tradeSupplement2Report.findFirst({
      where: {
        organizationId,
        reportingPeriod: period.id,
      },
      select: { id: true, status: true },
    });

    if (existing) {
      // Re-run is only safe on DRAFT reports — FILED / AMENDED reports
      // are immutable post-submission. Refuse to overwrite.
      if (existing.status !== "DRAFT") {
        throw new Error(
          `Cannot regenerate report ${existing.id}: status is ${existing.status}, not DRAFT`,
        );
      }
      await tx.tradeSupplement2ReportItem.deleteMany({
        where: { reportId: existing.id },
      });
      const updated = await tx.tradeSupplement2Report.update({
        where: { id: existing.id },
        data: {
          lastActionById,
          items: { create: snapshotItems },
        },
        include: { items: { orderBy: { shipDate: "asc" } } },
      });
      return updated;
    }

    const created = await tx.tradeSupplement2Report.create({
      data: {
        organizationId,
        reportingPeriod: period.id,
        periodStart: period.start,
        periodEnd: period.end,
        dueDate: period.dueDate,
        status: "DRAFT",
        lastActionById,
        items: { create: snapshotItems },
      },
      include: { items: { orderBy: { shipDate: "asc" } } },
    });
    return created;
  });
}

export interface MarkFiledInput {
  organizationId: string;
  reportId: string;
  filedAt: Date;
  bisReferenceNumber?: string | null;
  notes?: string | null;
  lastActionById: string;
}

/**
 * Mark a DRAFT report as FILED, or a FILED report as AMENDED (when
 * the operator re-files post-submission). All other transitions are
 * refused.
 */
export async function markFiled(
  input: MarkFiledInput,
): Promise<TradeSupplement2Report> {
  const current = await prisma.tradeSupplement2Report.findFirst({
    where: { id: input.reportId, organizationId: input.organizationId },
  });
  if (!current) {
    throw new Error("Supplement No. 2 report not found in this organisation");
  }

  let nextStatus: TradeSupplement2Status;
  const data: Record<string, unknown> = {
    lastActionById: input.lastActionById,
  };

  if (current.status === "DRAFT" || current.status === "OVERDUE") {
    nextStatus = "FILED";
    data.filedAt = input.filedAt;
  } else if (current.status === "FILED" || current.status === "AMENDED") {
    nextStatus = "AMENDED";
    data.amendedAt = input.filedAt;
  } else {
    throw new Error(`Cannot file report in status ${current.status}`);
  }

  data.status = nextStatus;
  if (input.bisReferenceNumber !== undefined) {
    data.bisReferenceNumber = input.bisReferenceNumber;
  }
  if (input.notes !== undefined) {
    data.notes = input.notes;
  }

  return prisma.tradeSupplement2Report.update({
    where: { id: input.reportId },
    data,
  });
}

/**
 * Bulk-transition all DRAFT reports whose dueDate has passed to
 * OVERDUE. Called by the daily reminder cron. Idempotent — already-
 * OVERDUE rows are absorbing.
 *
 * Returns the count of rows transitioned.
 */
export async function markOverdueReports(
  now: Date = new Date(),
): Promise<number> {
  const result = await prisma.tradeSupplement2Report.updateMany({
    where: {
      status: "DRAFT",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });
  return result.count;
}

/**
 * Convenience wrapper for the cron: open DRAFT skeletons for the
 * just-closed period for every active organisation. Iterates orgs and
 * calls `generateReport` for each. Orgs with no eligible operations
 * still get a DRAFT row (the operator can mark it FILED-no-activity
 * to discharge the obligation).
 *
 * Returns a summary describing what was opened.
 */
export interface OpenPeriodSummary {
  periodId: string;
  organisationsScanned: number;
  reportsCreated: number;
  reportsUpdated: number;
  totalEligibleOperations: number;
  errors: Array<{ organizationId: string; error: string }>;
}

export async function openPeriodForAllOrganisations(
  period: ReportingPeriod,
): Promise<OpenPeriodSummary> {
  const orgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let reportsCreated = 0;
  let reportsUpdated = 0;
  let totalEligibleOperations = 0;
  const errors: Array<{ organizationId: string; error: string }> = [];

  for (const org of orgs) {
    try {
      const before = await prisma.tradeSupplement2Report.findFirst({
        where: {
          organizationId: org.id,
          reportingPeriod: period.id,
        },
        select: { id: true },
      });
      const report = await generateReport(org.id, period, null);
      totalEligibleOperations += report.items.length;
      if (before) {
        reportsUpdated += 1;
      } else {
        reportsCreated += 1;
      }
    } catch (err) {
      errors.push({
        organizationId: org.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    periodId: period.id,
    organisationsScanned: orgs.length,
    reportsCreated,
    reportsUpdated,
    totalEligibleOperations,
    errors,
  };
}

// ─── Re-exports for callers ─────────────────────────────────────────

export { makeReportingPeriod, parseReportingPeriod };
export type { ReportingPeriod } from "./reporting-period";
