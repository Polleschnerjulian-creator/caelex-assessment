/**
 * Caelex Trade — parametric cross-walk control list (Sprint Z3b).
 *
 * Machine-readable cross-walk of the regulatory control lists that
 * matter for the space sector, with PARAMETRIC PREDICATES on technical
 * attributes. This is the single piece of intellectual property that no
 * incumbent (Descartes, AEB, SAP GTS, OpenSanctions) ships for the
 * space domain.
 *
 * Each `ControlListEntry` ties:
 *   - a `canonicalId` (e.g. "9A515.a.1") to its regime
 *   - a list of `predicates` against typed item attributes
 *     (apertureM, payloadKg, IspSeconds, seuRateErrorsPerBitDay, ...)
 *   - a `seeAlso` graph linking to analogous entries in other regimes
 *     (USML XV(a)(7) ↔ CCL 9A515.a.1 ↔ EU 9A004 ↔ MTCR Item 19)
 *
 * Operator workflow: drop in a product datasheet → extract typed
 * attributes (Z4 AI Copilot) → run `parametric-matcher` against this
 * cross-walk → get ranked candidates with the matching predicate +
 * citation trail.
 *
 * Sources:
 *   - 15 CFR 774 Supp. 1 (CCL)
 *   - 22 CFR 121 (USML)
 *   - Reg. (EU) 2021/821 Annex I + Delegated Reg. (EU) 2025/2003
 *   - AWV Anlage AL Teil I Abschnitt B
 *   - MTCR Annex (current)
 *
 * Coverage: this is the SEED. Sprint Z3b ships ~10 high-value entries
 * to demonstrate the pattern. Full coverage of USML XV(a)–(g), CCL
 * 9A515.a–.y, EU Cat 9, DE 9xx+19xx, MTCR Items 1–20 follows in
 * subsequent sprints.
 *
 * Disclaimer: classifications produced from this cross-walk are
 * SCREENING-LEVEL DRAFTS, never legally binding. Human compliance
 * officer review is required before any operational determination
 * is acted upon.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Which export-control regime the entry belongs to.
 */
export type RegimeName =
  | "EAR-CCL" // US 15 CFR 774
  | "ITAR-USML" // US 22 CFR 121
  | "EU-ANNEX-I" // EU Reg. 2021/821 Annex I
  | "DE-AL-TEIL-IB" // German Ausfuhrliste Teil I B (national dual-use)
  | "JP-METI" // Japan METI Schedule 1 / 2 (FEFTA + ETCO)
  | "MTCR-ANNEX" // MTCR (multilateral)
  | "WASSENAAR" // Wassenaar Arrangement
  | "NSG" // Nuclear Suppliers Group (legacy, retained for back-compat)
  | "NSG-TRIGGER" // NSG Trigger List (INFCIRC/254/Rev.14/Part 1)
  | "NSG-DU" // NSG Dual-Use Annex (INFCIRC/254/Rev.11/Part 2)
  // Z35-RU-833 — Council Reg. (EU) 833/2014 sanctions annexes for
  // Russia/Belarus. Three goods-prohibition annexes:
  //   - VII   Strategic-importance goods (space + advanced tech)
  //   - XXIII Advanced-tech goods (fab equipment, AI compute)
  //   - XXIX  Drone-related goods (UAV motors, gimbals, autopilots)
  // Distinct from EU-ANNEX-I (dual-use licensing) — these are HARD
  // sanctions prohibitions, not licensable items.
  | "RUSSIA-833-VII"
  | "RUSSIA-833-XXIII"
  | "RUSSIA-833-XXIX"
  | "OTHER";

/**
 * A typed attribute reference. Must be one of the typed columns on
 * `TradeItem` (Sprint Z3a / Z3e) or a key in
 * `TradeItem.parametricAttributes`.
 */
export type AttributeName =
  // ─── Z3a tier-1 attributes ────────────────────────────────────────
  | "apertureMeters"
  | "payloadKg"
  | "rangeKm"
  | "IspSeconds"
  | "deltaVMetersPerSecond"
  | "gsdMeters"
  | "transmitPowerW"
  | "frequencyGhz"
  | "radHardTidKrad"
  | "seuRateErrorsPerBitDay"
  | "isRadHardened"
  | "isMilSpec"
  | "isAntiJam"
  | "itemClass"
  // ─── Z3e extended vocabulary (ontology blueprint § 12) ────────────
  | "spectralBandCount"
  | "peakWavelengthNm"
  | "radarCenterFreqGhz"
  | "radarBandwidthMhz"
  | "antennaDiameterM"
  | "starTrackerAccuracyArcsec"
  | "starTrackerSlewRateDegPerS"
  | "totalImpulseNs"
  | "neutronFluenceNPerCm2"
  | "selLetThresholdMevCm2Mg"
  | "doseRateUpsetRadSiPerS"
  | "gnssMaxVelocityMPerS"
  | "antennaActiveScanning"
  | "antennaAdaptiveBeamforming"
  | "isSpeciallyDesigned"
  // ─── Z25 Tier-3 extended parametric attributes ────────────────────
  // Added 2026-05-22 to expand classification accuracy across more
  // dimensions. Each attribute is operator-supplied via the
  // parametricAttributes JSON bag (matcher's readAttribute handles
  // fallthrough automatically). DB-typed columns are NOT added by Z25;
  // the moat is the predicate logic, not a schema migration.
  //
  // See § 7 (Z25) of the Living Execution Plan for ECCN drivers per
  // attribute. The seed CONTROL_LIST_CROSS_WALK ships one demonstration
  // entry (6A002 — telescope aperture ≥ 350 mm) that uses apertureMM;
  // subsequent sprints Z24/Z26 extend coverage across the remaining
  // attributes (6A003, 3A001, 5A001, 9A004, 9A515.e, ...).
  | "apertureMM"
  | "groundResolutionMeters"
  | "signalBandwidthMHz"
  | "focalLengthMM"
  | "pixelPitchMicrons"
  | "maxOrbitAltitudeKm"
  | "minOrbitAltitudeKm"
  | "crossLinkBandwidthMbps"
  | "radHardenedTID_krad"
  | "temperatureRangeCelsius"
  // ─── Z34c — Extended Parametric Attributes (Tier 4) ───────────────
  // Added 2026-05-23. Brings the matcher vocabulary from 25 to 44+
  // attributes. Same JSON-bag routing pattern as Z25 — no DB schema
  // changes. Each attribute extends the predicate coverage into a
  // regulatory niche the matcher previously could not reach:
  //
  //   * Tier 1 — spacecraft hardware (solar arrays, batteries, power,
  //     antennas, polarisation, thermal lifecycle)
  //   * Tier 2 — propulsion classification (chemical / electric /
  //     hybrid / cold-gas, vacuum Isp, thrust, nozzle expansion)
  //   * Tier 3 — mission operations (lifetime, inclination, apogee /
  //     perigee for orbital-mechanics-aware classification)
  //   * Tier 4 — imaging payloads (SWIR / MWIR / LWIR / hyperspectral
  //     band counts for 6A002.b sub-paragraph discrimination)
  //
  // The full ECCN drivers are documented in the Z34c demo cross-walk
  // entries below.
  //
  // Tier 1 — spacecraft hardware
  | "solarCellEfficiencyPercent"
  | "batterySpecificEnergyWhPerKg"
  | "peakPowerWatts"
  | "antennaGainDbi"
  | "frequencyBandsGhz"
  | "polarisationType"
  | "thermalCycleCount"
  // Tier 2 — propulsion
  | "propellantType"
  | "thrustNewtons"
  | "nozzleExpansionRatio"
  | "specificImpulseSecondsVacuum"
  // Tier 3 — mission ops
  | "missionDurationYears"
  | "inclinationDegrees"
  | "apogeeKm"
  | "perigeeKm"
  // Tier 4 — imaging payloads
  | "swirSpectralBands"
  | "mwirSpectralBands"
  | "lwirSpectralBands"
  | "hyperspectralBandCount";

/**
 * A predicate operator. Pure mathematical / set semantics — no
 * regulatory interpretation here, the predicates compose into the
 * full regulatory rule.
 */
export type PredicateOp =
  | "lt" // attribute < value
  | "lte" // attribute ≤ value
  | "gt" // attribute > value
  | "gte" // attribute ≥ value
  | "eq" // attribute === value
  | "between" // value[0] ≤ attribute ≤ value[1]
  | "prefix" // attribute starts with value (for itemClass)
  | "in" // attribute ∈ value[] (scalar membership against a literal set)
  | "contains"; // value ∈ attribute[] (attribute is an array, value scalar)

export interface ParametricPredicate {
  attribute: AttributeName;
  op: PredicateOp;
  value: number | string | boolean | (number | string)[];
}

/**
 * Cross-reference to an analogous entry in another regime. The graph
 * edge type tells the UI / matcher how to weight the relationship.
 */
export type CrossWalkRelationship =
  | "analogous" // same controls, different regime expression
  | "predecessor" // older regime classification (moved over)
  | "successor" // newer regime classification (post-ECR)
  | "superset_of" // this entry covers strictly more than the linked one
  | "subset_of" // this entry covers strictly less than the linked one
  | "derived_from" // multilateral source for a national list
  | "components_of"; // this entry controls components/parts FOR the linked entry's items (e.g. 9A515.g → 9A515.a.1-.a.4)

export interface CrossWalkLink {
  regime: RegimeName;
  id: string;
  relationship: CrossWalkRelationship;
  notes?: string;
}

export interface ControlListEntry {
  /** Stable primary key (e.g. "ECCN:9A515.a.1", "USML:XV(a)(7)(i)"). */
  canonicalId: string;
  regime: RegimeName;
  /** Single-letter category (US/EU shared, e.g. "9" for aerospace). */
  category: string;
  /** Single-letter product group (A=hardware, B=test, C=mat, D=sw, E=tech). */
  productGroup: string;
  /** Numeric entry number after the group letter (e.g. "515", "004"). */
  entryNumber: string;
  /** Optional subparagraph (e.g. "a.1", "(7)(i)"). */
  subpara?: string;
  /** Plain-language title for human readers. */
  title: string;
  /**
   * Parametric predicates that, when ALL satisfied by an item, indicate
   * this entry MAY apply. The matcher returns the entry with confidence
   * proportional to how many predicates matched + how tight the match
   * (boundary vs. solidly inside).
   *
   * Empty array = no parametric predicates; this entry matches only
   * via `itemClass` prefix or manual classification.
   */
  predicates: ParametricPredicate[];
  /** Reasons-for-control codes (NS, RS, AT, MT, NP, CC, ...). */
  reasonsForControl: string[];
  /** License exceptions that are typically applicable (informational). */
  licenseExceptions?: string[];
  /** Graph of analogous entries in other regimes. */
  seeAlso: CrossWalkLink[];
  /** Citation to authoritative source. */
  citation: string;
  /** ISO date when this entry took effect (after which it applies). */
  validFrom: string;
  /** ISO date when this entry was superseded (null = still in force). */
  validUntil?: string | null;
  /**
   * Operator-facing notes. Caveats, recent amendments, edge cases.
   * E.g. "Note that the BIS Final Rule of 23 Oct 2024 added
   * AU/CA/UK worldwide-licence carve-out for 9A515.a.1-.a.4."
   */
  notes?: string;
}

// ─── Seed entries ───────────────────────────────────────────────────
//
// Carefully chosen to exercise the most important parametric thresholds
// the research blueprint § 5 + § 8 calls out:
//
//   - USML XV(a)(7)(i) vs CCL 9A515.a.1   (aperture 0.50 m boundary)
//   - MTCR Cat. I       (rangeKm × payloadKg combined threshold)
//   - USML XV(d) vs CCL 9A515.d            (SEU rate 1×10⁻¹⁰ boundary)
//   - 9A004 spacecraft generic
//   - 9A004 propulsion sub-paragraph
//   - DE AL 9xx national (lawful-intercept) for cross-walk demonstration

/**
 * Machine-readable "current as of" date (ISO) for the entire cross-walk.
 *
 * G12 — reflects the LATEST regulation incorporated into the seed corpus:
 * Delegated Reg. (EU) 2025/2003 (the 2025 EU Annex I revision, in force
 * 2025-11-15), alongside the BIS IFR of 23 Oct 2024 (AL/CCL/USML revisions)
 * already reflected in the entries below. 2025-11-15 is the most recent dated
 * source cited in this file (`validFrom` of the 2025/2003-amended entries).
 *
 * Surface this on classification ExplainSource entries via `currentAsOf` so the
 * operator can see HOW CURRENT the reference data is. Purely informational — it
 * does NOT alter any determination, confidence band, or order-of-review logic.
 *
 * When a newer regulation is incorporated into the seed, bump this date to that
 * regulation's effective date.
 */
export const CONTROL_LIST_AS_OF = "2025-11-15";

