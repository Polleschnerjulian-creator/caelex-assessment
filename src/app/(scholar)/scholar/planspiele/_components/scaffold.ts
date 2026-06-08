/**
 * scaffold.ts — PURE learning-scaffolding derivations for the Planspiele cockpit.
 *
 * No "use client", no DOM, no `server-only`, no imports beyond the scenario types.
 * Shared by the Cockpit (client) AND the unit tests. Everything here returns
 * i18n KEYS / structured data — never resolved strings — so the caller resolves
 * against PLANSPIELE_PLAY via playT() at render time.
 *
 * Two responsibilities:
 *   1. derivePhaseObjective(phase)            — what this phase is about + the
 *      criteria it is graded on (briefKey + rubric labelKeys), as keys.
 *   2. deriveRequirements(phase, answer)      — the LIVE "what this artifact
 *      needs" checklist, recomputed on every keystroke.
 *
 * CRITICAL — PRESENCE, NEVER CORRECTNESS. The checklist must NOT leak the
 * answer key. It checks that the student has *provided* an element (a boolean
 * toggled on, a select chosen, enough citations typed, enough substance
 * written) — never whether the provided value is the *right* one. Correctness
 * is revealed only later, in the graded debrief.
 */

import type {
  ScholarPlanspielPhase,
  ScholarArtifactField,
} from "@/data/scholar/planspiele/types";

// ─── Tunables (presence thresholds — NOT correctness) ─────────────────────────

/**
 * Minimum word count for a free-text artifact to read as "has substance".
 * Presence heuristic only: it gates the "Draft has substance" / "Revision
 * written" items, never whether the content is correct.
 */
export const SUBSTANCE_MIN_WORDS = 40;

/**
 * The form-state key the cockpit stores free-text artifacts under. The live
 * checklist AND the editor MUST agree on this key, else the checklist silently
 * reads all-unmet. Exported so the Cockpit editor references the same constant.
 */
export const FREE_TEXT_ANSWER_KEY = "text";

/** Fallback minimum citations when a cover_letter omits `minCitations`. */
const DEFAULT_MIN_CITATIONS = 1;

// ─── Pure citation counter (faithful copy of sim-coach.server's countCitations) ──
// Inlined deliberately: sim-coach.server.ts is `import "server-only"` and must
// not be pulled into this client-importable pure module. Kept byte-identical in
// behaviour so the live checklist count matches the Track-2 grader's count.

/** Count distinct provision-like citations in free text (Art. N, § N, "Law 89/2025"). */
export function countCitations(text: string): number {
  const matches =
    text.match(/\b(art\.?|article|§|law)\s*[\dA-Za-z/.-]+/gi) ?? [];
  return new Set(matches.map((m) => m.toLowerCase().replace(/\s+/g, " "))).size;
}

/** Word count of a free-text answer (whitespace-split, empties dropped). */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Read a free-text answer field defensively (the cockpit stores it under `text`). */
function readText(
  answer: Record<string, unknown>,
  key = FREE_TEXT_ANSWER_KEY,
): string {
  const v = answer[key];
  return typeof v === "string" ? v : "";
}

// ─── Phase objective ──────────────────────────────────────────────────────────

/**
 * The structured objective for a phase, expressed entirely as i18n KEYS.
 *
 *   - `briefKey`    : the phase's own brief (the "what you must do" prose).
 *   - `titleKey`    : the phase title (for the objective header).
 *   - `gradedOn`    : the rubric criterion label keys — the dimensions the
 *                     student is scored on this phase (pure scaffolding; this is
 *                     already-public rubric metadata, NOT the answer key).
 *
 * Returned as keys so the caller resolves with playT(locale, key). No strings
 * are baked in here, keeping the module locale-agnostic and testable.
 */
export interface PhaseObjective {
  titleKey: string;
  briefKey: string;
  /** Rubric criterion label keys, in rubric order (what the phase grades on). */
  gradedOn: string[];
}

export function derivePhaseObjective(
  phase: ScholarPlanspielPhase,
): PhaseObjective {
  return {
    titleKey: phase.titleKey,
    briefKey: phase.briefKey,
    gradedOn: phase.rubric.map((r) => r.labelKey),
  };
}

// ─── Live requirement checklist ───────────────────────────────────────────────

/**
 * One row of the live checklist. `labelKey` is an i18n key the caller resolves
 * (some carry `{field}` / `{n}` placeholders the caller fills); `detail` is an
 * optional already-formatted progress fragment (e.g. "1/2") the caller appends.
 * `met` is the only boolean — driven purely by PRESENCE.
 */
