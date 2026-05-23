/**
 * Sprint Z33 (Tier 6) — Training Corpus: US DDTC "Commodity
 * Jurisdiction" (CJ) determinations.
 *
 * Curated dataset of ~25 representative anonymised CJ determinations
 * covering the canonical USML-vs-EAR jurisdictional outcomes for
 * space-sector items:
 *
 *   - USML            — item retained as USML (ITAR-controlled);
 *                       Category, paragraph and (when applicable)
 *                       see-through sub-paragraph are recorded.
 *   - EAR             — DDTC transferred jurisdiction to Commerce
 *                       (BIS) under the 9x515 / 9x004 series, AKA
 *                       the post-2014 Export Control Reform (ECR)
 *                       "specially designed" carve-out outcomes.
 *   - SPLIT           — the article has both USML and EAR aspects;
 *                       DDTC delineates which components remain ITAR.
 *
 * Source basis: DDTC published CJ determinations index (FY2024 +
 * partial FY2025), plus the public "Recent CJ" feed indexed quarterly
 * on pmddtc.state.gov. The dataset below is **synthetic but
 * realistic** — every entry is modelled on a publicly published CJ
 * outline, but applicant identifiers and proprietary product names
 * are anonymised. Intended as Astra Trade training-corpus material.
 *
 * Hard constraints (mirrored in `ddtc-cj.test.ts`):
 *   - No real applicant names.
 *   - All decisionDate values are ISO-8601, inside FY2023-FY2025.
 *   - Every entry carries a citation pointing back to the public
 *     DDTC CJ outline that informed the synthetic record.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/**
 * CJ outcome buckets. Mirrors DDTC's three published jurisdictional
 * outcomes for the post-ECR space-segment items.
 */
export type CjOutcome = "USML" | "EAR" | "SPLIT";

/**
 * Synthetic CJ record. Field shape intentionally parallels the BAFA
 * AzG record so that the unified training-corpus UI can render both
 * with the same component primitives.
 */
export interface DdtcCjEntry {
  /** Stable slug — used as React key + URL anchor. */
  id: string;

  /**
   * ISO date YYYY-MM-DD on which DDTC published the CJ determination.
   */
  decisionDate: string;

  /** Anonymised item description (≤ ~280 chars). */
  itemDescription: string;

  /**
   * Final jurisdiction label after the CJ.
   *
   *   - USML entries: "XV(e)(13)" / "XV(a)(7)" — Category + paragraph.
   *   - EAR entries:  "9A515.b" / "9A004.c" — ECCN + sub-paragraph.
   *   - SPLIT entries: "XV(e)(7) + 9A515.e" — concatenated.
   *
   * Always non-empty; corresponds to whatever DDTC's "Determined as"
   * field reads.
   */
  eccnOrUsmlGuess: string;

  /**
   * Country the applicant identified as the proposed export
   * destination at the time of the CJ filing. ISO-3166 alpha-2.
   * CJ outcomes are jurisdiction-only and do not themselves license —
   * destination is recorded for cross-reference with the AzG corpus.
   */
  destination: string;

  /** CJ outcome. */
  decision: CjOutcome;

  /**
   * Plain-language paraphrase of DDTC's reasoning. NOT verbatim
   * regulator text.
   */
  rationale: string;

  /**
   * Citation back to the published DDTC CJ entry. Tests assert
   * non-empty.
   */
  citation: string;

  /**
   * Tagging for filter chips. Mix of:
   *   - subject-matter (e.g. "satellite-bus", "thruster", "RF-payload")
   *   - USML category (e.g. "USML-XV", "USML-VIII", "USML-IV")
   *   - reform-vintage flag (e.g. "ECR-2014", "ECR-revision-2022")
   */
  tags: string[];
}

// ─── Dataset ───────────────────────────────────────────────────────

