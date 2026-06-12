/**
 * Data-Sprint S4 — EU Common Military List (space slice).
 *
 * The EU Common Military List ("Gemeinsame Militärgüterliste der EU") is the
 * military-goods counterpart to the EU dual-use Annex I (Reg. 2021/821). It is
 * adopted ANNUALLY by the Council as a notice in the OJ C series under Council
 * Common Position 2008/944/CFSP, and EU member states transpose it into their
 * national military-goods control lists (Germany: Teil I A of the Ausfuhrliste;
 * France: the AMA list — see the FR-AMA delta note in coverage). A satellite,
 * launcher or EO operator seated in the EU touches this list on the MILITARY
 * leg whenever an item is "specially designed or modified for military use".
 *
 * ─── EDITION (current, in force) ─────────────────────────────────────────
 *   Adopted by the Council on **23 February 2026**.
 *   Published OJ C/2026/1640, **13 March 2026** (CELEX 52026XG01640).
 *   Supersedes the list adopted 24 February 2025 (OJ C/2025/1499).
 *
 * ─── WHY THESE ML POSITIONS ARE THE SPACE SLICE (verified against the text) ─
 * The Council list defines 22 positions (ML1–ML22). The spec FORBIDS pre-
 * claiming which are space-relevant — each was determined FROM the 2026 text:
 *
 *   • ML4  — "Bombs, torpedoes, rockets, missiles, …". ML4.a explicitly lists
 *            "rockets, … missiles, … specially designed for military use" —
 *            the military rocket/missile munitions position (launcher-adjacent,
 *            MTCR-shadowed).
 *   • ML10 — "Aircraft, lighter-than-air vehicles, UAVs, aero-engines,
 *            sub-orbital craft …". ML10.j is a dedicated "'Sub-orbital craft'
 *            and related equipment" sub-position — the only ML10 leg in the
 *            space slice (the aircraft/UAV legs are NOT space, see excluded).
 *   • ML11 — "Electronic equipment, spacecraft and components, not specified
 *            elsewhere …". THE space-munitions position. ML11.c is the explicit
 *            "'Spacecraft' specially designed or modified for military use, and
 *            'spacecraft' components specially designed for military use" — the
 *            EU equivalent of USML Cat XV / Wassenaar ML11 / UK ML11. ML11.b is
 *            a counter-GNSS jamming position ("hinder … 'satellite navigation
 *            systems'").
 *   • ML15 — "Imaging or countermeasure equipment … specially designed for
 *            military use" — the military-EO position pairing with dual-use
 *            6A002/6A003 (recorders, cameras, image-intensifier, IR/thermal,
 *            imaging-radar).
 *   • ML18 — "Production equipment, environmental test facilities …" for items
 *            on the List — the military manufacturing / AIT-infrastructure
 *            position.
 *   • ML19 — "Directed Energy Weapon (DEW) systems …" (laser, particle-beam,
 *            high-power RF) — space-based / anti-satellite DEW relevance.
 *   • ML20 — "Cryogenic and superconductive equipment …". ML20.a explicitly
 *            covers equipment "configured to be installed in a vehicle for
 *            military … or SPACE applications" — the cryo-cooled space
 *            sensor/electronics position.
 *   • ML21 — "Software" for the development/production/use of List items — the
 *            military software shadow covering satellite/launcher mission SW.
 *   • ML22 — "Technology" for the development/production/use of List items —
 *            the technology-transfer / deemed-export shadow.
 *
 * ─── EDITORIAL RULES (same bar as the sibling control-list files) ─────────
 *   - codes are EXACT as the 2026 Council list structures them (position +
 *     sub-letter, e.g. "ML11.c", "ML20.a");
 *   - descriptions are conservative PARAPHRASES of the control text — NOT
 *     verbatim copies — and defer to the position's own "specially designed"
 *     scope rather than restating every sub-clause;
 *   - suggestion-level data: the matcher surfaces these as candidates for HUMAN
 *     review, never as legal determinations.
 *
 * ─── HONEST SCOPE (see EU_CML_COVERAGE.excluded) ──────────────────────────
 * This is the SPACE SLICE, not the whole list. The non-space ML positions
 * (ML1–ML3 small arms/ammunition, ML5–ML9, ML12–ML14, ML16, ML17), and the
 * non-space sub-paragraphs of the curated positions (e.g. ML10's aircraft/UAV
 * legs, ML4's bombs/torpedoes/mines), are NOT enumerated — declared in
 * `EU_CML_COVERAGE.excluded`. The curated positions sit at headline /
 * sub-position depth (depthTier 2), NOT at the full sub-clause depth of the
 * dual-use Annex I files.
 *
 * Source: EU Common Military List adopted by the Council on 23 February 2026.
 *   OJ C/2026/1640 (13 March 2026). CELEX 52026XG01640.
 *   ELI:  https://eur-lex.europa.eu/eli/C/2026/1640/oj/eng
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** Official EUR-Lex ELI URL for the 2026 Common Military List. */
const ELI_URL = "https://eur-lex.europa.eu/eli/C/2026/1640/oj/eng";

