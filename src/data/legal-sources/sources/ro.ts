// src/data/legal-sources/sources/ro.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Romania space law sources — complete legal framework for jurisdiction RO.
 *
 * Sources: rosa.ro, ancom.ro, mae.ro, legislatie.just.ro, esa.int
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act, but ROSA (Romanian Space
 * Agency, founded 1991) has operated as national coordinator for three
 * decades. Romania became a full ESA Member State on 22 December 2011.
 * Regulatory framework layered from (i) EU instruments applied directly,
 * (ii) sectoral Romanian law — Electronic Communications Code, Strategic
 * Goods Regime Act, Cybersecurity Law, and (iii) ROSA government
 * resolutions coordinating industrial participation in ESA programmes.
 * Strong heritage: Hermann Oberth (born Sibiu, Transylvania) was a
 * founding father of astronautics. Conrad Haas (Sibiu, 16th century)
 * authored the earliest known multi-stage rocket manuscript.
 *
 * Coverage status: PRELIMINARY. Treaty accession via Socialist Republic
 * succession requires verification against UN depositary records.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── RO Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_RO: Authority[] = [
  {
    id: "RO-ROSA",
    jurisdiction: "RO",
    name_en: "Romanian Space Agency",
    name_local: "Agenția Spațială Română",
    abbreviation: "ROSA",
    website: "https://rosa.ro",
    space_mandate:
      "Primary coordinator of Romanian space activities since 1991 (re-established by GD 923/1995). National point of contact for ESA, EU Space Programme, and COPUOS. Operates STAR (Space Technology And Advanced Research) research centre and coordinates Romania's ESA contribution. Issues ESA industrial participation authorisations and manages the national space technology R&D programme. Represents Romania at the EU Space Programme Committee.",
    legal_basis: "GD 923/1995 (re-establishment)",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "RO-ANCOM",
    jurisdiction: "RO",
    name_en:
      "National Authority for Management and Regulation in Communications",
    name_local:
      "Autoritatea Națională pentru Administrare și Reglementare în Comunicații",
    abbreviation: "ANCOM",
    website: "https://ancom.ro",
    space_mandate:
      "National regulatory authority for electronic communications under Government Emergency Ordinance 22/2009 and Law 140/2023 (Electronic Communications Code). Issues individual authorisations for satellite earth stations and satellite uplink services. Manages Romanian radio spectrum, coordinates ITU satellite filings and orbital slot notifications.",
    legal_basis: "OUG 22/2009; Legea 140/2023",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "RO-MCID",
    jurisdiction: "RO",
    name_en: "Ministry of Research, Innovation and Digitalisation",
    name_local: "Ministerul Cercetării, Inovării și Digitalizării",
    abbreviation: "MCID",
    website: "https://mcid.gov.ro",
    space_mandate:
      "Parent ministry for ROSA. Sets national R&D policy including space research programmes. Approves Romanian ESA industrial participation strategy and authorises the ROSA budget envelope.",
    applicable_areas: ["licensing"],
  },
  {
    id: "RO-ANCSI",
    jurisdiction: "RO",
    name_en: "National Cybersecurity Directorate",
    name_local: "Direcția Națională de Securitate Cibernetică",
    abbreviation: "DNSC",
    website: "https://dnsc.ro",
    space_mandate:
      "NIS2 national competent authority under Law 58/2023 (Cybersecurity Framework Law). Coordinates cybersecurity incident response via CERT-RO, supervises essential and important entities including space-sector operators whose services qualify under NIS2 Annex I (space sector classified as high-criticality).",
    legal_basis: "Legea 58/2023",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "RO-MAE-ANCEX",
    jurisdiction: "RO",
    name_en:
      "Ministry of Foreign Affairs — Department for Export Controls (ANCEX)",
    name_local:
      "Ministerul Afacerilor Externe — Departamentul pentru Controlul Exporturilor",
    abbreviation: "ANCEX",
    website: "https://ancex.mae.ro",
    space_mandate:
      "Export control authority for dual-use space technology under Law 227/2018 implementing EU Regulation 2021/821. Issues export licences for Category 9 (Aerospace/Propulsion) items. Romania is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group. Also handles COPUOS representation and treaty deposit coordination.",
    legal_basis: "Legea 227/2018",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "RO-ANSPDCP",
    jurisdiction: "RO",
    name_en:
      "National Authority for the Supervision of Personal Data Processing",
    name_local:
      "Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal",
    abbreviation: "ANSPDCP",
    website: "https://dataprotection.ro",
    space_mandate:
      "GDPR enforcement under Law 190/2018 for Earth observation imagery, satellite-derived data products, and space-based telecommunications services. Particularly relevant for high-resolution EO where personal data implications arise under GDPR Art. 4(1).",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────
// NOTE: Romania signed key UN space treaties during the Socialist
// Republic era (SRR) — dates are those of the original signature/
// accession, with continuity asserted by the post-1989 Romanian state.

const TREATIES_RO: LegalSource[] = [
  {
    id: "RO-OST-1968",
    jurisdiction: "RO",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Romanian Accession",
    title_local: "Tratatul privind Spațiul Cosmic",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["RO-MAE-ANCEX", "RO-ROSA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Romania bears international responsibility for national space activities (signed 1967 during SRR, continuity asserted by post-1989 state). However, NO domestic authorization regime exists — Romania has no dedicated national space law. Regulatory framework relies on (i) EU instruments, (ii) sectoral Romanian law, and (iii) ROSA government resolutions.",
        complianceImplication:
          "Romanian operators must navigate multiple sectoral regulators: ANCOM for spectrum, DNSC for cybersecurity, ANCEX for export control. ROSA provides policy coordination but no licensing authority.",
      },
    ],
    related_sources: ["RO-LIABILITY"],
    notes: [
      "Romania signed Outer Space Treaty during Socialist Republic era.",
      "Specific ratification/accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "RO-LIABILITY",
    jurisdiction: "RO",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Romanian Accession",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["RO-MAE-ANCEX"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Romania is absolutely liable for surface damage caused by Romanian space objects. No dedicated space liability or insurance framework exists under Romanian law. Civil Code general strict liability provisions may apply. NO mandatory insurance, NO recourse cap, NO government backstop — severe exposure for private operators.",
      },
    ],
    related_sources: ["RO-OST-1968"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (3) ──────────────────

const SECTORAL_RO: LegalSource[] = [
  {
    id: "RO-ECC-2023",
    jurisdiction: "RO",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Code",
    title_local: "Codul Comunicațiilor Electronice (Legea nr. 140/2023)",
    date_enacted: "2023-05-17",
    date_in_force: "2023-08-01",
    official_reference: "Legea 140/2023",
    source_url: "https://legislatie.just.ro/Public/DetaliiDocument/269764",
    issuing_body: "Parlamentul României",
    competent_authorities: ["RO-ANCOM"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Titlul III",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. ANCOM is the issuing authority and manages Romania's position in ITU filings and orbital slot coordination. Transposes the EU Electronic Communications Code (Directive 2018/1972).",
      },
    ],
    related_sources: ["RO-OST-1968"],
    last_verified: "2026-04-20",
  },
  {
    id: "RO-EXPORT-2018",
    jurisdiction: "RO",
    type: "federal_law",
    status: "in_force",
    title_en: "Strategic Goods Export Control Act",
    title_local: "Legea nr. 227/2018 privind regimul strategic al exporturilor",
    date_enacted: "2018-07-31",
    official_reference: "Legea 227/2018",
    source_url: "https://legislatie.just.ro/Public/DetaliiDocument/202862",
    issuing_body: "Parlamentul României",
    competent_authorities: ["RO-MAE-ANCEX"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Export control for dual-use space technology",
        summary:
          "Implements EU Regulation 2021/821. ANCEX (within MFA) issues authorisations for Category 9 (Aerospace/Propulsion) items. Romania is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
      },
    ],
    related_sources: ["RO-OST-1968"],
    last_verified: "2026-04-20",
  },
  {
    id: "RO-CYBERSEC-2023",
    jurisdiction: "RO",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Framework Law (NIS2 transposition framework)",
    title_local: "Legea 58/2023 privind securitatea cibernetică",
    date_enacted: "2023-03-17",
    official_reference: "Legea 58/2023",
    source_url: "https://dnsc.ro",
    issuing_body: "Parlamentul României",
    competent_authorities: ["RO-ANCSI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space sector as high-criticality",
        summary:
          "Transposes NIS2 Directive (EU 2022/2555). DNSC (Romanian Cybersecurity Directorate) is the national competent authority. Space sector classified as high-criticality; operators providing satellite-based services to essential entities fall under the essential/important entity regime.",
      },
    ],
    related_sources: ["RO-OST-1968"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / Strategy (1) ─────────────────────

const POLICY_RO: LegalSource[] = [
  {
    id: "RO-ESA-2011",
    jurisdiction: "RO",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA Convention — Romanian Full Membership",
    title_local: "Convenția ESA — Aderarea României",
    date_enacted: "2011-12-22",
    date_in_force: "2011-12-22",
    source_url: "https://www.esa.int/About_Us/Corporate_news/Romania_joins_ESA",
    issuing_body: "European Space Agency",
    competent_authorities: ["RO-ROSA", "RO-MCID"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA full membership",
        summary:
          "Romania became the 19th full member state of the European Space Agency on 22 December 2011 (ratifying the ESA Convention at Strasbourg). ESA membership anchors Romanian industrial participation in ESA industry contracts. ROSA is the national delegation ministry.",
      },
    ],
    related_sources: ["RO-OST-1968"],
    notes: [
      "ESA Cooperating State since 1992, full member since 22 December 2011.",
      "ROSA (established 1991) serves as the ESA national contact point.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_RO: LegalSource[] = [
  ...TREATIES_RO,
  ...SECTORAL_RO,
  ...POLICY_RO,
];
