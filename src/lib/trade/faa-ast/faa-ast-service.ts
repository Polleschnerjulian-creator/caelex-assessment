import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type TradeFaaAstLicense,
  type TradeFaaAstLicenseStatus,
  type TradeFaaAstLicenseType,
  type TradeFaaAstVehicleType,
  type TradeFaaAstFinancialResponsibilityType,
} from "@prisma/client";

/**
 * Caelex Trade — FAA AST commercial launch licensing service
 * (Z38-US, Tier 4).
 *
 * Thin Prisma wrapper for the TradeFaaAstLicense model. Mirrors the
 * org-scoping rules established by uk-ecju-service and
 * france-los-service: all reads gated by orgId; the service never
 * returns rows from a foreign org.
 *
 * Lifecycle state machine (forward path):
 *   DRAFT
 *     → PRE_APP_CONSULTATION   (§ 450.31 mandatory 45-day sit-down)
 *     → APPLICATION_SUBMITTED  (formal Part 450 application)
 *     → ENVIRONMENTAL_REVIEW   (NEPA CATEX / EA — § 450.41(c))
 *     → UNDER_REVIEW           (FAA AST technical review, 180-day clock)
 *     → APPROVED               (licence issued, validUntil set)
 *     → (EXPIRED | REVOKED)    (terminal)
 *
 * Terminal-side paths:
 *   APPLICATION_SUBMITTED | UNDER_REVIEW → REJECTED
 *
 * Ec compliance (§ 450.101(a)(1)):
 *   Maximum Probability of Casualty from a single mission MUST be
 *   ≤ 1.0e-4. The `calculateEcCompliance()` helper is a pure function
 *   — UI/server actions call it without touching the DB.
 *
 * Currency:
 *   thirdPartyLiabilityCapUsdCents is integer USD cents (BigInt).
 *   Service callers pass **cents**; UI layer handles dollars↔cents.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

export type FaaAstLicenseWithCreator = TradeFaaAstLicense & {
  createdBy: { id: string; name: string | null; email: string | null } | null;
};

export interface FaaAstLicenseCreateInput {
  organizationId: string;
  operatorName: string;
  operatorAddress: string;
  licenseType: TradeFaaAstLicenseType;
  faaReference?: string | null;
  launchSite: string;
  vehicleName: string;
  vehicleType: TradeFaaAstVehicleType;
  maximumProbabilityOfCasualtyEc?: number | null;
  thirdPartyLiabilityCapUsdCents?: bigint | null;
  financialResponsibilityType?: TradeFaaAstFinancialResponsibilityType | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  notes?: string | null;
  createdById?: string | null;
}

export interface FaaAstStatusTransitionInput {
  organizationId: string;
  licenseId: string;
  nextStatus: TradeFaaAstLicenseStatus;
  /** Required when transitioning to APPROVED — FAA stamps this on. */
  faaReference?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  notes?: string | null;
}

/** Result of the § 450.101(a)(1) Ec casualty-probability check. */
export interface EcComplianceResult {
  compliant: boolean;
  ec: number;
  threshold: number;
  marginRatio: number; // ec / threshold (< 1 = below ceiling)
  reason: string;
}

/**
 * 14 CFR § 450.101(a)(1) Maximum Probability of Casualty ceiling. The
 * Federal Aviation Administration applies this to every commercial
 * launch + re-entry mission.
 */
export const EC_THRESHOLD_PER_MISSION = 1.0e-4;

// ─── Reads ──────────────────────────────────────────────────────────

/**
 * List FAA AST licences for an org, ordered most-recently-updated
 * first so operators see active lifecycle changes at the top.
 */
