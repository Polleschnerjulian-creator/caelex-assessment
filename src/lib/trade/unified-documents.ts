/**
 * Caelex Trade — Unified Documents normalizer (UI Phase 3D).
 *
 * PURE module — no React, no DOM, no Prisma, no `server-only`. Every
 * function here is fully unit-testable in node. The server aggregator
 * (`unified-documents.server.ts`) fires the 8 existing `list*` service
 * reads in one Promise.all and maps each typed row through the matching
 * normalizer below into a flat, JSON-serializable `UnifiedTradeDocumentRow`
 * that crosses the RSC → client boundary (ISO date strings only — never a
 * Date or BigInt).
 *
 * The 8 document types stacked under the documents hub:
 *   EUC          — End-Use Certificates           (TradeEUCRequest)
 *   REEXPORT     — Re-Export Consents             (TradeReexportConsent)
 *   VSD          — Voluntary Self-Disclosures     (TradeVoluntaryDisclosure)
 *   SAMMEL       — Sammelgenehmigungen            (TradeSammelgenehmigung)
 *   FRANCE_LOS   — France LOS                      (TradeFranceLosAuthorisation)
 *   UK_ECJU      — UK ECJU licences               (TradeUkEcjuLicense)
 *   FAA_AST      — FAA AST launch licences        (TradeFaaAstLicense)
 *   DEEMED       — Deemed-Export authorisations   (TradeDeemedExportAuthorization)
 *
 * Detail-route note: `reexport-consents` and `vsd` have NO `[id]` detail
 * page in the app router today, so their `href` points back at the list
 * page. The other six deep-link to `/trade/<slug>/<id>`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  type TradeEUCRequest,
  type TradeEUCStatus,
  type TradeReexportConsent,
  type TradeReexportStatus,
  type TradeVoluntaryDisclosure,
  type TradeVSDStatus,
  type TradeSammelgenehmigung,
  type TradeSammelgenehmigungStatus,
  type TradeFranceLosAuthorisation,
  type TradeFranceLosAuthorisationStatus,
  type TradeUkEcjuLicense,
  type TradeUkEcjuLicenseStatus,
  type TradeFaaAstLicense,
  type TradeFaaAstLicenseStatus,
  type TradeDeemedExportAuthorization,
  type TradeDeemedExportAuthorizationStatus,
} from "@prisma/client";

// ─── Public types ───────────────────────────────────────────────────

/** Discriminant for the 8 unified document types. */
export type UnifiedDocType =
  | "EUC"
  | "REEXPORT"
  | "VSD"
  | "SAMMEL"
  | "FRANCE_LOS"
  | "UK_ECJU"
  | "FAA_AST"
  | "DEEMED";

/**
 * Six abstract status tones, decoupled from any single type's enum. The
 * client maps each tone to a fixed Tailwind class pair. Keeping the tone
 * vocabulary small + total means a brand-new status can never render
 * "untoned" (the per-type mappers below are exhaustive switch statements
 * with no default arm, so the compiler flags any new enum member).
 */
export type UnifiedStatusTone =
  | "positive" // terminal-good: validated / approved / active / resolved
  | "progress" // in-flight, moving forward: submitted / under-review / sent
  | "pending" // not-yet-started / drafted / discovered
  | "warning" // attention: received-awaiting-action / acknowledged / exhausted
  | "critical" // bad: revoked / denied / rejected / refused
  | "neutral"; // closed-inert: expired / completed / withdrawn

/**
 * Expiry urgency bucket, derived from `validUntil` relative to "now".
 *   none     — no validUntil on this row (e.g. a VSD, or an unissued licence)
 *   expired  — validUntil already in the past
 *   soon     — within the warning window (default 30 days)
 *   later    — beyond the warning window
 */
export type ExpiryBucket = "none" | "expired" | "soon" | "later";

/** Default expiry warning window, in days. */
export const EXPIRY_SOON_DAYS = 30;

/**
 * Flat, JSON-serializable row crossing the RSC boundary. NO Date / BigInt
 * fields — all dates are ISO-8601 strings (or null).
 */
