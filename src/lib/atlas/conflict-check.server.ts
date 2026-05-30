/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Mandate — Conflict-of-Interest core.
 *
 * Pure, deterministic, €0-external conflict detection across an org's
 * mandates. The pure functions (normalizePartyName, namesMatch,
 * classifyConflict) are split from the Prisma-touching detectConflicts so
 * the logic is unit-testable without a DB.
 *
 * Spec: docs/superpowers/specs/2026-05-30-atlas-mandate-conflict-check-design.md
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

export type ConflictSeverity = "high" | "medium" | "info";

/** Lower-cased legal-form tokens stripped during name normalisation so
 *  "Spire Global Inc" and "Spire Global LLC" compare equal. Periods are
 *  removed before tokenising, so "S.A." → "sa", "B.V." → "bv". */
const LEGAL_FORM_TOKENS: ReadonlySet<string> = new Set([
  "inc",
  "llc",
  "ltd",
  "limited",
  "corp",
  "corporation",
  "co",
  "company",
  "gmbh",
  "mbh",
  "ag",
  "kg",
  "ohg",
  "gbr",
  "ug",
  "se",
  "sa",
  "spa",
  "bv",
  "nv",
  "plc",
  "sarl",
  "sl",
  "srl",
  "oy",
  "ab",
  "as",
  "kk",
  "pty",
  "llp",
  "lp",
]);

const JACCARD_THRESHOLD = 0.85;

/**
 * Normalise a free-text party name to a comparable canonical form:
 * NFKC → lowercase → drop periods (keeps "S.A." → "sa") → other
 * punctuation to spaces → strip legal-form tokens → collapse whitespace.
 */
export function normalizePartyName(name: string): string {
  return (name ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !LEGAL_FORM_TOKENS.has(t))
    .join(" ");
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter(Boolean));
}

/**
 * True when two raw names refer to the same entity: exact match after
 * normalisation, or token-set Jaccard similarity ≥ 0.85 (catches word
 * order and minor extra tokens). Empty normalisations never match.
 */
export function namesMatch(a: string, b: string): boolean {
  const na = normalizePartyName(a);
  const nb = normalizePartyName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const sa = tokenSet(na);
  const sb = tokenSet(nb);
  let intersection = 0;
  for (const t of sa) if (sb.has(t)) intersection++;
  const union = sa.size + sb.size - intersection;
  if (union === 0) return false;
  return intersection / union >= JACCARD_THRESHOLD;
}

/**
 * The conflict matrix. Returns the severity for an adverse pairing between
 * a newly-added party and an existing party (same normalised name), or
 * null when the pairing is not a conflict of interest.
 */
export function classifyConflict(args: {
  newType: string;
  existingType: string;
  existingClosed: boolean;
}): ConflictSeverity | null {
  const { newType, existingType, existingClosed } = args;
  // Acting against a client (the classic conflict).
  if (newType === "opponent" && existingType === "client") {
    return existingClosed ? "medium" : "high";
  }
  // Representing someone we actively oppose elsewhere.
  if (newType === "client" && existingType === "opponent" && !existingClosed) {
    return "medium";
  }
  // Same client across multiple matters — informational, not adverse.
  if (newType === "client" && existingType === "client") {
    return "info";
  }
  // authority / co_counsel / other and all remaining combinations are not
  // adverse by nature → not flagged.
  return null;
}
