/**
 * Caelex Passage — the Explanation Envelope (`ExplainedResult<T>`).
 *
 * THE STRUCTURAL TRANSPARENCY CONTRACT.
 *
 * The founder's thesis: export control is the one compliance domain where a
 * black-box "verdict you must trust" is DISQUALIFYING, because the liability
 * is personal and criminal and attaches to a NAMED HUMAN — the
 * Ausfuhrverantwortlicher who signs the EUC, the BAFA application, and the
 * customs declaration — never to "the AI". Passage wins by inverting the
 * automation default: the AI does the heavy lifting and drafts; the human
 * reviews, decides, and is recorded; the system explains, teaches, and audits.
 *
 * This file makes that stance ENFORCEABLE at the type level. No Passage
 * surface may emit a consequential output (classification, screening result,
 * licence determination, de-minimis, operation verdict, generated filing)
 * without carrying the six fields below. `ExplainedResult<T>` is the only
 * return type for an explained engine result, and `isExplained()` is the pure
 * guard the renderer + tests use to refuse an incomplete result — so an
 * UN-explained verdict cannot ship.
 *
 * THE SIX FIELDS (the explanation envelope):
 *   WHAT       — the decision, stated plainly (one line).
 *   WHY        — legal-basis citation + the exact matched rule/list entry +
 *                matched parameters + reasoning.
 *   WHEREFORE  — what it means + the single recommended next action.
 *   CONFIDENCE — explicit; UNVERIFIED surfaced, NEVER implied.
 *   SOURCE     — list/corpus version + as-of provenance (≥1 for a determined
 *                result; [] only allowed when confidence === "UNVERIFIED").
 *   OVERRIDE   — the output is an editable PROPOSAL; the human is recorded as
 *                the decision-of-record.
 *
 * LEGAL INVARIANTS preserved by this layer (additive — wraps existing engines,
 * changes no engine return type):
 *   - Conservative-by-design + three-valued: a missing/null/stale input maps
 *     to confidence === "UNVERIFIED", NEVER to a green/CLEAR/GO. Absence is
 *     not a clearance ("eine fehlende Einstufung ist keine Freigabe").
 *   - FAIL CLOSED: an UNVERIFIED result is neutral-but-blocking, never green.
 *   - The AI never silently decides: `override.allowed` marks the result as a
 *     proposal a human applies; `override.by`/`at`/`justification` record the
 *     human decision-of-record once applied.
 *
 * Pure, dependency-free. Safe to import from both server engines and client
 * components (no `server-only`, no React).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Confidence ─────────────────────────────────────────────────────────────

/**
 * Explicit confidence for an explained result.
 *
 *   HIGH / MEDIUM / LOW — a determination was made; the band reflects how
 *     strongly the underlying engine corroborated it. These REQUIRE ≥1 source.
 *
 *   UNVERIFIED — the determination could NOT be made, or rests on a source
 *     that is missing/unavailable/stale. This is the FAIL-CLOSED state. It is
 *     neutral-but-blocking — NEVER green, NEVER a clearance. It is the ONLY
 *     confidence band for which an empty `sources` array is permitted, and
 *     even then the `why` MUST explain the gap.
 */
export type ExplainConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNVERIFIED";

// ─── Source provenance ──────────────────────────────────────────────────────

/**
 * One provenance entry for an explained result — the list/corpus the
 * determination was drawn from, with its version + citation so a regulator can
 * trace the WHY back to authoritative text.
 */
export interface ExplainSource {
  /** Human label, e.g. "EU Annex I (Reg. 2021/821)", "OFAC SDN List". */
  label: string;
  /** Citation to authoritative source, e.g. "15 CFR 774 Supp.1 ECCN 9A515.a.1". */
  citation: string;
  /**
   * Version / as-of stamp of the list or corpus consulted, e.g. an ISO date,
   * a content snapshot hash, or a published list-version string. Optional
   * because some citations are version-stable statute references.
   */
  listVersion?: string;
  /**
   * Machine-readable "current as of" date (ISO date) for the reference data
   * this source was drawn from — e.g. the latest incorporated regulation date
   * for a control list, or the real snapshot fetch date for a sanctions list.
   *
   * Purely ADDITIVE + informational: it tells the operator HOW CURRENT the
   * underlying reference data is, so a stale list is visible rather than
   * silently trusted. It NEVER affects the determination, the confidence band,
   * or the completeness guard — `isExplained()` does not read it. All other
   * lanes/files leave it unset; the renderer shows it only when present.
   *
   * Distinct from `listVersion` (a free-form version label / snapshot hash):
   * `currentAsOf` is specifically a parseable ISO date for "Stand:" display.
   */
  currentAsOf?: string;
  /** Optional deep link to the source text or authority portal. */
  url?: string;
}

