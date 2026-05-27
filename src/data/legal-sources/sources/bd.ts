/**
 * Bangladesh — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - SPARRSO (Space Research and Remote Sensing Organization) — established
 *   1980, oldest space agency in South Asia after SUPARCO Pakistan.
 * - Bangabandhu-1 (May 2018) — Bangladesh's first satellite, Thales Alenia
 *   Space-built GEO satcom, French-Italian European supply chain
 *   (alternative to Chinese CGWIC template).
 * - BSCL (Bangladesh Satellite Company Ltd) — state-owned commercial-
 *   satellite operator.
 * - Material for South Asia + Bay-of-Bengal regional cooperation, climate-
 *   change adaptation EO programs, Bangladesh-Bhutan-India-Nepal (BBIN)
 *   sub-regional cooperation.
 *
 * Naming convention: BD-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Bangladesh Authorities ──────────────────────────────────────────

export const AUTHORITIES_BD: Authority[] = [
  {
    id: "BD-SPARRSO",
    name_en:
      "Space Research and Remote Sensing Organization (SPARRSO / স্পারসো)",
    jurisdiction: "BD",
    role_description:
      "Bangladesh's national remote-sensing + space research organization, established 1980 by Presidential Ordinance LIV of 1980. Reports to Ministry of Defence. Operates remote-sensing applications + EO satellite-data reception + future indigenous satellite-development planning.",
    website: "https://www.sparrso.gov.bd/",
    applicable_areas: ["scientific_research", "registration", "procurement"],
  },
  {
    id: "BD-BSCL",
    name_en:
      "Bangladesh Satellite Company Limited (BSCL / বাংলাদেশ স্যাটেলাইট কোম্পানি লিমিটেড)",
    jurisdiction: "BD",
    role_description:
      "State-owned commercial satellite operator, established 2014 under Companies Act 1994. Operates Bangabandhu-1 satellite + ground-station infrastructure at Gazipur + Betbunia. Material for any commercial satcom cooperation in Bangladesh.",
    website: "https://www.bscl.gov.bd/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "BD-BTRC",
    name_en:
      "Bangladesh Telecommunication Regulatory Commission (BTRC / বিটিআরসি)",
    jurisdiction: "BD",
    role_description:
      "Independent telecommunications regulator established under Bangladesh Telecommunication Regulatory Act 2001. Authority for satellite-services licensing + frequency spectrum + ITU coordination.",
    website: "https://www.btrc.gov.bd/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
];

// ─── Bangladesh Legal Sources ────────────────────────────────────────

export const LEGAL_SOURCES_BD: LegalSource[] = [
  {
    id: "BD-SPARRSO-ORDINANCE-1980",
    jurisdiction: "BD",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Presidential Ordinance LIV of 1980 — Establishment of SPARRSO (Space Research and Remote Sensing Organization)",
    date_enacted: "1980-09-25",
    date_last_amended: "2010-07-18",
    source_url: "https://www.sparrso.gov.bd/history/",
    issuing_body: "President of the People's Republic of Bangladesh",
    competent_authorities: ["BD-SPARRSO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "registration"],
    scope_description:
      "Presidential Ordinance LIV of 1980 — establishes SPARRSO as Bangladesh's national space research + remote sensing organization. South Asia's second-oldest space agency after SUPARCO Pakistan (1961). Material context: (i) reports to Ministry of Defence under dual civil-military arrangement; (ii) operates EO satellite-data reception via international partnerships (NASA, JAXA, ESA); (iii) no indigenous launch or satellite capability — focus on downstream applications + remote-sensing analysis; (iv) 2010 amendment expanded climate-change adaptation + disaster-monitoring mandate. Material for any commercial-space partnership: SPARRSO acts as data-buyer + applications-developer rather than sat-operator.",
    key_provisions: [],
    related_sources: [
      "BD-BANGABANDHU-1-THALES-2018",
      "BD-DRAFT-SPACE-POLICY-2023",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "BD-BANGABANDHU-1-THALES-2018",
    jurisdiction: "BD",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Bangabandhu-1 — Bangladesh-France Bilateral via Thales Alenia Space (2018)",
    date_enacted: "2015-11-11",
    date_last_amended: "2018-05-12",
    source_url: "https://www.bscl.gov.bd/bangabandhu-1/",
    issuing_body:
      "Government of Bangladesh + Government of France (Thales Alenia Space + HSBC ECA Financing)",
    competent_authorities: ["BD-BSCL"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "frequency_spectrum",
      "media_broadcasting",
      "procurement",
    ],
    scope_description:
      "Bangabandhu-1 — Bangladesh's first satellite, launched 11 May 2018 from Cape Canaveral on Falcon 9. Thales Alenia Space Spacebus 4000B2 platform, ~$248M contract value (incl. ~$190M satellite + $58M launch + ground-segment). HSBC France-led €100M ECA-backed financing (French Export Credit Agency COFACE). 26 Ku-band + 14 C-band transponders, 119.1°E orbital slot (leased from Intersputnik for 15-year term ending 2032). Material practitioner relevance: (i) demonstrates Thales Alenia Space + French ECA + SpaceX launch alternative to Chinese CGWIC template (parallels Morocco + Vietnam Airbus DS + Thales template); (ii) Bangabandhu-2 procurement underway 2024-2025 with similar European supply chain; (iii) ground-segment cyber-security framework adopted from French CNIL + ANSSI standards.",
    key_provisions: [
      "Thales Alenia Space prime contractor",
      "HSBC France-led €100M ECA-backed financing (COFACE)",
      "119.1°E orbital slot leased from Intersputnik (15-year)",
      "Bangabandhu-2 procurement 2024-2025 European supply chain",
    ],
    related_sources: ["MA-MOHAMMED-VI-PROGRAMME", "VN-VNREDSAT-FRANCE-ODA"],
    last_verified: "2026-05-27",
  },
  {
    id: "BD-DRAFT-SPACE-POLICY-2023",
    jurisdiction: "BD",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Draft Bangladesh National Space Policy 2023 + Space Activities Bill 2024 — Pending Cabinet Approval",
    date_published: "2023-12-10",
    source_url: "https://www.sparrso.gov.bd/draft-space-policy-2023/",
    issuing_body:
      "SPARRSO + Ministry of Defence + Ministry of Information and Communication Technology",
    competent_authorities: ["BD-SPARRSO", "BD-BSCL"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "Draft Bangladesh National Space Policy 2023 + draft Space Activities Bill 2024 — pending Cabinet approval + Parliamentary enactment 2025-2026. Material provisions: (i) §10 establishes Bangladesh Space Activities Regulatory Authority (BSARA) as proposed independent regulator; (ii) §15 third-party liability cap BDT 10B (~US$85M); (iii) §22 spacecraft registry compliant with UN Registration Convention; (iv) §35-40 supervisory powers; (v) priority-areas include climate-change adaptation EO (Bay of Bengal cyclone monitoring) + agriculture EO + sovereign satcom + indigenous CubeSat development. Material gap: existing draft criticised for not addressing Bay-of-Bengal trans-boundary EO data flows + Bangladesh-India water-sharing satellite-imagery diplomacy.",
    key_provisions: [
      "§10 — BSARA proposed independent regulator",
      "§15 — third-party liability cap BDT 10B",
      "§22 — national spacecraft registry",
      "Priority: climate-change adaptation EO + Bay of Bengal monitoring",
    ],
    related_sources: [
      "BD-SPARRSO-ORDINANCE-1980",
      "BD-BANGABANDHU-1-THALES-2018",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "BD-BTRC-ACT-2001",
    jurisdiction: "BD",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Bangladesh Telecommunication Regulatory Act 2001 + Telecommunications Policy 2018",
    date_enacted: "2001-04-22",
    date_last_amended: "2024-08-19",
    source_url:
      "https://www.btrc.gov.bd/site/page/9d6e9b32-1d6f-4d52-8b94-a16fef07a2c0/Acts",
    issuing_body: "Parliament of Bangladesh",
    competent_authorities: ["BD-BTRC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Bangladesh Telecommunication Regulatory Act 2001 — primary telecoms framework. BTRC authority covers: (i) §31 individual + class licenses for satellite services; (ii) §44 frequency assignments + ITU coordination; (iii) §99 enforcement penalties. Telecommunications Policy 2018 introduced satellite-services framework + commercial-VSAT licensing. Material for satellite-operator Bangladesh market entry: Starlink applied for licensing 2023, BTRC approval pending as of 2024 (cited national-security review + cyber-security framework requirements). Foreign-ownership rules: 100% allowed in NTTN services but de facto preference for Robi/Banglalink/GP partnerships.",
    key_provisions: [
      "§31 — individual + class licenses",
      "§44 — frequency + ITU coordination",
      "§99 — enforcement penalties",
      "Telecommunications Policy 2018 — VSAT framework",
    ],
    related_sources: ["BD-BANGABANDHU-1-THALES-2018"],
    last_verified: "2026-05-27",
  },
  {
    id: "BD-DATA-PROTECTION-ACT-2023",
    jurisdiction: "BD",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Draft Bangladesh Personal Data Protection Act 2023 — Pending Parliamentary Enactment",
    date_published: "2023-08-31",
    source_url:
      "https://ictd.gov.bd/site/page/draft-personal-data-protection-act-2023",
    issuing_body: "Ministry of Information and Communication Technology",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "Draft Bangladesh PDPA 2023 — GDPR-inspired data protection framework under stakeholder consultation since 2022. Material for satellite-imagery + EO-as-a-service operators serving Bangladeshi customers: (i) §26 explicit consent for sensitive personal data including location; (ii) §28 data-localisation requirement (criticised by EU-Bangladesh trade dialogue 2024); (iii) §83 fines up to BDT 1 crore (~$85K) + criminal sanctions; (iv) proposed Data Protection Authority. Bangladesh pursuing EU GDPR adequacy decision in parallel since 2023.",
    key_provisions: [
      "§26 — explicit consent for sensitive data",
      "§28 — data-localisation requirement",
      "§83 — fines BDT 1 crore + criminal",
      "Proposed Data Protection Authority",
    ],
    related_sources: ["BD-BTRC-ACT-2001"],
    last_verified: "2026-05-27",
  },
];
