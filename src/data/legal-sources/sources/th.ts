/**
 * Thailand — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - GISTDA (Geo-Informatics and Space Technology Development Agency) —
 *   established 2000 under MOST, operates THEOS series + ground-segment.
 * - THEOS-1 (2008, Airbus DS) + THEOS-2 (2023, Airbus DS HiRes 0.5m
 *   + small Thai-built engineering test satellite).
 * - Thaicom 4/IPSTAR + Thaicom 6/7/8 — Asia's first commercial satcom
 *   operator (privatized 1991, Shin Corporation/InTouch Holdings).
 * - National Space Master Plan 2017-2036 — institutional framework.
 * - Material for ASEAN regional cooperation, Mekong River EO monitoring,
 *   China-Belt-and-Road space cooperation, US strategic partnership.
 *
 * Naming convention: TH-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Thailand Authorities ────────────────────────────────────────────

export const AUTHORITIES_TH: Authority[] = [
  {
    id: "TH-GISTDA",
    name_en:
      "Geo-Informatics and Space Technology Development Agency (GISTDA / สำนักงานพัฒนาเทคโนโลยีอวกาศและภูมิสารสนเทศ)",
    jurisdiction: "TH",
    role_description:
      "Thailand's space + geo-informatics agency, established 2000 by Royal Decree under MHESI (Ministry of Higher Education, Science, Research and Innovation). Operates THEOS satellites + Space Operation Centre Si Racha. Material for EO licensing + national space programme + ASEAN coordination.",
    website: "https://www.gistda.or.th/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "procurement",
    ],
  },
  {
    id: "TH-NBTC",
    name_en:
      "National Broadcasting and Telecommunications Commission (NBTC / กสทช)",
    jurisdiction: "TH",
    role_description:
      "Independent telecom + broadcasting regulator established by the Frequency Allocation Act 2010. Authority for satellite-services licensing + frequency spectrum + ITU coordination + orbital-slot management.",
    website: "https://www.nbtc.go.th/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "TH-RTAF-SPACE",
    name_en: "Royal Thai Air Force Space Operations Centre (RTAF-SOC)",
    jurisdiction: "TH",
    role_description:
      "Royal Thai Air Force space-domain awareness + SDA operations centre established 2020. Material for Thai military-utility satellite operations + ASEAN regional SDA cooperation.",
    website: "https://www.rtaf.mi.th/",
    applicable_areas: ["military_dual_use", "registration"],
  },
  {
    id: "TH-PDPC",
    name_en:
      "Personal Data Protection Committee (PDPC / คณะกรรมการคุ้มครองข้อมูลส่วนบุคคล)",
    jurisdiction: "TH",
    role_description:
      "Independent DPA established under Personal Data Protection Act B.E. 2562 (2019). Operational from June 2022. Authority for data-protection enforcement incl. satellite-imagery + EO-as-a-service.",
    website: "https://www.pdpc.or.th/",
    applicable_areas: ["data_security"],
  },
];

// ─── Thailand Legal Sources ──────────────────────────────────────────

export const LEGAL_SOURCES_TH: LegalSource[] = [
  {
    id: "TH-DRAFT-SPACE-ACT-2024",
    jurisdiction: "TH",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Draft Thailand Space Affairs Act (B.E. 2567 / 2024) — Pending Cabinet + Parliamentary Enactment",
    date_published: "2024-09-10",
    source_url: "https://www.gistda.or.th/news_view.php?n_id=8650",
    issuing_body: "GISTDA + MHESI",
    competent_authorities: ["TH-GISTDA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "Draft Thailand Space Affairs Act — first comprehensive national space law for Thailand. Approved by Cabinet 2024, pending House of Representatives + Senate enactment Q4 2025. Modelled on UK SIA 2018 + Japanese Space Activities Act 2016. Material provisions: (i) §10 GISTDA licensing authority for launch + operation + ground-segment; (ii) §15 third-party liability cap THB 1B (~US$30M); (iii) §22 spacecraft registry compliant with UN Registration Convention; (iv) §35-40 supervisory powers + sanctions regime; (v) §45 sandbox provisions for experimental missions. Material for any space-tech investment + JV planning in Thailand. Current gap: no statutory framework, practitioners operate under NBTC + GISTDA permit-of-cooperation framework.",
    key_provisions: [
      "§10 — GISTDA licensing authority",
      "§15 — third-party liability cap THB 1B",
      "§22 — national spacecraft registry",
      "§35-40 — supervisory powers + sanctions",
      "§45 — regulatory sandbox provisions",
    ],
    related_sources: [
      "TH-NATIONAL-SPACE-MASTER-PLAN-2017",
      "TH-GISTDA-ROYAL-DECREE-2000",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "TH-GISTDA-ROYAL-DECREE-2000",
    jurisdiction: "TH",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Royal Decree Establishing GISTDA B.E. 2543 (2000) — Geo-Informatics and Space Technology Development Agency",
    date_enacted: "2000-11-03",
    date_last_amended: "2019-04-30",
    source_url: "https://www.gistda.or.th/main/en/node/3013",
    issuing_body: "King Bhumibol Adulyadej (Rama IX) / Prime Minister",
    competent_authorities: ["TH-GISTDA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research", "registration"],
    scope_description:
      "Royal Decree 2000 — establishes GISTDA as Thailand's national space + geo-informatics agency under MHESI. Material context: (i) reports to MHESI Minister; (ii) operates Space Operation Centre Si Racha + national receiving stations; (iii) commercial-services authority (THEOS imagery sales); (iv) operational authority for THEOS-1/-2 + future LOTUSat-equivalent Thai missions. Operational structure overhauled 2019 to expand commercial-services mandate. Material for any commercial-space partnership in Thailand.",
    key_provisions: [],
    related_sources: [
      "TH-NATIONAL-SPACE-MASTER-PLAN-2017",
      "TH-THEOS-PROGRAMME",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "TH-NATIONAL-SPACE-MASTER-PLAN-2017",
    jurisdiction: "TH",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Thailand National Space Master Plan 2017-2036 + Space Economy Vision 2037",
    date_enacted: "2017-12-26",
    date_last_amended: "2023-11-21",
    source_url: "https://www.gistda.or.th/main/en/node/8000",
    issuing_body: "National Space Policy Committee (NSPC) + GISTDA",
    competent_authorities: ["TH-GISTDA", "TH-NBTC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research", "procurement"],
    scope_description:
      "Thailand National Space Master Plan 2017-2036 — 20-year strategic plan establishing 5 pillars: (1) downstream applications (EO + GNSS); (2) sovereign space-tech capability; (3) industrial base + commercial-space ecosystem; (4) workforce development; (5) international cooperation. Space Economy Vision 2037: target THB 50B (~US$1.5B) annual space-economy revenue by 2037. Material for any commercial-space partnership: NSPC strategic priorities + local-content + technology-transfer obligations. ASEAN Spaceport Initiative — Thailand exploring equatorial launch facility at Songkhla (~7°N) jointly with GISTDA + JAXA.",
    key_provisions: [
      "Pillar 1 — downstream applications",
      "Pillar 2 — sovereign space-tech",
      "Pillar 3 — commercial-space ecosystem",
      "Space Economy Vision 2037 — THB 50B target",
      "ASEAN Spaceport Initiative — Songkhla equatorial site exploration",
    ],
    related_sources: ["TH-GISTDA-ROYAL-DECREE-2000", "TH-THEOS-PROGRAMME"],
    last_verified: "2026-05-27",
  },
  {
    id: "TH-THEOS-PROGRAMME",
    jurisdiction: "TH",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "THEOS Programme — Thailand Earth Observation Satellites (THEOS-1 2008 + THEOS-2 2023, Airbus DS)",
    date_enacted: "2004-07-19",
    date_last_amended: "2023-10-09",
    source_url:
      "https://www.airbus.com/en/newsroom/press-releases/2023-10-airbus-built-theos-2-earth-observation-satellite-successfully-launched",
    issuing_body:
      "Government of Thailand (GISTDA) + Government of France (Airbus DS + CNES)",
    competent_authorities: ["TH-GISTDA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration", "scientific_research", "procurement"],
    scope_description:
      "THEOS Programme — Thailand's sovereign EO programme via French Airbus DS. Material missions: THEOS-1 (2008, Airbus DS 750kg, 2m panchromatic + 15m multispectral, decommissioned 2018, ~$135M contract); THEOS-2 (Oct 2023, Airbus DS 425kg, 0.5m panchromatic + 2m multispectral, ~$210M contract); THEOS-2A (Thai-built engineering small-sat, launched same Vega VV23 mission Oct 2023). Material for non-CN Thai bilateral space-tech: established Thailand-France cooperation model + Airbus DS African + Asian export portfolio (Algeria + Vietnam + South Korea + Morocco + Indonesia all use similar Airbus DS frameworks). THEOS-3 RFP underway 2024 — Thai-led design with Japanese (NEC) cooperation under exploration.",
    key_provisions: [
      "THEOS-1 — Airbus DS 2008, ~$135M",
      "THEOS-2 — Airbus DS 2023, ~$210M",
      "THEOS-2A — Thai-built engineering small-sat",
      "THEOS-3 — RFP underway 2024, Japanese NEC cooperation exploration",
    ],
    related_sources: ["TH-GISTDA-ROYAL-DECREE-2000"],
    last_verified: "2026-05-27",
  },
  {
    id: "TH-FREQUENCY-ALLOCATION-ACT-2010",
    jurisdiction: "TH",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Frequency Allocation Act B.E. 2553 (2010) + NBTC Notification on Satellite Services (2023)",
    date_enacted: "2010-12-19",
    date_last_amended: "2024-03-22",
    source_url: "https://www.nbtc.go.th/Information/Laws-Regulations",
    issuing_body: "National Assembly of Thailand",
    competent_authorities: ["TH-NBTC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Frequency Allocation Act 2010 — primary Thai telecoms + spectrum framework. NBTC authority covers: (i) §41 satellite-services licensing; (ii) §44 frequency assignments + ITU coordination; (iii) NBTC Notification 2023 on Foreign Satellite Services adopts NEW LEO-specific licensing requirements (introduced for Starlink-class operators, Starlink launched January 2025 after NBTC license March 2024); (iv) §49 49% foreign-ownership cap for facilities-based operators. Material for foreign satellite operators: Thai NBTC licensing process took 12+ months for Starlink. Orbital-slot management: Thaicom 8 + Thaicom 9 leverage 78.5°E + 119.5°E slots — material for any GEO satcom relocation considerations.",
    key_provisions: [
      "§41 — satellite-services licensing",
      "§44 — frequency + ITU coordination",
      "NBTC Notification 2023 — LEO-specific licensing",
      "§49 — 49% foreign-ownership cap",
    ],
    related_sources: ["TH-THAICOM-PROGRAMME"],
    last_verified: "2026-05-27",
  },
  {
    id: "TH-THAICOM-PROGRAMME",
    jurisdiction: "TH",
    type: "case_law",
    status: "in_force",
    title_en:
      "Thaicom Programme + Concession Dispute (1991 Concession + 2017 PCT Conversion + 2021 Litigation)",
    date_enacted: "1991-09-11",
    date_last_amended: "2024-07-15",
    source_url: "https://www.thaicom.net/about-us/",
    issuing_body:
      "Thaicom Public Company Limited + Ministry of ICT (MICT) / NBTC",
    competent_authorities: ["TH-NBTC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: [
      "frequency_spectrum",
      "media_broadcasting",
      "competition_antitrust",
    ],
    scope_description:
      "Thaicom — Asia's first commercial satcom operator. Established 1991 by Shin Corporation under 30-year concession (1991-2021). Material space-industry context: (i) Thaicom 1-8 satcom fleet with orbital slots 78.5°E + 119.5°E + 120°E + 142°E; (ii) IPSTAR/Thaicom 4 (2005) — first commercial Ka-band high-throughput satellite globally; (iii) 2017 PCT Conversion controversy: Thaksin Shinawatra-related divestiture, Temasek Holdings sale to Singapore-linked entities — political dispute; (iv) 2021 Concession Expiration: Thai Cabinet decided May 2021 to allow Thaicom 4 + 6 to operate post-concession under NBTC licensing — Thaicom 9 + 10 launching 2024-2026 under new Inter Satellite licensing regime. Material practitioner relevance: Thai Cabinet's 2021 decision creates ASEAN's most evolved concession-to-licensing transition framework.",
    key_provisions: [],
    related_sources: ["TH-FREQUENCY-ALLOCATION-ACT-2010"],
    last_verified: "2026-05-27",
  },
  {
    id: "TH-PDPA-2562-2019",
    jurisdiction: "TH",
    type: "federal_law",
    status: "in_force",
    title_en: "Personal Data Protection Act B.E. 2562 (2019) — PDPA Thailand",
    date_enacted: "2019-05-24",
    date_last_amended: "2022-06-01",
    source_url: "https://www.pdpc.or.th/index.php/web/laws",
    issuing_body: "National Assembly of Thailand",
    competent_authorities: ["TH-PDPC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "PDPA Thailand — GDPR-inspired data protection framework. Effective 1 June 2022 (after 2-year delay from May 2020 original effective date). PDPC operational from same date. Material for satellite-imagery + EO-as-a-service operators: (i) §26 explicit consent for sensitive personal data including location; (ii) §28 cross-border data-transfer rules (adequacy decisions + binding corporate rules); (iii) §83 fines up to THB 5M + criminal sanctions; (iv) Notification on Data Protection Officers (Aug 2023) — DPO required for systematic large-scale processing. Thailand pursuing EU adequacy since 2023.",
    key_provisions: [
      "§26 — explicit consent for sensitive data",
      "§28 — cross-border transfer rules",
      "§83 — fines (THB 5M + criminal)",
      "DPO requirement (Aug 2023 Notification)",
    ],
    related_sources: ["TH-FREQUENCY-ALLOCATION-ACT-2010"],
    last_verified: "2026-05-27",
  },
];
