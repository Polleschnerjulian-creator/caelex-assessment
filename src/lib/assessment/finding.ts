/**
 * Ultimate Operator Assessment — the AssessmentFinding envelope (Task 1.2).
 *
 * Lineage: structural copy of the Passage ExplainedResult contract
 * (src/lib/comply-v2/trade/explained-result.ts) — adapted bands + flux flag.
 * COPIED, not imported: surface separation (no Trade import from the
 * assessment surface) and different confidence semantics (epistemic bands
 * derived from tri-state answers instead of corroboration strength).
 *
 * Every consequential assessment output (applicability, regime direction,
 * NIS2 gateway result, obligation finding) ships inside this envelope:
 *   WHAT       — the obligation, one line.
 *   WHY        — reasoning + the matched rule.
 *   WHEREFORE  — what it means + the single next action.
 *   WHY-TRACE  — "because you answered: …" (question id + answer label).
 *   CONFIDENCE — DETERMINED / PROBABLE / INDETERMINATE, derived from the
 *                epistemic state of the answers in the trigger chain.
 *   SOURCES    — legal basis (instrument + provision + as-of date); ≥1
 *                unless INDETERMINATE.
 *   RULEBOOK   — the RULEBOOK.version this finding was computed against.
 *
 * HONESTY INVARIANTS enforced here at the type/constructor level:
 *   - Unknown rounds up: deriveConfidence() is monotonic — more unknowns can
 *     only lower the band, never raise it (cross-cutting invariant #2).
 *   - Every finding cites: a determined finding without ≥1 source throws at
 *     construction (invariant #5); an INDETERMINATE finding must explain the
 *     gap in `why`.
 *   - Flux collapsed-conservative (§7.1 #2 / founder §11.4): a fluxFlag must
 *     carry ≥2 positions — a "contested" marker with one position is a
 *     contradiction in terms and throws.
 *   - No overall score (invariant #6): nothing in this module aggregates.
 *
 * Pure, dependency-free. No `server-only`, no React — safe for the wizard
 * (display) AND the verdict pipeline (enforcement).
 */

export type FindingConfidence = "DETERMINED" | "PROBABLE" | "INDETERMINATE";
export type FindingVerdict =
  | "applicable"
  | "conditional"
  | "contested"
  | "not_applicable"
  | "advisory";

export interface FindingSource {
  label: string; // e.g. "EU Space Act proposal — Commission text"
  citation: string; // e.g. "COM(2025) 335 Art. 23"
  asOf: string; // ISO date
  verified: boolean; // false ⇒ renderer shows "legal basis pending verification"
  url?: string;
}

/** §7.1 #2 / founder §11.4: contested-in-legislation marker, collapsed by default. */
export interface FluxFlag {
  summary: string; // "contested — conservative reading shown"
  conservativeReading: string; // what the verdict assumes
  positions: { source: string; position: string }[]; // ≥2; rendered expanded only on click / PDF appendix
}

export interface AssessmentFinding<T = unknown> {
  value: T;
  verdict: FindingVerdict;
  what: string; // one-line obligation
  why: string; // reasoning + matched rule
  wherefore: string; // what it means + single next action
  whyTrace: { questionId: string; answerLabel: string }[]; // "because you answered: …"
  confidence: FindingConfidence;
  sources: FindingSource[]; // ≥1 unless INDETERMINATE
  cluster: ClusterId;
  fluxFlag?: FluxFlag;
  /** §6 (2) full tier: ENISA-style "evidence a supervisor would accept" examples.
   *  Populated per obligation CLUSTER (not per question) from
   *  CLUSTER_EVIDENCE_EXAMPLES in the pipeline (Task 1.9); rendered in FindingCard. */
  evidenceExamples?: string[];
  rulebookVersion: string;
}

export type ClusterId =
  | "authorization_registration"
  | "transfer_change_of_control"
  | "debris_safety"
  | "resilience_cyber"
  | "incident_reporting"
  | "environment"
  | "insurance_liability"
  | "supervision_penalties"
  | "spectrum_itu"
  | "export_control_sanctions"
  | "un_registration";

// ─── Internal validation helpers ─────────────────────────────────────────────

const ALL_CONFIDENCE_BANDS: readonly FindingConfidence[] = [
  "DETERMINED",
  "PROBABLE",
  "INDETERMINATE",
];

const ALL_VERDICTS: readonly FindingVerdict[] = [
  "applicable",
  "conditional",
  "contested",
  "not_applicable",
  "advisory",
];

