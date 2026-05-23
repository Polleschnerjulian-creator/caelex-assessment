/**
 * 15 CFR Part 743 Supplement No. 2 — Eligible ECCN catalogue.
 *
 * The reportable items list is published in Supplement No. 2 to Part
 * 743 of the EAR. Items in scope (as of the May 2026 EAR text):
 *
 *   3A001.x  — High-performance computing ICs above APP thresholds
 *              (.a.5.a/b, .a.7.b, .b.2, .b.3) — see 84 FR 4920 + 89 FR
 *              17630 for the May 2024 expansion.
 *   3A002.h  — Information-security related testing equipment.
 *   3A991    — Mass-market HPC (CCATS-listed crossover).
 *   4A001.a  — High-performance computers (>APP thresholds).
 *   4A003    — Digital computers + assemblies (APP thresholds).
 *   4A004    — Computers w/ aggregated APP > 0.001 WT.
 *   4A102    — Hybrid digital computers (MTCR Cat I).
 *   5A002.a  — Information security — symmetric > 56 bits,
 *              asymmetric > 512 bits, elliptic > 112 bits.
 *   5A002.b  — Cryptanalytic items.
 *   5A002.c  — "Open cryptographic interface" items.
 *   5A002.d  — Quantum-cryptography items.
 *   5A992.c  — Mass-market cryptography (sub-paragraph c only).
 *
 * Threshold note: Supplement No. 2 itself doesn't impose an APP cut-off
 * — the threshold is baked into the parent ECCN paragraphs (3A001.a.5.a,
 * etc.). The Z29 service therefore treats ANY operation shipping an
 * item with an in-scope ECCN as eligible. Operators can manually exclude
 * a row from the draft if they believe it sits below the parent
 * paragraph's threshold (the manual-override is a future sprint).
 *
 * Sources:
 *   - 15 CFR § 743.2 (Annual reporting)
 *   - 15 CFR Supplement No. 2 to Part 743
 *   - 84 FR 4920 (Feb 19 2019) — most recent comprehensive list update
 *   - 89 FR 84766 (Oct 23 2024) — AUKUS+Canada carve-outs note
 */

/**
 * The set of ECCN paragraph prefixes that trigger Supplement No. 2
 * reporting. Match is by prefix on the ECCN root — so "3A001.b.3.a"
 * matches "3A001.b" and triggers inclusion. This is the conservative
 * approach: if the operator classified deeper than the trigger root,
 * the trigger still fires (correct — sub-paragraphs are subsets).
 */
export const ELIGIBLE_ECCN_PREFIXES: ReadonlyArray<string> = [
  // ── Category 3 — Electronics ──
  "3A001.a.5.a",
  "3A001.a.5.b",
  "3A001.a.7.b",
  "3A001.b.2",
  "3A001.b.3",
  "3A002.h",
  "3A991",
  // ── Category 4 — Computers ──
  "4A001.a",
  "4A003",
  "4A004",
  "4A102",
  // ── Category 5 part 2 — Information Security ──
  "5A002.a",
  "5A002.b",
  "5A002.c",
  "5A002.d",
  "5A992.c",
];

/**
 * Returns true when the given ECCN sits inside the Supplement No. 2
 * reporting scope. Match is case-insensitive prefix on either the
 * exact prefix or with a trailing "." (so "3A001.b" matches the
 * prefix "3A001.b" but not "3A001.bx").
 *
 * @param eccn The classification code to test (may include sub-
 *   paragraph depth, e.g. "5A002.a.1.a").
 */
export function isEligibleEccn(eccn: string | null | undefined): boolean {
  if (!eccn) return false;
  const normalised = eccn.trim().toUpperCase();
  if (normalised.length === 0) return false;
  for (const prefix of ELIGIBLE_ECCN_PREFIXES) {
    const p = prefix.toUpperCase();
    if (normalised === p) return true;
    // Exact prefix match with sub-paragraph delimiter — "3A001.a.5.a"
    // matches but "3A001.a.5.aaaa" does not (would be a different
    // sub-paragraph, not a sub-sub-paragraph).
    if (normalised.startsWith(`${p}.`)) return true;
  }
  return false;
}

/**
 * Filter helper for arrays of ECCN strings. Returns only those that
 * match the Supplement No. 2 scope.
 */
export function filterEligibleEccns(
  eccns: ReadonlyArray<string | null | undefined>,
): string[] {
  return eccns.filter((e): e is string => isEligibleEccn(e));
}
