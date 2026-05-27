// src/data/legal-sources/sources/kr.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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

  {
    id: "KR-RADIO-WAVES-ACT",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Radio Waves Act",
    title_local: "전파법",
    date_enacted: "1961-12-30",
    date_last_amended: "2024-12-31",
    official_reference: "Act No. 808 of 1961 (as amended)",
    source_url:
      "https://elaw.klri.re.kr/eng_service/lawView.do?hseq=64132&lang=ENG",
    issuing_body: "National Assembly",
    competent_authorities: ["KR-MSIT"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Korea's primary radio-spectrum statute administered by MSIT. Captures satellite-spectrum licensing, ITU coordination filings, and earth-station authorisations. Companion to the Space Development Promotion Act on the spectrum side; KASA coordinates with MSIT on satellite-network spectrum allocation.",
    key_provisions: [
      {
        section: "Art. 19-20",
        title: "Radio-station licence required",
        summary:
          "All radio stations including satellite TT&C, ground stations, and gateway terminals require an MSIT licence; specific provisions govern satellite-spectrum use.",
      },
    ],
    related_sources: ["KR-SPACE-DEV-PROMO-ACT", "INT-ITU-RR"],
    last_verified: "2026-04-22",
  },
  {
    id: "KR-PIPA-2011",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Personal Information Protection Act",
    title_local: "개인정보 보호법",
    date_enacted: "2011-03-29",
    date_last_amended: "2024-09-15",
    official_reference: "Act No. 10465 of 2011 (as amended)",
    source_url:
      "https://elaw.klri.re.kr/eng_service/lawView.do?hseq=42727&lang=ENG",
    issuing_body: "National Assembly",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "data_provider", "ground_segment"],
    compliance_areas: ["data_security"],
    scope_description:
      "Korea's general data-protection statute under the supervision of the Personal Information Protection Commission. Captures Earth-observation operators whose imagery resolves identifiable individuals and satcom-subscriber data with a Korean nexus. Korea has been recognised as providing adequate protection by the EU under GDPR Art. 45.",
    key_provisions: [
      {
        section: "Art. 17-18",
        title: "Cross-border transfers",
        summary:
          "Transfers permitted with consent or to jurisdictions deemed adequate by the Korean PIPC.",
      },
    ],
    related_sources: ["EU-GDPR-2016"],
    last_verified: "2026-04-22",
  },
  {
    id: "KR-NARO-SPACE-CENTRE",
    jurisdiction: "KR",
    type: "policy_document",
    status: "in_force",
    title_en: "Naro Space Center — Korean Launch Range Authorisation Reference",
    title_local: "나로우주센터 운영 정책 (Naro Space Center Operating Policy)",
    date_published: "2025-06-01",
    source_url: "https://kasa.go.kr/eng/main/main.do",
    issuing_body: "Korea AeroSpace Administration",
    competent_authorities: ["KR-KASA", "KR-KARI"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Reference entry for the Naro Space Center (Goheung) — Korea's primary launch site, host of all Nuri (KSLV-II) launches. KASA administers launch authorisations under the Space Development Promotion Act; KARI operates the range. Foreign launch operators have no current commercial access; the site is reserved for Korean Government and KARI/KASA partner missions.",
    key_provisions: [
      {
        section: "Site access",
        title: "Korean Government and partner missions",
        summary:
          "Naro Space Center hosts Korean Government launches; commercial third-party access is being developed but not yet operational as of April 2026.",
      },
    ],
    related_sources: ["KR-SPACE-DEV-PROMO-ACT"],
    last_verified: "2026-04-22",
  },
  {
    id: "KR-KASA-SPECIAL-ACT",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Special Act on the Establishment and Operation of the Korea AeroSpace Administration",
    title_local: "우주항공청의 설치 및 운영에 관한 특별법",
    date_enacted: "2024-01-26",
    date_in_force: "2024-05-27",
    official_reference: "Act No. 19883 of 2024",
    source_url:
      "https://elaw.klri.re.kr/eng_service/lawView.do?hseq=66821&lang=ENG",
    issuing_body: "National Assembly",
    competent_authorities: ["KR-KASA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Establishment statute creating KASA in May 2024 as Korea's national space agency under the Office of the Prime Minister. Transferred core licensing and policy functions from MSIT, consolidating Korean civil-space governance into a single regulator. Operative basis for the regulatory transition that affects every commercial space-permit application from May 2024 onward.",
    key_provisions: [
      {
        section: "Art. 4-9",
        title: "KASA mandate and powers",
        summary:
          "KASA receives policy-coordination, licensing, and international-cooperation competences for civil space activities; supersedes MSIT in space-licensing.",
      },
    ],
    related_sources: ["KR-SPACE-DEV-PROMO-ACT", "KR-SPACE-LIABILITY-ACT"],
    last_verified: "2026-04-22",
  },

  // ─── Debris-Mitigation national stack — 2026 audit additions ───────

  {
    id: "KR-KASA-DEBRIS-GUIDELINE",
    jurisdiction: "KR",
    type: "policy_document",
    status: "in_force",
    title_en: "KASA Space Debris Mitigation Guideline",
    title_local: "한국항공우주청 우주잔해물 발생방지 지침",
    date_published: "2024-05-27",
    official_reference: "KASA Notice 2024-08",
    source_url: "https://www.kasa.go.kr/eng/",
    issuing_body: "Korea AeroSpace Administration (KASA)",
    competent_authorities: ["KR-KASA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation", "licensing"],
    scope_description:
      "First debris-mitigation guideline issued by the newly-established Korea AeroSpace Administration (KASA, operational since May 2024). References IADC guidelines, ISO 24113, and the FCC 5-year rule as technical baseline. Binding on operators applying for launch authorisations and satellite registration under the Space Development Promotion Act.",
    key_provisions: [
      {
        section: "§3",
        title: "Technical baseline",
        summary:
          "Licence applicants shall demonstrate compliance with ISO 24113:2023 and IADC 2025 guidelines.",
      },
      {
        section: "§5",
        title: "5-year LEO PMD",
        summary:
          "New LEO missions shall be disposed of within 5 years of mission completion.",
      },
    ],
    related_sources: [
      "KR-SPACE-DEV-PROMO-ACT",
      "INT-IADC-MITIGATION-2025",
      "INT-ISO-24113-2023",
    ],
    last_verified: "2026-04-27",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Atlas P4 (2026-05-26): Korea sub-tier deepening — KASA establishment
  // (2024), Nuri orbital milestone (KR 7th orbital state 2022), Danuri
  // lunar (KPLO 2022), MTCR membership, Artemis Accords, KSLV-III
  // development, INNOSPACE commercial first launch. Per
  // ATLAS-CORPUS-EXPANSION-PLAN.md § 8.E.
  // ═══════════════════════════════════════════════════════════════════════

  // ─── KASA + institutional reform ─────────────────────────────────────
  {
    id: "KR-KASA-ESTABLISHMENT-2024",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Korea AeroSpace Administration Establishment Act",
    title_local: "한국항공우주청 설치 및 운영에 관한 법률",
    date_enacted: "2024-01-09",
    date_in_force: "2024-05-27",
    source_url: "https://www.kasa.go.kr/",
    issuing_body: "National Assembly of Korea",
    competent_authorities: ["KR-KASA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    scope_description:
      "Foundational statute creating the Korea AeroSpace Administration (KASA) as Korea's first dedicated national space agency. Effective May 2024, consolidating space-policy authority previously distributed across MSIT, KARI, DAPA, and Ministry of National Defence. Located in Sacheon, South Gyeongsang Province. Material institutional change — counsel must navigate the transition period 2024-2026 during which legacy authority retentions persist.",
    key_provisions: [
      {
        section: "Article 3 + 7",
        title: "KASA mandate + competent-authority transfer",
        summary:
          "KASA assumes lead-coordinator role for space policy + R&D + international cooperation. Specific authorisation power under Space Development Promotion Act + Space Liability Act transferred from MSIT to KASA over phased period.",
      },
    ],
    related_sources: ["KR-KASA-SPECIAL-ACT", "KR-SPACE-DEV-PROMO-ACT"],
    last_verified: "2026-05-26",
  },

  // ─── Space industry promotion + KARI ─────────────────────────────────
  {
    id: "KR-SPACE-INDUSTRY-PROMO-2017",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Industry Promotion Act",
    title_local: "우주산업 진흥에 관한 법률",
    date_enacted: "2017-11-24",
    date_last_amended: "2024-01-01",
    source_url: "https://www.law.go.kr/",
    issuing_body: "National Assembly of Korea",
    competent_authorities: ["KR-KASA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["state_aid", "procurement"],
    scope_description:
      "Industrial-promotion framework for Korean space sector. Authorises Government grants + tax incentives + technology-transfer programmes for Korean space firms. Material counterparty framework for Hanwha Systems, KAI, INNOSPACE, Perigee Aerospace, Contec, and other commercial-space participants. Substantially amended 2024 to align with KASA establishment.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "KR-KARI-CHARTER",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Korea Aerospace Research Institute Charter",
    title_local: "한국항공우주연구원 법률 근거",
    date_enacted: "1989-10-10",
    date_last_amended: "2024-05-27",
    source_url: "https://www.kari.re.kr/",
    issuing_body: "National Assembly of Korea",
    competent_authorities: ["KR-KARI"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "scientific_research"],
    scope_description:
      "Establishment + operational mandate of KARI (Korea Aerospace Research Institute) — primary Korean R&D entity for space, originally under MSIT, transitioning to KASA from 2024. KARI operates Nuri rocket programme, Naro Space Center, Danuri lunar mission, and Korea's segment of the ISS visit programme.",
    key_provisions: [],
    related_sources: ["KR-NARO-SPACE-CENTRE"],
    last_verified: "2026-05-26",
  },

  // ─── Launch + lunar milestones ───────────────────────────────────────
  {
    id: "KR-NURI-MILESTONE-2022",
    jurisdiction: "KR",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Nuri Rocket First Successful Orbital Launch — KR 7th Orbital State",
    title_local: "누리호 첫 궤도 진입 성공",
    date_published: "2022-06-21",
    source_url: "https://www.kari.re.kr/eng/sub03_03_01.do",
    issuing_body: "KARI",
    competent_authorities: ["KR-KARI"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Korea's first successful indigenous orbital launch — Nuri (KSLV-II) rocket placed verification satellite into 700 km orbit, 21 June 2022. Korea became the 7th state to launch its own satellite into orbit. Material milestone enabling KSLV-III development + Korea's commercial-launch ambitions through Innospace, Perigee Aerospace, and KAI follow-on programmes.",
    key_provisions: [],
    related_sources: ["KR-KSLV3-DEVELOPMENT"],
    last_verified: "2026-05-26",
  },
  {
    id: "KR-DANURI-KPLO-2022",
    jurisdiction: "KR",
    type: "policy_document",
    status: "in_force",
    title_en: "Danuri (Korea Pathfinder Lunar Orbiter) Mission Framework",
    title_local: "다누리 — 한국 달 탐사선",
    date_published: "2022-08-04",
    source_url: "https://www.kari.re.kr/eng/sub05_02_03_03.do",
    issuing_body: "KARI + NASA",
    competent_authorities: ["KR-KARI"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "scientific_research"],
    scope_description:
      "Korea's first lunar mission. Launched August 2022 on SpaceX Falcon 9. Used NASA's Deep Space Network for communications. Operationalised the Korea-NASA Artemis cooperation framework (predecessor to KASA's expanded mandate). Material precedent for Korean deep-space + Artemis-aligned activities.",
    key_provisions: [],
    related_sources: ["INT-KOREA-NASA-ARTEMIS-MOU"],
    last_verified: "2026-05-26",
  },
  {
    id: "KR-KSLV3-DEVELOPMENT",
    jurisdiction: "KR",
    type: "policy_document",
    status: "in_force",
    title_en: "KSLV-III Next-Generation Launch Vehicle Development Programme",
    title_local: "차세대 발사체 (KSLV-III) 개발 사업",
    date_published: "2022-12-01",
    source_url: "https://www.kari.re.kr/",
    issuing_body: "KARI + Hanwha Aerospace (prime contractor 2023)",
    competent_authorities: ["KR-KASA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["procurement", "state_aid"],
    scope_description:
      "KSLV-III development programme. ₩2 trillion (~$1.5B) budget through 2032 — successor to Nuri (KSLV-II). Hanwha Aerospace selected as prime contractor December 2023 in major shift toward private-industry leadership. First launch targeted 2030-2032. Material for Korean commercial launch market.",
    key_provisions: [],
    related_sources: ["KR-NURI-MILESTONE-2022"],
    last_verified: "2026-05-26",
  },

  // ─── Defence + space-security ────────────────────────────────────────
  {
    id: "KR-DEFENSE-SPACE-COOP",
    jurisdiction: "KR",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Korea Defense Space Cooperation Framework",
    title_local: "국방 우주 협력 체계",
    date_published: "2022-12-01",
    source_url: "https://www.mnd.go.kr/",
    issuing_body: "Ministry of National Defence",
    competent_authorities: ["KR-KASA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "fdi_screening"],
    scope_description:
      "Korean defense-space framework. Defense Space Cooperation Working Group established 2022 coordinating with US Space Force on shared SSA, missile-defence cueing, and resilient PNT. Korea Defense Acquisition Program Administration (DAPA) procures military-space systems separately from civil KARI/KASA programmes. Material for FDI screening of Korean space-tech firms with defence touchpoints.",
    key_provisions: [],
    related_sources: ["KR-DAPA-SPACE-PROCUREMENT"],
    last_verified: "2026-05-26",
  },
  {
    id: "KR-DAPA-SPACE-PROCUREMENT",
    jurisdiction: "KR",
    type: "procurement_framework",
    status: "in_force",
    title_en: "DAPA Defense Acquisition Program — Space-Related Procurement",
    title_local: "방위사업청 우주 관련 획득사업",
    date_enacted: "2006-01-01",
    date_last_amended: "2024-01-01",
    source_url: "https://www.dapa.go.kr/",
    issuing_body: "Defense Acquisition Program Administration",
    competent_authorities: ["KR-KASA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "military_dual_use"],
    scope_description:
      "DAPA procurement framework for military-space systems. Covers Korea military reconnaissance satellites (425 Project), SAR satellites, military secure-communications satcom. Coordinates with KARI on shared-technology programmes. Material counterparty for Korean defence-space contractors (LIG Nex1, Hanwha Systems, KAI).",
    key_provisions: [],
    related_sources: ["KR-DEFENSE-SPACE-COOP"],
    last_verified: "2026-05-26",
  },

  // ─── International cooperation ────────────────────────────────────────
  {
    id: "KR-ARTEMIS-ACCORDS-2021",
    jurisdiction: "KR",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "Korea Artemis Accords Signing",
    date_enacted: "2021-05-24",
    source_url:
      "https://www.nasa.gov/news-release/republic-of-korea-signs-artemis-accords/",
    issuing_body: "Government of Republic of Korea",
    competent_authorities: ["KR-KASA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Korea signed the Artemis Accords on 24 May 2021 (10th signatory). Material political alignment with US-led lunar + deep-space framework. Operationalised through Danuri-NASA DSN cooperation + subsequent Korea-NASA bilateral MOUs. Korea did NOT join China-Russia ILRS framework.",
    key_provisions: [],
    related_sources: ["INT-ARTEMIS-ACCORDS-2020", "INT-KOREA-NASA-ARTEMIS-MOU"],
    last_verified: "2026-05-26",
  },
  {
    id: "KR-MTCR-MEMBERSHIP-2001",
    jurisdiction: "KR",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "Korea MTCR Membership",
    date_enacted: "2001-03-26",
    source_url: "https://mtcr.info/",
    issuing_body: "Missile Technology Control Regime",
    competent_authorities: ["KR-KASA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["export_control"],
    scope_description:
      "Korea became MTCR member March 2001 (33rd member). Material constraint on Korean launch-vehicle development — KSLV programme designed within MTCR Category I + II compliance. Korea-US Missile Guidelines (formerly 800-km / 500-kg range-payload limits) fully removed 2021, accelerating KSLV-III development.",
    key_provisions: [],
    related_sources: ["KR-KSLV3-DEVELOPMENT"],
    last_verified: "2026-05-26",
  },

  // ─── Commercial launch milestone ──────────────────────────────────────
  {
    id: "KR-INNOSPACE-HANBIT-NANO-2023",
    jurisdiction: "KR",
    type: "policy_document",
    status: "in_force",
    title_en: "INNOSPACE Hanbit-Nano — Korea's First Commercial Launch",
    date_published: "2023-03-19",
    source_url: "https://www.innospc.com/",
    issuing_body: "INNOSPACE Co., Ltd.",
    competent_authorities: ["KR-KASA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "INNOSPACE Hanbit-Nano (suborbital test) launched from Alcântara, Brazil, March 2023 — Korea's first commercial launch. Demonstrates Korean private-sector launch capability. Foreign launch-site choice (Alcântara) reflects regulatory + technical considerations. Material precedent for Korean commercial-launch ecosystem expansion.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── Frequency / ITU coordination ─────────────────────────────────────
  {
    id: "KR-ITU-NOTIFYING-ADMIN",
    jurisdiction: "KR",
    type: "policy_document",
    status: "in_force",
    title_en: "Korea as ITU Notifying Administration",
    date_published: "2010-01-01",
    source_url: "https://www.msit.go.kr/",
    issuing_body: "Ministry of Science and ICT",
    competent_authorities: ["KR-MSIT"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "MSIT operates as Korea's national notifying administration for ITU filings. Handles satellite-frequency coordination, earth-station licensing, and ITU API/CR/N filings for Korean satellite networks (Mugunghwa GEO series, Koreasat 6/7, Cheollian-3 future GEO). Material for foreign satcom operators seeking Korea market access.",
    key_provisions: [],
    related_sources: ["KR-RADIO-WAVES-ACT"],
    last_verified: "2026-05-26",
  },

  // ─── FDI + export control ─────────────────────────────────────────────
  {
    id: "KR-FOREIGN-INVESTMENT-PROMO",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Investment Promotion Act",
    title_local: "외국인투자 촉진법",
    date_enacted: "1998-09-16",
    date_last_amended: "2024-01-01",
    source_url: "https://www.law.go.kr/",
    issuing_body: "National Assembly of Korea",
    competent_authorities: ["KR-KASA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Korean FDI framework. Generally permissive — Korea is OECD member with low FDI restrictions. Space-tech sector NOT on Negative List but specific cross-border deals with national-security implications subject to Foreign Investment Promotion Committee review under Industrial Technology Protection Act 2006.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },
  {
    id: "KR-STRATEGIC-TRADE-ACT",
    jurisdiction: "KR",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Trade Act + Strategic Items Trade Control",
    title_local: "대외무역법 — 전략물자 수출입 통제",
    date_enacted: "1986-12-31",
    date_last_amended: "2024-01-01",
    source_url: "https://www.motie.go.kr/",
    issuing_body: "Ministry of Trade, Industry and Energy",
    competent_authorities: ["KR-KASA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "export_control",
      "military_dual_use",
      "sanctions_compliance",
    ],
    scope_description:
      "Korea's export-control regime. Strategic Items List aligned with Wassenaar + MTCR + NSG + Australia Group. MOTIE Strategic Trade Information Center (STIC) operates licensing + screening. Korea-Japan trade dispute 2019-2023 demonstrated active enforcement. Material for any space-component supplier or customer with Korean counterparty.",
    key_provisions: [],
    related_sources: ["KR-MTCR-MEMBERSHIP-2001"],
    last_verified: "2026-05-26",
  },

  // ─── Cybersecurity ────────────────────────────────────────────────────
  {
    id: "KR-KISA-CYBERSEC-FRAMEWORK",
    jurisdiction: "KR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Korea Internet & Security Agency Cybersecurity Framework",
    title_local: "한국인터넷진흥원 사이버보안 프레임워크",
    date_enacted: "2015-08-01",
    date_last_amended: "2024-01-01",
    source_url: "https://www.kisa.or.kr/",
    issuing_body: "Korea Internet & Security Agency (KISA)",
    competent_authorities: ["KR-MSIT"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity", "critical_infrastructure"],
    scope_description:
      "KISA cybersecurity framework operationalising Korea's Personal Information Protection Act + Network Act. Critical Information Infrastructure (CII) designation power covers major satcom + ground-segment operators serving Korean government + finance + transport. Information Security Management System (ISMS) certification mandatory for designated CIIs.",
    key_provisions: [],
    related_sources: ["KR-PIPA-2011"],
    last_verified: "2026-05-26",
  },
];
