// src/data/legal-sources/sources/pl.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Poland space law sources — complete legal framework for jurisdiction PL.
 *
 * Sources: isap.sejm.gov.pl, polsa.gov.pl, dziennikustaw.gov.pl
 * Last verified: 2026-04-15
 *
 * Notable: Brand new Space Activities Act 2026 (Dz.U. 2026, poz. 465) —
 * comprehensive framework in force ~April 2026. €60M insurance, POLSA as
 * authority. Fastest ESA growth: €731M at CM25 (+277%). >€1.2B military
 * satellite procurement. Deliberately bifurcated: civilian (POLSA/MFiG)
 * vs military (MON/ARGUS). ESA member since 2012.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── PL Authorities (10) ──────────────────────────────────────────

export const AUTHORITIES_PL: Authority[] = [
  {
    id: "PL-POLSA",
    jurisdiction: "PL",
    name_en: "Polish Space Agency",
    name_local: "Polska Agencja Kosmiczna",
    abbreviation: "POLSA",
    website: "https://polsa.gov.pl",
    space_mandate:
      "Central space authority since 2014 (Act Dz.U. 2014, poz. 1533). Transformed by 2026 Space Act into permit-granting, registry, and supervisory authority. President grants space activity permits, maintains National Register of Space Objects, supervises compliance. Reports to Minister of Finance and Economy (MFiG). President: Grzegorz Wrochna. HQ: Gdańsk (moved from Warsaw 2024). ~120 staff. Manages ESA contributions, coordinates national space activities.",
    legal_basis:
      "Ustawa z dnia 26 września 2014 r. o POLSA; Ustawa z dnia 13 lutego 2026 r. o działalności kosmicznej",
    applicable_areas: [
      "licensing",
      "registration",
      "insurance",
      "liability",
      "debris_mitigation",
    ],
  },
  {
    id: "PL-MFIG",
    jurisdiction: "PL",
    name_en: "Ministry of Finance and Economy",
    name_local: "Ministerstwo Finansów i Gospodarki",
    abbreviation: "MFiG",
    website: "https://www.gov.pl/web/finanse",
    space_mandate:
      "Supervising ministry for POLSA (transferred from Ministry of Development March 2025). Responsible for civilian space policy. Second-instance authority for permit appeals. Issues implementing regulations under the Space Act.",
    applicable_areas: ["licensing"],
  },
  {
    id: "PL-MON",
    jurisdiction: "PL",
    name_en: "Ministry of National Defence — ARGUS Space Centre",
    name_local:
      "Ministerstwo Obrony Narodowej — Centrum Operacji Kosmicznych ARGUS",
    abbreviation: "MON/ARGUS",
    website: "https://www.gov.pl/web/obrona-narodowa",
    space_mandate:
      "Military space activities EXEMPT from Space Act permit requirements. ARGUS (est. 2024, operational 1 January 2025) is the national military space operations centre within the Armed Forces General Command, coordinating SSA, satellite comms, GNSS, and EO. >€1.2B in military satellite procurement: POLEOS (€575M, Airbus, 30cm optical), MikroSAR (€200M, ICEYE/WZŁ-1, 25cm SAR), MIKROGLOB (PLN 453M, Creotech), PIAST (PLN 70M, encrypted laser comms). Poland targets 12 military satellites (6 optical, 6 radar).",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "PL-UKE",
    jurisdiction: "PL",
    name_en: "Office of Electronic Communications",
    name_local: "Urząd Komunikacji Elektronicznej",
    abbreviation: "UKE",
    website: "https://www.uke.gov.pl",
    space_mandate:
      "National regulatory authority for electronic communications. Satellite spectrum management under the Electronic Communications Law (Dz.U. 2024, poz. 1221). ITU frequency coordination. Issues radio frequency permits for satellite earth stations.",
    legal_basis: "Prawo komunikacji elektronicznej (Dz.U. 2024, poz. 1221)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "PL-ABW",
    jurisdiction: "PL",
    name_en: "Internal Security Agency",
    name_local: "Agencja Bezpieczeństwa Wewnętrznego",
    abbreviation: "ABW",
    website: "https://www.abw.gov.pl",
    space_mandate:
      "Issues binding opinions on national security and defence for space permit applications under the Space Act. Also handles cybersecurity under NIS2 implementation.",
    applicable_areas: ["cybersecurity", "military_dual_use"],
  },
  {
    id: "PL-EXPORT",
    jurisdiction: "PL",
    name_en: "Ministry of Finance and Economy — Sensitive Goods Department",
    name_local:
      "Departament Handlu Towarami Wrażliwymi i Bezpieczeństwa Technicznego",
    abbreviation: "MFiG/DHT",
    website: "https://www.gov.pl/web/finanse",
    space_mandate:
      "Primary export control authority for dual-use space technology under the Strategic Goods Trade Act (2000, as amended 2026 with Tracker 2.0). Issues individual, global, and national general export licenses. Poland member of all 5 export control regimes (Wassenaar founding, MTCR 1998, NSG, AG, HCoC — chaired 2017-2018).",
    legal_basis:
      "Ustawa z dnia 29 listopada 2000 r. o obrocie z zagranicą towarami o znaczeniu strategicznym",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "PL-UODO",
    jurisdiction: "PL",
    name_en: "Personal Data Protection Office",
    name_local: "Urząd Ochrony Danych Osobowych",
    abbreviation: "UODO",
    website: "https://uodo.gov.pl",
    space_mandate:
      "GDPR supervisory authority. Relevant for satellite imagery, Earth observation data, and space-based data services.",
    applicable_areas: ["data_security"],
  },
  {
    id: "PL-CBK-PAN",
    jurisdiction: "PL",
    name_en: "Space Research Centre — Polish Academy of Sciences",
    name_local: "Centrum Badań Kosmicznych Polskiej Akademii Nauk",
    abbreviation: "CBK PAN",
    website: "https://www.cbk.waw.pl",
    space_mandate:
      "Poland's premier space research institution, founded 1977. Flight heritage: Cassini-Huygens, Mars Express, Rosetta, INTEGRAL, Herschel, JUICE (SWI instrument). Developing CAMILA constellation. Home of the first Polish space hardware (Interkosmos-Copernicus, 1973).",
    applicable_areas: ["licensing"],
  },
  {
    id: "PL-IMGW",
    jurisdiction: "PL",
    name_en: "Institute of Meteorology and Water Management",
    name_local: "Instytut Meteorologii i Gospodarki Wodnej",
    abbreviation: "IMGW-PIB",
    website: "https://www.imgw.pl",
    space_mandate:
      "EUMETSAT representative. National meteorological service. Key Copernicus data user for flood monitoring (Vistula, Oder basins) and weather forecasting.",
    applicable_areas: ["environmental"],
  },
  {
    id: "PL-NASK",
    jurisdiction: "PL",
    name_en: "NASK — National Research Institute (CSIRT NASK)",
    name_local: "Naukowa i Akademicka Sieć Komputerowa — CSIRT NASK",
    abbreviation: "NASK",
    website: "https://www.nask.pl",
    space_mandate:
      "National CSIRT. NIS2 implementation pending — Poland missed October 2024 deadline. Space as critical sector once transposed. Amendment to National Cybersecurity System Act in parliamentary process.",
    applicable_areas: ["cybersecurity"],
  },
];