export interface RequirementItem {
  labelKey: string;
  met: boolean;
  /** Optional progress detail, e.g. a "k/N" citation fragment. Pre-formatted. */
  detail?: string;
  /**
   * For field-derived rows: the artifact field key, so the caller can resolve
   * the field's own labelKey (the human element name) into the `{field}`
   * placeholder of `play.req.fieldPresent`. Absent on free-text rows.
   */
  fieldKey?: string;
  /**
   * The field's own labelKey (e.g. "asi.p2.insurance"), supplied so the caller
   * can render "<element> provided" without re-deriving it from the phase.
   */
  fieldLabelKey?: string;
  /**
   * Numeric value for a `{n}` placeholder (e.g. the citation floor N on the
   * cited row), so the caller can substitute it. Use resolveRequirementLabel().
   */
  count?: number;
}

/** Field types that represent a *provided element* on a structured artifact. */
function isPresenceField(f: ScholarArtifactField): boolean {
  return f.type === "boolean" || f.type === "select";
}

/** A select/boolean field counts as present when toggled on / a choice is made. */
function fieldPresent(
  field: ScholarArtifactField,
  answer: Record<string, unknown>,
): boolean {
  const v = answer[field.key];
  if (field.type === "boolean") return v === true;
  // select (and any text we ever route here): present == a non-empty value.
  return typeof v === "string" ? v.trim().length > 0 : Boolean(v);
}

/**
 * Derive the live requirement checklist for the current phase + the in-progress
 * `answer` object (the cockpit's form state). PRESENCE-ONLY — see file header.
 *
 * Rules per artifact kind (design §2.3):
 *   - authority_choice / application_form:
 *       one row per structured field (boolean OR select). A boolean is met when
 *       toggled true; a select is met when a choice is made. (For these kinds
 *       every boolean field is an `answerKey.allOf` member and every select is a
 *       required choice, so this is exactly "one per allOf field + one per
 *       required select" — derived from the fields the student actually fills,
 *       so it stays correct for any scenario without reading the answer key.)
 *       Free-text fields (justifications) are AI-graded, not presence-gated.
 *   - cover_letter:
 *       "≥ N provisions cited (k/N)" (met when countCitations ≥ N) +
 *       "Draft has substance" (met when word count ≥ SUBSTANCE_MIN_WORDS).
 *   - deficiency_response:
 *       "Revision written" (met when any non-empty text) +
 *       "Addresses the notice" (met when word count ≥ SUBSTANCE_MIN_WORDS).
 *
 * The returned `labelKey`s are generic `play.req.*` keys the caller resolves;
 * field rows additionally carry the field's own labelKey for the element name.
 */
export function deriveRequirements(
  phase: ScholarPlanspielPhase,
  answer: Record<string, unknown>,
): RequirementItem[] {
  const kind = phase.artifact.kind;

  if (kind === "authority_choice" || kind === "application_form") {
    const fields = phase.artifact.fields ?? [];
    return fields.filter(isPresenceField).map((f) => ({
      // Generic "<element> provided" — caller fills {field} from fieldLabelKey.
      labelKey:
        f.type === "boolean" ? "play.req.fieldPresent" : "play.req.fieldChosen",
      met: fieldPresent(f, answer),
      fieldKey: f.key,
      fieldLabelKey: f.labelKey,
    }));
  }

  if (kind === "cover_letter") {
    const text = readText(answer);
    const need = Math.max(
      DEFAULT_MIN_CITATIONS,
      phase.artifact.minCitations ?? 0,
    );
    const have = countCitations(text);
    return [
      {
        // "≥ {n} provisions cited" — caller fills {n}=need; detail = "k/N".
        labelKey: "play.req.cited",
        met: have >= need,
        detail: `${have}/${need}`,
        count: need,
      },
      {
        labelKey: "play.req.substance",
        met: wordCount(text) >= SUBSTANCE_MIN_WORDS,
      },
    ];
  }

  // deficiency_response
  const text = readText(answer);
  return [
    {
      labelKey: "play.req.revision",
      met: wordCount(text) > 0,
    },
    {
      labelKey: "play.req.addresses",
      met: wordCount(text) >= SUBSTANCE_MIN_WORDS,
    },
  ];
}

/**
 * Resolve a RequirementItem into a finished display label, filling the `{field}`
 * and `{n}` placeholders. `t` is a locale-bound resolver — pass
 * `(key) => playT(locale, key)` — so this module stays pure (no i18n import).
 *
 * Screen agents turn RequirementItem[] into RequirementChecklist items with one
 * call each:
 *   items.map((i) => ({
 *     label: resolveRequirementLabel(i, (k) => playT(locale, k)),
 *     met: i.met,
 *     detail: i.detail,
 *   }))
 */
export function resolveRequirementLabel(
  item: RequirementItem,
  t: (key: string) => string,
): string {
  let label = t(item.labelKey);
  if (item.fieldLabelKey) {
    label = label.replace("{field}", t(item.fieldLabelKey));
  }
  if (item.count != null) {
    label = label.replace("{n}", String(item.count));
  }
  return label;
}
