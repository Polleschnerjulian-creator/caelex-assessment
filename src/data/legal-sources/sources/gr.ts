// src/data/legal-sources/sources/gr.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Greece space law sources — complete legal framework for jurisdiction GR.
 *
 * Sources: et.gr (ΦΕΚ), hsc.gov.gr, eett.gr
 * Last verified: 2026-04-15
 *
 * Notable: Law 4508/2017 — comprehensive space act (licensing, registry,
 * environmental provisions). Hellenic Space Centre (ΕΛΚΕΔ) est. 2019.
 * ESA member since 2005 (16th). €200M satellite programme, 9 spacecraft
 * in orbit by late 2025. Artemis Accords Feb 2024 (35th). NIS2 transposed
 * promptly (Law 5160/2024). Defence space carved out under MOD autonomy.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── GR Authorities (8) ───────────────────────────────────────────

export const AUTHORITIES_GR: Authority[] = [
  {
    id: "GR-HSC",
    jurisdiction: "GR",
    name_en: "Hellenic Space Centre",
    name_local: "Ελληνικό Κέντρο Διαστήματος (ΕΛΚΕΔ)",
    abbreviation: "HSC/ΕΛΚΕΔ",
    website: "https://hsc.gov.gr",
    space_mandate:
      "Greece's primary space agency. ΝΠΙΔ supervised by Ministry of Digital Governance. Est. Law 4623/2019 Art. 60, successor to ΕΛΔΟ. Mandate: strategy, programme management, ESA interface, satellite systems, National Register of Space Objects, advisory. President: Dr. Emmanuel Rammos (ex-ESA, 26 patents). CEO: Dr. Nick Sergis. Flagship: €200M National Small Satellite Programme (13 satellites, 4 instrument categories).",
    legal_basis: "Law 4623/2019, Art. 60",
    applicable_areas: ["licensing", "registration", "debris_mitigation"],
  },
  {
    id: "GR-MINDIGITAL",
    jurisdiction: "GR",
    name_en:
      "Ministry of Digital Governance — General Secretariat of Telecommunications",
    name_local: "Υπουργείο Ψηφιακής Διακυβέρνησης — ΓΓΤΤ",
    abbreviation: "ΓΓΤΤ",
    website: "https://mindigital.gr",
    space_mandate:
      "Supervising ministry for HSC. General Secretary of Telecommunications (Konstantinos Karantzalos) = Head of Greek Delegation to ESA. Space licensing applications submitted to this General Secretariat under Law 5099/2024 Art. 39.",
    applicable_areas: ["licensing"],
  },
  {
    id: "GR-EETT",
    jurisdiction: "GR",
    name_en: "Hellenic Telecommunications and Post Commission",
    name_local: "Εθνική Επιτροπή Τηλεπικοινωνιών και Ταχυδρομείων",
    abbreviation: "EETT",
    website: "https://www.eett.gr",
    space_mandate:
      "Manages radio spectrum (excluding state networks). Grants individual rights of use for satellite earth station frequencies. Operates Satellite Communications Spectrum Monitoring System (SSMS). Satellite providers need General Authorization + spectrum rights via mySPECTRA portal.",
    legal_basis: "Law 4727/2020 (Electronic Communications Code)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "GR-MOD",
    jurisdiction: "GR",
    name_en: "Ministry of National Defence — Space Division",
    name_local: "Υπουργείο Εθνικής Αμύνης — Διεύθυνση Διαστήματος",
    abbreviation: "MOD/ΓΕΕΘΑ",
    website: "https://www.mod.mil.gr",
    space_mandate:
      "Space Division (Διεύθυνση Διαστήματος) inaugurated 2024 under ΓΕΕΘΑ. Law 4623/2019 Art. 60(10): full autonomy over defence space programmes. National Centre for Space Applications (NCSA) since 1995 (Helios II, CSO imagery). ELKAK manages military satellite procurement (€25M domestic SAR, July 2025). Long-Term Defence Armament Planning 2025-2036: €25B including satellite systems.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "GR-NOA",
    jurisdiction: "GR",
    name_en: "National Observatory of Athens — BEYOND Centre",
    name_local: "Εθνικό Αστεροσκοπείο Αθηνών — BEYOND",
    abbreviation: "NOA/BEYOND",
    website: "https://beyond-eocenter.eu",
    space_mandate:
      "Founded 1842. Constituting national entity for EU SST. Operates GR-NOC SST (national operations centre). BEYOND Centre of Excellence (est. 2013): 24/7 FireHub active-fire detection for EFFIS (all Europe, N. Africa, Middle East, Balkans). Operates Hellenic National Sentinel Data Mirror Site. First European deep-space optical comms link with NASA Psyche (July 2025).",
    applicable_areas: ["environmental", "registration"],
  },
  {
    id: "GR-MFA-B6",
    jurisdiction: "GR",
    name_en: "Ministry of Foreign Affairs — B6 Directorate (Export Control)",
    name_local: "Υπουργείο Εξωτερικών — Β6 Διεύθυνση",
    abbreviation: "MFA/B6",
    website: "https://www.mfa.gr",
    space_mandate:
      "Primary licensing authority for dual-use items under MD 121837/E3/21837. Implements EU Regulation 2021/821. Greece is one of 7 EU member states with national general export authorizations.",
    legal_basis: "MD 121837/E3/21837 (ΦΕΚ 2182/Β'/2009)",
    applicable_areas: ["export_control"],
  },
  {
    id: "GR-NCA",
    jurisdiction: "GR",
    name_en: "National Cybersecurity Authority",
    name_local: "Εθνική Αρχή Κυβερνοασφάλειας",
    abbreviation: "NCA",
    website: "https://www.mindigital.gr",
    space_mandate:
      "NIS2 compliance for space-sector entities under Law 5160/2024. Space as critical sector. Implementing JMDs: 1381/2025 (platform), 1645/2025 (entity registration), 1689/2025 (cybersecurity framework). Greece transposed NIS2 just one month late.",
    legal_basis: "Law 5160/2024 (ΦΕΚ Α' 195/2024)",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "GR-HDPA",
    jurisdiction: "GR",
    name_en: "Hellenic Data Protection Authority",
    name_local: "Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα",
    abbreviation: "ΑΠΔΠΧ",
    website: "https://www.dpa.gr",
    space_mandate:
      "GDPR supervision under Law 4624/2019. Applies to personal data from high-resolution satellite imagery. No space-specific guidance issued.",
    legal_basis: "Law 4624/2019 (ΦΕΚ Α' 137/2019)",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (GR-specific entries, 4) ──────────────

const TREATIES_GR: LegalSource[] = [
  {
    id: "GR-OST-1967",
    jurisdiction: "GR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Greece Ratification Record",
    title_local: "Συνθήκη για τον Εξωτερικό Διάστημα — Κύρωση",
    date_enacted: "1967-01-27",
    date_in_force: "1971-01-19",
    official_reference: "ν.δ. 670/1970 (ΦΕΚ Α' 208/1970)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations / Βουλή των Ελλήνων",
    competent_authorities: ["GR-MFA-B6", "GR-HSC"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Greece bears international responsibility for national space activities. Signed on opening day (27 January 1967). Ratified via ν.δ. 670/1970. Law 4508/2017 comprehensively implements Art. VI with mandatory licensing, registry, and environmental assessment.",
        complianceImplication:
          "Law 4508/2017 is one of Europe's more complete implementations of Art. VI — licensing, registry, environmental impact assessment, and sanctions.",
      },
    ],
    related_sources: [
      "GR-SPACE-ACT-2017",
      "GR-LIABILITY-1977",
      "GR-REGISTRATION-2003",
    ],
    notes: [
      "ν.δ. 670/1970 (ΦΕΚ Α' 208/1970). Signed 27 January 1967 (opening day).",
      "Instrument deposited 19 January 1971.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "GR-LIABILITY-1977",
    jurisdiction: "GR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Greece Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1977-01-01",
    official_reference: "ν. 563/1977 (ΦΕΚ Α' 75/1977)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations / Βουλή",
    competent_authorities: ["GR-MFA-B6"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Greece is absolutely liable for surface damage. Law 4508/2017 Art. 11 addresses international liability. No mandatory minimum insurance amount specified — operators must demonstrate adequate insurance as a licensing condition (Art. 4). No government backstop.",
        complianceImplication:
          "Insurance requirements determined case-by-case in licensing conditions. Less prescriptive than FR/AT/FI (€60M fixed) or PT (mass-scaled).",
      },
    ],
    related_sources: ["GR-OST-1967", "GR-SPACE-ACT-2017"],
    notes: ["ν. 563/1977 (ΦΕΚ Α' 75/1977)."],
    last_verified: "2026-04-15",
  },
  {
    id: "GR-REGISTRATION-2003",
    jurisdiction: "GR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Greece Ratification Record",
    date_enacted: "1975-01-14",
    date_in_force: "2003-04-04",
    official_reference: "ν. 3131/2003 (ΦΕΚ Α' 79/2003)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations / Βουλή",
    competent_authorities: ["GR-HSC"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Ratified late — Law 3131/2003. Implemented through Law 4508/2017 Art. 17: National Register of Space Objects (Εθνικό Μητρώο Διαστημικών Αντικειμένων) maintained by Ministry of Digital Governance/HSC. 9 Greek satellites in orbit by late 2025.",
      },
    ],
    related_sources: ["GR-OST-1967", "GR-SPACE-ACT-2017"],
    notes: [
      "ν. 3131/2003 (ΦΕΚ Α' 79/2003). Late ratification — 28 years after Convention adoption.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "GR-ARTEMIS-ACCORDS",
    jurisdiction: "GR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Greece Signatory (2024)",
    date_enacted: "2024-02-09",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["GR-MFA-B6"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Greece signed 9 February 2024 in Washington — 35th signatory, 12th ESA member state. Foreign Minister Gerapetritis signed at 5th US-Greece Strategic Dialogue. Moon Agreement NOT ratified. Greece and Belgium jointly proposed the COPUOS Working Group on Space Resource Activities (2019).",
      },
    ],
    related_sources: ["GR-OST-1967"],
    notes: [
      "35th signatory, 9 February 2024.",
      "Greece and Belgium co-proposed COPUOS Space Resources Working Group (2019).",
    ],
    last_verified: "2026-04-15",
  },
];

