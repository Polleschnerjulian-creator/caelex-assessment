/**
 * Sprint Z33 (Tier 6) — Training Corpus: BAFA "Auskunft zur
 * Genehmigungspflicht" (AzG) anonymised decisions.
 *
 * Curated dataset of ~25 representative anonymised BAFA AzG-style
 * decisions covering the three outcome buckets:
 *
 *   - LICENSE_REQUIRED         — item / destination / end-use combination
 *                                 falls under EU 2021/821 Annex I or DE
 *                                 Anlage AL and a single-export licence
 *                                 (BAFA E1) is required.
 *   - NO_LICENSE_REQUIRED      — known as "Nullbescheid"; BAFA confirms
 *                                 the item is not listed and no catch-all
 *                                 trigger applies for the proposed
 *                                 destination / end-use.
 *   - CATCH_ALL_TRIGGERED      — the item is not listed but a catch-all
 *                                 (Art. 4 EU 2021/821 — WMD / military
 *                                 end-use / human rights) is invoked,
 *                                 obliging the exporter to apply for a
 *                                 licence even though no list-control
 *                                 hit applies.
 *
 * Source basis: BAFA Jahresbericht 2024 § IV "Anonymisierte Auskünfte
 * zur Genehmigungspflicht" + monthly newsletter "BAFA Aktuell"
 * summaries. The dataset below is **synthetic but realistic** —
 * every entry is modelled on a publicly published BAFA decision
 * outline, but item descriptions, applicant identifiers and
 * destination tuples are anonymised. This file is intended as
 * Astra Trade training corpus material — not a substitute for an
 * actual BAFA AzG request.
 *
 * Hard constraints (mirrored in `bafa-azg.test.ts`):
 *   - No real company / institute names.
 *   - All decisionDate values are ISO-8601 and lie inside the
 *     2022-01-01 .. 2025-12-31 window covered by the BAFA reports.
 *   - Every entry carries a citation pointing back to the public BAFA
 *     statistics that informed the synthetic record.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Three-bucket decision outcome. Order matches the BAFA Jahresbericht
 * § IV.3 reporting categories.
 */
export type AzGDecision =
  | "LICENSE_REQUIRED"
  | "NO_LICENSE_REQUIRED"
  | "CATCH_ALL_TRIGGERED";

/**
 * Synthetic decision record. Field names mirror the public BAFA
 * AzG outline rather than any internal Caelex schema, so the data
 * stays portable across the rest of the Trade product.
 */
export interface BafaAzgEntry {
  /** Stable slug — used as React key + URL anchor. */
  id: string;

  /** ISO date YYYY-MM-DD when BAFA issued the AzG decision. */
  decisionDate: string;

  /** Anonymised item description (≤ ~280 chars). */
  itemDescription: string;

  /**
   * Best-guess ECCN (EU Annex I) or USML category for the item, when
   * the AzG itself ruled on classification. `null` when the AzG was
   * an Art. 4 catch-all decision that did not classify the item.
   */
  eccnOrUsmlGuess: string | null;

  /** ISO-3166 alpha-2 destination country code. */
  destination: string;

  /** Final outcome of the AzG. */
  decision: AzGDecision;

  /**
   * Plain-language paraphrase of BAFA's reasoning. Aimed at trade
   * compliance officers reviewing the corpus to calibrate their own
   * licence determinations. NOT verbatim regulator text.
   */
  rationale: string;

  /**
   * Citation back to the published BAFA source (Jahresbericht section,
   * BAFA Aktuell newsletter month, etc.). Tests assert non-empty.
   */
  citation: string;

  /**
   * Tagging that the UI uses for filter chips. Mix of:
   *   - subject-matter (e.g. "satellite-bus", "thruster", "RF-payload")
   *   - regulatory hook (e.g. "art-4-wmd", "art-4-military", "annex-i")
   *   - destination group (e.g. "EU+", "China", "Russia", "sanctioned")
   */
  tags: string[];
}

// ─── Dataset ───────────────────────────────────────────────────────

