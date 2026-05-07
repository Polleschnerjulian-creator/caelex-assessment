/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared types for sanctions-list source parsers (Wave A Sprint A2-A3).
 *
 * Each source (OFAC SDN, BIS Entity, DDTC Debarred, EU FSF, UK OFSI,
 * UN Consolidated) has its own parser file under `./{source}.ts`. They
 * all conform to the {@link SanctionsSourceParser} interface so the
 * sync orchestrator can iterate them uniformly.
 *
 * Pure functions wherever possible: parsers take raw text → return
 * canonical entries. Network I/O lives in the orchestrator
 * (sync.server.ts) so unit tests stay fast and deterministic.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { TradeSanctionsList } from "@prisma/client";

/**
 * Canonical sanctions entry — what every parser MUST produce regardless
 * of upstream format (CSV/XML/JSON). The fuzzy-match engine in Sprint A5
 * consumes this shape exclusively, never the raw upstream rows.
 */
export interface CanonicalSanctionsEntry {
  /**
   * Upstream-stable identifier for this entry. Stable across snapshots
   * — same person/entity always has the same entryId until OFAC removes
   * them from the list. Used for delta detection and audit citation.
   *
   * Examples:
   *   - OFAC SDN: "12345" (sdn_uid)
   *   - BIS Entity: "ENT-2024-001"
   *   - DDTC: "Smith, John|2023-04-12" (composite when no stable ID)
   */
  entryId: string;

  /**
   * Primary name + all AKAs (also-known-as), all canonicalized to
   * lowercase, accents stripped, punctuation normalized. The fuzzy-
   * match engine compares against TradeParty.canonicalName which uses
   * the same normalization function.
   *
   * Always at least one entry. First element is the primary name.
   */
  names: string[];

  /** Known addresses, grouped by country for fast country-filter queries. */
  addresses: SanctionsAddress[];

  /**
   * External identifiers (passport, VAT, LEI, IMO, ...) that enable
   * high-confidence exact matching when present in TradeParty record.
   */
  identifiers: SanctionsIdentifier[];

  /**
   * List-specific metadata that doesn't fit the canonical shape but
   * matters for the human reviewer when triaging a hit. Examples:
   *   - OFAC: program tags ["SDGT", "IRAN-EO13599"]
   *   - BIS: license requirement, license policy
   *   - DDTC: debarment date, end date
   *   - EU FSF: regulation reference (e.g. "1031/2024")
   */
  listMetadata: Record<string, unknown>;
}

export interface SanctionsAddress {
  /** ISO 3166-1 alpha-2, or "XX" if unknown/multi. */
  country: string;
  /** Free-form address lines as published by upstream. */
  lines: string[];
}

export interface SanctionsIdentifier {
  /**
   * Identifier type. Stable enum values:
   *   "passport" | "national_id" | "vat" | "lei" | "duns" | "cage"
   *   | "imo" | "swift_bic" | "tax_id" | "registration_number" | "other"
   */
  type: string;
  /** Identifier value as published. */
  value: string;
  /** ISO 3166-1 alpha-2 of issuing country, if known. */
  issuingCountry?: string;
}

/**
 * Each source-parser file exports one of these. Pure functions for
 * parsing; the `fetch` field exists as a contract but the orchestrator
 * may override it for tests.
 */
export interface SanctionsSourceParser {
  /** Which TradeSanctionsList this parser produces. */
  list: TradeSanctionsList;

  /** Default upstream URL — one canonical place to update if upstream changes. */
  defaultSourceUrl: string;

  /**
   * Parse raw upstream content (CSV/XML/JSON depending on source) into
   * canonical entries. PURE function — no I/O, no console.log. Throws
   * on malformed input so the cron retries cleanly.
   */
  parse(raw: string): CanonicalSanctionsEntry[];

  /**
   * Optional: extract upstream's own version/timestamp (e.g. OFAC
   * publishes a "Publish_Date" header). Returns undefined if the
   * source doesn't expose one — we fall back to fetchedAt.
   */
  extractUpstreamVersion?(raw: string): string | undefined;
}

// ─── Canonicalization helpers (used by ALL parsers + by TradeParty.canonicalName) ───

/**
 * Canonicalize a name string for fuzzy matching. Identical implementation
 * MUST be used wherever names are compared — TradeParty.canonicalName,
 * sanctions entry names, and the fuzzy-match engine inputs.
 *
 * Pipeline:
 *   1. lowercase
 *   2. strip diacritics (Müller → muller)
 *   3. strip business suffixes (sp. z o.o., GmbH, LLC, Ltd, Inc, ...)
 *   4. normalize whitespace
 *   5. strip leading/trailing punctuation
 */
export function canonicalizeName(input: string): string {
  if (!input) return "";

  let s = input.toLowerCase();

  // 1. Strip combining diacritics (NFD + remove non-spacing-mark range)
  s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");

  // 2. Strip common business suffixes (order matters — longest first)
  const suffixes = [
    "sp\\. z o\\.o\\.",
    "s\\.a\\.r\\.l\\.",
    "s\\.a\\.s\\.",
    "co\\.\\s*ltd",
    "pty\\s*ltd",
    "llc",
    "ltd",
    "inc",
    "corp",
    "gmbh",
    "ag",
    "kg",
    "ohg",
    "se",
    "plc",
    "n\\.v\\.",
    "b\\.v\\.",
    "s\\.a\\.",
    "s\\.p\\.a\\.",
    "s\\.r\\.l\\.",
    "oy",
    "ab",
    "as",
    "ooo",
    "zao",
    "oao",
    "pao",
  ];
  // Anchor at end-of-string allowing trailing periods OR whitespace.
  // Earlier drafts:
  //   - `\b\.?$` failed for suffixes ending in non-word "." (e.g. "sp. z o.o.")
  //     because `\b` requires a word/non-word transition that doesn't
  //     exist between two non-word chars.
  //   - `\s*$` failed for "Apple Inc." because the trailing "." after
  //     "inc" is neither whitespace nor end-of-string.
  // The `[.\s]*$` form accepts any mix of dots/spaces between suffix
  // and end, covering both "Inc.", "GmbH", and "sp. z o.o." cases.
  const suffixRe = new RegExp(`[\\s,.-]+(${suffixes.join("|")})[.\\s]*$`, "i");
  // Apply iteratively in case multiple suffixes ("XYZ Holdings, Inc., LLC")
  let prev: string;
  do {
    prev = s;
    s = s.replace(suffixRe, "");
  } while (s !== prev);

  // 3. Replace punctuation with space
  s = s.replace(/[^\p{L}\p{N}]+/gu, " ");

  // 4. Collapse whitespace + trim
  s = s.replace(/\s+/g, " ").trim();

  return s;
}
