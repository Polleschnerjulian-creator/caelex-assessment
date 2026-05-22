/**
 * Caelex Trade — parametric classification matcher (Sprint Z3c).
 *
 * Given an item's typed technical attributes, find the entries in the
 * control-list cross-walk (Z3b) whose predicates are satisfied. Return
 * a ranked list of candidates with the matched predicates, confidence,
 * and citation trail.
 *
 * Architecture:
 *   - Pure function, no I/O. Cross-walk is static data.
 *   - Each entry's predicates are AND-combined: ALL must match.
 *   - An entry whose item-attribute is NULL on the input is SKIPPED
 *     for that predicate — we do not assume false. The matcher
 *     returns the entry only when every required attribute is
 *     populated AND satisfies its predicate.
 *   - Confidence scoring is per-entry, not per-predicate:
 *       * HIGH    — every predicate matched AND at least one
 *                   parametric-threshold predicate (not itemClass-only)
 *                   matched solidly (not at boundary).
 *       * MEDIUM  — every predicate matched, but one or more matched
 *                   at the threshold boundary (1% from cutoff)
 *                   OR every match was itemClass-prefix only.
 *       * LOW     — only itemClass matched (no parametric predicates
 *                   on the item to evaluate against).
 *
 * This file is the engine that Sprint Z4 AI-Classification-Copilot
 * builds on. The Copilot extracts attributes from a datasheet and
 * feeds them here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  CONTROL_LIST_CROSS_WALK,
  type AttributeName,
  type ControlListEntry,
  type ParametricPredicate,
  type PredicateOp,
} from "./control-list-cross-walk";

// ─── Input shape ────────────────────────────────────────────────────

/**
 * Attribute bag passed to the matcher. Subset of TradeItem typed
 * columns + the freeform `parametricAttributes` JSON. Pure-function
 * boundary — the caller marshals their DB row into this shape.
 */
export interface ItemAttributeBag {
  apertureMeters?: number | null;
  payloadKg?: number | null;
  rangeKm?: number | null;
  IspSeconds?: number | null;
  deltaVMetersPerSecond?: number | null;
  gsdMeters?: number | null;
  transmitPowerW?: number | null;
  frequencyGhz?: number | null;
  radHardTidKrad?: number | null;
  seuRateErrorsPerBitDay?: number | null;
  isRadHardened?: boolean | null;
  isMilSpec?: boolean | null;
  isAntiJam?: boolean | null;
  /**
   * Sprint Z3g — the "specially designed" qualifier (US 15 CFR §772.1,
   * EU "besonders konstruiert", MTCR "specially designed"). Carried as
   * a boolean so it can drive predicate refutation on catch-all entries
   * like 9A515.x and USML XV(b). When NULL, three-valued logic (Z3f)
   * surfaces the entry as a possibleMatch — "operator review required".
   */
  isSpeciallyDesigned?: boolean | null;
  itemClass?: string | null;
  /** Catch-all for attributes that have no typed column yet. */
  parametricAttributes?: Record<string, unknown> | null;
}

// ─── Output shape ───────────────────────────────────────────────────

export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface MatchedPredicate {
  attribute: AttributeName;
  op: PredicateOp;
  expectedValue: ParametricPredicate["value"];
  actualValue: unknown;
  /** True when the actual value sits within 1% of the threshold. */
  boundary: boolean;
}

export interface CandidateMatch {
  entry: ControlListEntry;
  confidence: MatchConfidence;
  /** Predicates that matched, in declaration order. */
  matchedPredicates: MatchedPredicate[];
  /** Why this confidence was chosen — explanatory string. */
  rationale: string;
}

/**
 * Sprint Z3f — three-valued logic result.
 *
 * Per the May 2026 ontology research blueprint § 14: "an unknown SEU
 * rate must NOT silently classify a rad-hard FPGA as below-threshold."
 *
 * A `PossibleMatch` is emitted when an entry's predicates partially
 * match — some matched (true), none refuted (false), but at least one
 * could not be evaluated because the underlying item attribute is NULL.
 *
 * The operator should treat this as "fill in attribute X to confirm
 * classification" — NOT as a no-match.
 */
export interface PossibleMatch {
  entry: ControlListEntry;
  /** Predicates that matched (definite true). */
  matchedPredicates: MatchedPredicate[];
  /** Predicates that could not be evaluated due to NULL item attribute. */
  unknownPredicates: Array<{
    attribute: AttributeName;
    op: PredicateOp;
    expectedValue: ParametricPredicate["value"];
    /** Operator-actionable: "populate this attribute to resolve". */
    missingAttribute: AttributeName;
  }>;
  /** Plain-language explanation for the operator. */
  rationale: string;
}

