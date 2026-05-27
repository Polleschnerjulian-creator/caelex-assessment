// src/data/legal-sources/sources/sg.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Singapore — space-law sources and authorities.
 *
 * Singapore is a major Asia-Pacific satcom hub: OneWeb gateway, ST
 * Engineering Satellite Systems, SingTel + Optus partnerships,
 * Hughes APAC HQ. Office of Space Technology and Industry (OSTIn) was
 * formed in 2024 under the Economic Development Board to centralise
 * sector promotion. No dedicated Space Act yet — regime built from
 * Telecommunications Act + Strategic Goods Control Act + sector-by-
 * sector IMDA licensing.
 *
 * Atlas P1 (2026-05-26): new jurisdiction, target 20 sources per
 * ATLAS-CORPUS-EXPANSION-PLAN.md § 5.C.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_SG: Authority[] = [
  {
    id: "SG-OSTIN",
    jurisdiction: "SG",
    name_en: "Office of Space Technology and Industry",
    name_local: "Office of Space Technology and Industry",
    abbreviation: "OSTIn",
    parent_ministry:
      "Economic Development Board, Ministry of Trade and Industry",
    website: "https://www.edb.gov.sg/en/about-edb/space-industry.html",
    space_mandate:
      "Centralises Singapore's space-industry promotion + policy coordination across MTI / IMDA / DSTA / NRF. Established Feb 2024 under EDB. Lead public-sector counterparty for foreign space firms exploring Singapore investment. Not itself a licensing authority — IMDA, MTI Strategic Goods Control Office, and CSA hold the regulatory powers.",
    legal_basis:
      "Economic Development Board Act (Cap. 85); MTI ministerial directive 2024",
    applicable_areas: ["licensing"],
  },
  {
    id: "SG-IMDA",
    jurisdiction: "SG",
    name_en: "Info-communications Media Development Authority",
    name_local: "Info-communications Media Development Authority",
    abbreviation: "IMDA",
    parent_ministry: "Ministry of Communications and Information",
    website: "https://www.imda.gov.sg/",
    space_mandate:
      "National telecommunications regulator. Issues facilities-based operator (FBO) and services-based operator (SBO) licences — both required for satcom services into Singapore. National notifying administration for ITU filings. Manages frequency allocations + earth-station authorisations for satellite operators serving the Singapore market.",
    legal_basis: "Telecommunications Act 1999 (Cap. 323)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "SG-STCO",
    jurisdiction: "SG",
    name_en: "Strategic Goods Control Office, Singapore Customs",
    name_local: "Strategic Goods Control Office",
    abbreviation: "STCO",
    parent_ministry: "Ministry of Trade and Industry",
    website: "https://www.customs.gov.sg/businesses/strategic-goods-control",
    space_mandate:
      "Enforces the Strategic Goods (Control) Act 2002 — Singapore's export-control framework. Maintains Singapore's Strategic Goods Control List (substantially aligned to Wassenaar / MTCR / NSG). Issues TradeNet permits for export, transhipment, and brokering of dual-use space items including satellites, launch components, and GNSS receivers.",
    legal_basis: "Strategic Goods (Control) Act 2002",
    applicable_areas: ["export_control"],
  },
  {
    id: "SG-CSA",
    jurisdiction: "SG",
    name_en: "Cyber Security Agency of Singapore",
    name_local: "Cyber Security Agency",
    abbreviation: "CSA",
    parent_ministry: "Prime Minister's Office",
    website: "https://www.csa.gov.sg/",
    space_mandate:
      "National cyber agency. Designates Critical Information Infrastructure (CII) sectors — satcom infrastructure serving Singapore government + finance + transport falls within CSA designation power. Cybersecurity Act 2018 imposes incident-reporting + audit obligations on designated CII owners.",
    legal_basis: "Cybersecurity Act 2018",
    applicable_areas: ["cybersecurity", "critical_infrastructure"],
  },
  {
    id: "SG-PDPC",
    jurisdiction: "SG",
    name_en: "Personal Data Protection Commission",
    name_local: "Personal Data Protection Commission",
    abbreviation: "PDPC",
    parent_ministry: "Ministry of Communications and Information",
    website: "https://www.pdpc.gov.sg/",
    space_mandate:
      "Singapore's data-protection authority. Enforces the Personal Data Protection Act 2012 (PDPA) on satcom subscriber data, satellite-imagery-derived personal data, and ground-station operator data flows. Cross-border data transfers governed by PDPC standard contractual clauses.",
    legal_basis: "Personal Data Protection Act 2012",
    applicable_areas: ["data_security"],
  },
  {
    id: "SG-CCCS",
    jurisdiction: "SG",
    name_en: "Competition and Consumer Commission of Singapore",
    name_local: "Competition and Consumer Commission of Singapore",
    abbreviation: "CCCS",
    parent_ministry: "Ministry of Trade and Industry",
    website: "https://www.cccs.gov.sg/",
    space_mandate:
      "Antitrust + consumer-protection regulator. Reviewed the 2022 Eutelsat-OneWeb merger from a Singapore-market perspective (OneWeb operates a primary APAC gateway in Singapore). Approves space-services market concentrations affecting Singapore.",
    legal_basis: "Competition Act 2004; Consumer Protection (Fair Trading) Act",
    applicable_areas: ["competition_antitrust", "consumer_protection"],
  },
];

