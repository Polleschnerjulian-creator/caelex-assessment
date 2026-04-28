// src/data/legal-sources/sources/at.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Austria space law sources — complete legal framework for jurisdiction AT.
 *
 * Sources: ris.bka.gv.at, bmimi.gv.at, ffg.at
 * Last verified: 2026-04-14
 *
 * Notable: Weltraumgesetz (BGBl. I Nr. 132/2011) — one of Europe's most
 * complete space acts. €60M per-claim insurance minimum. ALL 5 UN treaties
 * ratified (Moon Agreement 1984 — 5th ratification, triggered entry into
 * force). Vienna = global capital of space governance (UNOOSA, COPUOS, ESPI,
 * CTBTO, Wassenaar, HCoC). ESA member since 1987. Artemis Accords 2024
 * (50th signatory). Constitutional neutrality + first military satellite 2026.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── AT Authorities (10) ──────────────────────────────────────────

export const AUTHORITIES_AT: Authority[] = [
  {
    id: "AT-BMIMI",
    jurisdiction: "AT",
    name_en: "Federal Ministry for Innovation, Mobility and Infrastructure",
    name_local: "Bundesministerium für Innovation, Mobilität und Infrastruktur",
    abbreviation: "BMIMI",
    website: "https://www.bmimi.gv.at",
    space_mandate:
      "Austria's space ministry and primary licensing authority under the Weltraumgesetz (§ 3). Renamed from BMK on 1 April 2025 (BGBl. I Nr. 10/2025). Minister: Peter Hanke (SPÖ). Space affairs in Directorate General III (Innovation and Technology), headed by Margit Mischkulnig. Administers national space object registry (§ 10), exercises supervisory powers (§ 13). Website states: 'Das BMIMI ist gleichzeitig auch Österreichs Weltraumministerium.'",
    legal_basis: "Weltraumgesetz (BGBl. I Nr. 132/2011)",
    applicable_areas: [
      "licensing",
      "registration",
      "insurance",
      "liability",
      "debris_mitigation",
    ],
  },
  {
    id: "AT-FFG",
    jurisdiction: "AT",
    name_en:
      "Austrian Research Promotion Agency — Aeronautics and Space Agency",
    name_local:
      "Österreichische Forschungsförderungsgesellschaft — Agentur für Luft- und Raumfahrt",
    abbreviation: "FFG/ALR",
    website: "https://www.ffg.at",
    space_mandate:
      "Austria's de facto national space agency. Founded September 2004 consolidating predecessors including the Austrian Space Agency (ASA, est. 1972). ALR headed by Dr. Andreas Geisler. Represents Austria in ESA bodies, manages ASAP programme (est. 2002), implements national space programme. 100% state-owned. Also serves as Austria's Constituting National Entity (CNE) for EU SST Partnership.",
    applicable_areas: ["licensing"],
  },
  {
    id: "AT-RTR",
    jurisdiction: "AT",
    name_en:
      "Austrian Regulatory Authority for Broadcasting and Telecommunications",
    name_local: "Rundfunk und Telekom Regulierungs-GmbH",
    abbreviation: "RTR",
    website: "https://www.rtr.at",
    space_mandate:
      "Satellite spectrum management under TKG 2021. Handles operational frequency assignments. Telekom-Control-Kommission (TKK) conducts spectrum auctions. Weltraumgesetz § 4(1)(6) requires ITU compliance as authorization condition, creating coordination mechanism between BMIMI and RTR/TKK.",
    legal_basis: "TKG 2021 (BGBl. I Nr. 190/2021)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "AT-BMEIA",
    jurisdiction: "AT",
    name_en: "Federal Ministry for European and International Affairs",
    name_local:
      "Bundesministerium für europäische und internationale Angelegenheiten",
    abbreviation: "BMEIA",
    website: "https://www.bmeia.gv.at",
    space_mandate:
      "Represents Austria at COPUOS. Manages the HCoC executive secretariat (www.hcoc.at). Communicates space object registration data to UN Secretary-General (§ 10). Provides opinions on foreign policy/international law for authorization decisions (§ 17).",
    applicable_areas: ["licensing", "export_control"],
  },
  {
    id: "AT-BMWET",
    jurisdiction: "AT",
    name_en: "Federal Ministry of Economy — Export Control Department",
    name_local: "Bundesministerium für Wirtschaft — Abteilung V/2",
    abbreviation: "BMWET",
    website: "https://www.bmaw.gv.at",
    space_mandate:
      "Export control authority for dual-use space technology under Außenwirtschaftsgesetz 2011 (BGBl. I Nr. 26/2011). Licenses administered through PAWA electronic portal. Austria is member of ALL 5 export control regimes (Wassenaar, MTCR, NSG, Australia Group, CWC). Chaired MTCR 2020-2021.",
    legal_basis: "Außenwirtschaftsgesetz 2011 (BGBl. I Nr. 26/2011)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "AT-BMLV",
    jurisdiction: "AT",
    name_en: "Federal Ministry of Defence",
    name_local: "Bundesministerium für Landesverteidigung",
    abbreviation: "BMLV",
    website: "https://www.bundesheer.at",
    space_mandate:
      "Military space policy. No dedicated space command (constitutional neutrality). Bundesheer operates 'Goldhaube' air defence radar (since 1988). First military satellite commissioned March 2026 (GATE Space). Published Austrian Military Space Strategy 2035+. Provides national security opinions for authorization decisions (§ 17).",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "AT-DSB",
    jurisdiction: "AT",
    name_en: "Austrian Data Protection Authority",
    name_local: "Datenschutzbehörde",
    abbreviation: "DSB",
    website: "https://www.dsb.gv.at",
    space_mandate:
      "GDPR supervision of satellite-derived personal data. Austrian DSG § 1 uniquely carries constitutional law force and extends data protection to legal persons (not just natural persons).",
    legal_basis: "DSG (BGBl. I Nr. 165/1999); GDPR",
    applicable_areas: ["data_security"],
  },
  {
    id: "AT-BMI",
    jurisdiction: "AT",
    name_en: "Federal Ministry of the Interior",
    name_local: "Bundesministerium für Inneres",
    abbreviation: "BMI",
    website: "https://www.bmi.gv.at",
    space_mandate:
      "Public safety assessment for space authorization decisions (§ 17). Security authorities cooperate in operator reliability verification and may process personal data (§ 13, GDPR-adapted 2018).",
    applicable_areas: ["licensing"],
  },
  {
    id: "AT-AUSTROSPACE",
    jurisdiction: "AT",
    name_en: "AUSTROSPACE — Austrian Space Industries",
    name_local: "AUSTROSPACE",
    abbreviation: "AUSTROSPACE",
    website: "https://www.austrospace.at",
    space_mandate:
      "Industry association founded February 1991. ~19-20 member companies and research institutions. Represents Austrian space industry interests. 120+ organisations active in sector, ~€125M turnover, ~1,000 direct employees.",
    applicable_areas: ["licensing"],
  },
  {
    id: "AT-NPOC",
    jurisdiction: "AT",
    name_en: "NPOC Space Law Austria — University of Vienna",
    name_local: "National Point of Contact für Weltraumrecht Österreich",
    abbreviation: "NPOC",
    website: "https://spacelaw.univie.ac.at",
    space_mandate:
      "Founded 2001 by Prof. Christian Brünner (Graz). Directed by Prof. Irmgard Marboe (Vienna) who chaired COPUOS Working Group on National Space Legislation (2008-2013, producing UNGA Res. 68/74). Network of Subpoints at 6 Austrian universities. Austria chaired COPUOS for 34 years (1962-1996).",
    applicable_areas: ["licensing"],
  },
];

