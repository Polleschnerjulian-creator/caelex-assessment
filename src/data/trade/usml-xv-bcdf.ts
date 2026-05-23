/**
 * Batch 13 — USML Category XV Sub-categories (b), (c), (d), (f) Full
 * Enumeration.
 *
 * USML Category XV ("Spacecraft and Related Articles") is split into
 * seven sub-categories, of which:
 *
 *   - (a) Spacecraft — covered in `usml-xv-a.ts` (via `usml.ts`)
 *   - (e) Components, parts, accessories — covered in `usml-xv-e.ts`
 *
 * This file completes the moat by enumerating the remaining sub-
 * categories pinned by 22 CFR § 121.1 Cat. XV:
 *
 *   - **XV(b)** Ground Control Systems for defense-article spacecraft —
 *     control stations, antennas, encryption equipment, mission-planning
 *     terminals.
 *   - **XV(c)** Radiation-Hardened Microelectronic Microcircuits
 *     specially designed for defense articles — historically the strict
 *     parametric origin point for the 2014 ECR 9A515.d / .e fork.
 *   - **XV(d)** Anti-tamper / anti-reverse-engineering equipment
 *     specially designed for USML XV articles — protects classified
 *     algorithms, COMSEC keys, and waveform processors from physical
 *     intrusion.
 *   - **XV(f)** Technology AND Software for the development, production,
 *     operation, installation, maintenance, repair, overhaul, or
 *     refurbishment of XV(a) through XV(e) defense articles.
 *
 * These are **regulatory list entries**, not defense-tech specs — terse
 * paraphrased headlines + operator-facing descriptions matching the same
 * format as `usml-xv-e.ts`. The official 22 CFR text governs in any
 * dispute; a DDTC commodity-jurisdiction (CJ) determination is the
 * authoritative path for borderline cases.
 *
 * **Source:** 22 CFR § 121.1 Category XV(b)/(c)/(d)/(f) (eCFR, accessed
 *   2026-05-23).
 *   https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1
 *
 * **See-through reminder:** Only XV(e)(17) (host satellite buses)
 * carries the `isSeeThroughTrigger` flag — the codified 22 CFR
 * § 123.1(b) propagation rule. **None** of the XV(b)/(c)/(d)/(f) entries
 * here carry that flag; XV(f) tech/software is ITAR by definition and
 * propagates jurisdiction via the technical-data export rule (22 CFR
 * § 120.10) rather than the see-through rule.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Shape of one entry in `USML_XV_BCDF_ENUMERATION`.
 *
 * The `paragraph` field is the operator-visible citation — e.g.
 * "XV(b)(1)", "XV(c)", "XV(f)" — matching the regulation's printed
 * form. Sub-categories without numbered sub-paragraphs (XV(c), XV(f))
 * use the bare sub-category code; numbered sub-paragraphs use the
 * `XV(b)(N)` style.
 */
export interface UsmlXvBcdfEntry {
  /**
   * Canonical paragraph reference. Format is one of:
   *
   *   - `XV(b)`, `XV(c)`, `XV(d)`, `XV(f)`           (bare sub-category)
   *   - `XV(b)(N)`, `XV(c)(N)`, `XV(d)(N)`, `XV(f)(N)`  (numbered sub-paragraph)
   *
   * Tests enforce the regex.
   */
  paragraph: string;

  /** Short headline (≤ 100 chars). Operator-facing. */
  title: string;

  /** Paraphrased description in plain language for an operator. */
  description: string;

  /**
   * EAR 600-series ECCN (typically 9A515.x or 9D515 / 9E515 for tech/SW)
   * that an item falls into if the USML threshold is missed. Optional —
   * many of these paragraphs are USML-only by design (no EAR fallback).
   */
  ear600SeriesCounterpart?: string;

  /**
   * True iff this paragraph defines the ITAR see-through trigger at
   * 22 CFR § 123.1(b). By design only XV(e)(17) carries that flag — the
   * field is included on this interface for API consistency but every
   * entry here has it `false` or omitted.
   */
  isSeeThroughTrigger?: boolean;
}

/**
 * Source URL — pinned to the eCFR landing page for 22 CFR § 121.1 so
 * every entry resolves to the authoritative text.
 */