export interface UnifiedTradeDocumentRow {
  /** Globally-unique within the merged list: `${docType}:${id}`. */
  rowKey: string;
  /** Underlying model row id (org-scoped, opaque cuid). */
  id: string;
  docType: UnifiedDocType;
  /** German type label for the "Typ" column / filter pill. */
  typeLabel: string;
  /** Where a row click navigates. */
  href: string;
  /** Primary readable label (party / mission / applicant / title). */
  title: string;
  /** Secondary line — counterparty / destination / end-user. May be "". */
  subtitle: string;
  /** Authority reference (BAFA/CNES/ECJU/FAA/…). null when unissued. */
  reference: string | null;
  /** Raw enum status value (kept for client-side grouping if needed). */
  status: string;
  /** Humanized status label (English — matches existing per-type panels). */
  statusLabel: string;
  /** Abstract tone for the status badge. */
  statusTone: UnifiedStatusTone;
  /** Validity-end date as ISO string, or null when not applicable. */
  validUntil: string | null;
  /** Derived urgency bucket from validUntil. */
  expiryBucket: ExpiryBucket;
  /** Row creation timestamp, ISO string. */
  createdAt: string;
  /**
   * The canonical date used for default sort (newest activity first):
   * validUntil when present, else the type's natural recency date
   * (createdAt / updatedAt / discoveredAt). ISO string.
   */
  sortDate: string;
}

// ─── German type labels ─────────────────────────────────────────────

export const DOC_TYPE_LABELS: Readonly<Record<UnifiedDocType, string>> = {
  EUC: "End-Use Certificate",
  REEXPORT: "Re-Export Consent",
  VSD: "Selbstanzeige (VSD)",
  SAMMEL: "Sammelgenehmigung",
  FRANCE_LOS: "France LOS",
  UK_ECJU: "UK ECJU",
  FAA_AST: "FAA AST",
  DEEMED: "Deemed Export",
};

// ─── Humanized status labels (per enum) ─────────────────────────────
// English labels intentionally mirror the existing per-type list panels
// so the merged view reads identically to the dedicated pages.

const EUC_STATUS_LABELS: Record<TradeEUCStatus, string> = {
  REQUESTED: "Requested",
  SENT_TO_PARTY: "Sent",
  RECEIVED: "Received",
  VALIDATED: "Validated",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const REEXPORT_STATUS_LABELS: Record<TradeReexportStatus, string> = {
  DRAFTED: "Drafted",
  SENT: "Sent",
  APPROVED: "Approved",
  DENIED: "Denied",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const VSD_STATUS_LABELS: Record<TradeVSDStatus, string> = {
  DISCOVERED: "Discovered",
  INVESTIGATING: "Investigating",
  DRAFTED: "Drafted",
  SUBMITTED: "Submitted",
  ACKNOWLEDGED: "Acknowledged",
  RESOLVED: "Resolved",
  WITHDRAWN: "Withdrawn",
};

const SAMMEL_STATUS_LABELS: Record<TradeSammelgenehmigungStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  EXHAUSTED: "Exhausted",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const FRANCE_LOS_STATUS_LABELS: Record<
  TradeFranceLosAuthorisationStatus,
  string
> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  AUTHORISED: "Authorised",
  REFUSED: "Refused",
  REVOKED: "Revoked",
  COMPLETED: "Completed",
};

const UK_ECJU_STATUS_LABELS: Record<TradeUkEcjuLicenseStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  EXHAUSTED: "Exhausted",
};

