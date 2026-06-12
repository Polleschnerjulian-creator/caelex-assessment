/**
 * Data-Sprint S2 — USML Category IV Full Paragraph Enumeration.
 *
 * USML (United States Munitions List) **Category IV** —
 * "Launch Vehicles, Guided Missiles, Ballistic Missiles, Rockets,
 * Torpedoes, Bombs, and Mines" — is the ITAR category that captures the
 * **launch-vehicle and rocket-propulsion spine**. For a space exporter it
 * is the single most consequential munitions category after Category XV
 * (spacecraft): a complete SLV, an individual rocket stage, a rocket motor
 * above the MTCR total-impulse threshold, a re-entry vehicle, a propellant
 * tank, a payload fairing, an interstage — all live here.
 *
 * This file is the **structured reference enumeration** of Category IV at
 * paragraph and sub-paragraph depth. It mirrors the paragraph-keyed shape of
 * `usml-xv-e.ts` so the `adaptUsmlXv`-family adapter in
 * `normalized-corpus.ts` consumes it unchanged (the adapter reads
 * `paragraph`, `title`, `description`, `ear600SeriesCounterpart?`,
 * `itarSME?`, `isSeeThroughTrigger?`, `sourceUrl?`).
 *
 * ─── SPACE FOCUS (and honest scope) ───────────────────────────────────
 * Category IV is broader than space: it also lists torpedoes, depth
 * charges, land/naval mines, grenades, MANPADS, anti-tank missiles and
 * non-nuclear warheads. Those paragraphs are REAL Category IV paragraphs
 * and are therefore enumerated here (omitting them would misrepresent the
 * category), but they are given **headline-level descriptions** with an
 * explicit note — they are not the space surface. The launch-vehicle,
 * SLV, rocket-stage, power-plant and (h) parts/components paragraphs are
 * curated at full operator depth. This split is declared in
 * `USML_IV_COVERAGE` below.
 *
 * ─── SME (Significant Military Equipment) ──────────────────────────────
 * The eCFR text marks Significant Military Equipment with a leading
 * asterisk. In Category IV exactly these paragraphs are asterisked:
 *   * (a)  — rockets/SLVs/missiles/bombs/torpedoes/mines/grenades
 *   * (b)  — launchers
 *   * (d)  — rocket/SLV/missile power plants
 *   * (g)  — non-nuclear warheads
 *   * (30) — the classified catch-all under (h)
 * Those carry `itarSME: true` here. No other paragraph is asterisked, so
 * none other carries the flag (SME is never fabricated).
 *
 * ─── Cross-references already wired ────────────────────────────────────
 * The parametric cross-walk (`control-list-cross-walk.ts`) already carries
 * the hard total-impulse tripwires `USML:IV(d)(2)` (≥ 1.1×10⁶ N·s, MTCR
 * Cat I) and `USML:IV(d)(3)` (8.41×10⁵–1.1×10⁶ N·s, MTCR Cat II band), plus
 * `USML:IV(a)(1)` (≥500 kg @ ≥300 km). This file does not duplicate those
 * predicates — it supplies the human-readable paragraph corpus that the
 * code/keyword matcher (`corpus-code-matcher.ts`) resolves declared codes
 * against.
 *
 * **Supersession note:** the headline file `usml.ts` (USML_ENTRIES) carries
 * six COARSE Cat IV entries (IV(a)(1), IV(b), IV(c), IV(d)(1), IV(d)(2),
 * IV(h)(1)) from an earlier wave, all under the same `USML` regime and the
 * same `USML:IV(...)` canonicalId scheme. To avoid the de-dup keeping the
 * coarse version, this file is concatenated into the union **before**
 * `usml.ts`, so these richer paragraph-depth entries win the de-dup for the
 * overlapping codes; the coarse `usml.ts` duplicates become dead (dropped by
 * the union's `seen`-set) but are left in place because `usml.ts` exports
 * `findUsmlEntry` and a coverage count consumed elsewhere. Documented in
 * `normalized-corpus.ts` at the union assembly.
 *
 * **Source:** 22 CFR § 121.1 Category IV. Retrieved from the eCFR official
 *   versioner API (free, authoritative), title-22 issue date **2026-06-09**
 *   (up to date as of 2026-06-10).
 *   https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1
 *
 * **Not** a verbatim transcription. Descriptions are paraphrases for an
 * operator audience. The official regulatory text governs in any dispute; a
 * DDTC commodity-jurisdiction (CJ) determination is the authoritative path
 * for borderline cases. "(MT)" markers from the source flag paragraphs the
 * regulation ties to MTCR Category I/II — preserved in the descriptions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Shape of one entry in `USML_IV_ENUMERATION`.
 *
 * Identical to the XV(e) family shape (so the shared adapter works) with the
 * `paragraph` field carrying the Category IV citation, e.g. "IV(a)(1)",
 * "IV(d)(2)", "IV(h)(30)(i)".
 */