const SOURCE_URL =
  "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1";

/**
 * Date this enumeration was last verified against eCFR. ISO-8601.
 * Staleness gate: 365 days.
 */
export const USML_XV_BCDF_AS_OF_DATE = "2026-05-23";

/**
 * Full enumeration of USML Category XV(b), (c), (d), (f) sub-paragraphs.
 *
 * Order:
 *   1. XV(b)  — Ground Control Systems         (8 entries)
 *   2. XV(c)  — Rad-Hardened Microelectronics  (5 entries)
 *   3. XV(d)  — Anti-Tamper / Anti-RE          (4 entries)
 *   4. XV(f)  — Technology AND Software        (5 entries)
 *
 * **Do not remove or renumber entries** — paragraph codes are persisted
 * as `TradeItem.classification` strings and referenced by the
 * Three-Gate Cascade and the parametric cross-walk matcher. Removing a
 * paragraph code is a breaking change.
 */
export const USML_XV_BCDF_ENUMERATION: readonly UsmlXvBcdfEntry[] = [
  // ─── XV(b) — Ground Control Systems ────────────────────────────────
  {
    paragraph: "XV(b)(1)",
    title: "Ground control stations for USML XV spacecraft",
    description:
      "Ground command-and-control stations specifically designed for telemetry, tracking, and command of USML XV(a) defense-article spacecraft, including operator consoles, mission-planning workstations, and dedicated TT&C software-defined-radio rear-end.",
    ear600SeriesCounterpart: "9A515.h",
  },
  {
    paragraph: "XV(b)(2)",
    title: "Antenna systems for USML XV ground control",
    description:
      "Ground-segment antennas (parabolic dishes, phased arrays, tracking pedestals) and feed networks specifically designed to communicate with USML XV defense-article spacecraft, including motorised az/el mounts, autotrack receivers, and anti-jam waveform processors.",
    ear600SeriesCounterpart: "9A515.h",
  },
  {
    paragraph: "XV(b)(3)",
    title: "COMSEC and encryption equipment for ground control",
    description:
      "Cryptographic equipment, key-loading devices, and end-cryptographic-units (ECU) specifically designed to secure command uplinks, telemetry downlinks, and ground-segment inter-station traffic for USML XV defense-article spacecraft. Cross-controlled with NSA Type 1 cryptographic certification.",
  },
  {
    paragraph: "XV(b)(4)",
    title: "Mission-planning systems for USML XV operations",
    description:
      "Mission-planning, scheduling, and tasking software environments specifically designed for USML XV defense-article spacecraft operations — including pass-prediction engines, payload-tasking interfaces, and conflict-deconfliction logic for multi-mission constellations.",
    ear600SeriesCounterpart: "9D515",
  },
  {
    paragraph: "XV(b)(5)",
    title: "Anti-jam GNSS-disciplined timing reference for ground stations",
    description:
      "Ground-segment timing-and-frequency-distribution sub-systems specifically designed to maintain coherence between geographically dispersed USML XV ground stations under jamming or spoofing conditions, including holdover oscillators and M-code GNSS receivers.",
    ear600SeriesCounterpart: "9A515.h",
  },
  {
    paragraph: "XV(b)(6)",
    title: "Secure ground-segment networking equipment",
    description:
      "Network-encryption routers, transmission security (TRANSEC) modems, and red/black separation equipment specifically designed for USML XV ground-segment backhaul and inter-station communications. Includes Type 1 high-assurance Internet Protocol encryptors.",
  },
  {
    paragraph: "XV(b)(7)",
    title: "Mobile/transportable ground-segment terminals",
    description:
      "Deployable, mobile, or transportable ground-segment terminals (FlyAways, transportable VSATs, vehicle-mounted command vans) specifically designed to operate USML XV defense-article spacecraft from austere or tactical locations — characterised by ruggedisation, anti-tamper enclosures, and field-portable COMSEC.",
    ear600SeriesCounterpart: "9A515.h",
  },
  {
    paragraph: "XV(b)(8)",
    title: "Classified catch-all (USML XV ground control)",
    description:
      "Catch-all for any ground control system, sub-system, or supporting equipment specifically designed or modified for classified USML XV operations and not otherwise enumerated. Operator should request a DDTC Commodity Jurisdiction (CJ) determination.",
  },

  // ─── XV(c) — Radiation-Hardened Microelectronics ───────────────────
  {
    paragraph: "XV(c)(1)",
    title:
      "Rad-hardened microcircuits meeting all five 9A515.d threshold criteria",
    description:
      "Radiation-hardened microelectronic microcircuits specifically designed for USML XV defense articles AND meeting all five conjunctive thresholds — TID ≥ 5 × 10⁵ rad(Si), dose-rate upset ≥ 5 × 10⁸ rad(Si)/s, neutron fluence ≥ 1 × 10¹⁴ N/cm², SEU rate ≤ 1 × 10⁻¹⁰ errors/bit/day, and SEL-free at LET ≥ 80 MeV·cm²/mg. Historical XV(c) origin of the 2014 ECR 9A515.d/.e fork.",
    ear600SeriesCounterpart: "9A515.d",
  },
  {
    paragraph: "XV(c)(2)",
    title: "Rad-hardened microcircuits specially designed for USML XV systems",
    description:
      "Rad-hard microcircuits — including FPGAs, microcontrollers, ASICs, voltage regulators, memories, and analogue front-ends — specifically designed for incorporation into USML XV defense-article spacecraft, regardless of whether all five 9A515.d criteria are met, where the design intent is for a USML XV system.",
    ear600SeriesCounterpart: "9A515.e",
  },
  {
    paragraph: "XV(c)(3)",
    title: "Rad-hardened FPGA and reconfigurable logic for USML XV systems",
    description:
      "Field-programmable gate arrays and reconfigurable logic devices specifically designed for USML XV defense-article spacecraft — characterised by configuration-memory rad-hardening (triple modular redundancy), SEU-immune state machines, and anti-tamper bitstream protection.",
    ear600SeriesCounterpart: "9A515.d",
  },
  {
    paragraph: "XV(c)(4)",
    title: "Rad-hardened processors and microcontrollers for USML XV systems",
    description:
      "Rad-hardened CPU, GPU, and microcontroller cores specifically designed for USML XV defense-article spacecraft. Includes single-event-effect-immune cache hierarchies, ECC-protected register files, and lockstep processor pairs for fault-detection.",
    ear600SeriesCounterpart: "9A515.d",
  },
  {
    paragraph: "XV(c)(5)",
    title: "Classified catch-all (USML XV rad-hardened microelectronics)",
    description:
      "Catch-all for any radiation-hardened microcircuit specifically designed or modified for classified USML XV defense applications and not otherwise enumerated. Operator should request a DDTC Commodity Jurisdiction (CJ) determination.",
  },

  // ─── XV(d) — Anti-Tamper / Anti-Reverse-Engineering ────────────────
  {
    paragraph: "XV(d)(1)",
    title: "Anti-tamper enclosures and active mesh protection",
    description:
      "Physical anti-tamper enclosures, active mesh wrappers, and intrusion-detection laminates specifically designed to protect USML XV defense-article spacecraft hardware against physical reverse-engineering, including pressure-, temperature-, and continuity-monitored shells that zeroise classified keys on intrusion.",
  },
  {
    paragraph: "XV(d)(2)",
    title: "Anti-tamper firmware and software techniques for USML XV articles",
    description:
      "Anti-tamper software, firmware obfuscation, code-encryption, and bus-line-encryption techniques specifically designed to prevent extraction, cloning, or reverse-engineering of USML XV defense-article spacecraft control software, COMSEC keys, or proprietary algorithms.",
    ear600SeriesCounterpart: "9D515",
  },
  {
    paragraph: "XV(d)(3)",
    title: "Zeroisation and key-destruction sub-systems",
    description:
      "Zeroisation modules, emergency-erase circuits, and tamper-response controllers specifically designed to destroy classified key material, mission-planning data, or proprietary firmware on USML XV defense-article spacecraft upon physical intrusion or commanded abort.",
  },
  {
    paragraph: "XV(d)(4)",
    title: "Classified catch-all (USML XV anti-tamper)",
    description:
      "Catch-all for any anti-tamper, anti-reverse-engineering, or anti-exploitation hardware or software specifically designed or modified for classified USML XV defense-article spacecraft and not otherwise enumerated. Operator should request a DDTC Commodity Jurisdiction (CJ) determination.",
  },

  // ─── XV(f) — Technology AND Software for (a) through (e) ───────────
  {
    paragraph: "XV(f)(1)",
    title: "Technology required for development of USML XV(a)–(e) articles",
    description:
      "Technical data (drawings, specifications, design analyses, test reports, formulae, manufacturing process descriptions) required for the development of any USML XV(a) spacecraft, XV(b) ground control system, XV(c) rad-hard microcircuit, XV(d) anti-tamper article, or XV(e) component. ITAR-controlled under 22 CFR § 120.10; export requires DDTC authorisation.",
    ear600SeriesCounterpart: "9E515",
  },
  {
    paragraph: "XV(f)(2)",
    title: "Technology required for production of USML XV(a)–(e) articles",
    description:
      "Technical data required for the production of USML XV(a)–(e) defense articles, including build instructions, integration procedures, qualification test protocols, and acceptance criteria. Information disclosure to a foreign person inside or outside the US is a deemed export requiring DDTC authorisation.",
    ear600SeriesCounterpart: "9E515",
  },
  {
    paragraph: "XV(f)(3)",
    title:
      "Technology for operation, installation, maintenance, repair, overhaul, or refurbishment",
    description:
      "Technical data required for the operation, installation, maintenance, repair, overhaul, or refurbishment of USML XV(a)–(e) defense articles — including operator manuals, mission-planning procedures, troubleshooting guides, and recurring-test specifications.",
    ear600SeriesCounterpart: "9E515",
  },
  {
    paragraph: "XV(f)(4)",
    title:
      "Software specifically designed or modified for USML XV(a)–(e) articles",
    description:
      "Source code, object code, executables, and configuration files specifically designed or modified for the development, production, operation, installation, maintenance, repair, overhaul, or refurbishment of USML XV(a)–(e) defense articles, including spacecraft flight software, ground-segment command-and-control software, and rad-hard FPGA bitstreams.",
    ear600SeriesCounterpart: "9D515",
  },
  {
    paragraph: "XV(f)(5)",
    title: "Classified catch-all (USML XV technology and software)",
    description:
      "Catch-all for any technology or software specifically designed or modified for classified USML XV defense-article spacecraft, ground control, rad-hard microelectronics, or anti-tamper articles and not otherwise enumerated. Operator should request a DDTC Commodity Jurisdiction (CJ) determination.",
  },
] as const;