export const CONTROL_LIST_CROSS_WALK: ControlListEntry[] = [
  // ═══════════════════════════════════════════════════════════════
  // Remote-sensing spacecraft (the canonical USML/CCL boundary)
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "USML:XV(a)(7)(i)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "a",
    entryNumber: "7",
    subpara: "(i)",
    title:
      "Spacecraft with electro-optical remote-sensing capability and a sub-0.50 m aperture",
    predicates: [
      { attribute: "apertureMeters", op: "lt", value: 0.5 },
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.remote_sensing.eo",
      },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.a.1",
        relationship: "successor",
        notes:
          "9A515.a.1 covers aperture 0.35-0.50 m; aperture < 0.35 m may still be ITAR XV(a)(7).",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 11",
        relationship: "derived_from",
      },
    ],
    citation: "22 CFR §121.1 Cat XV(a)(7)(i) (post 2017 Final Rule)",
    validFrom: "2017-01-15",
    notes:
      "The see-through rule applies: any ITAR-controlled component carries the host article into ITAR with no de-minimis exception.",
  },
  {
    canonicalId: "ECCN:9A515.a.1",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "a.1",
    title:
      "Spacecraft with electro-optical remote-sensing capability and aperture 0.35-0.50 m (PAN)",
    predicates: [
      { attribute: "apertureMeters", op: "between", value: [0.35, 0.5] },
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.remote_sensing.eo",
      },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial", "GOV"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(a)(7)(i)",
        relationship: "predecessor",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
        notes:
          "9A515 has no direct EU equivalent — operators use 9A004 family.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 11",
        relationship: "derived_from",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.a.1",
    validFrom: "2014-05-13",
    notes:
      "BIS Final Rule of 23 Oct 2024 added AU/CA/UK worldwide-licence carve-out — no BIS licence required for export to these three destinations.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Generic spacecraft (EU/MTCR overlap)
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "EU:9A004",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "004",
    title: "Space launch vehicles, ISS items, and spacecraft (EU Cat 9)",
    predicates: [{ attribute: "itemClass", op: "prefix", value: "spacecraft" }],
    reasonsForControl: ["WA", "MT"],
    licenseExceptions: ["EU001", "EU007"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A004",
        relationship: "analogous",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 19",
        relationship: "derived_from",
      },
    ],
    citation:
      "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A004 (as amended by Reg. (EU) 2025/2003)",
    validFrom: "2025-11-15",
    notes:
      "The 2025 Delegated Regulation revised the definition of 'spacecraft' + added 'satellite', 'space probe', 'space vehicle' definitions. Earlier classifications under 9A004 may need re-evaluation.",
  },

  // ═══════════════════════════════════════════════════════════════
  // EU 9A005 — Liquid-propellant rocket engines (EU regime)
  //
  // Sprint Z3q — EU pendant to USML IV(d) and MTCR Item 2.A.1. The EU
  // Reg. 2021/821 Annex I 9A005 covers liquid-propellant rocket
  // engines usable in MTCR Category I missile systems (≥ 300 km range,
  // ≥ 500 kg payload). The 2025 Delegated Reg. (EU) 2025/2003 retained
  // the parametric thresholds but updated the definition footnotes.
  //
  // Predicate logic: itemClass discrimination via the
  // `propulsion.liquid_rocket.*` prefix. The MTCR Cat-I parametric
  // boundary (totalImpulseNs ≥ 1.1×10⁶) doesn't apply here — 9A005 is
  // a regime-level scope entry, not a parametric threshold one.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "EU:9A005",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "005",
    title:
      "Liquid-propellant rocket engines usable in MTCR Cat I systems (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.liquid_rocket",
      },
    ],
    reasonsForControl: ["WA", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "IV(d)(2)",
        relationship: "analogous",
        notes:
          "USML IV(d)(2) controls rocket motors / engines with total impulse ≥ 1.1×10⁶ N·s — the MTCR Cat-I threshold. EU 9A005 is the EU pendant and uses the same boundary.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 2.A.1",
        relationship: "derived_from",
        notes:
          "MTCR Item 2.A.1 — complete liquid-propellant rocket motor systems. The EU implements this multilateral commitment via Annex I 9A005.",
      },
      {
        regime: "DE-AL-TEIL-IB",
        id: "9A005",
        relationship: "analogous",
        notes:
          "German national AL Teil I A 9A005 mirrors EU Annex I 9A005 exactly (no national supplement).",
      },
    ],
    citation:
      "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A005 (as amended by Reg. (EU) 2025/2003)",
    validFrom: "2025-11-15",
    notes:
      "Per the 2025 Delegated Regulation, the engine definition was tightened to exclude electric pump-fed systems below a power threshold (still under WA-LIST 25 review). Re-classify pump-fed liquid engines manufactured after 2025-11-15.",
  },

  // ═══════════════════════════════════════════════════════════════
  // MTCR Cat. I — Complete Launch Vehicles
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "MTCR:Item-1.A.1",
    regime: "MTCR-ANNEX",
    category: "1",
    productGroup: "A",
    entryNumber: "1",
    title:
      "Complete rocket systems (incl. ballistic, SLV, sounding rockets) capable of delivering at least 500 kg to ≥ 300 km",
    predicates: [
      { attribute: "rangeKm", op: "gte", value: 300 },
      { attribute: "payloadKg", op: "gte", value: 500 },
    ],
    reasonsForControl: ["MTCR-Cat-I"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "IV(a)(1)",
        relationship: "analogous",
      },
      {
        regime: "EAR-CCL",
        id: "9A004",
        relationship: "analogous",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A104",
        relationship: "analogous",
      },
    ],
    citation: "MTCR Annex, Category I, Item 1.A.1",
    validFrom: "1987-04-16",
    notes:
      "Strong-presumption-of-denial regime. Transfer of Cat I production facilities is FLATLY PROHIBITED. Cat I exports are effectively banned except in extraordinary government-to-government circumstances.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Rad-hard ICs — Z3d expansion encodes the full 9A515.d FIVE
  // conjunctive criteria from the ontology blueprint § 3.1:
  //   1. TID         ≥ 5×10⁵ Rad(Si) = 500 krad
  //   2. Dose-rate upset       ≥ 5×10⁸ Rad(Si)/s
  //   3. Neutron fluence       ≥ 1×10¹⁴ N/cm² (1 MeV equiv)
  //   4. SEU rate              ≤ 1×10⁻¹⁰ errors/bit/day
  //   5. SEL-free at LET ≥ 80 MeV·cm²/mg + dose-rate latch-up
  //                            ≥ 5×10⁸ Rad(Si)/s
  // Pre-Z3d entry only checked #1 + #4; Z3d completes the set so the
  // ITAR vs. CCL boundary is decided by the actual regulatory test.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:9A515.d",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "d",
    title:
      "Radiation-hardened microelectronic ICs meeting ALL FIVE criteria — TID, dose-rate upset, neutron fluence, SEU rate, SEL/latch-up",
    predicates: [
      { attribute: "isRadHardened", op: "eq", value: true },
      { attribute: "itemClass", op: "prefix", value: "ic.radhard" },
      // Criterion 1: TID ≥ 500 krad(Si)
      { attribute: "radHardTidKrad", op: "gte", value: 500 },
      // Criterion 2: dose-rate upset ≥ 5×10⁸ Rad(Si)/s
      {
        attribute: "doseRateUpsetRadSiPerS",
        op: "gte",
        value: 5e8,
      },
      // Criterion 3: neutron fluence ≥ 1×10¹⁴ N/cm²
      {
        attribute: "neutronFluenceNPerCm2",
        op: "gte",
        value: 1e14,
      },
      // Criterion 4: SEU rate ≤ 1×10⁻¹⁰ errors/bit/day
      { attribute: "seuRateErrorsPerBitDay", op: "lte", value: 1e-10 },
      // Criterion 5: SEL-free at LET ≥ 80 MeV·cm²/mg
      {
        attribute: "selLetThresholdMevCm2Mg",
        op: "gte",
        value: 80,
      },
    ],
    reasonsForControl: ["NS:1", "RS:1", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.e",
        relationship: "superset_of",
        notes:
          "9A515.e covers ICs meeting only criterion 1 (TID ≥ 500 krad) — drop one of the other four criteria and the part falls from .d to .e.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "3A001.a",
        relationship: "analogous",
        notes: "EU rad-hard sub-controls live under Cat 3 Electronics.",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.d (post 2014 ECR; historic XV(d) text ported in 2014)",
    validFrom: "2014-05-13",
    notes:
      "All FIVE criteria must be met conjunctively. Missing any one drops the IC to 9A515.e (if TID criterion holds) or to 3A001 general rad-hard. Most spec-sensitive threshold in space-domain classification.",
  },
  {
    canonicalId: "ECCN:9A515.e",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "e",
    title:
      "Radiation-hardened ICs with TID ≥ 5×10⁵ Rad(Si) but NOT meeting all five 9A515.d criteria (added 23 Oct 2024 IFR)",
    predicates: [
      { attribute: "isRadHardened", op: "eq", value: true },
      { attribute: "itemClass", op: "prefix", value: "ic.radhard" },
      { attribute: "radHardTidKrad", op: "gte", value: 500 },
    ],
    reasonsForControl: ["NS:2", "RS:2"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.d",
        relationship: "subset_of",
      },
      {
        regime: "EU-ANNEX-I",
        id: "3A001",
        relationship: "analogous",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.e (added by BIS IFR of 23 Oct 2024, 89 FR 84766)",
    validFrom: "2024-10-23",
    notes:
      "Created by the 2024 IFR to capture rad-hard ICs that pass the TID test but fail one of the other four criteria. Distinct legal effect from 9A515.d (lower RfC: NS2/RS2 vs NS1/RS1/AT1).",
  },

  // ═══════════════════════════════════════════════════════════════
  // 9A515.a sub-paragraphs — Z3d ships the full split
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:9A515.a.2",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "a.2",
    title:
      "Spacecraft with remote-sensing capability beyond NIR (SWIR, MWIR or LWIR)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.remote_sensing",
      },
      { attribute: "peakWavelengthNm", op: "gte", value: 900 },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(a)(7)(ii)",
        relationship: "superset_of",
        notes: "Hyperspectral (≥ 40 bands) variants flow to USML XV(a)(7)(ii).",
      },
      { regime: "EU-ANNEX-I", id: "9A004", relationship: "analogous" },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.a.2",
    validFrom: "2024-10-23",
  },
  {
    canonicalId: "ECCN:9A515.a.3",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "a.3",
    title:
      "Spacecraft with radar remote-sensing (AESA/SAR/ISAR) — center freq 1-10 GHz AND bandwidth 100-300 MHz",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.remote_sensing.sar",
      },
      { attribute: "radarCenterFreqGhz", op: "between", value: [1, 10] },
      { attribute: "radarBandwidthMhz", op: "between", value: [100, 300] },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(a)(8)",
        relationship: "successor",
        notes:
          "Radar with BW ≥ 300 MHz flows to USML XV(a)(8); BW < 100 MHz drops to 9A515.a.5 catch-all.",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.a.3 (post 2024 IFR)",
    validFrom: "2024-10-23",
    notes:
      "Bandwidth ≥ 300 MHz is USML XV(a)(8) (ITAR). This is one of the cleanest single-attribute jurisdiction flips in the entire cross-walk.",
  },
  {
    canonicalId: "USML:XV(a)(8)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "a",
    entryNumber: "8",
    title:
      "Spacecraft with radar remote-sensing (AESA/SAR/ISAR/UWB-SAR) — bandwidth ≥ 300 MHz (post-2024 carve-out)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.remote_sensing.sar",
      },
      { attribute: "radarBandwidthMhz", op: "gte", value: 300 },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.a.3",
        relationship: "successor",
        notes: "BW < 300 MHz (with center freq 1-10 GHz) drops to 9A515.a.3.",
      },
    ],
    citation: "22 CFR §121.1 Cat XV(a)(8)",
    validFrom: "2017-01-15",
  },
  {
    canonicalId: "ECCN:9A515.a.4",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "a.4",
    title:
      "Spacecraft providing space-based logistics, assembly or servicing (OSAM) of another spacecraft",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "spacecraft.osam" },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(a)(12)",
        relationship: "successor",
        notes:
          "Inspection/surveillance/servicing via grappling/docking is USML XV(a)(12) — except those docking exclusively via NASA Docking System flow here.",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.a.4 (clarified by 2024 IFR: docking, refuelling, life-sustaining ops, debris capture)",
    validFrom: "2024-10-23",
  },

  // ═══════════════════════════════════════════════════════════════
  // USML XV(e) — high-value sub-paragraph predicates (Z3d)
  // ═══════════════════════════════════════════════════════════════
  // T-M16 fix (2026-05-30): Replaced the bogus `transmitPowerW gte 0.3`
  // stand-in (a comms transmit-power threshold that falsely fired on any
  // EP item with RF hardware) with the REAL conjunctive predicates:
  //   thrustNewtons ≥ 0.3  (= 300 mN; thrustNewtons stores thrust in N)
  //   specificImpulseSecondsVacuum ≥ 1500
  // The disjunctive >15 kW input-power path is a separate entry below
  // (XV(e)(11)(iv)-power-path); the matcher ORs across entries.
  {
    canonicalId: "USML:XV(e)(11)(iv)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "e",
    entryNumber: "11",
    subpara: "(iv)",
    title:
      "Electric propulsion (plasma/ion) with thrust > 300 mN AND Isp > 1500 s",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "propulsion.electric" },
      // thrustNewtons is stored in Newtons; 300 mN = 0.3 N.
      { attribute: "thrustNewtons", op: "gte", value: 0.3 },
      // specificImpulseSecondsVacuum is stored in seconds.
      { attribute: "specificImpulseSecondsVacuum", op: "gte", value: 1500 },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.x-ep",
        relationship: "successor",
        notes:
          "Lower-power EP (Hall, FEEP, ion) falls to 9A515.x EP sub-paragraph.",
      },
      { regime: "MTCR-ANNEX", id: "Item 2", relationship: "derived_from" },
    ],
    citation: "22 CFR §121.1 Cat XV(e)(11)(iv)",
    validFrom: "2017-01-15",
    notes:
      "Conjunctive thrust-AND-Isp path of the disjunctive USML rule. The >15 kW input-power disjunct is encoded as a separate entry XV(e)(11)(iv)-power-path (matcher ORs across entries). T-M16.",
  },
  // T-M16 — the XV(e)(11)(iv) >15 kW input-power disjunct.
  // peakPowerWatts is stored in Watts; 15 kW = 15 000 W.
  {
    canonicalId: "USML:XV(e)(11)(iv)-power-path",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "e",
    entryNumber: "11",
    subpara: "(iv)-power-path",
    title:
      "Electric propulsion (plasma/ion) with input power > 15 kW (power-path disjunct of XV(e)(11)(iv))",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "propulsion.electric" },
      // peakPowerWatts stores EP input power in Watts; 15 kW = 15 000 W.
      { attribute: "peakPowerWatts", op: "gte", value: 15_000 },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(e)(11)(iv)",
        relationship: "analogous",
        notes:
          "Sibling entry encoding the thrust+Isp conjunctive path of the same XV(e)(11)(iv) disjunctive rule.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.x-ep",
        relationship: "successor",
        notes:
          "EP below the 15 kW threshold falls to 9A515.x EP sub-paragraph.",
      },
    ],
    citation: "22 CFR §121.1 Cat XV(e)(11)(iv)",
    validFrom: "2017-01-15",
    notes:
      "Power-path disjunct of the XV(e)(11)(iv) rule. Captures Hall-effect, ion, or plasma thrusters whose input power exceeds 15 kW regardless of thrust/Isp. T-M16.",
  },
  {
    canonicalId: "USML:XV(e)(16)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "e",
    entryNumber: "16",
    title:
      "Space-qualified star trackers — accuracy ≤ 1 arcsec (1σ) AND tracking rate ≥ 3.0 deg/s",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.adcs.star_tracker",
      },
      { attribute: "starTrackerAccuracyArcsec", op: "lte", value: 1.0 },
      { attribute: "starTrackerSlewRateDegPerS", op: "gte", value: 3.0 },
    ],
    reasonsForControl: ["ITAR", "MT"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.x",
        relationship: "successor",
        notes: "Star trackers failing either threshold fall to 9A515.x.",
      },
      { regime: "MTCR-ANNEX", id: "Item 9", relationship: "derived_from" },
    ],
    citation: "22 CFR §121.1 Cat XV(e)(16)",
    validFrom: "2017-01-15",
    notes:
      "Conjunctive: BOTH accuracy AND slew-rate thresholds must hold. MT-controlled (missile applicability).",
  },
  {
    canonicalId: "USML:XV(e)(1)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "e",
    entryNumber: "1",
    title:
      "Antenna systems > 25 m diameter, OR active electronic scanning, OR adaptive beam forming, OR interferometric radar",
    predicates: [
      // Disjunctive — the antenna is ITAR if ANY of the listed traits
      // is present. Encode the 25 m predicate; the boolean flags are
      // alternative entries below (one per disjunct).
      { attribute: "antennaDiameterM", op: "gt", value: 25 },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.x",
        relationship: "successor",
      },
    ],
    citation: "22 CFR §121.1 Cat XV(e)(1)",
    validFrom: "2017-01-15",
  },

  // ═══════════════════════════════════════════════════════════════
  // MTCR Cat. I propulsion — impulse threshold
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "USML:IV(d)(2)",
    regime: "ITAR-USML",
    category: "IV",
    productGroup: "d",
    entryNumber: "2",
    title:
      "Rocket motors / engines with total impulse ≥ 1.1×10⁶ N·s (MTCR Cat I threshold)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "propulsion.chemical" },
      { attribute: "totalImpulseNs", op: "gte", value: 1.1e6 },
    ],
    reasonsForControl: ["ITAR", "MT"],
    licenseExceptions: [],
    seeAlso: [
      { regime: "EU-ANNEX-I", id: "9A007", relationship: "analogous" },
      { regime: "MTCR-ANNEX", id: "Item 2", relationship: "derived_from" },
    ],
    citation: "22 CFR §121.1 Cat IV(d)(2)",
    validFrom: "2014-12-01",
    notes:
      "MTCR Cat I — strong presumption of denial. The 1.1×10⁶ N·s threshold is one of the most important quantitative tripwires in the entire cross-walk.",
  },
  {
    canonicalId: "USML:IV(d)(3)",
    regime: "ITAR-USML",
    category: "IV",
    productGroup: "d",
    entryNumber: "3",
    title:
      "Rocket motors / engines with total impulse 8.41×10⁵ ≤ It < 1.1×10⁶ N·s (MTCR Cat II)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "propulsion.chemical" },
      {
        attribute: "totalImpulseNs",
        op: "between",
        value: [8.41e5, 1.1e6],
      },
    ],
    reasonsForControl: ["ITAR", "MT"],
    licenseExceptions: [],
    seeAlso: [
      { regime: "EU-ANNEX-I", id: "9A105", relationship: "analogous" },
      { regime: "MTCR-ANNEX", id: "Item 3", relationship: "derived_from" },
    ],
    citation: "22 CFR §121.1 Cat IV(d)(3)",
    validFrom: "2014-12-01",
    notes:
      "MTCR Cat II — case-by-case review. The 8.41×10⁵ N·s lower threshold is the 9A105/9A107 boundary on the EU side.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Electric propulsion (Hall thruster / ion thruster)
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:9A515.x-ep",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "x (electric propulsion)",
    title:
      "Electric propulsion systems for spacecraft (Hall-effect, ion, electrothermal)",
    predicates: [
      { attribute: "IspSeconds", op: "gte", value: 1000 },
      { attribute: "itemClass", op: "prefix", value: "propulsion.electric" },
      // Sprint Z3g — 9A515.x is the "specially designed parts for
      // 9A515.a-.g" catch-all (15 CFR 774 Supp. 1 Cat 9). A laboratory
      // ion engine sold for terrestrial research falls outside; only
      // SD-for-spacecraft variants are controlled here.
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
        notes:
          "EU rolls EP into 9A004 family rather than separate sub-paragraph.",
      },
      {
        regime: "ITAR-USML",
        id: "XV(e)(12)",
        relationship: "predecessor",
        notes: "Some EP variants (anti-jam-related Hall) still on USML.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 2",
        relationship: "derived_from",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.x (electric propulsion sub-paragraph)",
    validFrom: "2014-05-13",
    notes:
      "Hall thrusters typically Isp 1500-2500 s; ion thrusters 3000-9000 s. Either qualifies for 9A515.x EP designation. Lower-Isp electrothermal systems may fall outside.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Reaction wheel / momentum wheel
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:9A515.x-rw",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "x (reaction wheels)",
    title: "Reaction wheels / momentum wheels for spacecraft attitude control",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.adcs.reaction_wheel",
      },
      // Sprint Z3g — Per the 2014 IFR preamble (79 FR 27184), reaction/
      // momentum wheels were EXCLUDED from USML XV(e)(13) and assigned
      // to 9A515.x ONLY when specially designed for spacecraft.
      // Commercial mechanical fly-wheels (e.g. uninterruptible power
      // supplies, industrial flywheels) are NOT controlled here.
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["NS:2", "RS:2"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A005",
        relationship: "analogous",
      },
      {
        regime: "ITAR-USML",
        id: "XV(e)(20)",
        relationship: "predecessor",
        notes: "Higher-precision RWs may still trigger USML XV(e)(20).",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.x (reaction-wheel sub-paragraph)",
    validFrom: "2014-05-13",
  },

  // ═══════════════════════════════════════════════════════════════
  // 9A515.g — Specially designed components for 9A515.a.1-.a.4
  //
  // Sprint Z3i — Per the May 2026 ontology research § 3:
  //   "9A515.g — Components specially designed for the more sensitive
  //    remote-sensing spacecraft 9A515.a.1-.a.4."
  //
  // This is the catch-all parts entry for the four sensitive remote-
  // sensing categories. Whereas 9A515.x is the *broader* catch-all
  // covering parts for ANY 9A515.a-.g entry, 9A515.g specifically
  // targets components designed for the SENSITIVE remote-sensing
  // satellites (high-resolution EO, SWIR/MWIR/LWIR, SAR, OSAM).
  //
  // Distinction from 9A515.x:
  //   - 9A515.g  → component designed for 9A515.a.1-.a.4 systems
  //                (NS:2 RS:2 — tighter reasons-for-control)
  //   - 9A515.x  → component designed for the broader 9A515.a-.g
  //                family (still NS:2 RS:2 since 2024 IFR but
  //                covers more downstream sub-paragraphs)
  //
  // The itemClass prefix convention introduced here
  // (`component.spacecraft.remote_sensing.*`) is distinct from the
  // spacecraft-level prefixes used by 9A515.a.1-.a.4 entries — the
  // matcher discriminates: an EO satellite goes to .a.1, but a
  // component DESIGNED FOR an EO satellite goes to .g.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:9A515.g",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "g",
    title:
      "Components specially designed for the sensitive remote-sensing spacecraft 9A515.a.1-.a.4",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "component.spacecraft.remote_sensing",
      },
      // Sprint Z3i — 9A515.g is by definition a "specially designed"
      // catch-all. Without the SD predicate, a generic earth-
      // observation sensor sold for terrestrial photogrammetry
      // (e.g. UAV mapping camera) would be over-classified here.
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.a.1",
        relationship: "components_of",
        notes:
          "9A515.g controls components specially designed for 9A515.a.1 (high-resolution EO) spacecraft.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.a.2",
        relationship: "components_of",
        notes:
          "9A515.g controls components for 9A515.a.2 (SWIR/MWIR/LWIR) spacecraft.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.a.3",
        relationship: "components_of",
        notes: "9A515.g controls components for 9A515.a.3 (SAR) spacecraft.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.a.4",
        relationship: "components_of",
        notes: "9A515.g controls components for 9A515.a.4 (OSAM) spacecraft.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.x",
        relationship: "subset_of",
        notes:
          "9A515.x is the broader catch-all for components designed for 9A515.a-.g family; 9A515.g is the narrower scope limited to the sensitive remote-sensing categories.",
      },
      {
        regime: "ITAR-USML",
        id: "XV(a)(7)",
        relationship: "predecessor",
        notes:
          "Components of USML XV(a)(7) high-resolution remote-sensing spacecraft were moved to 9A515.g in the 2014 IFR.",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.g — 'Components specially designed for 9A515.a.1-.a.4 spacecraft.'",
    validFrom: "2014-05-13",
    notes:
      "If a part also fits the broader 9A515.x catch-all, both entries may match — the operator should select the narrower (9A515.g) as the controlling classification per the Order-of-Review principle for sub-paragraph specificity.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Control Moment Gyros (CMG) — USML XV(e)(13)
  //
  // Sprint Z3h — Closes ontology research caveat #7:
  //   "Reaction / momentum wheels are explicitly NOT controlled in
  //    USML XV(e)(13) (per the 2014 IFR preamble, 79 FR 27184). They
  //    fall to ECCN 9A515.x. Frequent classification error."
  //
  // CMGs and reaction wheels are *physically* similar (both spin to
  // store / release angular momentum) but legally distinct. CMGs use
  // a *gimballed* high-momentum rotor — torque is generated by tilting
  // the spin axis. Reaction wheels modulate motor speed. ITAR XV(e)(13)
  // controls CMGs; 9A515.x controls reaction wheels. The matcher must
  // never collapse them.
  //
  // The itemClass prefix below (spacecraft.adcs.cmg) is intentionally
  // distinct from the reaction-wheel prefix (spacecraft.adcs.reaction_wheel).
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "USML:XV(e)(13)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "e",
    entryNumber: "13",
    title:
      "Control moment gyros (CMG) specially designed for spacecraft (ITAR XV(e)(13))",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "spacecraft.adcs.cmg" },
      // CMGs are USML only when specially designed for spacecraft.
      // Aircraft / submarine CMGs (e.g. CMG-stabilised aircraft for
      // earth-observation surveys) fall outside XV(e)(13) and may be
      // controlled by other categories.
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.x-rw",
        relationship: "successor",
        notes:
          "Reaction / momentum wheels (NOT CMGs) were moved to 9A515.x by the 2014 IFR — per 79 FR 27184 preamble. Frequent classification error to confuse the two.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
        notes: "EU rolls CMG into 9A004 family (spacecraft components).",
      },
      {
        regime: "WASSENAAR",
        id: "ML11",
        relationship: "analogous",
        notes:
          "Wassenaar military list category 11 (electronic equipment) covers CMGs through ML11.a.",
      },
    ],
    citation:
      "22 CFR §121.1 USML Cat XV(e)(13) — 'Control moment gyros (CMG) specially designed for spacecraft.' 2014 IFR preamble at 79 FR 27184 (clarification on reaction wheel exclusion).",
    validFrom: "2014-05-13",
    notes:
      "DO NOT match reaction wheels here — they belong to 9A515.x-rw. The itemClass prefix discriminates. Per the 2014 IFR preamble, the regulator's stated intent was to leave CMGs in USML while moving the lower-torque reaction wheels to EAR.",
  },

  // ═══════════════════════════════════════════════════════════════
  // ECCN 7A005 — Global Navigation Satellite System (GNSS) receivers
  //
  // Sprint Z3v — Closes the GNSS coverage gap on the EAR side. The
  // cross-walk already has USML XII anti-jam GNSS (the high-end
  // ITAR-side entry); 7A005 is the EAR-side broad GNSS-receiver
  // control that triggers on velocity / altitude characteristics
  // typical of missile / launch-vehicle applications.
  //
  // The 7A005 parametric criterion is operationally important: a
  // commercial-grade GNSS receiver suddenly becomes export-controlled
  // when its claimed maximum velocity exceeds 600 m/s OR maximum
  // altitude exceeds 18 km (MTCR Item 11 thresholds, embedded into
  // EAR 7A005 by the COCOM-era Wassenaar harmonisation).
  //
  // Uses the Z3e `gnssMaxVelocityMPerS` typed attribute. No altitude
  // attribute is in the schema yet — operators can populate it via
  // parametricAttributes JSON if needed (the matcher reads JSON as
  // fallback). For most space-domain use cases velocity is the
  // controlling criterion.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:7A005",
    regime: "EAR-CCL",
    category: "7",
    productGroup: "A",
    entryNumber: "005",
    title:
      "GNSS receivers usable above 600 m/s (MTCR Item 11 velocity threshold)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "gnss.receiver" },
      // The MTCR Item 11 velocity threshold. Below 600 m/s, a
      // commercial GNSS receiver typically falls to EAR99
      // (uncontrolled) or 7A994 (lower-tier). At-or-above 600 m/s
      // it triggers 7A005 NS/MT controls.
      { attribute: "gnssMaxVelocityMPerS", op: "gte", value: 600 },
    ],
    reasonsForControl: ["NS:2", "MT:1", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XII-antijam-gnss",
        relationship: "predecessor",
        notes:
          "Anti-jam variants stay ITAR under USML XII (per the 2024 BIS/DDTC IFR). 7A005 covers the non-anti-jam high-velocity / high-altitude GNSS receivers that fall to EAR.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 11",
        relationship: "derived_from",
        notes:
          "MTCR Item 11 sets the 600 m/s / 18 km thresholds for GNSS receiver controls. 7A005 is the EAR implementation.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "7A005",
        relationship: "analogous",
        notes:
          "EU Reg. 2021/821 Annex I 7A005 mirrors the EAR threshold values.",
      },
      {
        regime: "WASSENAAR",
        id: "Cat 7",
        relationship: "derived_from",
        notes:
          "The COCOM-era Wassenaar Cat 7 harmonisation embedded MTCR Item 11 into multilateral GNSS controls. 7A005 is the US implementation.",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 7 ECCN 7A005 — 'GNSS receiving equipment having any of the following: velocity > 600 m/s; altitude > 18 km'",
    validFrom: "1997-08-01",
    notes:
      "A receiver's CLAIMED maximum operating velocity / altitude (typically from the datasheet 'environmental' section) is the controlling spec, not its tested operational range. Many commercial receivers claim < 600 m/s explicitly to stay out of 7A005 — verify against the datasheet, not the marketing copy.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Anti-jam GNSS receiver (still ITAR Cat XII / formerly XV(c))
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "USML:XII-antijam-gnss",
    regime: "ITAR-USML",
    category: "XII",
    productGroup: "a",
    entryNumber: "0",
    title:
      "Anti-jam GNSS/PNT receivers (fire-control / formerly XV(c) per the 2024 IFR)",
    predicates: [
      { attribute: "isAntiJam", op: "eq", value: true },
      { attribute: "itemClass", op: "prefix", value: "gnss.receiver.antijam" },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "7A005",
        relationship: "successor",
        notes:
          "Non-anti-jam GNSS receivers fall to 7A005 (still controlled but EAR, not ITAR).",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 11",
        relationship: "derived_from",
      },
    ],
    citation: "22 CFR §121.1 Cat XII (anti-jam GNSS sub-paragraph)",
    validFrom: "2024-10-23",
    notes:
      "The 2024 BIS/DDTC IFR clarified that anti-jam GNSS receivers stay ITAR — XII (Fire Control) rather than the older XV(c) entry.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Ground station (TT&C) — formerly XV(b) for XV(a) spacecraft
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "USML:XV(b)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "b",
    entryNumber: "0",
    title:
      "Ground control systems and training simulators specially designed for TT&C of XV(a) spacecraft",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "ground.station.ttc" },
      // Sprint Z3g — USML XV(b) explicitly applies only to ground
      // stations SPECIALLY DESIGNED for TT&C of XV(a) (military or
      // intelligence) spacecraft. Civilian/commercial TT&C ground
      // stations fall to 9A515.b (EAR). The boolean discriminator is
      // load-bearing here — without it we'd misclassify every
      // commercial TT&C antenna as ITAR.
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.b",
        relationship: "successor",
        notes:
          "Ground stations for civilian (CCL) spacecraft → 9A515.b, not USML.",
      },
    ],
    citation: "22 CFR §121.1 Cat XV(b)",
    validFrom: "2017-01-15",
  },

  // Note: an earlier itemClass-only entry for 9A515.a.3 (Z3b seed)
  // was superseded by the Z3d entry above with the full radar
  // freq + bandwidth predicates. Both shared the same canonicalId,
  // which broke the threshold flip (BW > 300 MHz should fail .a.3
  // but the itemClass-only entry was still matching on itemClass
  // alone). The Z3d entry is the legally-correct shape.

  // ═══════════════════════════════════════════════════════════════
  // USML XV(e)(17) — Hosted payload performing any XV(a) function
  //
  // Sprint Z3m — Per ontology research § 3:
  //   "(e)(17) primary/secondary/hosted payload performing any (a)
  //    function (the see-through rule stays on the payload itself;
  //    a 9A515.a spacecraft hosting an ITAR (e)(17) hosted payload
  //    remains EAR for the spacecraft and ITAR for the payload)."
  //
  // This entry classifies HOSTED payloads (primary or secondary) that
  // perform functions equivalent to 9A515.a.1-.a.4. The legal effect
  // is significant — under ITAR § 123.1(b), the see-through rule means
  // the payload remains ITAR-controlled even when riding on an
  // otherwise-EAR spacecraft bus. Removal of the payload from the bus
  // is a "retransfer" requiring ITAR authorization.
  //
  // The matcher does NOT auto-propagate ITAR jurisdiction to the host
  // bus (that requires a BOM model; deferred to Z3n / see-through
  // sprint). What it DOES do: surface XV(e)(17) as a candidate so the
  // operator KNOWS to apply the see-through rule manually for now.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "USML:XV(e)(17)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "e",
    entryNumber: "17",
    title:
      "Hosted payload (primary or secondary) performing any 9A515.a function — see-through rule applies",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.hosted_payload",
      },
      // XV(e)(17) is ITAR specifically because it performs an XV(a)
      // function — that's the SD-for-military-grade-remote-sensing
      // qualifier. Civilian hosted payloads not performing XV(a)
      // functions fall to EAR 9A515.x or 9A515.g.
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(a)",
        relationship: "components_of",
        notes:
          "XV(e)(17) catches payloads performing any XV(a) function (high-res EO, SAR, OSAM, etc.) regardless of host-bus jurisdiction.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.g",
        relationship: "analogous",
        notes:
          "Non-ITAR hosted payloads designed for 9A515.a.1-.a.4 functions fall to 9A515.g (EAR). The discriminator is whether the payload meets the 'XV(a) function' threshold (military-grade resolution / sensitivity) — civilian-grade goes EAR.",
      },
    ],
    citation:
      "22 CFR §121.1 USML Cat XV(e)(17) — 'Hosted payload performing any XV(a) function.' ITAR § 123.1(b) see-through rule: payload remains ITAR-controlled across host-bus jurisdiction.",
    validFrom: "2014-05-13",
    notes:
      "OPERATIONAL FLAG: when this entry matches, the operator must apply the see-through rule (ITAR § 123.1(b)) — the payload is ITAR even on an EAR host bus. Removal of the payload from the bus is a 'retransfer' requiring DDTC authorization. Auto-propagation to the host bus is deferred to a future BOM-graph sprint.",
  },

  // ═══════════════════════════════════════════════════════════════
  // 9A515.f — Spacecraft mission elements / software (EAR-CCL)
  //
  // Sprint Z3t — Per ontology research § 3:
  //   "9A515.f covers spacecraft mission elements: TT&C software,
  //    mission-planning software, on-board flight software for
  //    9A515.a-.g spacecraft."
  //
  // Software-side closure: until Z3t the cross-walk had hardware
  // entries only. Spacecraft flight software / mission-planning
  // software for 9A515.a-.g spacecraft is controlled under 9A515.f
  // (and goes to USML XV(f) for ITAR-side controls of military
  // spacecraft software).
  //
  // New itemClass convention: `software.spacecraft.*` prefix.
  // Distinct from `spacecraft.*` (the hardware-side prefix used by
  // 9A515.a entries). The matcher discriminates: an EO satellite
  // (hardware) → 9A515.a.1; its flight software → 9A515.f.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:9A515.f",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "f",
    title:
      "Spacecraft mission-element software (flight software, TT&C, mission planning) for 9A515.a-.g",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "software.spacecraft",
      },
      // Software is by definition specially designed for the
      // spacecraft it operates. Generic ground-control or commercial-
      // office software does NOT match — the prefix is the gate.
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(f)",
        relationship: "predecessor",
        notes:
          "Software for USML XV(a) military / intelligence spacecraft stays ITAR XV(f). The 2014 ECR moved civilian / commercial spacecraft software to 9A515.f.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9D004",
        relationship: "analogous",
        notes:
          "EU rolls spacecraft software into 9D004 (separate D-group entry for software). 9A515.f's coverage is broadly equivalent for civilian items.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.a.1",
        relationship: "components_of",
        notes:
          "9A515.f software for spacecraft of 9A515.a.1-.a.4 sub-types is controlled at the same NS:2/RS:2/AT:1 reasons-for-control.",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.f — 'Software specially designed or modified for the development, production, operation or maintenance of 9A515.a-.g items.'",
    validFrom: "2014-05-13",
    notes:
      "Source code, object code and electronic technical data ALL fall under 9A515.f when specially designed for 9A515.a-.g operation. Transfer to foreign nationals inside the EU may also trigger deemed-export controls (22 CFR § 120.17 / 15 CFR § 734.13) — see Z13 deemed-export sprint.",
  },

  // ═══════════════════════════════════════════════════════════════
  // 9A515.b — Ground control systems for civilian spacecraft (EAR)
  //
  // Sprint Z3j — The EAR-side companion to USML:XV(b). The 2014 ECR
  // bifurcated ground stations:
  //   - Military / intelligence TT&C → USML XV(b) (ITAR)
  //   - Civilian / commercial TT&C  → 9A515.b (EAR, STA-eligible)
  //
  // The decisive predicate is `isSpeciallyDesigned: false` — if the
  // operator declares the ground station NOT specially designed for
  // military spacecraft, it routes to 9A515.b. If declared specially
  // designed (military), it routes to USML XV(b) via the Z3g entry.
  // The two are mutually exclusive by design.
  //
  // Without this entry, a civilian TT&C antenna would have NO match
  // in the cross-walk — even though it is in fact controlled under
  // 9A515.b. This was a coverage gap closed by Z3j.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:9A515.b",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "b",
    title:
      "Ground control systems and training simulators for civilian / commercial spacecraft TT&C (EAR)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "ground.station.ttc" },
      // Sprint Z3j — civilian TT&C ground stations are 9A515.b, the
      // 'not specially designed for military spacecraft' carve-out.
      // The boolean discriminator IS the regulatory line — SD=true
      // routes to USML XV(b) (ITAR), SD=false stays on EAR 9A515.b.
      { attribute: "isSpeciallyDesigned", op: "eq", value: false },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:full"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(b)",
        relationship: "predecessor",
        notes:
          "Military/intelligence TT&C ground stations remain ITAR XV(b). The discriminator is `isSpeciallyDesigned` — military → ITAR, civilian → EAR 9A515.b.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
        notes: "EU rolls civilian ground stations into 9A004 family.",
      },
      {
        regime: "WASSENAAR",
        id: "Cat 9",
        relationship: "analogous",
        notes:
          "WA-LIST (25) 1 Corr. references ground-based satellite-control equipment in Category 9.",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.b — 'Ground control systems and training simulators for spacecraft' (the civilian carve-out from USML XV(b)).",
    validFrom: "2014-05-13",
    notes:
      "STA-eligible: full means License Exception STA may apply to most destinations on Country Group A:5/A:6 (subject to STA preconditions like end-user assurances).",
  },

  // ═══════════════════════════════════════════════════════════════
  // Sprint Z24a (Tier 3) — EU Annex I Cat 9 core 9A006-9A012
  //
  // Adds parametric cross-walk entries for the four EU Cat-9 codes
  // where the matcher engine needs typed predicates to discriminate
  // (9A006, 9A008, 9A011, 9A012). 9A007/9A009/9A010 are scope-level
  // entries (predicate-only on itemClass prefix) and remain captured
  // via the textual entries in src/data/trade/eu-annex-i.ts.
  //
  // Sources:
  //   - EU Reg. (EU) 2021/821 Annex I, Cat. 9 (consolidated text)
  //   - Delegated Reg. (EU) 2025/2003 (OJ L 2025/2003, 14.11.2025;
  //     in force 15.11.2025) — 9A006 cryogenic feed-system carve-in
  //     at T ≤ 100 K
  //   - MTCR Annex (current) — Items 2, 3, 19 for the missile-tech
  //     cross-references
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "EU:9A006",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "006",
    title:
      "Components & support equipment for liquid-propellant rocket engines (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.liquid_rocket.component",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["WA", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A005",
        relationship: "components_of",
        notes:
          "9A006 controls turbopumps, injectors, combustion chambers and other specially-designed components FOR 9A005 liquid-propellant rocket engines.",
      },
      {
        regime: "ITAR-USML",
        id: "IV(h)",
        relationship: "analogous",
        notes:
          "USML IV(h) controls specially-designed parts and components of USML IV(d) rocket engines. EU 9A006 is the EU pendant.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 3.A.1",
        relationship: "derived_from",
        notes:
          "MTCR Item 3.A.1 covers turbopumps and rocket-engine sub-systems usable in Cat-I/II propulsion.",
      },
      {
        regime: "EAR-CCL",
        id: "9A006",
        relationship: "analogous",
      },
    ],
    citation:
      "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A006 (as amended by Delegated Reg. (EU) 2025/2003 — cryogenic-feed-system carve-in at T ≤ 100 K)",
    validFrom: "2025-11-15",
    notes:
      "The 2025 Delegated Regulation explicitly added cryogenic feed-system components (LH2/LCH4 valves, density-flow meters, density-line heat exchangers) operating at T ≤ 100 K. Coverage of these items shifted from a Note under 9A005 into the body of 9A006.",
  },
  {
    canonicalId: "EU:9A008",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "008",
    title: "Components for solid-propellant rocket motors (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.solid_rocket.component",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["WA", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A007",
        relationship: "components_of",
        notes:
          "9A008 controls motor cases, nozzles, igniters, and TVC sub-systems specially designed for 9A007 solid-propellant rocket motors.",
      },
      {
        regime: "ITAR-USML",
        id: "IV(h)",
        relationship: "analogous",
        notes:
          "USML IV(h) controls parts and components for USML IV(d) rocket motors. Carbon-carbon nozzle throats above thermal-cycle thresholds escalate to MTCR Cat I via USML IV(d)(2).",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 3.A.2",
        relationship: "derived_from",
        notes:
          "MTCR Item 3.A.2 — solid-propellant rocket motor cases & nozzles.",
      },
      {
        regime: "EAR-CCL",
        id: "9A008",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A008",
    validFrom: "2021-09-09",
    notes:
      "The 2025/2003 Delegated Regulation did not modify 9A008. Carbon-carbon throats remain the most common screening boundary — re-evaluate any throat with density ≥ 1.85 g/cm³ for MTCR Cat-I escalation.",
  },
  {
    canonicalId: "EU:9A011",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "011",
    title:
      "Electric / plasma propulsion systems — Hall-effect, ion, FEEP, PPT (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.electric",
      },
      // Capture threshold: specific impulse ≥ 1,500 s. Below this, the
      // entry typically does not bite (low-thrust hobbyist / academic
      // cubesat thrusters fall out).
      {
        attribute: "IspSeconds",
        op: "gte",
        value: 1500,
      },
    ],
    reasonsForControl: ["WA", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(e)(11)(iv)",
        relationship: "successor",
        notes:
          "USML XV(e)(11)(iv) controls EP with thrust > 300 mN AND Isp > 1,500 s, OR input power > 15 kW. EU 9A011 is the EU pendant and uses the Isp ≥ 1,500 s capture threshold.",
      },
      {
        regime: "EAR-CCL",
        id: "9A011",
        relationship: "analogous",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 2",
        relationship: "derived_from",
      },
    ],
    citation:
      "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A011 (consolidated as of 2025/2003)",
    validFrom: "2021-09-09",
    notes:
      "Disjunctive thresholds: capture by Isp ≥ 1,500 s; alternative input-power path (≥ 15 kW) is handled via the see-also USML XV(e)(11)(iv)-power-path entry. PCUs/PPUs from US fabs trigger De-minimis even when the thruster itself is EU-origin.",
  },
  {
    canonicalId: "EU:9A012",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "012",
    title:
      "Unmanned aerial vehicles & remotely-piloted aircraft systems (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "aerospace.uav",
      },
      // MTCR Cat-I overlap path: range ≥ 300 km AND payload ≥ 500 kg.
      // When BOTH predicates hold, this matches as a Cat-I escalation
      // and the operator-facing UI should surface the 9A104 cross-walk
      // as well.
      {
        attribute: "rangeKm",
        op: "gte",
        value: 300,
      },
      {
        attribute: "payloadKg",
        op: "gte",
        value: 500,
      },
    ],
    reasonsForControl: ["WA", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A104",
        relationship: "analogous",
        notes:
          "9A104 covers sounding rockets and unmanned air vehicles at the MTCR Cat-I threshold (range ≥ 300 km + payload ≥ 500 kg). 9A012 captures the broader UAV class; the two overlap on the high-end Cat-I corner.",
      },
      {
        regime: "ITAR-USML",
        id: "VIII(a)",
        relationship: "successor",
        notes:
          "Military-grade UAVs and armed-payload variants flow to USML VIII(a). 9A012 explicitly excludes ITAR-controlled military UAVs.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 1.A.2",
        relationship: "derived_from",
        notes:
          "MTCR Item 1.A.2 covers complete UAV systems including cruise missiles at the 300 km / 500 kg Cat-I boundary.",
      },
      {
        regime: "EAR-CCL",
        id: "9A012",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A012",
    validFrom: "2021-09-09",
    notes:
      "Below the 300 km / 500 kg threshold but with autonomous flight-control / out-of-line-of-sight capability, the broader 9A012 capture still bites — the parametric entry above encodes the MTCR Cat-I corner only. Operators with autonomous-capability UAVs below 300 km should classify via the itemClass-prefix path + manual review.",
  },

  // ═══════════════════════════════════════════════════════════════
  // 6A002.a.1 — Optical telescopes / sensors with aperture ≥ 350 mm
  //
  // Demo entry for Z25 — extend in Z24/Z26 sprints.
  //
  // Sprint Z25 (2026-05-22): demonstrates the apertureMM tier-3
  // attribute end-to-end. The EU Annex I 6A002.a.1 entry controls
  // "imaging sensors" and a large family of optical equipment where
  // the primary-optic aperture exceeds 350 mm. This is a different
  // boundary from 9A515.a.1 (sub-0.50 m spacecraft aperture, encoded
  // in meters); 6A002 is sensor-level optics and conventionally
  // expressed in millimeters in datasheets.
  //
  // The predicate uses the new tier-3 `apertureMM` attribute so
  // operators datasheet-supplying values in mm don't have to convert
  // to meters first (and risk a unit-conversion bug at the 350 mm
  // boundary — which is 0.35 m, where the 9A515.a.1 lower bound also
  // sits, making confusion very plausible).
  //
  // Full Cat-6 coverage (6A002.a.1 sub-paras, 6A003 imaging, 6A005
  // lasers) follows in Z24/Z26.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "EU:6A002.a.1",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "002",
    subpara: "a.1",
    title:
      "Optical sensors / imaging telescopes with primary-optic aperture ≥ 350 mm (EU Cat 6)",
    predicates: [
      { attribute: "apertureMM", op: "gte", value: 350 },
      {
        attribute: "itemClass",
        op: "prefix",
        value: "sensor.optical",
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A002.a.1",
        relationship: "analogous",
        notes:
          "CCL 6A002.a.1 mirrors the EU Annex I aperture threshold. Operators with US-origin glass should also evaluate EAR de-minimis if the sensor integrates into a non-US final article.",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.2.a.1",
        relationship: "derived_from",
        notes:
          "Wassenaar Cat 6 Item A.2.a.1 — the multilateral baseline for optical-sensor aperture controls. The EU and CCL implementations both flow from this list entry.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A002.a.1",
    validFrom: "2021-09-09",
    notes:
      "Demo entry for Z25 — exercises the apertureMM tier-3 parametric attribute. Operators with datasheet apertures in meters should also populate apertureMeters for 9A515.a.1 evaluation; the two predicates target different regulatory boundaries (sensor-level 6A002 vs spacecraft-level 9A515.a.1).",
  },

  // ═══════════════════════════════════════════════════════════════
  // Sprint Z24b (Tier 3) — MTCR-derived 9A101-9A121
  //
  // Adds parametric cross-walk entries for the MTCR-derived 9A1xx
  // family in EU Annex I Cat 9. The MTCR Cat-I tripwires (range × payload,
  // total impulse) are the critical hard-edge parameters here — the
  // matcher must flip from Cat-II review to "strong presumption of denial"
  // when the Cat-I thresholds are crossed.
  //
  // Sources:
  //   - EU Reg. (EU) 2021/821 Annex I, Cat. 9 (consolidated text)
  //   - MTCR Equipment, Software and Technology Annex (current)
  //   - Items 1-20 of the MTCR Annex map to the 9A1xx entries via
  //     EU's transposition table
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "EU:9A101",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "101",
    title: "Turbojet/turbofan engines for MTCR-relevant UAVs (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.turbojet",
      },
      // MTCR Item 3.A.1 threshold: max thrust > 400 N (excluding civil-
      // certified variants). Below this, the entry typically does not
      // bite — small APU-class turbines fall out.
      {
        attribute: "totalImpulseNs",
        op: "gte",
        value: 400,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "MTCR-ANNEX",
        id: "Item 3.A.1",
        relationship: "derived_from",
        notes:
          "MTCR Item 3.A.1 — turbojet/turbofan engines usable in Cat-I UAVs.",
      },
      {
        regime: "EAR-CCL",
        id: "9A101",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A101",
    validFrom: "2021-09-09",
    notes:
      "Civil-certified small turbines (FAA Part 33 / EASA CS-E) are excluded — the carve-out is the dominant compliance path for commercial drone-engine vendors operating below the MTCR-Cat-I-host envelope.",
  },
  {
    canonicalId: "EU:9A102",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "102",
    title: "Reusable space vehicles (EU Cat 9, MTCR-derived)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "aerospace.reusable_vehicle",
      },
      // MTCR Cat-I trip: range ≥ 300 km AND payload ≥ 500 kg. Same
      // hard-edge tripwire as 9A004/9A012/9A104.
      {
        attribute: "rangeKm",
        op: "gte",
        value: 300,
      },
      {
        attribute: "payloadKg",
        op: "gte",
        value: 500,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
        notes:
          "9A004 captures the broader space-launch-vehicle envelope; 9A102 is the reusable carve-out.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A104",
        relationship: "analogous",
        notes:
          "9A104 (sounding rockets at MTCR Cat-I) overlaps where a reusable vehicle is also a sounding-rocket platform.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 1.A.1",
        relationship: "derived_from",
        notes: "MTCR Item 1.A.1 — complete rocket systems, reusable variant.",
      },
      {
        regime: "ITAR-USML",
        id: "IV(d)",
        relationship: "analogous",
        notes:
          "USML IV(d) covers complete launch vehicles whether or not reusable; the SpaceX Starship class falls under USML IV(d), the EU pendant is 9A102.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A102",
    validFrom: "2021-09-09",
    notes:
      "Reusability does NOT lift the MTCR Cat-I presumption-of-denial — the range × payload product is the trigger, not the operational concept. X-37B-class, Dream Chaser-class, and commercial Starship-class vehicles all fall here.",
  },
  {
    canonicalId: "EU:9A103",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "103",
    title:
      "Ramjet/scramjet/combined-cycle propulsion subsystems (EU Cat 9, MTCR)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.ramjet",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "MTCR-ANNEX",
        id: "Item 3.A.5",
        relationship: "derived_from",
        notes:
          "MTCR Item 3.A.5 — ramjet/scramjet/combined-cycle engine subsystems.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A111",
        relationship: "analogous",
        notes: "9A111 (pulse-jets) is the air-breathing sibling of 9A103.",
      },
      {
        regime: "EAR-CCL",
        id: "9A103",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A103",
    validFrom: "2021-09-09",
    notes:
      "MTCR Item 3 covers parts + subsystems even when the full engine is in development — early-stage scramjet IP can already be MTCR-controlled.",
  },
  {
    canonicalId: "EU:9A104",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "104",
    title: "Sounding rockets above MTCR thresholds (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "aerospace.sounding_rocket",
      },
      // MTCR Cat-I tripwire: range ≥ 300 km. 9A104 is the only
      // EU entry that flips to Cat-I solely on range (without the
      // payload threshold) — the payload joins as the Cat-I escalation.
      {
        attribute: "rangeKm",
        op: "gte",
        value: 300,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "MTCR-ANNEX",
        id: "Item 1.A.2",
        relationship: "derived_from",
        notes: "MTCR Item 1.A.2 — sounding rockets at the Cat-I boundary.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "subset_of",
        notes:
          "9A004 (SLVs + spacecraft) is the broader entry; 9A104 captures the MTCR-Cat-I corner.",
      },
      {
        regime: "ITAR-USML",
        id: "IV(d)",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A104",
    validFrom: "2021-09-09",
    notes:
      "When BOTH range ≥ 300 km AND payload ≥ 500 kg, escalates to MTCR Cat-I 'strong presumption of denial'. Below 300 km but with structural design supporting payload ≥ 500 kg, 9A104 still captures but the Cat-I gate does not yet bite.",
  },
  {
    canonicalId: "EU:9A105",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "105",
    title: "Liquid-propellant rocket engines, MTCR Cat. II (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.liquid_rocket",
      },
      // MTCR Cat-II threshold: total impulse ≥ 1.1×10⁶ N·s. Below this,
      // the broader 9A005 captures (Wassenaar-aligned).
      {
        attribute: "totalImpulseNs",
        op: "gte",
        value: 1_100_000,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A005",
        relationship: "analogous",
        notes:
          "9A005 is the Wassenaar-thresholded entry (vacuum thrust ≥ 1 kN); 9A105 escalates the same family at the MTCR Cat-II total-impulse threshold.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A006",
        relationship: "components_of",
        notes:
          "9A006 catches components-of-9A105 just as it catches components-of-9A005.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 2.A.1.a",
        relationship: "derived_from",
        notes:
          "MTCR Item 2.A.1.a — liquid-propellant rocket engines at the 1.1×10⁶ N·s impulse boundary.",
      },
      {
        regime: "ITAR-USML",
        id: "IV(d)(1)",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A105",
    validFrom: "2021-09-09",
    notes:
      "The 1.1×10⁶ N·s lower threshold is the 9A105/9A107 boundary on the EU side and routinely flips small commercial liquid engines (Aeon-class, Prometheus-class) from sub-MTCR to MTCR Cat-II.",
  },
  {
    canonicalId: "EU:9A106",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "106",
    title: "Subsystems usable in MTCR rocket systems (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.rocket_subsystem",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A105",
        relationship: "components_of",
        notes:
          "9A106 captures subsystems usable in 9A105/9A107 propulsion (TVC, separation mechanisms, stage-attach interfaces).",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A118",
        relationship: "analogous",
        notes:
          "9A118 (devices to regulate combustion) is the in-cylinder counterpart to 9A106's stage-level subsystems.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 3.A.4",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A106",
    validFrom: "2021-09-09",
  },
  {
    canonicalId: "EU:9A107",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "107",
    title: "Solid-propellant rocket motors, MTCR Cat. II (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.solid_rocket",
      },
      // MTCR Cat-II threshold: total impulse ≥ 1.1×10⁶ N·s. Below this,
      // the broader 9A007 captures (Wassenaar-aligned).
      {
        attribute: "totalImpulseNs",
        op: "gte",
        value: 1_100_000,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A007",
        relationship: "analogous",
        notes:
          "9A007 is the Wassenaar entry; 9A107 captures solid motors at the MTCR Cat-II total-impulse threshold.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A008",
        relationship: "components_of",
        notes:
          "9A008 captures components-of-9A107 just as it captures components-of-9A007.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 2.A.1.b",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A107",
    validFrom: "2021-09-09",
  },
  {
    canonicalId: "EU:9A108",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "108",
    title:
      "Components for MTCR rocket-propulsion systems (EU Cat 9, MTCR Item 3.A.4)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.rocket_component",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A105",
        relationship: "components_of",
        notes:
          "9A108 captures specially-designed components of MTCR Cat-II liquid engines (9A105).",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A107",
        relationship: "components_of",
        notes:
          "9A108 also captures specially-designed components of MTCR Cat-II solid motors (9A107).",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A006",
        relationship: "analogous",
        notes:
          "9A006 is the Wassenaar-thresholded sibling — same items but at the broader (sub-MTCR) capture envelope.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 3.A.4",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A108",
    validFrom: "2021-09-09",
    notes:
      "9A108 escalates to MTCR Cat-I when the parent engine/motor crosses the 1.1×10⁶ N·s threshold (i.e. flies in a 9A105/9A107 Cat-I host). Cross-control with USML IV(h) is the dominant US-side route.",
  },
  {
    canonicalId: "EU:9A116",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "116",
    title: "Re-entry vehicles & equipment (EU Cat 9, MTCR Item 10)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "aerospace.reentry_vehicle",
      },
      // 9A116 is itself a Cat-I tripwire — re-entry capability is the
      // qualifier. The payload threshold remains relevant for the
      // strong-presumption-of-denial gate.
      {
        attribute: "payloadKg",
        op: "gte",
        value: 500,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "MTCR-ANNEX",
        id: "Item 10",
        relationship: "derived_from",
        notes: "MTCR Item 10 — re-entry vehicles + protection equipment.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A102",
        relationship: "analogous",
        notes:
          "9A102 (reusable space vehicles) overlaps where the reusable element is the re-entry stage.",
      },
      {
        regime: "ITAR-USML",
        id: "IV(d)",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A116",
    validFrom: "2021-09-09",
    notes:
      "Re-entry capability is itself an MTCR Cat-I tripwire when paired with a controllable trajectory — even a small re-entry capsule can carry a Cat-I weight if the design supports it. Atmos Space SR-class, Dream Chaser-class commercial re-entry vehicles fall here.",
  },
  {
    canonicalId: "EU:9A119",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "119",
    title: "Individual rocket stages, MTCR Cat. II (EU Cat 9)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.rocket_stage",
      },
      // 9A119 Cat-II tripwire: stage's OWN total impulse ≥ 1.1×10⁶ N·s.
      // This catches commercial upper-stage / kick-stage vendors whose
      // stages clear the threshold even though their own mission profile
      // is sub-orbital station-keeping.
      {
        attribute: "totalImpulseNs",
        op: "gte",
        value: 1_100_000,
      },
    ],
    reasonsForControl: ["MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A005",
        relationship: "components_of",
        notes:
          "A 9A005 liquid engine assembled into a stage propels that stage into 9A119 capture when the impulse threshold is crossed.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A007",
        relationship: "components_of",
        notes:
          "Same relationship for solid motors (9A007 → 9A119 when the stage impulse crosses Cat-II).",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 2.A.1.c",
        relationship: "derived_from",
        notes: "MTCR Item 2.A.1.c — individual stages.",
      },
      {
        regime: "ITAR-USML",
        id: "IV(d)",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A119",
    validFrom: "2021-09-09",
    notes:
      "Catches upper-stage kit suppliers (D-Orbit ION, Momentus Vigoride, Impulse Mira) whose individual stages routinely clear the 1.1×10⁶ N·s threshold despite operating in station-keeping or low-impulse mission profiles. The stage's own design impulse is the test, not its operational duty cycle.",
  },

  // ═══════════════════════════════════════════════════════════════
  // USML XV(c) — Rad-hardened microelectronics (Batch 13)
  //
  // The historical USML XV(c) sub-category controls rad-hardened
  // microcircuits **specially designed for USML XV defense articles**.
  // Post-2014 ECR, most general-purpose rad-hard ICs moved to 9A515.d
  // (five-criteria conjunctive test) or 9A515.e (TID-only). XV(c)
  // retains jurisdiction over the specially-designed-for-USML cases.
  //
  // The EAR 600-series counterpart is 9A515.d when all five criteria
  // are met; 9A515.e otherwise. The EU Annex I pendant is 3A001.a.2
  // (Wassenaar Cat 3A001 rad-hard ICs). Cross-walk graph:
  //   USML XV(c)   ↔ EAR 9A515.d / .e   ↔ EU 3A001.a.2
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "USML:XV(c)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "c",
    entryNumber: "c",
    title:
      "Radiation-hardened microcircuits specially designed for USML XV defense articles",
    predicates: [
      { attribute: "isRadHardened", op: "eq", value: true },
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
      { attribute: "itemClass", op: "prefix", value: "ic.radhard" },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.d",
        relationship: "successor",
        notes:
          "9A515.d covers rad-hard ICs meeting all five conjunctive criteria; USML XV(c) retains jurisdiction over ICs specially designed for USML XV defense-article spacecraft regardless of which 9A515.d criteria are met.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.e",
        relationship: "successor",
        notes:
          "9A515.e (added 2024 IFR) covers TID-only rad-hard ICs; USML XV(c) applies when the IC is specially designed for a USML XV system.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "3A001.a.2",
        relationship: "analogous",
        notes:
          "Wassenaar Cat 3A001.a.2 — rad-hard integrated circuits. The EU pendant lives under Cat 3 Electronics rather than Cat 9 Aerospace.",
      },
    ],
    citation: "22 CFR § 121.1 Cat XV(c) (eCFR, accessed 2026-05-23)",
    validFrom: "2014-05-13",
    notes:
      "The 'specially designed for USML XV' qualifier is decisive. A general-purpose rad-hard IC sold catalog-grade is 9A515.d/.e; the same IC engineered to a USML XV programme's qualification flow is XV(c). DDTC CJ recommended for borderline cases.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Z34-Cat6 — EU Annex I Cat 6 parametric tripwires
  //
  // Companion to `src/data/trade/eu-annex-i-cat6.ts` (full Cat-6
  // enumeration). This block ships the SPACE-CRITICAL parametric
  // entries — the codes where the parametric matcher needs a hard
  // numeric threshold to discriminate "controlled" from "not".
  //
  // Coverage:
  //   - 6A002.a.4   focal-plane arrays via pixelPitchMicrons +
  //                 itemClass prefix
  //   - 6A002.b     monospectral imaging sensor via pixel-pitch
  //   - 6A003.b     imaging cameras via frame-rate proxy
  //                 (signalBandwidthMHz on the read-out interface)
  //   - 6A004.a     mirrors via apertureMM threshold
  //   - 6A005.b     semiconductor lasers via transmitPowerW
  //   - 6A005.c.2   fiber lasers via transmitPowerW
  //   - 6A006       magnetometers via itemClass + sensor-class
  //   - 6A008.j     imaging radar (SAR) via groundResolutionMeters
  //                 (the ICEYE / Capella / Umbra tripwire)
  //
  // Note: the EU:6A002.a.1 demo entry (shipped earlier under Z25)
  // remains untouched; this block adds the remaining sub-paragraphs.
  //
  // Sources: Reg. (EU) 2021/821 Annex I, Cat. 6 (consolidated text).
  // ═══════════════════════════════════════════════════════════════

  {
    canonicalId: "EU:6A002.a.4",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "002",
    subpara: "a.4",
    title: "Focal-plane arrays — fine-pitch large-format (EU Cat 6)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "sensor.optical.fpa",
      },
      // Fine-pitch tripwire: pixel pitch ≤ 30 µm and large pixel-
      // count drive 6A002.a.4 capture. The matcher uses the
      // pixelPitchMicrons attribute introduced in Z25.
      {
        attribute: "pixelPitchMicrons",
        op: "lte",
        value: 30,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A002.a.4",
        relationship: "analogous",
        notes:
          "CCL 6A002.a.4 mirrors EU 6A002.a.4. Operators sourcing US-origin FPAs from Teledyne / Lynred should also evaluate EAR de-minimis.",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.2.a.4",
        relationship: "derived_from",
        notes: "Wassenaar Cat 6 Item A.2.a.4 — the multilateral baseline.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A002.a.4",
    validFrom: "2021-09-09",
    notes:
      "EO smallsat operators (Planet, Satellogic, BlackSky) routinely integrate FPAs that clear this threshold. The pixel-pitch attribute is operator-supplied via the parametricAttributes JSON bag.",
  },

  {
    canonicalId: "EU:6A002.b",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "002",
    subpara: "b",
    title: "Monospectral imaging sensors — fine-pitch arrays (EU Cat 6)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "sensor.optical.monospectral",
      },
      // 6A002.b TDI / push-broom sensors typically trip at finer
      // pixel pitches than the .a.4 FPA threshold.
      {
        attribute: "pixelPitchMicrons",
        op: "lte",
        value: 8,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A002.b",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.2.b",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A002.b",
    validFrom: "2021-09-09",
  },

  {
    canonicalId: "EU:6A003.b",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "003",
    subpara: "b",
    title: "Imaging cameras — high signal-bandwidth read-out (EU Cat 6)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "sensor.optical.camera",
      },
      // Frame-rate × pixel-count proxy: read-out signal bandwidth.
      // Cameras with > 200 MHz read-out interface bandwidth are
      // typically driving large-format high-frame-rate FPAs.
      {
        attribute: "signalBandwidthMHz",
        op: "gte",
        value: 200,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A003.b",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.3.b",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A003.b",
    validFrom: "2021-09-09",
    notes:
      "Video-from-space operators (UrtheCast Theia, Capella video mode) typically classify here. Frame-rate × resolution drives the read-out-interface bandwidth past the 200 MHz heuristic.",
  },

  {
    canonicalId: "EU:6A004.a",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "004",
    subpara: "a",
    title: "Optical mirrors — large-aperture monolithic (EU Cat 6)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "optic.mirror",
      },
      // Mirror aperture threshold: monolithic mirrors above 250 mm
      // typically drive 6A004.a capture for spaceborne use.
      {
        attribute: "apertureMM",
        op: "gte",
        value: 250,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A004.a",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.4.a",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A004.a",
    validFrom: "2021-09-09",
    notes:
      "Captures space-telescope primary mirrors + laser-comm pointing mirror segments. Operators with sub-250mm mirrors typically fall out at this predicate but may still match 6A004.f (beam-steering) on slew-rate.",
  },

  {
    canonicalId: "EU:6A005.b",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "005",
    subpara: "b",
    title: "Semiconductor lasers — high-power diode lasers (EU Cat 6)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "laser.semiconductor",
      },
      // Output-power tripwire: semiconductor lasers above 1 W CW
      // output typically drive 6A005.b capture for industrial /
      // comms applications. Below 1 W typically EAR99.
      {
        attribute: "transmitPowerW",
        op: "gte",
        value: 1,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A005.b",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.5.b",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A005.b",
    validFrom: "2021-09-09",
    notes:
      "Captures the LiDAR illumination + laser-comm pump-diode market. The transmitPowerW threshold is the discriminator vs sub-watt telecom-grade diodes.",
  },

  {
    canonicalId: "EU:6A005.c.2",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "005",
    subpara: "c.2",
    title: "Fiber lasers — high-power CW (EU Cat 6)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "laser.fiber",
      },
      // Yb-doped fiber laser CW output threshold. ISL transmitters
      // routinely operate at 5-20 W; this threshold catches them.
      {
        attribute: "transmitPowerW",
        op: "gte",
        value: 5,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A005.c.2",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.5.c.2",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A005.c.2",
    validFrom: "2021-09-09",
    notes:
      "Mynaric Condor, Tesat SCOT80 fiber-laser transmitters fall here. 'ITAR-free' marketing requires verified zero US-DNA — see Caelex De-Minimis-Calculator.",
  },

  {
    canonicalId: "EU:6A006",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "006",
    title: "Magnetometers and magnetic-field sensors (EU Cat 6)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "sensor.magnetic",
      },
      // 6A006 is a sensor-class entry — the matcher uses itemClass
      // discrimination plus the universal isSpeciallyDesigned
      // qualifier for spaceborne / military-grade variants.
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A006",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.6",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A006",
    validFrom: "2021-09-09",
    notes:
      "Spaceborne science magnetometers (Swarm, Cluster-class) typically clear the noise-floor threshold. Bus-attitude-reference fluxgates may also trip depending on noise-floor calibration.",
  },

  {
    canonicalId: "EU:6A008.j",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "008",
    subpara: "j",
    title: "Imaging radar (SAR) — sub-meter ground resolution (EU Cat 6)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "sensor.radar.sar",
      },
      // Sub-meter SAR tripwire: imaging radar systems with ground
      // sample distance ≤ 3 m drive 6A008.j capture (the Wassenaar
      // baseline). Below 0.5 m falls into the EU-autonomous AM-006.
      {
        attribute: "groundResolutionMeters",
        op: "lte",
        value: 3,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A008.j",
        relationship: "analogous",
      },
      {
        regime: "EU-ANNEX-I",
        id: "AM-006",
        relationship: "subset_of",
        notes:
          "Sub-0.5 m GSD SAR is also captured by the EU-autonomous AM-006 (Delegated Reg. 2025/2003). 6A008.j is the Wassenaar baseline for ≤ 3 m GSD.",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.8.j",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A008.j",
    validFrom: "2021-09-09",
    notes:
      "ICEYE, Capella, Umbra, Iceye-class smallsat SAR operators all clear this threshold. The groundResolutionMeters attribute is the operator-supplied discriminator vs > 3 m GSD synoptic SAR (less restricted).",
  },

  // Z34-Cat5 — EU Annex I Cat. 5 (Telecom + Information Security)
  //
  // Parametric capture for the three space-critical sub-entries the
  // matcher needs to discriminate at run-time:
  //
  //   - EU:5A001.b — inter-satellite link bandwidth tripwire. Operators
  //     of LEO/MEO constellation ISL terminals (RF + optical) hit this
  //     directly. Threshold uses Z25's `crossLinkBandwidthMbps`.
  //   - EU:5A001.f.1 — spread-spectrum / frequency-hopping anti-jam
  //     radio. The canonical TT&C anti-jam tripwire — fires on the
  //     `isAntiJam` Z3a flag.
  //   - EU:5A002.a — crypto modules above the symmetric > 56-bit /
  //     asymmetric ≥ 512-bit factorisation strength threshold. Every
  //     satellite TT&C link encryptor + telemetry crypto unit fires
  //     here.
  //
  // Two more entries (EU:5A002.f for QKD, EU:5D002.c for standalone
  // crypto software) round out the Cat-5 coverage with parametric +
  // itemClass-prefix capture so the matcher can rank without falling
  // back to manual review.
  // ═══════════════════════════════════════════════════════════════════
  {
    canonicalId: "EU:5A001.b",
    regime: "EU-ANNEX-I",
    category: "5",
    productGroup: "A",
    entryNumber: "001",
    subpara: "b",
    title:
      "Telecom radio/MMIC/phased-array equipment incl. inter-satellite-link transmit/receive (EU Cat 5 Part 1)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.communications",
      },
      // ISL tripwire: crossLinkBandwidthMbps ≥ 1000 (1 Gbps) — the
      // structural threshold separating the Mynaric / Tesat / CACI
      // constellation-grade ISL class from the legacy single-satellite
      // RF telemetry class. Sourced from Z25 attribute vocabulary.
      {
        attribute: "crossLinkBandwidthMbps",
        op: "gte",
        value: 1000,
      },
    ],
    reasonsForControl: ["NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "5A001.b",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "5.A.1.b",
        relationship: "derived_from",
        notes: "Wassenaar Cat. 5 Part 1 — telecommunications systems.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "AM-005",
        relationship: "superset_of",
        notes:
          "EU-autonomous AM-005 (Delegated Reg. 2025/2003) sits at a stricter capture envelope for the constellation-class OISL use case.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 5 Part 1, 5A001.b",
    validFrom: "2021-09-09",
    notes:
      "Inter-satellite link entry — Mynaric Condor, Tesat SCOT80, CACI photonic terminals as well as RF-ISL constellation modems (Iridium NEXT-class) fire here. Operators of intra-constellation mesh networks above 1 Gbps must walk a Cat-5-Part-1 classification path.",
  },
  {
    canonicalId: "EU:5A001.f.1",
    regime: "EU-ANNEX-I",
    category: "5",
    productGroup: "A",
    entryNumber: "001",
    subpara: "f.1",
    title:
      "Spread-spectrum / frequency-hopping anti-jam radio (EU Cat 5 Part 1)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.communications",
      },
      // Spread-spectrum anti-jam: matches when the operator-supplied
      // isAntiJam boolean is true. Cross-control with MTCR Item 11
      // (whose anti-jam annexes appear via MT control reason).
      {
        attribute: "isAntiJam",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["NS", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "5A001.f.1",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "5.A.1.f.1",
        relationship: "derived_from",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 11",
        relationship: "analogous",
        notes:
          "MTCR Item 11 — anti-jam TT&C is captured under the broader sub-system controls.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 5 Part 1, 5A001.f.1",
    validFrom: "2021-09-09",
    notes:
      "Space-critical: GEO / MEO comm-sats with hardened TT&C uplinks (military and dual-use, e.g. Galileo PRS, EGNOS, Iridium NEXT command) fire here directly. The MT reason-for-control means a strong-presumption-of-denial gate triggers for MTCR-Partnership country exports of the full TT&C subsystem.",
  },
  {
    canonicalId: "EU:5A002.a",
    regime: "EU-ANNEX-I",
    category: "5",
    productGroup: "A",
    entryNumber: "002",
    subpara: "a",
    title:
      "Cryptographic items > 56-bit symmetric / ≥ 512-bit asymmetric (EU Cat 5 Part 2)",
    predicates: [
      // Crypto-module capture: keyed on the explicit itemClass plus
      // the universal isSpeciallyDesigned qualifier — bit-strength
      // thresholds are walked at license-determination time, not in
      // the matcher's classification phase, because they require
      // algorithm-aware parsing the matcher does not perform.
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.crypto",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["NS", "EI"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "5A002.a",
        relationship: "analogous",
        notes:
          "US CCL 5A002 maps 1:1 with EU 5A002 but is wrapped by the EAR Encryption Items license-exception framework (ENC, MMKT).",
      },
      {
        regime: "WASSENAAR",
        id: "5.A.2.a",
        relationship: "derived_from",
        notes: "Wassenaar Cat. 5 Part 2 — cryptography.",
      },
      {
        regime: "ITAR-USML",
        id: "XIII(b)",
        relationship: "analogous",
        notes:
          "USML XIII(b) captures crypto items specifically designed for military use, which over-rides 5A002 capture under the see-through rule.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 5 Part 2, 5A002.a",
    validFrom: "2021-09-09",
    notes:
      "Satellite-payload crypto modules: every TT&C link encryptor (AES-256 + RSA-2048 typical), telemetry confidentiality unit, and on-board key-management module fires here. Operators must check Note 3 (Cryptography Note) for potential mass-market carve-out — but space-rated, FIPS-140-3-evaluated crypto modules almost never qualify for the mass-market exemption.",
  },
  {
    canonicalId: "EU:5A002.f",
    regime: "EU-ANNEX-I",
    category: "5",
    productGroup: "A",
    entryNumber: "002",
    subpara: "f",
    title: "Quantum cryptography (QKD) items (EU Cat 5 Part 2)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.crypto.quantum",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["NS", "EI"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "WASSENAAR",
        id: "5.A.2.f",
        relationship: "derived_from",
      },
      {
        regime: "EAR-CCL",
        id: "5A002.f",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 5 Part 2, 5A002.f",
    validFrom: "2021-09-09",
    notes:
      "Emerging space relevance — Eagle-1 (ESA / SES QKD demonstrator) and follow-on EU IRIS² QKD payload fire here. Quantum-state-prep + entangled-photon-source hardware on the satellite is the primary capture.",
  },
  {
    canonicalId: "EU:5D002.c",
    regime: "EU-ANNEX-I",
    category: "5",
    productGroup: "D",
    entryNumber: "002",
    subpara: "c",
    title:
      "Standalone crypto software (libraries, satellite-payload crypto stacks) (EU Cat 5 Part 2)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.software.crypto",
      },
    ],
    reasonsForControl: ["NS", "EI"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "5D002.c",
        relationship: "analogous",
      },
      {
        regime: "EU-ANNEX-I",
        id: "5D003",
        relationship: "analogous",
        notes:
          "5D003 is the exemption-by-Note slot for publicly-available crypto software and Cryptography-Note mass-market carve-outs.",
      },
      {
        regime: "WASSENAAR",
        id: "5.D.2.c",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 5 Part 2, 5D002.c",
    validFrom: "2021-09-09",
    notes:
      "Most-controversial Cat-5 software capture — open-source crypto (OpenSSL, libsodium) can be exempt under Note 4. Operators must walk both Note 3 (Cryptography Note) and Note 4 (publicly-available source) before claiming exemption; satellite-mission crypto stacks rarely qualify because the integration know-how itself remains 5E002 technology.",
  },

  // Z34-Cat3 — EU Annex I Category 3 (Electronics) parametric
  // cross-walk additions. Pairs with the textual enumeration in
  // src/data/trade/eu-annex-i-cat3.ts.
  //
  // Sources:
  //   - Reg. (EU) 2021/821 Annex I, Cat 3 (consolidated text)
  //   - Delegated Reg. (EU) 2025/2003 (OJ L 2025/2003)
  //   - Z25 Tier-3 parametric attribute `radHardenedTID_krad`
  //
  // Three space-critical entries with typed predicates:
  //   - EU:3A001.a.2 — general rad-hard TID-tolerance gate
  //   - EU:3A001.a.5 — space-grade rad-hard processor / FPGA
  //   - EU:3A001.h.1 — atomic-frequency standard (Allan-variance proxy
  //                    via temperatureRangeCelsius + itemClass — Allan
  //                    variance itself is not a typed attribute, but
  //                    the spaceborne-clock itemClass + the operating-
  //                    temperature range capture the right shape)
  //   - EU:3A090.a   — Oct 2022 IFR AI-compute TPP > 4800 threshold
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "EU:3A001.a.2",
    regime: "EU-ANNEX-I",
    category: "3",
    productGroup: "A",
    entryNumber: "001",
    subpara: "a.2",
    title:
      "Microprocessors with composite theoretical performance (CTP) — rad-hard TID gate (EU Cat 3)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "ic.processor",
      },
      // Z25 Tier-3 parametric attribute. The brief's "rad-hard TID
      // tolerance" predicate captures the boundary between general-
      // purpose 3A001.a.2 microprocessors and the rad-hard-rated
      // 3A001.a.5 family at TID ≥ 50 krad(Si). Above this the part
      // typically escalates to .a.5 and the US ECCN 9A515.d/.e.
      {
        attribute: "radHardenedTID_krad",
        op: "gte",
        value: 50,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "3A001.a.5",
        relationship: "predecessor",
        notes:
          "3A001.a.2 is the general microprocessor entry; the rad-hard escalation moves the part to 3A001.a.5 when the full TID + SEU criteria are met.",
      },
      {
        regime: "EAR-CCL",
        id: "3A001.a",
        relationship: "analogous",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.e",
        relationship: "successor",
        notes:
          "When TID ≥ 500 krad(Si), the part may cross from 3A001.a.2 into the US 9A515.e/.d rad-hard space-grade regime.",
      },
    ],
    citation:
      "Reg. (EU) 2021/821 Annex I, Cat. 3, 3A001.a.2 (consolidated as of 2025/2003)",
    validFrom: "2021-09-09",
    notes:
      "The TID ≥ 50 krad(Si) predicate is the screening threshold above which the matcher should flag rad-hardness for further review. Operators with rad-tolerant (not rad-hard) parts at TID < 50 krad fall out of capture here and into the broader 3A001 textual entries.",
  },
  {
    canonicalId: "EU:3A001.a.5",
    regime: "EU-ANNEX-I",
    category: "3",
    productGroup: "A",
    entryNumber: "001",
    subpara: "a.5",
    title:
      "Rad-hard microprocessors / FPGAs / memory (TID ≥ 5×10⁴ rad(Si)) (EU Cat 3)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "ic.radhard",
      },
      // EU 3A001.a.5: TID ≥ 5×10⁴ rad(Si) = 50 krad. Lower than the
      // US 9A515.d full-five-criteria threshold (500 krad), so the
      // EU captures more parts.
      {
        attribute: "radHardenedTID_krad",
        op: "gte",
        value: 50,
      },
      {
        attribute: "isRadHardened",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["WA", "NS", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.d",
        relationship: "subset_of",
        notes:
          "9A515.d covers the strict five-criteria rad-hard subset (TID ≥ 500 krad + four other thresholds). EU 3A001.a.5 captures the broader rad-hardened space-grade IC family at TID ≥ 50 krad.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.e",
        relationship: "analogous",
        notes:
          "9A515.e (added 23 Oct 2024 IFR) captures TID ≥ 500 krad without the other four criteria — closer to the EU 3A001.a.5 shape but at a higher TID threshold.",
      },
      {
        regime: "ITAR-USML",
        id: "XV(e)(8)",
        relationship: "predecessor",
        notes:
          "Rad-hardened ICs specifically designed for use in military/intelligence spacecraft remain USML XV(e)(8); commercial rad-hard ICs flowed to ECCN 9A515.d/.e post-2014 ECR.",
      },
    ],
    citation:
      "Reg. (EU) 2021/821 Annex I, Cat. 3, 3A001.a.5 (consolidated as of 2025/2003)",
    validFrom: "2021-09-09",
    notes:
      "European space-grade processor / FPGA family — Cobham GR716, NanoXplore NG-LARGE, BAE RAD750-class, Microchip RTG4 — typically land here even before the US 9A515.d five-criteria gate engages. The EU control is broader by design.",
  },
  {
    canonicalId: "EU:3A001.h.1",
    regime: "EU-ANNEX-I",
    category: "3",
    productGroup: "A",
    entryNumber: "001",
    subpara: "h.1",
    title:
      "Atomic-frequency standards (Rb/Cs/H-maser) for spaceborne PNT (EU Cat 3)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "frequency-standard.atomic",
      },
      // Allan-variance is not a typed attribute. The matcher routes
      // these via the spaceborne-clock itemClass; predicate captures
      // the dominant signal. Operators supplying the cross-link path
      // (Galileo PHM, GPS-IIIF RAFS) are caught by the prefix gate.
      // A second predicate on temperature-range catches the radiation-
      // qualified vacuum-cell variants used in spaceborne flight units.
      {
        attribute: "temperatureRangeCelsius",
        op: "gte",
        value: 100,
      },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "3A001.h.1",
        relationship: "analogous",
      },
      {
        regime: "ITAR-USML",
        id: "XV(e)(15)",
        relationship: "successor",
        notes:
          "Spaceborne atomic clocks specifically designed for military / GPS-IIIF-class payloads remain USML XV(e)(15). Commercial PNT-payload clocks (Galileo, BeiDou commercial signal) flow to ECCN 3A001.h.1 / 9A515.x.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 3, 3A001.h.1 (consolidated)",
    validFrom: "2021-09-09",
    notes:
      "The Allan-variance threshold (≤ 1×10⁻¹¹ at 1 s) is the legal definition; the matcher uses spaceborne-itemClass + wide-temperature as the practical screening predicate because Allan-variance is rarely supplied in commercial datasheets as a typed parametric. Spectratime PHM (Galileo IOV/FOC), Frequency Electronics Inc. RAFS (GPS-IIIF), and SAFRAN ASCAR rubidium-vapour lines all fall here.",
  },
  {
    canonicalId: "EU:3A090.a",
    regime: "EU-ANNEX-I",
    category: "3",
    productGroup: "A",
    entryNumber: "090",
    subpara: "a",
    title:
      "Advanced-computing AI accelerators — TPP > 4800 (Oct 2022 IFR transposition) (EU Cat 3)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "ic.ai-accelerator",
      },
      // The Oct 2022 IFR uses Total Processing Performance (TPP) as
      // the headline gate. TPP is not yet a typed attribute on
      // TradeItem — operators currently route AI-accelerator parts
      // via the itemClass prefix and a follow-up manual review of
      // the published TPP figure. The crossLinkBandwidthMbps Z25
      // attribute is the closest proxy when the part is paired with
      // HBM (high-bandwidth memory) above 1 TB/s aggregate (8 stacks
      // × 1 Tbps); some AI-accelerator datasheets quote HBM bandwidth
      // in Mbps after unit conversion. Below the proxy threshold the
      // part still matches via itemClass and goes to the manual review
      // lane.
      {
        attribute: "crossLinkBandwidthMbps",
        op: "gte",
        value: 1_000_000,
      },
    ],
    reasonsForControl: ["NS"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "3A090.a",
        relationship: "analogous",
        notes:
          "EU 3A090.a is the direct EU transposition of the US Oct 2022 IFR ECCN 3A090.a. The US version is the original source; the EU version was finalised via the Delegated Reg. 2025/2003.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "3D090",
        relationship: "components_of",
        notes:
          "3D090 (software) and 3E090 (technology) ride with 3A090.a — the development toolchain and IP are controlled together with the hardware.",
      },
    ],
    citation:
      "Reg. (EU) 2021/821 Annex I, Cat. 3, 3A090 (added by Delegated Reg. 2025/2003 transposing US Oct 2022 BIS IFR)",
    validFrom: "2025-11-15",
    notes:
      "Headline AI-export control of the decade. Captures Nvidia H100/H200/B100/B200, AMD MI300/MI325, Intel Gaudi3, Google TPU v5e/v5p. Spaceborne on-board-AI inference engines typically do NOT trip this threshold (the H100 sits well above any spaceborne inference part by 1-2 orders of magnitude) — but operators integrating ground-station AI infrastructure into their satellite-data pipeline must classify the ground-side chips here.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Z34-Cat4-7 — EU Annex I Cat 4 (Computers) + Cat 7 (Navigation +
  // Avionics) parametric tripwires.
  //
  // Companion to `src/data/trade/eu-annex-i-cat4-7.ts` (full Cat-4 +
  // Cat-7 enumeration). This block ships the SPACE-CRITICAL parametric
  // entries — the codes where the matcher needs a hard numeric
  // threshold or boolean flag to discriminate "controlled" from
  // "not".
  //
  // Coverage:
  //   - EU:7A002.a   gyro angular-rate accuracy gate (drift via
  //                  starTrackerAccuracyArcsec proxy + itemClass)
  //   - EU:7A003     IMU drift rate via spacecraft.imu itemClass +
  //                  starTrackerAccuracyArcsec proxy (note: the
  //                  textual 7A003 entry lives in the canonical
  //                  eu-annex-i.ts; this cross-walk row is the
  //                  parametric capture only, not a duplicate entry)
  //   - EU:7A005     GNSS receiver anti-jam + velocity envelope
  //                  (gnssMaxVelocityMPerS + isAntiJam)
  //   - EU:4A090     advanced-computing AI compute (TPP proxy via
  //                  crossLinkBandwidthMbps for HBM-aggregate
  //                  bandwidth + itemClass prefix)
  //
  // Sources: Reg. (EU) 2021/821 Annex I, Cat. 4 + Cat. 7
  // (consolidated text) + Delegated Reg. 2025/2003 (4A090 family).
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "EU:7A002.a",
    regime: "EU-ANNEX-I",
    category: "7",
    productGroup: "A",
    entryNumber: "002",
    subpara: "a",
    title:
      "Non-spinning gyros (RLG / FOG / HRG / MEMS) with drift ≤ 0.5 deg/h (EU Cat 7)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.gyro",
      },
      // Gyro drift rate is captured here via starTrackerAccuracyArcsec
      // as the closest available typed parametric — both are angular
      // precision measurements and the matcher routes spaceborne
      // gyros through this attribute. A drift gate of ≤ 0.5 deg/h
      // corresponds to ~1800 arcsec/h; the matcher uses the spaceborne
      // itemClass + the arcsec gate as a coupled tripwire. The strict
      // drift figure remains the legal definition; this predicate is
      // the operational screen.
      {
        attribute: "starTrackerAccuracyArcsec",
        op: "lte",
        value: 1800,
      },
    ],
    reasonsForControl: ["NS", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "7A002.a",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "7.A.2.a",
        relationship: "derived_from",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 9",
        relationship: "analogous",
        notes:
          "MTCR Item 9 — gyros for delivery-vehicle guidance. Sister entry to the EU-Cat-7-MTCR-derived 7A102.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 7, 7A002.a",
    validFrom: "2021-09-09",
    notes:
      "Non-spinning gyro entry — Northrop Grumman LN-200, KVH DSP-1500, iXBlue Astrix series, Safran SPACENAUTE all fire here. Every spacecraft AOCS with closed-loop attitude control sits behind a 7A002.a-class gyro. MT reason fires when the same gyro is also operationally suitable for a MTCR Cat-I delivery vehicle.",
  },
  {
    canonicalId: "EU:7A003",
    regime: "EU-ANNEX-I",
    category: "7",
    productGroup: "A",
    entryNumber: "003",
    title:
      "Inertial Measurement Units (IMU) with bias / drift below thresholds (EU Cat 7)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.imu",
      },
      // IMU integrated drift gate (1 sigma over one month for non-
      // MTCR; finer for MTCR-aligned units). Same parametric proxy as
      // 7A002.a — starTrackerAccuracyArcsec stands in for the
      // integrated angular drift. Operators of LN-200S, ASTRIX-NS,
      // SIRIUS, MIMU class fire here; cross-control with 7A103 when
      // MTCR threshold reached.
      {
        attribute: "starTrackerAccuracyArcsec",
        op: "lte",
        value: 1800,
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["NS", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "7A003",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "7.A.3",
        relationship: "derived_from",
      },
      {
        regime: "EU-ANNEX-I",
        id: "7A103",
        relationship: "subset_of",
        notes:
          "7A103 is the MTCR-Cat-I-equivalent IMU gate — strictly tighter than 7A003. The same physical IMU can hit both; the matcher should route MTCR-class items via 7A103 for the strong-presumption-of-denial gate.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 7, 7A003",
    validFrom: "2021-09-09",
    notes:
      "Parametric capture only — the full textual 7A003 ClassificationEntry lives in eu-annex-i.ts. This cross-walk row carries the predicate logic the matcher uses to discriminate at run-time. Every spacecraft with an integrated IMU (gyros + accelerometers in one unit) fires here.",
  },
  {
    canonicalId: "EU:7A005",
    regime: "EU-ANNEX-I",
    category: "7",
    productGroup: "A",
    entryNumber: "005",
    title: "GNSS receivers above COCOM velocity / anti-jam envelope (EU Cat 7)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.gnss",
      },
      // The COCOM velocity gate (600 m/s) is the historical export-
      // control envelope around GNSS firmware. Receivers above the
      // gate fire 7A005 even before anti-jam features come into play.
      // The Z3e gnssMaxVelocityMPerS attribute is the typed
      // parametric.
      {
        attribute: "gnssMaxVelocityMPerS",
        op: "gt",
        value: 600,
      },
      // Anti-jam adaptive antenna features escalate the capture and
      // pull in the MT reason-for-control (cross-walk with 7A105 MTCR
      // grade).
      {
        attribute: "isAntiJam",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["NS", "MT"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "7A005",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "7.A.5",
        relationship: "derived_from",
      },
      {
        regime: "EU-ANNEX-I",
        id: "7A105",
        relationship: "subset_of",
        notes:
          "7A105 is the MTCR-Cat-I-equivalent GNSS-receiver gate (delivery-vehicle suitability). Receivers without COCOM velocity lockout AND with anti-jam features should be routed via 7A105 for the strong-presumption-of-denial gate.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 11",
        relationship: "analogous",
        notes:
          "MTCR Item 11 — guidance set components incl. anti-jam GNSS receivers for delivery vehicles.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 7, 7A005",
    validFrom: "2021-09-09",
    notes:
      "Anti-jam GNSS receiver capture — Galileo PRS receivers, GPS M-code receivers, Septentrio AsteRx-m series with anti-jam payload all fire here. The 600 m/s gate corresponds to the historical COCOM limit; receivers that disable above 600 m/s / 18 km altitude typically clear into EAR-99. Spaceborne GNSS-aided orbit determination receivers operating at orbital velocities (~7.5 km/s) clear the velocity gate by an order of magnitude.",
  },
  {
    canonicalId: "EU:4A090",
    regime: "EU-ANNEX-I",
    category: "4",
    productGroup: "A",
    entryNumber: "090",
    title:
      "Advanced-computing AI compute assemblies / systems (Oct 2022 IFR transposition) (EU Cat 4)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "compute.ai-accelerator",
      },
      // The Oct 2022 IFR uses Total Processing Performance (TPP) as
      // the headline gate. TPP itself is not yet a typed attribute on
      // TradeItem — the matcher routes 4A090 assemblies via the
      // itemClass prefix plus an HBM-aggregate-bandwidth proxy using
      // crossLinkBandwidthMbps. A H100/H200-class assembly has
      // aggregate HBM bandwidth well above 1 TB/s (8 stacks × 1 Tbps
      // ≈ 1×10^6 Mbps). Sub-threshold parts still match via itemClass
      // and route to manual review.
      {
        attribute: "crossLinkBandwidthMbps",
        op: "gte",
        value: 1_000_000,
      },
    ],
    reasonsForControl: ["NS"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "4A090",
        relationship: "analogous",
        notes:
          "EU 4A090 is the direct EU transposition of the US Oct 2022 IFR ECCN 4A090 — the system / assembly-level companion to 3A090's IC-level capture.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "3A090.a",
        relationship: "analogous",
        notes:
          "3A090.a captures the bare-die advanced-computing ICs; 4A090 captures the rack/server-level assemblies that integrate those ICs (DGX H100, HGX H200, OAM modules).",
      },
      {
        regime: "EU-ANNEX-I",
        id: "4D090",
        relationship: "components_of",
        notes:
          "4D090 (software) and 4E090 (technology) ride with 4A090 — the CUDA/ROCm toolchain and IP are controlled together with the hardware.",
      },
    ],
    citation:
      "Reg. (EU) 2021/821 Annex I, Cat. 4, 4A090 (added by Delegated Reg. 2025/2003 transposing US Oct 2022 BIS IFR)",
    validFrom: "2025-11-15",
    notes:
      "AI compute assembly capture — DGX H100/H200, HGX B100/B200, AMD Instinct MI300X servers, Intel Gaudi3 platforms, Google TPU v5p pods. Spaceborne on-board AI inference assemblies typically do NOT trip this assembly-level threshold (most spaceborne edge-inference parts sit 1-2 orders of magnitude below the rack-level TPP gate) — but ground-station AI training infrastructure used by EO downstream operators fires here directly.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Z34c — Extended Parametric Attribute Demos (2026-05-23)
  //
  // Brings the matcher vocabulary from 25 typed attributes to 44+
  // by introducing four tiers of new dimensions:
  //
  //   Tier 1 (spacecraft hardware): solar cells, batteries, peak power,
  //     antenna gain / polarisation / frequency bands, thermal cycles.
  //   Tier 2 (propulsion): propellant type, vacuum thrust, nozzle
  //     expansion ratio, vacuum Isp.
  //   Tier 3 (mission ops): mission duration, inclination, apogee /
  //     perigee.
  //   Tier 4 (imaging payloads): SWIR / MWIR / LWIR / hyperspectral
  //     band counts.
  //
  // Each entry below is a SEED demonstrating one or two new attributes
  // against a real ECCN / USML / EU / MTCR boundary. The matcher's
  // three-valued logic (Z3f) means an entry only fires when ALL its
  // predicates are populated AND satisfied; missing attributes route
  // to PossibleMatch instead of refute (operator action: "fill in X to
  // resolve"). Full coverage of every ECCN sub-paragraph follows in
  // future sprints — this is the demonstration layer.
  //
  // Sources used per entry are cited in the `citation` field. The
  // disclaimer in MATCHER_DISCLAIMER applies: SCREENING-LEVEL GUIDANCE
  // only, never binding.
  // ═══════════════════════════════════════════════════════════════

  // ─── Tier 1 — Spacecraft hardware ─────────────────────────────────

  // EU 9A515.e — Solar arrays with high-efficiency multi-junction cells
  // (BOL conversion ≥ 28%, the typical triple-junction GaInP/InGaAs/Ge
  // grade specifically designed for space). Below 28% (typically
  // silicon or 2J-GaAs) drops to non-controlled — although see-through
  // can still pull the array into 9A515 if it's specially designed.
  {
    canonicalId: "ECCN:9A515.e.solar-array",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "e.solar-array",
    title:
      "Solar arrays specially designed for spacecraft using ≥ 28% BOL multi-junction cells",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "spacecraft.power.solar" },
      { attribute: "solarCellEfficiencyPercent", op: "gte", value: 28 },
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A515.e",
        relationship: "analogous",
        notes:
          "EU pendant — same 28% threshold but framed via Annex I 9A515.e specially-designed-spacecraft-power clause.",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.e (solar-array sub-clause)",
    validFrom: "2024-10-23",
    notes:
      "Z34c demo entry — exercises solarCellEfficiencyPercent. Triple-junction GaInP/InGaAs/Ge cells at 30-32% BOL fire this; legacy silicon 14% cells do not.",
  },

  // 9A515.x — Spacecraft batteries with specific energy ≥ 130 Wh/kg
  // (specially-designed Li-ion / Li-S grades used for high-energy
  // missions). Below 130 Wh/kg drops out (commodity Li-ion).
  {
    canonicalId: "ECCN:9A515.x.battery",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "x.battery",
    title:
      "Spacecraft battery cells/packs with specific energy ≥ 130 Wh/kg, specially designed",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.power.battery",
      },
      { attribute: "batterySpecificEnergyWhPerKg", op: "gte", value: 130 },
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["NS:2", "RS:2"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.x",
        relationship: "components_of",
        notes:
          "Catch-all parts/components-of clause for spacecraft electrical power systems.",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.x (battery sub-clause)",
    validFrom: "2014-05-13",
    notes:
      "Z34c demo — exercises batterySpecificEnergyWhPerKg. Saft VES180 / EaglePicher SAR-10197 cells (~165 Wh/kg) fire; commodity 18650 packs (~250 Wh/kg gravimetric but COTS, not specially designed) clear the energy gate but fail isSpeciallyDesigned.",
  },

  // 9A515 family — peak EOL bus-level power ≥ 15 kW as a proxy for
  // GEO-comsat-class platforms (typical Eutelsat / Inmarsat /
  // SpaceX-Starlink-V2 class). Smallsat busses (< 1 kW) do not fire.
  {
    canonicalId: "ECCN:9A515.x.power-bus",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "x.power-bus",
    title:
      "Spacecraft electrical power systems with EOL peak generation ≥ 15 kW",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "spacecraft.power" },
      { attribute: "peakPowerWatts", op: "gte", value: 15_000 },
    ],
    reasonsForControl: ["NS:2"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.x (power-system sub-clause)",
    validFrom: "2014-05-13",
    notes:
      "Z34c demo — exercises peakPowerWatts. GEO comsats (15-25 kW), large-LEO comms (10-18 kW) fire. Smallsat busses (< 1 kW) do not — the peak-power gate is a coarse class discriminator that complements payload-specific predicates.",
  },

  // 5A001.b.3 — High-gain antennas with boresight gain ≥ 30 dBi (the
  // multilateral Wassenaar 5.A.1.b.3 threshold for high-gain RF
  // payloads on civilian satellites). 30-40 dBi is GEO-class, ≥ 40 dBi
  // is HTS-class.
  {
    canonicalId: "ECCN:5A001.b.3",
    regime: "EAR-CCL",
    category: "5",
    productGroup: "A",
    entryNumber: "001",
    subpara: "b.3",
    title: "RF antennas with boresight gain ≥ 30 dBi (Wassenaar 5.A.1.b.3)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "rf.antenna" },
      { attribute: "antennaGainDbi", op: "gte", value: 30 },
    ],
    reasonsForControl: ["NS:2", "RS:2"],
    licenseExceptions: ["STA-eligible:partial", "ENC"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "5A001.b.3",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "5.A.1.b.3",
        relationship: "derived_from",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 5 Part 1 ECCN 5A001.b.3",
    validFrom: "2014-09-01",
    notes:
      "Z34c demo — exercises antennaGainDbi. HTS Ka-band reflector antennas (35-45 dBi) fire; broad-pattern UHF telemetry antennas (5-10 dBi) clear.",
  },

  // 5A001.b — RF transmitters / antennas covering the Ka-band (typical
  // V-band uplink slot is 27-31 GHz; capture the specific 28 GHz
  // carrier as a `contains` demo). The matcher's new `contains` op
  // tests whether a band scalar appears in the attribute array.
  {
    canonicalId: "ECCN:5A001.b.ka-band",
    regime: "EAR-CCL",
    category: "5",
    productGroup: "A",
    entryNumber: "001",
    subpara: "b.ka",
    title:
      "Ka-band (27-31 GHz) RF antenna or transmitter capable of operating at 28 GHz",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "rf" },
      { attribute: "frequencyBandsGhz", op: "contains", value: 28 },
    ],
    reasonsForControl: ["NS:2"],
    licenseExceptions: ["ENC"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "5A001.b",
        relationship: "analogous",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 5 Part 1 ECCN 5A001.b (Ka-band)",
    validFrom: "2014-09-01",
    notes:
      "Z34c demo — exercises the new `contains` predicate operator against a multi-band antenna's frequencyBandsGhz array. The antenna's typed attribute is the array [...30, 28, 20...]; the predicate scalar `28` must be a member.",
  },

  // 5A001.b — Circularly polarised RF antennas (RHCP / LHCP). Linearly
  // polarised (LP) antennas drop out. Used as a demonstration of the
  // string `in` predicate against `polarisationType`.
  {
    canonicalId: "ECCN:5A001.b.cp-antenna",
    regime: "EAR-CCL",
    category: "5",
    productGroup: "A",
    entryNumber: "001",
    subpara: "b.cp",
    title:
      "RF antennas with circular polarisation (RHCP, LHCP, or dual) — Wassenaar 5.A.1.b dual-pol clause",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "rf.antenna" },
      {
        attribute: "polarisationType",
        op: "in",
        value: ["RHCP", "LHCP", "dual"],
      },
    ],
    reasonsForControl: ["NS:2"],
    licenseExceptions: ["ENC"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "5A001.b",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "5.A.1.b",
        relationship: "derived_from",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 5 Part 1 ECCN 5A001.b (polarisation)",
    validFrom: "2014-09-01",
    notes:
      "Z34c demo — exercises polarisationType `in` predicate. Dual-pol Ka antennas (frequency reuse via orthogonal polarisations) fire; pure-LP feed horns drop out.",
  },

  // 9A515.x — Spacecraft components qualified for ≥ 5000 thermal
  // cycles (deep-LEO / long-mission qualification depth). Captures
  // components from Sentinel-class or Iridium-NEXT-class busses.
  {
    canonicalId: "ECCN:9A515.x.thermal-qual",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "x.thermal",
    title:
      "Spacecraft components qualified for ≥ 5000 hardware-in-the-loop thermal cycles",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "spacecraft" },
      { attribute: "thermalCycleCount", op: "gte", value: 5_000 },
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["NS:2"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A515.x",
        relationship: "analogous",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.x (qualification depth)",
    validFrom: "2014-05-13",
    notes:
      "Z34c demo — exercises thermalCycleCount. The 5000-cycle threshold corresponds to ~10 years of LEO eclipse cycles (15 cycles/day × 365 × 10 ≈ 55k cycles for sun-synchronous; 5k cycles is the typical qual margin requested by primes for long-mission parts).",
  },

  // ─── Tier 2 — Propulsion ──────────────────────────────────────────

  // 9A005 / MTCR Item 2.A.1 — Liquid-propellant chemical rocket engines
  // (`chemical` propellant family) with vacuum thrust ≥ 5 kN. Below
  // this drops to ACS / divert thrusters (~ Newtons range).
  {
    canonicalId: "ECCN:9A005.chemical-engine",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "005",
    subpara: "chemical",
    title:
      "Liquid chemical-propellant rocket engines with vacuum thrust ≥ 5 kN (MTCR 2.A.1 pendant)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.liquid_rocket",
      },
      { attribute: "propellantType", op: "eq", value: "chemical" },
      { attribute: "thrustNewtons", op: "gte", value: 5_000 },
    ],
    reasonsForControl: ["NS:2", "MT:1"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "MTCR-ANNEX",
        id: "Item 2.A.1",
        relationship: "derived_from",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A005",
        relationship: "analogous",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A005 (chemical engine clause)",
    validFrom: "2014-05-13",
    notes:
      "Z34c demo — exercises propellantType + thrustNewtons. Captures Merlin-1D (845 kN), Raptor (2.2 MN), Vinci (180 kN); cold-gas or 1-N hydrazine ACS thrusters drop out via the thrust gate even before propellantType discrimination.",
  },

  // 9A515.g / 3A001 — Electric propulsion thrusters (Hall-effect, ion).
  // Uses propellantType=`electric`. The `specificImpulseSecondsVacuum`
  // gate filters out cold-gas (~70 s) and chemical (~250-450 s) systems
  // since electric IS the high-Isp regime (≥ 1000 s typical).
  {
    canonicalId: "ECCN:9A515.g.electric-propulsion",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "g.electric",
    title:
      "Electric propulsion thrusters (Hall-effect, ion) with vacuum Isp ≥ 1000 s",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.electric",
      },
      { attribute: "propellantType", op: "eq", value: "electric" },
      {
        attribute: "specificImpulseSecondsVacuum",
        op: "gte",
        value: 1_000,
      },
    ],
    reasonsForControl: ["NS:2", "RS:2"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.g",
        relationship: "analogous",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.g (electric-propulsion sub)",
    validFrom: "2014-05-13",
    notes:
      "Z34c demo — exercises propellantType `eq` + specificImpulseSecondsVacuum. Captures PPS-1350 (1650 s), NEXT (4170 s), Snecma PPS-5000 (1800 s); chemical bipropellant (~310 s vacuum) clears the Isp gate.",
  },

  // MTCR Item 3.A.3 / 9A101 — Rocket nozzles with expansion ratio
  // ≥ 80. High expansion-ratio nozzles are vacuum-optimised second-
  // stage or upper-stage hardware, which is MTCR-relevant.
  {
    canonicalId: "MTCR:Item-3.A.3.nozzle",
    regime: "MTCR-ANNEX",
    category: "3",
    productGroup: "A",
    entryNumber: "3",
    subpara: "expansion-ratio",
    title: "Rocket nozzles with expansion ratio ≥ 80 (MTCR 3.A.3 sub-clause)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion.nozzle",
      },
      { attribute: "nozzleExpansionRatio", op: "gte", value: 80 },
    ],
    reasonsForControl: ["MT:1"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A101",
        relationship: "analogous",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A101",
        relationship: "analogous",
      },
    ],
    citation: "MTCR Annex, Category II, Item 3.A.3",
    validFrom: "1987-04-16",
    notes:
      "Z34c demo — exercises nozzleExpansionRatio. Vacuum-optimised upper-stage nozzles run ε = 100-300 (RL10: 280, Vinci: 240); first-stage sea-level nozzles run ε = 14-20 (Merlin-1D-vac: 165 vacuum / 22 sea-level).",
  },

  // ─── Tier 3 — Mission ops ─────────────────────────────────────────

  // 9A515 — Spacecraft with long mission duration ≥ 15 years (GEO
  // comsat-class lifetime). Captures the 15-year design-life specially-
  // designed-spacecraft class.
  {
    canonicalId: "ECCN:9A515.long-mission",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "x.duration",
    title: "Spacecraft with design mission duration ≥ 15 years",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "spacecraft" },
      { attribute: "missionDurationYears", op: "gte", value: 15 },
      { attribute: "isSpeciallyDesigned", op: "eq", value: true },
    ],
    reasonsForControl: ["NS:2"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
      },
    ],
    citation:
      "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.x (long-mission-life sub-clause)",
    validFrom: "2014-05-13",
    notes:
      "Z34c demo — exercises missionDurationYears. GEO comsats (15-18 yr) and large-LEO comms (12-15 yr) fire; smallsat / cubesat missions (3-5 yr) drop out.",
  },

  // EU 9A004 — High-inclination polar / SSO spacecraft (inclination
  // 80-100°). Captures the SSO regime that's typical for EO missions.
  // The `between` predicate exercises a Tier-3 demo on
  // `inclinationDegrees`.
  {
    canonicalId: "EU:9A004.sso",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "004",
    subpara: "sso",
    title:
      "Spacecraft in sun-synchronous / near-polar orbit (inclination 80-100°)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "spacecraft" },
      { attribute: "inclinationDegrees", op: "between", value: [80, 100] },
    ],
    reasonsForControl: ["WA", "NS"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A004 (SSO sub-clause)",
    validFrom: "2021-09-09",
    notes:
      "Z34c demo — exercises inclinationDegrees `between`. SSO is the EO workhorse orbit (98.4° at 700 km); equatorial GEO (0°) and inclined-medium-orbit (55° Walker constellations) drop out.",
  },

  // EU 9A004 — Highly Elliptical Orbit (HEO / Molniya) spacecraft with
  // apogee ≥ 35_000 km (GEO altitude). Captures both Molniya orbits
  // (apogee 40_000 km, perigee 1_000 km) and standard GEO transfer
  // orbits.
  {
    canonicalId: "EU:9A004.heo",
    regime: "EU-ANNEX-I",
    category: "9",
    productGroup: "A",
    entryNumber: "004",
    subpara: "heo",
    title:
      "Spacecraft in Highly Elliptical Orbit (apogee ≥ 35 000 km, perigee ≤ 5 000 km)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "spacecraft" },
      { attribute: "apogeeKm", op: "gte", value: 35_000 },
      { attribute: "perigeeKm", op: "lte", value: 5_000 },
    ],
    reasonsForControl: ["WA"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 9, 9A004 (HEO sub-clause)",
    validFrom: "2021-09-09",
    notes:
      "Z34c demo — exercises apogeeKm + perigeeKm together. Molniya (40 000 / 1 000), Tundra (~46 000 / 24 000 — only Tundra-low-perigee variants fire), GEO transfer orbits (35 786 / 200) all qualify. Note these are duplicate-check attributes vs Z25 maxOrbitAltitudeKm / minOrbitAltitudeKm — operators may populate either pair.",
  },

  // ─── Tier 4 — Imaging payloads ────────────────────────────────────

  // 6A002.b.5 — Short-wave infrared imagers with multi-band capability
  // (≥ 4 SWIR bands). Captures hyperspectral or multi-channel SWIR
  // imagers used for materials identification (mineral, plastics).
  {
    canonicalId: "EU:6A002.b.5.swir",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "002",
    subpara: "b.5.swir",
    title: "Multi-band SWIR imagers (≥ 4 spectral bands in 0.9-2.5 µm)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "sensor.imager" },
      { attribute: "swirSpectralBands", op: "gte", value: 4 },
    ],
    reasonsForControl: ["NS", "WA"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A002.b.5",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.2.b.5",
        relationship: "derived_from",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A002.b.5",
    validFrom: "2021-09-09",
    notes:
      "Z34c demo — exercises swirSpectralBands. WorldView-3 SWIR (8 bands), Sentinel-2 (3 SWIR bands — does NOT fire), Hyperion-class hyperspectral (50+ SWIR) all qualify or do not.",
  },

  // 6A002.b.6 — Mid-wave infrared imagers (3-5 µm) with ≥ 3 spectral
  // bands. Captures military-grade missile-warning sensors and the
  // commercial Pléiades-Neo MWIR pipeline.
  {
    canonicalId: "EU:6A002.b.6.mwir",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "002",
    subpara: "b.6.mwir",
    title: "Multi-band MWIR imagers (≥ 3 spectral bands in 3-5 µm)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "sensor.imager" },
      { attribute: "mwirSpectralBands", op: "gte", value: 3 },
    ],
    reasonsForControl: ["NS", "WA"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A002.b.6",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A002.b.6",
    validFrom: "2021-09-09",
    notes:
      "Z34c demo — exercises mwirSpectralBands. MWIR multi-band imagers are dual-use (commercial agriculture / wildfire detection vs. military missile warning); the 3-band threshold separates simple radiometric MWIR from spectroscopic multi-band designs.",
  },

  // 6A002.b.7 — Long-wave infrared imagers (8-14 µm) with ≥ 3 spectral
  // bands. Captures Pleiades-Neo and the commercial LWIR uncooled
  // microbolometer multi-band pipeline (BIRDS-class).
  {
    canonicalId: "EU:6A002.b.7.lwir",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "002",
    subpara: "b.7.lwir",
    title: "Multi-band LWIR imagers (≥ 3 spectral bands in 8-14 µm)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "sensor.imager" },
      { attribute: "lwirSpectralBands", op: "gte", value: 3 },
    ],
    reasonsForControl: ["NS", "WA"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A002.b.7",
        relationship: "analogous",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A002.b.7",
    validFrom: "2021-09-09",
    notes:
      "Z34c demo — exercises lwirSpectralBands. Landsat TIRS (2 LWIR bands — does NOT fire), ECOSTRESS (5 LWIR bands — fires), commercial wildfire LWIR (typically 4-band) fire.",
  },

  // 6A002.b.4 — Hyperspectral imagers with ≥ 20 contiguous spectral
  // bands. This is the Wassenaar-derived threshold that flips a
  // multispectral imager into the controlled hyperspectral category.
  {
    canonicalId: "EU:6A002.b.4.hyperspectral",
    regime: "EU-ANNEX-I",
    category: "6",
    productGroup: "A",
    entryNumber: "002",
    subpara: "b.4.hyperspectral",
    title:
      "Hyperspectral imagers with ≥ 20 contiguous spectral bands (Wassenaar 6.A.2.b.4)",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "sensor.imager" },
      { attribute: "hyperspectralBandCount", op: "gte", value: 20 },
    ],
    reasonsForControl: ["NS:2", "RS:2", "WA"],
    licenseExceptions: ["EU001"],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "6A002.b.4",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.2.b.4",
        relationship: "derived_from",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.a.2",
        relationship: "analogous",
        notes:
          "Hyperspectral spacecraft variants flow into 9A515.a.2 at the spacecraft-integration level; this entry captures the bare-imager component-level threshold.",
      },
    ],
    citation: "Reg. (EU) 2021/821 Annex I, Cat. 6, 6A002.b.4",
    validFrom: "2021-09-09",
    notes:
      "Z34c demo — exercises hyperspectralBandCount. The 20-band threshold is the canonical multispectral / hyperspectral boundary. WorldView-3 (29 bands — fires), Sentinel-2 MSI (13 bands — does NOT fire), CHRIS-PROBA (62 bands), PRISMA (240 bands), EnMAP (244 bands) all qualify.",
  },

  // Z35-JP-METI — Japan METI Schedule 1 (Goods)
  //
  // Parametric capture for the four most-walked METI categories the
  // matcher needs to discriminate when classifying for Japanese
  // operators (Mitsubishi Heavy / IHI / JAXA-partner / ALE / Astroscale
  // Japan / ispace):
  //
  //   - JP-METI:4(1)   — Spacecraft and components.
  //     Fires on itemClass = spacecraft.* + isSpeciallyDesigned. Mirrors
  //     EU 9A004 / EAR 9A515.
  //   - JP-METI:4(2)   — Rocket propulsion. Fires on
  //     itemClass = propulsion.* + isSpeciallyDesigned. Mirrors EU 9A005.
  //   - JP-METI:4(7)   — Optical sensors for spacecraft. Fires on
  //     itemClass = sensor.imager + apertureMM threshold. Mirrors EU
  //     6A002 (via cross-walk to the Cat 6 imager family).
  //   - JP-METI:11(1)  — Telecommunications equipment above digital-
  //     coding-rate thresholds. Fires on itemClass = spacecraft.comms
  //     prefix. Mirrors EU 5A001.a.
  //
  // The fifth entry (JP-METI:11(5)) captures METI crypto items —
  // every Japanese satellite TT&C link encryptor walks through here.
  // ═══════════════════════════════════════════════════════════════════
  {
    canonicalId: "JP-METI:4(1)",
    regime: "JP-METI",
    category: "4",
    productGroup: "1",
    entryNumber: "1",
    title:
      "Spacecraft and specially designed components (Japan METI Schedule 1 Cat 4(1))",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["NS", "WA"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
        notes:
          "EU Annex I 9A004 is the direct dual-use mirror for spacecraft + components.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515",
        relationship: "analogous",
        notes:
          "US ECCN 9A515 captures spacecraft after the 2014 ECR transfer from USML XV.",
      },
      {
        regime: "WASSENAAR",
        id: "9.A.4",
        relationship: "derived_from",
        notes: "Wassenaar Cat 9 9.A.4 — spacecraft + components.",
      },
    ],
    citation:
      "Export Trade Control Order (輸出貿易管理令) Appended Table 1, Item 4(1); METI Ministerial Ordinance",
    validFrom: "2017-11-29",
    notes:
      "Japan applies the standard Wassenaar 'predominantly applies' specially-designed criterion. Operators of Mitsubishi Heavy / IHI commercial spacecraft programmes walk this path.",
  },
  {
    canonicalId: "JP-METI:4(2)",
    regime: "JP-METI",
    category: "4",
    productGroup: "2",
    entryNumber: "2",
    title:
      "Rocket propulsion systems and components (Japan METI Schedule 1 Cat 4(2))",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "propulsion",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["NS", "MT", "WA"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A005",
        relationship: "analogous",
      },
      {
        regime: "EAR-CCL",
        id: "9A105",
        relationship: "analogous",
        notes:
          "9A105 captures MTCR-derived liquid rocket motor components; 9A005 dual-use rocket motors.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 2",
        relationship: "derived_from",
        notes:
          "MTCR Item 2 — complete rocket systems + sub-systems above MTCR threshold.",
      },
    ],
    citation:
      "Export Trade Control Order Appended Table 1, Item 4(2); METI Ministerial Ordinance",
    validFrom: "2017-11-29",
    notes:
      "IHI Aerospace's BT-4 apogee kick, MHI LE-9 (H3 first stage), and EP thrusters above Isp thresholds all fire. MT control reason triggers Japan's strong-presumption-of-denial gate for MTCR Partner-country exports of the full propulsion subsystem.",
  },
  {
    canonicalId: "JP-METI:4(7)",
    regime: "JP-METI",
    category: "4",
    productGroup: "7",
    entryNumber: "7",
    title:
      "Optical sensors specially designed for spacecraft (Japan METI Schedule 1 Cat 4(7))",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "sensor.imager",
      },
      // Aperture tripwire: ≥ 350 mm captures the standard Wassenaar
      // 6.A.2.a.2 + 6.A.2.b family of space-borne EO imagers above the
      // commercial-research-imager threshold.
      {
        attribute: "apertureMM",
        op: "gte",
        value: 350,
      },
    ],
    reasonsForControl: ["NS", "WA"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "6A002",
        relationship: "analogous",
        notes:
          "EU Cat 6A002 is the imager-family mirror — same Wassenaar 6.A.2 origin.",
      },
      {
        regime: "EAR-CCL",
        id: "9A515.e",
        relationship: "analogous",
        notes:
          "US 9A515.e captures spacecraft-integrated EO sensors; bare imagers cross to 6A002.",
      },
      {
        regime: "WASSENAAR",
        id: "6.A.2",
        relationship: "derived_from",
      },
    ],
    citation:
      "Export Trade Control Order Appended Table 1, Item 4(7); METI Ministerial Ordinance",
    validFrom: "2017-11-29",
    notes:
      "Japanese space-imaging operators: ALOS-3 (panchromatic), Hisaki (UV), and Hayabusa-2 LIDAR all fire on Cat 4(7). Sub-0.5 m aperture EO imagers may cross to USML XV(a)(7) at the spacecraft-integration level.",
  },
  {
    canonicalId: "JP-METI:11(1)",
    regime: "JP-METI",
    category: "11",
    productGroup: "1",
    entryNumber: "1",
    title:
      "Telecommunications equipment above digital-coding rate thresholds (Japan METI Schedule 1 Cat 11(1))",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.communications",
      },
    ],
    reasonsForControl: ["NS", "WA"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "5A001.a",
        relationship: "analogous",
        notes:
          "EU 5A001.a — telecom systems with digital techniques above defined data rates.",
      },
      {
        regime: "EAR-CCL",
        id: "5A001.a",
        relationship: "analogous",
      },
      {
        regime: "WASSENAAR",
        id: "5.A.1.a",
        relationship: "derived_from",
        notes: "Wassenaar Cat 5 Part 1 — telecommunications systems.",
      },
    ],
    citation:
      "Export Trade Control Order Appended Table 1, Item 11(1); METI Ministerial Ordinance",
    validFrom: "2017-11-29",
    notes:
      "Captures comm-sat ground-station modems, ISL terminals, antenna arrays above frequency tripwires. Cross-controlled with Cat 1(7) for military anti-jam variants.",
  },
  {
    canonicalId: "JP-METI:11(5)",
    regime: "JP-METI",
    category: "11",
    productGroup: "5",
    entryNumber: "5",
    title:
      "Cryptographic equipment above strength thresholds (Japan METI Schedule 1 Cat 11(5))",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.crypto",
      },
      {
        attribute: "isSpeciallyDesigned",
        op: "eq",
        value: true,
      },
    ],
    reasonsForControl: ["NS", "EI", "WA"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "5A002.a",
        relationship: "analogous",
        notes: "EU 5A002.a — direct crypto-module mirror.",
      },
      {
        regime: "EAR-CCL",
        id: "5A002.a",
        relationship: "analogous",
        notes:
          "US 5A002 wrapped by EAR Encryption Items framework (ENC, MMKT).",
      },
      {
        regime: "WASSENAAR",
        id: "5.A.2.a",
        relationship: "derived_from",
      },
    ],
    citation:
      "Export Trade Control Order Appended Table 1, Item 11(5); METI Ministerial Ordinance",
    validFrom: "2017-11-29",
    notes:
      "Captures TT&C link encryptors + telemetry crypto units on Japanese commercial + government satellites. METI's mass-market exemption (2018 notice) is narrower than US §740.17 (ENC) — space-rated crypto modules almost never qualify.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Z35-NSG — Nuclear Suppliers Group cross-walk entries
  //
  // The full NSG dataset lives in `src/data/trade/nsg-trigger-dual-use.ts`
  // (Trigger List + Dual-Use Annex, 30+ entries). This block ships
  // the PARAMETRIC tripwires — the codes where the matcher needs a
  // discriminator to flag a space-bound item against the NSG lists.
  //
  // Coverage:
  //   - NSG-TRIGGER:3.A   spacecraft nuclear reactors (NTP / NEP /
  //                       BWXT Advanced Reactor Technologies)
  //   - NSG-TRIGGER:1.1.A.1.b  nuclear-grade graphite (reactor moderator)
  //   - NSG-DU:2.A.1      5-axis NC machine tools (spacecraft mfg)
  //
  // Sources: INFCIRC/254/Rev.14/Part 1 + INFCIRC/254/Rev.11/Part 2.
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "NSG-TRIGGER:3.A",
    regime: "NSG-TRIGGER",
    category: "3",
    productGroup: "A",
    entryNumber: "3",
    title:
      "Nuclear reactors and especially-designed reactor components (NSG Trigger List)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.nuclear_reactor",
      },
    ],
    reasonsForControl: ["NP"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "0A001",
        relationship: "analogous",
        notes:
          "CCL 0A001 implements the NSG Trigger List reactor entries on the US side. Exports require BIS licence + NRC 10 CFR Part 110 coordination.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "0A001",
        relationship: "analogous",
        notes:
          "EU Annex I Cat 0 (nuclear materials + reactors) mirrors the NSG Trigger List on the EU side.",
      },
    ],
    citation: "INFCIRC/254/Rev.14/Part 1, Trigger List section 1",
    validFrom: "2023-11-21",
    notes:
      "Catches NASA NTP, BWXT Advanced Reactor Technologies, Lockheed Martin DRACO programme. Strong presumption of denial; effectively non-exportable except under government-to-government cooperation with full IAEA safeguards.",
  },
  {
    canonicalId: "NSG-TRIGGER:1.1.A.1.b",
    regime: "NSG-TRIGGER",
    category: "1",
    productGroup: "A",
    entryNumber: "1",
    subpara: "1.b",
    title: "Nuclear-grade graphite (reactor moderator, NSG Trigger List)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "material.graphite_nuclear_grade",
      },
    ],
    reasonsForControl: ["NP"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "0C004",
        relationship: "analogous",
        notes:
          "CCL 0C004 — graphite > 1.50 g/cm³ density, < 5 ppm boron equivalent.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "0C004",
        relationship: "analogous",
      },
    ],
    citation: "INFCIRC/254/Rev.14/Part 1, Trigger List item 2.2",
    validFrom: "2023-11-21",
    notes:
      "Relevant for NTP reactor moderators + ground-test rigs. Procurement is heavily watched by national authorities; end-use statements + NRC coordination required for US flows.",
  },
  {
    canonicalId: "NSG-DU:2.A.1",
    regime: "NSG-DU",
    category: "2",
    productGroup: "A",
    entryNumber: "1",
    title:
      "Numerically-controlled machine tools — 5+ axis simultaneous (NSG Dual-Use Annex)",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "manufacturing.machine_tool.nc_5axis",
      },
    ],
    reasonsForControl: ["NP"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "2B201",
        relationship: "analogous",
        notes:
          "CCL 2B201 — direct mirror of NSG dual-use 2.A.1 on the US side.",
      },
      {
        regime: "EU-ANNEX-I",
        id: "2B201",
        relationship: "analogous",
        notes: "EU Annex I 2B201 — direct mirror on the EU side.",
      },
      {
        regime: "WASSENAAR",
        id: "2.B.1",
        relationship: "analogous",
        notes:
          "Wassenaar 2.B.1 is the Wassenaar-aligned envelope; NSG dual-use 2.A.1 is the nuclear-specific sub-set.",
      },
    ],
    citation: "INFCIRC/254/Rev.11/Part 2, Dual-Use Annex item 2.A.1",
    validFrom: "2023-11-21",
    notes:
      "Highest-volume NSG entry by satellite-industry impact. Catches DMG Mori, Mazak, Makino 5-axis machining centres used for thruster injectors, payload structures, mirror substrates. ICP + end-use control critical.",
  },

  // ═══════════════════════════════════════════════════════════════
  // Z35-RU-833 — Russia 833/2014 sanctions cross-walk (2026-05-23)
  //
  // Council Regulation (EU) 833/2014 prohibits the export to Russia
  // and Belarus of items listed in Annexes VII (strategic-importance
  // goods), XXIII (advanced-tech goods), and XXIX (drone-related
  // goods). Many of these entries DUPLICATE EU Annex I dual-use
  // codes — the legal difference is that an Annex I item needs a
  // licence, while a 833/2014 item cannot be exported to RU/BY at
  // all (with limited derogations under Art. 12d).
  //
  // The cross-walk entries below are PARAMETRIC — the matcher
  // routes an item with the right itemClass and parametric
  // characteristics to the 833/2014 entry, which then triggers a
  // hard-prohibition outcome in the order-of-review engine.
  //
  // Full enumeration of 833/2014 annex entries lives in
  // `src/data/trade/russia-833-deep-annexes.ts`. These cross-walk
  // entries are the parametric routing layer ONLY — they teach the
  // matcher how to recognise a 833/2014-blocked item from its
  // technical characteristics, then the data file carries the
  // detailed prohibition metadata.
  // ═══════════════════════════════════════════════════════════════

  // Z35-RU-833 — Annex VII: Spacecraft (9A004 equivalent under sanctions)
  {
    canonicalId: "RU833:VII.9A004",
    regime: "RUSSIA-833-VII",
    category: "9",
    productGroup: "A",
    entryNumber: "004",
    subpara: "RU833",
    title:
      "Spacecraft (any orbit, any application) — EU 833/2014 Annex VII prohibition for RU/BY destinations",
    predicates: [{ attribute: "itemClass", op: "prefix", value: "spacecraft" }],
    reasonsForControl: ["UN"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A004",
        relationship: "analogous",
        notes:
          "EU Annex I 9A004 is the dual-use licensing entry. Reg. 833/2014 Annex VII flips this to a hard sanctions prohibition for RU/BY destinations.",
      },
    ],
    citation:
      "Council Regulation (EU) 833/2014, Annex VII (consolidated 02014R0833)",
    validFrom: "2022-03-15",
    notes:
      "Hard prohibition — no derogation under standard sanctions framework. Order-of-review engine routes this to a STRICT_PROHIBITION outcome when destination=RU/BY.",
  },

  // Z35-RU-833 — Annex VII: GNSS anti-jam receivers
  {
    canonicalId: "RU833:VII.9A012",
    regime: "RUSSIA-833-VII",
    category: "7",
    productGroup: "A",
    entryNumber: "005",
    subpara: "RU833.antijam",
    title:
      "Anti-jam GNSS receivers and adaptive nulling antennas — EU 833/2014 Annex VII prohibition",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "gnss" },
      { attribute: "isAntiJam", op: "eq", value: true },
    ],
    reasonsForControl: ["UN"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "7A005",
        relationship: "analogous",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 11.A.5",
        relationship: "derived_from",
      },
    ],
    citation:
      "Council Regulation (EU) 833/2014, Annex VII, anti-jam GNSS entry (added package 5, April 2022)",
    validFrom: "2022-04-08",
    notes:
      "Anti-jam GNSS is a regular military upgrade vector — one of the highest-risk Russia exports. Strict gate, no derogation.",
  },

  // Z35-RU-833 — Annex VII: AI compute chips (3A090 family)
  {
    canonicalId: "RU833:VII.3A090",
    regime: "RUSSIA-833-VII",
    category: "3",
    productGroup: "A",
    entryNumber: "090",
    subpara: "RU833.ai",
    title:
      "AI accelerator chips above TPP thresholds — EU 833/2014 Annex VII prohibition",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "electronics.ic.ai" },
    ],
    reasonsForControl: ["UN"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "3A090",
        relationship: "analogous",
      },
      {
        regime: "EAR-CCL",
        id: "3A090",
        relationship: "analogous",
        notes:
          "EU Annex VII / EAR 3A090 align on the October 2022 IFR AI-compute thresholds.",
      },
    ],
    citation:
      "Council Regulation (EU) 833/2014, Annex VII, AI-compute clause (added package 11, June 2023)",
    validFrom: "2023-06-23",
    notes:
      "Mirrors the US Oct-2022 IFR — H100/A100/B100-class accelerators blocked for RU/BY. No commercial-use carve-out.",
  },

  // Z35-RU-833 — Annex XXIII: Semiconductor fab equipment (3B001)
  {
    canonicalId: "RU833:XXIII.3B001",
    regime: "RUSSIA-833-XXIII",
    category: "3",
    productGroup: "B",
    entryNumber: "001",
    subpara: "RU833.fab",
    title:
      "Semiconductor lithography + etch + deposition equipment — EU 833/2014 Annex XXIII prohibition",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "fab-equipment" },
    ],
    reasonsForControl: ["UN"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "3B001",
        relationship: "analogous",
      },
      {
        regime: "EAR-CCL",
        id: "3B001",
        relationship: "analogous",
        notes:
          "EU Annex XXIII targets the same fab-equipment stack as EAR 3B001 — ASML lithography, Lam etch, ASMI deposition.",
      },
    ],
    citation:
      "Council Regulation (EU) 833/2014, Annex XXIII (added 14th package, Feb 2024)",
    validFrom: "2024-02-23",
    notes:
      "Formalises what was already export-licence practice for the EU fab-equipment primes.",
  },

  // Z35-RU-833 — Annex XXIII: GNSS jamming/spoofing equipment
  {
    canonicalId: "RU833:XXIII.5A002.c",
    regime: "RUSSIA-833-XXIII",
    category: "5",
    productGroup: "A",
    entryNumber: "002",
    subpara: "RU833.jammer",
    title:
      "GNSS jamming and spoofing equipment — EU 833/2014 Annex XXIII prohibition",
    predicates: [{ attribute: "itemClass", op: "prefix", value: "rf.jammer" }],
    reasonsForControl: ["UN"],
    licenseExceptions: [],
    seeAlso: [],
    citation:
      "Council Regulation (EU) 833/2014, Annex XXIII (added 14th package, Feb 2024)",
    validFrom: "2024-02-23",
    notes:
      "Hard prohibition — GNSS spoofing/jamming has no civilian carve-out under 833/2014.",
  },

  // Z35-RU-833 — Annex XXIX: UAV motors above power thresholds
  {
    canonicalId: "RU833:XXIX.9A012.motor",
    regime: "RUSSIA-833-XXIX",
    category: "9",
    productGroup: "A",
    entryNumber: "012",
    subpara: "RU833.uav-motor",
    title:
      "UAV electric motors above 250 W — EU 833/2014 Annex XXIX prohibition",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "uav.propulsion.motor" },
    ],
    reasonsForControl: ["UN"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "9A012",
        relationship: "analogous",
      },
      {
        regime: "EAR-CCL",
        id: "9A610.b",
        relationship: "analogous",
      },
    ],
    citation:
      "Council Regulation (EU) 833/2014, Annex XXIX (added 12th package, Dec 2023)",
    validFrom: "2023-12-19",
    notes:
      "Captures consumer-drone-class motors (250-500 W) and military-grade (1-5 kW) propulsion motors. Cross-controlled with Iranian Shahed-class drone supply chain.",
  },

  // Z35-RU-833 — Annex XXIX: UAV gimballed camera systems
  {
    canonicalId: "RU833:XXIX.6A003.gimbal",
    regime: "RUSSIA-833-XXIX",
    category: "6",
    productGroup: "A",
    entryNumber: "003",
    subpara: "RU833.uav-gimbal",
    title:
      "Gimballed camera systems for UAVs (EO/IR) — EU 833/2014 Annex XXIX prohibition",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "uav.payload.gimbal" },
    ],
    reasonsForControl: ["UN"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EU-ANNEX-I",
        id: "6A003",
        relationship: "analogous",
      },
    ],
    citation:
      "Council Regulation (EU) 833/2014, Annex XXIX (added 12th package, Dec 2023)",
    validFrom: "2023-12-19",
    notes:
      "Wescam/Controp/EU primes — gimbal is the surveillance-payload core. Cross-controlled with US ITAR XV(c).",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Look up an entry by its canonicalId. Returns undefined if not found.
 * Use when the matcher returns a candidate and the caller wants the
 * full entry for citation rendering.
 */