export interface MatcherResult {
  /** Ranked candidates, HIGH first, then MEDIUM, then LOW. */
  candidates: CandidateMatch[];
  /**
   * Sprint Z3f — entries that partially match but have ≥1 predicate
   * UNKNOWN due to NULL item attribute. Operator-actionable: fill in
   * the missing attribute and re-run.
   *
   * Safety property: a `PossibleMatch` is NEVER returned for an entry
   * whose predicates would refute given the available data. Only the
   * unknown-attribute case produces a possible match.
   */
  possibleMatches: PossibleMatch[];
  /** True when the item has no parametric attributes populated. */
  noAttributesPopulated: boolean;
  /** Always present — every classification surface attaches a disclaimer. */
  disclaimer: string;
}

const MATCHER_DISCLAIMER =
  "Parametric matcher output is SCREENING-LEVEL GUIDANCE only. Final classification must be reviewed by a qualified compliance officer and, for high-value or borderline items, confirmed via a binding ruling (BAFA AzG / DDTC CJ / BIS CCATS).";

// ─── Core matcher ───────────────────────────────────────────────────

/**
 * Find every cross-walk entry whose predicates are satisfied by the
 * input attribute bag. Returns ranked candidates with citation trails.
 */
export function matchAgainstCrossWalk(
  item: ItemAttributeBag,
  crossWalk: readonly ControlListEntry[] = CONTROL_LIST_CROSS_WALK,
): MatcherResult {
  const noAttributesPopulated = isBagEmpty(item);

  const candidates: CandidateMatch[] = [];
  const possibleMatches: PossibleMatch[] = [];

  for (const entry of crossWalk) {
    const result = evaluateEntry(item, entry);
    if (result.kind === "match") {
      candidates.push(result.match);
    } else if (result.kind === "possible") {
      possibleMatches.push(result.possible);
    }
    // result.kind === "refute" → entry dropped, no side effect.
  }

  // Rank: HIGH > MEDIUM > LOW, then by predicate-match count desc.
  const order: Record<MatchConfidence, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  candidates.sort((a, b) => {
    if (order[a.confidence] !== order[b.confidence]) {
      return order[b.confidence] - order[a.confidence];
    }
    return b.matchedPredicates.length - a.matchedPredicates.length;
  });

  // Rank possibles by matched-count desc (most-corroborated first).
  possibleMatches.sort(
    (a, b) => b.matchedPredicates.length - a.matchedPredicates.length,
  );

  // Noise-suppression: when the operator has populated NOTHING, every
  // entry with a predicate would surface as a possible match. That is
  // worse-than-useless guidance — it tells them nothing actionable.
  // Surface the noAttributesPopulated flag instead so the UI can render
  // a "populate at least one technical attribute" prompt.
  const surfacedPossibles = noAttributesPopulated ? [] : possibleMatches;

  return {
    candidates,
    possibleMatches: surfacedPossibles,
    noAttributesPopulated,
    disclaimer: MATCHER_DISCLAIMER,
  };
}

// ─── Per-entry evaluation (Sprint Z3f three-valued logic) ───────────

type EntryEvalResult =
  | { kind: "match"; match: CandidateMatch }
  | { kind: "possible"; possible: PossibleMatch }
  | { kind: "refute" };

