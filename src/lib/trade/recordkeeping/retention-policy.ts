/**
 * Caelex Trade — Recordkeeping Retention Policy (Z32, Tier 4).
 *
 * Pure functions for computing the retention cut-off date ("retain
 * until") for export-control records, per the 5-year statutory
 * retention floor.
 *
 * Legal basis:
 *
 *  - **15 CFR § 762.6 (EAR)** — Period of retention. Records required
 *    to be kept by § 762.2 must be retained "for a period of 5 years
 *    from the latest of the following times: (1) The export from the
 *    United States of the item involved in the transaction or the
 *    provision of financing, transporting or other service ... (2) Any
 *    known reexport, transshipment, or diversion of such item; (3) Any
 *    other termination of the transaction, whether formally in writing
 *    or by any other means; or (4) In the case of records of pertaining
 *    to transactions involving restrictive trade practices or boycotts
 *    described in part 760 of this subchapter, the date the regulated
 *    person receives the boycott-related request or requirement."
 *
 *  - **22 CFR § 122.5 (ITAR)** — Maintenance of records by registrants.
 *    A person who is required to register pursuant to § 122.1 of this
 *    subchapter "shall maintain records concerning the manufacture,
 *    acquisition and disposition (to include copies of all documentation
 *    on exports using exemptions and applications and licenses and their
 *    related documentation), of defense articles ... Such records shall
 *    be maintained for a period of five years from the expiration of
 *    the license or other approval."
 *
 *  - **EU Regulation 2021/821, Art. 27(3)** — Records and documents
 *    relating to dual-use items "shall be kept for at least five years
 *    from the end of the calendar year in which the export took place
 *    or the brokering services or technical assistance were provided."
 *    Some Member States require longer (DE: § 22 AWG → 5 years from
 *    end of calendar year, often interpreted as 6 effective years).
 *
 * Caelex models the floor (5 years from the trigger event) as the
 * computed `retainUntil`. Operators who need longer windows can layer
 * a Member-State extension on top — the policy here is the U.S.+EU
 * common minimum.
 *
 * IMPORTANT — This module is PURE. It does NOT persist anything; it
 * does NOT touch the database. `retainUntil` is a COMPUTED value
 * derived at query time from a record's stored event-date columns.
 * The audit-log immutability guarantee comes from the existing hash-
 * chain on `AuditLog`, not from this layer.
 *
 * Z32 Tier 4 — Blueprint 1 § 1 Stage 2.5 + Blueprint 2 § 9.5.
 */

/**
 * The retention window applied uniformly across record types. § 762.6
 * (EAR) and § 122.5 (ITAR) both mandate 5 years from the trigger
 * event; EU Reg 2021/821 Art. 27(3) likewise sets 5 years as the
 * minimum. National implementations (DE § 22 AWG) can extend this,
 * but never shorten it.
 */
export const RETENTION_YEARS = 5;

/**
 * Record types the retention policy applies to. Mirrors the trade
 * domain models that produce export-control evidence. Adding a new
 * type requires updating `computeRetentionUntil` and the
 * `RecordTypeMetadata` table below.
 */
export type RetentionRecordType =
  | "OPERATION"
  | "LICENSE"
  | "EUC"
  | "REEXPORT_CONSENT"
  | "VSD"
  | "CLASSIFICATION_DRAFT"
  | "BAFA_SUBMISSION"
  | "NCA_CORRESPONDENCE";

/**
 * The kind of trigger event that starts the retention clock. Each
 * record type maps to one of these conceptual triggers, even if the
 * underlying column differs (e.g. EUC uses `validatedAt` or
 * `requestedAt` depending on lifecycle stage).
 */
export type RetentionTrigger =
  | "EXPORT_DATE"
  | "LICENSE_EXPIRATION"
  | "ISSUE_DATE"
  | "FILING_DATE"
  | "DECISION_DATE"
  | "ACCEPTANCE_DATE"
  | "RESPONSE_DATE";

/**
 * Static metadata describing each record type's retention semantics.
 * Drives the human-readable `basis` text returned by
 * `getRetentionStatus`, plus citation tracking.
 */
export interface RetentionPolicyDescriptor {
  /** Record-type discriminator. */
  recordType: RetentionRecordType;
  /** Statutory authority (e.g. "15 CFR § 762.6"). */
  citation: string;
  /** Trigger semantics (which date starts the 5-year clock). */
  trigger: RetentionTrigger;
  /** Human-readable description for UI tooltips and audit logs. */
  description: string;
}

/**
 * Per-record-type retention policy lookup. Used by the status helper
 * to surface the legal basis on every record. Insertion order is the
 * stable presentation order (Operations first, then Licenses, etc.).
 */
export const RETENTION_POLICIES: Record<
  RetentionRecordType,
  RetentionPolicyDescriptor