export function findEntryById(
  canonicalId: string,
): ControlListEntry | undefined {
  return CONTROL_LIST_CROSS_WALK.find((e) => e.canonicalId === canonicalId);
}

/**
 * Return the cross-walk subgraph rooted at a given entry — the entry
 * itself + all entries in its seeAlso. Useful for "show me all
 * regime classifications for this item" UI panels.
 */
export function entriesInCrossWalkGraph(
  canonicalId: string,
): ControlListEntry[] {
  const root = findEntryById(canonicalId);
  if (!root) return [];

  const ids = new Set<string>([root.canonicalId]);
  // Build candidate keys to match — seeAlso entries reference by
  // regime-prefixed id (e.g. { regime: "EAR-CCL", id: "9A515.a.1" })
  // while canonicalIds are stored as "ECCN:9A515.a.1" or "USML:XV(...)"
  // The matching is heuristic — find entries whose canonicalId ends
  // with the seeAlso.id.
  for (const link of root.seeAlso) {
    const match = CONTROL_LIST_CROSS_WALK.find(
      (e) =>
        e.regime === link.regime &&
        (e.canonicalId.endsWith(`:${link.id}`) ||
          e.canonicalId.endsWith(`:${link.id.replace(/[()]/g, "")}`)),
    );
    if (match) ids.add(match.canonicalId);
  }

  return CONTROL_LIST_CROSS_WALK.filter((e) => ids.has(e.canonicalId));
}
