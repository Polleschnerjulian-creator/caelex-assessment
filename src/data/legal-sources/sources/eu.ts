// src/data/legal-sources/sources/eu.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * European Union regulations and directives — canonical single source.
 *
 * Each entry lists every EU member state in applies_to_jurisdictions.
 * Country pages read from here via filter.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── EU institutions (key administrators) ────────────────────────────

export const AUTHORITIES_EU: Authority[] = [
  {
    id: "EU-EC",
    jurisdiction: "EU",
    name_en: "European Commission",
    name_local: "European Commission",
    abbreviation: "EC",
    website: "https://commission.europa.eu",
    space_mandate:
      "Proposes EU space legislation (Space Act, Space Programme Regulation, IRIS²). DG DEFIS leads the EU space policy. Enforces EU regulations with direct effect in all Member States.",
    legal_basis:
      "Treaty on the Functioning of the European Union (TFEU) Art. 17",
    applicable_areas: ["licensing", "registration", "cybersecurity"],
  },
  {
    id: "EU-EUSPA",
    jurisdiction: "EU",
    name_en: "European Union Agency for the Space Programme",
    name_local: "European Union Agency for the Space Programme",
    abbreviation: "EUSPA",
    website: "https://www.euspa.europa.eu",
    space_mandate:
      "Manages EU space programmes: Galileo, EGNOS, Copernicus, IRIS², GOVSATCOM. Responsible for security accreditation and market uptake.",
    legal_basis: "Regulation (EU) 2021/696",
    applicable_areas: ["frequency_spectrum", "cybersecurity"],
  },
  {
    id: "EU-ENISA",
    jurisdiction: "EU",
    name_en: "European Union Agency for Cybersecurity",
    name_local: "European Union Agency for Cybersecurity",
    abbreviation: "ENISA",
    website: "https://www.enisa.europa.eu",
    space_mandate:
      "EU cybersecurity expertise center. Publishes the Space Threat Landscape, Space Cybersecurity Framework, and NIS2 Directive implementation guidance.",
    legal_basis: "Regulation (EU) 2019/881",
    applicable_areas: ["cybersecurity"],
  },
];

// ─── EU Legal Instruments — applies_to_jurisdictions lists Member States ─