> = {
  OPERATION: {
    recordType: "OPERATION",
    citation: "15 CFR § 762.6 + 22 CFR § 122.5",
    trigger: "EXPORT_DATE",
    description:
      "5 years from the actual export date (or scheduled date if not yet executed).",
  },
  LICENSE: {
    recordType: "LICENSE",
    citation: "22 CFR § 122.5",
    trigger: "LICENSE_EXPIRATION",
    description:
      "5 years from license expiration (validUntil) per ITAR § 122.5.",
  },
  EUC: {
    recordType: "EUC",
    citation: "15 CFR § 762.6",
    trigger: "ISSUE_DATE",
    description:
      "5 years from EUC validation (or request date if still pending).",
  },
  REEXPORT_CONSENT: {
    recordType: "REEXPORT_CONSENT",
    citation: "15 CFR § 762.6 + 15 CFR § 734.16",
    trigger: "ISSUE_DATE",
    description: "5 years from re-export consent decision date.",
  },
  VSD: {
    recordType: "VSD",
    citation: "15 CFR § 764.5 + 22 CFR § 127.12",
    trigger: "FILING_DATE",
    description: "5 years from VSD filing date (submission to authority).",
  },
  CLASSIFICATION_DRAFT: {
    recordType: "CLASSIFICATION_DRAFT",
    citation: "15 CFR § 762.6",
    trigger: "DECISION_DATE",
    description:
      "5 years from classification decision (or draft creation if pending).",
  },
  BAFA_SUBMISSION: {
    recordType: "BAFA_SUBMISSION",
    citation: "§ 22 AWG + EU Reg 2021/821 Art. 27(3)",
    trigger: "ACCEPTANCE_DATE",
    description:
      "5 years from BAFA acceptance date (or filing date if not yet accepted).",
  },
  NCA_CORRESPONDENCE: {
    recordType: "NCA_CORRESPONDENCE",
    citation: "EU Reg 2021/821 Art. 27(3)",
    trigger: "RESPONSE_DATE",
    description: "5 years from latest NCA response date.",
  },
};

/**
 * UTC-midnight semantics: the retention cutoff is anchored to the
 * UTC start-of-day of the trigger event plus N years. This avoids
 * timezone drift when the policy is computed in different locales
 * and is the standard regulators use ("the day of" boundary).
 *
 * Example: trigger = 2026-05-22 14:37:00+02:00 → UTC midnight =
 * 2026-05-22T00:00:00Z → retainUntil = 2031-05-22T00:00:00Z.
 */
function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
}

/**
 * Add N years to a UTC-midnight date, preserving the month/day. Feb-29
 * roll-over: Feb 29 + 5 years lands on Mar 1 (JS Date semantics —
 * setUTCFullYear of Feb 29 to a non-leap-year coerces to Mar 1).
 * This is the operator-friendly behaviour (no risk of accidentally
 * skipping a day on leap-year edges).
 */
function addYearsUtc(date: Date, years: number): Date {
  const result = new Date(date);
  result.setUTCFullYear(result.getUTCFullYear() + years);
  return result;
}

/**
 * Compute the retention cut-off date for a single record. The result
 * is always at UTC midnight (00:00:00.000Z) of the cut-off calendar
 * day. Pass the trigger event-date (export date, license expiration,
 * EUC validation, etc.) — see `RETENTION_POLICIES[recordType].trigger`
 * for which column to source it from.
 *
 * Returns `null` if `eventDate` is null/undefined (record not yet
 * triggered — e.g. an Operation in DRAFT that hasn't shipped). The
 * caller should treat null as "retention clock has not started" rather
 * than "no retention required".
 *
 * @param recordType One of the supported record-type discriminators.
 * @param eventDate The trigger event date (must be a valid Date).
 * @returns The retention cut-off as a UTC-midnight Date, or null.
 */
export function computeRetentionUntil(
  recordType: RetentionRecordType,
  eventDate: Date | null | undefined,
): Date | null {
  if (!eventDate) {
    return null;
  }
  // Guard against Invalid Date inputs that would otherwise silently
  // produce NaN propagation downstream.
  const time = eventDate.getTime();
  if (Number.isNaN(time)) {
    return null;
  }
  // Ensure the policy table actually covers this record type. If a
  // caller passes an unknown discriminator at runtime (e.g. via JSON),
  // we refuse rather than silently apply a default — recordkeeping
  // semantics are too important to be implicit.
  if (!RETENTION_POLICIES[recordType]) {
    return null;
  }
  const utcMidnight = toUtcMidnight(eventDate);
  return addYearsUtc(utcMidnight, RETENTION_YEARS);
}

/**
 * Resolve the "best" trigger event-date for a record by walking a
 * priority list of candidate dates and picking the first non-null
 * one. This encodes the per-record-type semantics:
 *
 *  - Operation: actualShipDate ?? scheduledShipDate ?? createdAt
 *  - License: validUntil ?? issuedAt ?? createdAt
 *  - EUC: validatedAt ?? receivedAt ?? sentAt ?? requestedAt
 *  - Re-Export: decidedAt ?? sentAt ?? requestedAt
 *  - VSD: submittedAt ?? draftedAt ?? discoveredAt
 *  - Classification: reviewedAt ?? createdAt
 *  - BAFA: acceptedAt ?? submittedAt ?? createdAt (callers supply
 *          custom field names)
 *  - NCA: respondedAt ?? sentAt ?? createdAt
 *
 * Caller passes the candidate values in priority order; first defined
 * + non-null + valid Date wins.
 */
export function resolveEventDate(
  candidates: Array<Date | null | undefined>,
): Date | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const time = candidate.getTime();
    if (Number.isNaN(time)) continue;
    return candidate;
  }
  return null;
}