const FAA_AST_STATUS_LABELS: Record<TradeFaaAstLicenseStatus, string> = {
  DRAFT: "Draft",
  PRE_APP_CONSULTATION: "Pre-app consultation",
  APPLICATION_SUBMITTED: "Application submitted",
  ENVIRONMENTAL_REVIEW: "Environmental review",
  UNDER_REVIEW: "Under review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

const DEEMED_STATUS_LABELS: Record<
  TradeDeemedExportAuthorizationStatus,
  string
> = {
  ACTIVE: "Active",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
};

// ─── Status-tone mappers (TOTAL — no default arm) ───────────────────
// Each switch is exhaustive over its enum. If a new status is added to
// the schema, TS will error here ("not all code paths return") — that's
// the intended safety net so no status renders untoned.

export function eucTone(status: TradeEUCStatus): UnifiedStatusTone {
  switch (status) {
    case "REQUESTED":
      return "pending";
    case "SENT_TO_PARTY":
      return "progress";
    case "RECEIVED":
      return "warning";
    case "VALIDATED":
      return "positive";
    case "EXPIRED":
      return "neutral";
    case "REVOKED":
      return "critical";
  }
}

export function reexportTone(status: TradeReexportStatus): UnifiedStatusTone {
  switch (status) {
    case "DRAFTED":
      return "pending";
    case "SENT":
      return "progress";
    case "APPROVED":
      return "positive";
    case "DENIED":
      return "critical";
    case "EXPIRED":
      return "neutral";
    case "REVOKED":
      return "critical";
  }
}

export function vsdTone(status: TradeVSDStatus): UnifiedStatusTone {
  switch (status) {
    case "DISCOVERED":
      return "critical";
    case "INVESTIGATING":
      return "warning";
    case "DRAFTED":
      return "pending";
    case "SUBMITTED":
      return "progress";
    case "ACKNOWLEDGED":
      return "warning";
    case "RESOLVED":
      return "positive";
    case "WITHDRAWN":
      return "neutral";
  }
}

export function sammelTone(
  status: TradeSammelgenehmigungStatus,
): UnifiedStatusTone {
  switch (status) {
    case "DRAFT":
      return "pending";
    case "ACTIVE":
      return "positive";
    case "EXHAUSTED":
      return "warning";
    case "EXPIRED":
      return "neutral";
    case "REVOKED":
      return "critical";
  }
}

export function franceLosTone(
  status: TradeFranceLosAuthorisationStatus,
): UnifiedStatusTone {
  switch (status) {
    case "DRAFT":
      return "pending";
    case "SUBMITTED":
      return "progress";
    case "UNDER_REVIEW":
      return "progress";
    case "AUTHORISED":
      return "positive";
    case "REFUSED":
      return "critical";
    case "REVOKED":
      return "critical";
    case "COMPLETED":
      return "neutral";
  }
}

export function ukEcjuTone(
  status: TradeUkEcjuLicenseStatus,
): UnifiedStatusTone {
  switch (status) {
    case "DRAFT":
      return "pending";
    case "SUBMITTED":
      return "progress";
    case "APPROVED":
      return "positive";
    case "REJECTED":
      return "critical";
    case "EXPIRED":
      return "neutral";
    case "REVOKED":
      return "critical";
    case "EXHAUSTED":
      return "warning";
  }
}

export function faaAstTone(
  status: TradeFaaAstLicenseStatus,
): UnifiedStatusTone {
  switch (status) {
    case "DRAFT":
      return "pending";
    case "PRE_APP_CONSULTATION":
      return "progress";
    case "APPLICATION_SUBMITTED":
      return "progress";
    case "ENVIRONMENTAL_REVIEW":
      return "progress";
    case "UNDER_REVIEW":
      return "progress";
    case "APPROVED":
      return "positive";
    case "REJECTED":
      return "critical";
    case "EXPIRED":
      return "neutral";
    case "REVOKED":
      return "critical";
  }
}

export function deemedTone(
  status: TradeDeemedExportAuthorizationStatus,
): UnifiedStatusTone {
  switch (status) {
    case "ACTIVE":
      return "positive";
    case "EXPIRED":
      return "neutral";
    case "REVOKED":
      return "critical";
  }
}

// ─── Expiry bucketing ───────────────────────────────────────────────

/**
 * Classify a validity-end date into an urgency bucket relative to `now`.
 * Pure + deterministic — `now` and `soonDays` are injected so tests never
 * depend on the wall clock.
 *
 *   null validUntil        → "none"
 *   validUntil < now        → "expired"
 *   now ≤ validUntil ≤ now+W → "soon"   (W = soonDays, default 30)
 *   validUntil > now+W      → "later"
 */
export function expiryBucket(
  validUntil: Date | string | null | undefined,
  now: Date,
  soonDays: number = EXPIRY_SOON_DAYS,
): ExpiryBucket {
  if (validUntil === null || validUntil === undefined) return "none";
  const end = validUntil instanceof Date ? validUntil : new Date(validUntil);
  if (Number.isNaN(end.getTime())) return "none";
  const ms = end.getTime() - now.getTime();
  if (ms < 0) return "expired";
  const windowMs = soonDays * 24 * 60 * 60 * 1000;
  if (ms <= windowMs) return "soon";
  return "later";
}

// ─── Small internal helpers ─────────────────────────────────────────

/** Date | null → ISO string | null (defensive against invalid dates). */
function iso(d: Date | string | null | undefined): string | null {
  if (d === null || d === undefined) return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Non-null ISO string, for fields that always exist (createdAt, …). */
function isoRequired(d: Date | string): string {
  return iso(d) ?? new Date(0).toISOString();
}

// ─── Per-type normalizers ───────────────────────────────────────────
// Each takes the eager-loaded service row shape and returns a flat row.
// Kept as discrete exported functions so each is independently testable.

export function normalizeEuc(
  row: TradeEUCRequest & {
    party: { canonicalName: string; countryCode: string };
  },
): UnifiedTradeDocumentRow {
  const validUntil = iso(row.validUntil);
  return {
    rowKey: `EUC:${row.id}`,
    id: row.id,
    docType: "EUC",
    typeLabel: DOC_TYPE_LABELS.EUC,
    href: `/trade/euc/${row.id}`,
    title: row.party.canonicalName,
    subtitle: row.party.countryCode,
    reference: null,
    status: row.status,
    statusLabel: EUC_STATUS_LABELS[row.status],
    statusTone: eucTone(row.status),
    validUntil,
    expiryBucket: "none", // set by caller via withExpiry; default safe
    createdAt: isoRequired(row.createdAt),
    sortDate: validUntil ?? isoRequired(row.createdAt),
  };
}

export function normalizeReexport(
  row: TradeReexportConsent & {
    requestingParty: { canonicalName: string; countryCode: string };
  },
): UnifiedTradeDocumentRow {
  const validUntil = iso(row.validUntil);
  return {
    rowKey: `REEXPORT:${row.id}`,
    id: row.id,
    docType: "REEXPORT",
    typeLabel: DOC_TYPE_LABELS.REEXPORT,
    // No [id] detail route — link back to the list page.
    href: `/trade/reexport-consents`,
    title: row.requestingParty.canonicalName,
    subtitle: `→ ${row.newDestinationCountry}`,
    reference: row.originalLicenseNumber ?? null,
    status: row.status,
    statusLabel: REEXPORT_STATUS_LABELS[row.status],
    statusTone: reexportTone(row.status),
    validUntil,
    expiryBucket: "none",
    createdAt: isoRequired(row.createdAt),
    sortDate: validUntil ?? isoRequired(row.createdAt),
  };
}

export function normalizeVsd(
  row: TradeVoluntaryDisclosure,
): UnifiedTradeDocumentRow {
  // VSDs have no validity window — recency is the discovery date.
  const discovered = isoRequired(row.discoveredAt);
  return {
    rowKey: `VSD:${row.id}`,
    id: row.id,
    docType: "VSD",
    typeLabel: DOC_TYPE_LABELS.VSD,
    // No [id] detail route — link back to the list page.
    href: `/trade/vsd`,
    title: row.title,
    subtitle: row.authority,
    reference: row.filingReference ?? null,
    status: row.status,
    statusLabel: VSD_STATUS_LABELS[row.status],
    statusTone: vsdTone(row.status),
    validUntil: null,
    expiryBucket: "none",
    createdAt: isoRequired(row.createdAt),
    sortDate: discovered,
  };
}

export function normalizeSammel(
  row: TradeSammelgenehmigung,
): UnifiedTradeDocumentRow {
  const validUntil = iso(row.validUntil);
  return {
    rowKey: `SAMMEL:${row.id}`,
    id: row.id,
    docType: "SAMMEL",
    typeLabel: DOC_TYPE_LABELS.SAMMEL,
    href: `/trade/sammelgenehmigungen/${row.id}`,
    title: row.title,
    subtitle: "",
    reference: row.bafaReference ?? null,
    status: row.status,
    statusLabel: SAMMEL_STATUS_LABELS[row.status],
    statusTone: sammelTone(row.status),
    validUntil,
    expiryBucket: "none",
    createdAt: isoRequired(row.createdAt),
    // validUntil is required on this model, so it's always the sort date.
    sortDate: validUntil ?? isoRequired(row.createdAt),
  };
}

export function normalizeFranceLos(
  row: TradeFranceLosAuthorisation,
): UnifiedTradeDocumentRow {
  const validUntil = iso(row.validUntil);
  return {
    rowKey: `FRANCE_LOS:${row.id}`,
    id: row.id,
    docType: "FRANCE_LOS",
    typeLabel: DOC_TYPE_LABELS.FRANCE_LOS,
    href: `/trade/france-los/${row.id}`,
    title: row.missionName,
    subtitle: row.operatorName,
    reference: row.cnesReference ?? null,
    status: row.status,
    statusLabel: FRANCE_LOS_STATUS_LABELS[row.status],
    statusTone: franceLosTone(row.status),
    validUntil,
    expiryBucket: "none",
    createdAt: isoRequired(row.createdAt),
    sortDate: validUntil ?? isoRequired(row.createdAt),
  };
}

export function normalizeUkEcju(
  row: TradeUkEcjuLicense,
): UnifiedTradeDocumentRow {
  const validUntil = iso(row.validUntil);
  return {
    rowKey: `UK_ECJU:${row.id}`,
    id: row.id,
    docType: "UK_ECJU",
    typeLabel: DOC_TYPE_LABELS.UK_ECJU,
    href: `/trade/uk-ecju/${row.id}`,
    title: row.applicantName,
    subtitle: row.licenseType,
    reference: row.ecjuReference ?? null,
    status: row.status,
    statusLabel: UK_ECJU_STATUS_LABELS[row.status],
    statusTone: ukEcjuTone(row.status),
    validUntil,
    expiryBucket: "none",
    createdAt: isoRequired(row.createdAt),
    // List ordered by updatedAt — use it as recency fallback.
    sortDate: validUntil ?? isoRequired(row.updatedAt),
  };
}

export function normalizeFaaAst(
  row: TradeFaaAstLicense,
): UnifiedTradeDocumentRow {
  const validUntil = iso(row.validUntil);
  return {
    rowKey: `FAA_AST:${row.id}`,
    id: row.id,
    docType: "FAA_AST",
    typeLabel: DOC_TYPE_LABELS.FAA_AST,
    href: `/trade/faa-ast/${row.id}`,
    title: row.vehicleName,
    subtitle: row.operatorName,
    reference: row.faaReference ?? null,
    status: row.status,
    statusLabel: FAA_AST_STATUS_LABELS[row.status],
    statusTone: faaAstTone(row.status),
    validUntil,
    expiryBucket: "none",
    createdAt: isoRequired(row.createdAt),
    sortDate: validUntil ?? isoRequired(row.updatedAt),
  };
}

export function normalizeDeemed(
  row: TradeDeemedExportAuthorization,
): UnifiedTradeDocumentRow {
  const validUntil = iso(row.validUntil);
  return {
    rowKey: `DEEMED:${row.id}`,
    id: row.id,
    docType: "DEEMED",
    typeLabel: DOC_TYPE_LABELS.DEEMED,
    href: `/trade/deemed-exports/${row.id}`,
    title: row.foreignNationalName ?? row.foreignNationalEmployeeId,
    subtitle: row.foreignNationality,
    reference: row.authorizationReference ?? null,
    status: row.status,
    statusLabel: DEEMED_STATUS_LABELS[row.status],
    statusTone: deemedTone(row.status),
    validUntil,
    expiryBucket: "none",
    createdAt: isoRequired(row.createdAt),
    sortDate: validUntil ?? isoRequired(row.createdAt),
  };
}

// ─── Post-processing ────────────────────────────────────────────────

/**
 * Stamp the derived `expiryBucket` on a batch of already-normalized rows
 * using a single injected `now`. Returns a NEW array of NEW row objects —
 * never mutates the input. Splitting this from the per-type normalizers
 * keeps those clock-free (and therefore trivially testable).
 */
export function withExpiryBuckets(
  rows: UnifiedTradeDocumentRow[],
  now: Date,
  soonDays: number = EXPIRY_SOON_DAYS,
): UnifiedTradeDocumentRow[] {
  return rows.map((r) => ({
    ...r,
    expiryBucket: expiryBucket(r.validUntil, now, soonDays),
  }));
}

/**
 * Default merged ordering: newest `sortDate` first (descending ISO sort).
 * Stable for equal dates (preserves the per-service order). Returns a new
 * array.
 */
export function sortUnifiedByRecency(
  rows: UnifiedTradeDocumentRow[],
): UnifiedTradeDocumentRow[] {
  return [...rows].sort((a, b) => b.sortDate.localeCompare(a.sortDate));
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
