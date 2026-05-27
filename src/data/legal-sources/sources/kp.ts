/**
 * North Korea (DPRK) — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - NADA (National Aerospace Development Administration) — established
 *   2013, statutorily anchored by 2013 Space Development Law.
 * - Most comprehensively sanctioned space programme globally —
 *   triple-layered UN Security Council Resolutions + OFAC + EU + UK + JP +
 *   KR national sanctions.
 * - Active launch programme despite sanctions: Malligyong-1 (Nov 2023
 *   first successful military reconnaissance satellite after May + Aug
 *   2023 failures), Chollima-1 launch vehicle.
 * - Material context for any space-tech firm portfolio sanctions screening:
 *   the most-sanctioned space programme provides comprehensive case-law
 *   on sanctioned-state space-activities enforcement.
 *
 * Naming convention: KP-* (ISO-3166-1 alpha-2 for DPRK).
 */

import type { LegalSource, Authority } from "../types";

// ─── North Korea Authorities ─────────────────────────────────────────

export const AUTHORITIES_KP: Authority[] = [
  {
    id: "KP-NADA",
    name_en:
      "National Aerospace Development Administration (NADA / 국가우주개발국)",
    jurisdiction: "KP",
    role_description:
      "DPRK's national space agency, established 2013 by Supreme People's Assembly law. Operates Malligyong-1 reconnaissance satellite + Chollima-1 launch vehicle. SDN-designated by OFAC (2016) + EU Council + UK OFSI + JP MOFA + KR MOSF. Material for any military_dual_use + sanctions_compliance analysis.",
    website: "(no public website — DPRK)",
    applicable_areas: ["military_dual_use", "registration"],
  },
];

// ─── North Korea Legal Sources ───────────────────────────────────────