// ─── Override (decision-of-record) ───────────────────────────────────────────

/**
 * The human override-of-record affordance + record.
 *
 *   allowed       — the output is an editable PROPOSAL the human MAY override
 *                   / apply. The AI never auto-commits; this flag is what makes
 *                   the result a suggestion rather than a fact.
 *   by / at       — once a human has reviewed/decided, who and when. Absent
 *                   while still AI-proposed.
 *   justification — the human's recorded rationale for their decision (for the
 *                   audit trail / "Why this?" dossier).
 */
export interface ExplainOverride {
  allowed: boolean;
  by?: string;
  at?: string;
  justification?: string;
}

// ─── The envelope ────────────────────────────────────────────────────────────

/**
 * `ExplainedResult<T>` — the universal explanation envelope.
 *
 * `value` is the machine-readable result (the WHAT, structured); `what` / `why`
 * / `wherefore` / `confidence` / `sources` / `override` are the human-facing
 * envelope. The renderer (`<ExplainedPanel>`) REFUSES to render a consequential
 * result whose envelope is incomplete — so an un-explained verdict cannot ship.
 */
export interface ExplainedResult<T> {
  /** Machine-readable result (the WHAT, structured). */
  value: T;
  /** One-line human summary of what was determined. */
  what: string;
  /** The reasoning + legal basis (matched rule / citation / predicate). */
  why: string;
  /** What it means + the single recommended next action. */
  wherefore: string;
  /** Explicit confidence; UNVERIFIED is fail-closed, never green. */
  confidence: ExplainConfidence;
  /**
   * Provenance. ≥1 for a determined result (HIGH/MEDIUM/LOW). May be [] ONLY
   * when confidence === "UNVERIFIED" and `why` explains the gap.
   */
  sources: ExplainSource[];
  /** The human override-of-record affordance / record. */
  override: ExplainOverride;
}

// ─── Completeness guard ──────────────────────────────────────────────────────

/**
 * Field key reported by `isExplained` when a required envelope field is missing
 * or invalid. Stable strings so the renderer + tests can assert on them.
 */
export type ExplainMissingField =
  | "what"
  | "why"
  | "wherefore"
  | "confidence"
  | "sources";

/**
 * Pure completeness guard. Returns the list of MISSING / invalid envelope
 * fields for `r`. An empty array means the result is fully explained and safe
 * to render.
 *
 * Rules (enforce the contract):
 *   - `what`, `why`, `wherefore` must be non-empty after trimming.
 *   - `confidence` must be one of the four bands.
 *   - `sources` must be non-empty UNLESS confidence === "UNVERIFIED"
 *     (the only band where an empty source list is permitted — and even then
 *     `why` must be present to explain the gap, which the `why` rule covers).
 *
 * NOTE: this guard is intentionally permissive about `override` — a freshly
 * computed result is AI-proposed (`override.allowed === true`, no `by`/`at`
 * yet), which is a valid, renderable state. The renderer surfaces the
 * proposed-vs-decided status; it does not block on it.
 *
 * `r` is typed `unknown` so this guard can be called defensively on any value
 * (e.g. a deserialised API payload) without a cast.
 */
export function isExplained(r: unknown): ExplainMissingField[] {
  const missing: ExplainMissingField[] = [];

  if (r === null || typeof r !== "object") {
    // A non-object can satisfy none of the fields.
    return ["what", "why", "wherefore", "confidence", "sources"];
  }

  const rec = r as Record<string, unknown>;

  if (!isNonEmptyString(rec.what)) missing.push("what");
  if (!isNonEmptyString(rec.why)) missing.push("why");
  if (!isNonEmptyString(rec.wherefore)) missing.push("wherefore");

  const confidence = rec.confidence;
  const confidenceValid = isValidConfidence(confidence);
  if (!confidenceValid) missing.push("confidence");

  // Sources: required unless confidence is the fail-closed UNVERIFIED band.
  const sources = rec.sources;
  const sourcesNonEmpty = Array.isArray(sources) && sources.length > 0;
  const unverified = confidence === "UNVERIFIED";
  if (!sourcesNonEmpty && !unverified) {
    missing.push("sources");
  }

  return missing;
}