const ALL_CLUSTER_IDS: readonly ClusterId[] = [
  "authorization_registration",
  "transfer_change_of_control",
  "debris_safety",
  "resilience_cyber",
  "incident_reporting",
  "environment",
  "insurance_liability",
  "supervision_penalties",
  "spectrum_itu",
  "export_control_sanctions",
  "un_registration",
];

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isValidConfidence(v: unknown): v is FindingConfidence {
  return (
    typeof v === "string" &&
    (ALL_CONFIDENCE_BANDS as readonly string[]).includes(v)
  );
}

function isValidVerdict(v: unknown): v is FindingVerdict {
  return (
    typeof v === "string" && (ALL_VERDICTS as readonly string[]).includes(v)
  );
}

function isValidCluster(v: unknown): v is ClusterId {
  return (
    typeof v === "string" && (ALL_CLUSTER_IDS as readonly string[]).includes(v)
  );
}

function isValidFluxFlag(v: unknown): v is FluxFlag {
  if (v === null || typeof v !== "object") return false;
  const rec = v as Record<string, unknown>;
  if (!isNonEmptyString(rec.summary)) return false;
  if (!isNonEmptyString(rec.conservativeReading)) return false;
  if (!Array.isArray(rec.positions) || rec.positions.length < 2) return false;
  return rec.positions.every(
    (p) =>
      p !== null &&
      typeof p === "object" &&
      isNonEmptyString((p as Record<string, unknown>).source) &&
      isNonEmptyString((p as Record<string, unknown>).position),
  );
}

/** Throws when a fluxFlag is present but malformed (esp. <2 positions). */
function assertFluxFlag(fluxFlag: FluxFlag | undefined, ctor: string): void {
  if (fluxFlag === undefined) return;
  if (!isValidFluxFlag(fluxFlag)) {
    throw new Error(
      `${ctor}: a fluxFlag must carry summary, conservativeReading and >=2 positions — ` +
        "a 'contested' marker with fewer than two legislative positions is a contradiction in terms (§7.1 #2).",
    );
  }
}

// ─── Constructors (honesty-invariant enforcing) ──────────────────────────────

/**
 * Build a determined (DETERMINED / PROBABLE) finding. Throws at construction
 * when `sources` is empty — a determined finding without legal provenance must
 * never exist (invariant #5) — or when `confidence` is "INDETERMINATE" (use
 * `indeterminateFinding` so the unknown state is explicit), or when a present
 * `fluxFlag` has fewer than 2 positions.
 */
export function determinedFinding<T>(
  input: Omit<AssessmentFinding<T>, "confidence"> & {
    confidence: Exclude<FindingConfidence, "INDETERMINATE">;
  },
): AssessmentFinding<T> {
  if ((input.confidence as FindingConfidence) === "INDETERMINATE") {
    throw new Error(
      "determinedFinding: confidence INDETERMINATE is not a determined finding — use indeterminateFinding() so the unknown state is explicit.",
    );
  }
  if (!input.sources || input.sources.length === 0) {
    throw new Error(
      "determinedFinding: a determined finding requires >=1 source. A finding without legal basis must never ship (invariant #5).",
    );
  }
  assertFluxFlag(input.fluxFlag, "determinedFinding");
  return {
    value: input.value,
    verdict: input.verdict,
    what: input.what,
    why: input.why,
    wherefore: input.wherefore,
    whyTrace: input.whyTrace,
    confidence: input.confidence,
    sources: input.sources,
    cluster: input.cluster,
    ...(input.fluxFlag !== undefined ? { fluxFlag: input.fluxFlag } : {}),
    ...(input.evidenceExamples !== undefined
      ? { evidenceExamples: input.evidenceExamples }
      : {}),
    rulebookVersion: input.rulebookVersion,
  };
}

/**
 * Build the INDETERMINATE finding — the explicit-unknown state. `why` is
 * REQUIRED and must explain the gap (which answer is unknown and why it is
 * decisive); an unexplained unknown is a silent fail, which is forbidden.
 * `sources` defaults to [] but may carry the partial provenance that WAS
 * consulted. Unknown rounds up: this state widens, never narrows, the
 * obligation picture (invariant #2).
 */
