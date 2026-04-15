// src/data/legal-sources/sources/cz.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Czech Republic space law sources — complete legal framework for jurisdiction CZ.
 *
 * Sources: czechspaceportal.cz, zakonyprolidi.cz, nukib.cz
 * Last verified: 2026-04-15
 *
 * Notable: NO national space act despite hosting EUSPA in Prague and full
 * ESA membership since 2008. Birthplace of space law scholarship (Vladimír
 * Mandl, 1932). Treaties inherited via Czechoslovak succession (1993).
 * Space activities regulated through government resolutions + Civil Code
 * §2925 strict liability. SATurnin-1 defence satellite January 2025.
 * Work on a space act began 2018 — stalled indefinitely.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── CZ Authorities (9) ───────────────────────────────────────────

export const AUTHORITIES_CZ: Authority[] = [
  {
    id: "CZ-MOT",
    jurisdiction: "CZ",
    name_en: "Ministry of Transport — Czech Space Agency (Dept. 710)",
    name_local: "Ministerstvo dopravy — Oddělení kosmických aktivit",
    abbreviation: "MD/CSA",
    website: "https://www.czechspaceportal.cz",
    space_mandate:
      "Primary coordinator of Czech space activities since Government Resolution 282/2011. Led by Dr. Václav Kobera. ESA delegate ministry, pays ~€46M/year to ESA industry programmes, maintains National Register of Space Objects (since Resolution 326/2014), represents CZ at EU Space Programme Committee. Chairs Coordination Council for Space Activities (7 government members). Constituting National Entity for EU SST.",
    legal_basis: "Government Resolution No. 282/2011",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "CZ-CTU",
    jurisdiction: "CZ",
    name_en: "Czech Telecommunication Office",
    name_local: "Český telekomunikační úřad",
    abbreviation: "ČTÚ",
    website: "https://www.ctu.cz",
    space_mandate:
      "National regulatory authority for electronic communications under Act 127/2005 Sb. Manages radio spectrum including satellite, issues individual authorizations for satellite earth stations (VSAT, SNG), publishes Radio Spectrum Utilisation Plan, coordinates ITU satellite filings and orbital slots. New 10-year Radio Spectrum Management Strategy approved May 2025.",
    legal_basis: "Zákon č. 127/2005 Sb.",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "CZ-MPO",
    jurisdiction: "CZ",
    name_en: "Ministry of Industry and Trade — Export Control",
    name_local: "Ministerstvo průmyslu a obchodu",
    abbreviation: "MPO",
    website: "https://www.mpo.cz",
    space_mandate:
      "Export control for dual-use space technology under Act 594/2004 Sb. Licensing Administration Department, Division of International Control Regimes. Issues authorizations through ELIS electronic system. Member of all 4 export control regimes (Wassenaar, MTCR, NSG, Australia Group).",
    legal_basis: "Zákon č. 594/2004 Sb.",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "CZ-MOD",
    jurisdiction: "CZ",
    name_en: "Ministry of Defence — CZE SATCEN",
    name_local: "Ministerstvo obrany — CZE SATCEN",
    abbreviation: "MO",
    website: "https://www.army.cz",
    space_mandate:
      "Military space activities. CZE SATCEN (National Satellite Centre, founded 2018 within Military Intelligence). Commissioned SATurnin-1 — Czech's largest defence satellite, launched January 2025 (SpaceX Falcon 9, Transporter-12). 14 kg, high-res telescope, onboard AI, 100 images/day. Built entirely by VZLU Aerospace without foreign technology. AMBIC follow-on programme under development.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "CZ-NUKIB",
    jurisdiction: "CZ",
    name_en: "National Cyber and Information Security Agency",
    name_local: "Národní úřad pro kybernetickou a informační bezpečnost",
    abbreviation: "NÚKIB",
    website: "https://www.nukib.cz",
    space_mandate:
      "NIS2 national competent authority under Cybersecurity Act 264/2025 Sb. (adopted 26 June 2025, in force 1 November 2025). Space transport as high-criticality sector. Can classify space entities as essential or important. Led by Lukáš Kintr.",
    legal_basis: "Zákon č. 264/2025 Sb.",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "CZ-MFA",
    jurisdiction: "CZ",
    name_en: "Ministry of Foreign Affairs",
    name_local: "Ministerstvo zahraničních věcí",
    abbreviation: "MZV",
    website: "https://www.mzv.cz",
    space_mandate:
      "International space treaty matters, COPUOS representation, export control foreign policy opinions. Co-initiated first international compendium of space debris mitigation standards (with Canada and Germany, approved COPUOS 2014). Prof. Kopal chaired COPUOS Legal Subcommittee (1999-2004, 2008-2010). Signed Artemis Accords (May 2023, 24th signatory).",
    applicable_areas: ["licensing", "export_control"],
  },
  {
    id: "CZ-MSMT",
    jurisdiction: "CZ",
    name_en: "Ministry of Education, Youth and Sports",
    name_local: "Ministerstvo školství, mládeže a tělovýchovy",
    abbreviation: "MŠMT",
    website: "https://www.msmt.cz",
    space_mandate:
      "Contributes ~€14.2M/year to ESA R&D and mandatory programmes (PRODEX, Science Programme). Originally responsible for ESA relations before 2011 transfer to Ministry of Transport.",
    applicable_areas: ["licensing"],
  },
  {
    id: "CZ-UOOU",
    jurisdiction: "CZ",
    name_en: "Office for Personal Data Protection",
    name_local: "Úřad pro ochranu osobních údajů",
    abbreviation: "ÚOOÚ",
    website: "https://www.uoou.cz",
    space_mandate:
      "GDPR enforcement under Act 110/2019 Sb. for satellite data processing, Earth observation imagery, and space-based data services.",
    legal_basis: "Zákon č. 110/2019 Sb.",
    applicable_areas: ["data_security"],
  },
  {
    id: "CZ-COORD-COUNCIL",
    jurisdiction: "CZ",
    name_en: "Coordination Council for Space Activities",
    name_local: "Koordinační rada pro kosmické aktivity",
    abbreviation: "KRKA",
    website: "https://www.czechspaceportal.cz",
    space_mandate:
      "Cross-ministerial coordination body established by Government Resolution 282/2011. Chaired by Ministry of Transport. 7 government members + additional participants (Finance, ČTÚ, NÚKIB, NBÚ, GAČR, TAČR, CzechInvest). Three committees: Industry & Applications, Science Activities, Security & International Relations.",
    applicable_areas: ["licensing"],
  },
];