/**
 * Convenience boolean wrapper around `isExplained`. `true` when the envelope is
 * complete (safe to render), `false` when any required field is missing.
 */
export function isFullyExplained(r: unknown): boolean {
  return isExplained(r).length === 0;
}

const ALL_CONFIDENCE_BANDS: readonly ExplainConfidence[] = [
  "HIGH",
  "MEDIUM",
  "LOW",
  "UNVERIFIED",
];

function isValidConfidence(v: unknown): v is ExplainConfidence {
  return (
    typeof v === "string" &&
    (ALL_CONFIDENCE_BANDS as readonly string[]).includes(v)
  );
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// ─── Constructors (conservative-by-design helpers) ───────────────────────────

/**
 * Build a determined (HIGH/MEDIUM/LOW) explained result. Throws at
 * construction time if `confidence` is "UNVERIFIED" (use
 * `unverifiedResult` for that) or if `sources` is empty — a determined result
 * without provenance must never exist.
 *
 * Defaults `override.allowed` to `true`: the result starts life as an
 * AI-PROPOSED proposal a human applies, never an auto-committed fact.
 */
export function explainedResult<T>(input: {
  value: T;
  what: string;
  why: string;
  wherefore: string;
  confidence: Exclude<ExplainConfidence, "UNVERIFIED">;
  sources: ExplainSource[];
  override?: ExplainOverride;
}): ExplainedResult<T> {
  if ((input.confidence as ExplainConfidence) === "UNVERIFIED") {
    throw new Error(
      "explainedResult: confidence UNVERIFIED is not a determined result — use unverifiedResult() so the fail-closed state is explicit.",
    );
  }
  if (!input.sources || input.sources.length === 0) {
    throw new Error(
      "explainedResult: a determined result requires >=1 source. A verdict without provenance must never ship.",
    );
  }
  return {
    value: input.value,
    what: input.what,
    why: input.why,
    wherefore: input.wherefore,
    confidence: input.confidence,
    sources: input.sources,
    override: input.override ?? { allowed: true },
  };
}

/**
 * Build the FAIL-CLOSED, UNVERIFIED explained result. This is the only safe
 * mapping for a missing/null/stale input or a no-match. It is neutral-but-
 * blocking — NEVER a clearance.
 *
 * `why` is REQUIRED and must explain the gap (the renderer relies on it to
 * justify the empty source list). `sources` defaults to [] but may carry the
 * stale/partial provenance that was consulted, to show WHAT was checked.
 */
export function unverifiedResult<T>(input: {
  value: T;
  what: string;
  /** Must explain the gap — why no determination could be made. */
  why: string;
  wherefore: string;
  sources?: ExplainSource[];
  override?: ExplainOverride;
}): ExplainedResult<T> {
  if (!isNonEmptyString(input.why)) {
    throw new Error(
      "unverifiedResult: `why` must explain the gap — an UNVERIFIED result with no stated reason is a silent fail, which is forbidden.",
    );
  }
  return {
    value: input.value,
    what: input.what,
    why: input.why,
    wherefore: input.wherefore,
    confidence: "UNVERIFIED",
    sources: input.sources ?? [],
    override: input.override ?? { allowed: true },
  };
}

/**
 * Record a human decision-of-record onto an existing explained result, moving
 * it from AI-PROPOSED to HUMAN-REVIEWED. Returns a NEW envelope (pure — does
 * not mutate). The `confidence`/`value`/explanation are untouched — only the
 * `override` record is stamped. This never makes a result MORE permissive.
 */
export function withDecisionOfRecord<T>(
  result: ExplainedResult<T>,
  decision: { by: string; at: string; justification?: string },
): ExplainedResult<T> {
  return {
    ...result,
    override: {
      allowed: result.override.allowed,
      by: decision.by,
      at: decision.at,
      justification: decision.justification,
    },
  };
}