export function indeterminateFinding<T>(
  input: Omit<AssessmentFinding<T>, "confidence" | "sources"> & {
    sources?: FindingSource[];
  },
): AssessmentFinding<T> {
  if (!isNonEmptyString(input.why)) {
    throw new Error(
      "indeterminateFinding: `why` must explain the gap — an INDETERMINATE finding with no stated reason is a silent fail, which is forbidden.",
    );
  }
  assertFluxFlag(input.fluxFlag, "indeterminateFinding");
  return {
    value: input.value,
    verdict: input.verdict,
    what: input.what,
    why: input.why,
    wherefore: input.wherefore,
    whyTrace: input.whyTrace,
    confidence: "INDETERMINATE",
    sources: input.sources ?? [],
    cluster: input.cluster,
    ...(input.fluxFlag !== undefined ? { fluxFlag: input.fluxFlag } : {}),
    ...(input.evidenceExamples !== undefined
      ? { evidenceExamples: input.evidenceExamples }
      : {}),
    rulebookVersion: input.rulebookVersion,
  };
}

// ─── Completeness guard ──────────────────────────────────────────────────────

/**
 * Pure completeness guard (the renderer + tests refuse incomplete findings).
 * Returns the list of MISSING / invalid envelope fields; `[]` = renderable.
 *
 * Rules:
 *   - `what`, `why`, `wherefore`, `rulebookVersion` non-empty after trimming.
 *   - `verdict` / `confidence` / `cluster` must be known enum values.
 *   - `sources` must be an array; non-empty UNLESS confidence === "INDETERMINATE"
 *     (the only band where an empty source list is permitted — the gap is
 *     explained in `why`).
 *   - `whyTrace` must be an array (may be empty for unconditional findings).
 *   - `fluxFlag`, when present, must be well-formed with ≥2 positions.
 *   - `evidenceExamples`, when present, must be a string array.
 *
 * Typed `unknown` so it can be called defensively on deserialized payloads
 * without a cast.
 */
export function isFindingComplete(f: unknown): string[] {
  if (f === null || typeof f !== "object") {
    return [
      "what",
      "why",
      "wherefore",
      "verdict",
      "confidence",
      "sources",
      "whyTrace",
      "cluster",
      "rulebookVersion",
    ];
  }

  const rec = f as Record<string, unknown>;
  const missing: string[] = [];

  if (!isNonEmptyString(rec.what)) missing.push("what");
  if (!isNonEmptyString(rec.why)) missing.push("why");
  if (!isNonEmptyString(rec.wherefore)) missing.push("wherefore");
  if (!isValidVerdict(rec.verdict)) missing.push("verdict");
  if (!isValidConfidence(rec.confidence)) missing.push("confidence");

  if (!Array.isArray(rec.sources)) {
    missing.push("sources");
  } else if (rec.sources.length === 0 && rec.confidence !== "INDETERMINATE") {
    missing.push("sources");
  }

  if (!Array.isArray(rec.whyTrace)) missing.push("whyTrace");
  if (!isValidCluster(rec.cluster)) missing.push("cluster");
  if (!isNonEmptyString(rec.rulebookVersion)) missing.push("rulebookVersion");

  if (rec.fluxFlag !== undefined && !isValidFluxFlag(rec.fluxFlag)) {
    missing.push("fluxFlag");
  }

  if (
    rec.evidenceExamples !== undefined &&
    !(
      Array.isArray(rec.evidenceExamples) &&
      rec.evidenceExamples.every((e) => typeof e === "string")
    )
  ) {
    missing.push("evidenceExamples");
  }

  return missing;
}

// ─── Confidence derivation (epistemic, from tri-state answers) ───────────────

/**
 * Derive the confidence band from the epistemic state of the answers in a
 * finding's trigger chain:
 *
 *   - 0 unknowns, none decisive       → DETERMINED (every triggering answer
 *                                       was actually answered).
 *   - ≥1 non-decisive unknown         → PROBABLE (the finding holds under the
 *                                       conservative reading of the unknowns;
 *                                       the pipeline names them in `why`).
 *   - any DECISIVE unknown            → INDETERMINATE (the finding cannot be
 *                                       determined without that answer).
 *
 * Monotonic by construction — adding an unknown can only move the band
 * DETERMINED → PROBABLE → INDETERMINATE, never the other way (unknown rounds
 * up, invariant #2).
 */
export function deriveConfidence(input: {
  unknownsInTriggerChain: number;
  decisiveUnknown: boolean;
}): FindingConfidence {
  if (input.decisiveUnknown) return "INDETERMINATE";
  return input.unknownsInTriggerChain === 0 ? "DETERMINED" : "PROBABLE";
}
