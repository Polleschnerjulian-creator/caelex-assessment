// src/data/legal-sources/sources/hr.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Croatia space law sources — complete legal framework for jurisdiction HR.
 *
 * Sources: mzo.gov.hr, hakom.hr, zsis.hr, azop.hr, narodne-novine.nn.hr,
 * esa.int
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act. Croatia signed the ESA
 * European Cooperating State Agreement on 19 February 2018 and
 * graduated to PECS on 7 December 2022. The Ministry of Science,
 * Education and Youth (MZO) is the ESA delegation ministry. Notable
 * companies: Amphinicy Technologies (satellite ground-segment software,
 * Zagreb), RT-RK, and the University of Zagreb's FER laboratory is a
 * key academic partner for ESA cooperating-state projects. Regulatory
 * framework layered from (i) EU instruments applied directly,
 * (ii) sectoral Croatian law — Electronic Communications Act, Dual-Use
 * Goods Act, Cybersecurity Act — and (iii) ESA programme agreements
 * coordinated via MZO.
 *
 * Coverage status: PRELIMINARY. Treaty accession dates (Yugoslav
 * succession 1992) require UNOOSA depositary verification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── HR Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_HR: Authority[] = [
  {
    id: "HR-MZO",
    jurisdiction: "HR",
    name_en: "Ministry of Science, Education and Youth",
    name_local: "Ministarstvo znanosti, obrazovanja i mladih",
    abbreviation: "MZO",
    website: "https://mzo.gov.hr",
    space_mandate:
      "ESA delegation ministry and primary coordinator of Croatian space activities. Manages Croatia's ESA contribution (~€1M/year), approves industrial participation strategy, and coordinates the national space policy. Represents Croatia at the EU Space Programme Committee. Coordinates with the University of Zagreb's FER laboratory on PECS programme delivery.",
    applicable_areas: ["licensing"],
  },
  {
    id: "HR-HAKOM",
    jurisdiction: "HR",
    name_en: "Croatian Regulatory Authority for Network Industries",
    name_local: "Hrvatska regulatorna agencija za mrežne djelatnosti",
    abbreviation: "HAKOM",
    website: "https://hakom.hr",
    space_mandate:
      "National regulatory authority for electronic communications under the Electronic Communications Act (Zakon o elektroničkim komunikacijama, 2022). Issues individual authorisations for satellite earth stations and satellite uplink services. Manages Croatian radio spectrum, coordinates ITU satellite filings and orbital slot notifications on behalf of the Croatian administration.",
    legal_basis: "Zakon o elektroničkim komunikacijama (2022)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "HR-MVEP",
    jurisdiction: "HR",
    name_en: "Ministry of Foreign and European Affairs",
    name_local: "Ministarstvo vanjskih i europskih poslova",
    abbreviation: "MVEP",
    website: "https://mvep.gov.hr",
    space_mandate:
      "International space treaty matters, COPUOS representation, and treaty deposit coordination. Croatia succeeded to the major UN space treaties via Yugoslav succession on 8 October 1991 (date of independence; formal notification to UNOOSA followed in subsequent years).",
    applicable_areas: ["licensing"],
  },
  {
    id: "HR-DURH",
    jurisdiction: "HR",
    name_en: "Ministry of Economy — Trade Policy and Dual-Use Goods",
    name_local: "Ministarstvo gospodarstva",
    abbreviation: "MINGO",
    website: "https://mingo.gov.hr",
    space_mandate:
      "Export control authority for dual-use items under the Act on Exports of Dual-Use Goods (Zakon o izvozu robe s dvojnom namjenom, 2018) implementing EU Regulation 2021/821. Issues export licences for Category 9 (Aerospace/Propulsion) items. Croatia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
    legal_basis: "Zakon o izvozu robe s dvojnom namjenom (2018)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "HR-ZSIS",
    jurisdiction: "HR",
    name_en: "Information Systems Security Bureau",
    name_local: "Zavod za sigurnost informacijskih sustava",
    abbreviation: "ZSIS",
    website: "https://zsis.hr",
    space_mandate:
      "NIS2 national competent authority under the Cybersecurity Act (Zakon o kibernetičkoj sigurnosti, 2024). Operates the national CERT function (CERT.hr, jointly with CARNET for incident response), coordinates cybersecurity supervision of essential and important entities including space-sector operators whose services qualify under NIS2 Annex I (space sector is high-criticality).",
    legal_basis: "Zakon o kibernetičkoj sigurnosti (2024)",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "HR-AZOP",
    jurisdiction: "HR",
    name_en: "Personal Data Protection Agency",
    name_local: "Agencija za zaštitu osobnih podataka",
    abbreviation: "AZOP",
    website: "https://azop.hr",
    space_mandate:
      "GDPR enforcement under the Act on the Implementation of the GDPR (Zakon o provedbi Opće uredbe o zaštiti podataka, 2018) for Earth observation imagery, satellite-derived data products, and space-based telecommunications services.",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────

const TREATIES_HR: LegalSource[] = [
  {
    id: "HR-OST",
    jurisdiction: "HR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Croatian Succession / Accession",
    title_local:
      "Ugovor o načelima kojima se uređuje djelovanje država u istraživanju i korištenju svemira",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["HR-MVEP", "HR-MZO"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Croatia bears international responsibility for national space activities. However, NO domestic authorization regime exists — Croatia has no dedicated national space law. Regulatory framework relies on (i) EU instruments, (ii) sectoral Croatian law (telecoms, export control, cybersecurity), and (iii) ESA programme agreements coordinated via MZO.",
        complianceImplication:
          "Croatian operators must navigate multiple sectoral regulators: HAKOM for spectrum, ZSIS for cybersecurity, MINGO for export control. MZO provides ESA-programme coordination but no direct licensing authority.",
      },
    ],
    related_sources: ["HR-LIABILITY"],
    notes: [
      "Croatia declared independence 25 June 1991, internationally recognised 1992.",
      "Specific Yugoslav-successor notification date to UNOOSA requires depositary verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "HR-LIABILITY",
    jurisdiction: "HR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Croatian Succession / Accession",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["HR-MVEP"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Croatia is absolutely liable for surface damage caused by Croatian space objects. No dedicated space liability or insurance framework exists under Croatian law. Civil Obligations Act general strict-liability provisions may apply. NO mandatory insurance, NO recourse cap, NO government backstop for private operators.",
      },
    ],
    related_sources: ["HR-OST"],
    notes: [
      "Specific succession/accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (3) ──────────────────

const SECTORAL_HR: LegalSource[] = [
  {
    id: "HR-ECA-2022",
    jurisdiction: "HR",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act",
    title_local: "Zakon o elektroničkim komunikacijama",
    date_enacted: "2022-07-15",
    date_in_force: "2022-07-23",
    official_reference: "NN 76/22",
    source_url: "https://narodne-novine.nn.hr",
    issuing_body: "Hrvatski sabor",
    competent_authorities: ["HR-HAKOM"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Chapter VI",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. HAKOM is the issuing authority and manages Croatia's position in ITU filings and orbital slot coordination. Transposes the EU Electronic Communications Code (Directive 2018/1972).",
      },
    ],
    related_sources: ["HR-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "HR-EXPORT-2018",
    jurisdiction: "HR",
    type: "federal_law",
    status: "in_force",
    title_en: "Act on Exports of Dual-Use Goods",
    title_local: "Zakon o izvozu robe s dvojnom namjenom",
    date_enacted: "2018-12-14",
    official_reference: "NN 118/18",
    source_url: "https://narodne-novine.nn.hr",
    issuing_body: "Hrvatski sabor",
    competent_authorities: ["HR-DURH"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Export control for dual-use space technology",
        summary:
          "Implements EU Regulation 2021/821. The Ministry of Economy issues export licences for Category 9 (Aerospace/Propulsion) items. Croatia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
      },
    ],
    related_sources: ["HR-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "HR-CYBERSEC-2024",
    jurisdiction: "HR",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Act (NIS2 transposition)",
    title_local: "Zakon o kibernetičkoj sigurnosti",
    date_enacted: "2024-02-02",
    date_in_force: "2024-02-15",
    official_reference: "NN 14/24",
    source_url: "https://zsis.hr",
    issuing_body: "Hrvatski sabor",
    competent_authorities: ["HR-ZSIS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space sector as high-criticality",
        summary:
          "Transposes NIS2 Directive (EU 2022/2555). ZSIS (Information Systems Security Bureau) is the national competent authority. Space sector classified as high-criticality under Annex I; operators providing satellite-based services to essential entities fall under the essential/important entity regime.",
      },
    ],
    related_sources: ["HR-OST"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / Strategy (1) ─────────────────────

const POLICY_HR: LegalSource[] = [
  {
    id: "HR-ESA-2018",
    jurisdiction: "HR",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA European Cooperating State / PECS Agreement — Croatia",
    title_local: "ESA Sporazum o europskoj suradničkoj državi — Hrvatska",
    date_enacted: "2018-02-19",
    date_in_force: "2018-02-19",
    source_url: "https://www.esa.int/About_Us/Corporate_news/Croatia_joins_ESA",
    issuing_body: "European Space Agency",
    competent_authorities: ["HR-MZO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA European Cooperating State status",
        summary:
          "Croatia signed the European Cooperating State Agreement with ESA on 19 February 2018, and graduated to PECS (Plan for European Cooperating States) on 7 December 2022. PECS status unlocks project-based funding for Croatian industry and academia through ESA technology programmes, as a stepping stone toward Associate or full membership.",
      },
    ],
    related_sources: ["HR-OST"],
    notes: [
      "European Cooperating State: 19 February 2018. PECS: 7 December 2022.",
      "University of Zagreb FER laboratory is a major ESA PECS partner.",
      "Active industry: Amphinicy Technologies (ground-segment SW), RT-RK.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_HR: LegalSource[] = [
  ...TREATIES_HR,
  ...SECTORAL_HR,
  ...POLICY_HR,
];
