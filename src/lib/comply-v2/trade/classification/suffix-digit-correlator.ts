/**
 * Caelex Trade — Annex-I / CCL Suffix-Digit Runtime Correlator (Sprint Z27, Tier 3).
 *
 * The EU Annex I and the US Commerce Control List use a hierarchical
 * sub-paragraph notation for their entries:
 *
 *     9A515.a.1.c.iii
 *     │└┬┘ │ │ │ │
 *     │ │  │ │ │ └── roman-numeral fourth level     ("iii")
 *     │ │  │ │ └──── alpha third level              ("c")
 *     │ │  │ └────── numeric second level           ("1")
 *     │ │  └──────── alpha first sub-paragraph      ("a")
 *     │ └────────── entry number (3 digits)        ("515")
 *     └──────────── category + product-group       ("9" + "A")
 *
 * The category digit (0-9) names the broad commodity domain
 * (0 = nuclear, 5 = telecom/info-sec, 9 = aerospace, …), the
 * product-group letter (A-E) names the form (A = hardware, B =
 * test/equipment, C = materials, D = software, E = technology), the
 * 3-digit entry number names the specific item family, and the
 * dotted sub-paragraphs descend into ever-more-specific sub-items.
 *
 * The 3-digit number ALSO encodes which multilateral regime is the
 * source of the control (Blueprint 3 § 4.1): 001-099 = Wassenaar
 * baseline, 101-199 = MTCR, 201-299 = NSG, etc. This file deals
 * purely with structural parsing & roll-up / roll-down; the
 * regime-derivation logic is intentionally NOT here so this
 * correlator can be reused for hierarchies that don't follow the
 * suffix-digit regime convention (e.g. national lists with bespoke
 * numbering).
 *
 * Why we need this:
 *   - Cross-walk matchers fire on whatever code is in their data
 *     (could be "9A515" or "9A515.a.1"). The UI needs to display
 *     parent → child relationships, and queries from operators
 *     should match BOTH the specific code AND any broader family
 *     they belong to.
 *   - Roll-UP: a match on "9A515.a.1" should also be presented as
 *     matching "9A515.a" and "9A515" so the operator sees the
 *     full hierarchy.
 *   - Roll-DOWN: if the operator inputs "9A515" we should surface
 *     every sub-paragraph entry that lives under it.
 *
 * Pure-function module — no I/O, no Prisma, no fetch.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ClassificationEntry } from "@/data/trade/schema";

// ─── Hierarchy shape ───────────────────────────────────────────────────

/**
 * Parsed hierarchical components of an ECCN-style code.
 *
 * The naming follows BIS / Annex I convention: the first sub-paragraph
 * is a lower-case letter (`a`, `b`, ...), the second level is numeric
 * (`1`, `2`, ...), the third level is again a lower-case letter
 * (`c`, `d`, ...), and an optional fourth level is roman-numeral
 * lower-case (`i`, `ii`, `iii`, ...). Real-world ECCNs go no deeper.
 *
 * USML entries use a different syntax — `XV(a)(7)(i)` — and are out of
 * scope for this correlator; parsing returns `null` for them.
 */
export interface EccnHierarchy {
  /** Single-digit category, e.g. "9" for aerospace. */
  category: string;
  /** Single-letter product group, e.g. "A" for hardware. */
  productGroup: string;
  /** 3-digit entry number, e.g. "001", "515", "101". */
  entryNumber: string;
  /** First-level sub-paragraph (single lower-case letter), if present. */
  subParagraph?: string;
  /** Second-level sub-sub (single digit), if present. */
  subSub?: string;
  /** Third-level sub-sub-sub (single lower-case letter), if present. */
  subSubSub?: string;
  /** Fourth-level roman-numeral lower-case suffix, if present. */
  romanSubSub?: string;
  /** Original input, untouched (preserves casing of letters). */
  raw: string;
}

