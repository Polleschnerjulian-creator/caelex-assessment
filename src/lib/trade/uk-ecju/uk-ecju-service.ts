import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeUkEcjuLicense,
  type TradeUkEcjuLicenseStatus,
  type TradeUkEcjuLicenseType,
} from "@prisma/client";

/**
 * Caelex Trade — UK ECJU Export Licence service (Z37-UK, Tier 4).
 *
 * Thin Prisma wrapper for the TradeUkEcjuLicense model. Mirrors the
 * org-scoping rules established by euc-service and reexport-service:
 * all reads gated by orgId, cross-org party / operation refs actively
 * refused.
 *
 * Currency unit: GBP pence (integer BigInt) — multiplying user-entered
 * GBP by 100 keeps running totals exact. Service callers pass
 * **pence** to recordDrawDown; the UI layer is responsible for the
 * pounds↔pence conversion.
 *
 * Lifecycle state machine:
 *   DRAFT → SUBMITTED → APPROVED → (EXPIRED | REVOKED | EXHAUSTED)
 *   DRAFT → SUBMITTED → REJECTED  (terminal — appeal track separate)
 *
 * License-type defaults (max validity period from Export Control Act):
 *   SIEL    → 2 years   (single use, must be redrafted per shipment)
 *   OIEL    → 3 years   (broader scope, multi-shipment)
 *   OGEL    → indefinite (registration-only, no validUntil enforced)
 *   SIEL_TC → 1 year    (temporary; return-to-UK clause)
 *   OITCL   → 2 years   (trade controls / brokering)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

export type UkEcjuLicenseWithCreator = TradeUkEcjuLicense & {
  createdBy: { id: string; name: string | null; email: string | null } | null;
};

export interface UkEcjuLicenseCreateInput {
  organizationId: string;
  applicantName: string;
  applicantAddress: string;
  licenseType: TradeUkEcjuLicenseType;
  ecjuReference?: string | null;
  controlListEntries?: string[];
  destinationCountries?: string[];
  endUserName?: string | null;
  endUserAddress?: string | null;
  endUseDescription?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  capValueGbp?: bigint | null;
  notes?: string | null;
  createdById?: string | null;
}

export interface UkEcjuStatusTransitionInput {
  organizationId: string;
  licenseId: string;
  nextStatus: TradeUkEcjuLicenseStatus;
  /** Required when transitioning to APPROVED — ECJU returns this. */
  ecjuReference?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  notes?: string | null;
}

export interface UkEcjuFindCoveringQuery {
  /** Item control-list code (UK or EU form — both checked). */
  controlListEntry: string;
  /** ISO-3166-1 alpha-2 destination country code. */
  destination: string;
  /** End-user name (case-insensitive contains match). */
  endUser?: string | null;
  /** Optional shipment value in pence for cap-vs-balance check. */
  valueGbp?: bigint | null;
}

// ─── Reads ──────────────────────────────────────────────────────────

/**
 * List UK ECJU licences for an org, ordered most-recently-updated
 * first so operators see active lifecycle changes at the top.
 */