// ─── International Treaties (CZ-specific entries, 4) ──────────────
// NOTE: Inherited via Czechoslovak succession (1 January 1993)

const TREATIES_CZ: LegalSource[] = [
  {
    id: "CZ-OST-1967",
    jurisdiction: "CZ",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Czech Republic (Czechoslovak Succession)",
    title_local:
      "Smlouva o zásadách činnosti států při průzkumu a využívání kosmického prostoru",
    date_enacted: "1967-01-27",
    date_in_force: "1993-01-01",
    official_reference: "Vyhláška č. 40/1968 Sb. (succession 1 Jan 1993)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations (Czechoslovak succession)",
    competent_authorities: ["CZ-MFA", "CZ-MOT"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Czech Republic bears international responsibility for national space activities via Czechoslovak succession. However, NO domestic authorization regime exists — a 'právní vakuum' (legal vacuum). Work on a national space act began 2018 but has stalled indefinitely.",
        complianceImplication:
          "The Czech Republic CANNOT currently fulfil Art. VI's requirement to 'authorize and continuously supervise' private space activities. No licensing regime, no dedicated space authority with enforcement powers.",
      },
    ],
    related_sources: [
      "CZ-LIABILITY-1977",
      "CZ-REGISTRATION-1978",
      "CZ-GOV-RES-282-2011",
    ],
    notes: [
      "Czechoslovakia signed 27 Jan 1967, ratified 22 May 1967 (among first parties).",
      "Czech Republic succeeded 1 January 1993.",
      "Vladimír Mandl (Czech, 1932): world's first space law treatise, 25 years before Sputnik.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "CZ-LIABILITY-1977",
    jurisdiction: "CZ",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Czech Republic (Czechoslovak Succession)",
    date_enacted: "1972-03-29",
    date_in_force: "1993-01-01",
    official_reference: "Vyhláška č. 58/1977 Sb. (succession 1 Jan 1993)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations (Czechoslovak succession)",
    competent_authorities: ["CZ-MFA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Czech Republic is absolutely liable for surface damage. NO specific space liability or insurance framework exists domestically. Civil Code §2925 (strict liability for 'especially dangerous operations') likely applies by analogy. NO mandatory insurance, NO recourse cap, NO government backstop.",
        complianceImplication:
          "If a Czech satellite causes damage abroad, the state is internationally liable with unlimited recourse against the operator under general civil law — severe risk exposure for private operators.",
      },
    ],
    related_sources: ["CZ-OST-1967", "CZ-CIVIL-CODE-2012"],
    notes: [
      "Czechoslovakia signed 29 Mar 1972, ratified 8 Sep 1976.",
      "Czech Republic succeeded 1 January 1993.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "CZ-REGISTRATION-1978",
    jurisdiction: "CZ",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Registration Convention — Czech Republic (Czechoslovak Succession)",
    date_enacted: "1975-01-14",
    date_in_force: "1993-01-01",
    official_reference: "č. 130/1978 Sb. (succession 1 Jan 1993)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations (Czechoslovak succession)",
    competent_authorities: ["CZ-MOT"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry — via government resolution, not legislation",
        summary:
          "National Register of Space Objects established by Government Resolution 326/2014 (not statute). Maintained by Ministry of Transport. 13+ objects registered including MAGION 1-5 (Czechoslovak-era), VZLUSAT series, SATurnin-1. Registry has changed hands 4 times since 1979. No statutory penalties for non-registration.",
      },
    ],
    related_sources: ["CZ-OST-1967", "CZ-GOV-RES-326-2014"],
    notes: [
      "Czechoslovakia signed 5 Apr 1976, ratified.",
      "Czech Republic succeeded 1 January 1993.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "CZ-ARTEMIS-ACCORDS",
    jurisdiction: "CZ",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Czech Republic Signatory (2023)",
    date_enacted: "2023-05-03",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["CZ-MFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Czech Republic signed 3 May 2023 — 24th signatory. Foreign Minister Lipavský signed at NASA HQ. Moon Agreement NOT ratified. Czech companies supply radiation/pressure sensors for Lunar Gateway.",
      },
    ],
    related_sources: ["CZ-OST-1967"],
    notes: ["24th signatory, 3 May 2023."],
    last_verified: "2026-04-15",
  },
];