// ─── International Treaties (PL-specific entries, 4) ──────────────

const TREATIES_PL: LegalSource[] = [
  {
    id: "PL-OST-1967",
    jurisdiction: "PL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Poland Ratification Record",
    title_local:
      "Układ o zasadach działalności państw w zakresie badań i użytkowania przestrzeni kosmicznej",
    date_enacted: "1967-01-27",
    date_in_force: "1968-01-30",
    official_reference: "Dz.U. 1968, Nr 14, poz. 82",
    source_url:
      "https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU19680140082",
    issuing_body: "United Nations / Sejm",
    competent_authorities: ["PL-POLSA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Poland bears international responsibility for national space activities. Ratified 30 January 1968 — among the earliest parties (Interkosmos era). The Space Activities Act 2026 is Poland's first comprehensive implementation of Art. VI — 58 years after ratification.",
        complianceImplication:
          "Until April 2026, Poland had NO domestic authorization regime despite being bound since 1968. The new Act closes a 58-year implementation gap.",
      },
    ],
    related_sources: [
      "PL-SPACE-ACT-2026",
      "PL-LIABILITY-1973",
      "PL-REGISTRATION-1979",
    ],
    notes: [
      "Dz.U. 1968, Nr 14, poz. 82. Ratified 30 January 1968.",
      "Mirosław Hermaszewski (1978): first Pole in space, 4th nation overall.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "PL-LIABILITY-1973",
    jurisdiction: "PL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Poland Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1973-01-01",
    official_reference: "Dz.U. 1973, Nr 27, poz. 154",
    source_url: "https://isap.sejm.gov.pl",
    issuing_body: "United Nations / Sejm",
    competent_authorities: ["PL-POLSA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Poland is absolutely liable for surface damage. Space Act 2026 implements: strict liability for surface/aircraft damage (no force majeure defence), fault-based for space damage. Mandatory insurance up to €60M per event. State recourse against operator limited to insurance sum (unlimited for willful misconduct/gross negligence).",
        complianceImplication:
          "€60M insurance matches France/Austria/Finland. Recourse regime mirrors Austrian model. No court cases or precedents exist.",
      },
    ],
    related_sources: ["PL-OST-1967", "PL-SPACE-ACT-2026"],
    last_verified: "2026-04-15",
  },
  {
    id: "PL-REGISTRATION-1979",
    jurisdiction: "PL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Poland Ratification Record",
    date_enacted: "1975-01-14",
    date_in_force: "1979-01-01",
    official_reference: "Dz.U. 1979, poz. 22",
    source_url: "https://isap.sejm.gov.pl",
    issuing_body: "United Nations / Sejm",
    competent_authorities: ["PL-POLSA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Implemented through the Space Act 2026: POLSA maintains the National Register of Space Objects (Krajowy Rejestr Obiektów Kosmicznych). Registration within 30 days. 20+ Polish satellites have been in orbit since 2012.",
      },
    ],
    related_sources: ["PL-OST-1967", "PL-SPACE-ACT-2026"],
    last_verified: "2026-04-15",
  },
  {
    id: "PL-ARTEMIS-ACCORDS",
    jurisdiction: "PL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Poland Signatory (2021)",
    date_enacted: "2021-10-25",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["PL-POLSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Poland signed 25 October 2021 — 13th signatory and first Central European state. Minister Przemysław Czarnek signed at International Astronautical Congress in Dubai. Moon Agreement NOT ratified.",
      },
    ],
    related_sources: ["PL-OST-1967"],
    notes: [
      "13th signatory, 25 October 2021. First Central European signatory.",
    ],
    last_verified: "2026-04-15",
  },
];

