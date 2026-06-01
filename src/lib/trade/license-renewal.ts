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
  if (validUntil === null || validUntil === undefined) {
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

export interface RenewableLicense {
  id: string;
  licenseType: string;
  licenseNumber: string | null;
  validUntil: string | null;
  totalCapValue: number | null; // euros (API-serialized)
  capCurrency: string;
  conditions: Record<string, unknown>;
  operationIds?: string[];
}

export interface LicenseRenewalDraft {
  licenseType: string;
  licenseNumber: undefined; // new authority no. unknown until issued
  issuedAt: undefined;
  validUntil: undefined; // operator sets the new validity window
  totalCapValue: number | null;
  capCurrency: string;
  conditions: Record<string, unknown>; // prior conditions + { renewalOf }
  status: "DRAFT";
  carriedSummary: string;
  disclaimer: string;
}

const RENEWAL_DISCLAIMER =
  "Creating a renewal in Caelex does NOT file an application with BAFA / BIS / DDTC. " +
  "This produces an internal DRAFT licence record only — you must submit the renewal " +
  "through the competent authority's own channel (BAFA ELAN, BIS SNAP-R, DDTC DECCS, " +
  "etc.) and re-verify every condition (covered codes, covered countries, end-use " +
  "restrictions, value cap) against the new Bescheid/licence before any shipment. " +
  "The authority may impose different conditions; carried-forward conditions are a " +
  "starting point, not a guarantee.";

/**
 * Clone a prior licence into a renewal create-payload. Deterministic
 * field-copy — no LLM, no network. The number/issuedAt/validUntil are
 * intentionally blank: a renewal is a NEW authorisation with new dates.
 * Caller (LicenseRenewalModal) lets the human edit then POSTs to
 * /api/trade/licenses.
 */
export function buildLicenseRenewalDraft(
  prior: RenewableLicense,
): LicenseRenewalDraft {
  // Shallow-clone conditions so we never mutate the caller's object.
  const conditions: Record<string, unknown> = {
    ...prior.conditions,
    renewalOf: prior.id,
  };

  const numberPart = prior.licenseNumber ? ` ${prior.licenseNumber}` : "";
  const capPart =
    prior.totalCapValue !== null && prior.totalCapValue !== undefined
      ? ` · cap ${prior.totalCapValue.toLocaleString("en-GB")} ${prior.capCurrency}`
      : "";
  const carriedSummary =
    `Carried from ${prior.licenseType}${numberPart}: type, conditions` +
    `${capPart}. New licence number, issue date, and validity window must be ` +
    `entered when the renewed authorisation is issued.`;

  return {
    licenseType: prior.licenseType,
    licenseNumber: undefined,
    issuedAt: undefined,
    validUntil: undefined,
    totalCapValue: prior.totalCapValue,
    capCurrency: prior.capCurrency,
    conditions,
    status: "DRAFT",
    carriedSummary,
    disclaimer: RENEWAL_DISCLAIMER,
  };
}
