// src/data/legal-sources/sources/jp.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Japan — space-law sources and authorities.
 *
 * Coverage: stub-level entry covering the core post-2008 framework (Basic
 * Space Law, 2016 Space Activities Act, 2021 Space Resources Act). Suffices
 * for cross-border due diligence between EU/UK/US operators and Japanese
 * counterparties; deeper coverage will follow when a Japan-licensee mandate
 * triggers the need.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_JP: Authority[] = [
  {
    id: "JP-CABINET-OFFICE",
    jurisdiction: "JP",
    name_en: "Cabinet Office — Office of National Space Policy",
    name_local: "内閣府 宇宙開発戦略推進事務局",
    abbreviation: "Cabinet Office NSPO",
    parent_ministry: "Cabinet Office",
    website: "https://www8.cao.go.jp/space/",
    space_mandate:
      "Lead authority for licensing under the 2016 Space Activities Act. Issues launch and satellite-management permits, oversees the Space Resources Act registry, and operates the inter-ministerial Strategic Headquarters for Space Policy.",
    legal_basis: "Basic Space Law (2008); Cabinet Office Act",
    applicable_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
    ],
  },
  {
    id: "JP-METI",
    jurisdiction: "JP",
    name_en: "Ministry of Economy, Trade and Industry",
    name_local: "経済産業省",
    abbreviation: "METI",
    website: "https://www.meti.go.jp/english/policy/mono_info_service/space/",
    space_mandate:
      "Industrial policy for the space sector and dual-use export licensing under the Foreign Exchange and Foreign Trade Act. Co-administers the Space Resources Act with the Cabinet Office.",
    legal_basis: "Foreign Exchange and Foreign Trade Act (1949)",
    applicable_areas: ["export_control", "licensing"],
  },
  {
    id: "JP-MIC",
    jurisdiction: "JP",
    name_en: "Ministry of Internal Affairs and Communications",
    name_local: "総務省",
    abbreviation: "MIC",
    website: "https://www.soumu.go.jp/main_sosiki/joho_tsusin/eng/",
    space_mandate:
      "Frequency-spectrum allocation, satellite-radio-station licensing under the Radio Act, and ITU coordination filings on behalf of Japanese operators.",
    legal_basis: "Radio Act (1950)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "JP-JAXA",
    jurisdiction: "JP",
    name_en: "Japan Aerospace Exploration Agency",
    name_local: "宇宙航空研究開発機構",
    abbreviation: "JAXA",
    website: "https://www.jaxa.jp/",
    space_mandate:
      "National space agency executing exploration, science, and the H3 / Epsilon launch capability. Acts as technical advisor to the Cabinet Office on Space Activities Act review.",
    legal_basis: "Independent Administrative Agency Act (2003)",
    applicable_areas: ["licensing", "debris_mitigation"],
  },
];