export interface UsmlIvEntry {
  /**
   * Canonical paragraph reference. One of:
   *   - `IV(a)` … `IV(x)`                (bare sub-category / headline)
   *   - `IV(a)(1)` … `IV(h)(30)`         (numbered sub-paragraph)
   *   - `IV(h)(30)(i|ii|iii)`            (deep sub-paragraph)
   *   - `IV(e)-(f)`, `IV(j)-(w)`         (reserved spans, kept honest)
   * Tests enforce the `/^IV\([a-z]\)/` regex.
   */
  paragraph: string;

  /** Short headline (≤ 100 chars). Operator-facing. */
  title: string;

  /** Paraphrased description in plain language for an operator. */
  description: string;

  /**
   * EAR 600-series ECCN cross-referenced by the source for this paragraph
   * (Category IV only cross-references the 0x604 / 9x604 missile 600-series
   * for technical data and the EAR catch-all). Optional — most Cat IV
   * paragraphs are USML-only by design.
   */
  ear600SeriesCounterpart?: string;

  /**
   * True iff the eCFR text asterisks this paragraph as Significant Military
   * Equipment (SME). Asterisked in Cat IV: (a), (b), (d), (g), and the
   * (h)(30) classified catch-all (incl. its (i)/(ii)/(iii) sub-items).
   */
  itarSME?: boolean;

  /**
   * 22 CFR § 123.1(b) see-through trigger flag. No Category IV paragraph is
   * the codified see-through trigger (that is USML XV(e)(17)); the field is
   * present only for shape-compatibility with the shared adapter and is
   * omitted on every entry here.
   */
  isSeeThroughTrigger?: boolean;
}

/**
 * Coverage metadata — declares exactly what this file represents and what it
 * deliberately keeps at headline depth (the non-space weapon paragraphs).
 */
export interface UsmlIvCoverage {
  jurisdiction: "USML";
  category: "IV";
  scope: string;
  excluded: string[];
  asOfDate: string;
  /** eCFR title-22 issue date the text was retrieved at. */
  ecfrIssueDate: string;
  caelexCoverageCount: number;
}

/**
 * Source URL — pinned to the eCFR landing page for 22 CFR § 121.1 so every
 * entry resolves to the authoritative text (the eCFR keeps historical
 * versions accessible via the date selector).
 */
const SOURCE_URL =
  "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1";

/**
 * Date this enumeration was last verified against the eCFR text. ISO-8601.
 * Tests reject the file if older than 365 days (matches the staleness gate
 * the other classification files use). Distinct from `ECFR_ISSUE_DATE`,
 * which is the regulation's own issue date.
 */
export const USML_IV_AS_OF_DATE = "2026-06-13";

/** eCFR title-22 issue date the Category IV text was retrieved at. */
export const ECFR_ISSUE_DATE = "2026-06-09";

/**
 * Full enumeration of USML Category IV paragraphs.
 *
 * Order: ascending by paragraph letter; numbered sub-paragraphs follow their
 * headline; deep sub-paragraphs follow their parent. Reserved spans are kept
 * as honest single entries.
 *
 * **Do not remove or renumber entries** — paragraph codes are persisted in
 * `TradeItem.classification` strings and referenced by the corpus matcher.
 * Removing a code is a breaking change.
 */
