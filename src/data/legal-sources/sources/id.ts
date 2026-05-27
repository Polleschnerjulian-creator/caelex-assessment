// src/data/legal-sources/sources/id.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Indonesia — space-law sources and authorities.
 *
 * Indonesia has a dedicated Space Activities Law (UU 21/2013), an
 * equatorial launch-site programme on Biak (in early planning), and
 * the Palapa/Bakti satellite series for rural connectivity. LAPAN was
 * merged into BRIN (National Research and Innovation Agency) in 2021 —
 * a major institutional shift that operators should note when looking
 * at older sources referencing LAPAN as the lead authority.
 *
 * Atlas P1 (2026-05-26): new jurisdiction, target 15 sources per
 * ATLAS-CORPUS-EXPANSION-PLAN.md § 5.D.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_ID: Authority[] = [
  {
    id: "ID-BRIN",
    jurisdiction: "ID",
    name_en: "National Research and Innovation Agency",
    name_local: "Badan Riset dan Inovasi Nasional",
    abbreviation: "BRIN",
    parent_ministry: "Office of the President",
    website: "https://brin.go.id/",
    space_mandate:
      "Lead space-research authority. Absorbed LAPAN (former national space agency) in 2021 — operates LAPAN's legacy satellite and rocket programmes through a dedicated Aeronautics + Space Research Organisation. Authority for the licensing regime under UU 21/2013 transitioned to BRIN with the merger.",
    legal_basis: "Presidential Regulation 78/2021 on BRIN organisation",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "ID-KEMKOMINFO",
    jurisdiction: "ID",
    name_en: "Ministry of Communication and Information Technology",
    name_local: "Kementerian Komunikasi dan Informatika",
    abbreviation: "Kemkominfo",
    website: "https://www.kominfo.go.id/",
    space_mandate:
      "Frequency-spectrum administration + telecoms licensing. Indonesia's national notifying administration for ITU filings. Manages allocations for Palapa satellites, Bakti rural-broadband programmes, and foreign satcom-service licensing for the Indonesian market.",
    legal_basis: "Law 36/1999 on Telecommunications",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "ID-BSSN",
    jurisdiction: "ID",
    name_en: "National Cyber and Crypto Agency",
    name_local: "Badan Siber dan Sandi Negara",
    abbreviation: "BSSN",
    parent_ministry: "Office of the President",
    website: "https://bssn.go.id/",
    space_mandate:
      "National cybersecurity authority. Coordinates protection of national critical infrastructure including satcom + ground-station operators. Implements the Personal Data Protection Law (UU 27/2022) data-security provisions alongside Kemkominfo.",
    legal_basis: "Presidential Regulation 53/2017 on BSSN",
    applicable_areas: ["cybersecurity", "critical_infrastructure"],
  },
  {
    id: "ID-BKPM",
    jurisdiction: "ID",
    name_en:
      "Indonesian Investment Coordinating Board / Ministry of Investment",
    name_local: "Badan Koordinasi Penanaman Modal / Kementerian Investasi",
    abbreviation: "BKPM",
    website: "https://www.bkpm.go.id/",
    space_mandate:
      "Foreign-investment screening + sectoral approval. Maintains the Daftar Negatif Investasi (DNI / Negative Investment List) — space activities sit on the partially-restricted list with specific foreign-ownership caps. Counsel for space-sector FDI must obtain BKPM principal-licence before incorporation.",
    legal_basis: "Law 25/2007 on Investment; Perpres 10/2021 DNI",
    applicable_areas: ["fdi_screening"],
  },
];