// ─── Primary National Legislation (2) ───────────────────────────

const PRIMARY_LEGISLATION_PL: LegalSource[] = [
  {
    id: "PL-SPACE-ACT-2026",
    jurisdiction: "PL",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Activities Act 2026",
    title_local: "Ustawa z dnia 13 lutego 2026 r. o działalności kosmicznej",
    date_enacted: "2026-02-13",
    date_in_force: "2026-04-17",
    official_reference: "Dz.U. 2026, poz. 465",
    source_url: "https://isap.sejm.gov.pl",
    issuing_body: "Sejm Rzeczypospolitej Polskiej",
    competent_authorities: ["PL-POLSA", "PL-MFIG"],
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
        section: "Permits",
        title: "Comprehensive permit regime — POLSA as authority",
        summary:
          "Space activities require a permit from POLSA President. 6 conditions: operator reliability/expertise/financial capacity, risk assessment, debris mitigation, environmental protection, ITU compliance, insurance. Decision within 60 days (extendable). Permits valid up to 25 years. Special permits for consortiums.",
        complianceImplication:
          "POLSA can refuse, suspend, or revoke permits. ABW issues binding security opinions. Military activities EXEMPT (MON/ARGUS).",
      },
      {
        section: "Insurance",
        title: "Mandatory €60M insurance per event",
        summary:
          "Civil liability insurance covering operator and State Treasury liability. Maximum guarantee sum: PLN equivalent of €60M per event (~PLN 254M). POLSA President sets specific sum per permit based on risk. Insurance must be in effect 1 day before activity. Exemptions for science/education and military.",
        complianceImplication:
          "€60M matches France/Austria/Finland — among Europe's highest fixed thresholds.",
      },
      {
        section: "Liability",
        title: "Strict liability + State recourse",
        summary:
          "Strict (absolute) liability for surface/aircraft damage — force majeure NOT a defence. Fault-based for space damage. State recourse against operator limited to insurance sum. UNLIMITED recourse for willful misconduct (wina umyślna) or gross negligence (rażące niedbalstwo). Consortium members: joint and several liability.",
      },
      {
        section: "Registry",
        title: "National Register of Space Objects",
        summary:
          "Krajowy Rejestr Obiektów Kosmicznych maintained by POLSA. Registration within 30 days. Public access. Data transmitted to UN Secretary-General. 20+ Polish satellites registered.",
      },
      {
        section: "Debris",
        title: "Debris mitigation and sustainability",
        summary:
          "Operators must implement debris mitigation per international guidelines. End-of-life disposal plans required. Environmental impact assessment mandatory. Sustainability criteria in permit conditions.",
      },
      {
        section: "Penalties",
        title: "Administrative and criminal sanctions",
        summary:
          "Administrative fines for permit violations. Criminal sanctions for unauthorized activities. Implementing regulations (rozporządzenia) pending — expected Q3-Q4 2026.",
      },
    ],
    scope_description:
      "Poland's first comprehensive space act. Closes a 58-year gap between OST ratification (1968) and domestic implementation. POLSA as permit authority, €60M insurance, national registry, strict liability, debris mitigation. Military activities exempt (MON/ARGUS). Deliberately bifurcated civilian/military regime. 566 entities in Polish space ecosystem.",
    related_sources: [
      "PL-OST-1967",
      "PL-LIABILITY-1973",
      "PL-REGISTRATION-1979",
      "PL-POLSA-ACT-2014",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "Dz.U. 2026, poz. 465. Signed by President 3 March 2026. In force ~17 April 2026.",
      "Poland's FIRST comprehensive space act — 58 years after OST ratification.",
      "€731M at CM25 (+277%) — fastest ESA growth ever.",
      ">€1.2B military satellite procurement (POLEOS, MikroSAR, MIKROGLOB, PIAST).",
      "Implementing regulations pending — expected Q3-Q4 2026.",
      "Poland hosts IAC 2027 in Poznań.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "PL-POLSA-ACT-2014",
    jurisdiction: "PL",
    type: "federal_law",
    status: "in_force",
    title_en: "Act on the Polish Space Agency (POLSA)",
    title_local:
      "Ustawa z dnia 26 września 2014 r. o Polskiej Agencji Kosmicznej",
    date_enacted: "2014-09-26",
    date_last_amended: "2026-04-17",
    official_reference:
      "Dz.U. 2014, poz. 1533 (consolidated: Dz.U. 2020, poz. 1957)",
    source_url: "https://isap.sejm.gov.pl",
    issuing_body: "Sejm",
    competent_authorities: ["PL-POLSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "POLSA establishment and mandate",
        summary:
          "Established POLSA as a central government agency (agencja wykonawcza). Transformed by 2026 Space Act into permit-granting authority. POLSA Statute: Dz.U. 2025, poz. 1890 (effective 1 January 2026). HQ moved from Warsaw to Gdańsk in 2024. ~120 staff.",
      },
    ],
    related_sources: ["PL-SPACE-ACT-2026"],
    last_verified: "2026-04-15",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────

