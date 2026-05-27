// src/data/legal-sources/sources/cn.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * China — space-law sources and authorities.
 *
 * Note: China lacks a unified primary space-activities statute. The
 * regime is constructed from sectoral measures, the Civil Aviation Law
 * (analogically applied to launch operations), data + cyber laws (DSL,
 * PIPL, CSL, Crypto Law) that hit ground-segment + satcom, the 2020
 * Export Control Law, defence-industry decrees from CASC/CASIC, and a
 * long-running draft Space Law.
 *
 * 2026-05-26 expansion: corpus now covers the full 2017-2024 wave of
 * China's cyber-data-export-control modernisation as applied to space
 * (per ATLAS-CORPUS-EXPANSION-PLAN.md § 5.A).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_CN: Authority[] = [
  {
    id: "CN-CNSA",
    jurisdiction: "CN",
    name_en: "China National Space Administration",
    name_local: "国家航天局",
    abbreviation: "CNSA",
    parent_ministry:
      "Ministry of Industry and Information Technology (MIIT) / SASTIND",
    website: "http://www.cnsa.gov.cn/english/",
    space_mandate:
      "Civil-space agency under MIIT/SASTIND. Coordinates international cooperation, manages the national space registry, and is the public-facing authority — but operational regulatory power sits with SASTIND, MIIT, and PLA Strategic Support Force depending on activity type.",
    legal_basis: "State Council institutional reform (1998, 2018)",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "CN-SASTIND",
    jurisdiction: "CN",
    name_en:
      "State Administration of Science, Technology and Industry for National Defence",
    name_local: "国家国防科技工业局",
    abbreviation: "SASTIND",
    parent_ministry: "Ministry of Industry and Information Technology (MIIT)",
    website: "http://www.sastind.gov.cn/",
    space_mandate:
      "Lead regulator for civil and dual-use space programmes. Issues launch and on-orbit-management licences for non-military space activities, oversees export control of dual-use space items, and coordinates with PLA-SSF on military overlap.",
    legal_basis: "State Council reform documents",
    applicable_areas: ["licensing", "export_control"],
  },
  {
    id: "CN-MIIT",
    jurisdiction: "CN",
    name_en: "Ministry of Industry and Information Technology",
    name_local: "工业和信息化部",
    abbreviation: "MIIT",
    website: "https://www.miit.gov.cn/",
    space_mandate:
      "Frequency-spectrum allocation for satellite systems, telecommunications licensing, and ITU coordination filings. Houses SASTIND and CNSA. Final authority on satellite-frequency assignments.",
    legal_basis: "State Council institutional functions",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "CN-SAMR",
    jurisdiction: "CN",
    name_en: "State Administration for Market Regulation",
    name_local: "国家市场监督管理总局",
    abbreviation: "SAMR",
    website: "https://www.samr.gov.cn/",
    space_mandate:
      "Antitrust + market-conduct regulator. Reviews concentrations involving CASC/CASIC subsidiaries and commercial-launch entrants. SAMR's Anti-Monopoly Bureau also rules on tying / market-power abuse complaints in satellite-services markets.",
    legal_basis:
      "Anti-Monopoly Law (2008, revised 2022); Fair Competition Review",
    applicable_areas: ["competition_antitrust"],
  },
  {
    id: "CN-CAC",
    jurisdiction: "CN",
    name_en: "Cyberspace Administration of China",
    name_local: "国家互联网信息办公室",
    abbreviation: "CAC",
    website: "http://www.cac.gov.cn/",
    space_mandate:
      "Top-level cybersecurity regulator. Conducts cybersecurity reviews of critical info infrastructure operators (which includes major satcom + ground-segment ops), enforces the Cybersecurity Law, Data Security Law, and PIPL on space-related entities, and oversees cross-border data transfers from Chinese ground stations.",
    legal_basis: "Cybersecurity Law 2017 Art. 8; State Council authorisation",
    applicable_areas: [
      "cybersecurity",
      "data_security",
      "critical_infrastructure",
    ],
  },
  {
    id: "CN-MOFCOM",
    jurisdiction: "CN",
    name_en: "Ministry of Commerce",
    name_local: "中华人民共和国商务部",
    abbreviation: "MOFCOM",
    website: "http://english.mofcom.gov.cn/",
    space_mandate:
      "Lead export-control authority under the 2020 Export Control Law. Manages dual-use item licensing for satellites, launch components, and ground-segment hardware. Maintains the China Export Control List and the Unreliable Entity List. Coordinates with SASTIND on military / civil dual-use items.",
    legal_basis: "Export Control Law 2020 Art. 5",
    applicable_areas: ["export_control", "sanctions_compliance"],
  },
  {
    id: "CN-CASC",
    jurisdiction: "CN",
    name_en: "China Aerospace Science and Technology Corporation",
    name_local: "中国航天科技集团有限公司",
    abbreviation: "CASC",
    website: "http://english.spacechina.com/",
    space_mandate:
      "State-owned aerospace prime contractor. De-facto operational regulator for the Long March family, Shenzhou crewed programme, Tianzhou cargo, Chang'e lunar, Tianwen Mars, and BeiDou. Foreign partners signing launch / payload contracts deal with CASC subsidiaries (China Great Wall Industry Corp for commercial launches).",
    legal_basis: "State Council SASAC charter",
    applicable_areas: ["licensing", "procurement"],
  },
  {
    id: "CN-CASIC",
    jurisdiction: "CN",
    name_en: "China Aerospace Science and Industry Corporation",
    name_local: "中国航天科工集团有限公司",
    abbreviation: "CASIC",
    website: "http://www.casic.com/",
    space_mandate:
      "Second state-owned aerospace prime, distinct from CASC. Focus on missile + small-launcher development (Kuaizhou family), small-satellite manufacturing, and military space systems. SAMR antitrust review applies to CASIC subsidiary acquisitions.",
    legal_basis: "State Council SASAC charter",
    applicable_areas: ["military_dual_use", "procurement"],
  },
  {
    id: "CN-PLASF",
    jurisdiction: "CN",
    name_en: "People's Liberation Army Aerospace Force",
    name_local: "中国人民解放军军事航天部队",
    abbreviation: "PLA-ASF",
    website: "http://www.mod.gov.cn/",
    space_mandate:
      "PLA branch responsible for military space operations (reorganised from PLA Strategic Support Force in 2024). Operates Wenchang, Jiuquan, Taiyuan, and Xichang launch ranges. Range-safety authority and final approver of launch windows for both civil and military missions.",
    legal_basis: "Central Military Commission 2024 reform",
    applicable_areas: ["military_dual_use"],
  },
];

