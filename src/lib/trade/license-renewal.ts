/**
 * Caelex Trade — licence renewal & expiry derivation (Phase 3B).
 *
 * PURE module: no React, no DB, no I/O, no Anthropic. Two concerns:
 *   (A) deriveExpiryState  — list-UI expiry/urgency, aligned with the
 *       trade-license-expiry cron's 90/30/7 buckets so the list and the
 *       daily reminder never disagree.
 *   (B) buildLicenseRenewalDraft — clone a prior licence into a new-licence
 *       create payload ("auto-prepare, human confirms"). Caller POSTs it to
 *       the existing /api/trade/licenses.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Bucket upper bounds (inclusive), tightest first — MUST match
// license-reminder-service.ts (90 info / 30 warning / 7 critical).
const INFO_MAX = 90;
const WARN_MAX = 30;
const CRIT_MAX = 7;

export type ExpiryUrgency = "ok" | "info" | "warning" | "critical" | "expired";

export interface LicenseExpiryState {
  /** Whole days until validUntil (negative = past). null when no validUntil. */
  daysRemaining: number | null;
  urgency: ExpiryUrgency;
  /** Operator should act: urgency ∈ {warning, critical, expired}. */
  isRenewalDue: boolean;
  /** Short UI label: "7d left" / "Expired 3d ago" / "—". */
  label: string;
  /** Sort key, smaller = more urgent. Expired first; no-date last. */
  sortValue: number;
}

/**
 * Derive expiry/urgency from a validUntil. `now` is injectable for tests;
 * defaults to new Date(). All arithmetic is ms-since-epoch (TZ-agnostic).
 */
export function deriveExpiryState(
  validUntil: string | Date | null,
  now: Date = new Date(),
): LicenseExpiryState {
  if (validUntil == null) {
    return {
      daysRemaining: null,
      urgency: "ok",
      isRenewalDue: false,
      label: "—",
      sortValue: Number.MAX_SAFE_INTEGER,
    };
  }
  const until = validUntil instanceof Date ? validUntil : new Date(validUntil);
  const days = Math.floor((until.getTime() - now.getTime()) / MS_PER_DAY);

  let urgency: ExpiryUrgency;
  if (days < 0) urgency = "expired";
  else if (days <= CRIT_MAX) urgency = "critical";
  else if (days <= WARN_MAX) urgency = "warning";
  else if (days <= INFO_MAX) urgency = "info";
  else urgency = "ok";

  const isRenewalDue =
    urgency === "warning" || urgency === "critical" || urgency === "expired";

  const label = days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d left`;

  // Expired sorts first (negative). Future sorts by days ascending.
  // No-date already returned MAX_SAFE_INTEGER above.
  const sortValue = days;

  return { daysRemaining: days, urgency, isRenewalDue, label, sortValue };
}