export const LEGAL_SOURCES_JP: LegalSource[] = [
  {
    id: "JP-BASIC-SPACE-LAW-2008",
    jurisdiction: "JP",
    type: "federal_law",
    status: "in_force",
    title_en: "Basic Space Law",
    title_local: "宇宙基本法",
    date_enacted: "2008-05-28",
    official_reference: "Act No. 43 of 2008",
    source_url: "https://www.japaneselawtranslation.go.jp/en/laws/view/2674",
    issuing_body: "Diet of Japan",
    competent_authorities: ["JP-CABINET-OFFICE"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    scope_description:
      "Constitutional anchor of the modern Japanese space-law framework. Establishes the Cabinet-led space-policy governance, opens the door to defence-oriented use of space (a 2008 break with the prior peaceful-purposes-only doctrine), and mandates the Government to enact a Space Activities Act — delivered in 2016.",
    key_provisions: [
      {
        section: "Art. 14",
        title: "Mandate to enact a Space Activities Act",
        summary:
          "Requires the Government to legislate the licensing, liability, insurance, and debris-mitigation regime for non-governmental space activities — fulfilled by the 2016 Space Activities Act.",
      },
      {
        section: "Art. 25-30",
        title: "Strategic Headquarters for Space Policy",
        summary:
          "Establishes the Cabinet-level Strategic Headquarters chaired by the Prime Minister, with the Office of National Space Policy as its secretariat.",
      },
    ],
    related_sources: ["JP-SPACE-ACTIVITIES-ACT-2016"],
    last_verified: "2026-04-22",
  },
  {
    id: "JP-SPACE-ACTIVITIES-ACT-2016",
    jurisdiction: "JP",
    type: "federal_law",
    status: "in_force",
    title_en: "Act on Launching of Spacecraft etc. and Control of Spacecraft",
    title_local: "人工衛星等の打上げ及び人工衛星の管理に関する法律",
    date_enacted: "2016-11-16",
    date_in_force: "2018-11-15",
    official_reference: "Act No. 76 of 2016",
    source_url: "https://www8.cao.go.jp/space/english/activities/launch.html",
    issuing_body: "Diet of Japan",
    competent_authorities: ["JP-CABINET-OFFICE"],
    relevance_level: "critical",
    applicable_to: [
      "launch_provider",
      "satellite_operator",
      "constellation_operator",
    ],
    compliance_areas: [
      "licensing",
      "liability",
      "insurance",
      "debris_mitigation",
      "registration",
    ],
    scope_description:
      "Operative licensing statute for Japanese commercial launch and on-orbit-management activities. Establishes a Cabinet-Office permit regime, mandatory third-party-liability insurance (currently ¥20 billion), Government indemnification above the insurance ceiling, and explicit debris-mitigation and end-of-life-disposal duties for satellite operators.",
    key_provisions: [
      {
        section: "Art. 4-13",
        title: "Launch permit regime",
        summary:
          "Launch operators require a Cabinet-Office permit covering vehicle qualification, flight-safety analysis, third-party-liability insurance, and pre-launch range coordination. Issued for a single launch or for series of launches of the same type.",
      },
      {
        section: "Art. 20-23",
        title: "Spacecraft management permit",
        summary:
          "Separate permit regime for on-orbit operation and disposal of artificial satellites, with explicit debris-mitigation, conjunction-coordination, and de-orbit-plan requirements.",
      },
      {
        section: "Art. 35-43",
        title: "Liability and Government indemnification",
        summary:
          "Operator strict liability for surface damage; ¥20 billion mandatory insurance; Government indemnification above the insurance cap up to a Diet-set ceiling.",
      },
    ],
    related_sources: ["JP-BASIC-SPACE-LAW-2008", "JP-SPACE-RESOURCES-2021"],
    last_verified: "2026-04-22",
  },
  {
    id: "JP-SPACE-RESOURCES-2021",
    jurisdiction: "JP",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Act on Promotion of Business Activities for the Exploration and Development of Space Resources",
    title_local: "宇宙資源の探査及び開発に関する事業活動の促進に関する法律",
    date_enacted: "2021-06-15",
    date_in_force: "2021-12-23",
    official_reference: "Act No. 83 of 2021",
    source_url: "https://www8.cao.go.jp/space/policy/space_resources.html",
    issuing_body: "Diet of Japan",
    competent_authorities: ["JP-CABINET-OFFICE", "JP-METI"],
    relevance_level: "high",
    applicable_to: ["space_resource_operator"],
    compliance_areas: ["licensing"],
    scope_description:
      "Confers property rights on space resources extracted by Japanese-licensed operators, mirroring the US CSLCA Title IV approach. Japan is the fourth jurisdiction (after US, Luxembourg, UAE) to legislate space-resource ownership.",
    key_provisions: [
      {
        section: "Art. 5",
        title: "Recognition of property in extracted resources",
        summary:
          "An operator that has obtained a Cabinet-Office permit and successfully extracted space resources acquires ownership of those resources, consistent with Japan's interpretation of OST Art. II.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-04-22",
  },
  {
    id: "JP-RADIO-ACT",
    jurisdiction: "JP",
    type: "federal_law",
    status: "in_force",
    title_en: "Radio Act (Japan)",
    title_local: "電波法",
    date_enacted: "1950-05-02",
    official_reference: "Act No. 131 of 1950 (as amended)",
    source_url: "https://www.japaneselawtranslation.go.jp/en/laws/view/4124",
    issuing_body: "Diet of Japan",
    competent_authorities: ["JP-MIC"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Frequency-licensing statute administered by MIC for every radio-equipped satellite system with a Japanese gateway, operator, or end-user. Companion to the Space Activities Act on the spectrum side; ITU coordination flows through MIC notifications.",
    key_provisions: [
      {
        section: "Art. 4",
        title: "Radio-station licence required",
        summary:
          "All radio stations including satellite TT&C and payload links require an MIC licence. Foreign operators serving Japanese end-users typically require a Japanese earth-station partner.",
      },
    ],
    related_sources: ["JP-SPACE-ACTIVITIES-ACT-2016"],
    last_verified: "2026-04-22",
  },
];