export const LEGAL_SOURCES_KP: LegalSource[] = [
  {
    id: "KP-NADA-SPACE-DEVELOPMENT-LAW-2013",
    jurisdiction: "KP",
    type: "federal_law",
    status: "in_force",
    title_en:
      "DPRK Space Development Law (2013) — Establishment of NADA + Sovereign Space Activities Framework",
    date_enacted: "2013-04-01",
    date_last_amended: "2023-12-30",
    source_url:
      "https://kcnawatch.org/newstream/1396423980-1027/laws/space-development-law/",
    issuing_body: "Supreme People's Assembly of DPRK",
    competent_authorities: ["KP-NADA"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "military_dual_use"],
    scope_description:
      "DPRK Space Development Law 2013 — establishes NADA + asserts DPRK sovereign right to space activities under OST Article I (which DPRK ratified 2009). Material context: (i) Article 3 NADA licensing authority for all DPRK space activities; (ii) Article 9 sovereign right of satellite launch + control under OST; (iii) Article 15 international cooperation provisions (operationalised through 2024 Russia-DPRK Comprehensive Strategic Partnership Treaty); (iv) 2023 amendment expanded coverage to include reconnaissance + military satellites. Material practitioner relevance: DPRK assertion of OST Article I sovereign rights is contested under UN SC Res 1718 + 2087 + 2094 + 2270 + 2321 + 2375 + 2397 which prohibit DPRK satellite launches as ballistic-missile-related activity. No commercial cooperation legally permissible under any major sanctions regime.",
    key_provisions: [
      "Art. 3 — NADA licensing authority",
      "Art. 9 — OST Article I sovereign rights assertion",
      "Art. 15 — international cooperation (Russia 2024)",
    ],
    related_sources: [
      "KP-UN-SC-RESOLUTIONS-COMPREHENSIVE",
      "KP-MALLIGYONG-1-NOV-2023",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KP-UN-SC-RESOLUTIONS-COMPREHENSIVE",
    jurisdiction: "KP",
    type: "soft_law_resolution",
    status: "in_force",
    title_en:
      "UN Security Council Resolutions on DPRK Space + Ballistic-Missile Programmes (1718 + 1874 + 2087 + 2094 + 2270 + 2321 + 2375 + 2397)",
    date_enacted: "2006-10-14",
    date_last_amended: "2017-12-22",
    source_url:
      "https://www.un.org/securitycouncil/sanctions/1718/un-sc-resolutions",
    issuing_body: "United Nations Security Council",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["sanctions_compliance", "military_dual_use"],
    scope_description:
      "UN Security Council Resolutions establishing comprehensive DPRK sanctions framework: (i) UN SC Res 1718 (2006) — foundational sanctions; (ii) UN SC Res 1874 (2009) — financial sanctions + WMD-related materials; (iii) UN SC Res 2087/2094 (2013) — extended in response to Unha-3 launch; (iv) UN SC Res 2270/2321/2375 (2016-2017) — comprehensive sectoral sanctions incl. coal/iron/luxury goods/financial services; (v) UN SC Res 2397 (2017) — petroleum products cap + DPRK worker repatriation. Material space-related provisions: (a) Para 7 of UN SC Res 2087 prohibits ALL DPRK satellite launches as ballistic-missile-related activity; (b) UN 1718 Sanctions Committee monitors implementation; (c) UN Panel of Experts reports document Russia-DPRK + China-DPRK + Iran-DPRK potential cooperation. Material baseline for any sanctions-compliance practitioner.",
    key_provisions: [
      "Res 1718 (2006) — foundational sanctions",
      "Res 2087 Para 7 — prohibits ALL DPRK satellite launches",
      "Res 2270/2321/2375 — comprehensive sectoral sanctions",
      "Res 2397 (2017) — petroleum + worker repatriation",
      "1718 Sanctions Committee monitoring",
    ],
    related_sources: [
      "KP-NADA-SPACE-DEVELOPMENT-LAW-2013",
      "IR-OFAC-EU-UK-SANCTIONS-EXPOSURE",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KP-MALLIGYONG-1-NOV-2023",
    jurisdiction: "KP",
    type: "case_law",
    status: "in_force",
    title_en:
      "Malligyong-1 (Manggyongdae-1) First Successful Reconnaissance Satellite Launch (November 2023) — Material UN Sanctions Violation Precedent",
    date_enacted: "2023-11-21",
    date_last_amended: "2024-05-27",
    source_url:
      "https://kcnawatch.org/newstream/1700536800-malligyong-1-launch/",
    issuing_body: "NADA + General Reconnaissance Bureau (GRB)",
    competent_authorities: ["KP-NADA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "sanctions_compliance"],
    scope_description:
      "Malligyong-1 — DPRK's first successful military reconnaissance satellite, launched 21 November 2023 from Sohae Satellite Launching Ground on Chollima-1 (3-stage hybrid liquid-fuel launcher). Achieved orbit after May + August 2023 failures. Material practitioner implications: (i) US + Japan + South Korea + UN Panel of Experts findings of Russia-DPRK technical-cooperation (allegedly providing satellite imagery + RV technology); (ii) US Treasury sanctions February 2024 designating 4 individuals + 2 entities providing satellite-related material support to DPRK; (iii) UN SC Res 2087 Para 7 violation incurs no enforcement (Russia + China veto blocking new resolutions since 2022); (iv) UN Panel of Experts dissolved March 2024 by Russian veto; (v) Malligyong-2 + 3 + 4 planned 2024-2025 expansion. Material precedent for ongoing sanctions-evasion landscape under multi-polar order.",
    key_provisions: [],
    related_sources: [
      "KP-UN-SC-RESOLUTIONS-COMPREHENSIVE",
      "KP-RUSSIA-DPRK-PARTNERSHIP-2024",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KP-RUSSIA-DPRK-PARTNERSHIP-2024",
    jurisdiction: "KP",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Russia-DPRK Comprehensive Strategic Partnership Treaty (June 2024) — Material Space-Tech Cooperation Framework Post-Putin-Kim Pyongyang Summit",
    date_enacted: "2024-06-19",
    date_last_amended: "2024-11-06",
    source_url: "https://en.kremlin.ru/events/president/news/74536",
    issuing_body:
      "President of the Russian Federation + Chairman of the State Affairs Commission of DPRK",
    competent_authorities: ["KP-NADA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "sanctions_compliance",
      "military_dual_use",
      "procurement",
    ],
    scope_description:
      "Russia-DPRK Comprehensive Strategic Partnership Treaty — Putin-Kim Pyongyang Summit 19 June 2024. Material space-related Article 4 provisions: mutual assistance in event of armed attack on either party (mutual-defence clause) + cooperation in 'science and technology including outer space + biology + IT'. Material practitioner implications: (i) provides legal cover for ongoing Russia-DPRK space-tech transfer (satellite imagery + RV/MIRV technology widely reported); (ii) treaty supersedes 1961 Treaty of Friendship + Mutual Assistance; (iii) US State Department October 2024 designation of 5 Russian entities + 8 individuals for DPRK space-tech transfer support; (iv) EU 14th sanctions package June 2024 explicitly cites DPRK-Russia space cooperation. Material precedent for ongoing sanctioned-state space-tech cooperation circumvention.",
    key_provisions: [
      "Art. 4 — mutual-defence clause",
      "Art. 4 — cooperation in space + biology + IT",
      "Supersedes 1961 Treaty of Friendship",
    ],
    related_sources: ["KP-MALLIGYONG-1-NOV-2023", "IR-KHAYYAM-RUSSIAN-EO-2022"],
    last_verified: "2026-05-27",
  },
  {
    id: "KP-COMPREHENSIVE-SANCTIONS-EXPOSURE",
    jurisdiction: "KP",
    type: "case_law",
    status: "in_force",
    title_en:
      "DPRK Comprehensive Sanctions Framework — OFAC 31 CFR Part 510 + EU 2017/1509 + UK OFSI + JP MOFA + KR MOSF",
    date_enacted: "2008-06-26",
    date_last_amended: "2024-12-30",
    source_url:
      "https://ofac.treasury.gov/sanctions-programs-and-country-information/north-korea-sanctions",
    issuing_body: "US Treasury OFAC + EU Council + UK OFSI + JP MOFA + KR MOSF",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["sanctions_compliance", "export_control"],
    scope_description:
      "DPRK comprehensive sanctions framework: (i) US OFAC NKSR (31 CFR Part 510) + secondary sanctions under NKSPEA 2016 + CAATSA 2017 Title III + Otto Warmbier Act 2019 + NDAA 2024; (ii) EU Council Reg 2017/1509 implementing UN SC + autonomous EU measures; (iii) UK OFSI Democratic People's Republic of Korea (Sanctions) (EU Exit) Regulations 2019; (iv) Japan MOFA DPRK-specific measures since 2006; (v) South Korea MOSF 2010 May-24 Measures (post-Cheonan sinking). Material practitioner relevance: (i) ANY non-Russian/non-Chinese space-tech firm dealing with DPRK faces near-certain primary + secondary sanctions; (ii) academic / scientific cooperation also subject to license requirements; (iii) Russia/China deal with DPRK at increased political-cost but no direct legal-cost (their sanctions regimes are non-compliant with UN measures); (iv) DPRK-related dealings face enhanced KYC under FATF + Wolfsberg guidance. Material framework for any sanctions-compliance practitioner advising space-tech client portfolio scrubbing.",
    key_provisions: [
      "31 CFR Part 510 — OFAC NKSR (primary sanctions)",
      "NKSPEA 2016 — secondary sanctions framework",
      "EU Council Reg 2017/1509",
      "UK OFSI 2019 — UK national framework",
      "JP MOFA + KR MOSF national measures",
    ],
    related_sources: [
      "KP-UN-SC-RESOLUTIONS-COMPREHENSIVE",
      "IR-OFAC-EU-UK-SANCTIONS-EXPOSURE",
    ],
    last_verified: "2026-05-27",
  },
];