export async function listFaaAstLicenses(
  organizationId: string,
  options: {
    status?: TradeFaaAstLicenseStatus;
    licenseType?: TradeFaaAstLicenseType;
  } = {},
): Promise<FaaAstLicenseWithCreator[]> {
  return prisma.tradeFaaAstLicense.findMany({
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
 * Fetch one FAA AST licence by id, scoped to the org. Returns null
 * on cross-org id (caller MUST treat as 404 to avoid leaking
 * existence of the row).
 */
export async function getFaaAstLicense(
  organizationId: string,
  licenseId: string,
): Promise<FaaAstLicenseWithCreator | null> {
  return prisma.tradeFaaAstLicense.findFirst({
    where: { id: licenseId, organizationId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
}

// ─── Writes ─────────────────────────────────────────────────────────

/**
 * Create a new FAA AST licence row in DRAFT status. Applies licence-
 * type-specific validity defaults when validUntil is omitted:
 *
 *   - PART_450_LAUNCH            → 5 years (Part 450 § 450.39 cap)
 *   - PART_450_REENTRY           → 5 years
 *   - PART_450_VEHICLE_OPERATOR  → 5 years
 *   - PART_435_REENTRY_REUSABLE  → 2 years (legacy regime ceiling)
 *
 * Validates that Ec (if provided) is non-negative and finite. Does
 * NOT enforce the § 450.101 threshold at DRAFT creation — operators
 * may legitimately stash a non-compliant Ec while iterating on
 * flight-safety analysis. The threshold is enforced at the
 * DRAFT → PRE_APP_CONSULTATION transition.
 */
export async function createFaaAstLicense(
  input: FaaAstLicenseCreateInput,
): Promise<TradeFaaAstLicense> {
  if (!input.operatorName.trim()) {
    throw new Error("Operator name is required");
  }
  if (!input.operatorAddress.trim()) {
    throw new Error("Operator address is required");
  }
  if (!input.launchSite.trim()) {
    throw new Error("Launch site is required");
  }
  if (!input.vehicleName.trim()) {
    throw new Error("Vehicle name is required");
  }

  if (
    input.maximumProbabilityOfCasualtyEc !== null &&
    input.maximumProbabilityOfCasualtyEc !== undefined
  ) {
    if (!Number.isFinite(input.maximumProbabilityOfCasualtyEc)) {
      throw new Error("Ec must be a finite number");
    }
    if (input.maximumProbabilityOfCasualtyEc < 0) {
      throw new Error("Ec must be non-negative");
    }
    if (input.maximumProbabilityOfCasualtyEc > 1) {
      throw new Error("Ec is a probability — must be ≤ 1.0");
    }
  }

  if (
    input.thirdPartyLiabilityCapUsdCents !== null &&
    input.thirdPartyLiabilityCapUsdCents !== undefined &&
    input.thirdPartyLiabilityCapUsdCents < BigInt(0)
  ) {
    throw new Error("Third-party liability cap must be non-negative");
  }

  const validUntil =
    input.validUntil ?? defaultValidUntilFor(input.licenseType);

  return prisma.tradeFaaAstLicense.create({
    data: {
      organizationId: input.organizationId,
      operatorName: input.operatorName,
      operatorAddress: input.operatorAddress,
      licenseType: input.licenseType,
      faaReference: input.faaReference ?? null,
      launchSite: input.launchSite,
      vehicleName: input.vehicleName,
      vehicleType: input.vehicleType,
      maximumProbabilityOfCasualtyEc:
        input.maximumProbabilityOfCasualtyEc ?? null,
      thirdPartyLiabilityCapUsdCents:
        input.thirdPartyLiabilityCapUsdCents ?? null,
      financialResponsibilityType: input.financialResponsibilityType ?? null,
      validFrom: input.validFrom ?? null,
      validUntil,
      notes: input.notes ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

/**
 * Transition a licence to the next status. Enforces:
 *   - the lifecycle graph (see isValidFaaAstTransition)
 *   - § 450.101 Ec ceiling on DRAFT → PRE_APP_CONSULTATION
 *   - faaReference requirement on UNDER_REVIEW → APPROVED
 *   - validUntil set when transitioning to APPROVED (defaults if not)
 */
export async function transitionFaaAstStatus(
  input: FaaAstStatusTransitionInput,
): Promise<TradeFaaAstLicense> {
  const current = await prisma.tradeFaaAstLicense.findFirst({
    where: { id: input.licenseId, organizationId: input.organizationId },
  });
  if (!current) {
    throw new Error("FAA AST licence not found in this organisation");
  }

  if (!isValidFaaAstTransition(current.status, input.nextStatus)) {
    throw new Error(
      `Invalid lifecycle transition ${current.status} → ${input.nextStatus}`,
    );
  }

  // § 450.101 Ec ceiling — once we move past DRAFT, the casualty
  // probability MUST be set and within the 1e-4 threshold.
  if (input.nextStatus === "PRE_APP_CONSULTATION") {
    if (current.maximumProbabilityOfCasualtyEc === null) {
      throw new Error(
        "Cannot advance past DRAFT without setting Maximum Probability of Casualty (Ec) per § 450.101",
      );
    }
    const ec = current.maximumProbabilityOfCasualtyEc;
    if (ec > EC_THRESHOLD_PER_MISSION) {
      throw new Error(
        `Ec ${ec.toExponential(2)} exceeds § 450.101 ceiling of 1.0e-4 — refine flight-safety analysis before pre-app consultation`,
      );
    }
  }

  // APPROVED requires the FAA reference (the LRLO/VOL/LLO identifier
  // FAA stamps on the licence). Either provided now, or already set.
  if (input.nextStatus === "APPROVED") {
    const ref = input.faaReference ?? current.faaReference;
    if (!ref || !ref.trim()) {
      throw new Error(
        "APPROVED transition requires an FAA reference (LRLO/VOL/LLO format)",
      );
    }
  }

  const data: Record<string, unknown> = {
    status: input.nextStatus,
  };

  if (input.faaReference !== undefined) {
    data.faaReference = input.faaReference;
  }
  if (input.validFrom !== undefined) data.validFrom = input.validFrom;
  if (input.validUntil !== undefined) data.validUntil = input.validUntil;
  if (input.notes !== undefined) data.notes = input.notes;

  // Auto-default validUntil on APPROVED if not set (5 years for
  // Part 450, 2 years for Part 435).
  if (
    input.nextStatus === "APPROVED" &&
    current.validUntil === null &&
    input.validUntil === undefined
  ) {
    data.validUntil = defaultValidUntilFor(current.licenseType);
  }

  return prisma.tradeFaaAstLicense.update({
    where: { id: input.licenseId },
    data,
  });
}

/**
 * List APPROVED licences expiring within the given window. Used by
 * the daily cron + the dashboard "expiring soon" widget.
 */
export async function listExpiring(
  organizationId: string,
  days: number,
): Promise<TradeFaaAstLicense[]> {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return prisma.tradeFaaAstLicense.findMany({
    where: {
      organizationId,
      status: "APPROVED",
      validUntil: { gte: now, lte: cutoff },
    },
    orderBy: { validUntil: "asc" },
  });
}

// ─── Pure helpers ───────────────────────────────────────────────────

/**
 * Mission-profile inputs to the § 450.101 Ec compliance check.
 *
 * Operators can either supply a pre-computed `ec` (the full casualty-
 * probability number from their flight-safety analysis), or pass the
 * raw decomposition (population at risk × probability of failure ×
 * probability of casualty given failure) and we'll compose it.
 *
 * The decomposed form is useful in the wizard UI for "what-if"
 * scenarios — operators can wiggle one factor at a time and see the
 * Ec slide above / below the ceiling.
 */
export interface MissionProfile {
  /** Pre-computed Ec. If set, the decomposition is ignored. */
  ec?: number;
  /** Probability of failure (P_f). */
  probabilityOfFailure?: number;
  /** Conditional probability of casualty given failure (P_c|f). */
  conditionalProbabilityOfCasualty?: number;
  /** Population at risk in the impact area (people). */
  populationAtRisk?: number;
}

/**
 * 14 CFR § 450.101(a)(1) Maximum Probability of Casualty (Ec) check.
 *
 * Pure function — no DB I/O. Returns:
 *   - `compliant: true`  when ec ≤ 1.0e-4
 *   - `compliant: false` otherwise
 *
 * Decomposition convention (when `ec` is not pre-computed):
 *   Ec = P_f × P_c|f × N_people
 *
 * where:
 *   - P_f       = probability of failure (per-mission)
 *   - P_c|f     = conditional probability of casualty given failure
 *   - N_people  = expected number of people at risk in impact area
 *
 * Boundary semantics:
 *   - ec === 1.0e-4 → compliant (the regulation states "no greater
 *     than 1×10⁻⁴", inclusive ceiling)
 *   - ec > 1.0e-4   → non-compliant
 *   - ec < 0        → invalid (throws via input validation upstream)
 *
 * Numerical tolerance: we treat values within 1 ULP of the threshold
 * (`Math.abs(ec - 1e-4) < 1e-18`) as exactly equal to the threshold
 * to avoid double-precision artefacts on the boundary.
 */
export function calculateEcCompliance(
  missionProfile: MissionProfile,
): EcComplianceResult {
  const ec = resolveEc(missionProfile);

  if (!Number.isFinite(ec) || ec < 0) {
    return {
      compliant: false,
      ec,
      threshold: EC_THRESHOLD_PER_MISSION,
      marginRatio: Number.POSITIVE_INFINITY,
      reason: "Ec is not a finite non-negative number",
    };
  }

  const ULP = 1e-18;
  const effectiveEc =
    Math.abs(ec - EC_THRESHOLD_PER_MISSION) < ULP
      ? EC_THRESHOLD_PER_MISSION
      : ec;

  const compliant = effectiveEc <= EC_THRESHOLD_PER_MISSION;
  const marginRatio = effectiveEc / EC_THRESHOLD_PER_MISSION;

  return {
    compliant,
    ec: effectiveEc,
    threshold: EC_THRESHOLD_PER_MISSION,
    marginRatio,
    reason: compliant
      ? `Ec ${effectiveEc.toExponential(2)} ≤ 1.0e-4 ceiling — § 450.101(a)(1) compliant`
      : `Ec ${effectiveEc.toExponential(2)} > 1.0e-4 ceiling — § 450.101(a)(1) violation`,
  };
}

function resolveEc(profile: MissionProfile): number {
  if (typeof profile.ec === "number") return profile.ec;
  const pf = profile.probabilityOfFailure ?? 0;
  const pcf = profile.conditionalProbabilityOfCasualty ?? 0;
  const n = profile.populationAtRisk ?? 0;
  return pf * pcf * n;
}

/**
 * Compute the licence-type-specific default validUntil.
 *
 *   PART_450_LAUNCH             → 5 years (§ 450.39 cap)
 *   PART_450_REENTRY            → 5 years
 *   PART_450_VEHICLE_OPERATOR   → 5 years
 *   PART_435_REENTRY_REUSABLE   → 2 years (legacy ceiling)
 */
export function defaultValidUntilFor(
  licenseType: TradeFaaAstLicenseType,
  from: Date = new Date(),
): Date {
  const out = new Date(from);
  switch (licenseType) {
    case "PART_450_LAUNCH":
    case "PART_450_REENTRY":
    case "PART_450_VEHICLE_OPERATOR":
      out.setFullYear(out.getFullYear() + 5);
      return out;
    case "PART_435_REENTRY_REUSABLE":
      out.setFullYear(out.getFullYear() + 2);
      return out;
    default:
      out.setFullYear(out.getFullYear() + 5);
      return out;
  }
}

/**
 * Allowed lifecycle transitions:
 *
 *   DRAFT
 *     → PRE_APP_CONSULTATION
 *     → REVOKED          (operator-cancelled before filing)
 *
 *   PRE_APP_CONSULTATION
 *     → APPLICATION_SUBMITTED
 *     → DRAFT            (back-step if § 450.31 reveals gaps)
 *     → REVOKED
 *
 *   APPLICATION_SUBMITTED
 *     → ENVIRONMENTAL_REVIEW
 *     → REJECTED         (FAA denied the application up front)
 *     → REVOKED
 *
 *   ENVIRONMENTAL_REVIEW
 *     → UNDER_REVIEW
 *     → REJECTED         (NEPA EIS triggered or CATEX denied)
 *     → REVOKED
 *
 *   UNDER_REVIEW
 *     → APPROVED
 *     → REJECTED
 *     → REVOKED
 *
 *   APPROVED
 *     → EXPIRED          (cron when validUntil passes)
 *     → REVOKED          (FAA-initiated mid-mission)
 *
 *   REJECTED  → (terminal)
 *   EXPIRED   → (terminal)
 *   REVOKED   → (terminal)
 */
export function isValidFaaAstTransition(
  current: TradeFaaAstLicenseStatus,
  next: TradeFaaAstLicenseStatus,
): boolean {
  if (current === next) return false;
  const allowed: Record<TradeFaaAstLicenseStatus, TradeFaaAstLicenseStatus[]> =
    {
      DRAFT: ["PRE_APP_CONSULTATION", "REVOKED"],
      PRE_APP_CONSULTATION: ["APPLICATION_SUBMITTED", "DRAFT", "REVOKED"],
      APPLICATION_SUBMITTED: ["ENVIRONMENTAL_REVIEW", "REJECTED", "REVOKED"],
      ENVIRONMENTAL_REVIEW: ["UNDER_REVIEW", "REJECTED", "REVOKED"],
      UNDER_REVIEW: ["APPROVED", "REJECTED", "REVOKED"],
      APPROVED: ["EXPIRED", "REVOKED"],
      REJECTED: [],
      EXPIRED: [],
      REVOKED: [],
    };
  return allowed[current].includes(next);
}
