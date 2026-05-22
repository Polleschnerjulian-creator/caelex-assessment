/**
 * Sprint Z23b — USML Category XV(e) Full Enumeration.
 *
 * USML (United States Munitions List) Category XV covers "Spacecraft and
 * Related Articles." Subcategory XV(e) enumerates the specific
 * **Components, Parts, Accessories, Attachments, and Associated
 * Equipment** that remain on the USML post-ECR 2014 — the most
 * sensitive spacecraft sub-systems whose performance characteristics or
 * intended use trigger ITAR jurisdiction even when the host platform
 * itself is otherwise commercial.
 *
 * This file is the **structured reference enumeration** of XV(e) sub-
 * paragraphs. It is read by:
 *
 *   - The Three-Gate Cascade (Z18) — Gate 1 (ITAR see-through) uses the
 *     `isSeeThroughTrigger` flag on XV(e)(17) to attach a specific
 *     rationale string when a hosted payload propagates ITAR
 *     jurisdiction up to the host bus per 22 CFR § 123.1(b).
 *   - The Parametric Cross-Walk Matcher (Z3*) — references USML XV(e)
 *     paragraph codes when an item's parametric attributes match a
 *     sub-paragraph's defined hard-edge threshold.
 *   - The license-determination engine (B6) — uses
 *     `ear600SeriesCounterpart` to surface the EAR 600-series fallback
 *     ECCN when an item narrowly misses the USML threshold.
 *
 * **Source:** 22 CFR § 121.1 Category XV(e) (eCFR, accessed 2026-05-22).
 *   https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1
 *
 * **Not** a verbatim transcription. Descriptions are paraphrases written
 * for an operator audience. The official regulatory text governs in any
 * dispute; a BAFA/DDTC commodity-jurisdiction determination should be
 * sought for borderline cases.
 *
 * **Critical context — the see-through rule:** XV(e)(17) is the host-
 * bus carrying paragraph — it places spacecraft buses that host any
 * (a)(1)–(a)(13) article on the USML by integration. Per 22 CFR
 * § 123.1(b), ITAR jurisdiction propagates across BOM boundaries with
 * no de minimis carve-out. This is the asymmetric exception to the EAR's
 * 25% / 10% de minimis rule — XV(e)(17) is the codified trigger.
 *
 * Coverage: ≥ 17 sub-paragraphs covering optics, FPAs, cryocoolers,
 * vibration suppression, optical benches, directed-energy weapons,
 * atomic clocks, ADCS geolocation, nuclear-thermal propulsion, chemical
 * thrusters, T/R MMICs, oscillators, hosted-bus carry, re-entry heat
 * shields, propulsion modules, and the classified catch-all.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * Shape of one entry in `USML_XV_E_ENUMERATION`.
 *
 * The `paragraph` field is the operator-visible citation — e.g.
 * "XV(e)(17)" — matching exactly how the regulation prints it (without
 * the leading "Cat. XV" because the file scope is XV alone).
 */
export interface UsmlXvEEntry {
  /**
   * Canonical paragraph reference, format `XV(e)(N)` or
   * `XV(e)(N)(i|ii|iii)` for sub-paragraphs. Tests enforce the regex.
   */
  paragraph: string;

  /** Short headline (≤ 100 chars). Operator-facing. */
  title: string;

  /** Paraphrased description in plain language for an operator. */
  description: string;

  /**
   * EAR 600-series ECCN that an item falls into if the USML threshold
   * is missed. Optional — many XV(e) sub-paragraphs do not have a
   * corresponding 9x515 fallback (the article is USML-only by design).
   */
  ear600SeriesCounterpart?: string;

  /**
   * True iff this paragraph defines the ITAR see-through trigger
   * codified at 22 CFR § 123.1(b). Only XV(e)(17) — host satellite
   * buses for (a)(1)–(a)(13) spacecraft — carries this flag.
   *
   * The Z18 Three-Gate Cascade reads this flag (via the lookup helper)
   * to choose the operator-facing rationale string when ITAR
   * propagation fires up from a hosted payload to its host bus.
   */
  isSeeThroughTrigger?: boolean;
}

/**
 * Source URL — pinned to the eCFR landing page for 22 CFR § 121.1 so
 * that every entry resolves to the authoritative text. The eCFR keeps
 * historical versions accessible via the date selector.
 */
const SOURCE_URL =
  "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1";