// ─── International Treaties (AT-specific entries, 5) ──────────────

const TREATIES_AT: LegalSource[] = [
  {
    id: "AT-OST-1967",
    jurisdiction: "AT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Austria Ratification Record",
    title_local: "Weltraumvertrag — Österreichische Ratifizierung",
    date_enacted: "1967-01-27",
    date_in_force: "1968-01-01",
    official_reference: "BGBl. Nr. 103/1968",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "United Nations / Nationalrat",
    competent_authorities: ["AT-BMEIA", "AT-BMIMI"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Austria bears international responsibility for national space activities. The Weltraumgesetz (2011) comprehensively implements Art. VI with an 8-condition authorization regime, mandatory €60M insurance, and forced-transfer enforcement.",
        complianceImplication:
          "Austria's implementation of Art. VI is among Europe's most thorough — 8 conditions, 6-month decision deadline, €60M insurance, §7 forced-transfer mechanism.",
      },
    ],
    related_sources: [
      "AT-WELTRAUMGESETZ-2011",
      "AT-LIABILITY-1980",
      "AT-REGISTRATION-1980",
      "AT-MOON-1984",
    ],
    notes: [
      "BGBl. Nr. 103/1968. Ratified 1968.",
      "Austria chaired COPUOS for 34 years (1962-1996) during which all 5 UN treaties were adopted.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "AT-LIABILITY-1980",
    jurisdiction: "AT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Austria Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1980-01-01",
    official_reference: "BGBl. Nr. 162/1980",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "United Nations / Nationalrat",
    competent_authorities: ["AT-BMEIA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Austria is absolutely liable for surface damage. Weltraumgesetz § 11 implements recourse: capped at insured amount (min €60M) for surface/aircraft damage, but UNLIMITED when operator is at fault or violated authorization requirements. No government backstop.",
        complianceImplication:
          "Explicitly referenced in Weltraumgesetz § 11. Unlike France/US, Austria provides NO government indemnity above the insurance threshold.",
      },
    ],
    related_sources: ["AT-OST-1967", "AT-WELTRAUMGESETZ-2011"],
    notes: [
      "BGBl. Nr. 162/1980. Explicitly referenced in Weltraumgesetz § 11.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "AT-REGISTRATION-1980",
    jurisdiction: "AT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Austria Ratification Record",
    date_enacted: "1975-01-14",
    date_in_force: "1980-01-01",
    official_reference: "BGBl. Nr. 163/1980",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "United Nations / Nationalrat",
    competent_authorities: ["AT-BMIMI"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Implemented through Weltraumgesetz §§ 9-10. Registry exceeds Convention minimum — includes manufacturer, owner, operator (items 6-8) beyond the required 5 data points. Registered: TUGSAT-1/BRITE-Austria, UniBRITE, PEGASUS, OPS-SAT, PRETTY.",
      },
    ],
    related_sources: ["AT-OST-1967", "AT-WELTRAUMGESETZ-2011"],
    notes: ["BGBl. Nr. 163/1980. Explicitly referenced in Weltraumgesetz § 9."],
    last_verified: "2026-04-14",
  },
  {
    id: "AT-MOON-1984",
    jurisdiction: "AT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Moon Agreement — Austria Ratification Record",
    date_enacted: "1979-12-18",
    date_in_force: "1984-07-11",
    official_reference: "BGBl. Nr. 286/1984",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "United Nations / Nationalrat",
    competent_authorities: ["AT-BMEIA"],
    relevance_level: "high",
    applicable_to: ["space_resource_operator", "all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 11",
        title: "Common heritage of mankind",
        summary:
          "Austria's 1984 ratification was the FIFTH — directly triggering the Moon Agreement's entry into force on 11 July 1984. Austria is bound by the common heritage principle. One of fewer than 20 parties globally.",
        complianceImplication:
          "Austria signed the Artemis Accords (December 2024) despite being party to the Moon Agreement — joining Belgium and the Netherlands in this dual-framework position.",
      },
    ],
    related_sources: ["AT-OST-1967", "AT-ARTEMIS-ACCORDS"],
    notes: [
      "BGBl. Nr. 286/1984. Austria's ratification was the 5th — triggering the Moon Agreement's entry into force.",
      "One of fewer than 20 parties globally.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "AT-ARTEMIS-ACCORDS",
    jurisdiction: "AT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Austria Signatory (2024)",
    date_enacted: "2024-12-11",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["AT-BMEIA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Austria signed 11 December 2024 at NASA HQ — 50th signatory. Ambassador Petra Schneebauer signed. Austria is simultaneously party to the Moon Agreement (common heritage) AND the Artemis Accords (permissive extraction) — alongside Belgium and Netherlands.",
      },
    ],
    related_sources: ["AT-OST-1967", "AT-MOON-1984"],
    notes: [
      "50th signatory, 11 December 2024 at NASA Headquarters.",
      "Dual Moon Agreement / Artemis Accords position — pragmatic multilateralism.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Primary National Legislation (2) ───────────────────────────

const PRIMARY_LEGISLATION_AT: LegalSource[] = [
  {
    id: "AT-WELTRAUMGESETZ-2011",
    jurisdiction: "AT",
    type: "federal_law",
    status: "in_force",
    title_en: "Austrian Outer Space Act (Weltraumgesetz)",
    title_local:
      "Bundesgesetz über die Genehmigung von Weltraumaktivitäten und die Einrichtung eines Weltraumregisters (Weltraumgesetz)",
    date_enacted: "2011-12-06",
    date_in_force: "2011-12-28",
    date_last_amended: "2018-05-25",
    official_reference: "BGBl. I Nr. 132/2011 (amended BGBl. I Nr. 37/2018)",
    source_url:
      "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007555",
    issuing_body: "Nationalrat (unanimous)",
    competent_authorities: ["AT-BMIMI"],
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
        section: "§ 3",
        title: "Authorization requirement",
        summary:
          "All space activities require prior BMIMI authorization. No space activity may be conducted without approval.",
      },
      {
        section: "§ 4",
        title: "Eight cumulative authorization conditions",
        summary:
          "Operator must satisfy: (1) reliability/capability/expertise, (2) no threat to public order/safety/health, (3) no conflict with security/international law/foreign policy, (4) debris mitigation per § 5, (5) no harmful contamination/adverse environmental changes, (6) ITU compliance, (7) €60M insurance per § 4(4), (8) orderly termination provision. Minister decides within 6 months.",
        complianceImplication:
          "One of Europe's most detailed statutory licensing regimes — 8 conditions with 6-month decision deadline.",
      },
      {
        section: "§ 4(4)",
        title: "€60M per-claim mandatory insurance",
        summary:
          "Minimum €60,000,000 per insurance claim with run-off liability that may not be excluded. For science/research/education activities, the Minister may set a lower amount or waive insurance entirely. The Federal State is exempt when acting as operator.",
        complianceImplication:
          "Among Europe's highest fixed insurance thresholds (matching France). The academic waiver enabled TUGSAT-1, UniBRITE, and PEGASUS missions.",
      },
      {
        section: "§ 5",
        title: "Debris mitigation — state of the art",
        summary:
          "Operators must implement debris mitigation per 'state of the art' and 'internationally recognised guidelines' (IADC, COPUOS, ESA). Weltraumverordnung specifies four IADC categories.",
      },
      {
        section: "§ 7(3)",
        title: "Forced transfer of control",
        summary:
          "If an operator fails to comply with revocation, control over the space activity SHALL be conferred to another operator by administrative decision. A distinctive enforcement mechanism ensuring continuity of state supervision.",
        complianceImplication:
          "Unique in European space law — the state can forcibly transfer operational control to a replacement operator.",
      },
      {
        section: "§ 11",
        title: "Recourse — €60M cap with fault override",
        summary:
          "State right of recourse against operator after paying Liability Convention claims. Capped at insured amount (min €60M) for surface/aircraft damage. Cap does NOT apply if damage results from operator fault or if operator violated §§ 3/4. No government backstop.",
        complianceImplication:
          "Compliant operators: €60M ceiling. Non-compliant or at-fault operators: UNLIMITED recourse. No French/US-style government indemnity.",
      },
      {
        section: "§ 14",
        title: "Administrative fines — up to €100,000",
        summary:
          "Up to €100,000 for violations. Minimum €20,000 for unauthorized space activities (no § 3 authorization). Administrative (not criminal) sanctions.",
      },
    ],
    scope_description:
      "One of Europe's most complete national space acts. 18 sections. Enacted unanimously 6 December 2011. Key innovations: €60M per-claim insurance with academic waiver, 8 cumulative licensing conditions, forced-transfer enforcement mechanism (§ 7(3)), registry exceeding Registration Convention minimum. Only amendment: BGBl. I Nr. 37/2018 (GDPR terminology in § 13(3)). PEGASUS (June 2017) was first satellite fully authorized under complete Act + Verordnung framework.",
    related_sources: [
      "AT-OST-1967",
      "AT-LIABILITY-1980",
      "AT-REGISTRATION-1980",
      "AT-WELTRAUMVERORDNUNG-2015",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "BGBl. I Nr. 132/2011. Enacted unanimously. 18 sections (not 21 as sometimes cited).",
      "Only amendment: BGBl. I Nr. 37/2018 (GDPR: § 13(3) 'verwenden' → 'verarbeiten').",
      "PEGASUS (June 2017): first satellite fully authorized under Act + Verordnung.",
      "€60M insurance matches France; higher than Belgium's 10% turnover approach.",
      "§ 7(3) forced transfer: unique enforcement mechanism in European space law.",
      "Academic waiver (§ 4(4)): enabled TUGSAT-1, UniBRITE, PEGASUS without prohibitive costs.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "AT-WELTRAUMVERORDNUNG-2015",
    jurisdiction: "AT",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Activities Regulation (Weltraumverordnung)",
    title_local: "Weltraumverordnung",
    date_enacted: "2015-02-26",
    date_in_force: "2015-02-27",
    date_last_amended: "2018-05-25",
    official_reference: "BGBl. II Nr. 36/2015 (amended BGBl. II Nr. 90/2018)",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "Bundesminister für Verkehr, Innovation und Technologie",
    competent_authorities: ["AT-BMIMI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "insurance", "debris_mitigation"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Detailed application and debris requirements",
        summary:
          "Operationalizes Weltraumgesetz: documentation for authorization (reliability evidence with security checks, safety assessments, debris reports covering all 4 IADC categories, ITU compliance, insurance docs, emergency plans). Procedural fee: €6,500. Expert review costs borne by operator.",
        complianceImplication:
          "Four IADC debris categories: operational debris avoidance, on-orbit break-up prevention, collision avoidance, end-of-life removal.",
      },
    ],
    related_sources: ["AT-WELTRAUMGESETZ-2011"],
    notes: [
      "BGBl. II Nr. 36/2015. Amended BGBl. II Nr. 90/2018 (GDPR).",
      "NOT an amendment to the Weltraumgesetz — it is the implementing regulation.",
      "Authorization fee: €6,500.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_AT: LegalSource[] = [
  {
    id: "AT-AUSSENWIRTSCHAFTSGESETZ-2011",
    jurisdiction: "AT",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Trade Act (Außenwirtschaftsgesetz 2011)",
    title_local: "Außenwirtschaftsgesetz 2011",
    date_enacted: "2011-10-01",
    date_last_amended: "2020-01-01",
    official_reference:
      "BGBl. I Nr. 26/2011 (amended through BGBl. I Nr. 87/2020)",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "Nationalrat",
    competent_authorities: ["AT-BMWET"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "National dual-use export control framework",
        summary:
          "Complements EU Regulation 2021/821. Individual authorizations (§ 3), global authorizations (§ 17). End-user statements mandatory. Criminal penalties §§ 79-88. Space technology: Category 9 (Aerospace/Propulsion), Categories 3/5/7. Licenses via PAWA electronic portal. Austria member of ALL 5 export control regimes.",
        complianceImplication:
          "Austria chaired MTCR 2020-2021. Member of Wassenaar (secretariat in Vienna), MTCR, NSG, Australia Group, CWC.",
      },
    ],
    related_sources: ["AT-WELTRAUMGESETZ-2011"],
    last_verified: "2026-04-14",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────

const TELECOM_AT: LegalSource[] = [
  {
    id: "AT-TKG-2021",
    jurisdiction: "AT",
    type: "federal_law",
    status: "in_force",
    title_en: "Telecommunications Act 2021 (TKG 2021)",
    title_local: "Telekommunikationsgesetz 2021",
    date_enacted: "2021-11-01",
    date_last_amended: "2025-01-01",
    official_reference:
      "BGBl. I Nr. 190/2021 (amended through BGBl. I Nr. 91/2025)",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "Nationalrat",
    competent_authorities: ["AT-RTR"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "§ 4 / §§ 10-19",
        title: "Satellite spectrum management",
        summary:
          "§ 4 explicitly includes satellite networks (Satellitennetze). §§ 10-19 establish frequency allocation. Operators need BOTH Weltraumgesetz authorization (BMIMI) AND TKG frequency assignments (RTR/TKK). Frequenznutzungsverordnung 2013 allocates satellite bands.",
      },
    ],
    related_sources: ["AT-WELTRAUMGESETZ-2011"],
    notes: [
      "BGBl. I Nr. 190/2021. Amended 7 times through BGBl. I Nr. 91/2025.",
      "Implements EU Electronic Communications Code (Directive 2018/1972).",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────

const CYBERSECURITY_AT: LegalSource[] = [
  {
    id: "AT-NISG-2026",
    jurisdiction: "AT",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "NISG 2026 — Network and Information System Security Act (NIS2 Transposition)",
    title_local: "Netz- und Informationssystemsicherheitsgesetz 2026",
    date_published: "2025-11-20",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "Nationalrat",
    competent_authorities: ["AT-BMIMI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full bill",
        title: "NIS2 transposition — space as critical sector",
        summary:
          "Austria MISSED the 17 October 2024 deadline. Nationalrat rejected NISG 2024 on 3 July 2024. Revised NISG 2026 approved by Council of Ministers 20 November 2025, submitted as Bill 308 d.B. Penalties: up to €10M or 2% worldwide turnover for essential entities (including space operators). EC reasoned opinion 7 May 2025. NISG 2018 remains as interim.",
        complianceImplication:
          "Space operators in Austria must prepare for NIS2 obligations. The NISG 2018 (outdated) applies in the interim.",
      },
    ],
    related_sources: ["AT-WELTRAUMGESETZ-2011"],
    notes: [
      "Nationalrat rejected first attempt (NISG 2024) on 3 July 2024.",
      "NISG 2026 submitted as Bill 308 d.B. — parliamentary processing ongoing.",
      "EC reasoned opinion issued 7 May 2025.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Data Protection (1) ────────────────────────────────────────

const DATA_PROTECTION_AT: LegalSource[] = [
  {
    id: "AT-DSG",
    jurisdiction: "AT",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Protection Act (Datenschutzgesetz)",
    title_local: "Datenschutzgesetz",
    date_enacted: "1999-08-17",
    date_last_amended: "2018-05-25",
    official_reference: "BGBl. I Nr. 165/1999 (GDPR-adapted 2018)",
    source_url: "https://www.ris.bka.gv.at",
    issuing_body: "Nationalrat",
    competent_authorities: ["AT-DSB"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator", "all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Constitutional data protection — extends to legal persons",
        summary:
          "Uniquely, § 1 DSG carries the force of CONSTITUTIONAL LAW and extends data protection rights to legal persons — not just natural persons. Datenschutzbehörde (DSB) supervises GDPR compliance for satellite-derived data.",
        complianceImplication:
          "Austrian data protection is constitutionally entrenched — stronger than most EU member states. Relevant as satellite resolution increases and EO data may constitute personal data.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-14",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_AT: LegalSource[] = [
  {
    id: "AT-SPACE-STRATEGY-2030",
    jurisdiction: "AT",
    type: "policy_document",
    status: "in_force",
    title_en: "Austrian Space Strategy 2030+ — People, Climate and Economy",
    title_local: "Österreichische Weltraumstrategie 2030+",
    date_published: "2021-01-01",
    source_url: "https://www.bmimi.gv.at",
    issuing_body: "BMK (now BMIMI)",
    competent_authorities: ["AT-BMIMI", "AT-FFG"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "Space is for EVERYONE",
        summary:
          "Priorities: sustainability pioneer, space data integration, scientific excellence, commercial growth, space traffic management, education. CM25 commitment: €336M (48% increase over CM22 €227M). ~€70M annual ESA contribution, ~90% georeturn. Complemented by Austrian Military Space Strategy 2035+ (BMLV).",
        complianceImplication:
          "120+ organisations active, ~€125M turnover. €336M at CM25 signals sustained investment growth.",
      },
    ],
    related_sources: ["AT-WELTRAUMGESETZ-2011"],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_AT: LegalSource[] = [
  ...TREATIES_AT,
  ...PRIMARY_LEGISLATION_AT,
  ...EXPORT_CONTROL_AT,
  ...TELECOM_AT,
  ...CYBERSECURITY_AT,
  ...DATA_PROTECTION_AT,
  ...POLICY_AT,
];