function evaluateEntry(
  item: ItemAttributeBag,
  entry: ControlListEntry,
): EntryEvalResult {
  // An entry with NO predicates can never match parametrically.
  if (entry.predicates.length === 0) return { kind: "refute" };

  const matchedPredicates: MatchedPredicate[] = [];
  const unknownPredicates: PossibleMatch["unknownPredicates"] = [];
  let hasParametricMatch = false;
  let anyBoundary = false;

  for (const pred of entry.predicates) {
    const actual = readAttribute(item, pred.attribute);

    // Three-valued logic, branch 1: UNKNOWN
    // NULL / undefined → predicate cannot be evaluated. We do NOT
    // refute — we collect into unknownPredicates and continue
    // evaluating the rest of the entry. The final decision depends
    // on whether ANY predicate refuted.
    if (actual === null || actual === undefined) {
      unknownPredicates.push({
        attribute: pred.attribute,
        op: pred.op,
        expectedValue: pred.value,
        missingAttribute: pred.attribute,
      });
      continue;
    }

    const evalResult = evaluatePredicate(pred, actual);

    // Three-valued logic, branch 2: REFUTED
    // A predicate that returned `matched: false` definitively refutes
    // the entry — we drop it (no possible-match emission).
    if (!evalResult.matched) return { kind: "refute" };

    // Three-valued logic, branch 3: MATCHED
    matchedPredicates.push({
      attribute: pred.attribute,
      op: pred.op,
      expectedValue: pred.value,
      actualValue: actual,
      boundary: evalResult.boundary,
    });

    if (pred.attribute !== "itemClass") hasParametricMatch = true;
    if (evalResult.boundary) anyBoundary = true;
  }

  // After scanning all predicates without a refutation:
  //   - If any are UNKNOWN → possible match (operator must fill in).
  //   - Otherwise → full match.
  if (unknownPredicates.length > 0) {
    return {
      kind: "possible",
      possible: {
        entry,
        matchedPredicates,
        unknownPredicates,
        rationale: buildPossibleRationale(
          entry,
          matchedPredicates,
          unknownPredicates,
        ),
      },
    };
  }

  const confidence: MatchConfidence = decideConfidence(
    hasParametricMatch,
    anyBoundary,
    matchedPredicates,
  );

  const rationale = buildRationale(
    entry,
    matchedPredicates,
    confidence,
    hasParametricMatch,
    anyBoundary,
  );

  return {
    kind: "match",
    match: {
      entry,
      confidence,
      matchedPredicates,
      rationale,
    },
  };
}

function buildPossibleRationale(
  entry: ControlListEntry,
  matched: MatchedPredicate[],
  unknown: PossibleMatch["unknownPredicates"],
): string {
  const matchedSummary = matched
    .map(
      (p) => `${p.attribute} ${humanOp(p.op)} ${formatValue(p.expectedValue)}`,
    )
    .join("; ");
  const missing = unknown.map((u) => u.missingAttribute).join(", ");
  return `Partial match against ${entry.canonicalId}: ${matched.length} predicate(s) matched (${matchedSummary || "none"}) but ${unknown.length} require additional data. Populate [${missing}] to resolve.`;
}

function decideConfidence(
  hasParametricMatch: boolean,
  anyBoundary: boolean,
  matchedPredicates: MatchedPredicate[],
): MatchConfidence {
  if (!hasParametricMatch) return "LOW";
  if (anyBoundary) return "MEDIUM";
  if (matchedPredicates.length === 1) {
    // Single parametric predicate solid match — still MEDIUM since
    // confidence should grow with corroboration.
    return "MEDIUM";
  }
  return "HIGH";
}

function buildRationale(
  entry: ControlListEntry,
  matchedPredicates: MatchedPredicate[],
  confidence: MatchConfidence,
  hasParametricMatch: boolean,
  anyBoundary: boolean,
): string {
  const matchSummary = matchedPredicates
    .map(
      (p) => `${p.attribute} ${humanOp(p.op)} ${formatValue(p.expectedValue)}`,
    )
    .join("; ");

  if (!hasParametricMatch) {
    return `Matched via itemClass prefix only (no parametric thresholds evaluated). LOW confidence — operator should confirm via parametric attributes or expert review. (${matchSummary})`;
  }

  if (anyBoundary) {
    return `Matched ${matchedPredicates.length} predicate(s): ${matchSummary}. MEDIUM confidence — at least one predicate matched at the threshold boundary (within 1% of cutoff). Treat as ${entry.canonicalId} candidate but verify the boundary attribute before any binding determination.`;
  }

  return `Matched ${matchedPredicates.length} predicate(s): ${matchSummary}. ${confidence} confidence based on solid parametric agreement.`;
}

// ─── Predicate evaluation ───────────────────────────────────────────

interface PredicateEvalResult {
  matched: boolean;
  boundary: boolean;
}