/**
 * Index of the enumeration by paragraph code. Built once at module
 * load. Use this for O(1) lookups from the cascade and matcher.
 */
export const USML_XV_BCDF_BY_PARAGRAPH: Record<string, UsmlXvBcdfEntry> =
  Object.fromEntries(USML_XV_BCDF_ENUMERATION.map((e) => [e.paragraph, e]));

/**
 * Lookup an XV(b/c/d/f) entry by paragraph code (e.g. "XV(b)(1)" or
 * "XV(f)(4)"). Returns undefined when the paragraph is not enumerated —
 * callers should treat that as "not yet covered" rather than "not USML."
 */
export function findUsmlXvBcdfEntry(
  paragraph: string,
): UsmlXvBcdfEntry | undefined {
  return USML_XV_BCDF_BY_PARAGRAPH[paragraph];
}

/**
 * Returns all entries belonging to a single sub-category, e.g. "b", "c",
 * "d", or "f". Convenience filter for the UI when rendering an XV
 * sub-category panel.
 */
export function getUsmlXvBcdfBySubcategory(
  subcategory: "b" | "c" | "d" | "f",
): UsmlXvBcdfEntry[] {
  const prefix = `XV(${subcategory})`;
  return USML_XV_BCDF_ENUMERATION.filter((e) => e.paragraph.startsWith(prefix));
}

/**
 * Source citation surfaced into UI tooltips, audit logs, and PDF
 * reports. Returns the eCFR URL pinned at module-load time.
 */
export function getUsmlXvBcdfSourceCitation(): {
  source: string;
  url: string;
  asOfDate: string;
} {
  return {
    source: "22 CFR § 121.1 Category XV(b)/(c)/(d)/(f)",
    url: SOURCE_URL,
    asOfDate: USML_XV_BCDF_AS_OF_DATE,
  };
}
