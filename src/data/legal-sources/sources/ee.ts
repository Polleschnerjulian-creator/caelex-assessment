// src/data/legal-sources/sources/ee.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Estonia space law sources — complete legal framework for jurisdiction EE.
 *
 * Sources: mkm.ee, ttja.ee, ria.ee, riigiteataja.ee, kosmos.ee, esa.int
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act. Estonia is ESA member since
 * 2 February 2015. Regulatory framework layered from (i) EU instruments
 * applied directly (EU Space Act once in force, NIS2, CRA), (ii) sectoral
 * Estonian law — Electronic Communications Act, Strategic Goods Act,
 * Cybersecurity Act, and (iii) E-Residency infrastructure that allows
 * non-Estonian founders to incorporate space SPVs remotely. ESTCube-1
 * launched 7 May 2013 (first Estonian satellite, University of Tartu).
 * Tartu Observatory acts as de-facto national space science institution.
 *
 * Coverage status: PRELIMINARY. Treaty accession dates flagged below
 * require verification against UN depositary records before publication.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── EE Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_EE: Authority[] = [
  {
    id: "EE-MKM",
    jurisdiction: "EE",
    name_en:
      "Ministry of Economic Affairs and Communications — Estonian Space Office",
    name_local:
      "Majandus- ja Kommunikatsiooniministeerium — Eesti Kosmosebüroo",
    abbreviation: "MKM",
    website: "https://mkm.ee",
    space_mandate:
      "Primary coordinator of Estonian space activities. The Estonian Space Office (Eesti Kosmosebüroo) operates within MKM and serves as the ESA delegation ministry, coordinating Estonia's ~€3M/year ESA contribution and national space policy. Host of the national space strategy. Represents Estonia at the EU Space Programme Committee.",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "EE-TTJA",
    jurisdiction: "EE",
    name_en: "Consumer Protection and Technical Regulatory Authority",
    name_local: "Tarbijakaitse ja Tehnilise Järelevalve Amet",
    abbreviation: "TTJA",
    website: "https://ttja.ee",
    space_mandate:
      "National regulatory authority for electronic communications. Issues individual authorisations for satellite earth stations and satellite uplink services under the Electronic Communications Act (Elektroonilise side seadus). Manages Estonian radio spectrum allocation, coordinates ITU satellite filings and orbital slot notifications on behalf of the Estonian administration.",
    legal_basis: "Elektroonilise side seadus (2004)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "EE-RIA",
    jurisdiction: "EE",
    name_en: "Estonian Information System Authority",
    name_local: "Riigi Infosüsteemi Amet",
    abbreviation: "RIA",
    website: "https://ria.ee",
    space_mandate:
      "NIS2 national competent authority. Coordinates cybersecurity incident response (CERT-EE), maintains the national cybersecurity baseline (ISKE / E-ITS), and supervises essential and important entities including space-sector operators whose services qualify under Annex I/II NIS2. Operates the national vulnerability coordination function.",
    legal_basis: "Küberturvalisuse seadus (2018)",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "EE-MOD",
    jurisdiction: "EE",
    name_en: "Ministry of Defence — Strategic Goods Commission",
    name_local: "Kaitseministeerium — Strateegilise kauba komisjon",
    abbreviation: "KAM",
    website: "https://kaitseministeerium.ee",
    space_mandate:
      "Export control authority for dual-use space technology under the Strategic Goods Act (Strateegilise kauba seadus). Estonia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group export control regimes. Issues export licences for Category 9 (Aerospace) dual-use items in cooperation with MFA.",
    legal_basis: "Strateegilise kauba seadus (2011)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "EE-MFA",
    jurisdiction: "EE",
    name_en: "Ministry of Foreign Affairs",
    name_local: "Välisministeerium",
    abbreviation: "VM",
    website: "https://vm.ee",
    space_mandate:
      "International space treaty matters, COPUOS representation, and foreign policy coordination for export control licensing. Responsible for the deposit of treaty ratifications and national registry notifications to the UN Office for Outer Space Affairs (UNOOSA).",
    applicable_areas: ["licensing", "export_control"],
  },
  {
    id: "EE-AKI",
    jurisdiction: "EE",
    name_en: "Data Protection Inspectorate",
    name_local: "Andmekaitse Inspektsioon",
    abbreviation: "AKI",
    website: "https://aki.ee",
    space_mandate:
      "GDPR enforcement for Earth observation imagery, satellite-derived data products, and space-based telecommunications services. Particularly relevant for high-resolution EO where personal data implications arise under GDPR Art. 4(1).",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (EE-specific entries, 2) ──────────────
// NOTE: Treaty accession dates marked "TO VERIFY" — pending UN depositary
// confirmation. Estonia restored independence 1991 and acceded to major
// UN space treaties as an independent state in the 2010s.

const TREATIES_EE: LegalSource[] = [
  {
    id: "EE-OST-ACCESSION",
    jurisdiction: "EE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Estonian Accession",
    title_local: "Välisriigi kosmose kasutamise leping",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["EE-MFA", "EE-MKM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Estonia bears international responsibility for national space activities. However, NO domestic authorization regime exists for private space operations — Estonia has no dedicated national space law. Regulatory framework relies on (i) EU instruments, (ii) sectoral Estonian law (telecoms, export control, cybersecurity), and (iii) ESA programme agreements.",
        complianceImplication:
          "Estonia currently relies on sectoral regulators (TTJA for spectrum, RIA for cybersecurity, MOD for export control) rather than a unified licensing regime. Private operators must navigate multiple authorities.",
      },
    ],
    related_sources: ["EE-LIABILITY", "EE-REGISTRATION"],
    notes: [
      "Estonia restored independence 1991; UN space treaty accession as independent state.",
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "EE-LIABILITY",
    jurisdiction: "EE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Estonian Accession",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["EE-MFA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Estonia is absolutely liable for damage caused by Estonian space objects on the surface of the Earth. No dedicated space insurance framework or recourse cap exists under Estonian law. Private operators face unlimited recourse exposure unless contractually limited via launch/insurance agreements negotiated individually.",
      },
    ],
    related_sources: ["EE-OST-ACCESSION"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Registration Framework (1) ───────────────────────────────────

const REGISTRATION_EE: LegalSource[] = [
  {
    id: "EE-REGISTRATION",
    jurisdiction: "EE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Estonian Framework",
    date_enacted: "1975-01-14",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["EE-MFA", "EE-MKM"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry — via MKM, no standalone statute",
        summary:
          "Estonia maintains its national registry of space objects through MKM administrative practice rather than a dedicated registration statute. ESTCube-1 (launched 7 May 2013, 1U CubeSat, University of Tartu) was Estonia's first registered space object. Subsequent satellites have been registered via MFA notification to UNOOSA.",
      },
    ],
    related_sources: ["EE-OST-ACCESSION"],
    notes: [
      "ESTCube-1 — first Estonian satellite, launched on Vega VV02 (7 May 2013).",
      "ESTCube-2 launched 9 October 2023 on Vega VV23 (deorbited 3 January 2024).",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation Applicable to Space (3) ──────────────────

const SECTORAL_EE: LegalSource[] = [
  {
    id: "EE-ECA-2004",
    jurisdiction: "EE",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act",
    title_local: "Elektroonilise side seadus",
    date_enacted: "2004-12-08",
    date_in_force: "2005-01-01",
    official_reference: "RT I 2004, 87, 593",
    source_url: "https://www.riigiteataja.ee/akt/115032019093",
    issuing_body: "Riigikogu",
    competent_authorities: ["EE-TTJA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "§§ 9–19",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. TTJA is the issuing authority and manages Estonia's position in ITU filings and orbital slot coordination.",
        complianceImplication:
          "Any commercial ground station operator must obtain a TTJA authorisation before transmitting to a satellite. Authorisations are typically granted for 10 years with renewal.",
      },
    ],
    related_sources: ["EE-OST-ACCESSION"],
    last_verified: "2026-04-20",
  },
  {
    id: "EE-SGA-2011",
    jurisdiction: "EE",
    type: "federal_law",
    status: "in_force",
    title_en: "Strategic Goods Act",
    title_local: "Strateegilise kauba seadus",
    date_enacted: "2011-11-17",
    date_in_force: "2012-01-01",
    official_reference: "RT I, 29.12.2011, 2",
    source_url: "https://www.riigiteataja.ee/akt/129122011002",
    issuing_body: "Riigikogu",
    competent_authorities: ["EE-MOD", "EE-MFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "§§ 1–10",
        title: "Export control for dual-use space technology",
        summary:
          "Supplements EU Regulation 2021/821. The Strategic Goods Commission under the Ministry of Defence issues export licences for Category 9 (Aerospace/Propulsion) items. Estonia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
      },
    ],
    related_sources: ["EE-OST-ACCESSION"],
    last_verified: "2026-04-20",
  },
  {
    id: "EE-CYBERSEC-2018",
    jurisdiction: "EE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Cybersecurity Act (NIS implementation; NIS2 transposition pending)",
    title_local: "Küberturvalisuse seadus",
    date_enacted: "2018-05-09",
    date_in_force: "2018-05-23",
    official_reference: "RT I, 22.05.2018, 1",
    source_url: "https://www.riigiteataja.ee/akt/122052018001",
    issuing_body: "Riigikogu",
    competent_authorities: ["EE-RIA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS-2016",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS-era cybersecurity baseline",
        summary:
          "Implements the original NIS Directive (EU 2016/1148). RIA is the national competent authority. Space-sector entities providing essential services (e.g., satellite-based critical infrastructure) fall under the essential/important entity regime. NIS2 transposition is ongoing — space is a high-criticality sector under NIS2 Annex I.",
        complianceImplication:
          "Operators providing satellite-based services to Estonian essential entities must comply with current cybersecurity baseline (E-ITS). NIS2 transposition will expand the perimeter of obligated entities.",
      },
    ],
    related_sources: ["EE-OST-ACCESSION"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / Strategy (1) ─────────────────────────────────────────

const POLICY_EE: LegalSource[] = [
  {
    id: "EE-ESA-ACCESSION-2015",
    jurisdiction: "EE",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA Convention — Estonian Full Membership",
    title_local: "ESA liikmelisuse leping",
    date_enacted: "2015-02-02",
    date_in_force: "2015-02-02",
    source_url: "https://www.esa.int/About_Us/Corporate_news/Estonia_joins_ESA",
    issuing_body: "European Space Agency",
    competent_authorities: ["EE-MKM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA full membership",
        summary:
          "Estonia became the 21st full member state of the European Space Agency on 2 February 2015. Estonia contributes approximately €3M annually to ESA programmes. ESA membership anchors Estonian industrial participation in ESA industry contracts and gives Estonian institutions access to ESA science and technology programmes.",
      },
    ],
    related_sources: ["EE-OST-ACCESSION"],
    notes: [
      "ESA Associate Member since 2009, full member since 2015.",
      "University of Tartu and Tartu Observatory are primary ESA research partners.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_EE: LegalSource[] = [
  ...TREATIES_EE,
  ...REGISTRATION_EE,
  ...SECTORAL_EE,
  ...POLICY_EE,
];