// ─── Regex ─────────────────────────────────────────────────────────────
//
// Anchored, case-sensitive on the head, case-insensitive on the trailing
// roman numerals (since BIS sometimes prints "(III)" in tables, though
// the official text is lower-case). The product-group letter MUST be
// upper-case A-E; anything else is not a valid ECCN structure.
//
// The full hierarchy form is:
//   <digit><A-E><3-digit>(.<sub>(.<sub>(.<sub>(.<roman>)?)?)?)?
//
// We parse loosely (any 3-digit entry number, including "099" or "999")
// — the regime-suffix-band check is a different layer.

// Positional capture groups (ES2017 target — no named groups):
//   [1] = category digit
//   [2] = product-group letter
//   [3] = 3-digit entry number
//   [4] = sub-paragraph (first dotted segment, alpha)
//   [5] = sub-sub (second dotted segment, digits)
//   [6] = sub-sub-sub (third dotted segment, alpha)
//   [7] = roman sub-sub (fourth dotted segment, [ivxlcdm]+)
const ECCN_REGEX =
  /^([0-9])([A-E])([0-9]{3})(?:\.([a-z]))?(?:\.([0-9]+))?(?:\.([a-z]))?(?:\.([ivxlcdm]+))?$/i;

// Strict roman-numeral check — only valid lowercase atoms. We accept
// any combination because higher than "vi" is rare but legal.
const ROMAN_NUMERAL_REGEX = /^[ivxlcdm]+$/;

// ─── parseEccnHierarchy ────────────────────────────────────────────────

/**
 * Parse an ECCN-style code into its hierarchical components.
 *
 * Returns `null` if the input doesn't conform to the ECCN structure
 * (e.g. USML notation, free-text, whitespace-only, MTCR "9A106"
 * style which is fine, but "EAR99" which isn't a hierarchical code).
 *
 * Whitespace is trimmed but internal whitespace is rejected. Letter
 * case is preserved in `raw` and normalized in parsed fields:
 *   - Product-group letter → upper-case
 *   - Sub-paragraph letters → lower-case
 *   - Roman numerals → lower-case
 */
export function parseEccnHierarchy(eccn: string): EccnHierarchy | null {
  if (typeof eccn !== "string") {
    return null;
  }
  const raw = eccn.trim();
  if (raw.length === 0) {
    return null;
  }
  // Reject internal whitespace — "9A 515" is not a valid ECCN.
  if (/\s/.test(raw)) {
    return null;
  }

  // Quick rejection of USML-style codes ("XV(a)(7)(i)") and EAR99.
  if (raw.startsWith("EAR")) {
    return null;
  }

  const match = ECCN_REGEX.exec(raw);
  if (!match) {
    return null;
  }

  const category = match[1];
  const productGroup = match[2];
  const entryNumber = match[3];
  const subParagraph = match[4];
  const subSub = match[5];
  const subSubSub = match[6];
  const romanSubSub = match[7];

  // Defensive: a roman-numeral atom containing only [ivxlcdm] should
  // also not pretend to be (say) "lll" (valid letters, nonsense
  // roman); we accept any non-empty match-result because the regex
  // already constrained the character class, but reject patterns
  // longer than 7 chars (the longest sensible roman atom <= 3999).
  if (romanSubSub && romanSubSub.length > 7) {
    return null;
  }
  if (romanSubSub && !ROMAN_NUMERAL_REGEX.test(romanSubSub.toLowerCase())) {
    return null;
  }

  const result: EccnHierarchy = {
    category,
    productGroup: productGroup.toUpperCase(),
    entryNumber,
    raw,
  };
  if (subParagraph) {
    result.subParagraph = subParagraph.toLowerCase();
  }
  if (subSub) {
    result.subSub = subSub;
  }
  if (subSubSub) {
    result.subSubSub = subSubSub.toLowerCase();
  }
  if (romanSubSub) {
    result.romanSubSub = romanSubSub.toLowerCase();
  }
  return result;
}

// ─── rollUpHierarchy ───────────────────────────────────────────────────

