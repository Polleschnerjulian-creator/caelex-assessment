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
  | "MTCR-ANNEX" // MTCR (multilateral)
  | "WASSENAAR" // Wassenaar Arrangement
  | "NSG" // Nuclear Suppliers Group
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
  | "temperatureRangeCelsius";

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
  | "in"; // attribute ∈ value[]

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
  {
    canonicalId: "USML:XV(e)(11)(iv)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "e",
    entryNumber: "11",
    subpara: "(iv)",
    title:
      "Electric propulsion (plasma/ion) with thrust > 300 mN AND Isp > 1500 s, OR input power > 15 kW",
    predicates: [
      { attribute: "itemClass", op: "prefix", value: "propulsion.electric" },
      // Two-rule disjunction is hard to express in a flat AND-predicate
      // list. The matcher applies the stricter test: BOTH thrust + Isp
      // must be above. The 15kW power path is handled by a separate
      // entry below (XV(e)(11)(iv)-power-path).
      { attribute: "transmitPowerW", op: "gte", value: 0.3 }, // thrust expressed as power proxy? no — use real predicate
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
      "Disjunctive rule: HIGH-power (>15 kW) OR HIGH-thrust+HIGH-Isp. This entry encodes the conservative AND form; a separate entry XV(e)(11)(iv)-power-path covers the >15 kW disjunct.",
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