export const LEGAL_SOURCES_SG: LegalSource[] = [
  // ─── Foundational / treaties ──────────────────────────────────────────
  {
    id: "SG-OST-1976",
    jurisdiction: "SG",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Singapore Accession",
    date_enacted: "1976-09-10",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of Singapore",
    competent_authorities: ["SG-OSTIN"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Singapore acceded to the OST in 1976. State-responsibility under Art. VI not yet discharged through a dedicated Space Act — Singapore relies on the Telecommunications Act + Strategic Goods Control + sector-by-sector licensing. OSTIn announced a future Space Act review in 2024.",
    key_provisions: [],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-05-26",
  },

  // ─── Industry promotion ──────────────────────────────────────────────
  {
    id: "SG-OSTIN-CHARTER-2024",
    jurisdiction: "SG",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Office of Space Technology and Industry — Charter and 2024 Strategic Roadmap",
    date_published: "2024-02-19",
    source_url: "https://www.edb.gov.sg/en/about-edb/space-industry.html",
    issuing_body: "Economic Development Board",
    competent_authorities: ["SG-OSTIN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Establishes OSTIn within EDB. Articulates Singapore's space-industry strategy 2024-2030: $150M S-DAP grant programme, geographical positioning as APAC space-ops hub, alignment with ASEAN Space Cooperation Framework. Frames Singapore's eventual Space Act drafting timeline.",
    key_provisions: [],
    related_sources: ["SG-S-DAP-2024", "SG-ASEAN-SPACE-COOP"],
    last_verified: "2026-05-26",
  },
  {
    id: "SG-S-DAP-2024",
    jurisdiction: "SG",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Space Technology Development Programme (S-DAP) — $150M Grant Framework",
    date_published: "2024-02-19",
    source_url: "https://www.edb.gov.sg/en/about-edb/space-industry.html",
    issuing_body: "Economic Development Board / OSTIn",
    competent_authorities: ["SG-OSTIN"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["state_aid", "procurement"],
    scope_description:
      "$150M development-aid programme co-funded between EDB + NRF, targeting Singapore-based space startups + R&D. State-aid construct: open application, public criteria. Cited by EU FSR diligence when Singapore-based subsidiaries of EU space firms apply for EDB grants.",
    key_provisions: [],
    related_sources: ["SG-OSTIN-CHARTER-2024"],
    last_verified: "2026-05-26",
  },

  // ─── Frequency / telecoms ────────────────────────────────────────────
  {
    id: "SG-TELECOMS-ACT-1999",
    jurisdiction: "SG",
    type: "federal_law",
    status: "in_force",
    title_en: "Telecommunications Act 1999",
    date_enacted: "1999-08-01",
    date_last_amended: "2023-01-01",
    official_reference: "Cap. 323",
    source_url: "https://sso.agc.gov.sg/Act/TA1999",
    issuing_body: "Parliament of Singapore",
    competent_authorities: ["SG-IMDA"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["frequency_spectrum", "licensing"],
    scope_description:
      "Foundational telecoms statute. Establishes IMDA's licensing powers over facilities-based operators (FBO licence) and services-based operators (SBO). Any satellite-services provider serving Singapore subscribers needs an SBO licence; ground-stations within Singapore territory need an FBO licence. Earth-station authorisations issued under sectoral regulations.",
    key_provisions: [
      {
        section: "Part III, ss. 5-9",
        title: "Licensing of telecommunication systems and services",
        summary:
          "FBO + SBO licence requirements. Foreign-ownership restrictions for FBO licensees (15-25% non-Singapore-resident shareholder cap subject to ministerial waiver).",
      },
    ],
    related_sources: ["SG-IMDA-SAT-LICENSING"],
    last_verified: "2026-05-26",
  },
  {
    id: "SG-IMDA-SAT-LICENSING",
    jurisdiction: "SG",
    type: "federal_regulation",
    status: "in_force",
    title_en: "IMDA Satellite Earth Station Authorisation Framework",
    date_enacted: "2018-06-01",
    source_url:
      "https://www.imda.gov.sg/regulations-and-licensing-listing/satellite-services",
    issuing_body: "Info-communications Media Development Authority",
    competent_authorities: ["SG-IMDA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Sectoral authorisation framework for satellite earth stations. Differentiated treatment for fixed VSAT terminals, mobile earth stations, and gateway stations. OneWeb's Singapore gateway operates under this framework.",
    key_provisions: [],
    related_sources: ["SG-TELECOMS-ACT-1999"],
    last_verified: "2026-05-26",
  },
  {
    id: "SG-ITU-NOTIFYING-ADMIN",
    jurisdiction: "SG",
    type: "policy_document",
    status: "in_force",
    title_en: "Singapore as ITU Notifying Administration",
    date_published: "2018-01-01",
    source_url:
      "https://www.imda.gov.sg/regulations-and-licensing-listing/satellite-services",
    issuing_body: "IMDA",
    competent_authorities: ["SG-IMDA"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Singapore is an active ITU notifying administration for satellite networks. Singapore-flagged operators submit API/CR/N filings through IMDA. Foreign operators occasionally use a Singapore SPV + Singapore-flagged filing to access desired ITU priority dates — IMDA tightened criteria 2023 to require demonstrable Singapore operational nexus.",
    key_provisions: [],
    related_sources: ["INT-ITU-RR"],
    last_verified: "2026-05-26",
  },

  // ─── Export control + sanctions ──────────────────────────────────────
  {
    id: "SG-SGCA-2002",
    jurisdiction: "SG",
    type: "federal_law",
    status: "in_force",
    title_en: "Strategic Goods (Control) Act 2002",
    date_enacted: "2002-12-30",
    date_last_amended: "2018-01-01",
    official_reference: "Cap. 300",
    source_url: "https://sso.agc.gov.sg/Act/SGCA2002",
    issuing_body: "Parliament of Singapore",
    competent_authorities: ["SG-STCO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "export_control",
      "sanctions_compliance",
      "military_dual_use",
    ],
    scope_description:
      "Singapore's primary export-control statute. Lists are aligned with Wassenaar / MTCR / NSG / Australia Group (Singapore is a Wassenaar member). Captures satellites, launch components, GNSS receivers, space-grade ICs, and dual-use space materials. Re-export + transhipment provisions catch foreign-origin Chinese/Russian space items routed through the Port of Singapore.",
    key_provisions: [
      {
        section: "Part II, ss. 4-10",
        title: "Permit required for strategic goods",
        summary:
          "Export, transhipment, brokering, and intangible technology transfer of items on the SGCA Control List require a TradeNet permit. Extraterritorial reach to Singapore nationals + Singapore-incorporated entities.",
      },
    ],
    related_sources: ["INT-WASSENAAR"],
    last_verified: "2026-05-26",
  },
  {
    id: "SG-MAS-SANCTIONS-FRAMEWORK",
    jurisdiction: "SG",
    type: "federal_regulation",
    status: "in_force",
    title_en: "MAS Sanctions Framework — UNSC + Targeted Financial Sanctions",
    date_enacted: "2020-09-01",
    source_url:
      "https://www.mas.gov.sg/regulation/anti-money-laundering/sanctions",
    issuing_body: "Monetary Authority of Singapore",
    competent_authorities: ["SG-STCO"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["sanctions_compliance", "aml_kyc"],
    scope_description:
      "Singapore implements UN Security Council sanctions via the United Nations Act + MAS regulations. Singapore does NOT have an autonomous-sanctions regime (unlike US OFAC / EU / UK OFSI). Counterparty diligence for space-sector transactions through Singapore should screen against UNSC + the foreign sanctions regimes the counterparty is subject to in their home jurisdiction.",
    key_provisions: [],
    related_sources: ["SG-SGCA-2002"],
    last_verified: "2026-05-26",
  },

  // ─── Cybersecurity + data ────────────────────────────────────────────
  {
    id: "SG-CYBERSECURITY-ACT-2018",
    jurisdiction: "SG",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Act 2018",
    date_enacted: "2018-02-05",
    date_last_amended: "2024-05-07",
    official_reference: "No. 9 of 2018",
    source_url: "https://sso.agc.gov.sg/Act/CA2018",
    issuing_body: "Parliament of Singapore",
    competent_authorities: ["SG-CSA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity", "critical_infrastructure"],
    scope_description:
      "CSA designates 11 Critical Information Infrastructure (CII) sectors. Satcom operators serving Singapore-government + finance + transport + defence are CII candidates. CII owners must: (a) report cyber incidents within 2h initial / 24h supplementary, (b) submit to CSA audits, (c) comply with Codes of Practice for Cybersecurity. 2024 amendments expanded scope to cloud-service-providers and foundational digital infrastructure.",
    key_provisions: [
      {
        section: "Part 3, ss. 7-19",
        title: "CII designation + obligations",
        summary:
          "CII owners receive written designation. Incident-reporting obligations (within 2h of becoming aware). Mandatory CSA-led audits. Non-compliance: penalties up to S$100,000 per offence + suspension orders.",
      },
    ],
    related_sources: ["SG-PDPA-2012"],
    last_verified: "2026-05-26",
  },
  {
    id: "SG-PDPA-2012",
    jurisdiction: "SG",
    type: "federal_law",
    status: "in_force",
    title_en: "Personal Data Protection Act 2012",
    date_enacted: "2012-10-15",
    date_last_amended: "2024-01-01",
    official_reference: "No. 26 of 2012",
    source_url: "https://sso.agc.gov.sg/Act/PDPA2012",
    issuing_body: "Parliament of Singapore",
    competent_authorities: ["SG-PDPC"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "Singapore's general data-protection statute. Applies to satcom subscriber data, satellite-derived personal data, ground-segment operator data flows. 2020 amendment introduced mandatory data-breach notification + financial penalties up to 10% of Singapore turnover. Cross-border data transfer permitted under PDPC standard contractual clauses or Asia-Pacific Privacy Recognition for Processors (PRP).",
    key_provisions: [],
    related_sources: ["SG-CYBERSECURITY-ACT-2018"],
    last_verified: "2026-05-26",
  },

  // ─── Competition + FDI ───────────────────────────────────────────────
  {
    id: "SG-COMPETITION-ACT-2004",
    jurisdiction: "SG",
    type: "federal_law",
    status: "in_force",
    title_en: "Competition Act 2004",
    date_enacted: "2004-10-19",
    official_reference: "Cap. 50B",
    source_url: "https://sso.agc.gov.sg/Act/CA2004",
    issuing_body: "Parliament of Singapore",
    competent_authorities: ["SG-CCCS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["competition_antitrust"],
    scope_description:
      "Singapore competition framework. Notifications voluntary but CCCS can investigate ex-officio. Reviewed the 2022-2023 Eutelsat-OneWeb merger from Singapore-market perspective (OneWeb operates a primary APAC gateway in Singapore). Concentrations affecting Singapore satcom-services markets are within CCCS scope.",
    key_provisions: [],
    related_sources: ["SG-OSTIN-CHARTER-2024"],
    last_verified: "2026-05-26",
  },
  {
    id: "SG-SIGNIFICANT-INVESTMENTS-REVIEW-2024",
    jurisdiction: "SG",
    type: "federal_law",
    status: "in_force",
    title_en: "Significant Investments Review Act 2024",
    date_enacted: "2024-01-16",
    date_in_force: "2024-03-28",
    official_reference: "No. 2 of 2024",
    source_url: "https://sso.agc.gov.sg/Act/SIRA2024",
    issuing_body: "Parliament of Singapore",
    competent_authorities: ["SG-OSTIN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Singapore's first dedicated FDI screening law. Designated-entity regime: Minister may designate specific entities (likely to include space-sector operators with national-security relevance) for transactional review. Notification thresholds for acquisitions of 5%/12%/25%/50% controlling interest. Brings Singapore into alignment with EU 2019/452 + UK NSI Act 2021 architecture.",
    key_provisions: [
      {
        section: "Parts 3-4, ss. 9-23",
        title: "Designated entities + transaction notifications",
        summary:
          "Minister designates entities critical to national security. Designated entities must notify pre-acquisition of 5%/12%/25%/50% thresholds and obtain approval. Penalties up to 10% of annual turnover.",
      },
    ],
    related_sources: ["SG-OSTIN-CHARTER-2024"],
    last_verified: "2026-05-26",
  },

  // ─── Strategic infrastructure + cooperation ──────────────────────────
  {
    id: "SG-ONEWEB-GATEWAY-MOU",
    jurisdiction: "SG",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "Singapore-OneWeb APAC Gateway Operational Framework",
    date_enacted: "2020-07-01",
    source_url: "https://www.imda.gov.sg/news-and-events/Media-Room",
    issuing_body: "IMDA / OneWeb (under Eutelsat OneWeb)",
    competent_authorities: ["SG-IMDA"],
    relevance_level: "high",
    applicable_to: ["constellation_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Operational framework for OneWeb's APAC primary gateway in Singapore. Substantial regulatory significance: OneWeb's APAC routing (serving SE Asia + Australia + Pacific Islands) depends on this gateway. Counsel for satcom-customer onboarding in the region should verify that contractual SLAs reflect the gateway-dependency.",
    key_provisions: [],
    related_sources: ["SG-IMDA-SAT-LICENSING"],
    last_verified: "2026-05-26",
  },
  {
    id: "SG-ASEAN-SPACE-COOP",
    jurisdiction: "SG",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "ASEAN Space Cooperation Framework",
    date_enacted: "2018-09-01",
    source_url:
      "https://asean.org/serweb/uploads/2021/05/ASEAN-Space-Cooperation.pdf",
    issuing_body: "ASEAN Secretariat",
    competent_authorities: ["SG-OSTIN"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Soft-law cooperation framework among ASEAN member states. Singapore + Indonesia + Vietnam + Thailand + Philippines + Malaysia are most active. Focus on capacity-building, joint satellite missions, and regional disaster-monitoring (e.g. ASEAN Space Cooperation Initiative for forest-fire monitoring).",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── Insurance + insolvency ──────────────────────────────────────────
  {
    id: "SG-IRSA-2018",
    jurisdiction: "SG",
    type: "federal_law",
    status: "in_force",
    title_en: "Insolvency, Restructuring and Dissolution Act 2018",
    date_enacted: "2018-10-01",
    date_in_force: "2020-07-30",
    official_reference: "No. 40 of 2018",
    source_url: "https://sso.agc.gov.sg/Act/IRDA2018",
    issuing_body: "Parliament of Singapore",
    competent_authorities: ["SG-CCCS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["liability"],
    scope_description:
      "Singapore insolvency + restructuring regime. Singapore is increasingly used as a restructuring forum for cross-border space-sector insolvencies given Singapore's UNCITRAL Model Law adoption + creditor-friendly scheme-of-arrangement procedures. Virgin Orbit 2023 Chapter 11 considered Singapore proceedings as an option before opting for US.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── Environmental + civil defence ───────────────────────────────────
  {
    id: "SG-EPA-1999",
    jurisdiction: "SG",
    type: "federal_law",
    status: "in_force",
    title_en: "Environmental Protection and Management Act 1999",
    date_enacted: "1999-10-01",
    date_last_amended: "2024-01-01",
    official_reference: "Cap. 94A",
    source_url: "https://sso.agc.gov.sg/Act/EPMA1999",
    issuing_body: "Parliament of Singapore",
    competent_authorities: ["SG-OSTIN"],
    relevance_level: "low",
    applicable_to: ["ground_segment"],
    compliance_areas: ["environmental"],
    scope_description:
      "General environmental statute. Applies to ground-station construction + operation (RF emissions, cooling systems, EMI compliance). Less relevant than in launch jurisdictions since Singapore has no launch sites.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
];
