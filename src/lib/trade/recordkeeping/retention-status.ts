/**
 * Caelex Trade — Retention Status (Z32, Tier 4).
 *
 * Derives the "where in the 5-year retention cycle is this record?"
 * answer from a record's trigger-event date + the static policy from
 * `retention-policy.ts`.
 *
 * Status buckets:
 *   - `pending`       — record has no trigger event yet (e.g. DRAFT
 *                       operation that hasn't shipped). The retention
 *                       clock has not started; deletion is forbidden
 *                       because the underlying business artefact is
 *                       still live.
 *   - `active`        — within retention window, more than 90 days
 *                       until cutoff. Normal state for most records.
 *   - `expiring-soon` — within 90 days of cutoff. Surfaced in the
 *                       audit-center panel as the operator's next-up
 *                       archival queue.
 *   - `expired`       — past the cutoff date. Eligible for archival
 *                       or deletion under the operator's policy;
 *                       Caelex never auto-deletes — that's a manual
 *                       compliance-officer action.
 *
 * Sources: 15 CFR § 762.6, 22 CFR § 122.5, EU Reg 2021/821 Art. 27(3).
 */

import {
  RETENTION_POLICIES,
  type RetentionRecordType,
  computeRetentionUntil,
} from "./retention-policy";

/**
 * Threshold (in days) for the `expiring-soon` window. Matches the
 * project-wide 90-day "near-future" cadence (license-expiry alerts,
 * EUC-validity warnings, etc.) so the operator's mental model is
 * consistent across surfaces.
 */
export const EXPIRING_SOON_DAYS = 90;

/**
 * Status discriminator for the retention cycle.
 */
export type RetentionStatusKind =
  | "pending"
  | "active"
  | "expiring-soon"
  | "expired";

/**
 * Computed retention summary for a single record. All fields are
 * derived — none are stored. The component layer renders this
 * directly into the UI.
 */
export interface RetentionStatus {
  /** Trigger-event date that started the retention clock (UTC). */
  triggerDate: Date | null;
  /** Cutoff date (UTC midnight) when retention obligation ends. */
  retainUntil: Date | null;
  /** Statutory basis citation, e.g. "15 CFR § 762.6". */
  basis: string;
  /** Human-readable description of the policy for tooltips. */
  description: string;
  /**
   * Days until cutoff. Negative when expired, zero on the cutoff
   * day itself, positive while still active. NULL when status is
   * `pending` (no clock started yet).
   */
  daysRemaining: number | null;
  /** Status bucket — see file header. */
  status: RetentionStatusKind;
}

/**
 * Compute calendar-day difference (UTC midnight to UTC midnight). We
 * normalise both endpoints to UTC midnight first so the result is an
 * exact integer count of full days, regardless of when within the day
 * the comparison runs.
 *
 * Returns retainUntil − now in days (positive = future, negative =
 * past, zero = today is the cutoff).
 */
function daysBetweenUtc(from: Date, to: Date): number {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const fromUtcMidnight = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const toUtcMidnight = Date.UTC(
    to.getUTCFullYear(),
    to.getUTCMonth(),
    to.getUTCDate(),
  );
  return Math.round((toUtcMidnight - fromUtcMidnight) / MS_PER_DAY);
}

/**
 * Derive the retention status for one record. Pass the record-type
 * discriminator and the resolved trigger-event date (use
 * `resolveEventDate` from `retention-policy.ts` to walk the candidate
 * date columns).
 *
 * `now` is injectable for testing; defaults to `new Date()`. When
 * computing for a UI list, prefer passing a single `now` value into
 * every call so the rows agree on "today" (avoids the edge case where
 * the clock ticks past midnight mid-render).
 *
 * @param recordType The record-type discriminator.
 * @param triggerDate The resolved trigger event-date (UTC-naive Date).
 * @param now Optional injection point; defaults to `new Date()`.
 */
export function getRetentionStatus(
  recordType: RetentionRecordType,
  triggerDate: Date | null | undefined,
  now: Date = new Date(),
): RetentionStatus {
  const policy = RETENTION_POLICIES[recordType];
  const retainUntil = computeRetentionUntil(recordType, triggerDate);

  // No trigger event yet — the retention clock has not started. We
  // surface this as `pending` so the dashboard distinguishes "record
  // is brand-new and live" from "record is expired and archivable".
  if (!triggerDate || !retainUntil) {
    return {
      triggerDate: null,
      retainUntil: null,
      basis: policy.citation,
      description: policy.description,
      daysRemaining: null,
      status: "pending",
    };
  }

  const daysRemaining = daysBetweenUtc(now, retainUntil);

  let status: RetentionStatusKind;
  if (daysRemaining < 0) {
    status = "expired";
  } else if (daysRemaining <= EXPIRING_SOON_DAYS) {
    // Inclusive at the boundary: a record whose cutoff is exactly
    // today (daysRemaining === 0) is "expiring-soon", not "expired".
    // The next day's run will flip it to "expired".
    status = "expiring-soon";
  } else {
    status = "active";
  }

  return {
    triggerDate,
    retainUntil,
    basis: policy.citation,
    description: policy.description,
    daysRemaining,
    status,
  };
}