export const USML_IV_ENUMERATION: readonly UsmlIvEntry[] = [
  // ─── (a) Rockets, SLVs, missiles, bombs, torpedoes, mines, grenades ──
  {
    paragraph: "IV(a)",
    title: "Rockets, SLVs, missiles, bombs, torpedoes, mines, and grenades",
    description:
      "Headline paragraph (SME) covering rockets, space launch vehicles (SLVs), missiles, bombs, torpedoes, depth charges, mines, and grenades, enumerated in sub-paragraphs (a)(1) through (a)(12). The space-relevant members are (a)(1), (a)(2), and (a)(5) — complete rockets/SLVs/missiles.",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(1)",
    title: "Rockets/SLVs/missiles ≥ 500 kg payload to ≥ 300 km (MTCR Cat I)",
    description:
      "Rockets, SLVs, and missiles capable of delivering at least a 500-kg payload to a range of at least 300 km. Marked (MT) — meets the MTCR Category I delivery-system threshold; strong presumption of denial applies. The core 'complete launch vehicle' paragraph for orbital-class systems.",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(2)",
    title: "Rockets/SLVs/missiles < 500 kg payload to ≥ 300 km (MTCR)",
    description:
      "Rockets, SLVs, and missiles capable of delivering less than a 500-kg payload to a range of at least 300 km. Marked (MT) — MTCR range threshold met even below the 500-kg payload floor. Captures smaller-payload SLVs and sounding-rocket-derived systems above 300 km range.",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(3)",
    title: "Man-portable air defense systems (MANPADS)",
    description:
      "Man-portable air-defense systems. Not a space article; enumerated for category completeness. Strictly controlled (Leahy-Law-relevant).",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(4)",
    title: "Anti-tank missiles and rockets",
    description:
      "Anti-tank guided missiles and rockets. Not a space article; enumerated for category completeness.",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(5)",
    title: "Rockets/SLVs/missiles not meeting (a)(1)–(a)(4)",
    description:
      "Rockets, SLVs, and missiles not meeting the criteria of paragraphs (a)(1) through (a)(4). The residual launch-vehicle catch-all: sub-orbital and sub-300 km rockets/SLVs still fall to USML Cat IV via this paragraph even when they miss the MTCR thresholds.",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(6)",
    title: "Bombs",
    description:
      "Bombs. Not a space article; enumerated for category completeness (headline depth only).",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(7)",
    title: "Torpedoes",
    description:
      "Torpedoes. Not a space article; enumerated for category completeness (headline depth only).",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(8)",
    title: "Depth charges",
    description:
      "Depth charges. Not a space article; enumerated for category completeness (headline depth only).",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(9)",
    title: "Anti-personnel / anti-vehicle / anti-armor land mines",
    description:
      "Anti-personnel, anti-vehicle, or anti-armor land mines (e.g. area-denial devices). Not a space article; enumerated for category completeness (headline depth only).",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(10)",
    title: "Anti-helicopter mines",
    description:
      "Anti-helicopter mines. Not a space article; enumerated for category completeness (headline depth only).",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(11)",
    title: "Naval mines",
    description:
      "Naval mines. Not a space article; enumerated for category completeness (headline depth only).",
    itarSME: true,
  },
  {
    paragraph: "IV(a)(12)",
    title: "Fragmentation and high-explosive hand grenades",
    description:
      "Fragmentation and high-explosive hand grenades. Not a space article; enumerated for category completeness (headline depth only).",
    itarSME: true,
  },

  // ─── (b) Launchers ──────────────────────────────────────────────────
  {
    paragraph: "IV(b)",
    title: "Launchers for rockets, SLVs, and missiles",
    description:
      "Headline paragraph (SME) for launchers, enumerated in (b)(1) and (b)(2). For space exporters the relevant member is (b)(1) — fixed launch sites and mobile launcher mechanisms for orbital/MTCR-class systems.",
    itarSME: true,
  },
  {
    paragraph: "IV(b)(1)",
    title: "Launch sites / mobile launchers for (a)(1)–(a)(2) systems (MTCR)",
    description:
      "Fixed launch sites and mobile launcher mechanisms for any system enumerated in paragraphs (a)(1) and (a)(2). Marked (MT). Captures orbital-class launch infrastructure and mobile launch tables for MTCR-class systems.",
    itarSME: true,
  },
  {
    paragraph: "IV(b)(2)",
    title: "Launch sites / mobile launchers for (a)(3)–(a)(5) systems",
    description:
      "Fixed launch sites and mobile launcher mechanisms for any system enumerated in paragraphs (a)(3) through (a)(5) (e.g. launch tables, TOW-missile and MANPADS launch mechanisms). Includes launch mechanisms for the residual (a)(5) rockets/SLVs.",
    itarSME: true,
  },

  // ─── (c) Handling / control / detonation equipment ──────────────────
  {
    paragraph: "IV(c)",
    title: "Handling, control, activation, and detonation equipment",
    description:
      "Equipment specially designed for the handling, control, activation, monitoring, detection, protection, discharge, or detonation of articles in (a) or (b), or of IEDs. Per the source notes this includes transporters, cranes, lifts, launch-prep robots and robot controllers, and liquid-propellant tanks specially designed for the propellants used in the systems of (a)(1)/(2)/(5) — directly relevant to launch ground-support equipment.",
  },
  {
    paragraph: "IV(c)(1)",
    title: "Handling/control equipment for (a) or (b) commodities (MTCR)",
    description:
      "Equipment specially designed for the handling, control, activation, monitoring, detection, protection, discharge, or detonation of a commodity enumerated in (a) or (b). Marked (MT) for systems in (a)(1)/(a)(2)/(b)(1) — i.e. ground-support and launch-control equipment for MTCR-class launch vehicles.",
  },
  {
    paragraph: "IV(c)(2)",
    title: "Equipment for Improvised Explosive Devices (IEDs)",
    description:
      "Equipment specially designed for the handling, control, activation, monitoring, detection, protection, discharge, or detonation of Improvised Explosive Devices (IEDs). Not a space article; enumerated for completeness.",
  },

  // ─── (d) Power plants ───────────────────────────────────────────────
  {
    paragraph: "IV(d)",
    title: "Rocket, SLV, and missile power plants",
    description:
      "Headline paragraph (SME) for rocket, SLV, and missile power plants, enumerated in (d)(1) through (d)(7). The propulsion core of the category — covers individual rocket stages and rocket motors/engines by total-impulse band. Per a source note, this paragraph does not control thrusters for spacecraft (those route to USML XV / ECCN 9A515).",
    itarSME: true,
  },
  {
    paragraph: "IV(d)(1)",
    title: "Individual rocket stages for (a)(1)/(a)(2)/(a)(5) vehicles (MTCR)",
    description:
      "Individual rocket stages for the articles in (a)(1), (a)(2), or (a)(5), except those captured by (d)(2) or (d)(3). Marked (MT) for stages usable in (a)(1)/(a)(2) systems. The 'stage' paragraph — a complete propulsion stage of a launch vehicle.",
    itarSME: true,
  },
  {
    paragraph: "IV(d)(2)",
    title:
      "Rocket motors/engines with total impulse ≥ 1.1×10⁶ N·s (MTCR Cat I)",
    description:
      "Solid-propellant rocket motors, hybrid or gel rocket motors, or liquid-propellant rocket engines having a total-impulse capacity equal to or greater than 1.1×10⁶ N·s. Marked (MT) — this is the MTCR Category I motor/engine threshold (matched by the parametric cross-walk predicate USML:IV(d)(2)).",
    itarSME: true,
  },
  {
    paragraph: "IV(d)(3)",
    title: "Rocket motors/engines with total impulse 8.41×10⁵–1.1×10⁶ N·s",
    description:
      "Solid-propellant rocket motors, hybrid or gel rocket motors, or liquid-propellant rocket engines having a total-impulse capacity equal to or greater than 8.41×10⁵ N·s but less than 1.1×10⁶ N·s. Marked (MT) — the MTCR Category II motor/engine band (matched by the cross-walk predicate USML:IV(d)(3)).",
    itarSME: true,
  },
  {
    paragraph: "IV(d)(4)",
    title: "Combined-cycle, pulsejet, ramjet, or scramjet engines (MTCR)",
    description:
      "Combined-cycle, pulsejet, ramjet, or scramjet engines. Marked (MT). Air-breathing high-speed propulsion relevant to hypersonic and air-launch-to-orbit concepts.",
    itarSME: true,
  },
  {
    paragraph: "IV(d)(5)",
    title: "Air-breathing engines operating above Mach 4",
    description:
      "Air-breathing engines that operate above Mach 4 and are not captured by (d)(4). Hypersonic air-breathing propulsion relevant to launch-assist and boost-glide systems.",
    itarSME: true,
  },
  {
    paragraph: "IV(d)(6)",
    title: "Pressure-gain combustion-based propulsion systems",
    description:
      "Pressure-gain combustion-based propulsion systems not captured by (d)(4) or (d)(5) — e.g. rotating-detonation and pulse-detonation engines. An emerging launch-propulsion class.",
    itarSME: true,
  },
  {
    paragraph: "IV(d)(7)",
    title: "Rocket/SLV/missile engines and motors not otherwise enumerated",
    description:
      "Rocket, SLV, and missile engines and motors not otherwise enumerated in (d)(1) through (d)(6) or in USML Category XIX. The residual propulsion catch-all — sub-threshold rocket motors/engines remain USML Cat IV via this paragraph.",
    itarSME: true,
  },

  // ─── (e)-(f) Reserved ───────────────────────────────────────────────
  {
    paragraph: "IV(e)-(f)",
    title: "Reserved",
    description:
      "Paragraphs (e) and (f) are [Reserved] in the current Category IV text. Listed for completeness; no articles are controlled here.",
  },

  // ─── (g) Non-nuclear warheads ───────────────────────────────────────
  {
    paragraph: "IV(g)",
    title: "Non-nuclear warheads for rockets, bombs, and missiles",
    description:
      "Non-nuclear warheads for rockets, bombs, and missiles (e.g. explosive, kinetic, EMP, thermobaric, shape-charge, and fuel-air-explosive). SME. Not a space payload; enumerated for completeness — but referenced by (h)(18) for its parts and components.",
    itarSME: true,
  },

  // ─── (h) Systems, subsystems, parts, components ─────────────────────
  {
    paragraph: "IV(h)",
    title: "Systems, subsystems, parts, components, and associated equipment",
    description:
      "Headline paragraph enumerating Category IV systems, subsystems, parts, components, accessories, attachments, and associated equipment in (h)(1) through (h)(30). This is the dense parts-and-components surface most space-launch suppliers touch (nozzles, stages, fairings, tanks, interstages, igniters). The parent paragraph itself is not asterisked; only (h)(30) is SME.",
  },
  {
    paragraph: "IV(h)(1)",
    title: "Flight control and guidance systems (guidance sets) (MTCR)",
    description:
      "Flight-control and guidance systems, including guidance sets, specially designed for articles in (a). Marked (MT) for (a)(1)/(a)(2) systems. A guidance set integrates navigation (position/velocity) with flight-control commanding.",
  },
  {
    paragraph: "IV(h)(2)",
    title: "Seeker systems for category (a) articles (MTCR)",
    description:
      "Seeker systems (e.g. radio-frequency, infrared) specially designed for articles in (a). Marked (MT) for (a)(1)/(a)(2) systems. Primarily a missile-seeker paragraph; enumerated for completeness.",
  },
  {
    paragraph: "IV(h)(3)",
    title: "Kinetic kill vehicles and specially designed parts",
    description:
      "Kinetic kill vehicles and the parts and components specially designed for them. A counter-space / intercept article; enumerated for completeness.",
  },
  {
    paragraph: "IV(h)(4)",
    title: "Missile/rocket thrust-vector-control systems (MTCR)",
    description:
      "Missile or rocket thrust-vector-control (TVC) systems. Marked (MT) for TVC usable in (a)(1) systems. Directly relevant to launch-vehicle steering — gimballed nozzles, jet vanes, fluid-injection TVC.",
  },
  {
    paragraph: "IV(h)(5)",
    title: "MANPADS grip stocks and specially designed parts",
    description:
      "MANPADS grip stocks and the parts and components specially designed for them. Not a space article; enumerated for completeness.",
  },
  {
    paragraph: "IV(h)(6)",
    title: "Rocket/missile nozzles and nozzle throats and parts (MTCR)",
    description:
      "Rocket or missile nozzles and nozzle throats and the parts and components specially designed for them. Marked (MT) for nozzles/throats usable in (a)(1)/(a)(2) systems. A core launch-propulsion component (carbon-carbon throats etc.).",
  },
  {
    paragraph: "IV(h)(7)",
    title:
      "Rocket/missile nose tips, nose fairings, aerospikes and parts (MTCR)",
    description:
      "Rocket or missile nose tips, nose fairings, or aerospikes and the parts and components specially designed for them. Marked (MT) for (a)(1)/(a)(2) articles. Relevant to launch-vehicle aero-structures.",
  },
  {
    paragraph: "IV(h)(8)",
    title: "Re-entry vehicle or warhead heat shields (MTCR)",
    description:
      "Re-entry vehicle or warhead heat shields. Marked (MT) for re-entry vehicles/heat shields usable in (a)(1) systems. The thermal-protection-system paragraph for RVs — cross-controlled with re-entry capsule programs.",
  },
  {
    paragraph: "IV(h)(9)",
    title: "Missile/rocket SAFF components and parts (MTCR)",
    description:
      "Missile and rocket safing, arming, fuzing, and firing (SAFF) components, including target-detection and proximity-sensing devices, and parts specially designed for them. Marked (MT) for SAFF usable in (a)(1) systems.",
  },
  {
    paragraph: "IV(h)(10)",
    title: "Self-destruct systems for category (a) articles (MTCR)",
    description:
      "Self-destruct systems specially designed for articles in (a). Marked (MT) for (a)(1)/(a)(2) articles. Flight-termination systems for launch vehicles fall here.",
  },
  {
    paragraph: "IV(h)(11)",
    title: "Separation/staging mechanisms and interstages and parts (MTCR)",
    description:
      "Separation mechanisms, staging mechanisms, and interstages usable for articles in (a), and the parts and components specially designed for them. Marked (MT) for those usable in (a)(1) systems. Directly relevant to multi-stage launch vehicles.",
  },
  {
    paragraph: "IV(h)(12)",
    title: "Post-boost vehicles (PBV) (MTCR)",
    description:
      "Post-boost vehicles (PBV). Marked (MT). A ballistic-missile bus article; enumerated for completeness.",
  },
  {
    paragraph: "IV(h)(13)",
    title: "Engine or motor mounts for (a)/(b) articles (MTCR)",
    description:
      "Engine or motor mounts specially designed for articles in (a) and (b). Marked (MT) for mounts usable in (a)(1)/(a)(2)/(b)(1) systems. A launch-vehicle structural component.",
  },
  {
    paragraph: "IV(h)(14)",
    title: "Combustion chambers for (a)/(d) articles and parts (MTCR)",
    description:
      "Combustion chambers specially designed for articles in (a) and (d) and the parts and components specially designed for them. Marked (MT) for those usable in (a)(1)/(a)(2)/(b)(1) and (d)(1)–(d)(5) articles. A core rocket-engine component.",
  },
  {
    paragraph: "IV(h)(15)",
    title: "Injectors for category articles (MTCR)",
    description:
      "Injectors specially designed for articles controlled in this category. Marked (MT) for injectors usable in (a)(1) systems. A liquid-rocket-engine component.",
  },
  {
    paragraph: "IV(h)(16)",
    title: "Solid rocket motor or liquid engine igniters",
    description:
      "Solid-rocket-motor or liquid-engine igniters. A launch-propulsion ignition component controlled without a (MT) qualifier in the source.",
  },
  {
    paragraph: "IV(h)(17)",
    title: "Re-entry vehicles n.e.s. and specially designed parts (MTCR)",
    description:
      "Re-entry vehicles, and the parts and components specially designed for them, not elsewhere specified in this category. Marked (MT). Per a source note this paragraph does not control spacecraft (those go to USML Category XV, else ECCN 9A515) — the boundary line between RVs and re-entry capsules.",
  },
  {
    paragraph: "IV(h)(18)",
    title: "Specially designed parts and components for (g) warheads",
    description:
      "Parts and components specially designed for the non-nuclear warheads controlled in paragraph (g), not elsewhere specified. Not a space article; enumerated for completeness.",
  },
  {
    paragraph: "IV(h)(19)",
    title: "Penetration aids and specially designed parts",
    description:
      "Penetration aids and the parts and components specially designed for them (e.g. physical or electronic countermeasure suites, re-entry-vehicle replicas or decoys, or submunitions). A ballistic-missile penetration-aid paragraph; enumerated for completeness.",
  },
  {
    paragraph: "IV(h)(20)",
    title: "Rocket motor cases and specially designed parts (MTCR)",
    description:
      "Rocket motor cases and the parts and components specially designed for them (e.g. flanges, flange seals, end domes). Marked (MT) for cases usable in (a)(1)/(a)(2) systems and for parts of the hybrid motors in (d)(2)/(d)(3). A core solid-motor structural component.",
  },
  {
    paragraph: "IV(h)(21)",
    title: "Solid rocket motor liners and motor insulation (MTCR)",
    description:
      "Solid-rocket-motor liners and rocket-motor insulation. Marked (MT) for liners usable in (a)(1)/(a)(2) systems and insulation usable in (a)(1)/(a)(2) systems. A solid-propulsion materials paragraph.",
  },
  {
    paragraph: "IV(h)(22)",
    title: "Radomes, sensor windows, antenna windows for (a) articles (MTCR)",
    description:
      "Radomes, sensor windows, and antenna windows specially designed for articles in (a). Marked (MT) for radomes usable in (a)(1) systems and for composite/laminate radomes/windows specially designed for the systems in (a)(1)/(a)(2)/(d)(1)/(h)(8)/(h)(9)/(h)(17)/(h)(25).",
  },
  {
    paragraph: "IV(h)(23)",
    title: "Rocket or missile payload fairings",
    description:
      "Rocket or missile payload fairings. The launch-vehicle fairing paragraph (no (MT) qualifier in the source) — a structure space-launch suppliers routinely produce.",
  },
  {
    paragraph: "IV(h)(24)",
    title: "Rocket or missile launch canisters (MTCR)",
    description:
      "Rocket or missile launch canisters. Marked (MT) for canisters designed or modified for (a)(1)/(a)(2) systems. A launch-integration structure.",
  },
  {
    paragraph: "IV(h)(25)",
    title: "Fuzes for category (a) articles (MTCR)",
    description:
      "Fuzes specially designed for articles in (a) (e.g. proximity, contact, electronic, dispenser-proximity, airburst, variable-time-delay, multi-option). Marked (MT) for fuzes usable in (a)(1) systems. Primarily a warhead-fuzing paragraph; enumerated for completeness.",
  },
  {
    paragraph: "IV(h)(26)",
    title: "Rocket or missile liquid propellant tanks (MTCR)",
    description:
      "Rocket or missile liquid-propellant tanks. Marked (MT) for tanks usable in (a)(1) systems. Directly relevant to launch-vehicle stages — composite and metallic propellant tanks for orbital-class systems are captured here.",
  },
  {
    paragraph: "IV(h)(27)",
    title: "Rocket or missile altimeters for (a)(1) articles (MTCR)",
    description:
      "Rocket or missile altimeters specially designed for use in articles in (a)(1). Marked (MT). A launch-vehicle / missile avionics component.",
  },
  {
    paragraph: "IV(h)(28)",
    title:
      "Flight-control and attitude-control systems for (a)(1) rockets (MTCR)",
    description:
      "Pneumatic, hydraulic, mechanical, electro-optical, or electromechanical flight-control systems (including fly-by-wire) and attitude-control equipment specially designed for the rockets/missiles in (a)(1). Marked (MT). Launch-vehicle actuation and attitude-control hardware.",
  },
  {
    paragraph: "IV(h)(29)",
    title:
      "Umbilical and interstage electrical connectors for (a)(1)/(a)(2) (MTCR)",
    description:
      "Umbilical and interstage electrical connectors specially designed for the rockets/missiles in (a)(1) or (a)(2), including connectors between those systems and their payload. Marked (MT). A launch-vehicle integration component.",
  },
  {
    paragraph: "IV(h)(30)",
    title: "Classified catch-all part/component/system (SME)",
    description:
      "Any part, component, accessory, attachment, equipment, or system that is classified, contains classified software directly related to defense articles or 600-series items, or is being developed using classified information. SME, marked (MT) for articles designated as such. Enumerated in sub-items (i)/(ii)/(iii); ITAR by default — request a DDTC commodity-jurisdiction determination.",
    itarSME: true,
  },
  {
    paragraph: "IV(h)(30)(i)",
    title: "Classified catch-all — is classified",
    description:
      "Sub-item of the (h)(30) classified catch-all: any part, component, accessory, attachment, equipment, or system that is itself classified. SME.",
    itarSME: true,
  },
  {
    paragraph: "IV(h)(30)(ii)",
    title: "Classified catch-all — contains classified software",
    description:
      "Sub-item of the (h)(30) classified catch-all: contains classified software directly related to defense articles in the subchapter or to 600-series items subject to the EAR. SME.",
    itarSME: true,
  },
  {
    paragraph: "IV(h)(30)(iii)",
    title: "Classified catch-all — developed using classified information",
    description:
      "Sub-item of the (h)(30) classified catch-all: is being developed using classified information. SME.",
    itarSME: true,
  },

  // ─── (i) Technical data and defense services ────────────────────────
  {
    paragraph: "IV(i)",
    title:
      "Technical data and defense services for Category IV articles (MTCR)",
    description:
      "Technical data (§ 120.33) and defense services (§ 120.32) directly related to the defense articles in (a) through (h), plus classified technical data related to ECCNs 0A604/0B604/0D604/9A604/9B604/9D604 and defense services using it. Critically, defense services include assistance (incl. training) to a foreign person in integrating a satellite/spacecraft to a launch vehicle (planning and on-site support) and in launch-failure analysis — regardless of the spacecraft's origin or whether technical data is used. Marked (MT) for data/services related to articles designated as such. This is the deemed-export / launch-integration surface space companies hit most often.",
    ear600SeriesCounterpart: "9E604",
  },

  // ─── (j)-(w) Reserved ───────────────────────────────────────────────
  {
    paragraph: "IV(j)-(w)",
    title: "Reserved",
    description:
      "Paragraphs (j) through (w) are [Reserved] in the current Category IV text. Listed for completeness; no articles are controlled here.",
  },

  // ─── (x) EAR commodities used in/with defense articles ──────────────
  {
    paragraph: "IV(x)",
    title:
      "EAR commodities/software/technical data used in/with Cat IV articles",
    description:
      "Commodities, software, and technical data subject to the EAR used in or with the defense articles of this category. Per the source note, use of this paragraph is limited to licence applications where the purchase documentation includes EAR-subject items (see § 123.1(b)). The bridge paragraph between ITAR licence applications and EAR-subject content.",
    ear600SeriesCounterpart: "9A604",
  },
] as const;