/**
 * As-of date = verification date (the schema contract used across the trade
 * corpus). The EU SOURCE EDITION date is 2026-02-23 (Council adoption),
 * published 2026-03-13 — both recorded in the header and `EU_CML_COVERAGE`.
 * This `asOfDate` records when the Passage entries were checked against that
 * edition.
 */
export const EU_CML_AS_OF = "2026-06-13";

/** The Council adoption date of the curated edition. */
export const EU_CML_ADOPTION_DATE = "2026-02-23";

/** The OJ C publication date of the curated edition. */
export const EU_CML_PUBLICATION_DATE = "2026-03-13";

/** CELEX identifier of the curated edition. */
export const EU_CML_CELEX = "52026XG01640";

/**
 * EU CML control-reason vocabulary. The Common Military List itself does NOT
 * print multilateral regime code-letters the way the UK consolidated list does
 * (it is a single CFSP instrument), so we tag only the multilateral context
 * that is unambiguous from the position's subject matter:
 *   MIL = military-goods control (the default — every CML position is a
 *         munitions control under CP 2008/944/CFSP)
 *   MT  = MTCR-shadowed (rocket/missile/launcher subject matter — ML4)
 * We never fabricate a reason the position does not carry.
 */
export type EuCmlControlReason = "MIL" | "MT";

/**
 * One EU Common Military List entry (space slice).
 *
 * Distinct from `ClassificationEntry` (whose `jurisdiction` enum does not
 * include the EU Common Military List) — mirrors how `UkStrategicEntry` /
 * `WassenaarEntry` carry their own shape. The constant `regime: "EU_CML"` tags
 * it for the normalized corpus.
 */
export interface EuCmlEntry {
  /** Code exactly as the 2026 Council list structures it (e.g. "ML11.c"). */
  code: string;

  /** Constant tag for the normalized-corpus regime. */
  regime: "EU_CML";

  /** Short headline (≤ 100 chars). */
  title: string;

  /** Paraphrased plain-English description. NOT verbatim regulatory text. */
  description: string;

  /** Control-reason tags derived from the position's subject matter. */
  controlReason: EuCmlControlReason[];

  /**
   * Curation depth: 2 = sub-position/headline level (the depth this slice
   * curates), matching the corpus `depthTier` contract. Headline-only rows and
   * curated sub-positions both sit at Tier 2 here (the EU CML is not modelled
   * to the dual-use Annex I's full sub-clause depth).
   */
  depthTier: 2;

  sourceUrl: string;
  asOfDate: string;
  notes?: string;
}

// ════════════════════════════════════════════════════════════════════════
// Space-relevant ML positions (EU CML 2026, OJ C/2026/1640).
// Codes verified present in the source; descriptions paraphrase the text.
// ════════════════════════════════════════════════════════════════════════