// ─── Primary National Legislation (3) ───────────────────────────

const PRIMARY_LEGISLATION_GR: LegalSource[] = [
  {
    id: "GR-SPACE-ACT-2017",
    jurisdiction: "GR",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law 4508/2017 — Licensing of Space Activities and National Register",
    title_local:
      "Νόμος 4508/2017 — Αδειοδότηση διαστημικών δραστηριοτήτων — Εθνικό Μητρώο Διαστημικών Αντικειμένων",
    date_enacted: "2017-12-22",
    date_last_amended: "2024-04-05",
    official_reference:
      "ΦΕΚ Α' 200/22.12.2017 (amended by Laws 4712/2020, 5099/2024)",
    source_url: "https://www.et.gr",
    issuing_body: "Βουλή των Ελλήνων",
    competent_authorities: ["GR-HSC", "GR-MINDIGITAL"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
      "environmental",
    ],
    key_provisions: [
      {
        section: "Art. 3",
        title: "Mandatory prior licensing",
        summary:
          "All space activities (launch, flight, guidance, return) require prior licensing. Applies to Greek territory, Greek facilities abroad, Greek nationals/entities, and any person using Greek state assets where Greece is 'Launching State.'",
      },
      {
        section: "Art. 4",
        title: "Licensing conditions — insurance and debris",
        summary:
          "Conditions include financial capability, space debris mitigation per international best practices, non-contamination of space/celestial bodies, and adequate insurance. No fixed minimum insurance amount — determined case-by-case.",
        complianceImplication:
          "Less prescriptive on insurance than FR/AT/FI (€60M) but provides flexibility. Debris mitigation referenced to international guidelines.",
      },
      {
        section: "Art. 6",
        title: "Environmental impact assessment",
        summary:
          "Mandatory environmental impact assessment before any licensed space activity. Relatively unusual provision among European space laws.",
      },
      {
        section: "Art. 11",
        title: "International liability",
        summary:
          "Addresses international liability aligned with the 1972 Liability Convention. State absorbs international liability, with recourse against operators based on licensing conditions and Greek Civil Code.",
      },
      {
        section: "Art. 15",
        title: "Sanctions for unlicensed activities",
        summary:
          "Administrative fines €250 to €44,891.81 for operating without licence or violating conditions.",
      },
      {
        section: "Art. 17",
        title: "National Register of Space Objects",
        summary:
          "Εθνικό Μητρώο Διαστημικών Αντικειμένων maintained by Ministry of Digital Governance. Unique national registration numbers. Records per Registration Convention Art. IV requirements.",
      },
    ],
    scope_description:
      "One of Europe's more complete space statutes. Three chapters: (A) regulatory core (Art. 1-17), (B) originally established ΕΛΔΟ (superseded by HSC), (C) miscellaneous. Amended by Law 4712/2020 (debris/licensing) and Law 5099/2024 Art. 39 (licensing procedure reform, fee structure). Defence space carved out under MOD autonomy (Law 4623/2019 Art. 60(10)).",
    related_sources: [
      "GR-OST-1967",
      "GR-LIABILITY-1977",
      "GR-REGISTRATION-2003",
      "GR-HSC-LAW-2019",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "ΦΕΚ Α' 200/22.12.2017.",
      "Amended by Law 4712/2020 and Law 5099/2024 Art. 39.",
      "Defence space programmes under MOD autonomy (Law 4623/2019 Art. 60(10)).",
      "Implementing ministerial decision under Art. 39 of Law 5099/2024 — status pending.",
      "9 Greek satellites in orbit by late 2025.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "GR-HSC-LAW-2019",
    jurisdiction: "GR",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law 4623/2019, Art. 60-61 — Establishment of the Hellenic Space Centre",
    title_local:
      "Νόμος 4623/2019, Άρθρο 60 — Ίδρυση Ελληνικού Κέντρου Διαστήματος",
    date_enacted: "2019-08-09",
    official_reference: "ΦΕΚ Α' 134/09.08.2019",
    source_url: "https://www.et.gr",
    issuing_body: "Βουλή",
    competent_authorities: ["GR-HSC", "GR-MINDIGITAL"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    key_provisions: [
      {
        section: "Art. 60",
        title: "HSC establishment and mandate",
        summary:
          "Establishes Hellenic Space Centre (ΕΛΚΕΔ) as ΝΠΙΔ supervised by Minister of Digital Governance. Nine-fold mandate. 7-member Board for 5-year terms. Art. 60(10): MOD retains FULL administrative and operational autonomy over defence space programmes.",
        complianceImplication:
          "Defence space explicitly carved out — dual regulatory track unique in Greek space law.",
      },
      {
        section: "Art. 61",
        title: "Transitional provisions — ΕΛΔΟ succession",
        summary:
          "All assets, rights, obligations, and personnel transferred from abolished ΕΛΔΟ (Hellenic Space Agency) to HSC.",
      },
    ],
    related_sources: ["GR-SPACE-ACT-2017"],
    last_verified: "2026-04-15",
  },
  {
    id: "GR-ECOMM-2020",
    jurisdiction: "GR",
    type: "federal_law",
    status: "in_force",
    title_en: "Law 4727/2020 — Electronic Communications Code",
    title_local: "Νόμος 4727/2020 — Ηλεκτρονικές Επικοινωνίες",
    date_enacted: "2020-09-23",
    official_reference: "ΦΕΚ Α' 184/23.09.2020",
    source_url: "https://www.et.gr",
    issuing_body: "Βουλή",
    competent_authorities: ["GR-EETT"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Art. 109 / Art. 119",
        title: "Satellite spectrum and orbital management",
        summary:
          "Art. 109: satellite networks included in electronic communications definition. Art. 119: management of satellite orbits and associated frequencies. Transposes Directive (EU) 2018/1972.",
      },
    ],
    related_sources: ["GR-SPACE-ACT-2017"],
    last_verified: "2026-04-15",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────

const CYBERSECURITY_GR: LegalSource[] = [
  {
    id: "GR-NIS2-2024",
    jurisdiction: "GR",
    type: "federal_law",
    status: "in_force",
    title_en: "Law 5160/2024 — NIS2 Transposition",
    title_local: "Νόμος 5160/2024 — Μεταφορά NIS2",
    date_enacted: "2024-11-27",
    official_reference: "ΦΕΚ Α' 195/27.11.2024",
    source_url: "https://www.et.gr",
    issuing_body: "Βουλή",
    competent_authorities: ["GR-NCA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — just one month late",
        summary:
          "Greece transposed NIS2 just one month after the EU deadline (October 2024) — among the fastest in the EU. Space as critical sector. Implementing JMDs: 1381/2025 (registration platform), 1645/2025 (entity registration), 1689/2025 (cybersecurity framework).",
        complianceImplication:
          "Satellite operators and ground-segment operators qualifying as essential/important entities must register with the National Cybersecurity Authority.",
      },
    ],
    related_sources: ["GR-SPACE-ACT-2017"],
    last_verified: "2026-04-15",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_GR: LegalSource[] = [
  {
    id: "GR-SATELLITE-PROGRAMME",
    jurisdiction: "GR",
    type: "policy_document",
    status: "in_force",
    title_en: "Greek National Small Satellite Programme (€200M)",
    date_published: "2021-01-01",
    source_url: "https://hsc.gov.gr",
    issuing_body: "HSC / Ministry of Digital Governance",
    competent_authorities: ["GR-HSC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full programme",
        title: "€200M from EU Recovery and Resilience Facility",
        summary:
          "Targets 13 operational satellites in 4 instrument categories (SAR, optical, thermal-IR, multispectral/hyperspectral) plus experimental CubeSats. 9 satellites in orbit by late 2025. ICEYE SAR (25cm resolution), Open Cosmos optical (7 satellites), OroraTech thermal-IR (4 satellites). 60 companies, €500M sector revenue 2024 (doubled from 2020). ESA BIC Greece: 25 startups since 2020.",
        complianceImplication:
          "~60 companies, 2,500+ employees. Revenue doubled 2020-2024. Entities increasing 43%, revenues growing 65% (2019-2023).",
      },
    ],
    related_sources: ["GR-SPACE-ACT-2017"],
    last_verified: "2026-04-15",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_GR: LegalSource[] = [
  ...TREATIES_GR,
  ...PRIMARY_LEGISLATION_GR,
  ...CYBERSECURITY_GR,
  ...POLICY_GR,
];