const TELECOM_PL: LegalSource[] = [
  {
    id: "PL-ECOMM-2024",
    jurisdiction: "PL",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Law",
    title_local: "Prawo komunikacji elektronicznej",
    date_enacted: "2024-07-12",
    official_reference: "Dz.U. 2024, poz. 1221",
    source_url: "https://isap.sejm.gov.pl",
    issuing_body: "Sejm",
    competent_authorities: ["PL-UKE"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Satellite spectrum management",
        summary:
          "New comprehensive telecom law. UKE manages satellite frequency allocation and ITU coordination. Satellite networks explicitly covered. Frequency permits for earth stations.",
      },
    ],
    related_sources: ["PL-SPACE-ACT-2026"],
    last_verified: "2026-04-15",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_PL: LegalSource[] = [
  {
    id: "PL-STRATEGIC-GOODS-2000",
    jurisdiction: "PL",
    type: "federal_law",
    status: "in_force",
    title_en: "Strategic Goods Trade Act",
    title_local:
      "Ustawa z dnia 29 listopada 2000 r. o obrocie z zagranicą towarami o znaczeniu strategicznym",
    date_enacted: "2000-11-29",
    date_last_amended: "2026-02-13",
    source_url: "https://isap.sejm.gov.pl",
    issuing_body: "Sejm",
    competent_authorities: ["PL-EXPORT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Space technology export control with Tracker 2.0",
        summary:
          "Controls dual-use and military goods exports. 2026 amendment introduces Tracker 2.0 digital licensing system. Poland member of all 5 export control regimes. Chaired HCoC 2017-2018. CAMILA/MIKROGLOB deliberately >90% Polish technology to minimize ITAR dependencies.",
        complianceImplication:
          "Polish space programmes deliberately minimize foreign export control exposure — strategic ITAR-avoidance through indigenous technology development.",
      },
    ],
    related_sources: ["PL-SPACE-ACT-2026"],
    last_verified: "2026-04-15",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_PL: LegalSource[] = [
  {
    id: "PL-SPACE-STRATEGY-2017",
    jurisdiction: "PL",
    type: "policy_document",
    status: "in_force",
    title_en: "Polish Space Strategy 2017-2030",
    title_local: "Polska Strategia Kosmiczna",
    date_published: "2017-01-26",
    official_reference: "Monitor Polski, 17 February 2017, No. 203",
    source_url: "https://polsa.gov.pl",
    issuing_body: "Rada Ministrów",
    competent_authorities: ["PL-POLSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "Three strategic goals — 3% European market target",
        summary:
          "Goals: increase competitiveness, develop satellite applications, enhance security through space. Target: 3% of European space revenues by 2030. Implementation problematic — National Space Programme never formally adopted. NIK audit found poor coordination. But CM25 (€731M, +277%) and Space Act 2026 represent transformative implementation. 566 entities in ecosystem, >700 ESA projects worth >€320M. Poland hosts IAC 2027.",
        complianceImplication:
          "€731M CM25 + >€1.2B military = >€2B total space commitments since 2022. Sławosz Uznański: 2nd Pole in space (June 2025, Axiom Ax-4).",
      },
    ],
    related_sources: ["PL-SPACE-ACT-2026"],
    last_verified: "2026-04-15",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_PL: LegalSource[] = [
  ...TREATIES_PL,
  ...PRIMARY_LEGISLATION_PL,
  ...TELECOM_PL,
  ...EXPORT_CONTROL_PL,
  ...POLICY_PL,
];
