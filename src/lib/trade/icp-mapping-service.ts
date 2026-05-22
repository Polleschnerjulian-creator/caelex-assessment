/**
 * Caelex Trade — ICP 2019/1318 element mapping service.
 *
 * Sprint Z8.
 *
 * Pure function that projects a TradeComplianceProgram record onto the
 * seven-element EU 2019/1318 framework. Returns per-element completion
 * percentage, per-item satisfaction state, and an overall ICP-readiness
 * score that BAFA's general-licence (Sammelgenehmigung) evaluation
 * gates on (operators must reach ≥ 80% on mandatory items to apply).
 *
 * This is intentionally separated from `program-service.ts` (which
 * does DB I/O and encryption) — the mapping is a pure pure-function
 * boundary so the engine can be tested without a database.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  ICP_ELEMENTS,
  type ICPCheckItem,
  type ICPElement,
  type ICPElementId,
  type ProgramBooleanField,
  type ProgramScalarField,
} from "@/data/trade/icp-2019-1318";

// ─── Input shape ────────────────────────────────────────────────────

/**
 * Subset of `TradeComplianceProgram` fields the mapping service reads.
 * Caller marshals their Prisma record into this shape — keeps the
 * service decoupled from the ORM type and easy to unit-test with
 * plain objects.
 */
export interface ICPProgramSnapshot {
  // E2 — Empowered Official
  empoweredOfficialName?: string | null;
  empoweredOfficialEmailEnc?: string | null;
  empoweredOfficialTitle?: string | null;
  // E2-04 — TCP doubles as procedure-documentation evidence
  hasTCP?: boolean | null;
  // E3 — Training
  lastTrainingDate?: Date | null;
  nextTrainingDue?: Date | null;
  trainingCompletionRate?: number | null;
  // E4 — Transaction screening
  hasAutomatedScreening?: boolean | null;
  screeningVendor?: string | null;
  jurisdictionDetermination?: string | null;
  // E5 — Performance review
  lastAuditDate?: Date | null;
  nextAuditDue?: Date | null;
  lastAuditFindings?: string | null;
  hasVoluntaryDisclosures?: boolean | null;
  // Misc flags (not currently auto-satisfying any item but listed for
  // future extension)
  hasITARItems?: boolean | null;
  hasEARItems?: boolean | null;
  hasECL?: boolean | null;
  registeredWithDDTC?: boolean | null;
  usesLicenseExceptions?: boolean | null;
  licenseExceptionsUsed?: string | null;
  /**
   * Per-item manual overrides. The matcher's auto-satisfaction logic
   * is a floor — the operator (or an auditor) can mark any item as
   * satisfied independently via this map.
   *
   * Keyed by ICPCheckItem.id (e.g. "E1-01").
   */
  manualOverrides?: Record<string, boolean | undefined>;
}

// ─── Output shape ───────────────────────────────────────────────────

export interface ICPItemResult {
  item: ICPCheckItem;
  /** True if either auto-satisfied OR manually overridden true. */
  satisfied: boolean;
  /** Why it was marked satisfied — for the operator-facing rationale. */
  source: "auto-boolean" | "auto-scalar" | "manual" | "unsatisfied";
}

export interface ICPElementResult {
  element: ICPElement;
  items: ICPItemResult[];
  /** Number of items satisfied. */
  satisfiedCount: number;
  /** Total item count. */
  totalCount: number;
  /** Number of MANDATORY items satisfied. */
  satisfiedMandatoryCount: number;
  /** Total MANDATORY item count. */
  totalMandatoryCount: number;
  /** Completion as 0-1 over ALL items in element. */
  completion: number;
  /** Completion as 0-1 over MANDATORY items only. */
  mandatoryCompletion: number;
}

export interface ICPMappingResult {
  elements: ICPElementResult[];
  /** Overall completion as 0-1 over ALL items. */
  overallCompletion: number;
  /** Overall MANDATORY completion as 0-1 — the BAFA-gating metric. */
  overallMandatoryCompletion: number;
  /**
   * True when overall mandatory completion ≥ 0.80 — BAFA's informal
   * threshold for SAG-grade ICP. Not a binding determination; final
   * decision is BAFA's.
   */
  isBafaSagEligible: boolean;
  /** Items needing operator attention, in element order. */
  outstandingMandatoryItems: ICPCheckItem[];
}

// ─── Core mapping function ──────────────────────────────────────────