export const LEGAL_SOURCES_CN: LegalSource[] = [
  // ─── Treaties + foundational ──────────────────────────────────────────
  {
    id: "CN-OST-1983",
    jurisdiction: "CN",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Chinese Accession",
    date_enacted: "1983-12-30",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of the People's Republic of China",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "China acceded to the OST in 1983. State-responsibility obligations discharged through the 2001/2002 measures and (eventually) the draft Space Law. China is NOT a signatory to the Artemis Accords and has rejected the Accords' resource-extraction framing.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "China is internationally responsible for national space activities — discharged through SASTIND/CNSA authorisation procedures and (pending) the draft Space Law.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-22",
  },

  // ─── Operational space framework ──────────────────────────────────────
  {
    id: "CN-LAUNCH-REG-2002",
    jurisdiction: "CN",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Interim Measures on Administration of Permits for Civil Launch",
    title_local: "民用航天发射项目许可证管理暂行办法",
    date_enacted: "2002-09-11",
    date_in_force: "2002-12-21",
    official_reference: "COSTIND Decree No. 12 (2002)",
    source_url: "http://www.gov.cn/gongbao/content/2003/content_62412.htm",
    issuing_body: "COSTIND (now SASTIND)",
    competent_authorities: ["CN-SASTIND"],
    relevance_level: "critical",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Operative civil launch-permit regulation issued by the predecessor of SASTIND. Until a comprehensive Space Law is enacted, this 2002 ruleset together with the Registration Measures (2001) and the Civil Aviation Law analogically applied is the primary domestic licensing framework for non-military Chinese launches.",
    key_provisions: [
      {
        section: "Art. 5",
        title: "Permit required for civil launches",
        summary:
          "Civil launches from Chinese territory or by Chinese-controlled launch providers require a permit issued by SASTIND, with safety, financial-responsibility, and end-user-screening conditions.",
      },
    ],
    related_sources: ["CN-REGISTRATION-2001", "CN-DRAFT-SPACE-LAW"],
    last_verified: "2026-04-22",
  },
  {
    id: "CN-REGISTRATION-2001",
    jurisdiction: "CN",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Measures on Registration of Objects Launched into Outer Space",
    title_local: "空间物体登记管理办法",
    date_enacted: "2001-02-08",
    official_reference: "COSTIND Decree No. 6 (2001)",
    source_url: "http://www.gov.cn/zhengce/2020-12/27/content_5573789.htm",
    issuing_body: "COSTIND (now SASTIND)",
    competent_authorities: ["CN-SASTIND", "CN-CNSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    scope_description:
      "Domestic implementation of the Registration Convention. Establishes the procedure by which Chinese-launched space objects are registered domestically and notified to UNOOSA — operated by CNSA on behalf of SASTIND.",
    key_provisions: [
      {
        section: "Art. 3-7",
        title: "Domestic and UN registry",
        summary:
          "Space objects launched by Chinese entities or from Chinese territory are entered in the national registry and notified to the UN Secretary-General as required by the Registration Convention.",
      },
    ],
    related_sources: ["INT-REGISTRATION-1975"],
    last_verified: "2026-04-22",
  },
  {
    id: "CN-DRAFT-SPACE-LAW",
    jurisdiction: "CN",
    type: "draft_legislation",
    status: "draft",
    title_en: "Draft Space Law of the People's Republic of China",
    title_local: "中华人民共和国航天法（草案）",
    date_published: "2020-08-01",
    parliamentary_reference:
      "13th NPC Standing Committee work plan; revised drafts circulated 2022, 2024",
    source_url:
      "http://www.cnsa.gov.cn/english/n6465715/c10162837/content.html",
    issuing_body: "State Council / National People's Congress",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability", "insurance"],
    scope_description:
      "Long-pending comprehensive space-activities law that would replace the patchwork of 2001/2002 measures with a single statute covering authorisation, liability, insurance, registration, and dispute resolution. Drafts have circulated since 2020 with no current adoption timeline. Operators should track NPC publications for the next iteration.",
    key_provisions: [
      {
        section: "Draft Ch. III",
        title: "Statutory authorisation regime",
        summary:
          "Would put the launch and on-orbit-management permit regimes on statutory footing with criminal and administrative penalties.",
      },
    ],
    related_sources: ["CN-LAUNCH-REG-2002", "CN-REGISTRATION-2001"],
    last_verified: "2026-04-22",
  },
  {
    id: "CN-CIVIL-AVIATION-LAW-1996",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Civil Aviation Law of the People's Republic of China",
    title_local: "中华人民共和国民用航空法",
    date_enacted: "1995-10-30",
    date_in_force: "1996-03-01",
    date_last_amended: "2018-12-29",
    official_reference: "Order of the President No. 56 (1995)",
    source_url:
      "http://www.npc.gov.cn/zgrdw/englishnpc/Law/2007-12/12/content_1383762.htm",
    issuing_body: "Standing Committee, National People's Congress",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "high",
    applicable_to: ["launch_provider", "in_orbit_services"],
    compliance_areas: ["licensing", "human_spaceflight", "liability"],
    scope_description:
      "Used analogically as the legal basis for suborbital and reentry vehicle operations until a dedicated Space Law is enacted. The 2018 amendment added provisions on UAS and high-altitude platforms — referenced by counsel arguing for analogous application to suborbital tourist flights.",
    key_provisions: [
      {
        section: "Ch. XII",
        title: "Air carrier liability",
        summary:
          "Tort liability framework applied by Chinese courts to spaceflight-adjacent claims pending a dedicated space-law liability regime.",
      },
    ],
    related_sources: ["CN-LAUNCH-REG-2002", "CN-DRAFT-SPACE-LAW"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-SPACE-WHITE-PAPER-2021",
    jurisdiction: "CN",
    type: "policy_document",
    status: "in_force",
    title_en: "China's Space Programme: A 2021 Perspective",
    title_local: "2021中国的航天",
    date_published: "2022-01-28",
    source_url:
      "https://english.www.gov.cn/archive/whitepaper/202201/28/content_WS61f35b3dc6d09c94e48a467a.html",
    issuing_body: "State Council Information Office",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Latest official Chinese space white paper. Outlines 2021-2025 priorities: deep space exploration (Chang'e 6/7, Tianwen-3 sample return), space station (Tiangong fully operational 2022), BeiDou next-gen, commercial space promotion, and the International Lunar Research Station (ILRS) framework. Lawyers cite as evidence of Chinese state-policy direction for jurisdiction-comparison memos.",
    key_provisions: [
      {
        section: "Section V",
        title: "International cooperation",
        summary:
          "Confirms China's ILRS framework as the counter to Artemis Accords. Names cooperation partners (Russia, South Africa, Pakistan, Venezuela, etc. — see CN-LUNAR-COOP-MOUS for the binding instruments).",
      },
    ],
    related_sources: ["CN-SPACE-WHITE-PAPER-2016", "CN-LUNAR-COOP-MOUS"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-SPACE-WHITE-PAPER-2016",
    jurisdiction: "CN",
    type: "policy_document",
    status: "superseded",
    title_en: "China's Space Activities in 2016",
    title_local: "2016中国的航天",
    date_published: "2016-12-27",
    source_url:
      "http://english.www.gov.cn/archive/white_paper/2016/12/28/content_281475527159496.htm",
    issuing_body: "State Council Information Office",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Predecessor white paper. Useful for historical-trajectory arguments + verifying which commitments survived into the 2021 update.",
    key_provisions: [],
    related_sources: ["CN-SPACE-WHITE-PAPER-2021"],
    superseded_by: "CN-SPACE-WHITE-PAPER-2021",
    last_verified: "2026-05-26",
  },
  {
    id: "CN-SPACE-WHITE-PAPER-2019-DEFENSE",
    jurisdiction: "CN",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "China's National Defense in the New Era",
    title_local: "新时代的中国国防",
    date_published: "2019-07-24",
    source_url:
      "http://english.www.gov.cn/archive/whitepaper/201907/24/content_WS5d3941ddc6d08408f502283d.html",
    issuing_body: "State Council Information Office",
    competent_authorities: ["CN-PLASF"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "fdi_screening"],
    scope_description:
      "Defense white paper containing the most authoritative public statement of China's space-security doctrine: 'outer space is a critical domain in international strategic competition'. Cited by Western FDI / CFIUS / EU 2019/452 screening to substantiate national-security concerns about Chinese space investment.",
    key_provisions: [
      {
        section: "Ch. III",
        title: "Space, cyber, and electromagnetic spectrum",
        summary:
          "Identifies space as a strategic-competition domain. Confirms military-civil fusion strategy applies to space technology development.",
      },
    ],
    related_sources: ["CN-MIL-CIV-FUSION-2020"],
    last_verified: "2026-05-26",
  },

  // ─── Frequency + telecommunications ───────────────────────────────────
  {
    id: "CN-RADIO-REG-2016",
    jurisdiction: "CN",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Radio Regulations of the People's Republic of China",
    title_local: "中华人民共和国无线电管理条例",
    date_enacted: "2016-11-11",
    date_in_force: "2016-12-01",
    official_reference: "State Council Decree No. 672",
    source_url:
      "http://www.gov.cn/zhengce/content/2016-11/16/content_5133346.htm",
    issuing_body: "State Council / Central Military Commission",
    competent_authorities: ["CN-MIIT"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Domestic frequency-coordination regulation. Establishes MIIT as the national administration for ITU filings. Chinese-licensed operators must coordinate frequency assignments through MIIT before submitting ITU Advance Publication Information (API). Foreign satellite-services landing in China require MIIT market-access approval.",
    key_provisions: [
      {
        section: "Art. 18-25",
        title: "Satellite frequency coordination",
        summary:
          "MIIT is the sole notifying administration for Chinese satellite networks at ITU. Licence-holders bear the ITU coordination costs and BIU milestone obligations.",
      },
    ],
    related_sources: ["INT-ITU-RR"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-FREQUENCY-COORD-PROC",
    jurisdiction: "CN",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Administrative Measures for Satellite Network Coordination",
    title_local: "卫星网络协调管理办法",
    date_enacted: "2014-09-25",
    official_reference: "MIIT Decree No. 28 (2014)",
    source_url: "https://www.miit.gov.cn/jgsj/wxdgls/index.html",
    issuing_body: "Ministry of Industry and Information Technology",
    competent_authorities: ["CN-MIIT"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Procedural rules for the MIIT pre-filing review that precedes any Chinese-flagged ITU API submission. Sets minimum technical-documentation requirements (orbital parameters, link budgets, interference analyses) and a 90-day internal review window before MIIT forwards the filing to the ITU.",
    key_provisions: [
      {
        section: "Art. 8",
        title: "Pre-filing technical review",
        summary:
          "MIIT conducts a 90-day technical review before forwarding a Chinese satellite-network filing to the ITU. Foreign-partnered Chinese SPVs must demonstrate beneficial-ownership Chinese majority for MIIT acceptance.",
      },
    ],
    related_sources: ["CN-RADIO-REG-2016"],
    last_verified: "2026-05-26",
  },

  // ─── Data / Cyber / Crypto regime applied to space ────────────────────
  {
    id: "CN-CSL-2017",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Law of the People's Republic of China",
    title_local: "中华人民共和国网络安全法",
    date_enacted: "2016-11-07",
    date_in_force: "2017-06-01",
    date_last_amended: "2025-04-29",
    official_reference: "Order of the President No. 53 (2016)",
    source_url: "http://www.cac.gov.cn/2016-11/07/c_1119867116.htm",
    issuing_body: "Standing Committee, National People's Congress",
    competent_authorities: ["CN-CAC"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: [
      "cybersecurity",
      "data_security",
      "critical_infrastructure",
    ],
    scope_description:
      "Foundational cyber statute applied to space-sector entities as critical information infrastructure operators (CIIO). Major satcom + ground-station operators are subject to CAC cybersecurity reviews, data-localization obligations, and supply-chain security assessments. The 2025 amendment tightened CIIO designation criteria.",
    key_provisions: [
      {
        section: "Art. 31, 35-37",
        title: "Critical Information Infrastructure regime",
        summary:
          "CIIOs (including major satellite + ground-segment operators) must store personal information + important data on Chinese territory and undergo CAC security review before cross-border data export.",
      },
    ],
    related_sources: ["CN-DSL-2021", "CN-PIPL-2021"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-DSL-2021",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Security Law of the People's Republic of China",
    title_local: "中华人民共和国数据安全法",
    date_enacted: "2021-06-10",
    date_in_force: "2021-09-01",
    official_reference: "Order of the President No. 84 (2021)",
    source_url:
      "http://www.npc.gov.cn/npc/c30834/202106/7c9af12f51334a73b56d7938f99a788a.shtml",
    issuing_body: "Standing Committee, National People's Congress",
    competent_authorities: ["CN-CAC"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security", "sanctions_compliance"],
    scope_description:
      "Categorises data by risk-to-national-security tiers — 'core data' and 'important data' are subject to the strictest controls. Remote-sensing imagery, BeiDou ground-truth data, and satellite-derived navigation data all fall under 'important data' classification per the Ministry's 2022-2024 implementing guidelines. Extraterritorial reach: foreign entities providing data services to Chinese users are within scope.",
    key_provisions: [
      {
        section: "Art. 21, 26",
        title: "Important data + extraterritorial reach",
        summary:
          "Data classification regime applies to space-derived data. Art. 26 grants extraterritorial application to foreign data handlers whose activities harm Chinese national security or public interest.",
      },
    ],
    related_sources: [
      "CN-CSL-2017",
      "CN-PIPL-2021",
      "CN-SATELLITE-DATA-MGMT-REG-2015",
    ],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-PIPL-2021",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Personal Information Protection Law",
    title_local: "中华人民共和国个人信息保护法",
    date_enacted: "2021-08-20",
    date_in_force: "2021-11-01",
    official_reference: "Order of the President No. 91 (2021)",
    source_url:
      "http://www.npc.gov.cn/npc/c30834/202108/a8c4e3672c74491a80b53a172bb753fe.shtml",
    issuing_body: "Standing Committee, National People's Congress",
    competent_authorities: ["CN-CAC"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "China's GDPR-equivalent. Applies to any handling of Chinese residents' personal information by space-sector entities — most relevant for direct-to-consumer satcom services (Starlink-equivalents), satellite-imagery services revealing identifiable individuals, and ground-segment operators handling subscriber data.",
    key_provisions: [
      {
        section: "Art. 38-40",
        title: "Cross-border data transfer",
        summary:
          "Personal information cross-border transfer requires CAC security assessment, certification, or standard contract clauses. Critical Information Infrastructure operators must store personal information domestically.",
      },
    ],
    related_sources: ["CN-CSL-2017", "CN-DSL-2021"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-CRYPTO-LAW-2019",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Cryptography Law of the People's Republic of China",
    title_local: "中华人民共和国密码法",
    date_enacted: "2019-10-26",
    date_in_force: "2020-01-01",
    official_reference: "Order of the President No. 35 (2019)",
    source_url:
      "http://www.npc.gov.cn/npc/c30834/201910/6f7be7dd5ae5459a8de8baf36296bc74.shtml",
    issuing_body: "Standing Committee, National People's Congress",
    competent_authorities: ["CN-CAC"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity", "export_control"],
    scope_description:
      "Tripartite cryptography regime: 'core' and 'common' crypto reserved for state use (military-civil fusion); 'commercial crypto' open to civil deployment but subject to SCA testing/certification. Affects ground-segment encryption, satellite link-layer crypto (CCSDS SDLS-equivalents), and cross-border export of crypto-enabled space hardware.",
    key_provisions: [
      {
        section: "Art. 27",
        title: "Commercial crypto certification",
        summary:
          "Commercial cryptographic products used in critical information infrastructure (incl. major space-sector entities) require SCA testing/certification before deployment.",
      },
    ],
    related_sources: ["CN-CSL-2017"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-CYBER-ADMINISTRATION-RULES-2022",
    jurisdiction: "CN",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Measures for Cybersecurity Review",
    title_local: "网络安全审查办法",
    date_enacted: "2021-12-28",
    date_in_force: "2022-02-15",
    official_reference: "CAC Order No. 8 (2021)",
    source_url: "http://www.cac.gov.cn/2022-01/04/c_1642894602182845.htm",
    issuing_body: "Cyberspace Administration of China + 12 other agencies",
    competent_authorities: ["CN-CAC"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: [
      "cybersecurity",
      "fdi_screening",
      "critical_infrastructure",
    ],
    scope_description:
      "Combined cybersecurity-review + national-security-review regime for CIIO procurement of network products + services. Foreign-vendor satcom hardware (antennas, modems, ground-station software) used by Chinese CIIOs typically triggers review. Network platform operators handling personal information of >1M users must self-declare for review before offshore IPO.",
    key_provisions: [
      {
        section: "Art. 7",
        title: "Mandatory pre-procurement review",
        summary:
          "CIIO procurement of network products + services likely to affect national security must undergo CAC cybersecurity review.",
      },
    ],
    related_sources: ["CN-CSL-2017", "CN-DSL-2021"],
    last_verified: "2026-05-26",
  },

  // ─── Export control + sanctions ──────────────────────────────────────
  {
    id: "CN-EXPORT-CONTROL-LAW-2020",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Export Control Law of the People's Republic of China",
    title_local: "中华人民共和国出口管制法",
    date_enacted: "2020-10-17",
    date_in_force: "2020-12-01",
    official_reference: "Order of the President No. 58 (2020)",
    source_url:
      "http://www.npc.gov.cn/npc/c30834/202010/cf4e0455f6424a38b5aecf8001712c43.shtml",
    issuing_body: "Standing Committee, National People's Congress",
    competent_authorities: ["CN-MOFCOM", "CN-SASTIND"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: [
      "export_control",
      "sanctions_compliance",
      "military_dual_use",
    ],
    scope_description:
      "First unified Chinese export-control statute. Establishes mandatory licensing for dual-use, military, and 'other items related to national security' — including space technology. Created the Unreliable Entity List (parallel to US Entity List). Extraterritorial: applies to re-exports of Chinese-origin items by third-country actors. Operators considering Chinese-origin components (avionics, propellants, materials) must verify licence status.",
    key_provisions: [
      {
        section: "Art. 5, 12, 49",
        title: "Licensing + extraterritoriality",
        summary:
          "MOFCOM issues licences for controlled-item exports + re-exports. Violations extraterritorially enforced against Chinese-resident and non-resident actors. Mandatory end-user / end-use certifications.",
      },
    ],
    related_sources: ["CN-DUAL-USE-REG-2002", "CN-MIL-CIV-FUSION-2020"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-DUAL-USE-REG-2002",
    jurisdiction: "CN",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Regulations on Export Control of Dual-Use Items + Related Technologies",
    title_local: "两用物项和技术进出口许可证管理办法",
    date_enacted: "2005-12-12",
    date_last_amended: "2024-12-01",
    official_reference: "MOFCOM Decree No. 29 (2005), amended 2024",
    source_url:
      "http://www.gov.cn/zhengce/content/2024-12/01/content_5673001.htm",
    issuing_body: "Ministry of Commerce + GAC + SASTIND",
    competent_authorities: ["CN-MOFCOM", "CN-SASTIND"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "Implementing regulation for the 2020 Export Control Law. 2024 amendment updated the dual-use items list to include AI-enabled remote sensing payloads, advanced inertial-guidance units, and certain space-grade semiconductors. Coordinates with NSG / Wassenaar / MTCR commitments.",
    key_provisions: [
      {
        section: "Art. 15-22",
        title: "Licensing procedure",
        summary:
          "Three-tier review by MOFCOM, SASTIND, and (for sensitive items) the State Council. Decision deadlines: 45 working days standard, 60 days for inter-ministerial review.",
      },
    ],
    related_sources: ["CN-EXPORT-CONTROL-LAW-2020"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-MIL-CIV-FUSION-2020",
    jurisdiction: "CN",
    type: "policy_document",
    status: "in_force",
    title_en: "Military-Civil Fusion Development Strategy",
    title_local: "军民融合发展战略",
    date_published: "2017-06-20",
    source_url: "http://www.gov.cn/xinwen/2017-06/20/content_5204021.htm",
    issuing_body: "Central Military Commission / State Council",
    competent_authorities: ["CN-PLASF", "CN-SASTIND"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "fdi_screening"],
    scope_description:
      "Top-level state strategy directing convergence of military and civilian space programmes. Cited by US EAR/ITAR + EU FDI screening to substantiate national-security concerns about Chinese space firms claiming purely civilian status. Counsel should expect Chinese state-linked space firms to be treated as dual-use end-users for export-licensing assessments.",
    key_provisions: [],
    related_sources: [
      "CN-EXPORT-CONTROL-LAW-2020",
      "CN-SPACE-WHITE-PAPER-2019-DEFENSE",
    ],
    last_verified: "2026-05-26",
  },

  // ─── FDI / Investment screening ──────────────────────────────────────
  {
    id: "CN-FOREIGN-INVESTMENT-LAW-2019",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Investment Law of the People's Republic of China",
    title_local: "中华人民共和国外商投资法",
    date_enacted: "2019-03-15",
    date_in_force: "2020-01-01",
    official_reference: "Order of the President No. 26 (2019)",
    source_url:
      "http://www.npc.gov.cn/npc/c30834/201903/aacd24a1d0e2459398d9d57aff7e83b6.shtml",
    issuing_body: "National People's Congress",
    competent_authorities: ["CN-MOFCOM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Unified inbound FDI framework. Space activities listed on the Negative List for Foreign Investment — most upstream space activities (launch, satellite manufacturing) are CLOSED to foreign investment; satellite-services downstream activities are restricted. The annual Negative List update (latest 2024) tightens or loosens specific subsectors.",
    key_provisions: [
      {
        section: "Art. 4, 28, 35",
        title: "Negative-list + security review",
        summary:
          "Foreign investment in space-sector activities listed on the Negative List requires sectoral approval. Investments affecting national security undergo State Council security review.",
      },
    ],
    related_sources: ["CN-MIL-CIV-FUSION-2020"],
    last_verified: "2026-05-26",
  },

  // ─── Civil tort + product liability ──────────────────────────────────
  {
    id: "CN-CIVIL-CODE-2021",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Civil Code of the People's Republic of China",
    title_local: "中华人民共和国民法典",
    date_enacted: "2020-05-28",
    date_in_force: "2021-01-01",
    official_reference: "Order of the President No. 45 (2020)",
    source_url:
      "http://www.npc.gov.cn/npc/c30834/202006/75ba6483b8344591abd07917e1d25cc8.shtml",
    issuing_body: "National People's Congress",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["liability", "product_liability"],
    scope_description:
      "Codified civil law including Book VII Tort Liability — applied by Chinese courts to space-related tort claims (defective component liability for launch + satellite hardware, third-party damage from re-entry). Foreign claimants invoking Chinese law for damage from Chinese-origin space activity rely on this code together with the Liability Convention.",
    key_provisions: [
      {
        section: "Book VII, Ch. IV (Product Liability)",
        title: "Strict liability for defective products",
        summary:
          "Strict-liability regime for defective products, including space hardware. Manufacturers + sellers jointly liable; defenses limited to state-of-the-art or non-defective-at-distribution.",
      },
    ],
    related_sources: ["INT-LIABILITY-1972"],
    last_verified: "2026-05-26",
  },

  // ─── Surveying / Remote sensing data ──────────────────────────────────
  {
    id: "CN-MAPPING-LAW-2017",
    jurisdiction: "CN",
    type: "federal_law",
    status: "in_force",
    title_en: "Surveying and Mapping Law of the People's Republic of China",
    title_local: "中华人民共和国测绘法",
    date_enacted: "2017-04-27",
    date_in_force: "2017-07-01",
    official_reference: "Order of the President No. 67 (2017)",
    source_url:
      "http://www.npc.gov.cn/npc/c30834/201704/02d0e22078a2454ea16b6abf02541d31.shtml",
    issuing_body: "Standing Committee, National People's Congress",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator"],
    compliance_areas: ["data_security", "media_broadcasting"],
    scope_description:
      "Restricts collection + publication of geospatial data of Chinese territory. Satellite-imagery providers (foreign + domestic) handling high-resolution imagery of Chinese territory must obtain Ministry of Natural Resources mapping permits. Cross-border transfer of restricted geospatial data is criminally sanctionable.",
    key_provisions: [
      {
        section: "Art. 7, 38, 67",
        title: "Geospatial data classification",
        summary:
          "Geospatial data classified by national-security sensitivity. Foreign satellite operators must coordinate with the Ministry of Natural Resources before commercialising imagery of Chinese territory above defined resolution thresholds.",
      },
    ],
    related_sources: ["CN-SATELLITE-DATA-MGMT-REG-2015", "CN-DSL-2021"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-SATELLITE-DATA-MGMT-REG-2015",
    jurisdiction: "CN",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Administrative Measures for the Use of Civil Land Observation Satellite Data",
    title_local: "民用陆地观测卫星数据管理办法",
    date_enacted: "2015-09-06",
    official_reference: "SASTIND / CMA / MNR Joint Decree",
    source_url: "http://www.gov.cn/xinwen/2015-09/06/content_2925289.htm",
    issuing_body:
      "SASTIND + China Meteorological Administration + Ministry of Natural Resources",
    competent_authorities: ["CN-SASTIND"],
    relevance_level: "medium",
    applicable_to: ["data_provider", "satellite_operator"],
    compliance_areas: ["data_security", "media_broadcasting"],
    scope_description:
      "Operational regulation governing distribution + commercialisation of Chinese civil land-observation satellite data (e.g. Gaofen series, ZY-3). Foreign downstream resellers must register with SASTIND and abide by distribution-limit conditions.",
    key_provisions: [],
    related_sources: ["CN-MAPPING-LAW-2017", "CN-DSL-2021"],
    last_verified: "2026-05-26",
  },

  // ─── Launch range + safety ───────────────────────────────────────────
  {
    id: "CN-WENCHANG-COASTAL-RANGE",
    jurisdiction: "CN",
    type: "safety_regulation",
    status: "in_force",
    title_en: "Operational Safety Procedures for Wenchang Coastal Launch Range",
    title_local: "文昌航天发射场安全管理办法",
    date_enacted: "2016-06-25",
    source_url: "http://www.cnsa.gov.cn/n6758973/c6770956/content.html",
    issuing_body: "PLA Aerospace Force / CASC",
    competent_authorities: ["CN-PLASF", "CN-CASC"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental"],
    scope_description:
      "Range safety + environmental procedures for Wenchang (China's commercial-launch-oriented coastal range — preferred for Long March 5/8 and high-mass missions). Foreign payload owners contracting with CASC for Wenchang launches inherit these range conditions.",
    key_provisions: [],
    related_sources: ["CN-LONG-MARCH-RANGE-SAFETY"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-LONG-MARCH-RANGE-SAFETY",
    jurisdiction: "CN",
    type: "safety_regulation",
    status: "in_force",
    title_en: "Range Safety Procedures for the Long March Family",
    title_local: "长征系列运载火箭发射安全规程",
    date_enacted: "2014-04-15",
    source_url: "http://english.spacechina.com/n16421/n17424/index.html",
    issuing_body: "China Aerospace Science + Technology Corp (CASC)",
    competent_authorities: ["CN-CASC", "CN-PLASF"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["debris_mitigation", "environmental"],
    scope_description:
      "Internal CASC range-safety procedures for all Long March launches. Covers stage-disposal trajectories (relevant to Jiuquan inland-range stage-impact concerns), payload-separation safety, and post-launch debris notification. Cited in foreign-payload manifest negotiations.",
    key_provisions: [],
    related_sources: ["CN-WENCHANG-COASTAL-RANGE"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-SPACE-ACCIDENT-INVESTIGATION",
    jurisdiction: "CN",
    type: "federal_regulation",
    status: "in_force",
    title_en: "CNSA Space Accident Investigation Framework",
    title_local: "航天事故调查处理办法",
    date_enacted: "2018-11-20",
    source_url: "http://www.cnsa.gov.cn/n6758973/n6758979/index.html",
    issuing_body: "China National Space Administration",
    competent_authorities: ["CN-CNSA", "CN-SASTIND"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["liability", "debris_mitigation"],
    scope_description:
      "Internal CNSA procedure for investigating Chinese space accidents (launch failures, on-orbit anomalies with debris implications, re-entry events). Establishes investigation timelines and notification obligations to UNOOSA + affected third states under the Liability and Registration Conventions.",
    key_provisions: [],
    related_sources: ["INT-LIABILITY-1972", "INT-REGISTRATION-1975"],
    last_verified: "2026-05-26",
  },

  // ─── Commercial launch promotion ─────────────────────────────────────
  {
    id: "CN-COMMERCIAL-LAUNCH-2014",
    jurisdiction: "CN",
    type: "policy_document",
    status: "in_force",
    title_en:
      "State Council Opinions on Innovation in Investment + Financing for Commercial Space",
    title_local: "关于创新投融资支持商业航天发展的意见",
    date_published: "2014-11-26",
    source_url: "http://www.gov.cn/zhengce/content/2014-11/26/content_9260.htm",
    issuing_body: "State Council",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["licensing"],
    scope_description:
      "Foundational policy authorising private-sector entry into Chinese space activities (LandSpace, iSpace, Galactic Energy, etc.). Opened the door for non-CASC/non-CASIC launch providers — though all remain subject to SASTIND licensing + PLA-ASF range coordination.",
    key_provisions: [],
    related_sources: ["CN-LAUNCH-REG-2002"],
    last_verified: "2026-05-26",
  },

  // ─── International cooperation ───────────────────────────────────────
  {
    id: "CN-LUNAR-COOP-MOUS",
    jurisdiction: "CN",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "International Lunar Research Station — Cooperation MOUs (CN-RU, CN-ZA, CN-PK, CN-VE)",
    title_local: "国际月球科研站合作备忘录",
    date_enacted: "2021-06-16",
    source_url: "http://www.cnsa.gov.cn/english/n6465652/c6812150/content.html",
    issuing_body:
      "China National Space Administration + partner space agencies",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Foundational CN-RU Joint Declaration on International Lunar Research Station (June 2021), plus parallel MOUs with South Africa, Pakistan, Venezuela, Belarus, Azerbaijan, Egypt, Thailand, and Nicaragua. Counter-framework to the US Artemis Accords. Counsel advising clients on Artemis vs ILRS-partner status should track which states have signed which framework.",
    key_provisions: [
      {
        section: "Joint Declaration Section II",
        title: "Open framework for partner accession",
        summary:
          "ILRS is open to additional national + international partners on the basis of the CN-RU foundational text. New partners sign bilateral MOUs with both China + Russia.",
      },
    ],
    related_sources: ["INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-05-26",
  },
  {
    id: "CN-BEIDOU-AGREEMENT",
    jurisdiction: "CN",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "BeiDou International Cooperation Agreements",
    title_local: "北斗卫星导航系统国际合作协议",
    date_enacted: "2018-12-27",
    source_url: "http://www.beidou.gov.cn/yw/gfgg/202003/t20200316_19929.html",
    issuing_body: "BeiDou Satellite Navigation System Office (BDO) under CNSA",
    competent_authorities: ["CN-CNSA"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Framework agreements with GLONASS (RU), GPS (US, civil channels), and Galileo (EU) for GNSS compatibility + interoperability. Belt and Road partner-state BeiDou cooperation MOUs (Pakistan, Saudi Arabia, Egypt, Thailand) authorise BeiDou ground infrastructure deployment.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── SAMR antitrust + space industry ─────────────────────────────────
  {
    id: "CN-SAMR-AEROSPACE-REVIEWS",
    jurisdiction: "CN",
    type: "case_law",
    status: "in_force",
    title_en:
      "SAMR Concentration Reviews — Aerospace Sector (CASC / CASIC subsidiary M&A)",
    title_local: "国家市场监督管理总局对航天行业的反垄断审查",
    date_published: "2023-06-01",
    source_url: "https://www.samr.gov.cn/jzxts/",
    issuing_body:
      "State Administration for Market Regulation — Anti-Monopoly Bureau",
    competent_authorities: ["CN-SAMR"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["competition_antitrust", "fdi_screening"],
    scope_description:
      "SAMR published a series of merger-control decisions in 2022-2024 involving CASC/CASIC subsidiary restructurings + commercial-launch entrant acquisitions. Confirms that Chinese space-industry concentrations cross thresholds for SAMR notification + are subject to substantive review despite the predominantly state-owned ownership structure.",
    key_provisions: [],
    related_sources: ["CN-FOREIGN-INVESTMENT-LAW-2019"],
    last_verified: "2026-05-26",
  },
];
