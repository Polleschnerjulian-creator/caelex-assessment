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
 * `TradeItem` (Sprint Z3a) or a key in `TradeItem.parametricAttributes`.
 */
export type AttributeName =
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
  | "itemClass";

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
  | "derived_from"; // multilateral source for a national list

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
  // Rad-hard ICs — the SEU-rate boundary between USML and CCL
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "USML:XV(d)",
    regime: "ITAR-USML",
    category: "XV",
    productGroup: "d",
    entryNumber: "0",
    title:
      "Radiation-hardened microelectronic ICs meeting ALL FIVE criteria (SEU ≤ 1×10⁻¹⁰ errors/bit-day for CREME96 GEO Solar-Min, latch-up free, dose-rate threshold ≥ 5×10⁸ Rads(Si), …)",
    predicates: [
      { attribute: "isRadHardened", op: "eq", value: true },
      { attribute: "seuRateErrorsPerBitDay", op: "lte", value: 1e-10 },
      { attribute: "radHardTidKrad", op: "gte", value: 100 },
      {
        attribute: "itemClass",
        op: "prefix",
        value: "ic.radhard",
      },
    ],
    reasonsForControl: ["ITAR"],
    licenseExceptions: [],
    seeAlso: [
      {
        regime: "EAR-CCL",
        id: "9A515.d",
        relationship: "successor",
        notes:
          "ICs failing ANY of the five XV(d) criteria fall to 9A515.d — still controlled, but EAR, not ITAR.",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 18",
        relationship: "analogous",
      },
    ],
    citation: "22 CFR §121.1 Cat XV(d) (post 2017 Final Rule)",
    validFrom: "2017-01-15",
    notes:
      "All FIVE criteria must be met for XV(d). Missing any one drops the IC to 9A515.d. This is one of the most spec-sensitive thresholds in space-domain classification.",
  },
  {
    canonicalId: "ECCN:9A515.d",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "d",
    title:
      "Radiation-hardened microelectronic ICs designed for spacecraft, NOT meeting all five XV(d) criteria",
    predicates: [
      { attribute: "isRadHardened", op: "eq", value: true },
      { attribute: "seuRateErrorsPerBitDay", op: "gt", value: 1e-10 },
      {
        attribute: "itemClass",
        op: "prefix",
        value: "ic.radhard",
      },
    ],
    reasonsForControl: ["NS:2", "RS:2"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(d)",
        relationship: "predecessor",
      },
      {
        regime: "EU-ANNEX-I",
        id: "3A001.a",
        relationship: "analogous",
        notes: "EU rad-hard sub-controls live under Cat 3 Electronics.",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.d",
    validFrom: "2014-05-13",
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

  // ═══════════════════════════════════════════════════════════════
  // SAR remote-sensing satellite — radar-resolution thresholds
  // ═══════════════════════════════════════════════════════════════
  {
    canonicalId: "ECCN:9A515.a.3",
    regime: "EAR-CCL",
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    subpara: "a.3",
    title: "Synthetic Aperture Radar (SAR) remote-sensing satellite",
    predicates: [
      {
        attribute: "itemClass",
        op: "prefix",
        value: "spacecraft.remote_sensing.sar",
      },
    ],
    reasonsForControl: ["NS:2", "RS:2", "AT:1"],
    licenseExceptions: ["STA-eligible:partial"],
    seeAlso: [
      {
        regime: "ITAR-USML",
        id: "XV(a)",
        relationship: "predecessor",
        notes: "High-resolution military SAR may still be USML XV(a).",
      },
      {
        regime: "EU-ANNEX-I",
        id: "9A001",
        relationship: "analogous",
      },
      {
        regime: "MTCR-ANNEX",
        id: "Item 11",
        relationship: "derived_from",
      },
    ],
    citation: "15 CFR 774 Supp. 1 Cat 9 ECCN 9A515.a.3",
    validFrom: "2014-05-13",
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