/**
 * Roll a hierarchy UP to broader parents.
 *
 * Returns the canonical code-strings ordered MOST-SPECIFIC first
 * (the original code) DOWN TO the broadest (the bare entry, e.g.
 * "9A515"). The category alone ("9A") is NOT a real ECCN and is
 * NOT returned — entries must always include the 3-digit number.
 *
 * Examples:
 *
 *   parseEccnHierarchy("9A515.a.1.c.iii") → rollUp →
 *     [ "9A515.a.1.c.iii", "9A515.a.1.c", "9A515.a.1",
 *       "9A515.a", "9A515" ]
 *
 *   parseEccnHierarchy("9A001") → rollUp →
 *     [ "9A001" ]
 */
export function rollUpHierarchy(hierarchy: EccnHierarchy): string[] {
  const base = `${hierarchy.category}${hierarchy.productGroup}${hierarchy.entryNumber}`;
  const levels: string[] = [base];

  if (hierarchy.subParagraph) {
    levels.push(`${base}.${hierarchy.subParagraph}`);
  }
  if (hierarchy.subParagraph && hierarchy.subSub) {
    levels.push(`${base}.${hierarchy.subParagraph}.${hierarchy.subSub}`);
  }
  if (hierarchy.subParagraph && hierarchy.subSub && hierarchy.subSubSub) {
    levels.push(
      `${base}.${hierarchy.subParagraph}.${hierarchy.subSub}.${hierarchy.subSubSub}`,
    );
  }
  if (
    hierarchy.subParagraph &&
    hierarchy.subSub &&
    hierarchy.subSubSub &&
    hierarchy.romanSubSub
  ) {
    levels.push(
      `${base}.${hierarchy.subParagraph}.${hierarchy.subSub}.${hierarchy.subSubSub}.${hierarchy.romanSubSub}`,
    );
  }

  // Most-specific first.
  return levels.reverse();
}

// ─── rollDownHierarchy ─────────────────────────────────────────────────

/**
 * Roll DOWN: given a (possibly partial) ECCN and a list of classification
 * entries, return every entry whose `code` falls UNDER the given prefix
 * in the hierarchy.
 *
 * Semantics:
 *   - The match is INCLUSIVE — an entry whose `code` exactly equals the
 *     query is returned in the result.
 *   - Matches are PREFIX-based on the dotted hierarchy. "9A515" matches
 *     "9A515", "9A515.a", "9A515.a.1", but NOT "9A5150" (no shared
 *     hierarchical boundary).
 *   - Non-hierarchical entries (codes that fail parseEccnHierarchy)
 *     are excluded.
 *   - The query itself must parse; a free-text / USML query returns
 *     an empty list.
 *
 * Pure: does not mutate the input array. Returns entries in the same
 * order as the input array (callers can sort by hierarchy if needed).
 */
export function rollDownHierarchy(
  eccn: string,
  allEntries: ReadonlyArray<ClassificationEntry>,
): ClassificationEntry[] {
  const queryHierarchy = parseEccnHierarchy(eccn);
  if (!queryHierarchy) {
    return [];
  }

  // The roll-down prefix is the most-specific level represented in the
  // query. We compare against entries' rolled-up tree: an entry is
  // "under" the query if the query string appears anywhere in the
  // entry's roll-up chain. Equivalent to: the query is a prefix of
  // the entry along hierarchical boundaries.
  const queryRollUp = rollUpHierarchy(queryHierarchy);
  // Most-broad form of the query (length 1 = bare entry, etc.).
  // Most-specific level = queryRollUp[0]; broadest = queryRollUp[at-end].
  // For roll-down we want every entry that, in its own roll-up chain,
  // contains the query's most-specific level.
  const queryAtMostSpecific = queryRollUp[0];

  const out: ClassificationEntry[] = [];
  for (const entry of allEntries) {
    const entryHierarchy = parseEccnHierarchy(entry.code);
    if (!entryHierarchy) {
      continue;
    }
    const entryRollUp = rollUpHierarchy(entryHierarchy);
    if (entryRollUp.includes(queryAtMostSpecific)) {
      out.push(entry);
    }
  }
  return out;
}

// ─── correlateMatch ────────────────────────────────────────────────────