export const EU_CML_ENTRIES: EuCmlEntry[] = [
  // ─── ML4 — Bombs, torpedoes, rockets, missiles ─────────────────────
  {
    code: "ML4",
    regime: "EU_CML",
    title: "Bombs, torpedoes, rockets, missiles and related equipment",
    description:
      "The military rocket/missile munitions position: bombs, torpedoes, " +
      "rockets, missiles, other explosive devices and charges and related " +
      "equipment and accessories specially designed for military use. The " +
      "launcher-adjacent munitions headline; MTCR-shadowed for the rocket/" +
      "missile subject matter.",
    controlReason: ["MIL", "MT"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML4.a",
    regime: "EU_CML",
    title: "Rockets and missiles specially designed for military use",
    description:
      "Bombs, torpedoes, grenades, smoke canisters, rockets, mines, missiles, " +
      "depth charges, demolition charges/devices/kits, pyrotechnic devices, " +
      "cartridges and submunitions therefor, and simulators, specially designed " +
      "for military use. The space-relevant fragment is the military rocket/" +
      "missile leg (launch-vehicle and missile hardware).",
    controlReason: ["MIL", "MT"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
    notes:
      "Space slice is the rocket/missile fragment; the bombs/torpedoes/mines fragment is military-munitions, not space.",
  },
  {
    code: "ML4.b",
    regime: "EU_CML",
    title: "Handling, control and launching equipment for ML4.a items",
    description:
      "Equipment specially designed for military use and specially designed for " +
      "'activities' relating to items in ML4.a or to improvised explosive " +
      "devices — the launch / handling / fire-control equipment leg that pairs " +
      "with the rocket/missile hardware.",
    controlReason: ["MIL", "MT"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },

  // ─── ML10 — Aircraft, sub-orbital craft ────────────────────────────
  {
    code: "ML10",
    regime: "EU_CML",
    title: "Aircraft, UAVs, aero-engines and sub-orbital craft (headline)",
    description:
      "Aircraft, lighter-than-air vehicles, Unmanned Aerial Vehicles, aero-" +
      "engines, 'sub-orbital craft' and aircraft equipment, related equipment " +
      "and components specially designed or modified for military use. Only the " +
      "sub-orbital-craft leg (ML10.j) is in the space slice.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML10.j",
    regime: "EU_CML",
    title: "Sub-orbital craft and related equipment",
    description:
      "'Sub-orbital craft' and related equipment and specially designed or " +
      "modified components therefor — the dedicated military sub-orbital " +
      "platform position (suborbital launch / reusable suborbital vehicles). " +
      "The space-relevant ML10 leg.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },

  // ─── ML11 — Electronic equipment, spacecraft, sat-nav jamming ──────
  {
    code: "ML11",
    regime: "EU_CML",
    title: "Electronic equipment, spacecraft and components (headline)",
    description:
      "Electronic equipment, 'spacecraft' and components not specified " +
      "elsewhere on the EU Common Military List — the catch-all military " +
      "electronics-and-spacecraft position. Its sub-positions carry the " +
      "explicit spacecraft (ML11.c) and counter-satellite-navigation (ML11.b) " +
      "legs.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML11.a",
    regime: "EU_CML",
    title: "Military electronic equipment not specified elsewhere",
    description:
      "Electronic equipment specially designed for military use and specially " +
      "designed components therefor, not specified elsewhere on the List — the " +
      "residual military-electronics leg (e.g. military avionics/comms boxes " +
      "embedded in space and ground segments).",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML11.b",
    regime: "EU_CML",
    title: "Satellite-navigation jamming equipment (counter-GNSS)",
    description:
      "Jamming equipment designed or modified to hinder the reception, " +
      "operation or effectiveness of positioning, navigation or timing services " +
      "provided by 'satellite navigation systems' (GNSS), and specially designed " +
      "components — the counter-GNSS electronic-warfare leg.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML11.c",
    regime: "EU_CML",
    title: "Military spacecraft and components (the space-munitions position)",
    description:
      "'Spacecraft' specially designed or modified for military use, and " +
      "'spacecraft' components specially designed for military use. THE explicit " +
      "EU military-spacecraft position — the Common Military List equivalent of " +
      "USML Category XV, Wassenaar ML11 and UK Military List ML11. A military or " +
      "dual-use-flagged satellite/bus and its specially designed components fall " +
      "here.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },

  // ─── ML15 — Military imaging and countermeasure equipment ──────────
  {
    code: "ML15",
    regime: "EU_CML",
    title: "Military imaging and countermeasure equipment (headline)",
    description:
      "Imaging or countermeasure equipment specially designed for military use " +
      "and specially designed components — the military-EO position pairing with " +
      "dual-use 6A002/6A003. Sub-positions: recorders/image-processing, cameras, " +
      "image-intensifier, IR/thermal imaging and imaging-radar sensors.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML15.d",
    regime: "EU_CML",
    title: "Infrared or thermal imaging equipment (military)",
    description:
      "Infrared or thermal imaging equipment specially designed for military " +
      "use — the military thermal-IR payload leg (military EO/IR satellite and " +
      "airborne sensors).",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML15.e",
    regime: "EU_CML",
    title: "Imaging radar sensor equipment (military)",
    description:
      "Imaging radar sensor equipment specially designed for military use — the " +
      "military synthetic-aperture-radar (SAR) leg that pairs with civil/dual-use " +
      "SAR payloads.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },

  // ─── ML18 — Production equipment and test facilities ───────────────
  {
    code: "ML18",
    regime: "EU_CML",
    title: "Production equipment and environmental test facilities (headline)",
    description:
      "Equipment and environmental test facilities specially designed for the " +
      "production or testing of items on the EU Common Military List — the " +
      "military manufacturing / assembly-integration-test (AIT) infrastructure " +
      "position.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML18.a",
    regime: "EU_CML",
    title: "Production equipment for EU Common Military List items",
    description:
      "Equipment specially designed or modified for the 'production' of items " +
      "specified in the EU Common Military List, and specially designed " +
      "components — the military-production-line leg (e.g. tooling for military " +
      "spacecraft/launcher hardware).",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML18.b",
    regime: "EU_CML",
    title: "Environmental test facilities for EU Common Military List items",
    description:
      "Environmental test facilities specially designed for the certification, " +
      "qualification or testing of items specified in the EU Common Military " +
      "List, and specially designed components — the military thermal-vacuum / " +
      "vibration / EMC qualification-test leg.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },

  // ─── ML19 — Directed-energy weapon systems ─────────────────────────
  {
    code: "ML19",
    regime: "EU_CML",
    title: "Directed-energy weapon (DEW) systems (headline)",
    description:
      "Directed Energy Weapon (DEW) systems, related or countermeasure " +
      "equipment and test models — laser, particle-beam and high-power radio-" +
      "frequency weapon systems. Space relevance: space-based and anti-satellite " +
      "directed-energy systems.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML19.a",
    regime: "EU_CML",
    title: "Laser weapon systems",
    description:
      "'Laser' 'weapon systems' (other than those specified in ML19.f) — high-" +
      "energy laser directed-energy systems with anti-satellite / space-defence " +
      "relevance.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML19.c",
    regime: "EU_CML",
    title: "High-power radio-frequency weapon systems",
    description:
      "High-power Radio-Frequency (RF) 'weapon systems' — directed-energy RF " +
      "systems capable of disrupting or damaging electronics, including space " +
      "and counter-space applications.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },

  // ─── ML20 — Cryogenic and superconductive equipment ────────────────
  {
    code: "ML20",
    regime: "EU_CML",
    title: "Cryogenic and superconductive equipment (headline)",
    description:
      "Cryogenic and 'superconductive' equipment and specially designed " +
      "components and accessories — the cryo-cooled military sensor/electronics " +
      "position. Its ML20.a sub-position explicitly covers space applications.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML20.a",
    regime: "EU_CML",
    title: "Cryogenic equipment configured for space applications",
    description:
      "Equipment specially designed or configured to be installed in a vehicle " +
      "for military ground, marine, airborne or SPACE applications, capable of " +
      "operating while in motion and of producing or maintaining temperatures " +
      "below 103 K (-170 °C) — the explicit space cryo-cooling leg (cryo-cooled " +
      "IR/thermal payloads and superconducting electronics on spacecraft).",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML20.b",
    regime: "EU_CML",
    title: "Superconductive electrical equipment for military vehicles",
    description:
      "'Superconductive' electrical equipment (rotating machinery or " +
      "transformers) specially designed for installation in a military vehicle " +
      "and capable of operating while in motion — the superconducting power/" +
      "machinery leg.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },

  // ─── ML21 — Military software shadow ───────────────────────────────
  {
    code: "ML21",
    regime: "EU_CML",
    title: "Military software (headline)",
    description:
      "'Software' specially designed or modified for the development, " +
      "production, operation or maintenance of equipment or materials specified " +
      "in the EU Common Military List, plus specific military weapon-system " +
      "modelling and cyber-operations software — the military-software shadow of " +
      "the hardware positions (satellite/launcher mission software).",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML21.a",
    regime: "EU_CML",
    title: "Software for development/production/use of EU CML items",
    description:
      "'Software' specially designed or modified for the 'development', " +
      "'production', operation or maintenance of equipment or materials " +
      "specified in the EU Common Military List — the software leg that shadows " +
      "ML11 spacecraft and ML4 missile hardware.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },

  // ─── ML22 — Military technology shadow ─────────────────────────────
  {
    code: "ML22",
    regime: "EU_CML",
    title: "Military technology (headline)",
    description:
      "'Technology' required for the development, production, operation, " +
      "installation, maintenance, repair, overhaul or refurbishing of items " +
      "specified in the EU Common Military List (subject to the List's General " +
      "Technology Note) — the technology-transfer / deemed-export shadow.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
  {
    code: "ML22.a",
    regime: "EU_CML",
    title: "Technology required for EU CML items (General Technology Note)",
    description:
      "'Technology' required for the 'development', 'production', operation, " +
      "installation, maintenance (checking), repair, overhaul or refurbishing of " +
      "items specified in the EU Common Military List — the technology leg that " +
      "governs transfer of military spacecraft/launcher know-how.",
    controlReason: ["MIL"],
    depthTier: 2,
    sourceUrl: ELI_URL,
    asOfDate: EU_CML_AS_OF,
  },
];

// ════════════════════════════════════════════════════════════════════════
// Coverage + helpers
// ════════════════════════════════════════════════════════════════════════

export interface EuCmlCoverage {
  regime: "EU_CML";
  scope: string;
  excluded: string[];
  asOfDate: string;
  adoptionDate: string;
  publicationDate: string;
  celex: string;
  officialPositionsTotal: number;
  caelexCoverageCount: number;
}

export const EU_CML_COVERAGE: EuCmlCoverage = {
  regime: "EU_CML",
  scope:
    "Space slice of the EU Common Military List adopted by the Council on " +
    "23 February 2026 (OJ C/2026/1640, CELEX 52026XG01640). Covers the space-" +
    "relevant military positions at headline / sub-position depth: ML4 (rockets/" +
    "missiles), ML10.j (sub-orbital craft), ML11 (electronic equipment + the " +
    "explicit ML11.c spacecraft position + ML11.b counter-GNSS jamming), ML15 " +
    "(military imaging incl. IR/thermal and imaging-radar), ML18 (production/" +
    "test facilities), ML19 (directed-energy weapons), ML20 (cryogenic/" +
    "superconductive incl. the explicit ML20.a space-applications sub-position), " +
    "ML21 (software shadow) and ML22 (technology shadow). Each code was verified " +
    "present in the 2026 Council list; descriptions paraphrase the control text.",
  excluded: [
    "Non-space ML positions ML1–ML3 (small arms, larger-calibre weapons, ammunition), ML5–ML9 (fire-control, ground vehicles, CBRN, energetic materials, vessels of war), ML12–ML14 (kinetic-energy weapons, armour, training equipment), ML16 (forgings/castings) and ML17 (miscellaneous equipment/libraries) — not space-relevant",
    "ML10 aircraft / lighter-than-air / UAV / aero-engine sub-paragraphs — only the ML10.j sub-orbital-craft leg is in the space slice",
    "ML4 bombs / torpedoes / mines / depth-charges fragments — only the rocket/missile leg of ML4.a is space-relevant",
    "Full sub-clause depth of every curated position (the numbered sub-sub-paragraphs, parameter thresholds and decontrol notes) — curated at headline / sub-position depth (depthTier 2) only; the dual-use Annex I sibling files carry the parametric depth",
    "The list's defining 'Note', 'Technical Note', 'NB' cross-references and the General Software / General Technology Notes — represented by deferring to each position's own scope rather than restating them",
    "ML7 RCAs / radioactive materials and ML8 energetic materials — propellant/CBRN substances are out of the space slice (dual-use propellant chemistry sits in the MTCR/EU Annex I siblings)",
  ],
  asOfDate: EU_CML_AS_OF,
  adoptionDate: EU_CML_ADOPTION_DATE,
  publicationDate: EU_CML_PUBLICATION_DATE,
  celex: EU_CML_CELEX,
  // The full Common Military List runs ML1–ML22 with hundreds of sub-clauses;
  // this is the space slice (10 of the 22 positions, at sub-position depth).
  officialPositionsTotal: 22,
  caelexCoverageCount: 0, // set just below to the real length (single source of truth)
};
// Single source of truth: derive the coverage count from the actual array so
// the count can never drift from the data (the test asserts they match).
EU_CML_COVERAGE.caelexCoverageCount = EU_CML_ENTRIES.length;

/** Case-insensitive exact-code lookup. */
export function findEuCmlEntry(code: string): EuCmlEntry | undefined {
  const needle = code.trim().toUpperCase();
  return EU_CML_ENTRIES.find((e) => e.code.toUpperCase() === needle);
}

/** Short citation for UI / provenance surfaces. */
export function getEuCmlSourceCitation(): string {
  return `EU Common Military List adopted by the Council on ${EU_CML_ADOPTION_DATE} (OJ C/2026/1640, CELEX ${EU_CML_CELEX}). ${ELI_URL}`;
}