// ─── No Primary Space Legislation — government resolutions + applicable laws (3) ──

const APPLICABLE_LEGISLATION_CZ: LegalSource[] = [
  {
    id: "CZ-GOV-RES-282-2011",
    jurisdiction: "CZ",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Government Resolution No. 282/2011 — Space Activity Coordination",
    title_local: "Usnesení vlády č. 282 ze dne 20. dubna 2011",
    date_enacted: "2011-04-20",
    source_url: "https://www.czechspaceportal.cz",
    issuing_body: "Vláda České republiky",
    competent_authorities: ["CZ-MOT", "CZ-COORD-COUNCIL"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Ministry of Transport as space coordinator",
        summary:
          "THE most important administrative instrument governing Czech space governance. Designated Ministry of Transport as main coordinator. Established Coordination Council for Space Activities. This is a government resolution (usnesení), NOT legislation — lacks the force of law and cannot create licensing obligations or penalties.",
        complianceImplication:
          "Government resolutions cannot substitute for a national space act — they cannot impose mandatory licensing, insurance requirements, or penalties. Constitutional principle of legality (Art. 2(3)) requires state power in cases set by law.",
      },
    ],
    related_sources: ["CZ-OST-1967", "CZ-GOV-RES-326-2014"],
    notes: [
      "Single most important Czech space governance instrument — but not legislation.",
      "Cannot create enforceable licensing or insurance obligations.",
    ],
    last_verified: "2026-04-15",
  },
  {
    id: "CZ-GOV-RES-326-2014",
    jurisdiction: "CZ",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Government Resolution No. 326/2014 — National Space Object Registry",
    title_local: "Usnesení vlády č. 326 ze dne 5. května 2014",
    date_enacted: "2014-05-05",
    source_url: "https://www.czechspaceportal.cz",
    issuing_body: "Vláda České republiky",
    competent_authorities: ["CZ-MOT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Full instrument",
        title:
          "National Register of Space Objects (by resolution, not statute)",
        summary:
          "Established the Czech National Register, transferred to Ministry of Transport. 13+ objects registered. Registry has changed hands 4 times (Academy 1979 → Atmospheric Physics 1996 → CSO 2009 → Ministry 2014). No statutory penalties for non-registration — compliance relies on administrative cooperation.",
      },
    ],
    related_sources: ["CZ-REGISTRATION-1978", "CZ-GOV-RES-282-2011"],
    last_verified: "2026-04-15",
  },
  {
    id: "CZ-CIVIL-CODE-2012",
    jurisdiction: "CZ",
    type: "federal_law",
    status: "in_force",
    title_en: "Civil Code — §2925 Strict Liability for Dangerous Operations",
    title_local: "Zákon č. 89/2012 Sb., občanský zákoník",
    date_enacted: "2012-02-03",
    date_in_force: "2014-01-01",
    official_reference: "89/2012 Sb.",
    source_url: "https://www.zakonyprolidi.cz/cs/2012-89",
    issuing_body: "Parlament České republiky",
    competent_authorities: ["CZ-MFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["liability"],
    key_provisions: [
      {
        section: "§ 2925",
        title: "Strict liability for especially dangerous operations",
        summary:
          "Imposes strict (no-fault) liability for 'provoz zvlášť nebezpečný' (especially dangerous operations) — where serious damage cannot be excluded even with due care. Academic analysis (Gajda, Masaryk University, 2026) argues convincingly that space activities qualify. This is the ONLY domestic liability basis for Czech space operations.",
        complianceImplication:
          "Without a space act, §2925 is the sole domestic strict liability mechanism. No insurance mandate, no recourse cap — unlimited exposure for private operators.",
      },
    ],
    related_sources: ["CZ-LIABILITY-1977"],
    notes: [
      "89/2012 Sb. In force 1 January 2014.",
      "§2925 = Czech space operators' primary domestic liability exposure.",
    ],
    last_verified: "2026-04-15",
  },
];

