// src/data/legal-sources/sources/eu.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
    legislative_history: [
      // Verification trail: EUR-Lex CELEX:52025PC0335 fetched via
      // Chrome MCP on 2026-04-28 (claude-in-chrome). Procedure file
      // confirmed as 2025/0335/COD (corrected from earlier draft
      // which had 2025/0185(COD) — that number was a placeholder
      // guess and was wrong). DG DEFIS confirmed as the
      // commission-side responsible body.
      {
        date: "2025-06-25",
        type: "proposal",
        body: "European Commission · DG DEFIS (Defence Industry and Space)",
        reference: "COM(2025) 335 final · CELEX:52025PC0335",
        description:
          "Commission proposal published — Regulation on the European Space Economy. Form: Proposal for a regulation. Legal basis: Art. 114 TFEU. Forwarded to Council and Parliament on the same day. Procedure file: 2025/0335/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52025PC0335",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of document, dispatch dates to Council + Parliament, procedure number, author/responsible body, form, and legal basis confirmed against EUR-Lex CELEX:52025PC0335 'Document information' tab.",
      },
      // Forward milestones (committee designation, council general
      // approach, trilogue, adoption, promulgation, entry into
      // force) will be appended progressively as the legislative
      // procedure advances. Procedure tracker is OEIL via
      // 2025/0335/COD.
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
    amended_by: ["EU-IRIS2-CONCESSION-2024"],
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
    legislative_history: [
      {
        date: "2018-06-06",
        type: "proposal",
        body: "European Commission · DG GROW / DG DEFIS",
        reference: "COM(2018) 447 final · CELEX:52018PC0447",
        description:
          "Commission proposal for the EU Space Programme Regulation, consolidating Galileo, EGNOS, Copernicus, GOVSATCOM and SSA/SST under a single legal framework. Procedure: 2018/0236/COD. Legal basis: Art. 189(2) TFEU.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52018PC0447",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52018PC0447 referenced from the Reg (EU) 2021/696 'Adopted act' field on EUR-Lex CELEX:32021R0696. Proposal date matches signature date of adopted regulation (28/04/2021); the actual proposal date (commission adoption) is 06/06/2018 per the EUR-Lex procedure file 2018/0236/COD.",
      },
      {
        date: "2021-04-28",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Regulation (EU) 2021/696 · CELEX:32021R0696",
        description:
          "Regulation establishing the Union Space Programme and the European Union Agency for the Space Programme (EUSPA), and repealing Regulations (EU) 912/2010, (EU) 1285/2013 and (EU) 377/2014 and Decision 541/2014/EU.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32021R0696",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 28/04/2021, author EP + Council, procedure 2018/0236/COD all confirmed against EUR-Lex CELEX:32021R0696.",
      },
      {
        date: "2021-05-12",
        type: "promulgation",
        body: "Publications Office of the EU",
        reference: "OJ L 170, 12.5.2021, p. 69",
        description:
          "Regulation (EU) 2021/696 published in the Official Journal of the European Union (OJ L 170 of 12 May 2021, p. 69).",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32021R0696",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Publication date 12/05/2021 in OJ L 170 confirmed against EUR-Lex.",
      },
      {
        date: "2021-05-12",
        type: "in_force",
        body: "European Union",
        reference: "Art. 111(1) — entry into force on day of publication",
        description:
          "Regulation entered into force on the day of its publication in the Official Journal (12 May 2021), per Art. 111(1).",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32021R0696",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 12/05/2021 (per Art. 111(1)) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2021-01-01",
        type: "transition_phase",
        body: "European Union",
        reference: "Art. 111(2) — retroactive applicability",
        description:
          "Operative provisions of the Regulation apply retroactively from 1 January 2021 (start of the 2021-2027 Multiannual Financial Framework), per Art. 111(2). This is NOT the entry-into-force date (which is 12 May 2021) but the date from which the Regulation is operationally applicable.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32021R0696",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Applicability date 01/01/2021 (per Art. 111(2)) — distinct from EIF (12.5.2021). Type changed from 'in_force' to 'transition_phase' to disambiguate; the top-level date_in_force field correctly reflects the EIF date 2021-05-12.",
      },
    ],
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
    legislative_history: [
      // Verification trail: EUR-Lex CELEX:52020PC0823 (proposal) and
      // CELEX:32022L2555 (adopted directive) fetched via Chrome MCP
      // on 2026-04-28 (claude-in-chrome). Procedure file confirmed
      // as 2020/0359/COD. All milestone dates extracted from
      // EUR-Lex 'Document information' tab.
      {
        date: "2020-12-16",
        type: "proposal",
        body: "European Commission · DG CNECT",
        reference: "COM(2020) 823 final · CELEX:52020PC0823",
        description:
          "Commission proposal for a directive on measures for a high common level of cybersecurity across the Union, repealing NIS Directive 2016/1148. Forwarded to Council and Parliament on the same day. Procedure: 2020/0359/COD. Legal basis: Art. 114 TFEU.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52020PC0823",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Document date 16/12/2020, dispatch dates to Council + Parliament, author DG CNECT, procedure 2020/0359/COD all confirmed against EUR-Lex CELEX:52020PC0823.",
      },
      {
        date: "2022-12-14",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Directive (EU) 2022/2555 · CELEX:32022L2555",
        description:
          "Directive (EU) 2022/2555 signed by the co-legislators (date of document = date of signature). Author: European Parliament + Council. Procedure: 2020/0359/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022L2555",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 14/12/2022 confirmed against EUR-Lex CELEX:32022L2555.",
      },
      {
        date: "2023-01-16",
        type: "in_force",
        body: "European Union · Publications Office",
        reference: "Art. 45 NIS2 (Date pub. + 20 days)",
        description:
          "Directive entered into force on the twentieth day following publication in the Official Journal — implies OJ publication around 27 December 2022.",
        source_url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of effect 16/01/2023 (per Art. 45) confirmed against EUR-Lex CELEX:32022L2555.",
      },
      {
        date: "2024-10-17",
        type: "transition_phase",
        body: "EU Member States",
        reference: "Art. 41(1) NIS2 — transposition deadline",
        description:
          "Member-State transposition deadline (date by which Member States must adopt the national measures). Application of those measures begins 18/10/2024 per Art. 41(1).",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022L2555",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Transposition deadline 17/10/2024 (adoption) and application 18/10/2024 confirmed against EUR-Lex CELEX:32022L2555 'Date of transposition' field.",
      },
      {
        date: "2024-10-18",
        type: "repeal",
        body: "European Union",
        reference: "Art. 44 NIS2 — repeal of Directive (EU) 2016/1148",
        description:
          "NIS Directive 2016/1148 (the original NIS) repealed with effect from 18/10/2024 — replaced by NIS2 from this date.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022L2555",
        affected_sections: ["Directive (EU) 2016/1148 (repealed)"],
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Repeal of 32016L1148 with effect 18/10/2024 confirmed against EUR-Lex CELEX:32022L2555 'Modifies' field.",
      },
      {
        date: "2027-10-17",
        type: "consolidation",
        body: "European Commission",
        reference: "Art. 40 NIS2 — review",
        description:
          "Commission review deadline — by this date the Commission shall periodically review the functioning of the directive and report to the European Parliament and the Council.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022L2555",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Review deadline 17/10/2027 (per Art. 40) confirmed against EUR-Lex CELEX:32022L2555 'Deadline' field.",
      },
    ],
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
    legislative_history: [
      {
        date: "2022-09-15",
        type: "proposal",
        body: "European Commission · DG CNECT",
        reference: "COM(2022) 454 final · CELEX:52022PC0454",
        description:
          "Commission proposal for a Cyber Resilience Act — horizontal cybersecurity requirements for products with digital elements. Procedure: 2022/0272/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52022PC0454",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52022PC0454 referenced from the Reg (EU) 2024/2847 'Proposal' field on EUR-Lex CELEX:32024R2847. Procedure file 2022/0272/COD confirmed.",
      },
      {
        date: "2024-10-23",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Regulation (EU) 2024/2847 · CELEX:32024R2847",
        description:
          "Cyber Resilience Act signed by EP + Council. Procedure 2022/0272/COD. Legal basis: Art. 114 TFEU.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32024R2847",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 23/10/2024 confirmed against EUR-Lex CELEX:32024R2847 'Date of signature' field.",
      },
      {
        date: "2024-12-10",
        type: "in_force",
        body: "European Union · Publications Office",
        reference: "Art. 71(1) — Date pub. + 20 days",
        description:
          "CRA entered into force on the twentieth day following its publication in the Official Journal — implies OJ publication 20/11/2024.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32024R2847",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 10/12/2024 (per Art. 71.1) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2026-06-11",
        type: "transition_phase",
        body: "European Union",
        reference: "Art. 71(2) — Partial application",
        description:
          "First partial application of CRA provisions. Per Art. 71(2), this is the date from which certain provisions apply.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32024R2847",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Partial application date 11/06/2026 (per Art. 71.2) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2026-09-11",
        type: "transition_phase",
        body: "European Union",
        reference: "Art. 71(2) — Reporting obligations",
        description:
          "Second partial application — incident-reporting obligations under Chapter IV apply from this date.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32024R2847",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Partial application date 11/09/2026 (per Art. 71.2) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2027-12-11",
        type: "in_force",
        body: "European Union",
        reference: "Art. 71(2) — Full application",
        description:
          "Full application of all CRA provisions — date from which the regulation applies in its entirety.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32024R2847",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Full-application date 11/12/2027 (per Art. 71.2) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2030-12-11",
        type: "consolidation",
        body: "European Commission",
        reference: "Art. 70(1) — Review",
        description:
          "Commission review deadline — by this date the Commission shall periodically evaluate the CRA and report to the European Parliament and the Council.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32024R2847",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Review deadline 11/12/2030 (per Art. 70.1) confirmed against EUR-Lex Deadline field.",
      },
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
    legislative_history: [
      {
        date: "2020-09-24",
        type: "proposal",
        body: "European Commission · DG FISMA",
        reference: "COM(2020) 595 final · CELEX:52020PC0595",
        description:
          "Commission proposal for a Regulation on digital operational resilience for the financial sector (DORA). Procedure: 2020/0266/COD. Legal basis: Art. 114 TFEU.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52020PC0595",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52020PC0595 referenced from the Reg (EU) 2022/2554 'Proposal' field on EUR-Lex CELEX:32022R2554.",
      },
      {
        date: "2022-12-14",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Regulation (EU) 2022/2554 · CELEX:32022R2554",
        description:
          "DORA signed by EP + Council. Procedure: 2020/0266/COD. Author: DG FISMA.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022R2554",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 14/12/2022 confirmed against EUR-Lex CELEX:32022R2554.",
      },
      {
        date: "2023-01-16",
        type: "in_force",
        body: "European Union",
        reference: "Art. 64 — Date pub. + 20 days",
        description:
          "DORA entered into force on the twentieth day following its publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022R2554",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 16/01/2023 (per Art. 64) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2025-01-17",
        type: "in_force",
        body: "European Union",
        reference: "Art. 64 — Application",
        description:
          "DORA fully applicable — financial entities must comply with the operative provisions from this date.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022R2554",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Full-application date 17/01/2025 (per Art. 64) confirmed against EUR-Lex Date of effect field.",
      },
    ],
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
    legislative_history: [
      {
        date: "2015-12-07",
        type: "proposal",
        body: "European Commission · DG MOVE",
        reference: "COM(2015) 613 final · CELEX:52015PC0613",
        description:
          "Commission proposal for a new EASA Regulation, replacing Reg (EC) 216/2008. Procedure: 2015/0277/COD. Legal basis: Art. 100(2) TFEU. Includes provisions on suborbital flight transit through controlled airspace.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52015PC0613",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52015PC0613 referenced from the Reg (EU) 2018/1139 'Proposal' field on EUR-Lex CELEX:32018R1139.",
      },
      {
        date: "2018-07-04",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Regulation (EU) 2018/1139 · CELEX:32018R1139",
        description:
          "EASA Regulation signed by EP + Council. Establishes common rules in civil aviation including the European Union Aviation Safety Agency. Procedure: 2015/0277/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32018R1139",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 04/07/2018 confirmed against EUR-Lex CELEX:32018R1139.",
      },
      {
        date: "2018-09-11",
        type: "in_force",
        body: "European Union",
        reference: "Art. 141 — Date pub. + 20 days",
        description:
          "EASA Regulation entered into force on the twentieth day following its publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32018R1139",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 11/09/2018 (per Art. 141) confirmed against EUR-Lex Date of effect field.",
      },
    ],
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
    legislative_history: [
      {
        date: "2020-12-16",
        type: "proposal",
        body: "European Commission · DG HOME",
        reference: "COM(2020) 829 final · CELEX:52020PC0829",
        description:
          "Commission proposal for the CER Directive — resilience of critical entities. Procedure: 2020/0365/COD. Legal basis: Art. 114 TFEU. Companion proposal to NIS2.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52020PC0829",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52020PC0829 referenced from the Dir (EU) 2022/2557 'Proposal' field on EUR-Lex CELEX:32022L2557.",
      },
      {
        date: "2022-12-14",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Directive (EU) 2022/2557 · CELEX:32022L2557",
        description:
          "CER Directive signed by EP + Council. Procedure: 2020/0365/COD. Author: DG HOME.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022L2557",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 14/12/2022 confirmed against EUR-Lex CELEX:32022L2557.",
      },
      {
        date: "2023-01-16",
        type: "in_force",
        body: "European Union",
        reference: "Art. 28 — Date pub. + 20 days",
        description:
          "CER Directive entered into force on the twentieth day following its publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022L2557",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 16/01/2023 (per Art. 28) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2024-10-17",
        type: "transition_phase",
        body: "EU Member States",
        reference: "Art. 26(1) — Adoption of national measures",
        description:
          "Member States must adopt national transposition measures by this date. Application begins 18/10/2024 per Art. 26(2).",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32022L2557",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Transposition deadline 17/10/2024 + application 18/10/2024 (per Art. 26) confirmed against EUR-Lex Date of transposition field.",
      },
    ],
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
    legislative_history: [
      {
        date: "2012-01-25",
        type: "proposal",
        body: "European Commission · DG JUST",
        reference: "COM(2012) 11 final · CELEX:52012PC0011",
        description:
          "Commission proposal for the General Data Protection Regulation, replacing Directive 95/46/EC. Procedure: 2012/0011/COD. Legal basis: Art. 16 TFEU.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52012PC0011",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52012PC0011 referenced from the Reg (EU) 2016/679 'Proposal' field on EUR-Lex CELEX:32016R0679.",
      },
      {
        date: "2016-04-27",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Regulation (EU) 2016/679 · CELEX:32016R0679",
        description:
          "GDPR signed by EP + Council. Procedure: 2012/0011/COD. Author: DG JUST.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32016R0679",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 27/04/2016 confirmed against EUR-Lex CELEX:32016R0679.",
      },
      {
        date: "2016-05-24",
        type: "in_force",
        body: "European Union",
        reference: "Art. 99 — Date pub. + 20 days",
        description:
          "GDPR entered into force on the twentieth day following its publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32016R0679",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 24/05/2016 (per Art. 99) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2018-05-25",
        type: "in_force",
        body: "European Union",
        reference: "Art. 99 — Application",
        description:
          "GDPR became fully applicable. Same date as the repeal of Directive 95/46/EC (per Art. 94).",
        affected_sections: ["Directive 95/46/EC (repealed)"],
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32016R0679",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Application date 25/05/2018 (per Art. 99) and repeal of 31995L0046 confirmed against EUR-Lex Date of effect + Modifies fields.",
      },
    ],
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
    legislative_history: [
      {
        date: "2007-07-10",
        type: "proposal",
        body: "European Commission · DG FISMA",
        reference: "COM(2007) 361 final · CELEX:52007PC0361",
        description:
          "Commission proposal for the Solvency II Directive — risk-based prudential framework for insurance and reinsurance undertakings. Procedure: 2007/0143/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52007PC0361",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52007PC0361 referenced from the Dir 2009/138/EC 'Proposal' field on EUR-Lex CELEX:32009L0138.",
      },
      {
        date: "2009-11-25",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Directive 2009/138/EC · CELEX:32009L0138",
        description:
          "Solvency II Directive signed by EP + Council. Procedure 2007/0143/COD. Treaty basis: Treaty establishing the European Community (Arts. 47(2), 55, 251).",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32009L0138",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 25/11/2009 confirmed against EUR-Lex CELEX:32009L0138.",
      },
      {
        date: "2010-01-06",
        type: "in_force",
        body: "European Union",
        reference: "Art. 311 — Date pub. + 20 days",
        description:
          "Solvency II Directive entered into force on the twentieth day following its publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32009L0138",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 06/01/2010 (per Art. 311) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2015-03-31",
        type: "transition_phase",
        body: "EU Member States",
        reference: "Art. 309(1) — Transposition deadline",
        description:
          "Member-State transposition deadline (as amended by Directive 2013/58/EU 'Quick Fix').",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32009L0138",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Transposition deadline 31/03/2015 (per Art. 309.1, amended by 32013L0058) confirmed against EUR-Lex Date of transposition field.",
      },
      {
        date: "2016-01-01",
        type: "in_force",
        body: "European Union",
        reference: "Art. 311 — Application",
        description:
          "Solvency II became applicable on 1 January 2016 (date from which insurance and reinsurance undertakings must comply).",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32009L0138",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Application date 01/01/2016 confirmed against EUR-Lex Date of effect field.",
      },
    ],
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
    legislative_history: [
      {
        date: "2012-07-03",
        type: "proposal",
        body: "European Commission · DG FISMA",
        reference: "COM(2012) 360 final · CELEX:52012PC0360",
        description:
          "Commission proposal for the Insurance Distribution Directive (IDD), recasting the original 2002 Insurance Mediation Directive. Procedure: 2012/0175/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52012PC0360",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52012PC0360 referenced from the Dir (EU) 2016/97 'Proposal' field on EUR-Lex CELEX:32016L0097.",
      },
      {
        date: "2016-01-20",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Directive (EU) 2016/97 · CELEX:32016L0097",
        description:
          "IDD signed by EP + Council. Procedure 2012/0175/COD. Legal basis: Arts. 53(1) and 62 TFEU.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32016L0097",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 20/01/2016 confirmed against EUR-Lex CELEX:32016L0097.",
      },
      {
        date: "2016-02-22",
        type: "in_force",
        body: "European Union",
        reference: "Art. 45 — Date pub. + 20 days",
        description:
          "IDD entered into force on the twentieth day following its publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32016L0097",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-in-force date 22/02/2016 (per Art. 45) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2018-07-01",
        type: "transition_phase",
        body: "EU Member States",
        reference: "Art. 42(1) — Transposition deadline",
        description:
          "Member-State transposition deadline as adjusted by Directive (EU) 2018/411. Application by 01/10/2018 at the latest.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32016L0097",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Transposition deadline 01/07/2018 + application 01/10/2018 (per Art. 42, amended by 32018L0411) confirmed against EUR-Lex Date of transposition field.",
      },
    ],
    last_verified: "2026-04-28",
  },

  // ─── EU Space Programme deep-dive ──────────────────────────────────
  // Programme-specific legal instruments under the umbrella of the
  // Space Programme Regulation 2021/696. Operators interacting with
  // Galileo/EGNOS PRS, Copernicus data policy, GOVSATCOM, IRIS², or the
  // EU SST framework hit one of these texts directly.

  {
    id: "EU-GALILEO-PRS-2011",
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en:
      "Decision No 1104/2011/EU on the Galileo Public Regulated Service (PRS)",
    date_enacted: "2011-10-25",
    date_in_force: "2011-11-05",
    official_reference: "Decision 1104/2011/EU",
    source_url: "https://eur-lex.europa.eu/eli/dec/2011/1104/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EUSPA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum", "cybersecurity"],
    scope_description:
      "Operative legal framework for Galileo's encrypted Public Regulated Service. PRS access is restricted to authorised Government users designated by Member States; commercial operators with PRS-receiver integration require Member-State Competent PRS Authority approval and EUSPA security accreditation. The hardware export-control overlay routes through the EU Dual-Use Regulation Annex IV.",
    key_provisions: [
      {
        section: "Art. 3-5",
        title: "Authorised PRS users",
        summary:
          "PRS access is reserved to Government users (defence, civil protection, customs) designated by a Member State Competent PRS Authority (CPA). Commercial-resale models are prohibited; bona-fide partner contractors may be authorised on a case-by-case basis.",
      },
      {
        section: "Art. 8 + Annex",
        title: "Common minimum standards",
        summary:
          "Member States must adopt common minimum security standards covering cryptographic-key management, equipment certification, and personnel clearance before authorising PRS use.",
      },
    ],
    related_sources: ["EU-SPACE-PROG-2021", "DE-DUALUSE-2021"],
    legislative_history: [
      {
        date: "2010-10-08",
        type: "proposal",
        body: "European Commission",
        reference: "COM(2010) 550 final · CELEX:52010PC0550",
        description:
          "Commission proposal for the Galileo PRS Decision. Procedure: 2010/0282/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52010PC0550",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52010PC0550 referenced from the Decision 1104/2011/EU 'Proposal' field on EUR-Lex CELEX:32011D1104.",
      },
      {
        date: "2011-10-25",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Decision No 1104/2011/EU · CELEX:32011D1104",
        description:
          "Galileo PRS Decision signed by EP + Council. Establishes rules for access to the Galileo Public Regulated Service. Procedure 2010/0282/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32011D1104",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of document 25/10/2011 confirmed against EUR-Lex CELEX:32011D1104.",
      },
      {
        date: "2011-11-05",
        type: "in_force",
        body: "European Union",
        reference: "Art. 16(1) — Date pub. + 1 day",
        description:
          "Decision entered into force the day following its publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32011D1104",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 05/11/2011 (per Art. 16.1) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2013-11-06",
        type: "in_force",
        body: "European Union",
        reference: "Art. 16(2) — Partial application",
        description:
          "Partial application of the Decision (specific provisions become operative).",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32011D1104",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Partial application date 06/11/2013 (per Art. 16.2) confirmed against EUR-Lex Date of effect field.",
      },
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-COPERNICUS-DATA-POLICY",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en:
      "Commission Delegated Regulation (EU) No 1159/2013 — Copernicus Data and Information Policy",
    date_enacted: "2013-07-12",
    date_in_force: "2013-12-09",
    official_reference: "Regulation (EU) 1159/2013",
    source_url: "https://eur-lex.europa.eu/eli/reg_del/2013/1159/oj",
    issuing_body: "European Commission",
    competent_authorities: ["EU-EC", "EU-EUSPA"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator"],
    compliance_areas: ["data_security", "frequency_spectrum"],
    scope_description:
      "Establishes the Copernicus full-and-open data and information policy with carve-outs for security restrictions. Defines what users may do with Sentinel data, the redistribution conditions, and the Commission's authority to invoke security restrictions on a per-mission basis. Operators integrating Copernicus data into downstream services must respect the policy's attribution and redistribution clauses.",
    key_provisions: [
      {
        section: "Art. 3",
        title: "Free, full, and open access",
        summary:
          "Sentinel data and Copernicus information products are made available to all users without charge, subject to attribution and the security-restrictions framework.",
      },
      {
        section: "Art. 12",
        title: "Security restrictions",
        summary:
          "The Commission, in consultation with Member States, may restrict access to specific Copernicus data or products on national-security grounds — historically invoked sparingly but the legal basis is in place.",
      },
    ],
    related_sources: ["EU-SPACE-PROG-2021"],
    legislative_history: [
      {
        date: "2013-07-12",
        type: "promulgation",
        body: "European Commission",
        reference:
          "Commission Delegated Regulation (EU) No 1159/2013 · CELEX:32013R1159",
        description:
          "Commission Delegated Regulation supplementing Reg (EU) 911/2010 (GMES initial-operations regulation) with Copernicus data and information policy. Form: Delegated regulation under Art. 9(2) of Reg 911/2010.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32013R1159",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of document 12/07/2013, author European Commission, form Delegated regulation, legal basis 32010R0911 Art. 9(2) confirmed against EUR-Lex CELEX:32013R1159.",
      },
      {
        date: "2013-12-09",
        type: "in_force",
        body: "European Union",
        reference: "Art. 19 — Date pub. + 20 days",
        description:
          "Copernicus Data Policy Regulation entered into force on the twentieth day following publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32013R1159",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 09/12/2013 (per Art. 19) confirmed against EUR-Lex Date of effect field.",
      },
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-IRIS2-CONCESSION-2024",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "Regulation (EU) 2023/588 — IRIS² Secure Connectivity Programme",
    date_enacted: "2023-03-15",
    date_in_force: "2023-03-20",
    official_reference: "Regulation (EU) 2023/588",
    source_url: "https://eur-lex.europa.eu/eli/reg/2023/588/oj",
    issuing_body: "European Parliament and Council",
    amends: "EU-SPACE-PROG-2021",
    competent_authorities: ["EU-EC", "EU-EUSPA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["cybersecurity", "frequency_spectrum", "licensing"],
    scope_description:
      "Establishes the IRIS² (Infrastructure for Resilience, Interconnection and Security by Satellite) sovereign connectivity programme — a dual-use governmental + commercial constellation in MEO/LEO. The 2024 IRIS² Concession Contract awarded to the SpaceRISE consortium operationalises Government-led procurement of secure connectivity through 2040, with explicit cybersecurity, supply-chain, and ITAR-free design obligations.",
    key_provisions: [
      {
        section: "Art. 9",
        title: "Concession-based procurement",
        summary:
          "EU procures the IRIS² secure connectivity service via a concession contract awarded to a consortium (SpaceRISE: Eutelsat-OneWeb / SES / Hispasat / Airbus / Thales / OHB). Concession horizon is 2024-2040 with milestone-linked payments.",
      },
      {
        section: "Art. 10-11",
        title: "Sovereignty and supply-chain controls",
        summary:
          "Constellation must use EU-controlled supply chains and ITAR-free components for the governmental layer. Cyber-resilience requirements built on NIS2 + CRA baseline plus ESA security accreditation.",
      },
    ],
    related_sources: [
      "EU-SPACE-PROG-2021",
      "EU-NIS2-2022",
      "EU-CRA-2024",
      "INT-ESA-CONV-1975",
    ],
    legislative_history: [
      {
        date: "2022-02-15",
        type: "proposal",
        body: "European Commission · DG DEFIS",
        reference: "COM(2022) 57 final · CELEX:52022PC0057",
        description:
          "Commission proposal for the IRIS² Secure Connectivity Programme — EU-owned multi-orbit constellation. Procedure: 2022/0039/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52022PC0057",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52022PC0057 referenced from the Reg (EU) 2023/588 'Proposal' field on EUR-Lex CELEX:32023R0588.",
      },
      {
        date: "2023-03-15",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Regulation (EU) 2023/588 · CELEX:32023R0588",
        description:
          "IRIS² Secure Connectivity Programme Regulation signed by EP + Council. Procedure 2022/0039/COD. Legal basis: Art. 189(2) TFEU.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32023R0588",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of signature 15/03/2023 confirmed against EUR-Lex CELEX:32023R0588.",
      },
      {
        date: "2023-03-20",
        type: "in_force",
        body: "European Union",
        reference: "Art. 50 — Date pub. + 3 days",
        description:
          "IRIS² Regulation entered into force on the third day following its publication in the Official Journal — fast-track entry typical for budget-attached programmes.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32023R0588",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 20/03/2023 (per Art. 50) confirmed against EUR-Lex Date of effect field.",
      },
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-GOVSATCOM-DEC",
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en:
      "EU Governmental Satellite Communications (GOVSATCOM) — Programme Component under Reg. 2021/696",
    date_in_force: "2021-05-12",
    official_reference: "Regulation (EU) 2021/696, Title VIII",
    source_url: "https://eur-lex.europa.eu/eli/reg/2021/696/oj#d1e3050-44-1",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EUSPA"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity", "frequency_spectrum"],
    scope_description:
      "Bridge programme between national/commercial satellite-communications capacity and the future IRIS² sovereign capability. EUSPA aggregates Government demand and procures pooled and shared capacity from Member State and commercial operators under common security accreditation. Active 2022-2030 until IRIS² fully operational.",
    key_provisions: [
      {
        section: "Title VIII Reg. 2021/696",
        title: "Governmental-user pool",
        summary:
          "Authorised Government users from Member States access pooled GOVSATCOM capacity through EUSPA-led procurement; capacity provided by Member State commercial operators (Eutelsat, SES, Hispasat) under uniform security-accreditation conditions.",
      },
    ],
    related_sources: ["EU-SPACE-PROG-2021", "EU-IRIS2-CONCESSION-2024"],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-SST-DECISION",
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en:
      "Decision (EU) 2014/541 — EU Space Surveillance and Tracking (SST) Support Framework",
    date_enacted: "2014-04-16",
    date_last_amended: "2021-05-12",
    official_reference: "Decision No 541/2014/EU (now Reg. 2021/696 Title V)",
    source_url: "https://eur-lex.europa.eu/eli/dec/2014/541/oj",
    issuing_body: "European Parliament and Council",
    superseded_by: "EU-SPACE-PROG-2021",
    competent_authorities: ["EU-EUSPA"],
    relevance_level: "medium",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "in_orbit_services",
    ],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "EU Space Surveillance and Tracking framework — the EU's coordinated capability for cataloguing space objects and providing collision-avoidance, re-entry, and fragmentation alerts. Now subsumed under the Space Programme Regulation 2021/696 Title V. EU-SST services are free for Member State operators and form a primary input into European operator collision-avoidance procedures.",
    key_provisions: [
      {
        section: "Reg. 2021/696 Art. 53-58",
        title: "EU-SST consortium and services",
        summary:
          "EU-SST consortium (FR/DE/IT/ES/PL/RO/PT) provides catalogue maintenance, collision-avoidance alerts, re-entry alerts, and fragmentation analysis to authorised users.",
      },
    ],
    related_sources: ["EU-SPACE-PROG-2021", "INT-ISO-24113", "INT-LTS-2019"],
    legislative_history: [
      {
        date: "2013-02-28",
        type: "proposal",
        body: "European Commission",
        reference: "COM(2013) 107 final · CELEX:52013PC0107",
        description:
          "Commission proposal for the SST Support Framework Decision. Procedure: 2013/0064/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:52013PC0107",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Proposal CELEX 52013PC0107 referenced from the Decision 541/2014/EU 'Proposal' field on EUR-Lex CELEX:32014D0541.",
      },
      {
        date: "2014-04-16",
        type: "adoption",
        body: "European Parliament and Council of the European Union",
        reference: "Decision No 541/2014/EU · CELEX:32014D0541",
        description:
          "SST Support Framework Decision signed by EP + Council. Establishes a Union framework for Space Surveillance and Tracking. Procedure 2013/0064/COD.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32014D0541",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Date of document 16/04/2014 confirmed against EUR-Lex CELEX:32014D0541.",
      },
      {
        date: "2014-06-16",
        type: "in_force",
        body: "European Union",
        reference: "Art. 13 — Date pub. + 20 days",
        description:
          "SST Decision entered into force on the twentieth day following publication in the Official Journal.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32014D0541",
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Entry-into-force date 16/06/2014 (per Art. 13) confirmed against EUR-Lex Date of effect field.",
      },
      {
        date: "2020-12-31",
        type: "supersession",
        body: "European Union",
        reference: "Repealed by Reg (EU) 2021/696 · CELEX:32021R0696",
        description:
          "Decision 541/2014/EU repealed with effect from 31/12/2020 — SST framework absorbed into Title V of the Space Programme Regulation 2021/696.",
        source_url:
          "https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:32014D0541",
        affected_sections: ["Decision 541/2014/EU (repealed)"],
        verified: true,
        verified_by:
          "claude (claude-in-chrome MCP, EUR-Lex Document Information tab)",
        verified_at: "2026-04-28",
        verification_note:
          "Repeal effective 31/12/2020 by Reg 2021/696 confirmed against EUR-Lex Date of end of validity field.",
      },
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-ESA-FFPA-2024",
    jurisdiction: "EU",
    type: "policy_document",
    status: "in_force",
    title_en:
      "EU-ESA Financial Framework Partnership Agreement (FFPA) — 2024 Renewal",
    date_published: "2024-07-04",
    source_url: "https://www.esa.int/About_Us/Corporate_news/EU-ESA_FFPA",
    issuing_body: "European Commission and European Space Agency",
    competent_authorities: ["EU-EC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Operative financial framework governing EU-funded ESA programmes (Galileo, EGNOS, Copernicus, GOVSATCOM, IRIS²). The 2024 renewal extended the partnership through 2027 with revised governance and procurement provisions. Critical context for any operator participating in EU-funded ESA tenders — defines geo-return rules, IP allocation, and dispute-resolution.",
    key_provisions: [
      {
        section: "Procurement rules",
        title: "EU-funded ESA tenders",
        summary:
          "Tender rules for EU-funded ESA programmes track ESA's industrial-policy framework with EU-specific overlays on geographic distribution, security accreditation, and IP retention.",
      },
    ],
    related_sources: ["EU-SPACE-PROG-2021", "INT-ESA-CONV-1975"],
    last_verified: "2026-04-22",
  },

  // ─── EU horizontal regulations adjacent to space ───────────────────

  {
    id: "EU-CRMA-2024",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "Critical Raw Materials Act — Regulation (EU) 2024/1252",
    date_enacted: "2024-04-11",
    date_in_force: "2024-05-23",
    official_reference: "Regulation (EU) 2024/1252",
    source_url: "https://eur-lex.europa.eu/eli/reg/2024/1252/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "EU regulatory framework securing supply of strategic and critical raw materials. Direct relevance to space: the Strategic Raw Materials list captures rare-earth elements, gallium, germanium, lithium, and platinum-group metals used in spacecraft electronics, propulsion, and structures. Requires Member State authorities to identify and assess strategic projects, and imposes monitoring on supply-chain risk for designated technologies.",
    key_provisions: [
      {
        section: "Annex I",
        title: "Strategic Raw Materials list",
        summary:
          "34 critical raw materials and 17 strategic raw materials including rare earths (Nd, Dy, Pr, Tb), gallium, germanium, lithium, platinum-group metals, magnesium, silicon-metal — all heavily used in spacecraft electronics and structures.",
      },
      {
        section: "Art. 6",
        title: "Strategic projects framework",
        summary:
          "Member States and the Commission designate Strategic Projects with priority-permitting and financing access. Space-supply-chain projects (e.g., EU sovereign rare-earth processing, SiC wafer fabs) qualify.",
      },
    ],
    related_sources: ["EU-SPACE-PROG-2021", "EU-IRIS2-CONCESSION-2024"],
    last_verified: "2026-04-22",
  },

  {
    id: "EU-FSR-2022",
    jurisdiction: "EU",
    type: "eu_regulation",
    status: "in_force",
    title_en: "EU Foreign Subsidies Regulation",
    date_enacted: "2022-12-14",
    date_in_force: "2023-07-12",
    official_reference: "Regulation (EU) 2022/2560",
    source_url: "https://eur-lex.europa.eu/eli/reg/2022/2560/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "EU instrument addressing distortions to the EU internal market caused by non-EU State subsidies received by undertakings active in the EU. Direct relevance to space M&A and procurement: notification thresholds capture acquisitions of EU operators above EUR 500m turnover and public-procurement bids above EUR 250m — routine in space-sector consolidation. Captures Chinese-State-subsidised acquirers and Russian/MENA sovereign-fund participation.",
    key_provisions: [
      {
        section: "Art. 19-23",
        title: "Concentration notification",
        summary:
          "Acquisitions of EU undertakings with EU turnover above EUR 500m and acquirer foreign-financial-contributions above EUR 50m require ex-ante notification. Captures private-equity-led space-sector consolidation.",
      },
      {
        section: "Art. 28-29",
        title: "Public procurement notification",
        summary:
          "Bids in EU public-procurement procedures above EUR 250m require notification of foreign financial contributions. Hits ESA and Member State space-procurement at the prime-contractor level.",
      },
    ],
    related_sources: ["EU-SOLVENCY-II"],
    last_verified: "2026-04-22",
  },

  // ─── Verified additions: Environmental + STM tranche ──────────────

  {
    id: "EU-EIA-DIR-2011-92",
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en:
      "Environmental Impact Assessment Directive (Directive 2011/92/EU, as amended by 2014/52/EU)",
    date_enacted: "2011-12-13",
    date_last_amended: "2014-04-16",
    official_reference: "Directive 2011/92/EU (consolidated post-2014/52)",
    source_url: "https://eur-lex.europa.eu/eli/dir/2011/92/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["EU-EC"],
    relevance_level: "high",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["environmental", "licensing"],
    scope_description:
      "EU directive requiring environmental-impact assessment for public and private projects likely to have significant environmental effects. Annex I lists projects requiring mandatory EIA (large industrial installations, certain transport infrastructure); Annex II lists projects subject to Member-State screening. Spaceport construction and major launch-site upgrades fall under Annex II screening; the 2014/52 amendment tightened the screening criteria and introduced mandatory Member-State 'reasoned conclusions' on environmental impact. Implemented domestically by Member States — UK Regs 2017/571, German UVPG, French Code de l'environnement Art. L122, etc.",
    key_provisions: [
      {
        section: "Art. 4",
        title: "Screening",
        summary:
          "Member States shall determine whether the project is to be made subject to an EIA — Annex I projects always; Annex II via case-by-case examination.",
      },
      {
        section: "Art. 5-7",
        title: "Scoping and consultation",
        summary:
          "Developer must provide a scoping report; consultation with environmental authorities and the public; transboundary consultation if effects extend across Member State borders.",
      },
      {
        section: "Art. 8a (post-2014)",
        title: "Reasoned conclusion",
        summary:
          "Competent authority shall include a reasoned conclusion on the significant effects of the project on the environment, integrated into the development consent.",
      },
    ],
    related_sources: ["EU-HABITATS-DIR-92-43", "INT-AARHUS-1998"],
    last_verified: "2026-04-27",
  },

  {
    id: "EU-HABITATS-DIR-92-43",
    jurisdiction: "EU",
    type: "eu_directive",
    status: "in_force",
    title_en:
      "Habitats Directive (Directive 92/43/EEC on the conservation of natural habitats and of wild fauna and flora)",
    date_enacted: "1992-05-21",
    date_last_amended: "2013-05-13",
    official_reference: "Directive 92/43/EEC",
    source_url: "https://eur-lex.europa.eu/eli/dir/1992/43/oj",
    issuing_body: "Council of the European Union",
    competent_authorities: ["EU-EC"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental", "licensing"],
    scope_description:
      "Foundation of the Natura 2000 ecological network. Article 6(3) requires an 'appropriate assessment' for any plan or project likely to have a significant effect on a Natura 2000 site, alone or in combination with other projects. Several EU spaceports and launch corridors intersect with Natura 2000 areas (notably along Atlantic and Mediterranean coastlines and in Scandinavian boreal-zone sites), so Habitats-Directive review is a recurring component of European launch-site authorisation.",
    key_provisions: [
      {
        section: "Art. 6(3)",
        title: "Appropriate assessment",
        summary:
          "Plans or projects likely to have a significant effect on a Natura 2000 site shall be subject to appropriate assessment of implications for the site's conservation objectives.",
      },
      {
        section: "Art. 6(4)",
        title: "Imperative reasons of overriding public interest",
        summary:
          "Where assessment is negative but the project must proceed for imperative reasons of overriding public interest, Member State must take all compensatory measures necessary.",
      },
    ],
    related_sources: ["EU-EIA-DIR-2011-92"],
    last_verified: "2026-04-27",
  },

  {
    id: "EU-STM-STRATEGY-2022",
    jurisdiction: "EU",
    type: "policy_document",
    status: "in_force",
    title_en:
      "EU Space Traffic Management Strategy — Joint Communication JOIN(2022) 4 final",
    date_published: "2022-02-15",
    official_reference: "JOIN(2022) 4 final",
    source_url:
      "https://defence-industry-space.ec.europa.eu/eu-approach-space-traffic-management_en",
    issuing_body:
      "European Commission and High Representative of the Union for Foreign Affairs and Security Policy",
    competent_authorities: ["EU-EC", "EU-EUSPA"],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["space_traffic_management", "debris_mitigation"],
    scope_description:
      "Joint Communication setting out the EU's STM ambition: develop a coordinated EU STM capability building on the EU-SST partnership, contribute to international STM standards, develop EU-level operational STM services, and address the regulatory dimension (potential future EU Space Law on STM). Followed by EU Space Act (COM(2025) 335) which integrates STM provisions in its draft Title VI.",
    key_provisions: [
      {
        section: "§ 2 — Operational pillar",
        title: "EU-level STM services",
        summary:
          "EU-SST partnership to evolve into the operational backbone for EU STM, complemented by additional services (re-entry analysis, fragmentation analysis, manoeuvre coordination).",
      },
      {
        section: "§ 4 — Regulatory pillar",
        title: "Future EU STM regulation",
        summary:
          "Commission to propose EU-level legislation addressing STM where Member State frameworks are insufficient — pursued through the EU Space Act draft.",
      },
    ],
    related_sources: [
      "EU-SST-DECISION",
      "EU-SPACE-PROG-2021",
      "EU-SPACE-ACT",
      "INT-IADC-MITIGATION-2025",
    ],
    last_verified: "2026-04-27",
  },
];