/**
 * Coverage metadata for this file. The non-space weapon paragraphs are
 * present (they are real Category IV paragraphs) but kept at headline depth;
 * that honesty is declared here rather than by silently omitting them.
 */
export const USML_IV_COVERAGE: UsmlIvCoverage = {
  jurisdiction: "USML",
  category: "IV",
  scope:
    "USML Category IV at paragraph + sub-paragraph depth. Launch-vehicle, SLV, rocket-stage, power-plant (d), and parts/components (h) paragraphs curated at full operator depth; technical-data/defense-services (i) and the EAR-bridge (x) included.",
  excluded: [
    "Torpedo/depth-charge/mine/grenade/bomb members of (a) — listed at headline depth (not space articles)",
    "MANPADS (a)(3)/(h)(5) and anti-tank (a)(4) — listed at headline depth (not space articles)",
    "Non-nuclear warheads (g) and their parts (h)(18) — headline depth (not space payloads)",
    "Seeker (h)(2), kill-vehicle (h)(3), SAFF (h)(9), penetration-aids (h)(19), PBV (h)(12), fuzes (h)(25) — listed but space-relevance is indirect",
    "Verbatim sub-clause text and the four explanatory Notes to paragraph (a) (range/payload/hobby-rocket/mine definitions) — paraphrased into the relevant entries, not transcribed",
  ],
  asOfDate: USML_IV_AS_OF_DATE,
  ecfrIssueDate: ECFR_ISSUE_DATE,
  caelexCoverageCount: USML_IV_ENUMERATION.length,
};

/**
 * Index of the enumeration by paragraph code. Built once at module load for
 * O(1) lookups from the corpus matcher and tests.
 */
export const USML_IV_BY_PARAGRAPH: Record<string, UsmlIvEntry> =
  Object.fromEntries(USML_IV_ENUMERATION.map((e) => [e.paragraph, e]));

/**
 * Lookup a Category IV entry by paragraph code (e.g. "IV(d)(2)"). Returns
 * undefined when the paragraph is not enumerated — callers should treat that
 * as "not yet covered" rather than "not USML."
 */
export function findUsmlIvEntry(paragraph: string): UsmlIvEntry | undefined {
  return USML_IV_BY_PARAGRAPH[paragraph];
}

/**
 * Source citation surfaced into UI tooltips, audit logs, and PDF reports.
 */
export function getUsmlIvSourceCitation(): {
  source: string;
  url: string;
  asOfDate: string;
  ecfrIssueDate: string;
} {
  return {
    source: "22 CFR § 121.1 Category IV",
    url: SOURCE_URL,
    asOfDate: USML_IV_AS_OF_DATE,
    ecfrIssueDate: ECFR_ISSUE_DATE,
  };
}
