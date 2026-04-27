// src/data/legal-sources/sources/kr.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Republic of Korea — space-law sources and authorities.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_KR: Authority[] = [
  {
    id: "KR-KASA",
    jurisdiction: "KR",
    name_en: "Korea AeroSpace Administration",
    name_local: "우주항공청",
    abbreviation: "KASA",
    parent_ministry: "Office of the Prime Minister",
    website: "https://kasa.go.kr/",
    space_mandate:
      "National space agency established 27 May 2024 — successor authority for civil space programmes and the principal regulator for space-activity authorisations under the Space Development Promotion Act and Space Liability Act. Replaced the prior MSIT-led structure.",
    legal_basis:
      "Special Act on the Establishment of the Korea AeroSpace Administration (Act No. 19883, 2024)",
    applicable_areas: ["licensing", "registration", "liability", "insurance"],
  },
  {
    id: "KR-MSIT",
    jurisdiction: "KR",
    name_en: "Ministry of Science and ICT",
    name_local: "과학기술정보통신부",
    abbreviation: "MSIT",
    website: "https://www.msit.go.kr/eng/",
    space_mandate:
      "Pre-2024 lead ministry for space policy; retains authority over satellite-frequency and broadcasting-spectrum allocation under the Radio Waves Act and Telecommunications Business Act. Co-administers the export-control regime for space items.",
    legal_basis: "Radio Waves Act; Telecommunications Business Act",
    applicable_areas: ["frequency_spectrum", "export_control"],
  },
  {
    id: "KR-KARI",
    jurisdiction: "KR",
    name_en: "Korea Aerospace Research Institute",
    name_local: "한국항공우주연구원",
    abbreviation: "KARI",
    website: "https://www.kari.re.kr/eng/",
    space_mandate:
      "Government-funded research institute responsible for the Nuri (KSLV-II) launch vehicle programme, KOMPSAT EO satellites, and the Korean lunar exploration programme. Technical advisor to KASA.",
    legal_basis: "Establishment Act 1989",
    applicable_areas: ["licensing"],
  },
];

export const LEGAL_SOURCES_KR: LegalSource[] = [
  {
    id: "KR-SPACE-DEV-PROMO-ACT",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Development Promotion Act",
    title_local: "우주개발 진흥법",
    date_enacted: "2005-05-31",
    date_last_amended: "2024-05-27",
    official_reference: "Act No. 7546 of 2005, latest amendment Act No. 19883",
    source_url:
      "https://elaw.klri.re.kr/eng_service/lawView.do?hseq=64127&lang=ENG",
    issuing_body: "National Assembly",
    competent_authorities: ["KR-KASA"],
    relevance_level: "fundamental",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
    ],
    compliance_areas: ["licensing", "registration", "debris_mitigation"],
    scope_description:
      "Foundational space-promotion statute that creates the licensing regime for launches and on-orbit operations from Korean territory or by Korean operators. Establishes the National Space Committee, the national space-objects registry, and the technical-review framework that KASA inherits from the previous MSIT architecture.",
    key_provisions: [
      {
        section: "Art. 11",
        title: "Permit for launches",
        summary:
          "Persons intending to launch a space object from the Republic of Korea, or to launch a Korean space object from foreign territory, must obtain KASA permission. Conditions include safety, technical capability, and indemnification arrangements.",
      },
      {
        section: "Art. 8",
        title: "Registry of space objects",
        summary:
          "Mandatory registration of all Korean-launched space objects in the national registry, fulfilling Korea's obligations under the Registration Convention.",
      },
    ],
    related_sources: ["KR-SPACE-LIABILITY-ACT", "INT-OST-1967"],
    last_verified: "2026-04-22",
  },
  {
    id: "KR-SPACE-LIABILITY-ACT",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Liability Act",
    title_local: "우주손해배상법",
    date_enacted: "2007-12-21",
    official_reference: "Act No. 8714 of 2007",
    source_url:
      "https://elaw.klri.re.kr/eng_service/lawView.do?hseq=23472&lang=ENG",
    issuing_body: "National Assembly",
    competent_authorities: ["KR-KASA"],
    relevance_level: "critical",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["liability", "insurance"],
    scope_description:
      "Domestic implementation of the Liability Convention for Korean space activities. Establishes a strict-liability regime for launching persons, mandatory third-party-liability insurance up to a Cabinet-set ceiling, and Government indemnification above the insurance cap.",
    key_provisions: [
      {
        section: "Art. 3",
        title: "Strict liability for surface damage",
        summary:
          "Launching persons are absolutely liable for damage caused by Korean space objects on the Earth's surface or to aircraft in flight, mirroring the Liability Convention regime.",
      },
      {
        section: "Art. 6-8",
        title: "Insurance and Government indemnification",
        summary:
          "Mandatory third-party-liability insurance to a Cabinet-set ceiling; Government indemnification for amounts above the insurance cap, subject to compliance with Space Development Promotion Act conditions.",
      },
    ],
    related_sources: ["KR-SPACE-DEV-PROMO-ACT", "INT-LIABILITY-1972"],
    last_verified: "2026-04-22",
  },
  {
    id: "KR-OST-1967",
    jurisdiction: "KR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Korean Ratification",
    date_enacted: "1967-10-13",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of the Republic of Korea",
    competent_authorities: ["KR-KASA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Korea's ratification of the 1967 Outer Space Treaty. State-responsibility obligations discharged via the Space Development Promotion Act and Space Liability Act. Korea is also a signatory to the Artemis Accords (May 2021).",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "Korea is internationally responsible for national activities in outer space — basis for the KASA-administered authorisation regime.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-04-22",
  },
];