/**
 * BAFA's informal threshold for SAG eligibility — mandatory-items
 * completion must reach this fraction. Treat as a screening signal;
 * BAFA may grant or refuse SAGs above/below this independently.
 */
export const BAFA_SAG_THRESHOLD = 0.8;

export function mapProgramToIcpElements(
  snapshot: ICPProgramSnapshot,
): ICPMappingResult {
  const elements: ICPElementResult[] = ICP_ELEMENTS.map((element) =>
    evaluateElement(element, snapshot),
  );

  const totalCount = elements.reduce((sum, e) => sum + e.totalCount, 0);
  const satisfiedCount = elements.reduce((sum, e) => sum + e.satisfiedCount, 0);
  const totalMandatoryCount = elements.reduce(
    (sum, e) => sum + e.totalMandatoryCount,
    0,
  );
  const satisfiedMandatoryCount = elements.reduce(
    (sum, e) => sum + e.satisfiedMandatoryCount,
    0,
  );

  const overallCompletion = totalCount > 0 ? satisfiedCount / totalCount : 0;
  const overallMandatoryCompletion =
    totalMandatoryCount > 0 ? satisfiedMandatoryCount / totalMandatoryCount : 0;

  const outstandingMandatoryItems: ICPCheckItem[] = [];
  for (const er of elements) {
    for (const ir of er.items) {
      if (ir.item.mandatory && !ir.satisfied) {
        outstandingMandatoryItems.push(ir.item);
      }
    }
  }

  return {
    elements,
    overallCompletion,
    overallMandatoryCompletion,
    isBafaSagEligible: overallMandatoryCompletion >= BAFA_SAG_THRESHOLD,
    outstandingMandatoryItems,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function evaluateElement(
  element: ICPElement,
  snapshot: ICPProgramSnapshot,
): ICPElementResult {
  const items: ICPItemResult[] = element.items.map((item) =>
    evaluateItem(item, snapshot),
  );
  const satisfiedCount = items.filter((i) => i.satisfied).length;
  const totalCount = items.length;
  const satisfiedMandatoryCount = items.filter(
    (i) => i.item.mandatory && i.satisfied,
  ).length;
  const totalMandatoryCount = items.filter((i) => i.item.mandatory).length;

  return {
    element,
    items,
    satisfiedCount,
    totalCount,
    satisfiedMandatoryCount,
    totalMandatoryCount,
    completion: totalCount > 0 ? satisfiedCount / totalCount : 0,
    mandatoryCompletion:
      totalMandatoryCount > 0
        ? satisfiedMandatoryCount / totalMandatoryCount
        : 0,
  };
}

function evaluateItem(
  item: ICPCheckItem,
  snapshot: ICPProgramSnapshot,
): ICPItemResult {
  // Manual override wins over everything — operator/auditor decision.
  const manualValue = snapshot.manualOverrides?.[item.id];
  if (manualValue === true) {
    return { item, satisfied: true, source: "manual" };
  }
  if (manualValue === false) {
    // Explicit false in the override map means "do NOT auto-satisfy";
    // useful when an auditor wants to flag a stale auto-true entry.
    return { item, satisfied: false, source: "unsatisfied" };
  }

  // Auto-satisfaction via boolean fields — any-true wins.
  if (item.autoSatisfyBooleans) {
    for (const field of item.autoSatisfyBooleans) {
      if (readBoolean(snapshot, field) === true) {
        return { item, satisfied: true, source: "auto-boolean" };
      }
    }
  }

  // Auto-satisfaction via scalar fields — non-null/non-empty wins.
  if (item.autoSatisfyScalars) {
    for (const field of item.autoSatisfyScalars) {
      if (isScalarPresent(snapshot, field)) {
        return { item, satisfied: true, source: "auto-scalar" };
      }
    }
  }

  return { item, satisfied: false, source: "unsatisfied" };
}

function readBoolean(
  snapshot: ICPProgramSnapshot,
  field: ProgramBooleanField,
): boolean | undefined {
  const v = (snapshot as Record<string, unknown>)[field];
  if (typeof v === "boolean") return v;
  return undefined;
}

function isScalarPresent(
  snapshot: ICPProgramSnapshot,
  field: ProgramScalarField,
): boolean {
  const v = (snapshot as Record<string, unknown>)[field];
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return !Number.isNaN(v);
  if (v instanceof Date) return !Number.isNaN(v.getTime());
  // Boolean fields aren't expected here but if so, true counts as present.
  return Boolean(v);
}

// ─── Sanity exports ─────────────────────────────────────────────────

export type { ICPElementId };
