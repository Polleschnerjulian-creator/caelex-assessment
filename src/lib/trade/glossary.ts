/**
 * Caelex Trade — Compliance Glossary (shared source-of-truth).
 *
 * Single source of glossary entries consumed by:
 *   - `<TradeHelpCenter>` side-panel (Phase 4b)
 *   - `<Term>` inline tooltip component (Phase 5a, this file's reason)
 *
 * Why a separate module:
 *   Co-locating the glossary inside TradeHelpCenter.tsx made it hard
 *   to reuse for inline tooltips without circular-import gymnastics
 *   (the help-center is "use client", Term is "use client", but the
 *   underlying data is plain data — no React concerns).
 *
 * Lookup keys are canonicalised lowercase + alphanumeric so callers
 * can write `<Term>ECCN</Term>` or `<Term>eccn</Term>` and hit the
 * same entry. Multi-word terms like "AWG / AWV" use the canonical
 * form "awg" + "awv" — both keys resolve to the same entry.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface GlossaryEntry {
  /** Canonical display form, e.g. "ECCN" or "AWG / AWV". */
  term: string;
  /** One-sentence plain-English definition. */
  definition: string;
  /** Optional grouping for the help-center side-panel UI. */
  category?: string;
  /** Alternate lookup keys that resolve to this entry (lowercase). */
  aliases?: ReadonlyArray<string>;
}

export const GLOSSARY: ReadonlyArray<GlossaryEntry> = [
  {
    term: "AGG",
    definition:
      "German BAFA Allgemeine Genehmigung — collective export authorisation covering many shipments under one approval.",
    category: "Germany",
  },
  {
    term: "ALI list",
    definition:
      "German Ausfuhrliste (Annex AL) — national dual-use control list referencing EU Annex I + German additions.",
    category: "Germany",
    aliases: ["ali", "ausfuhrliste"],
  },
  {
    term: "AUKUS",
    definition:
      "Trilateral US/UK/AU defense pact. Triggers expanded ITAR licence-exception eligibility (e.g. § 126.7).",
    category: "Treaty",
  },
  {
    term: "AWG / AWV",
    definition:
      "German Außenwirtschaftsgesetz + Außenwirtschaftsverordnung — the foreign-trade law + ordinance.",
    category: "Germany",
    aliases: ["awg", "awv"],
  },
  {
    term: "BAFA",
    definition:
      "Bundesamt für Wirtschaft und Ausfuhrkontrolle — German federal export-control authority.",
    category: "Germany",
  },
  {
    term: "BIS",
    definition:
      "Bureau of Industry and Security (US Dept of Commerce) — administers EAR + CCL.",
    category: "United States",
  },
  {
    term: "CCL",
    definition:
      "Commerce Control List — the US EAR-controlled dual-use items list, indexed by ECCN.",
    category: "United States",
  },
  {
    term: "CSA",
    definition:
      "Country group exception under EAR — sub-Saharan / strategic-trade authorisation regime.",
    category: "United States",
  },
  {
    term: "DDTC",
    definition:
      "Directorate of Defense Trade Controls (US Dept of State) — administers ITAR + USML.",
    category: "United States",
  },
  {
    term: "De Minimis",
    definition:
      "US re-export rule: foreign-made items become subject to EAR only if US content > de minimis threshold (typically 25 % / 10 %).",
    category: "United States",
    aliases: ["deminimis"],
  },
  {
    term: "Deemed Export",
    definition:
      "Release of controlled technology to a foreign national INSIDE the US/EU treated as an export to their country of citizenship.",
    category: "General",
    aliases: ["deemed-export", "deemedexport"],
  },
  {
    term: "DSP-5 / DSP-73",
    definition:
      "DDTC permanent / temporary export license forms for ITAR-controlled defense articles.",
    category: "United States",
    aliases: ["dsp5", "dsp73", "dsp-5", "dsp-73"],
  },
  {
    term: "EAR",
    definition:
      "Export Administration Regulations (15 CFR §§730-774) — US dual-use export controls.",
    category: "United States",
  },
  {
    term: "ECCN",
    definition:
      "Export Control Classification Number — 5-character code identifying an item on the US CCL.",
    category: "United States",
  },
  {
    term: "ECJU",
    definition:
      "UK Export Control Joint Unit — administers SIEL / OIEL / OGEL licences.",
    category: "United Kingdom",
  },
  {
    term: "EUC",
    definition:
      "End-Use Certificate — counterparty declaration of end-user + end-use; required under § 17 AWV, 15 CFR § 748.10, EU Annex IV.",
    category: "Documentation",
  },
  {
    term: "FDPR",
    definition:
      "Foreign Direct Product Rule (EAR § 734) — extends US jurisdiction to foreign-made items derived from US technology / equipment.",
    category: "United States",
  },
  {
    term: "ITAR",
    definition:
      "International Traffic in Arms Regulations (22 CFR §§120-130) — US defense-article + service controls.",
    category: "United States",
  },
  {
    term: "LOS",
    definition:
      "French Loi sur les Opérations Spatiales — space-operations licensing regime with the ≤1×10⁻⁴ casualty-risk ceiling.",
    category: "France",
  },
  {
    term: "MTCR",
    definition:
      "Missile Technology Control Regime — 35-country multilateral export-control regime for missile + UAV technology.",
    category: "Multilateral",
  },
  {
    term: "NSG",
    definition:
      "Nuclear Suppliers Group — multilateral regime restricting nuclear + nuclear-related dual-use exports.",
    category: "Multilateral",
  },
  {
    term: "OFAC",
    definition:
      "Office of Foreign Assets Control (US Treasury) — administers SDN list + sanctions programmes.",
    category: "United States",
  },
  {
    term: "OFSI",
    definition:
      "Office of Financial Sanctions Implementation (UK Treasury) — UK sanctions consolidated list.",
    category: "United Kingdom",
  },
  {
    term: "USML",
    definition:
      "US Munitions List — the ITAR-controlled defense-article list, organised by Categories I-XXI.",
    category: "United States",
  },
  {
    term: "VSD",
    definition:
      "Voluntary Self-Disclosure to OFAC / BIS / DDTC / BAFA. Time-sensitive: OFAC 60d, BIS 90d, DDTC + BAFA 180d windows.",
    category: "Documentation",
  },
  {
    term: "Wassenaar",
    definition:
      "Wassenaar Arrangement — 42-country multilateral export-control regime for conventional arms + dual-use.",
    category: "Multilateral",
  },
];

// ─── Lookup map (built once at module-load) ───────────────────────────

const LOOKUP: Map<string, GlossaryEntry> = (() => {
  const m = new Map<string, GlossaryEntry>();
  for (const entry of GLOSSARY) {
    m.set(canonicalKey(entry.term), entry);
    for (const alias of entry.aliases ?? []) {
      m.set(canonicalKey(alias), entry);
    }
  }
  return m;
})();

/**
 * Look up a glossary entry by term or alias. Returns undefined when no
 * match — callers should render the term as plain text in that case.
 *
 * Case-insensitive, whitespace-tolerant.
 */
export function lookupTerm(term: string): GlossaryEntry | undefined {
  return LOOKUP.get(canonicalKey(term));
}

/** Canonicalise a lookup key — lowercase + collapse whitespace + strip
 *  punctuation that doesn't carry meaning ("AWG / AWV" → "awg / awv"
 *  vs. lookups for plain "awg" or "awv" which alias separately). */
function canonicalKey(raw: string): string {
  return raw.trim().toLowerCase();
}
