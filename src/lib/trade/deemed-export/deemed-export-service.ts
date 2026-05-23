import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeDeemedExportAuthorization,
  type TradeDeemedExportAuthorizationStatus,
  type TradeDeemedExportAuthorizationType,
} from "@prisma/client";

/**
 * Caelex Trade — Deemed-Export Authorisation service (Z13, Tier 6).
 *
 * A "deemed export" is the release of US-origin technology or source
 * code IN-COUNTRY to a foreign national. Under EAR § 734.13 + § 734.20
 * and ITAR § 120.50, that release is "deemed" to be an export to the
 * foreign national's most-recent country of citizenship and requires
 * the same authorisation a physical export would require.
 *
 * This service is the operator's management surface for the
 * authorisations covering those releases:
 *   - BIS deemed-export licences (EAR § 748.8)
 *   - DDTC TAA / MLA agreements (ITAR § 124)
 *   - Licence exemptions (STA § 740.20, ENC § 740.17, country-of-birth)
 *
 * All reads are org-scoped — the caller passes orgId resolved from the
 * session, and the service refuses to fetch rows outside that org
 * boundary (defence-in-depth against client-supplied IDs).
 *
 * Legal anchors:
 *   - 15 CFR § 734.13 (definition of "export")
 *   - 15 CFR § 734.20 (deemed-export rules)
 *   - 22 CFR § 120.50 (ITAR analogous framework)
 *   - Supplement No. 1 to Part 760 EAR (dual-nationality rules)
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface DeemedExportCreateInput {
  organizationId: string;
  foreignNationalEmployeeId: string;
  foreignNationalName?: string | null;
  foreignNationality: string;
  nativeCountry: string;
  authorizationType: TradeDeemedExportAuthorizationType;
  exemptionBasis?: string | null;
  authorizationReference?: string | null;
  allowedECCNs?: string[];
  allowedUSMLCategories?: string[];
  validFrom: Date;
  validUntil?: Date | null;
  notes?: string | null;
  lastActionById: string;
}

export interface DeemedExportUpdateInput {
  organizationId: string;
  authorizationId: string;
  status?: TradeDeemedExportAuthorizationStatus;
  validUntil?: Date | null;
  notes?: string | null;
  allowedECCNs?: string[];
  allowedUSMLCategories?: string[];
  lastActionById: string;
}

export interface DeemedExportCoverageInput {
  organizationId: string;
  foreignNationalEmployeeId: string;
  /** ECCN code to release (e.g. "9E515.a"). Optional — only one of ECCN / USML need be supplied. */
  eccn?: string | null;
  /** USML category to release (e.g. "XV"). Optional — only one of ECCN / USML need be supplied. */
  usmlCategory?: string | null;
}

export interface DeemedExportCoverageResult {
  /** Whether AT LEAST ONE active authorisation covers the requested release. */
  covered: boolean;
  /** The authorisations that DO cover the release (may be empty). */
  matchedAuthorizations: TradeDeemedExportAuthorization[];
  /** Human-readable reason — useful for the UI banner. */
  reason: string;
}

// ─── Reads ──────────────────────────────────────────────────────────

/**
 * List all authorisations for an org, most-recent-first. Optionally
 * filtered by status (typical UI default: only ACTIVE rows shown).
 */
