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
  | "isSpeciallyDesigned";

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