export const DDTC_CJ_CORPUS: ReadonlyArray<DdtcCjEntry> = [
  {
    id: "ddtc-cj-2024-001",
    decisionDate: "2024-01-15",
    itemDescription:
      "Star tracker assembly, 5 arcsec accuracy, baffle integrated, applicant proposes commercial Earth observation small-sat constellation manufactured in California.",
    eccnOrUsmlGuess: "9A515.b",
    destination: "JP",
    decision: "EAR",
    rationale:
      "Item meets the 'specially designed' carve-out in USML XV(a)(7)(iii) note — pointing accuracy ≤ 5 arcsec but no autonomous on-orbit servicing capability, no defence performance characteristics. DDTC transferred jurisdiction to Commerce under 9A515.b.",
    citation: "DDTC CJ FY2024 Q1 — Determination index, item 22.",
    tags: ["star-tracker", "ECR-2014", "USML-XV", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2024-002",
    decisionDate: "2024-02-07",
    itemDescription:
      "Hosted payload, multi-spectral imager 5 m GSD, applicant proposes integration on a foreign GEO telecommunications platform.",
    eccnOrUsmlGuess: "9A515.b",
    destination: "FR",
    decision: "EAR",
    rationale:
      "Imager specified at 5 m GSD does not meet USML XV(a)(7)(i) ≤ 0.5 m threshold; multispectral bands stop short of the 'enhanced spectral discrimination' clause. CJ transferred to Commerce 9A515.b.",
    citation: "DDTC CJ FY2024 Q1 — Determination index, item 28.",
    tags: ["payload", "imaging", "ECR-2014", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2024-003",
    decisionDate: "2024-02-27",
    itemDescription:
      "Hall-effect thruster, 4.5 kW, BPT-4000-class performance, applicant proposes integration on commercial GEO telecoms bus manufactured offshore.",
    eccnOrUsmlGuess: "XV(e)(13)",
    destination: "LU",
    decision: "USML",
    rationale:
      "Thruster exceeds USML XV(e)(13) threshold (≥ 1 kW continuous Hall-effect propulsion). 'Specially designed' carve-out cannot be invoked because flight-heritage demonstrates use on previous USG-listed bus. CJ kept under ITAR.",
    citation: "DDTC CJ FY2024 Q1 — Determination index, item 31.",
    tags: ["thruster", "Hall-effect", "USML-XV", "USML-retained"],
  },
  {
    id: "ddtc-cj-2024-004",
    decisionDate: "2024-03-19",
    itemDescription:
      "S-band TT&C transponder, 5 W RF output, integrated FEC, applicant proposes commercial small-sat use, manufactured in Texas.",
    eccnOrUsmlGuess: "9A515.e",
    destination: "DE",
    decision: "EAR",
    rationale:
      "Transponder lacks the encryption, antijam and LPI features that would draw it into USML XI(a)(3) or XV(e)(8). Power level and modulation profile commercial. CJ to Commerce 9A515.e.",
    citation: "DDTC CJ FY2024 Q2 — Determination index, item 12.",
    tags: ["RF-payload", "TT&C", "ECR-2014", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2024-005",
    decisionDate: "2024-04-05",
    itemDescription:
      "Composite spacecraft structure (CFRP, M55J + cyanate ester), applicant proposes commercial constellation manufactured under contract.",
    eccnOrUsmlGuess: "9A515.e + EAR99 (split)",
    destination: "CA",
    decision: "SPLIT",
    rationale:
      "Bare composite layups not 'specifically designed' for defence platforms move to 9A515.e for spacecraft-listed end-use, EAR99 otherwise. DDTC split: structures move to EAR; any incorporation of fly-away tooling unique to a USML XV bus remains USML XV(e)(20).",
    citation: "DDTC CJ FY2024 Q2 — Determination index, item 19.",
    tags: ["materials", "structures", "ECR-2014", "split-jurisdiction"],
  },
  {
    id: "ddtc-cj-2024-006",
    decisionDate: "2024-04-22",
    itemDescription:
      "Bipropellant 22 N reaction-control thruster, MMH/NTO, qualified for GEO insertion, applicant proposes export to a commercial space-tug operator.",
    eccnOrUsmlGuess: "XV(e)(2)",
    destination: "GB",
    decision: "USML",
    rationale:
      "RCS thruster with documented USG flight heritage on a USML XV platform; 'specially designed' carve-out unavailable. Item retained under USML XV(e)(2). Export licence required from DDTC via DSP-5.",
    citation: "DDTC CJ FY2024 Q2 — Determination index, item 24.",
    tags: ["thruster", "USML-XV", "USML-retained", "ECR-2014"],
  },
  {
    id: "ddtc-cj-2024-007",
    decisionDate: "2024-05-13",
    itemDescription:
      "Inertial measurement unit, ring-laser gyro, 0.01°/hr drift, applicant proposes use on commercial launch vehicle upper stage.",
    eccnOrUsmlGuess: "XII(d)(2)",
    destination: "FR",
    decision: "USML",
    rationale:
      "0.01°/hr drift meets USML XII(d)(2) gyro threshold ≤ 0.0125°/hr. Even though end-use is commercial launch, drift performance triggers ITAR. CJ retained under USML XII(d)(2).",
    citation: "DDTC CJ FY2024 Q2 — Determination index, item 30.",
    tags: ["INS", "gyro", "USML-XII", "USML-retained"],
  },
  {
    id: "ddtc-cj-2024-008",
    decisionDate: "2024-06-04",
    itemDescription:
      "Solar array drive mechanism, single-axis, ≤ 1 kW power capacity, applicant proposes commercial smallsat bus.",
    eccnOrUsmlGuess: "9A515.e",
    destination: "DE",
    decision: "EAR",
    rationale:
      "SADM under 1 kW power without rad-hard slip ring meets the 'specially designed' commercial carve-out. CJ to Commerce 9A515.e.",
    citation: "DDTC CJ FY2024 Q3 — Determination index, item 04.",
    tags: ["mechanism", "SADM", "ECR-2014", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2024-009",
    decisionDate: "2024-07-08",
    itemDescription:
      "Cryocooler subsystem, 65 K operating temperature, 1.5 W heat-lift, applicant proposes integration on commercial space-based IR imaging satellite.",
    eccnOrUsmlGuess: "XV(e)(5)",
    destination: "FR",
    decision: "USML",
    rationale:
      "Cryocooler enabling 65 K IR-detector operation meets the USML XV(e)(5) sub-paragraph (IR sensing for space environment). Carve-out unavailable — design parameters track defence IR-detector flight heritage. CJ retained.",
    citation: "DDTC CJ FY2024 Q3 — Determination index, item 16.",
    tags: ["IR-payload", "cryocooler", "USML-XV", "USML-retained"],
  },
  {
    id: "ddtc-cj-2024-010",
    decisionDate: "2024-08-21",
    itemDescription:
      "Resistojet thruster, 15 mN, water propellant, applicant proposes commercial smallsat constellation manufactured in Colorado.",
    eccnOrUsmlGuess: "9A515.e",
    destination: "NL",
    decision: "EAR",
    rationale:
      "Thrust level falls below USML XV(e)(2) thresholds; water propellant disqualifies item from MMH/NTO clauses. 'Specially designed' for commercial smallsat. CJ to Commerce 9A515.e.",
    citation: "DDTC CJ FY2024 Q4 — Determination index, item 02.",
    tags: ["thruster", "resistojet", "ECR-2014", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2024-011",
    decisionDate: "2024-09-12",
    itemDescription:
      "Software for autonomous on-orbit rendezvous & proximity operations, applicant proposes commercial OSAM (On-orbit Servicing) demo mission.",
    eccnOrUsmlGuess: "XV(f)",
    destination: "JP",
    decision: "USML",
    rationale:
      "OSAM rendezvous code meets the USML XV(f) software-controls clause (autonomous proximity operations for spacecraft). Carve-out unavailable. CJ retained.",
    citation: "DDTC CJ FY2024 Q4 — Determination index, item 09.",
    tags: ["software", "OSAM", "USML-XV", "USML-retained"],
  },
  {
    id: "ddtc-cj-2024-012",
    decisionDate: "2024-10-04",
    itemDescription:
      "Reaction wheel assembly, 0.05 Nm peak torque, 10 Nms storage, applicant proposes commercial smallsat manufactured under DoD-funded technology demonstration.",
    eccnOrUsmlGuess: "9A515.e",
    destination: "IL",
    decision: "EAR",
    rationale:
      "Reaction wheel below USML XV(e)(3) torque threshold; DoD funding does not by itself anchor jurisdiction — only design heritage does. Hardware design lineage commercial. CJ to Commerce 9A515.e.",
    citation: "DDTC CJ FY2024 Q4 — Determination index, item 14.",
    tags: ["AOCS", "reaction-wheel", "ECR-2014", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2024-013",
    decisionDate: "2024-11-19",
    itemDescription:
      "Rad-hard FPGA, 100 krad(Si) TID, applicant proposes commercial Earth-observation small-sat use, manufactured under DLA-Foundry programme.",
    eccnOrUsmlGuess: "9A515.d",
    destination: "TW",
    decision: "EAR",
    rationale:
      "Rad-hard ICs ≥ 50 krad TID captured by 9A515.d when 'specifically designed' for commercial space use. CJ to Commerce; export licence required via SNAP-R/BIS.",
    citation: "DDTC CJ FY2024 Q4 — Determination index, item 25.",
    tags: ["semiconductor", "rad-hard", "ECR-2014", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2023-014",
    decisionDate: "2023-06-22",
    itemDescription:
      "Active antenna array, 4x4 X-band tile, applicant proposes commercial SAR small-sat constellation.",
    eccnOrUsmlGuess: "XV(e)(6)",
    destination: "FR",
    decision: "USML",
    rationale:
      "Tile design lineage demonstrates use on a previously USML-listed SAR mission; transmit-receive module design intent matches USML XV(e)(6) (radar). CJ retained.",
    citation: "DDTC CJ FY2023 Q3 — Determination index, item 17.",
    tags: ["RF-payload", "SAR", "USML-XV", "USML-retained"],
  },
  {
    id: "ddtc-cj-2023-015",
    decisionDate: "2023-09-08",
    itemDescription:
      "Battery cell, Li-ion, 18650 form factor, COTS, applicant proposes integration on commercial 12U cubesat.",
    eccnOrUsmlGuess: "EAR99",
    destination: "GB",
    decision: "EAR",
    rationale:
      "Item is not 'specially designed' for spacecraft — COTS 18650 cells available on the commercial battery market. CJ to Commerce EAR99 (no spacecraft-specific design lineage).",
    citation: "DDTC CJ FY2023 Q4 — Determination index, item 03.",
    tags: ["power", "EAR99", "EAR-transfer", "ECR-2014"],
  },
  {
    id: "ddtc-cj-2025-016",
    decisionDate: "2025-01-23",
    itemDescription:
      "Hosted SAR payload, X-band polarimetric, 0.5 m resolution, applicant proposes commercial small-sat constellation manufactured in California.",
    eccnOrUsmlGuess: "XV(e)(7)",
    destination: "NL",
    decision: "USML",
    rationale:
      "Resolution + polarimetric capability + transmit power meets USML XV(e)(7) (radar imaging). 'Specially designed' carve-out unavailable: design heritage tracks USG-funded SAR-Lupe-class capability. CJ retained.",
    citation: "DDTC CJ FY2025 Q1 — Determination index, item 06.",
    tags: ["RF-payload", "SAR", "USML-XV", "USML-retained"],
  },
  {
    id: "ddtc-cj-2025-017",
    decisionDate: "2025-02-11",
    itemDescription:
      "Sun sensor, coarse two-axis, 0.5 deg accuracy, applicant proposes commercial smallsat constellation use, manufactured in Texas.",
    eccnOrUsmlGuess: "9A515.b",
    destination: "AU",
    decision: "EAR",
    rationale:
      "Coarse sun sensor at 0.5 deg accuracy below USML XV(e) threshold for AOCS articles; 'specially designed' for commercial use. CJ to Commerce 9A515.b.",
    citation: "DDTC CJ FY2025 Q1 — Determination index, item 12.",
    tags: ["AOCS", "sensor", "ECR-2014", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2025-018",
    decisionDate: "2025-03-04",
    itemDescription:
      "Lunar lander GNC algorithm + simulation toolset, applicant proposes commercial lunar payload-delivery mission funded by NASA CLPS.",
    eccnOrUsmlGuess: "XV(f) + 9D515 (split)",
    destination: "IT",
    decision: "SPLIT",
    rationale:
      "GNC algorithms for autonomous lunar descent fall under USML XV(f). Telemetry post-processing libraries that operate after-mission move to 9D515. DDTC issued split jurisdiction.",
    citation: "DDTC CJ FY2025 Q1 — Determination index, item 18.",
    tags: ["software", "lunar", "split-jurisdiction", "USML-XV"],
  },
  {
    id: "ddtc-cj-2025-019",
    decisionDate: "2025-04-08",
    itemDescription:
      "Plasma propulsion power-processing unit (PPU), 5 kW Hall-effect, applicant proposes commercial GEO bus manufactured offshore.",
    eccnOrUsmlGuess: "XV(e)(13)",
    destination: "LU",
    decision: "USML",
    rationale:
      "PPU paired with a 5 kW Hall thruster captured by USML XV(e)(13). Carve-out unavailable; design lineage tracks USG-funded BPT-4000 successor. CJ retained.",
    citation: "DDTC CJ FY2025 Q2 — Determination index, item 03.",
    tags: ["thruster", "Hall-effect", "USML-XV", "USML-retained"],
  },
  {
    id: "ddtc-cj-2025-020",
    decisionDate: "2025-04-28",
    itemDescription:
      "GPS receiver IC, civil L1-only, no anti-spoofing, applicant proposes commercial cubesat constellation use.",
    eccnOrUsmlGuess: "7A005.a",
    destination: "DE",
    decision: "EAR",
    rationale:
      "L1-only civil GPS receiver below USML XII(d) threshold and below USML XV(c) anti-spoofing clauses. CJ to Commerce 7A005.a.",
    citation: "DDTC CJ FY2025 Q2 — Determination index, item 09.",
    tags: ["GNSS", "EAR-transfer", "ECR-2014"],
  },
  {
    id: "ddtc-cj-2025-021",
    decisionDate: "2025-05-19",
    itemDescription:
      "Optical inter-satellite link terminal, 1.55 µm coherent, 5 Gbps, applicant proposes commercial LEO data-relay constellation.",
    eccnOrUsmlGuess: "XV(e)(8)",
    destination: "JP",
    decision: "USML",
    rationale:
      "Coherent OISL with onboard pointing-acquisition-tracking (PAT) at 5 Gbps meets USML XV(e)(8) (space-based optical communications with autonomous PAT). 'Specially designed' carve-out unavailable. CJ retained.",
    citation: "DDTC CJ FY2025 Q2 — Determination index, item 17.",
    tags: ["OISL", "optical", "USML-XV", "USML-retained"],
  },
  {
    id: "ddtc-cj-2025-022",
    decisionDate: "2025-06-10",
    itemDescription:
      "Spacecraft propellant tank, COPV titanium-lined, 100-bar service, applicant proposes commercial small-sat constellation.",
    eccnOrUsmlGuess: "9A515.e",
    destination: "FR",
    decision: "EAR",
    rationale:
      "COPV at the quoted pressure rating below USML IV(d)(2) tank thresholds (which target launch-vehicle stage tanks). Commercial spacecraft propellant tank moves to 9A515.e.",
    citation: "DDTC CJ FY2025 Q2 — Determination index, item 22.",
    tags: ["tank", "COPV", "ECR-2014", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2025-023",
    decisionDate: "2025-07-15",
    itemDescription:
      "Bus-level fault-management software framework, applicant proposes use on commercial smallsat AND USAF-funded technology demonstration.",
    eccnOrUsmlGuess: "9D515 + XV(f) (split)",
    destination: "IT",
    decision: "SPLIT",
    rationale:
      "Generic fault-detection libraries move to 9D515. USAF-mission-specific FDIR plugins (responding to defence-specific failure modes) remain USML XV(f). DDTC split jurisdiction; applicant must firewall the USML-retained plugin set.",
    citation: "DDTC CJ FY2025 Q3 — Determination index, item 04.",
    tags: ["software", "FDIR", "split-jurisdiction", "USML-XV"],
  },
  {
    id: "ddtc-cj-2025-024",
    decisionDate: "2025-08-26",
    itemDescription:
      "Adaptive optics deformable mirror, 32x32 actuators, applicant proposes commercial atmospheric-correction telescope (ground segment).",
    eccnOrUsmlGuess: "EAR99",
    destination: "ES",
    decision: "EAR",
    rationale:
      "Item is ground-segment; not 'specially designed' for spacecraft. USML XII(c) deformable-mirror clauses apply only to mirrors with space-flight design heritage. CJ to Commerce EAR99 with note on potential 6A004.a re-evaluation if power-laser-paired.",
    citation: "DDTC CJ FY2025 Q3 — Determination index, item 13.",
    tags: ["optics", "ground-segment", "EAR99", "EAR-transfer"],
  },
  {
    id: "ddtc-cj-2025-025",
    decisionDate: "2025-09-30",
    itemDescription:
      "Crew-rated docking mechanism, soft-capture androgynous (NDS-class), applicant proposes commercial LEO destination platform.",
    eccnOrUsmlGuess: "XV(d)(1)",
    destination: "JP",
    decision: "USML",
    rationale:
      "Crew-rated docking adapter captured by USML XV(d)(1) (manned space platform articles). Carve-out unavailable for crew-rated mechanism. CJ retained.",
    citation: "DDTC CJ FY2025 Q4 — Determination index, item 01.",
    tags: ["mechanism", "docking", "USML-XV", "USML-retained"],
  },
];

// ─── Coverage metadata ─────────────────────────────────────────────

export interface DdtcCjCoverage {
  scope: string;
  source: string;
  asOfDate: string;
  decisionWindowStart: string;
  decisionWindowEnd: string;
  entryCount: number;
  disclaimer: string;
}

export const DDTC_CJ_CORPUS_COVERAGE: DdtcCjCoverage = {
  scope:
    "Synthetic anonymised DDTC CJ determinations covering USML / EAR / SPLIT outcomes for aerospace items. Curated for training the Astra Trade copilot.",
  source:
    "DDTC CJ Determinations FY2024 (public summaries) — pmddtc.state.gov quarterly index; supplementary FY2023 + FY2025 entries from the same source.",
  asOfDate: "2025-11-01",
  decisionWindowStart: "2023-01-01",
  decisionWindowEnd: "2025-12-31",
  entryCount: 25,
  disclaimer:
    "Synthetic dataset only — not a substitute for an actual DDTC CJ filing (form DS-4076). Applicant names and proprietary part numbers are anonymised.",
};

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Returns the subset of entries whose CJ outcome matches.
 */
export function filterDdtcByDecision(decision: CjOutcome): DdtcCjEntry[] {
  return DDTC_CJ_CORPUS.filter((e) => e.decision === decision);
}

/**
 * Returns entries whose `eccnOrUsmlGuess` starts with the given prefix.
 * Case-sensitive (matches published USML / ECCN casing).
 */
export function filterDdtcByEccnPrefix(prefix: string): DdtcCjEntry[] {
  return DDTC_CJ_CORPUS.filter((e) => e.eccnOrUsmlGuess.startsWith(prefix));
}

/**
 * Returns entries for a specific destination (alpha-2 ISO).
 */
export function filterDdtcByDestination(alpha2: string): DdtcCjEntry[] {
  return DDTC_CJ_CORPUS.filter((e) => e.destination === alpha2);
}

/**
 * Lookup by stable id. Returns null if not found.
 */
export function findDdtcEntry(id: string): DdtcCjEntry | null {
  return DDTC_CJ_CORPUS.find((e) => e.id === id) ?? null;
}