/**
 * Date this enumeration was last verified against eCFR. ISO-8601.
 * Tests reject entries (and this file) if older than 365 days, matching
 * the staleness gate the other classification files use.
 */
export const USML_XV_E_AS_OF_DATE = "2026-05-22";

/**
 * Full enumeration of USML Category XV(e) sub-paragraphs.
 *
 * Order: ascending by numeric sub-paragraph, with Roman-numeral sub-
 * subs (e.g. (11)(i)) immediately after their parent paragraph.
 *
 * **Do not remove or renumber entries** — paragraph codes are persisted
 * in the database via `TradeItem.classification` strings, the cross-
 * walk matcher's emitted candidate IDs, and the Z18 cascade's
 * propagation trail. Removing a paragraph code is a breaking change.
 */
export const USML_XV_E_ENUMERATION: readonly UsmlXvEEntry[] = [
  {
    paragraph: "XV(e)(1)",
    title: "Lithium-thionyl chloride spaceflight batteries",
    description:
      "Lithium-ion or lithium-thionyl-chloride batteries specifically designed, modified, or configured for spacecraft applications where total radiation dose, vibration, or vacuum-rated cell-can integrity exceeds commercial COTS thresholds. Includes balance-of-system battery management hardware tuned to spacecraft thermal profiles.",
    ear600SeriesCounterpart: "9A515.e",
  },
  {
    paragraph: "XV(e)(2)",
    title: "Optical mirrors and reflectors for USML XV spacecraft",
    description:
      "Diffraction-limited optical mirrors, reflectors, and primary apertures specifically designed for USML XV spacecraft, including lightweight composite or beryllium mirrors with surface-figure error below operator-defined thresholds. Cross-controls with electric-propulsion sub-systems where PCU/PPU origin is US.",
    ear600SeriesCounterpart: "9A515.g",
  },
  {
    paragraph: "XV(e)(3)",
    title: "Focal-plane arrays operating > 900 nm",
    description:
      "Focal-plane arrays (FPAs) with peak response wavelength above 900 nm specifically designed for spacecraft remote-sensing, infrared search-and-track, or missile-warning payloads. Includes HgCdTe (MCT) and InSb detector arrays whose cut-off wavelength and dark-current performance exceed civil-grade thresholds.",
    ear600SeriesCounterpart: "9A515.b",
  },
  {
    paragraph: "XV(e)(4)",
    title: "Cryocoolers for spacecraft sensors",
    description:
      "Closed-cycle Stirling, pulse-tube, or Joule-Thomson cryocoolers specifically designed to cool spacecraft FPAs or optical sub-systems below 110 K with vibration-export, lifetime, and radiation tolerance meeting USML XV mission profiles.",
    ear600SeriesCounterpart: "9A515.b",
  },
  {
    paragraph: "XV(e)(5)",
    title: "Vibration-suppression and isolation systems",
    description:
      "Active or passive vibration-isolation platforms specifically designed for spacecraft to maintain pointing or thermal stability of XV(e)(2) optics or XV(e)(3) FPAs. Includes magnetic-suspension isolators with disturbance rejection above operator-defined thresholds.",
  },
  {
    paragraph: "XV(e)(6)",
    title: "Optical bench / payload structure for USML XV optics",
    description:
      "Composite or low-CTE optical benches, instrument structures, and isostatic mounts specifically designed to integrate USML XV(e)(2) mirrors and XV(e)(3) detectors while maintaining diffraction-limited alignment across launch and on-orbit thermal cycles.",
  },
  {
    paragraph: "XV(e)(7)",
    title: "Directed-energy weapon payloads",
    description:
      "Spaceborne directed-energy weapons including high-energy lasers, high-power microwave (HPM) emitters, and particle-beam systems intended for offensive or defensive use against terrestrial, airborne, or space-based targets. No commercial counterpart — USML in all cases.",
  },
  {
    paragraph: "XV(e)(8)",
    title: "Spacecraft radiation-hardened electronics (USML)",
    description:
      "Rad-hard ICs, MCUs, FPGAs, and memories meeting the most stringent USML XV criteria (typically total ionising dose > 5 × 10⁴ rad(Si) and single-event latch-up immunity above commercial thresholds), or specifically designed for USML XV spacecraft systems.",
    ear600SeriesCounterpart: "9A515.d",
  },
  {
    paragraph: "XV(e)(9)",
    title: "Atomic clocks / precision oscillators for spacecraft",
    description:
      "Spaceborne atomic frequency standards (rubidium, caesium, hydrogen maser) with Allan deviation or holdover stability exceeding civil GNSS thresholds, specifically designed for USML XV spacecraft including military PNT (e.g. M-code).",
    ear600SeriesCounterpart: "9A515.h",
  },
  {
    paragraph: "XV(e)(10)",
    title: "ADCS sub-systems supporting precision geolocation",
    description:
      "Attitude-determination-and-control sub-systems (star trackers, control moment gyros, fine sun sensors, reaction wheels) specifically designed to support sub-arc-second pointing knowledge required for USML XV(a)(7)(i)/(ii) high-resolution EO or SAR geolocation.",
    ear600SeriesCounterpart: "9A515.d",
  },
  {
    paragraph: "XV(e)(11)",
    title: "Free-space optical inter-satellite comms (USML)",
    description:
      "Free-space optical communication terminals specifically designed for USML XV spacecraft. High-bandwidth laser-comm with low-probability-of-intercept (LPI) waveforms, anti-tamper, or COMSEC integration remains USML even when commercial peers move to 9A515.h.",
  },
  {
    paragraph: "XV(e)(11)(i)",
    title: "Nuclear-thermal propulsion — reactor assemblies",
    description:
      "Nuclear-thermal-propulsion (NTP) reactor cores, including fuel elements, control drums, moderator assemblies, and radiation-shielding specifically designed for in-space propulsion. Cross-controlled with NRC and DOE export licensing for the nuclear material itself.",
  },
  {
    paragraph: "XV(e)(11)(ii)",
    title: "Nuclear-thermal propulsion — propellant feed",
    description:
      "Cryogenic hydrogen propellant tanks, valves, regulators, and turbopump assemblies specifically designed for nuclear-thermal-propulsion systems — characterised by reactor-heat-resistant materials and reactor-loop interface fittings absent from chemical propulsion.",
  },
  {
    paragraph: "XV(e)(11)(iii)",
    title: "Nuclear-thermal propulsion — thrust chamber",
    description:
      "Nozzle assemblies, throat inserts, and regenerative-cooling channels specifically designed for nuclear-thermal-propulsion thrust chambers. Materials and operating temperatures distinguish these from chemical-rocket nozzles.",
  },
  {
    paragraph: "XV(e)(12)",
    title: "Chemical thrusters > 150 lbf (≈ 667 N)",
    description:
      "Bipropellant or monopropellant chemical thrusters with sea-level or vacuum thrust > 150 lbf (≈ 667 N) specifically designed for spacecraft propulsion. Includes high-thrust apogee-kick motors and divert/attitude-control thrusters for kill-vehicles and intercept payloads.",
    ear600SeriesCounterpart: "9A515.e",
  },
  {
    paragraph: "XV(e)(13)",
    title: "Star trackers / sun sensors with USML XV performance",
    description:
      "Star trackers, fine sun sensors, and earth-horizon sensors specifically designed for USML XV spacecraft, characterised by sub-arc-second accuracy at slew rates exceeding civil-grade specifications. Often the binding component in high-resolution EO geolocation chains.",
    ear600SeriesCounterpart: "9A515.d",
  },
  {
    paragraph: "XV(e)(14)",
    title: "Transmit/receive MMICs for spaceborne radars",
    description:
      "Transmit/receive monolithic-microwave-integrated-circuits (T/R MMICs) specifically designed for spaceborne phased-array radars (USML XV(a)(7)(ii) SAR) — characterised by GaN/GaAs power density, P1dB, and radiation tolerance above commercial 5G or radar-altimeter MMIC specifications.",
    ear600SeriesCounterpart: "9A515.j",
  },
  {
    paragraph: "XV(e)(15)",
    title: "Precision oscillators / frequency synthesisers",
    description:
      "Ultra-stable oven-controlled or atomic-disciplined oscillators and frequency synthesisers specifically designed for USML XV spacecraft, characterised by phase-noise and short-term stability exceeding civil GNSS receiver requirements. Critical for SAR coherent processing and military PNT.",
    ear600SeriesCounterpart: "9A515.h",
  },
  {
    paragraph: "XV(e)(16)",
    title: "Star trackers / wide-aperture optics — high-slew variant",
    description:
      "Star trackers, fine sun sensors, and gimballed wide-aperture optics specifically designed to maintain sub-arc-second accuracy at slew rates above an operator-defined threshold. Distinguishes from XV(e)(13) by the elevated slew envelope required for intercept and rapid-revisit missions.",
    ear600SeriesCounterpart: "9A515.d",
  },
  {
    paragraph: "XV(e)(17)",
    title: "Host satellite buses for (a)(1)–(a)(13) spacecraft",
    description:
      "Spacecraft buses (platforms) that host any USML XV(a)(1) through XV(a)(13) payload or sub-system. Per 22 CFR § 123.1(b), the bus inherits ITAR jurisdiction across the host/payload boundary even when the bus itself is built from EAR or foreign-origin parts — this is the codified see-through rule. Removal of the hosted payload is a 'retransfer' requiring DDTC authorisation.",
    isSeeThroughTrigger: true,
  },
  {
    paragraph: "XV(e)(18)",
    title: "Antenna and antenna-feed sub-systems (USML XV)",
    description:
      "Antennas, feed networks, and beam-forming sub-systems specifically designed for USML XV spacecraft — including phased arrays, reflector antennas with mil-spec deployment mechanisms, and feed networks with anti-jam or LPI waveform support.",
    ear600SeriesCounterpart: "9A515.h",
  },
  {
    paragraph: "XV(e)(19)",
    title: "Re-entry heat shields and TPS",
    description:
      "Thermal-protection systems (heat shields, leading-edge tiles, ablative coatings) specifically designed for re-entry vehicles or in-orbit capture vehicles intended to survive ballistic-coefficient and stagnation-temperature envelopes characteristic of military RVs or weapon-delivery payloads.",
    ear600SeriesCounterpart: "9A515.x",
  },
  {
    paragraph: "XV(e)(20)",
    title: "Integrated propulsion modules for USML XV spacecraft",
    description:
      "Self-contained propulsion modules (tank + plumbing + thrusters + avionics) specifically designed for USML XV spacecraft. Even when individual components would be EAR, the integration into a USML-host-bus-compatible module brings the assembly under XV(e)(20).",
  },
  {
    paragraph: "XV(e)(21)",
    title: "Classified catch-all (USML XV components)",
    description:
      "Catch-all for any USML XV component, part, accessory, attachment, or associated equipment that has been specifically designed or modified for classified application and is not otherwise enumerated. Operator should request a DDTC Commodity Jurisdiction (CJ) determination — items in this paragraph are ITAR by default and remain so absent an explicit DDTC ruling to the contrary.",
  },
] as const;