// ─── Cybersecurity (1) ──────────────────────────────────────────

const CYBERSECURITY_CZ: LegalSource[] = [
  {
    id: "CZ-NIS2-2025",
    jurisdiction: "CZ",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Act (NIS2 Transposition)",
    title_local: "Zákon č. 264/2025 Sb., o kybernetické bezpečnosti",
    date_enacted: "2025-06-26",
    date_in_force: "2025-11-01",
    official_reference: "264/2025 Sb.",
    source_url: "https://www.nukib.cz",
    issuing_body: "Parlament České republiky",
    competent_authorities: ["CZ-NUKIB"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title:
          "NIS2 transposition — space transport as high-criticality sector",
        summary:
          "Adopted 26 June 2025, in force 1 November 2025. NÚKIB as national competent authority. Space transport classified as high-criticality sector. Czech Republic missed October 2024 deadline — received formal notice (November 2024) and reasoned opinion (May 2025).",
      },
    ],
    related_sources: ["CZ-OST-1967"],
    last_verified: "2026-04-15",
  },
];

// ─── Export Control (1) ─────────────────────────────────────────

const EXPORT_CONTROL_CZ: LegalSource[] = [
  {
    id: "CZ-EXPORT-CONTROL-2004",
    jurisdiction: "CZ",
    type: "federal_law",
    status: "in_force",
    title_en: "Dual-Use Export Control Act",
    title_local:
      "Zákon č. 594/2004 Sb., k provedení režimu kontroly vývozu zboží dvojího užití",
    date_enacted: "2004-12-03",
    official_reference: "594/2004 Sb.",
    source_url: "https://www.zakonyprolidi.cz/cs/2004-594",
    issuing_body: "Parlament České republiky",
    competent_authorities: ["CZ-MPO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Space technology export control",
        summary:
          "Supplements EU Regulation 2021/821. MPO issues authorizations via ELIS system. Space tech: Category 9 (Aerospace/Propulsion). Requires MFA foreign policy opinions and MOD/security service assessments. Penalties under §§17-18. Government Order 30/2023 Sb. implements. Amended by Acts 281/2009, 343/2010, 243/2016, 183/2017, 383/2022.",
        complianceImplication:
          "Czech Republic member of all 4 major export control regimes. Chaired Wassenaar Plenary 2011.",
      },
    ],
    related_sources: ["CZ-OST-1967"],
    last_verified: "2026-04-15",
  },
];

// ─── Policy (1) ─────────────────────────────────────────────────

const POLICY_CZ: LegalSource[] = [
  {
    id: "CZ-NSP-2020-2025",
    jurisdiction: "CZ",
    type: "policy_document",
    status: "in_force",
    title_en: "National Space Plan 2020-2025",
    title_local: "Národní kosmický plán 2020-2025",
    date_published: "2019-10-14",
    official_reference: "Government Resolution No. 732/2019",
    source_url: "https://www.czechspaceportal.cz",
    issuing_body: "Vláda České republiky",
    competent_authorities: ["CZ-MOT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "Third national space plan — no legislation mentioned",
        summary:
          "Five objectives: build capacities, visible international role, stimulate private investment, bilateral cooperation, solid legal framework. CZK 1.53B/year to ESA. NOTABLY: none of the three NSPs mention national space legislation in detail. Plan expired end 2025, no successor announced. ~€60M/year total ESA contribution. 65+ companies, 600+ ESA projects. ESA BIC: 60+ startups, 90%+ survival rate.",
        complianceImplication:
          "Despite 'solid legal framework' as stated objective, no concrete legislative action taken. The EU Space Act (2030) may provide the framework instead.",
      },
    ],
    related_sources: ["CZ-GOV-RES-282-2011"],
    notes: [
      "Government Resolution 732/2019. Third iteration (after NSP 2010 and NSP 2014-2019).",
      "Expired end 2025. No successor announced.",
      "CZK 2B allocated for Aleš Svoboda ISS mission (Axiom Space, earliest 2027).",
    ],
    last_verified: "2026-04-15",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_CZ: LegalSource[] = [
  ...TREATIES_CZ,
  ...APPLICABLE_LEGISLATION_CZ,
  ...CYBERSECURITY_CZ,
  ...EXPORT_CONTROL_CZ,
  ...POLICY_CZ,
];