function evaluatePredicate(
  pred: ParametricPredicate,
  actual: unknown,
): PredicateEvalResult {
  const v = pred.value;

  switch (pred.op) {
    case "lt": {
      const matched =
        typeof actual === "number" && typeof v === "number" && actual < v;
      const boundary =
        matched && typeof actual === "number" && typeof v === "number"
          ? Math.abs(actual - v) / Math.abs(v || 1) <= 0.01 + 1e-9
          : false;
      return { matched, boundary };
    }
    case "lte": {
      const matched =
        typeof actual === "number" && typeof v === "number" && actual <= v;
      const boundary =
        matched && typeof actual === "number" && typeof v === "number"
          ? Math.abs(actual - v) / Math.abs(v || 1) <= 0.01 + 1e-9
          : false;
      return { matched, boundary };
    }
    case "gt": {
      const matched =
        typeof actual === "number" && typeof v === "number" && actual > v;
      const boundary =
        matched && typeof actual === "number" && typeof v === "number"
          ? Math.abs(actual - v) / Math.abs(v || 1) <= 0.01 + 1e-9
          : false;
      return { matched, boundary };
    }
    case "gte": {
      const matched =
        typeof actual === "number" && typeof v === "number" && actual >= v;
      const boundary =
        matched && typeof actual === "number" && typeof v === "number"
          ? Math.abs(actual - v) / Math.abs(v || 1) <= 0.01 + 1e-9
          : false;
      return { matched, boundary };
    }
    case "eq": {
      const matched = actual === v;
      // No boundary concept for equality
      return { matched, boundary: false };
    }
    case "between": {
      if (
        !Array.isArray(v) ||
        v.length !== 2 ||
        typeof v[0] !== "number" ||
        typeof v[1] !== "number" ||
        typeof actual !== "number"
      ) {
        return { matched: false, boundary: false };
      }
      const [lo, hi] = v as [number, number];
      const matched = actual >= lo && actual <= hi;
      // Boundary if within OR AT 1% of either endpoint. Tolerance
      // adds a 1e-9 epsilon to absorb IEEE-754 floating-point
      // imprecision (e.g. 0.5 - 0.495 = 0.005000000000000004 in JS).
      const tolLo = Math.abs(lo) * 0.01 + 1e-9;
      const tolHi = Math.abs(hi) * 0.01 + 1e-9;
      const boundary =
        matched &&
        (Math.abs(actual - lo) <= (tolLo || 0.001) ||
          Math.abs(actual - hi) <= (tolHi || 0.001));
      return { matched, boundary };
    }
    case "prefix": {
      if (typeof actual !== "string" || typeof v !== "string") {
        return { matched: false, boundary: false };
      }
      const matched = actual.startsWith(v);
      // Prefix has no numeric boundary; could compute lexical distance
      // but not worth the complexity for v0.
      return { matched, boundary: false };
    }
    case "in": {
      if (!Array.isArray(v)) return { matched: false, boundary: false };
      const matched = (v as (number | string)[]).some((x) => x === actual);
      return { matched, boundary: false };
    }
    default:
      return { matched: false, boundary: false };
  }
}

// ─── Attribute readout ──────────────────────────────────────────────

function readAttribute(
  item: ItemAttributeBag,
  attribute: AttributeName,
): unknown {
  // Typed columns first — they take precedence over parametricAttributes.
  // Cast-safe because AttributeName is a union of typed column names.
  const direct = (item as Record<string, unknown>)[attribute];
  if (direct !== undefined && direct !== null) return direct;

  // Fall through to parametricAttributes bag.
  const bag = item.parametricAttributes;
  if (bag && typeof bag === "object") {
    const val = (bag as Record<string, unknown>)[attribute];
    if (val !== undefined && val !== null) return val;
  }

  return null;
}

function isBagEmpty(item: ItemAttributeBag): boolean {
  const keys: Array<keyof ItemAttributeBag> = [
    "apertureMeters",
    "payloadKg",
    "rangeKm",
    "IspSeconds",
    "deltaVMetersPerSecond",
    "gsdMeters",
    "transmitPowerW",
    "frequencyGhz",
    "radHardTidKrad",
    "seuRateErrorsPerBitDay",
    "isRadHardened",
    "isMilSpec",
    "isAntiJam",
    "isSpeciallyDesigned",
    "itemClass",
  ];
  for (const k of keys) {
    const v = item[k];
    if (v !== null && v !== undefined && v !== false) return false;
  }
  const bag = item.parametricAttributes;
  if (bag && typeof bag === "object" && Object.keys(bag).length > 0) {
    return false;
  }
  return true;
}

// ─── Format helpers ─────────────────────────────────────────────────

function humanOp(op: PredicateOp): string {
  switch (op) {
    case "lt":
      return "<";
    case "lte":
      return "≤";
    case "gt":
      return ">";
    case "gte":
      return "≥";
    case "eq":
      return "=";
    case "between":
      return "between";
    case "prefix":
      return "starts with";
    case "in":
      return "∈";
  }
}

function formatValue(v: ParametricPredicate["value"]): string {
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "number") {
    // Scientific notation for very small (e.g. SEU rate 1e-10)
    if (Math.abs(v) > 0 && Math.abs(v) < 0.001) return v.toExponential(1);
    return String(v);
  }
  return String(v);
}
