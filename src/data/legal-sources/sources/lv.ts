// src/data/legal-sources/sources/lv.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Latvia space law sources — complete legal framework for jurisdiction LV.
 *
 * Sources: izm.gov.lv, em.gov.lv, sprk.gov.lv, cert.lv, likumi.lv, esa.int
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act. Latvia signed the ESA
 * European Cooperating State Agreement on 25 July 2013 (PECS 2015)
 * and became an ESA Associate Member on 27 July 2020. The Ministry
 * of Education and Science (IZM) is the ESA delegation ministry.
 * Ventspils International Radio Astronomy Centre (VIRAC) operates
 * the 32m RT-32 radio telescope — a major Latvian space-science
 * asset. Notable industry: Eventech (laser timing for satellite
 * laser ranging), ARMS (ground-station services), Tet (formerly
 * Lattelecom). Regulatory framework layered from (i) EU instruments
 * applied directly, (ii) sectoral Latvian law — Electronic
 * Communications Law, Strategic Goods Act, Cybersecurity Law — and
 * (iii) ESA programme agreements coordinated via IZM and EM.
 *
 * Coverage status: PRELIMINARY. Treaty accession dates require UNOOSA
 * depositary verification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── LV Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_LV: Authority[] = [
  {
    id: "LV-IZM",
    jurisdiction: "LV",
    name_en: "Ministry of Education and Science",
    name_local: "Izglītības un zinātnes ministrija",
    abbreviation: "IZM",
    website: "https://izm.gov.lv",
    space_mandate:
      "ESA delegation ministry and primary coordinator of Latvian space activities. Manages Latvia's ESA contribution (~€1.5M/year), approves industrial participation strategy, and coordinates the national space policy. Parent ministry for the Latvian Space Industry Association activities and VIRAC (Ventspils International Radio Astronomy Centre).",
    applicable_areas: ["licensing"],
  },
  {
    id: "LV-EM",
    jurisdiction: "LV",
    name_en: "Ministry of Economics",
    name_local: "Ekonomikas ministrija",
    abbreviation: "EM",
    website: "https://em.gov.lv",
    space_mandate:
      "Supports industrial participation in ESA programmes and EU Space Programme, coordinates space-sector export promotion via the Investment and Development Agency of Latvia (LIAA). Co-chairs industrial policy matters with IZM.",
    applicable_areas: ["licensing"],
  },
  {
    id: "LV-VASESD",
    jurisdiction: "LV",
    name_en: "Electronic Communications Office (VAS ESD)",
    name_local: "VAS Elektronisko sakaru direkcija",
    abbreviation: "VAS ESD",
    website: "https://esd.lv",
    space_mandate:
      "Technical administrator of the Latvian radio spectrum. Manages national spectrum planning, coordinates ITU satellite filings and orbital slot notifications. Issues technical approvals for satellite earth stations. Operates under delegation from SPRK (Public Utilities Commission).",
    legal_basis: "Elektronisko sakaru likums (2004)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "LV-CERTLV",
    jurisdiction: "LV",
    name_en:
      "Information Technology Security Incident Response Institution (CERT.LV)",
    name_local:
      "Informācijas tehnoloģiju drošības incidentu novēršanas institūcija (CERT.LV)",
    abbreviation: "CERT.LV",
    website: "https://cert.lv",
    space_mandate:
      "Part of the Ministry of Defence-supervised cybersecurity framework. National CERT and NIS2 competent authority for Latvia. Supervises essential and important entities, including space-sector operators whose services qualify under NIS2 Annex I (space sector is a high-criticality sector).",
    legal_basis:
      "Informācijas tehnoloģiju drošības likums; Kiberdrošības likums (2024)",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "LV-ARM",
    jurisdiction: "LV",
    name_en: "Ministry of Foreign Affairs — Strategic Goods Control Committee",
    name_local:
      "Ārlietu ministrija — Stratēģiskas nozīmes preču kontroles komiteja",
    abbreviation: "SPKK",
    website: "https://mfa.gov.lv",
    space_mandate:
      "Export control authority for dual-use items under the Law on the Circulation of Goods of Strategic Significance (Stratēģiskas nozīmes preču aprites likums, 2007) implementing EU Regulation 2021/821. Issues export licences for Category 9 (Aerospace/Propulsion) items. Latvia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group. Also handles COPUOS representation.",
    legal_basis: "Stratēģiskas nozīmes preču aprites likums (2007)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "LV-DVI",
    jurisdiction: "LV",
    name_en: "Data State Inspectorate",
    name_local: "Datu valsts inspekcija",
    abbreviation: "DVI",
    website: "https://dvi.gov.lv",
    space_mandate:
      "GDPR enforcement for Earth observation imagery, satellite-derived data products, and space-based telecommunications services under the Personal Data Processing Law (Fizisko personu datu apstrādes likums, 2018).",
    legal_basis: "Fizisko personu datu apstrādes likums (2018)",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────

const TREATIES_LV: LegalSource[] = [
  {
    id: "LV-OST",
    jurisdiction: "LV",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Latvian Accession",
    title_local:
      "Līgums par principiem, kas regulē valstu darbību kosmiskā telpas izpētē un izmantošanā",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["LV-ARM", "LV-IZM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Latvia bears international responsibility for national space activities. However, NO domestic authorization regime exists — Latvia has no dedicated national space law. Regulatory framework relies on (i) EU instruments, (ii) sectoral Latvian law (telecoms, export control, cybersecurity), and (iii) ESA programme agreements coordinated via IZM and EM.",
        complianceImplication:
          "Latvian operators must navigate multiple sectoral regulators: VAS ESD for spectrum, CERT.LV for cybersecurity, SPKK (within MFA) for export control. IZM provides ESA-programme coordination but no direct licensing authority.",
      },
    ],
    related_sources: ["LV-LIABILITY"],
    notes: [
      "Latvia restored independence 1991; UN space treaty accession as independent state.",
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "LV-LIABILITY",
    jurisdiction: "LV",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Latvian Accession",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["LV-ARM"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Latvia is absolutely liable for surface damage caused by Latvian space objects. No dedicated space liability or insurance framework exists under Latvian law. Civil Law general fault-based or strict-liability provisions may apply. NO mandatory insurance, NO recourse cap, NO government backstop for private operators.",
      },
    ],
    related_sources: ["LV-OST"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (3) ──────────────────

const SECTORAL_LV: LegalSource[] = [
  {
    id: "LV-ECA-2004",
    jurisdiction: "LV",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Law",
    title_local: "Elektronisko sakaru likums",
    date_enacted: "2004-10-28",
    date_in_force: "2004-12-01",
    official_reference: "LV 2004",
    source_url: "https://likumi.lv/ta/id/96611",
    issuing_body: "Saeima",
    competent_authorities: ["LV-VASESD"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Chapter V",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. VAS ESD is the technical administrator managing Latvia's position in ITU filings and orbital slot coordination. Amended multiple times to align with successive EU electronic communications directives.",
      },
    ],
    related_sources: ["LV-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "LV-EXPORT-2007",
    jurisdiction: "LV",
    type: "federal_law",
    status: "in_force",
    title_en: "Law on the Circulation of Goods of Strategic Significance",
    title_local: "Stratēģiskas nozīmes preču aprites likums",
    date_enacted: "2007-06-21",
    date_in_force: "2007-08-01",
    official_reference: "LV 2007",
    source_url: "https://likumi.lv/ta/id/160051",
    issuing_body: "Saeima",
    competent_authorities: ["LV-ARM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Export control for dual-use space technology",
        summary:
          "Implements EU Regulation 2021/821. The Strategic Goods Control Committee (SPKK) within the Ministry of Foreign Affairs issues export licences for Category 9 (Aerospace/Propulsion) items. Latvia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
      },
    ],
    related_sources: ["LV-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "LV-CYBERSEC-2024",
    jurisdiction: "LV",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Law (NIS2 transposition)",
    title_local: "Kiberdrošības likums",
    date_enacted: "2024-10-03",
    date_in_force: "2024-10-15",
    official_reference: "LV 2024",
    source_url: "https://likumi.lv",
    issuing_body: "Saeima",
    competent_authorities: ["LV-CERTLV"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space sector as high-criticality",
        summary:
          "Transposes NIS2 Directive (EU 2022/2555). CERT.LV (under the Ministry of Defence oversight framework) is the national competent authority. Space sector classified as high-criticality under Annex I.",
      },
    ],
    related_sources: ["LV-OST"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / Strategy (1) ─────────────────────

const POLICY_LV: LegalSource[] = [
  {
    id: "LV-ESA-2020",
    jurisdiction: "LV",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA Associate Membership Agreement — Latvia",
    title_local: "ESA Asociētā statusa nolīgums — Latvija",
    date_enacted: "2020-07-27",
    date_in_force: "2020-07-27",
    source_url:
      "https://www.esa.int/About_Us/Corporate_news/Latvia_becomes_an_ESA_Associate_Member_State",
    issuing_body: "European Space Agency",
    competent_authorities: ["LV-IZM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA Associate Member status",
        summary:
          "Latvia became an ESA Associate Member State on 27 July 2020, succeeding the European Cooperating State Agreement of 25 July 2013 and the PECS arrangement of 2015. Associate membership grants Latvia fuller participation in ESA programmes and voting rights in certain ESA Council matters.",
      },
    ],
    related_sources: ["LV-OST"],
    notes: [
      "European Cooperating State: 25 July 2013. PECS: 2015. Associate Member: 27 July 2020.",
      "VIRAC (Ventspils 32m RT-32) is a major national space-science asset.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_LV: LegalSource[] = [
  ...TREATIES_LV,
  ...SECTORAL_LV,
  ...POLICY_LV,
];