export async function listUkEcjuLicenses(
  organizationId: string,
  options: {
    status?: TradeUkEcjuLicenseStatus;
    licenseType?: TradeUkEcjuLicenseType;
  } = {},
): Promise<UkEcjuLicenseWithCreator[]> {
  return prisma.tradeUkEcjuLicense.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.licenseType ? { licenseType: options.licenseType } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Fetch one UK ECJU licence by id, scoped to the org. Returns null on
 * cross-org id (caller MUST treat as 404 to avoid leaking existence).
 */
export async function getUkEcjuLicense(
  organizationId: string,
  licenseId: string,
): Promise<UkEcjuLicenseWithCreator | null> {
  return prisma.tradeUkEcjuLicense.findFirst({
    where: { id: licenseId, organizationId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

/**
 * Create a new UK ECJU licence row in DRAFT status. Applies licence-
 * type-specific validity defaults when validUntil is omitted:
 *
 *   - SIEL    → 2 years from now
 *   - OIEL    → 3 years from now
 *   - SIEL_TC → 1 year from now
 *   - OITCL   → 2 years from now
 *   - OGEL    → no validUntil set (indefinite)
 */
export async function createUkEcjuLicense(
  input: UkEcjuLicenseCreateInput,
): Promise<TradeUkEcjuLicense> {
  if (!input.applicantName.trim()) {
    throw new Error("Applicant name is required");
  }
  if (!input.applicantAddress.trim()) {
    throw new Error("Applicant address is required");
  }

  // SIEL/SIEL_TC/OITCL are end-user-specific — refuse creation without
  // an end-user name. OIEL/OGEL are multi-end-user.
  const requiresEndUser =
    input.licenseType === "SIEL" ||
    input.licenseType === "SIEL_TC" ||
    input.licenseType === "OITCL";
  if (requiresEndUser && !input.endUserName?.trim()) {
    throw new Error(
      `${input.licenseType} requires an end-user name (single-consignee licence type)`,
    );
  }

  // SIEL_TC's "return-to-UK" semantics implies a max 12-month validity.
  const validUntil =
    input.validUntil ?? defaultValidUntilFor(input.licenseType);

  return prisma.tradeUkEcjuLicense.create({
    data: {
      organizationId: input.organizationId,
      applicantName: input.applicantName,
      applicantAddress: input.applicantAddress,
      licenseType: input.licenseType,
      ecjuReference: input.ecjuReference ?? null,
      controlListEntries: input.controlListEntries ?? [],
      destinationCountries: (input.destinationCountries ?? []).map((c) =>
        c.toUpperCase(),
      ),
      endUserName: input.endUserName ?? null,
      endUserAddress: input.endUserAddress ?? null,
      endUseDescription: input.endUseDescription ?? null,
      validFrom: input.validFrom ?? null,
      validUntil,
      capValueGbp: input.capValueGbp ?? null,
      notes: input.notes ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

/**
 * Transition a licence to the next status. Enforces the lifecycle
 * graph + ECJU-reference requirement on APPROVED.
 */
export async function transitionUkEcjuStatus(
  input: UkEcjuStatusTransitionInput,
): Promise<TradeUkEcjuLicense> {
  const current = await prisma.tradeUkEcjuLicense.findFirst({
    where: { id: input.licenseId, organizationId: input.organizationId },
  });
  if (!current) {
    throw new Error("UK ECJU licence not found in this organisation");
  }

  if (!isValidUkEcjuTransition(current.status, input.nextStatus)) {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → ${input.nextStatus}`,
    );
  }

  // APPROVED requires the ECJU reference number (the GBSIEL/.../NNNNNNN
  // identifier ECJU returns on the decision letter). Either provided
  // now, or already on the row.
  if (input.nextStatus === "APPROVED") {
    const ref = input.ecjuReference ?? current.ecjuReference;
    if (!ref || !ref.trim()) {
      throw new Error(
        "APPROVED transition requires an ECJU reference (GBSIEL/... format)",
      );
    }
  }

  const data: Record<string, unknown> = {
    status: input.nextStatus,
  };

  if (input.ecjuReference !== undefined) {
    data.ecjuReference = input.ecjuReference;
  }
  if (input.validFrom !== undefined) data.validFrom = input.validFrom;
  if (input.validUntil !== undefined) data.validUntil = input.validUntil;
  if (input.notes !== undefined) data.notes = input.notes;

  return prisma.tradeUkEcjuLicense.update({
    where: { id: input.licenseId },
    data,
  });
}

/**
 * Record a draw-down against an OIEL/SIEL when an operation ships. The
 * value parameter is in **pence** (integer BigInt). When the running
 * total reaches or exceeds capValueGbp, status flips to EXHAUSTED.
 *
 * `operationId` is recorded only in the notes field at MVP; a future
 * Z37-UK-2 sprint will add a proper TradeUkEcjuDrawDown child table
 * for per-operation reconciliation (mirrors Sammelgenehmigung pattern).
 */
export async function recordDrawDown(
  organizationId: string,
  licenseId: string,
  operationId: string,
  valuePence: bigint,
): Promise<TradeUkEcjuLicense> {
  if (valuePence < BigInt(0)) {
    throw new Error("Draw-down value must be non-negative");
  }

  const current = await prisma.tradeUkEcjuLicense.findFirst({
    where: { id: licenseId, organizationId },
  });
  if (!current) {
    throw new Error("UK ECJU licence not found in this organisation");
  }

  // Only APPROVED licences can be drawn down against — refuse DRAFT
  // (not yet issued), REJECTED (ECJU denied), EXPIRED (validity passed)
  // and REVOKED (operator-cancelled).
  if (current.status !== "APPROVED") {
    throw new Error(
      `Cannot draw down against ${current.status} licence — must be APPROVED`,
    );
  }

  const newTotal = current.drawnDownValueGbp + valuePence;
  const willExhaust =
    current.capValueGbp !== null && newTotal >= current.capValueGbp;

  const noteSuffix = `[${new Date().toISOString().slice(0, 10)}] Drew down ${valuePence}p for operation ${operationId} (new total: ${newTotal}p)`;
  const mergedNotes = current.notes
    ? `${current.notes}\n${noteSuffix}`
    : noteSuffix;

  return prisma.tradeUkEcjuLicense.update({
    where: { id: licenseId },
    data: {
      drawnDownValueGbp: newTotal,
      status: willExhaust ? "EXHAUSTED" : current.status,
      notes: mergedNotes,
    },
  });
}

/**
 * Find APPROVED licences that could cover a candidate shipment. Used
 * by the trade operations engine to surface "you have a licence that
 * covers this" suggestions before falling back to "needs new licence".
 *
 * Matching rules (AND across all):
 *   - status === "APPROVED"
 *   - controlListEntries array contains the requested ECCN
 *     (case-insensitive prefix match)
 *   - destinationCountries array contains the destination (ISO-2)
 *   - endUser (if provided) matches license.endUserName for SIEL-class
 *     licenses (multi-EU types like OIEL/OGEL skip this check)
 *   - if valueGbp + capValueGbp set: remaining headroom must cover it
 *
 * Returns licenses ordered by validUntil ascending so the soonest-to-
 * expire (use-it-or-lose-it) candidates surface first.
 */
export async function findCoveringLicenses(
  organizationId: string,
  query: UkEcjuFindCoveringQuery,
): Promise<TradeUkEcjuLicense[]> {
  const destination = query.destination.toUpperCase();
  const eccn = query.controlListEntry.trim();
  const eccnNormalized = eccn.toUpperCase().replace(/[.\s].*$/, "");

  const candidates = await prisma.tradeUkEcjuLicense.findMany({
    where: {
      organizationId,
      status: "APPROVED",
      destinationCountries: { has: destination },
    },
    orderBy: { validUntil: "asc" },
  });

  return candidates.filter((lic) => {
    // Match control-list entry. We accept exact OR prefix match (so a
    // licence covering "PL5002A" matches the request "pl5002a.1").
    const entries = lic.controlListEntries.map((e) => e.toUpperCase());
    const hasEntry = entries.some(
      (e) =>
        e === eccn.toUpperCase() ||
        e === eccnNormalized ||
        eccnNormalized.startsWith(e.replace(/[.\s].*$/, "")),
    );
    // OGEL inherits its scope from the category page — if the licence
    // is OGEL and the destination already matched, we trust the
    // operator (entries may be empty by design).
    const isOgelWithImpliedEntry =
      lic.licenseType === "OGEL" && lic.controlListEntries.length === 0;
    if (!hasEntry && !isOgelWithImpliedEntry) return false;

    // End-user check for SIEL-class licences.
    const isEndUserSpecific =
      lic.licenseType === "SIEL" ||
      lic.licenseType === "SIEL_TC" ||
      lic.licenseType === "OITCL";
    if (isEndUserSpecific && query.endUser && lic.endUserName) {
      if (
        !lic.endUserName.toLowerCase().includes(query.endUser.toLowerCase())
      ) {
        return false;
      }
    }

    // Value-cap check.
    if (query.valueGbp !== null && query.valueGbp !== undefined) {
      if (lic.capValueGbp !== null) {
        const remaining = lic.capValueGbp - lic.drawnDownValueGbp;
        if (remaining < query.valueGbp) return false;
      }
    }

    return true;
  });
}

/**
 * List APPROVED licences expiring within the given window. Used by
 * the daily cron + the dashboard "expiring soon" widget.
 */
export async function listExpiring(
  organizationId: string,
  days: number,
): Promise<TradeUkEcjuLicense[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return prisma.tradeUkEcjuLicense.findMany({
    where: {
      organizationId,
      status: "APPROVED",
      validUntil: { gte: now, lte: cutoff },
    },
    orderBy: { validUntil: "asc" },
  });
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Compute the licence-type-specific default validUntil. Used by
 * createUkEcjuLicense when no explicit validUntil is provided.
 *
 *   SIEL    → 2 years (Export Control Act default ceiling)
 *   OIEL    → 3 years
 *   SIEL_TC → 1 year (return-to-UK clause)
 *   OITCL   → 2 years
 *   OGEL    → null (indefinite — operator registers, never expires)
 */
export function defaultValidUntilFor(
  licenseType: TradeUkEcjuLicenseType,
  from: Date = new Date(),
): Date | null {
  const out = new Date(from);
  switch (licenseType) {
    case "SIEL":
    case "OITCL":
      out.setFullYear(out.getFullYear() + 2);
      return out;
    case "OIEL":
      out.setFullYear(out.getFullYear() + 3);
      return out;
    case "SIEL_TC":
      out.setFullYear(out.getFullYear() + 1);
      return out;
    case "OGEL":
      return null;
    default:
      return null;
  }
}

/**
 * Allowed lifecycle transitions:
 *   DRAFT      → SUBMITTED, REVOKED
 *   SUBMITTED  → APPROVED, REJECTED, REVOKED
 *   APPROVED   → EXPIRED, REVOKED, EXHAUSTED
 *   REJECTED   → (terminal; appeal track is separate)
 *   EXPIRED    → (terminal)
 *   REVOKED    → (terminal)
 *   EXHAUSTED  → EXPIRED (cron may still flip on validUntil pass)
 */
export function isValidUkEcjuTransition(
  current: TradeUkEcjuLicenseStatus,
  next: TradeUkEcjuLicenseStatus,
): boolean {
  if (current === next) return false;
  const allowed: Record<TradeUkEcjuLicenseStatus, TradeUkEcjuLicenseStatus[]> =
    {
      DRAFT: ["SUBMITTED", "REVOKED"],
      SUBMITTED: ["APPROVED", "REJECTED", "REVOKED"],
      APPROVED: ["EXPIRED", "REVOKED", "EXHAUSTED"],
      REJECTED: [],
      EXPIRED: [],
      REVOKED: [],
      EXHAUSTED: ["EXPIRED"],
    };
  return allowed[current].includes(next);
}
