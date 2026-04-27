// src/data/legal-sources/sources/cn.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * China — space-law sources and authorities.
 *
 * Note: China lacks a unified primary space-activities statute. The
 * regime is constructed from sectoral measures, the Civil Aviation Law
 * (analogically applied to launch operations), and a long-running draft
 * Space Law. Coverage here is stub-level for cross-border due diligence.
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
];

export const LEGAL_SOURCES_CN: LegalSource[] = [
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
];