export const LEGAL_SOURCES_ID: LegalSource[] = [
  // ─── Foundational / treaty ────────────────────────────────────────────
  {
    id: "ID-OST-2002",
    jurisdiction: "ID",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Indonesia Ratification",
    date_enacted: "2002-07-01",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of Indonesia",
    competent_authorities: ["ID-BRIN"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Indonesia is a party to the Outer Space Treaty. Liability + registration obligations discharged through UU 21/2013 (Space Activities Law) + its 2018 implementing regulation.",
    key_provisions: [],
    related_sources: ["INT-OST-1967", "ID-SPACE-ACT-2013"],
    last_verified: "2026-05-26",
  },

  // ─── Core space-law framework ─────────────────────────────────────────
  {
    id: "ID-SPACE-ACT-2013",
    jurisdiction: "ID",
    type: "federal_law",
    status: "in_force",
    title_en: "Law on Space Activities",
    title_local: "Undang-Undang tentang Keantariksaan (UU 21/2013)",
    date_enacted: "2013-08-06",
    date_in_force: "2013-08-06",
    official_reference: "Law No. 21 of 2013",
    source_url: "https://peraturan.bpk.go.id/Home/Details/39076",
    issuing_body: "House of Representatives (DPR)",
    competent_authorities: ["ID-BRIN"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
    ],
    scope_description:
      "Indonesia's dedicated space-activities statute. Covers licensing, third-party-liability insurance, national registry, space-debris mitigation, and personnel-status provisions. Operationally administered by BRIN since the 2021 LAPAN-BRIN merger. Foreign operators conducting launches from Indonesian territory (e.g. future Biak equatorial spaceport) fall under BRIN's licensing power.",
    key_provisions: [
      {
        section: "Art. 4-12",
        title: "Licensing of space activities",
        summary:
          "All space activities by Indonesian-flagged operators OR from Indonesian territory require BRIN licensing. Conditions include safety analyses, third-party-liability insurance, and Indonesian-jurisdictional dispute-resolution clauses.",
      },
      {
        section: "Art. 76-79",
        title: "Liability and insurance",
        summary:
          "Operator strict liability for surface damage; mandatory third-party-liability insurance for licensed activities; State indemnification above insurance ceiling.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-LIABILITY-1972"],
    last_verified: "2026-05-26",
  },
  {
    id: "ID-LAPAN-BRIN-MERGER-2021",
    jurisdiction: "ID",
    type: "policy_document",
    status: "in_force",
    title_en:
      "LAPAN-BRIN Institutional Merger (Presidential Regulation 78/2021)",
    title_local:
      "Peraturan Presiden Nomor 78 Tahun 2021 tentang Badan Riset dan Inovasi Nasional",
    date_enacted: "2021-08-24",
    date_in_force: "2021-09-01",
    source_url: "https://peraturan.bpk.go.id/Home/Details/183580",
    issuing_body: "Office of the President",
    competent_authorities: ["ID-BRIN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Presidential Regulation that dissolved LAPAN as a standalone agency and integrated its functions into BRIN. Material for counsel reviewing pre-2021 LAPAN documentation — authority designations in older licences refer to LAPAN but operational power now sits with BRIN's Aeronautics + Space Research Organisation.",
    key_provisions: [],
    related_sources: ["ID-SPACE-ACT-2013"],
    last_verified: "2026-05-26",
  },

  // ─── Telecoms + frequency ─────────────────────────────────────────────
  {
    id: "ID-TELECOMS-LAW-36-1999",
    jurisdiction: "ID",
    type: "federal_law",
    status: "in_force",
    title_en: "Telecommunications Law",
    title_local: "Undang-Undang Telekomunikasi (UU 36/1999)",
    date_enacted: "1999-09-08",
    official_reference: "Law No. 36 of 1999",
    source_url: "https://peraturan.bpk.go.id/Home/Details/45397",
    issuing_body: "House of Representatives (DPR)",
    competent_authorities: ["ID-KEMKOMINFO"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum", "licensing"],
    scope_description:
      "Foundational telecoms statute. Establishes Kemkominfo's licensing powers over satcom service providers and earth stations. Satellite-internet operators (e.g. Starlink, OneWeb) serving Indonesian subscribers must obtain Indonesia-Specific (Izin Stasiun Radio) authorisations under this law.",
    key_provisions: [],
    related_sources: ["ID-PALAPA-SATELLITE", "ID-BAKTI-USO"],
    last_verified: "2026-05-26",
  },
  {
    id: "ID-PALAPA-SATELLITE",
    jurisdiction: "ID",
    type: "policy_document",
    status: "in_force",
    title_en: "Palapa Satellite Programme Operational Framework",
    title_local: "Sistem Satelit Palapa",
    date_published: "1976-07-08",
    source_url: "https://www.kominfo.go.id/",
    issuing_body: "Kemkominfo / PT Telkom Satellite Indonesia",
    competent_authorities: ["ID-KEMKOMINFO"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Operational framework for the Palapa satellite series — Indonesia's primary geo-stationary constellation (Palapa A 1976 → Palapa D 2009 → Palapa Nusantara Satu / PSN-VI 2023). Foreign satcom-services integrating with the Palapa frequency-coordination framework typically partner with PT Telkomsat or PT PSN (Pasifik Satelit Nusantara).",
    key_provisions: [],
    related_sources: ["ID-TELECOMS-LAW-36-1999"],
    last_verified: "2026-05-26",
  },
  {
    id: "ID-BAKTI-USO",
    jurisdiction: "ID",
    type: "federal_regulation",
    status: "in_force",
    title_en: "BAKTI Universal Service Obligation Fund + SATRIA Programme",
    title_local: "BAKTI / Satelit Multifungsi SATRIA",
    date_enacted: "2017-09-01",
    source_url: "https://www.baktikominfo.id/",
    issuing_body: "Kemkominfo / BAKTI",
    competent_authorities: ["ID-KEMKOMINFO"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["procurement", "state_aid"],
    scope_description:
      "Universal Service Obligation fund for rural connectivity. Operates the SATRIA-1 multifunctional satellite (launched 2023) providing broadband to remote Indonesian regions. Foreign satellite operators contracting with BAKTI must navigate Indonesian procurement law + the BKPM foreign-investment regime.",
    key_provisions: [],
    related_sources: ["ID-FOREIGN-INVESTMENT-LIST"],
    last_verified: "2026-05-26",
  },

  // ─── Cyber + data ─────────────────────────────────────────────────────
  {
    id: "ID-ITE-LAW-11-2008",
    jurisdiction: "ID",
    type: "federal_law",
    status: "in_force",
    title_en: "Law on Electronic Information and Transactions (ITE Law)",
    title_local:
      "Undang-Undang Informasi dan Transaksi Elektronik (UU 11/2008)",
    date_enacted: "2008-04-21",
    date_last_amended: "2024-01-02",
    official_reference: "Law No. 11 of 2008, amended by Law No. 1 of 2024",
    source_url: "https://peraturan.bpk.go.id/Home/Details/39105",
    issuing_body: "House of Representatives (DPR)",
    competent_authorities: ["ID-KEMKOMINFO"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security", "cybersecurity"],
    scope_description:
      "Master electronic-information statute. Applies to satcom data flows, satellite-derived data products, and ground-station operator data. 2024 amendment added enhanced provisions on hoax + defamation that affect satellite-internet content moderation. Cross-references the PDP Law for personal-data treatment.",
    key_provisions: [],
    related_sources: ["ID-PDP-LAW-27-2022"],
    last_verified: "2026-05-26",
  },
  {
    id: "ID-PDP-LAW-27-2022",
    jurisdiction: "ID",
    type: "federal_law",
    status: "in_force",
    title_en: "Personal Data Protection Law",
    title_local: "Undang-Undang Pelindungan Data Pribadi (UU 27/2022)",
    date_enacted: "2022-10-17",
    date_in_force: "2024-10-17",
    official_reference: "Law No. 27 of 2022",
    source_url: "https://peraturan.bpk.go.id/Home/Details/229798",
    issuing_body: "House of Representatives (DPR)",
    competent_authorities: ["ID-BSSN", "ID-KEMKOMINFO"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "Indonesia's first GDPR-equivalent statute. In force from October 2024 (2-year transition). Material for satellite-internet operators with Indonesian subscribers, satcom-data resellers, and ground-station operators handling personal information. Cross-border data transfers require adequacy decision or BSCC-equivalent contractual clauses.",
    key_provisions: [
      {
        section: "Art. 56",
        title: "Cross-border transfer",
        summary:
          "Cross-border personal-data transfer requires (a) adequacy decision, (b) appropriate safeguards, (c) consent, or (d) other lawful basis per implementing regulations.",
      },
    ],
    related_sources: ["ID-ITE-LAW-11-2008"],
    last_verified: "2026-05-26",
  },

  // ─── FDI + investment ─────────────────────────────────────────────────
  {
    id: "ID-FOREIGN-INVESTMENT-LIST",
    jurisdiction: "ID",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Negative Investment List + Priority Investment List",
    title_local: "Daftar Negatif Investasi / Daftar Prioritas Investasi",
    date_enacted: "2021-02-02",
    date_last_amended: "2024-01-01",
    official_reference: "Presidential Regulation 10/2021 (amended)",
    source_url: "https://peraturan.bpk.go.id/Home/Details/161830",
    issuing_body: "Office of the President / BKPM",
    competent_authorities: ["ID-BKPM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Indonesia's FDI screening mechanism. The 2021 reform liberalised most sectors but space activities remain partially restricted: satellite operations require minimum 49% Indonesian ownership; ground-segment open to foreign investment subject to BKPM principal licence. Counsel for space-sector FDI must work BKPM into the deal-timeline (typically 3-6 months for principal licence).",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "ID-INVESTMENT-LAW-25-2007",
    jurisdiction: "ID",
    type: "federal_law",
    status: "in_force",
    title_en: "Investment Law",
    title_local: "Undang-Undang Penanaman Modal (UU 25/2007)",
    date_enacted: "2007-04-26",
    date_last_amended: "2020-11-02",
    official_reference: "Law No. 25 of 2007 (amended via Omnibus Law 11/2020)",
    source_url: "https://peraturan.bpk.go.id/Home/Details/39893",
    issuing_body: "House of Representatives (DPR)",
    competent_authorities: ["ID-BKPM"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Foundational investment statute. Omnibus Law 11/2020 (Cipta Kerja) amended to streamline foreign-investment procedures including for space activities. Reading together with the 2021 Presidential Regulation on the Negative List.",
    key_provisions: [],
    related_sources: ["ID-FOREIGN-INVESTMENT-LIST"],
    last_verified: "2026-05-26",
  },

  // ─── Defence + dual-use ───────────────────────────────────────────────
  {
    id: "ID-DEFENCE-INDUSTRY-LAW",
    jurisdiction: "ID",
    type: "federal_law",
    status: "in_force",
    title_en: "Defence Industry Law",
    title_local: "Undang-Undang Industri Pertahanan (UU 16/2012)",
    date_enacted: "2012-10-02",
    official_reference: "Law No. 16 of 2012",
    source_url: "https://peraturan.bpk.go.id/Home/Details/39184",
    issuing_body: "House of Representatives (DPR)",
    competent_authorities: ["ID-BRIN"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "export_control"],
    scope_description:
      "Defence-industry statute with cross-references to space technology. Establishes the Defence Industry Policy Committee (KKIP) which approves dual-use technology transfers including satellite components + remote-sensing payloads.",
    key_provisions: [],
    related_sources: ["ID-SPACE-ACT-2013"],
    last_verified: "2026-05-26",
  },

  // ─── Equatorial launch + cooperation ──────────────────────────────────
  {
    id: "ID-BIAK-EQUATORIAL-LAUNCH",
    jurisdiction: "ID",
    type: "policy_document",
    status: "proposed",
    title_en: "Biak Equatorial Launch Site Development Plan",
    title_local: "Pengembangan Bandar Antariksa Biak",
    date_published: "2018-09-01",
    source_url: "https://brin.go.id/page/biak",
    issuing_body: "BRIN / Local Government Papua",
    competent_authorities: ["ID-BRIN"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing", "environmental"],
    scope_description:
      "Indonesia's equatorial launch-site programme on Pulau Biak (Papua). Politically + technically attractive equatorial location (~1°S latitude) but operationally years away. Counsel for foreign launch-providers interested in Indonesian equatorial advantage should track the BRIN-led environmental + land-use approvals.",
    key_provisions: [],
    related_sources: ["ID-SPACE-ACT-2013"],
    last_verified: "2026-05-26",
  },
  {
    id: "ID-ASEAN-SPACE-COOP",
    jurisdiction: "ID",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "ASEAN Space Cooperation Framework — Indonesia Participation",
    date_enacted: "2018-09-01",
    source_url:
      "https://asean.org/serweb/uploads/2021/05/ASEAN-Space-Cooperation.pdf",
    issuing_body: "ASEAN Secretariat",
    competent_authorities: ["ID-BRIN"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Indonesia is an active ASEAN Space Cooperation framework participant. Bilateral cooperation MOUs with Vietnam + Thailand on disaster-monitoring satellite data sharing.",
    key_provisions: [],
    related_sources: ["SG-ASEAN-SPACE-COOP"],
    last_verified: "2026-05-26",
  },

  // ─── Environmental ────────────────────────────────────────────────────
  {
    id: "ID-ENVIRONMENT-LAW-32-2009",
    jurisdiction: "ID",
    type: "federal_law",
    status: "in_force",
    title_en: "Environmental Protection and Management Law",
    title_local:
      "Undang-Undang Perlindungan dan Pengelolaan Lingkungan Hidup (UU 32/2009)",
    date_enacted: "2009-10-03",
    date_last_amended: "2020-11-02",
    official_reference: "Law No. 32 of 2009 (amended via Omnibus Law)",
    source_url: "https://peraturan.bpk.go.id/Home/Details/39067",
    issuing_body: "House of Representatives (DPR)",
    competent_authorities: ["ID-BRIN"],
    relevance_level: "medium",
    applicable_to: ["launch_provider", "ground_segment"],
    compliance_areas: ["environmental"],
    scope_description:
      "General environmental statute. Will apply to Biak spaceport development (Environmental Impact Assessment / AMDAL process), large ground-station construction, and any reentry-vehicle splashdown zone designation in Indonesian waters.",
    key_provisions: [],
    related_sources: ["ID-BIAK-EQUATORIAL-LAUNCH"],
    last_verified: "2026-05-26",
  },
];