export const LEGAL_SOURCES_EU: LegalSource[] = [
  {
    id: "EU-SPACE-ACT",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "PL",
      "PT",
      "SE",
    ],
    jurisdiction: "EU",
    type: "draft_legislation",
    status: "proposed",
    title_en: "EU Space Act — Regulation on the European Space Economy",
    date_published: "2025-06-25",
    official_reference: "COM(2025) 335 final",
    source_url:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=COM:2025:335:FIN",
    issuing_body: "European Commission",
    competent_authorities: [],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "cybersecurity",
      "debris_mitigation",
      "environmental",
      "space_traffic_management",
    ],
    scope_description:
      "Proposed Regulation establishing a harmonised EU-wide authorisation framework for space activities. Replaces national licensing fragmentation with mutual recognition across Member States, common safety/sustainability requirements, and a third-country-operator regime requiring an EU representative for non-EU services into the Union. Status: trilogue pending; expected application 2030.",
    key_provisions: [
      {
        section: "Art. 6-16",
        title: "Harmonized authorization regime",
        summary:
          "Establishes a common EU authorization framework for space activities. National competent authorities issue authorizations based on harmonized criteria. Mutual recognition across member states.",
        complianceImplication:
          "When enacted, this will create the first comprehensive licensing obligation for ALL space activities in Germany — filling the gap left by the absent Weltraumgesetz.",
      },
      {
        section: "Art. 20",
        title: "Third-country operator obligations",
        summary:
          "Non-EU operators providing services in the EU must designate an EU representative and register with a national authority.",
      },
      {
        section: "Art. 63-73",
        title: "Debris mitigation and space sustainability",
        summary:
          "Mandatory trackability, collision avoidance, maneuverability, debris mitigation plans, end-of-life disposal, and environmental footprint declarations.",
      },
      {
        section: "Art. 74-95",
        title: "Cybersecurity requirements",
        summary:
          "Space-specific cybersecurity measures building on NIS2. Covers space segment, ground segment, and communication links.",
      },
    ],
    related_sources: ["INT-OST-1967", "EU-NIS2-2022", "EU-CRA-2024"],
    caelex_engine_mapping: ["engine.server"],
    caelex_data_file_mapping: [
      "articles.ts",
      "caelex-eu-space-act-engine.json",
    ],
    notes: [
      "Status as of April 2026: Commission Proposal published June 2025. EP rapporteur Donazzan (ITRE) published report March 2026. Cyprus Council Presidency compromise text March 2026. Trilogue not yet started.",
      "Expected application date: 1 January 2030 (subject to adoption timeline).",
      "Will be directly applicable as EU Regulation — no national transposition needed.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-SPACE-PROG-2021",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "PL",
      "PT",
      "SE",
    ],
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "EU Space Programme Regulation",
    date_in_force: "2021-05-12",
    official_reference: "Verordnung (EU) 2021/696",
    source_url: "https://eur-lex.europa.eu/eli/reg/2021/696/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration", "space_traffic_management"],
    scope_description:
      "Regulation 2021/696 establishing the EU Space Programme — Galileo, EGNOS, Copernicus, GOVSATCOM, IRIS² — and the legal basis for EUSPA's mandate. Captures security accreditation, market uptake, governance, and the ESA-EU coordination architecture under which EU programmes are implemented.",
    key_provisions: [
      {
        section: "Full regulation",
        title: "Legal framework for EU space programmes",
        summary:
          "Establishes the legal basis for Copernicus (EO), Galileo/EGNOS (navigation), GOVSATCOM (governmental satellite communications), and SSA/SST (space situational awareness). Governs EUSPA's role.",
        complianceImplication:
          "Operators contributing to or using EU space programme services must comply with access and data policies. SSA/SST data sharing obligations apply to operators in EU member states.",
      },
    ],
    related_sources: ["EU-SPACE-ACT"],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-NIS2-2022",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "PL",
      "PT",
      "SE",
    ],
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en: "NIS2 Directive — Network and Information Security",
    date_in_force: "2023-01-16",
    official_reference: "Richtlinie (EU) 2022/2555",
    source_url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: [],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["cybersecurity"],
    scope_description:
      "Directive (EU) 2022/2555 on a high common level of cybersecurity across the Union. Annex I designates Space (Sector 11) as a sector of high criticality — covered operators face risk-management duties (Art. 21), 24h/72h incident reporting (Art. 23), management-board accountability, and substantial fines. Member-State transposition deadline was October 2024.",
    key_provisions: [
      {
        section: "Annex I, Sector 11",
        title: "Space as sector of high criticality",
        summary:
          "Space is explicitly listed as a sector of high criticality. Operators of ground-based infrastructure, satellite operators providing essential services, and space situational awareness providers fall within NIS2 scope.",
        complianceImplication:
          "Medium and large space operators in the EU are automatically in scope. Small/micro entities are excluded unless designated by a member state.",
      },
      {
        section: "Art. 21",
        title: "Cybersecurity risk management measures",
        summary:
          "Art. 21(2)(a)-(j): 10 categories of mandatory measures including risk analysis, incident handling, business continuity, supply chain, network security, effectiveness assessment, cyber hygiene, cryptography, HR/access control, MFA.",
      },
      {
        section: "Art. 23",
        title: "Incident reporting obligations",
        summary:
          "Early warning within 24 hours, notification within 72 hours, intermediate report on request, final report within 1 month.",
      },
    ],
    related_sources: ["DE-BSIG-NIS2", "EU-CRA-2024", "EU-SPACE-ACT"],
    caelex_engine_mapping: ["nis2-engine.server"],
    caelex_data_file_mapping: ["nis2-requirements.ts"],
    notes: ["Transposed in DE via NIS2UmsuCG → BSIG §§ 30-31."],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-CRA-2024",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "PL",
      "PT",
      "SE",
    ],
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "Cyber Resilience Act",
    date_in_force: "2024-12-10",
    official_reference: "Verordnung (EU) 2024/2847",
    source_url: "https://eur-lex.europa.eu/eli/reg/2024/2847/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    scope_description:
      "Regulation 2024/2847 imposing horizontal cybersecurity requirements on products with digital elements placed on the EU market. Hits commercial spacecraft components, ground-segment hardware, and embedded software with mandatory vulnerability handling, security-update obligations, and CE-mark conformity. Phased application from 2026 with full applicability December 2027.",
    key_provisions: [
      {
        section: "Annex I",
        title:
          "Essential cybersecurity requirements for products with digital elements",
        summary:
          "Security by design, vulnerability handling, SBOM, secure update mechanisms, 5-year support period.",
        complianceImplication:
          "Spacecraft flight software, ground station equipment, and satellite communication modules are 'products with digital elements' — CRA applies to manufacturers placing them on the EU market.",
      },
      {
        section: "Annex III/IV",
        title: "Product classification (Class I / Class II)",
        summary:
          "Class II products (critical infrastructure components, cryptographic hardware) require third-party conformity assessment. Class I products may use harmonised standards for self-assessment.",
      },
      {
        section: "Art. 14",
        title: "Vulnerability reporting",
        summary:
          "Actively exploited vulnerabilities must be reported to ENISA within 24 hours. Severe incidents within 72 hours. Patches within 14 days of availability.",
      },
    ],
    related_sources: ["EU-NIS2-2022"],
    caelex_engine_mapping: ["cra-engine.server", "cra-rule-engine.server"],
    caelex_data_file_mapping: ["cra-requirements.ts", "cra-taxonomy.ts"],
    notes: [
      "CRA is the only enacted EU law (not proposal) that directly affects space hardware/software cybersecurity.",
      "Full application from 11 December 2027. Reporting obligations apply from 11 September 2026.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-DORA-2022",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "PL",
      "PT",
      "SE",
    ],
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "Digital Operational Resilience Act",
    date_in_force: "2025-01-17",
    official_reference: "Verordnung (EU) 2022/2554",
    source_url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Art. 3, 28-30",
        title: "Third-party ICT risk management",
        summary:
          "Financial entities must manage ICT risks from third-party providers, including satellite communication providers. Relevant if a space operator provides critical ICT services to financial institutions.",
      },
    ],
    scope_description:
      "Only relevant for space operators that provide critical ICT services to the financial sector (e.g., SATCOM for trading platforms, timing services for financial networks).",
    related_sources: ["EU-NIS2-2022"],
    last_verified: "2026-04-13",
  },
  {
    id: "EU-EASA-2018",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "PL",
      "PT",
      "SE",
    ],
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "EASA Basic Regulation",
    date_in_force: "2018-09-11",
    official_reference: "Verordnung (EU) 2018/1139",
    source_url: "https://eur-lex.europa.eu/eli/reg/2018/1139/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Regulation 2018/1139 establishing the European Union Aviation Safety Agency. Edge-case relevance for space: covers aircraft operations including suborbital-flight transit through controlled airspace and the airspace-coordination interface for launches from EU territory.",
    key_provisions: [
      {
        section: "Art. 2(3)(d)",
        title: "Suborbital flights and airspace transition",
        summary:
          "EASA's mandate covers aircraft operations including the transition phase of space-bound vehicles through regulated airspace. Suborbital flight vehicles may fall under EASA certification.",
        complianceImplication:
          "Launch vehicles transiting European airspace interact with EASA-regulated air traffic. Coordination with national aviation authorities (LBA in Germany) is required.",
      },
    ],
    related_sources: ["DE-LUFTVG"],
    last_verified: "2026-04-13",
  },

  // ─── Cross-cutting horizontal instruments referenced from national space-law
  // entries (CER, GDPR). Listed here so cross-reference invariants resolve and
  // the country-pages can surface "applies to this jurisdiction" without each
  // member-state file duplicating the canonical text.
  {
    id: "EU-CER-2022",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "EE",
      "ES",
      "FI",
      "FR",
      "GR",
      "HR",
      "HU",
      "IE",
      "IT",
      "LU",
      "LV",
      "LT",
      "NL",
      "PL",
      "PT",
      "RO",
      "SE",
      "SI",
      "SK",
    ],
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en:
      "CER Directive — Resilience of Critical Entities (physical-resilience counterpart to NIS2)",
    date_in_force: "2023-01-16",
    official_reference: "Directive (EU) 2022/2557",
    source_url: "https://eur-lex.europa.eu/eli/dir/2022/2557/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EC"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
      "launch_provider",
    ],
    compliance_areas: ["cybersecurity", "licensing"],
    scope_description:
      "Establishes a Union-level framework for the physical resilience of critical entities across eleven sectors, including space. Complements NIS2 (Directive (EU) 2022/2555) which covers cyber resilience. Member State transposition deadline was 17 October 2024; Member State designation of critical entities followed by 17 July 2026.",
    key_provisions: [
      {
        section: "Art. 6",
        title: "Sectors and subsectors covered",
        summary:
          "Annex lists eleven critical-entity sectors. Sector 10 'Space' covers operators of ground-based infrastructure that supports the provision of space-based services, owned, managed or operated by Member States or by private parties.",
      },
      {
        section: "Art. 13",
        title: "Risk assessment and resilience measures",
        summary:
          "Each designated critical entity must conduct a risk assessment at least every four years and adopt appropriate technical, security and organisational measures to ensure resilience against incidents.",
      },
    ],
    related_sources: ["EU-NIS2-2022", "DE-KRITIS-DACHG-2026"],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-GDPR-2016",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "EE",
      "ES",
      "FI",
      "FR",
      "GR",
      "HR",
      "HU",
      "IE",
      "IT",
      "LU",
      "LV",
      "LT",
      "NL",
      "PL",
      "PT",
      "RO",
      "SE",
      "SI",
      "SK",
    ],
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "General Data Protection Regulation",
    date_in_force: "2018-05-25",
    official_reference: "Regulation (EU) 2016/679",
    source_url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EC"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
      "data_provider",
    ],
    compliance_areas: ["data_security", "cybersecurity"],
    scope_description:
      "Sets the EU-wide framework for processing personal data of natural persons. Directly applicable in all Member States. Relevant to space operators handling subscriber data for satcom/IoT services and Earth-observation operators where imagery resolves identifiable persons or vehicles.",
    key_provisions: [
      {
        section: "Art. 5",
        title: "Principles relating to processing",
        summary:
          "Personal data must be processed lawfully, fairly and transparently; collected for specified purposes; adequate, relevant and limited to what is necessary; accurate; kept no longer than necessary; processed securely.",
      },
      {
        section: "Art. 32",
        title: "Security of processing",
        summary:
          "Controllers and processors must implement appropriate technical and organisational measures, including encryption and pseudonymisation where appropriate, to ensure a level of security appropriate to the risk.",
      },
    ],
    related_sources: ["EU-NIS2-2022"],
    last_verified: "2026-04-22",
  },

  // ─── Insurance regulatory layer ───────────────────────────────────
  // Where space-insurance contract-law (DE-VVG, FR Code des assurances,
  // UK-INSURANCE-ACT-2015) sits the prudential rules governing the
  // insurers themselves. Operators procuring covers from EU-domiciled
  // insurers, and EU operators procuring from London or other third
  // countries, must be aware of these regimes — they shape capacity,
  // pricing, and the cross-border distribution model.

  {
    id: "EU-SOLVENCY-II",
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en:
      "Solvency II Directive — Prudential Regulation of EU Insurance and Reinsurance Undertakings",
    date_enacted: "2009-11-25",
    date_in_force: "2016-01-01",
    date_last_amended: "2025-12-19",
    official_reference:
      "Directive 2009/138/EC (recast by Directive (EU) 2025/2)",
    source_url: "https://eur-lex.europa.eu/eli/dir/2009/138/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["insurance"],
    scope_description:
      "Prudential framework governing capital, governance, and reporting requirements for EU-domiciled (re)insurance undertakings — the regulatory backdrop for any space-insurance capacity placed through Allianz, Munich Re, SCOR, or other EU insurers. Sets the SCR/MCR capital ratios and the Pillar-3 disclosure regime that ultimately drive premium pricing for space risks. The 2025 review (Solvency II 2.0) reduced capital charges for long-term equity and reformed the cross-border supervision regime.",
    key_provisions: [
      {
        section: "Title I, Ch. VI",
        title: "Solvency Capital Requirement (SCR)",
        summary:
          "Risk-based capital requirement covering market, credit, life, non-life, and operational risk. Space-insurance underwriting falls within the non-life module — losses cycle through the SCR calculation and feed into pricing across the European market.",
      },
      {
        section: "Title I, Ch. III",
        title: "Cross-border supervision",
        summary:
          "Single-licence framework under which an EU-authorised insurer can underwrite throughout the EU/EEA. Underpins the practical reality that a German operator can place cover with a French or Italian insurer without re-licensing.",
      },
    ],
    related_sources: ["EU-IDD", "DE-VVG", "INT-SPACE-INSURANCE-MARKET"],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-IDD",
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en:
      "Insurance Distribution Directive — Conduct of Business for Insurance Distributors",
    date_enacted: "2016-01-20",
    date_in_force: "2018-10-01",
    official_reference: "Directive (EU) 2016/97",
    source_url: "https://eur-lex.europa.eu/eli/dir/2016/97/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["insurance"],
    scope_description:
      "Harmonises the regulation of insurance distribution across the EU — registration of brokers and agents, conduct-of-business rules, demands-and-needs analysis, and product-oversight-and-governance. Relevant to operators when they engage brokers to access the EU insurance market and when their own corporate structures (e.g., self-insurance vehicles, captives) bring them within the IDD's scope as distributors.",
    key_provisions: [
      {
        section: "Art. 17-20",
        title: "Information and conduct of business",
        summary:
          "Distributors must always act honestly, fairly, and professionally in accordance with the customer's best interests. Pre-contractual information duties cover product features, distributor remuneration, and potential conflicts of interest.",
      },
      {
        section: "Art. 25",
        title: "Product oversight and governance (POG)",
        summary:
          "Product manufacturers (insurers) must maintain a product-approval process; distributors must understand the product and align distribution with the target market. Cited in space-insurance broker engagement letters.",
      },
    ],
    related_sources: ["EU-SOLVENCY-II", "INT-SPACE-INSURANCE-MARKET"],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-DORA-2022",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en:
      "Digital Operational Resilience Act (DORA) — Financial-Sector Cyber Resilience",
    date_enacted: "2022-12-14",
    date_in_force: "2025-01-17",
    official_reference: "Regulation (EU) 2022/2554",
    source_url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EC"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["cybersecurity"],
    scope_description:
      "Sector-specific cyber-resilience regulation for EU financial entities (banks, insurers, investment firms) — supersedes NIS2 sectoral rules for them. Indirectly relevant to space operators in two ways: (1) financial-sector clients of satcom/data services impose DORA-driven contractual requirements on their providers, including space-segment availability and incident-reporting obligations; (2) space operators that issue credit-default-swap-style sustainability instruments fall within DORA's perimeter.",
    key_provisions: [
      {
        section: "Art. 28-30",
        title: "ICT third-party risk management",
        summary:
          "Financial entities must oversee their ICT third-party providers (which can include satcom and ground-station operators) under prescriptive contractual and risk-management standards.",
      },
      {
        section: "Art. 31-44",
        title: "Critical ICT third-party providers",
        summary:
          "Designation regime for critical providers — when triggered, brings space-sector providers under direct ESA-led supervision via the European Supervisory Authorities.",
      },
    ],
    related_sources: ["EU-NIS2-2022", "EU-CRA-2024"],
    last_verified: "2026-04-22",
  },
];