/**
 * Output of `correlateMatch`. The triplet that the UI needs to render
 * a "you matched X — which is part of Y — and contains Z" tree.
 */
export interface CorrelatedMatch {
  /**
   * The entry whose `code` exactly equals `matchedEccn`, if any in the
   * provided list. `null` if no exact match exists (e.g. the matched
   * code is a "virtual" parent rolled up from a deeper child).
   */
  exact: ClassificationEntry | null;
  /**
   * BROADER entries — parents of the matched code that also exist in
   * the entry list. Ordered most-specific (closest parent) first to
   * broadest (the bare entry). Excludes the exact match itself.
   *
   * Example: matchedEccn = "9A515.a.1.c.iii", and the list contains
   * "9A515.a.1", "9A515.a", "9A515" → broader returns those three
   * in that order.
   */
  broader: ClassificationEntry[];
  /**
   * NARROWER entries — children of the matched code that exist in the
   * entry list. Returned in the order they appear in `allEntries`
   * (the caller can apply a stable sort if needed). Excludes the
   * exact match itself.
   *
   * Example: matchedEccn = "9A515", and the list contains "9A515.a",
   * "9A515.a.1", "9A515.d" → narrower returns those three.
   */
  narrower: ClassificationEntry[];
}

/**
 * Correlate a matched code against the full entry list, splitting the
 * surrounding tree into broader (parents) and narrower (children).
 *
 * Returns empty arrays if the matched code doesn't parse. Returns
 * `exact: null` if the matched code parses but no entry's `code` is
 * the literal match (it may still surface broader/narrower siblings).
 */
export function correlateMatch(
  matchedEccn: string,
  allEntries: ReadonlyArray<ClassificationEntry>,
): CorrelatedMatch {
  const empty: CorrelatedMatch = {
    exact: null,
    broader: [],
    narrower: [],
  };

  const matchedHierarchy = parseEccnHierarchy(matchedEccn);
  if (!matchedHierarchy) {
    return empty;
  }

  const matchedRollUp = rollUpHierarchy(matchedHierarchy);
  // matchedRollUp[0] is the matched code itself; the rest are parents.
  const matchedCanonical = matchedRollUp[0];
  const matchedParents = matchedRollUp.slice(1);
  // Index for O(1) lookup when scanning entries.
  const parentSet = new Set(matchedParents);

  let exact: ClassificationEntry | null = null;
  // Map of parent-code → entry, so we can preserve broad → broader order.
  const broaderByCode = new Map<string, ClassificationEntry>();
  const narrower: ClassificationEntry[] = [];

  for (const entry of allEntries) {
    const entryHierarchy = parseEccnHierarchy(entry.code);
    if (!entryHierarchy) {
      continue;
    }
    const entryRollUp = rollUpHierarchy(entryHierarchy);
    const entryCanonical = entryRollUp[0];

    if (entryCanonical === matchedCanonical) {
      // First-write-wins: if the list contains multiple entries with
      // identical codes (e.g. EU + US mirror), the first becomes the
      // exact match. Callers that need both should filter by
      // jurisdiction upstream.
      if (exact === null) {
        exact = entry;
      }
      continue;
    }

    // Is the entry a parent of the matched code?
    if (parentSet.has(entryCanonical)) {
      if (!broaderByCode.has(entryCanonical)) {
        broaderByCode.set(entryCanonical, entry);
      }
      continue;
    }

    // Is the entry a child of the matched code? Check whether
    // matchedCanonical appears in the entry's roll-up chain
    // (i.e. the entry is rolled UP through the matched node).
    if (entryRollUp.includes(matchedCanonical)) {
      narrower.push(entry);
    }
  }

  // Reorder broader so the closest parent (most specific parent) is
  // first and the broadest is last. matchedParents is already in
  // most-specific → broadest order.
  const broader: ClassificationEntry[] = [];
  for (const parentCode of matchedParents) {
    const entry = broaderByCode.get(parentCode);
    if (entry) {
      broader.push(entry);
    }
  }

  return { exact, broader, narrower };
}