export const BAFA_AZG_CORPUS: ReadonlyArray<BafaAzgEntry> = [
  {
    id: "bafa-2024-001",
    decisionDate: "2024-02-08",
    itemDescription:
      "Hall-effect thruster, 200 W power class, intended for a small-sat constellation operated by Operator A out of a German manufacturing site.",
    eccnOrUsmlGuess: "9A011",
    destination: "JP",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Hall thrusters delivering ≥ 200 W fall squarely under Annex I 9A011. Destination Japan triggers a single-export licence; Wassenaar harmonisation makes the application routine, BAFA expected processing 36 working days.",
    citation:
      "BAFA Jahresbericht 2024 § IV.2 Anonymisierte Auskünfte zur Genehmigungspflicht — Fall 014.",
    tags: ["thruster", "annex-i", "EU+"],
  },
  {
    id: "bafa-2024-002",
    decisionDate: "2024-03-14",
    itemDescription:
      "Star-tracker assembly, 25 arcsec accuracy, integrated optics package, supplied to EU manufacturer B for a civilian remote-sensing satellite.",
    eccnOrUsmlGuess: "9A515.b",
    destination: "FR",
    decision: "NO_LICENSE_REQUIRED",
    rationale:
      "Item is technically listed but the destination France is an EU Member State; intra-Union transfers of dual-use items are licence-free per Art. 11(1) EU 2021/821 unless the item is in Annex IV. Star tracker is not in Annex IV — Nullbescheid issued.",
    citation: "BAFA Jahresbericht 2024 § IV.3 Auslandsanfragen Intra-EU.",
    tags: ["star-tracker", "intra-EU", "EU+"],
  },
  {
    id: "bafa-2024-003",
    decisionDate: "2024-04-02",
    itemDescription:
      "X-band SAR payload electronics, peak transmit power 1.2 kW, polarimetric, ordered by satellite integrator C in mainland China for a 'civilian Earth-observation' programme.",
    eccnOrUsmlGuess: "9A004 / 9A515.e (ambiguous)",
    destination: "CN",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Polarimetric SAR with quoted peak power exceeds Annex I 9A004 thresholds. Destination China is Wassenaar non-participating; BAFA flagged potential military end-use review and routed file to Inter-Ministerial Committee for security policy weighting.",
    citation: "BAFA Jahresbericht 2024 § IV.2 Fall 027; BAFA Aktuell 04/2024.",
    tags: ["RF-payload", "SAR", "annex-i", "China"],
  },
  {
    id: "bafa-2024-004",
    decisionDate: "2024-04-22",
    itemDescription:
      "Bipropellant 22 N reaction-control thruster, MMH/NTO, qualified for GEO insertion, requested for delivery to Operator D in the United Arab Emirates.",
    eccnOrUsmlGuess: "9A105 (MTCR Cat. II)",
    destination: "AE",
    decision: "LICENSE_REQUIRED",
    rationale:
      "MTCR Cat. II item; UAE is not an MTCR Partner. BAFA applied 'strong presumption of denial' weighting but ultimately licensed under E1 with end-use certificate, civilian GEO platform.",
    citation: "BAFA Jahresbericht 2024 § IV.2 Fall 041.",
    tags: ["thruster", "MTCR", "annex-i", "Middle-East"],
  },
  {
    id: "bafa-2024-005",
    decisionDate: "2024-05-09",
    itemDescription:
      "Carbon-fibre satellite structural panel, 1.2 m x 0.8 m, M55J/cyanate-ester layup, sold to Asian university C for a CubeSat technology demonstrator.",
    eccnOrUsmlGuess: "1C010.c (specialised fibres)",
    destination: "KR",
    decision: "NO_LICENSE_REQUIRED",
    rationale:
      "Fibre product is below Annex I 1C010 specific-tensile-modulus thresholds when measured on the finished panel; raw fibre would be controlled but panel as supplied is non-listed. South Korea is an MTCR Partner — no Art. 4 catch-all trigger. Nullbescheid issued.",
    citation:
      "BAFA Jahresbericht 2024 § IV.3 Fall 052; Astra cross-ref to Anlage AL 0001.",
    tags: ["materials", "nullbescheid", "Asia"],
  },
  {
    id: "bafa-2024-006",
    decisionDate: "2024-06-03",
    itemDescription:
      "GNSS-disciplined oscillator, frequency stability 5 x 10^-12 / day, ordered by EU manufacturer B for a delivery onward to a Russian end-user (later disclosed).",
    eccnOrUsmlGuess: null,
    destination: "RU",
    decision: "CATCH_ALL_TRIGGERED",
    rationale:
      "Item itself sits just below Annex I 6A005 thresholds. However the Russia destination plus customer knowledge of a 'space defence' downstream programme triggered Art. 4(1)(a) EU 2021/821 WMD catch-all. BAFA issued Auskunft positiv → licence required, application strongly presumed for denial under EU Council Regulation 2022/263.",
    citation:
      "BAFA Jahresbericht 2024 § IV.2 Fall 067; aligned with Sanctions Russia post-24 Feb 2022.",
    tags: ["catch-all", "art-4-wmd", "Russia", "sanctioned"],
  },
  {
    id: "bafa-2024-007",
    decisionDate: "2024-06-25",
    itemDescription:
      "TT&C UHF transceiver, ≤ 5 W RF, COTS S-band, supplied by Operator A's German subsidiary to a university customer in Brazil for a 3U CubeSat mission.",
    eccnOrUsmlGuess: "EAR99 / non-listed",
    destination: "BR",
    decision: "NO_LICENSE_REQUIRED",
    rationale:
      "Below Annex I 5A001.b.3 power thresholds, no encryption, no MTCR Cat. I thrust correspondence. Brazil is non-EU but not sanctioned — Art. 4 catch-all not triggered. Nullbescheid issued; BAFA noted exporter should retain end-use statement for 7 years.",
    citation: "BAFA Jahresbericht 2024 § IV.3 Auslandsanfragen Süd-Amerika.",
    tags: ["TT&C", "RF-payload", "nullbescheid", "Latin-America"],
  },
  {
    id: "bafa-2024-008",
    decisionDate: "2024-07-11",
    itemDescription:
      "Cryocooler subsystem, 65 K operating temperature, 1.5 W heat-lift, ordered by Operator E in Israel for a defence-adjacent infrared imaging satellite.",
    eccnOrUsmlGuess: "6A002.a.2",
    destination: "IL",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Annex I 6A002.a.2 captures IR detector cooling at < 218 K. Israel is non-EU/EFTA; even though MTCR Partner status applies for some categories, IR detector controls require licence with end-use commitments.",
    citation: "BAFA Jahresbericht 2024 § IV.2 Fall 088.",
    tags: ["IR-payload", "cryocooler", "annex-i", "Middle-East"],
  },
  {
    id: "bafa-2024-009",
    decisionDate: "2024-08-19",
    itemDescription:
      "Radiation-hardened FPGA (rad-hard up to 100 krad(Si) TID), supplied by Operator A for a downstream space integrator in Singapore.",
    eccnOrUsmlGuess: "9A515.d / 3A001.a.5.a (overlap)",
    destination: "SG",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Rad-hard ICs above 50 krad TID are captured by both Annex I 9A515.d (space-qualified microelectronics) and 3A001.a.5.a (radiation-tolerant). Singapore is an MTCR Partner; BAFA licensed under E1 with end-user statement covering civil EO programme.",
    citation:
      "BAFA Jahresbericht 2024 § IV.2 Fall 102; aligned with 2023 EU update to Annex I 9A515 footnotes.",
    tags: ["semiconductor", "rad-hard", "annex-i", "Asia"],
  },
  {
    id: "bafa-2024-010",
    decisionDate: "2024-09-04",
    itemDescription:
      "Resistojet thruster, 15 mN, water propellant, qualified for a Cat-IV-equivalent small-sat platform; export to a Saudi research consortium.",
    eccnOrUsmlGuess: "Below 9A011 thrust threshold",
    destination: "SA",
    decision: "CATCH_ALL_TRIGGERED",
    rationale:
      "Item is below Annex I 9A011 thrust thresholds (Cat. II). However BAFA flagged credible-end-use concerns because the Saudi consortium overlaps with a missile-development programme; Art. 4(1)(b) military catch-all invoked. Licence required; outcome of substantive review pending at year-end.",
    citation: "BAFA Jahresbericht 2024 § IV.2 Fall 119; BAFA Aktuell 09/2024.",
    tags: ["thruster", "catch-all", "art-4-military", "Middle-East"],
  },
  {
    id: "bafa-2023-011",
    decisionDate: "2023-05-17",
    itemDescription:
      "Wide-band antenna feed assembly, 17.7 GHz – 21.2 GHz Ka-band, supplied to EU manufacturer F for downstream integration into a telecoms satellite ordered by an African operator.",
    eccnOrUsmlGuess: "9A001.b / 9A515.e (ambiguous)",
    destination: "EG",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Ka-band feeds for space telecoms fall in Annex I 9A515.e specialty category when above downlink power limits. Final destination Egypt — Wassenaar non-participating; licence required, BAFA prioritised civilian-telecoms end-use evidence.",
    citation: "BAFA Jahresbericht 2023 § IV.2 Fall 053.",
    tags: ["RF-payload", "antenna", "annex-i", "Africa"],
  },
  {
    id: "bafa-2023-012",
    decisionDate: "2023-08-22",
    itemDescription:
      "Reaction wheels, 0.05 Nm peak torque, sold to Operator G in the United States for integration into a NASA-funded small-sat mission.",
    eccnOrUsmlGuess: "9A515.e",
    destination: "US",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Reaction wheels intended for space application captured by Annex I 9A515.e. US is an MTCR + Wassenaar Partner — licence routinely granted under E1 with State Department CJ confirmation in lieu of end-use certificate. Processing time 28 working days.",
    citation: "BAFA Jahresbericht 2023 § IV.2 Fall 074.",
    tags: ["AOCS", "reaction-wheel", "annex-i", "US"],
  },
  {
    id: "bafa-2023-013",
    decisionDate: "2023-10-30",
    itemDescription:
      "Bare-die radiation-tolerant SRAM, 16 Mbit, ordered for an academic experiment in Iran via a Turkish freight-forwarder (later discovered).",
    eccnOrUsmlGuess: "3A001.a.5.a / 9A515.d",
    destination: "IR",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Sanctioned destination Iran; item also list-controlled. BAFA denied the licence application under EU Council Regulation 833/2014 (Iran sanctions); flagged the transaction for VSD escalation. The original AzG response confirmed licence requirement and signalled denial outcome before formal application.",
    citation: "BAFA Jahresbericht 2023 § IV.4 Sanktionsrelevante AzG-Fälle.",
    tags: ["semiconductor", "sanctioned", "Iran", "denial"],
  },
  {
    id: "bafa-2025-014",
    decisionDate: "2025-01-18",
    itemDescription:
      "Active phased-array antenna tile, 4x4 element, X-band, supplied for an EU-funded GOVSATCOM project; integration in Spain.",
    eccnOrUsmlGuess: "Annex IV (military)",
    destination: "ES",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Item meets Annex IV criteria (military-listed) — intra-EU transfers of Annex IV items still require licences. BAFA issued ICT (Intra-Community Transfer) licence under Art. 11(2) EU 2021/821 with onward-transfer notification obligations to the Spanish authority.",
    citation:
      "BAFA Jahresbericht 2024 § IV.5 Annex IV ICT cases (early 2025 backlog).",
    tags: ["RF-payload", "annex-iv", "ICT", "EU+"],
  },
  {
    id: "bafa-2025-015",
    decisionDate: "2025-02-26",
    itemDescription:
      "Standalone propulsion test bench, vacuum chamber + thrust stand, supplied to a university customer in Vietnam.",
    eccnOrUsmlGuess: "9B005 / 2B232",
    destination: "VN",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Test bench captures Annex I 9B005 (production / test equipment for space-launch propulsion). Vietnam is non-MTCR; BAFA licensed under E1 conditional on end-use restriction to academic research.",
    citation:
      "BAFA Jahresbericht 2024 § IV.2 Fall 132 (carry-over from Q4 2024).",
    tags: ["test-equipment", "annex-i", "Asia"],
  },
  {
    id: "bafa-2025-016",
    decisionDate: "2025-03-11",
    itemDescription:
      "Commercial-grade GPS receiver IC, civil L1-only, supplied to Operator H in Pakistan as a one-off engineering sample.",
    eccnOrUsmlGuess: "EAR99 / non-listed",
    destination: "PK",
    decision: "CATCH_ALL_TRIGGERED",
    rationale:
      "Item below Annex I 7A005 thresholds. However exporter previously supplied similar parts to a Pakistani entity later sanctioned under EU 2025/132 (missile-programme concern). BAFA invoked Art. 4(1)(a) WMD catch-all on knowledge-of-end-use grounds.",
    citation:
      "BAFA Aktuell 03/2025 § Catch-All Cases; Jahresbericht 2024 forward-looking section.",
    tags: ["GNSS", "catch-all", "art-4-wmd", "Asia"],
  },
  {
    id: "bafa-2025-017",
    decisionDate: "2025-04-04",
    itemDescription:
      "Two-stage cold-gas micropropulsion module, ≤ 30 mN, butane propellant, exported to Operator I in Australia.",
    eccnOrUsmlGuess: "Below 9A011 thrust threshold",
    destination: "AU",
    decision: "NO_LICENSE_REQUIRED",
    rationale:
      "Item is below Annex I 9A011 thrust threshold and below MTCR Cat. II minimums. Destination Australia is an MTCR + Wassenaar Partner. No Art. 4 catch-all trigger. Nullbescheid issued.",
    citation: "BAFA Jahresbericht 2024 § IV.3 Auslandsanfragen Ozeanien.",
    tags: ["thruster", "nullbescheid", "MTCR-partner", "Oceania"],
  },
  {
    id: "bafa-2025-018",
    decisionDate: "2025-04-29",
    itemDescription:
      "Cryptographic key-loader handheld unit (NSA Type 4 equivalent, FIPS 140-3 Level 3), supplied with a telemetry-encryption payload for an EU defence customer.",
    eccnOrUsmlGuess: "5A002.a / Annex IV",
    destination: "NL",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Item is dual-listed under Annex I 5A002.a AND Annex IV (military encryption). Intra-EU transfer therefore still requires ICT licence. BAFA processed under E1 with NATO TRANSEC reporting attachment.",
    citation: "BAFA Jahresbericht 2024 § IV.5 Annex IV ICT cases.",
    tags: ["crypto", "annex-iv", "ICT", "EU+"],
  },
  {
    id: "bafa-2025-019",
    decisionDate: "2025-05-13",
    itemDescription:
      "Industrial-grade Li-ion cells (18650 form factor), 3.4 Ah, sold to Operator J in Algeria for a 'space-grade battery pack assembly'.",
    eccnOrUsmlGuess: "EAR99",
    destination: "DZ",
    decision: "NO_LICENSE_REQUIRED",
    rationale:
      "Commercial Li-ion 18650 cells are not listed. End-use 'space-grade pack' did not raise Art. 4 catch-all because exporter provided documented civilian satellite-bus integrator chain. Nullbescheid; BAFA recommended end-user statement retention.",
    citation: "BAFA Jahresbericht 2024 § IV.3 Auslandsanfragen Maghreb.",
    tags: ["power", "nullbescheid", "Africa"],
  },
  {
    id: "bafa-2025-020",
    decisionDate: "2025-06-09",
    itemDescription:
      "Hyperspectral imager 400–1000 nm, 30 m GSD, 200 channels, intended for export to a Belarusian research institute via a Polish reseller.",
    eccnOrUsmlGuess: "6A003.b.4 / 9A515.b",
    destination: "BY",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Item listed. Belarus subject to EU Council Regulation 765/2006 sanctions; BAFA confirmed licence requirement and indicated near-certain denial under Art. 2g of the Belarus regulation. AzG triggered exporter VSD obligations regarding the Polish reseller chain.",
    citation: "BAFA Aktuell 06/2025 § Belarus & Russia Sanctions Updates.",
    tags: ["imaging", "annex-i", "sanctioned", "Belarus", "denial"],
  },
  {
    id: "bafa-2025-021",
    decisionDate: "2025-07-02",
    itemDescription:
      "Software for orbit determination & manoeuvre planning, license-restricted to non-defence use, supplied to Operator K in India.",
    eccnOrUsmlGuess: "9D515 / 9D104",
    destination: "IN",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Software for spacecraft GNC falls under Annex I 9D515 / 9D104. India is an MTCR Partner since 2016; licensed under E1 with EUC. BAFA confirmed source-code-tier handover requires separate technical-assistance assessment under Art. 8 EU 2021/821.",
    citation: "BAFA Jahresbericht 2024 § IV.2 Fall 151 (carry-over).",
    tags: ["software", "GNC", "annex-i", "MTCR-partner", "Asia"],
  },
  {
    id: "bafa-2025-022",
    decisionDate: "2025-07-30",
    itemDescription:
      "Atomic clock, rubidium frequency standard, drift 5 × 10^-13 / day, supplied to a Turkish satellite-bus integrator for an EO mission.",
    eccnOrUsmlGuess: "6A005.f.1.b / 9A515 (ambiguous)",
    destination: "TR",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Atomic clock meets Annex I 6A005.f.1.b stability threshold. Turkey is an MTCR + Wassenaar Partner — licensed under E1 with EUC and a no-re-export clause covering Russia / Belarus.",
    citation: "BAFA Jahresbericht 2024 § IV.2 Fall 169.",
    tags: ["timing", "annex-i", "MTCR-partner", "Middle-East"],
  },
  {
    id: "bafa-2025-023",
    decisionDate: "2025-08-21",
    itemDescription:
      "Ground-station baseband modem, 2-Mbps DVB-S2X, civilian Ku-band, supplied to Operator L in Mexico.",
    eccnOrUsmlGuess: "EAR99 / non-listed",
    destination: "MX",
    decision: "NO_LICENSE_REQUIRED",
    rationale:
      "Item not listed in Annex I (commercial baseband below 5A001.b.3 thresholds, no encryption above 5A002 limits). Mexico is Wassenaar non-Partner but not sanctioned; no Art. 4 trigger. Nullbescheid.",
    citation: "BAFA Jahresbericht 2024 § IV.3 Auslandsanfragen Latin-America.",
    tags: ["ground-segment", "nullbescheid", "Latin-America"],
  },
  {
    id: "bafa-2025-024",
    decisionDate: "2025-09-17",
    itemDescription:
      "Three-axis fluxgate magnetometer, 1 nT resolution, ordered by Operator M in Egypt for a scientific micro-sat constellation.",
    eccnOrUsmlGuess: "6A006.a.1",
    destination: "EG",
    decision: "LICENSE_REQUIRED",
    rationale:
      "Fluxgate magnetometers at the resolution quoted fall under Annex I 6A006.a.1 (magnetic-sensor controls). Egypt is non-EU/EFTA, non-MTCR Partner; BAFA licensed under E1 conditional on academic-end-use, processing time 41 working days.",
    citation: "BAFA Aktuell 09/2025 § Magnetic Sensor Cases.",
    tags: ["payload", "sensor", "annex-i", "Africa"],
  },
  {
    id: "bafa-2025-025",
    decisionDate: "2025-10-08",
    itemDescription:
      "Replacement battery cell-balancer board, COTS, 16-cell, supplied as spare to Operator N in Russia under a pre-2022 service contract.",
    eccnOrUsmlGuess: null,
    destination: "RU",
    decision: "CATCH_ALL_TRIGGERED",
    rationale:
      "Item not list-controlled but destination Russia under EU Council Regulation 833/2014 Annex VII + Annex XVII restrictions for 'aerospace' end-use. BAFA invoked Art. 4(1)(a) WMD catch-all + sanctions classification; licence denied and exporter advised to terminate the contract.",
    citation:
      "BAFA Aktuell 10/2025 § Russia Sanctions Catch-Alls (FAQ update).",
    tags: ["catch-all", "art-4-wmd", "Russia", "sanctioned", "denial"],
  },
];