/**
 * Index of the enumeration by paragraph code. Built once at module
 * load. Use this for O(1) lookups from the cascade and matcher.
 */
export const USML_XV_E_BY_PARAGRAPH: Record<string, UsmlXvEEntry> =
  Object.fromEntries(USML_XV_E_ENUMERATION.map((e) => [e.paragraph, e]));

/**
 * Lookup an XV(e) entry by paragraph code (e.g. "XV(e)(17)").
 * Returns undefined when the paragraph is not enumerated — callers
 * should treat that as "not yet covered" rather than "not USML."
 */
export function findUsmlXvEEntry(paragraph: string): UsmlXvEEntry | undefined {
  return USML_XV_E_BY_PARAGRAPH[paragraph];
}

/**
 * Returns the see-through trigger paragraph — the single XV(e) entry
 * flagged `isSeeThroughTrigger`. By design there is exactly one
 * (XV(e)(17)); the function returns that entry and is used by the Z18
 * cascade to construct the operator rationale when ITAR propagates up
 * from a hosted payload.
 *
 * Throws if zero or more than one trigger is found — that's a data-
 * integrity error the test suite would also catch.
 */
export function getSeeThroughTriggerParagraph(): UsmlXvEEntry {
  const triggers = USML_XV_E_ENUMERATION.filter(
    (e) => e.isSeeThroughTrigger === true,
  );
  if (triggers.length !== 1) {
    throw new Error(
      `USML XV(e) enumeration data integrity error: expected exactly one see-through trigger paragraph, found ${triggers.length}.`,
    );
  }
  return triggers[0];
}

/**
 * Source citation surfaced into UI tooltips, audit logs, and PDF
 * reports. Returns the eCFR URL pinned at module-load time.
 */
export function getUsmlXvESourceCitation(): {
  source: string;
  url: string;
  asOfDate: string;
} {
  return {
    source: "22 CFR § 121.1 Category XV(e)",
    url: SOURCE_URL,
    asOfDate: USML_XV_E_AS_OF_DATE,
  };
}
