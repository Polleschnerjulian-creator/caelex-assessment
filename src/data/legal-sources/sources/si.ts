// src/data/legal-sources/sources/si.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Slovenia space law sources — complete legal framework for jurisdiction SI.
 *
 * Sources: gov.si, akos-rs.si, uradni-list.si, esa.int
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act. Slovenia became a full ESA
 * Member State on 5 July 2022 (ratifying the ESA Convention at the
 * 297th ESA Council meeting). The Ministry of Economy, Tourism and
 * Sport serves as the ESA delegation ministry. Regulatory framework
 * layered from (i) EU instruments applied directly, (ii) sectoral
 * Slovenian law — Electronic Communications Act, Strategic Goods
 * Regime Act, Information Security Act — and (iii) the national space
 * strategy coordinated through the Slovenian Centre of Excellence
 * for Space Sciences and Technologies (SPACE-SI) and the Slovenian
 * Business & Research Association (SBRA). Notable companies: Sinergise
 * (Sentinel Hub Earth observation platform, acquired by Planet Labs
 * 2023), Skylabs (space systems), Dewesoft (satellite telemetry).
 *
 * Coverage status: PRELIMINARY. Treaty accession dates require UNOOSA
 * depositary verification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── SI Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_SI: Authority[] = [
  {
    id: "SI-MGTS",
    jurisdiction: "SI",
    name_en: "Ministry of the Economy, Tourism and Sport",
    name_local: "Ministrstvo za gospodarstvo, turizem in šport",
    abbreviation: "MGTS",
    website: "https://gov.si/mgts",
    space_mandate:
      "ESA delegation ministry and coordinator of Slovenian space activities. Manages Slovenia's ESA contribution, approves industrial participation in ESA programmes, and coordinates national space strategy. Represents Slovenia at the EU Space Programme Committee and serves as the government point of contact for the Slovenian Business & Research Association (SBRA) in Brussels.",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "SI-AKOS",
    jurisdiction: "SI",
    name_en:
      "Agency for Communication Networks and Services of the Republic of Slovenia",
    name_local:
      "Agencija za komunikacijska omrežja in storitve Republike Slovenije",
    abbreviation: "AKOS",
    website: "https://akos-rs.si",
    space_mandate:
      "National regulatory authority for electronic communications under the Electronic Communications Act (ZEKom-2, 2023). Issues individual authorisations for satellite earth stations and satellite uplink services. Manages Slovenian radio spectrum, coordinates ITU satellite filings and orbital slot notifications on behalf of the Slovenian administration.",
    legal_basis: "ZEKom-2 (2023)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "SI-MZZEU",
    jurisdiction: "SI",
    name_en: "Ministry of Foreign and European Affairs",
    name_local: "Ministrstvo za zunanje in evropske zadeve",
    abbreviation: "MZZ",
    website: "https://gov.si/mzz",
    space_mandate:
      "International space treaty matters, COPUOS representation, and treaty deposit coordination. Signed the Artemis Accords on 19 April 2024 as the 39th signatory.",
    applicable_areas: ["licensing"],
  },
  {
    id: "SI-MO-KOMISIJA",
    jurisdiction: "SI",
    name_en:
      "Ministry of Economy — Interministerial Commission on Export Control",
    name_local: "Medresorska komisija za nadzor izvoza blaga z dvojno rabo",
    abbreviation: "MKNIB",
    website: "https://gov.si/mgts",
    space_mandate:
      "Export control authority for dual-use items under the Strategic Goods Regime Act (Zakon o nadzoru izvoza blaga z dvojno rabo, 2018) implementing EU Regulation 2021/821. Issues export licences for Category 9 (Aerospace/Propulsion) items. Slovenia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
    legal_basis: "ZNIBD (2018)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "SI-URSIV",
    jurisdiction: "SI",
    name_en: "Information Security Administration",
    name_local: "Uprava Republike Slovenije za informacijsko varnost",
    abbreviation: "URSIV",
    website: "https://gov.si/ursiv",
    space_mandate:
      "NIS2 national competent authority under the Information Security Act (ZInfV-1). Operates SI-CERT, coordinates incident response, and supervises essential and important entities including space-sector operators whose services qualify under NIS2 Annex I (space sector classified as high-criticality).",
    legal_basis: "ZInfV-1",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "SI-IP",
    jurisdiction: "SI",
    name_en: "Information Commissioner",
    name_local: "Informacijski pooblaščenec",
    abbreviation: "IP",
    website: "https://ip-rs.si",
    space_mandate:
      "GDPR enforcement under ZVOP-2 (Personal Data Protection Act 2023) for Earth observation imagery, satellite-derived data products, and space-based telecommunications services.",
    legal_basis: "ZVOP-2 (2023)",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────

const TREATIES_SI: LegalSource[] = [
  {
    id: "SI-OST",
    jurisdiction: "SI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Slovenian Succession / Accession",
    title_local:
      "Pogodba o načelih, ki urejajo dejavnosti držav pri raziskovanju in uporabi vesolja",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["SI-MZZEU", "SI-MGTS"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Slovenia bears international responsibility for national space activities. However, NO domestic authorization regime exists — Slovenia has no dedicated national space law. Regulatory framework relies on (i) EU instruments, (ii) sectoral Slovenian law (telecoms, export control, cybersecurity), and (iii) policy coordination through the Ministry of Economy.",
        complianceImplication:
          "Slovenian operators must navigate multiple sectoral regulators: AKOS for spectrum, URSIV for cybersecurity, MKNIB for export control. MGTS provides policy coordination but no direct licensing authority.",
      },
    ],
    related_sources: ["SI-LIABILITY"],
    notes: [
      "Slovenia became independent in 1991; UN space treaty accession as independent state.",
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "SI-LIABILITY",
    jurisdiction: "SI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Slovenian Accession",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["SI-MZZEU"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Slovenia is absolutely liable for surface damage caused by Slovenian space objects. No dedicated space liability or insurance framework exists under Slovenian law. Obligations Code general strict liability may apply. NO mandatory insurance, NO recourse cap, NO government backstop for private operators.",
      },
    ],
    related_sources: ["SI-OST"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (3) ──────────────────

const SECTORAL_SI: LegalSource[] = [
  {
    id: "SI-ZEKOM-2023",
    jurisdiction: "SI",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act (ZEKom-2)",
    title_local: "Zakon o elektronskih komunikacijah (ZEKom-2)",
    date_enacted: "2022-10-27",
    date_in_force: "2023-04-10",
    official_reference: "Uradni list RS, št. 130/22",
    source_url: "https://www.uradni-list.si/glasilo-uradni-list-rs",
    issuing_body: "Državni zbor Republike Slovenije",
    competent_authorities: ["SI-AKOS"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Poglavje VII",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. AKOS is the issuing authority and manages Slovenia's position in ITU filings and orbital slot coordination. Transposes the EU Electronic Communications Code (Directive 2018/1972).",
      },
    ],
    related_sources: ["SI-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "SI-ZNIBD-2018",
    jurisdiction: "SI",
    type: "federal_law",
    status: "in_force",
    title_en: "Strategic Goods Regime Act (Dual-Use Goods)",
    title_local: "Zakon o nadzoru izvoza blaga z dvojno rabo (ZNIBD)",
    date_enacted: "2018-07-11",
    official_reference: "Uradni list RS, št. 50/18",
    source_url: "https://pisrs.si/pregledPredpisa?id=ZAKO7768",
    issuing_body: "Državni zbor Republike Slovenije",
    competent_authorities: ["SI-MO-KOMISIJA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Export control for dual-use space technology",
        summary:
          "Implements EU Regulation 2021/821. The Interministerial Commission on Export Control (MKNIB, under the Ministry of Economy) issues authorisations for Category 9 (Aerospace/Propulsion) items. Slovenia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
      },
    ],
    related_sources: ["SI-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "SI-ZINFV1",
    jurisdiction: "SI",
    type: "federal_law",
    status: "in_force",
    title_en: "Information Security Act (NIS2 transposition)",
    title_local: "Zakon o informacijski varnosti (ZInfV-1)",
    date_enacted: "2024-07-10",
    date_in_force: "2024-10-01",
    official_reference: "Uradni list RS, 2024",
    source_url: "https://gov.si/ursiv",
    issuing_body: "Državni zbor Republike Slovenije",
    competent_authorities: ["SI-URSIV"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space sector as high-criticality",
        summary:
          "Transposes NIS2 Directive (EU 2022/2555). URSIV (Information Security Administration) is the national competent authority. Space sector classified as high-criticality; operators providing satellite-based services to essential entities fall under the essential/important entity regime.",
      },
    ],
    related_sources: ["SI-OST"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / Strategy (2) ─────────────────────

const POLICY_SI: LegalSource[] = [
  {
    id: "SI-ESA-2022",
    jurisdiction: "SI",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA Convention — Slovenian Full Membership",
    title_local: "ESA Konvencija — polnopravno članstvo Slovenije",
    date_enacted: "2022-07-05",
    date_in_force: "2022-07-05",
    source_url:
      "https://www.esa.int/About_Us/Corporate_news/Slovenia_joins_ESA",
    issuing_body: "European Space Agency",
    competent_authorities: ["SI-MGTS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA full membership",
        summary:
          "Slovenia became the 23rd full member state of the European Space Agency on 5 July 2022. ESA membership anchors Slovenian industrial participation in ESA industry contracts and unlocks full access to ESA mandatory and optional programmes.",
      },
    ],
    related_sources: ["SI-OST"],
    notes: [
      "ESA European Cooperating State since 2010, Associate Member since 2016, full member since 5 July 2022.",
      "Slovenian Business & Research Association (SBRA) represents Slovenian industry in Brussels.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "SI-ARTEMIS-2024",
    jurisdiction: "SI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Slovenian Signatory (2024)",
    date_enacted: "2024-04-19",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["SI-MZZEU"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Slovenia signed the Artemis Accords on 19 April 2024 as the 39th signatory, aligning with the NASA-led principles on peaceful use of outer space and interoperability for lunar exploration.",
      },
    ],
    related_sources: ["SI-OST"],
    notes: ["39th signatory, 19 April 2024."],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_SI: LegalSource[] = [
  ...TREATIES_SI,
  ...SECTORAL_SI,
  ...POLICY_SI,
];