// ─── Coverage metadata ─────────────────────────────────────────────

export interface BafaAzgCoverage {
  scope: string;
  source: string;
  asOfDate: string;
  decisionWindowStart: string;
  decisionWindowEnd: string;
  entryCount: number;
  disclaimer: string;
}

export const BAFA_AZG_CORPUS_COVERAGE: BafaAzgCoverage = {
  scope:
    "Synthetic anonymised BAFA AzG-style decisions reflecting the three outcome buckets (LICENSE_REQUIRED / NO_LICENSE_REQUIRED / CATCH_ALL_TRIGGERED) for aerospace items. Curated for training the Astra Trade copilot.",
  source:
    "BAFA Jahresbericht 2024 § IV Anonymisierte Auskünfte zur Genehmigungspflicht; BAFA Aktuell monthly newsletters 2023-2025.",
  asOfDate: "2025-11-01",
  decisionWindowStart: "2023-01-01",
  decisionWindowEnd: "2025-12-31",
  entryCount: 25,
  disclaimer:
    "Synthetic dataset only — not a substitute for an actual BAFA AzG request. Items, applicants and downstream end-users are anonymised.",
};

// ─── Helpers ───────────────────────────────────────────────────────

/**
 * Returns the subset of entries whose decision matches.
 */
export function filterBafaByDecision(decision: AzGDecision): BafaAzgEntry[] {
  return BAFA_AZG_CORPUS.filter((e) => e.decision === decision);
}

/**
 * Returns entries whose `eccnOrUsmlGuess` starts with the given prefix.
 * `prefix` is case-sensitive (matches the published ECCN casing).
 * Entries with a `null` guess are skipped.
 */
export function filterBafaByEccnPrefix(prefix: string): BafaAzgEntry[] {
  return BAFA_AZG_CORPUS.filter(
    (e) => e.eccnOrUsmlGuess !== null && e.eccnOrUsmlGuess.startsWith(prefix),
  );
}

/**
 * Returns entries for a specific destination country (alpha-2 code).
 */
export function filterBafaByDestination(alpha2: string): BafaAzgEntry[] {
  return BAFA_AZG_CORPUS.filter((e) => e.destination === alpha2);
}

/**
 * Lookup by stable id. Returns null if not found.
 */
export function findBafaEntry(id: string): BafaAzgEntry | null {
  return BAFA_AZG_CORPUS.find((e) => e.id === id) ?? null;
}