export async function listDeemedExportAuthorizations(
  organizationId: string,
  options: {
    status?: TradeDeemedExportAuthorizationStatus;
    foreignNationalEmployeeId?: string;
  } = {},
): Promise<TradeDeemedExportAuthorization[]> {
  return prisma.tradeDeemedExportAuthorization.findMany({
    where: {
      organizationId,
      ...(options.status ? { status: options.status } : {}),
      ...(options.foreignNationalEmployeeId
        ? { foreignNationalEmployeeId: options.foreignNationalEmployeeId }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Fetch a single authorisation by id, scoped to the org. Returns null
 * when the id doesn't belong to the org — the caller MUST treat null
 * as 404 to avoid leaking cross-org existence.
 */
export async function getDeemedExportAuthorization(
  organizationId: string,
  authorizationId: string,
): Promise<TradeDeemedExportAuthorization | null> {
  return prisma.tradeDeemedExportAuthorization.findFirst({
    where: { id: authorizationId, organizationId },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

/**
 * Create a new deemed-export authorisation in ACTIVE status.
 * Validates that the EXEMPTION basis is set when type=EXEMPTION,
 * and that nationality / nativeCountry are ISO-3166-1 alpha-2 codes
 * (best-effort format check — full ISO validation deferred to a
 * downstream country-data module).
 */
export async function createDeemedExportAuthorization(
  input: DeemedExportCreateInput,
): Promise<TradeDeemedExportAuthorization> {
  // Type-specific invariants.
  if (input.authorizationType === "EXEMPTION") {
    const basis = input.exemptionBasis?.trim();
    if (!basis) {
      throw new Error(
        "exemptionBasis required when authorizationType=EXEMPTION",
      );
    }
  }

  // Country-code shape check (ISO-3166-1 alpha-2 = exactly 2 letters).
  if (!/^[A-Z]{2}$/.test(input.foreignNationality)) {
    throw new Error(
      "foreignNationality must be an ISO-3166-1 alpha-2 code (e.g. CN, RU, IR)",
    );
  }
  if (!/^[A-Z]{2}$/.test(input.nativeCountry)) {
    throw new Error(
      "nativeCountry must be an ISO-3166-1 alpha-2 code (e.g. CN, RU, IR)",
    );
  }

  // Validity window sanity check.
  if (
    input.validUntil &&
    input.validUntil.getTime() <= input.validFrom.getTime()
  ) {
    throw new Error("validUntil must be strictly after validFrom");
  }

  return prisma.tradeDeemedExportAuthorization.create({
    data: {
      organizationId: input.organizationId,
      foreignNationalEmployeeId: input.foreignNationalEmployeeId,
      foreignNationalName: input.foreignNationalName ?? null,
      foreignNationality: input.foreignNationality,
      nativeCountry: input.nativeCountry,
      authorizationType: input.authorizationType,
      exemptionBasis: input.exemptionBasis ?? null,
      authorizationReference: input.authorizationReference ?? null,
      allowedECCNs: input.allowedECCNs ?? [],
      allowedUSMLCategories: input.allowedUSMLCategories ?? [],
      validFrom: input.validFrom,
      validUntil: input.validUntil ?? null,
      notes: input.notes ?? null,
      lastActionById: input.lastActionById,
    },
  });
}

/**
 * Patch an authorisation — typically used to extend validity, edit
 * the covered-codes scope, or transition to REVOKED. EXPIRED is set
 * by a cron when validUntil passes; operators don't normally set it.
 */
export async function updateDeemedExportAuthorization(
  input: DeemedExportUpdateInput,
): Promise<TradeDeemedExportAuthorization> {
  const current = await prisma.tradeDeemedExportAuthorization.findFirst({
    where: { id: input.authorizationId, organizationId: input.organizationId },
  });
  if (!current) {
    throw new Error("Authorisation not found in this organisation");
  }

  // Block transitions OUT of terminal states except trivially back to
  // ACTIVE (e.g. operator re-instates a row after a paperwork mix-up).
  if (input.status && current.status !== input.status) {
    if (!isValidStatusTransition(current.status, input.status)) {
      throw new Error(
        `Invalid status transition ${current.status} → ${input.status}`,
      );
    }
  }

  const data: Record<string, unknown> = {
    lastActionById: input.lastActionById,
  };
  if (input.status !== undefined) data.status = input.status;
  if (input.validUntil !== undefined) data.validUntil = input.validUntil;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.allowedECCNs !== undefined) data.allowedECCNs = input.allowedECCNs;
  if (input.allowedUSMLCategories !== undefined) {
    data.allowedUSMLCategories = input.allowedUSMLCategories;
  }

  return prisma.tradeDeemedExportAuthorization.update({
    where: { id: input.authorizationId },
    data,
  });
}

/**
 * Status state-machine guardrail. Allowed transitions:
 *   ACTIVE → EXPIRED     (cron-set when validUntil passes)
 *   ACTIVE → REVOKED     (manual operator override)
 *   EXPIRED → ACTIVE     (rare: paperwork-mix-up reinstatement)
 *   REVOKED → ACTIVE     (rare: re-instate after revocation reversal)
 * Disallowed:
 *   EXPIRED → REVOKED    (already terminal — no double terminal)
 *   REVOKED → EXPIRED    (already terminal — no double terminal)
 */
function isValidStatusTransition(
  current: TradeDeemedExportAuthorizationStatus,
  next: TradeDeemedExportAuthorizationStatus,
): boolean {
  if (current === next) return false;
  if (current === "ACTIVE") {
    return next === "EXPIRED" || next === "REVOKED";
  }
  // From terminal back to ACTIVE only.
  return next === "ACTIVE";
}

// ─── Coverage check ─────────────────────────────────────────────────

/**
 * Check whether a deemed-export release of given tech (by ECCN or USML
 * category) to a specific foreign-national employee is authorised by
 * any ACTIVE row.
 *
 * Logic:
 *  1. Pull all ACTIVE rows for (org, employee).
 *  2. Filter to rows that are within validity window today.
 *  3. Match on ECCN (if provided) — accept exact match OR prefix match
 *     (e.g. authorisation listing "9E515" covers a release of "9E515.a"
 *     since the .a sub-paragraph is part of the 9E515 entry).
 *  4. Match on USML category (if provided) — exact match only (USML
 *     categories are not hierarchical in the same way).
 *  5. Return the matched rows + a human-readable reason.
 *
 * IMPORTANT: This function does NOT enforce the deemed-export
 * determination — it only reports whether the operator has logged
 * coverage. Absence of coverage = "operator should investigate", not
 * "release is illegal" (the legal determination requires counsel).
 */
export async function checkDeemedExportCoverage(
  input: DeemedExportCoverageInput,
): Promise<DeemedExportCoverageResult> {
  if (!input.eccn && !input.usmlCategory) {
    throw new Error("At least one of eccn or usmlCategory must be supplied");
  }

  const now = new Date();
  const candidates = await prisma.tradeDeemedExportAuthorization.findMany({
    where: {
      organizationId: input.organizationId,
      foreignNationalEmployeeId: input.foreignNationalEmployeeId,
      status: "ACTIVE",
    },
  });

  const validNow = candidates.filter((row) => {
    if (row.validFrom.getTime() > now.getTime()) return false;
    if (row.validUntil && row.validUntil.getTime() < now.getTime())
      return false;
    return true;
  });

  if (validNow.length === 0) {
    return {
      covered: false,
      matchedAuthorizations: [],
      reason: candidates.length
        ? "No deemed-export authorisations are within their validity window today"
        : "No active deemed-export authorisations on file for this employee",
    };
  }

  const matched: TradeDeemedExportAuthorization[] = [];
  for (const row of validNow) {
    if (input.eccn && matchesEccn(row.allowedECCNs, input.eccn)) {
      matched.push(row);
      continue;
    }
    if (
      input.usmlCategory &&
      row.allowedUSMLCategories.includes(input.usmlCategory.toUpperCase())
    ) {
      matched.push(row);
      continue;
    }
  }

  if (matched.length === 0) {
    const requested = [
      input.eccn ? `ECCN ${input.eccn}` : null,
      input.usmlCategory ? `USML Cat ${input.usmlCategory}` : null,
    ]
      .filter(Boolean)
      .join(" / ");
    return {
      covered: false,
      matchedAuthorizations: [],
      reason: `Authorisations exist for this employee but none cover ${requested}`,
    };
  }

  return {
    covered: true,
    matchedAuthorizations: matched,
    reason: `Covered by ${matched.length} active authorisation${matched.length === 1 ? "" : "s"}`,
  };
}

/**
 * ECCN match logic: accept exact match (e.g. "9E515") OR sub-paragraph
 * match (authorisation "9E515" covers a release of "9E515.a"). The
 * dot prefix check is the canonical EAR-list convention.
 */
function matchesEccn(authorisedCodes: string[], requested: string): boolean {
  const req = requested.toUpperCase();
  return authorisedCodes.some((code) => {
    const c = code.toUpperCase();
    if (c === req) return true;
    if (req.startsWith(c + ".")) return true;
    return false;
  });
}
