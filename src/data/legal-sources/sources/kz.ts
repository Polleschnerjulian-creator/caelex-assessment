/**
 * Kazakhstan — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - Baikonur Cosmodrome — world's oldest + busiest operational space-launch
 *   facility. Russian Federation operates under 1994 bilateral lease (extended
 *   to 2050 by 2004 Putin-Nazarbayev Agreement). Material for any Russian
 *   launch activity post-2022 Ukraine sanctions.
 * - KazCosmos (Kazakhstan Space Agency) — established 2007, restructured
 *   2014 + 2023.
 * - KazSat satcom programme — KazSat-1 (2006 failed), KazSat-2 (2011),
 *   KazSat-3 (2014). KazEOSat-1 (2014) + KazEOSat-2 (2014) EO.
 * - Material for Russia-aligned space-tech analysis post-Ukraine 2022,
 *   Eurasian Economic Union (EAEU) space cooperation, Caspian region
 *   EO monitoring.
 *
 * Naming convention: KZ-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Kazakhstan Authorities ──────────────────────────────────────────

export const AUTHORITIES_KZ: Authority[] = [
  {
    id: "KZ-KAZCOSMOS",
    name_en:
      "Kazakhstan Space Agency (Kazcosmos / Қазақстан Республикасының Аэроғарыш агенттігі)",
    jurisdiction: "KZ",
    role_description:
      "National space agency, established 2007 by Presidential Decree, restructured under Ministry of Digital Development, Innovation and Aerospace Industry (MDDIAI) in 2014 + 2023. Authority for Baikonur Russia bilateral coordination + sovereign KazSat + KazEOSat operations.",
    website: "https://gharysh.kz/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "procurement",
    ],
  },
  {
    id: "KZ-MDDIAI",
    name_en:
      "Ministry of Digital Development, Innovation and Aerospace Industry (MDDIAI)",
    jurisdiction: "KZ",
    role_description:
      "Cabinet-level ministry consolidating space + telecom + ICT regulatory authority. Oversees Kazcosmos + JSC Kazakhstan Gharysh Sapary (KGS) + JSC National Center of Space Research and Technology (NCSRT).",
    website: "https://www.gov.kz/memleket/entities/mdai",
    applicable_areas: [
      "frequency_spectrum",
      "media_broadcasting",
      "scientific_research",
    ],
  },
  {
    id: "KZ-KGS",
    name_en: "JSC Kazakhstan Gharysh Sapary (KGS / Қазақстан Ғарыш Сапары)",
    jurisdiction: "KZ",
    role_description:
      "State-owned commercial space operator under MDDIAI. Operates KazSat satcom + KazEOSat EO infrastructure. Material for any commercial-space cooperation in Kazakhstan.",
    website: "https://gharyshsapary.kz/",
    applicable_areas: [
      "frequency_spectrum",
      "media_broadcasting",
      "registration",
    ],
  },
];

// ─── Kazakhstan Legal Sources ────────────────────────────────────────

export const LEGAL_SOURCES_KZ: LegalSource[] = [
  {
    id: "KZ-LAW-SPACE-ACTIVITIES-2012",
    jurisdiction: "KZ",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law on Space Activities No. 528-IV (2012) — Republic of Kazakhstan",
    date_enacted: "2012-01-06",
    date_last_amended: "2023-12-20",
    source_url: "https://adilet.zan.kz/eng/docs/Z1200000528",
    issuing_body:
      "Parliament of the Republic of Kazakhstan (Mazhilis + Senate)",
    competent_authorities: ["KZ-KAZCOSMOS", "KZ-MDDIAI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "Law on Space Activities 528-IV (2012) — Kazakhstan's comprehensive national space law. Material provisions: (i) Art. 9 Kazcosmos licensing authority for launch + operation + ground-segment; (ii) Art. 15 third-party liability cap KZT 50B (~US$110M); (iii) Art. 22 spacecraft registry compliant with UN Registration Convention; (iv) Art. 25-30 Baikonur Russia bilateral coordination provisions; (v) Art. 35-40 supervisory powers + sanctions regime; (vi) 2023 amendment expanded commercial-services authority + sovereign-launch development provisions (Sarmat-Kazakhstan future heavy-lift cooperation under MDDIAI).",
    key_provisions: [
      "Art. 9 — Kazcosmos licensing authority",
      "Art. 15 — third-party liability cap KZT 50B",
      "Art. 22 — national spacecraft registry",
      "Art. 25-30 — Baikonur Russia bilateral coordination",
    ],
    related_sources: [
      "KZ-BAIKONUR-RUSSIA-BILATERAL-1994",
      "KZ-NATIONAL-SPACE-PROGRAMME-2024",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KZ-BAIKONUR-RUSSIA-BILATERAL-1994",
    jurisdiction: "KZ",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Russia-Kazakhstan Baikonur Cosmodrome Lease Agreement (1994) + Extension Treaty (2004 to 2050)",
    date_enacted: "1994-03-28",
    date_last_amended: "2004-01-09",
    source_url: "https://www.russian-space.com/baikonur-lease-treaty/",
    issuing_body:
      "Government of the Russian Federation + Government of the Republic of Kazakhstan",
    competent_authorities: ["KZ-KAZCOSMOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "procurement",
      "military_dual_use",
      "frequency_spectrum",
    ],
    scope_description:
      "Baikonur Lease Treaty 1994 + 2004 Extension — establishes legal framework for Russian use of Baikonur Cosmodrome until 2050. Annual lease US$115M (paid in advance, 2024-2050 prepayments locked-in pre-Ukraine 2022 invasion). Material provisions: (i) Russian territorial-equivalence for Baikonur facilities (analog to extraterritorial military base); (ii) Russian criminal/civil law applies within Baikonur; (iii) Russian citizen residency without Kazakh visa requirements; (iv) joint-management Council; (v) Soyuz + Proton + Angara + Sarmat-2 launch authorisations. Post-2022 Ukraine sanctions: (i) Kazakhstan refused to recognise Russian sanctions but maintained Baikonur operational; (ii) some Western payload customers cancelled launches (OneWeb, ESA Sentinel); (iii) Roscosmos-CGWIC joint launches continued. Material precedent for sanctioned-state launch-infrastructure access analysis.",
    key_provisions: [
      "Annual lease US$115M, 2050 expiry",
      "Russian territorial-equivalence within Baikonur",
      "Russian criminal/civil law applies",
      "Joint-management Council",
    ],
    related_sources: ["KZ-LAW-SPACE-ACTIVITIES-2012"],
    last_verified: "2026-05-27",
  },
  {
    id: "KZ-NATIONAL-SPACE-PROGRAMME-2024",
    jurisdiction: "KZ",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Kazakhstan National Space Programme 2024-2030 (Concept of Aerospace Industry Development)",
    date_enacted: "2024-02-14",
    date_last_amended: "2024-10-19",
    source_url: "https://gharysh.kz/national-programme-2024-2030/",
    issuing_body: "Government of Kazakhstan + Kazcosmos + MDDIAI",
    competent_authorities: ["KZ-KAZCOSMOS", "KZ-MDDIAI"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research", "procurement"],
    scope_description:
      "Kazakhstan National Space Programme 2024-2030 — 7-year strategic plan establishing 5 pillars: (1) sovereign satcom continuation (KazSat-3 + planned KazSat-4 with reduced Russian dependence); (2) sovereign EO programme expansion (KazEOSat-3 + planned domestic LEO constellation); (3) Baikonur post-2050 transition planning (gradual Soviet-era infrastructure retirement + Russian-payload diversification); (4) workforce target 10,000 aerospace professionals by 2030; (5) Eurasian Economic Union (EAEU) + China BRI + Turkey TÜRKSAT cooperation diversification. Material for any space-tech partnership: explicit prioritisation of supply-chain diversification post-Ukraine 2022 lessons.",
    key_provisions: [],
    related_sources: [
      "KZ-LAW-SPACE-ACTIVITIES-2012",
      "KZ-BAIKONUR-RUSSIA-BILATERAL-1994",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KZ-KAZSAT-PROGRAMME",
    jurisdiction: "KZ",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "KazSat Programme — Russia-Kazakhstan Bilateral Satcom (KazSat-1 2006 + KazSat-2 2011 + KazSat-3 2014)",
    date_enacted: "2004-05-21",
    date_last_amended: "2024-09-11",
    source_url: "https://gharyshsapary.kz/kazsat-programme/",
    issuing_body:
      "Republic of Kazakhstan (KGS) + Russian Federation (Reshetnev ISS)",
    competent_authorities: ["KZ-KGS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting"],
    scope_description:
      "KazSat Programme — Kazakhstan's sovereign satcom infrastructure. Material missions: KazSat-1 (2006, Khrunichev-built Yamal-derived, lost 2008 — orbital-slot 103°E); KazSat-2 (2011, Reshetnev Express-1000H, operational, 86.5°E slot); KazSat-3 (2014, Reshetnev Express-1000HTA, operational, 58.5°E slot, $300M financed by Eurasian Development Bank). All built by Russian primes (Khrunichev + Reshetnev). KazSat-4 procurement underway 2024-2025 — Kazakhstan exploring European primes (Thales Alenia + Airbus DS) as alternative to Russian post-Ukraine 2022, with Korean (KARI) + Chinese (CGWIC) as backup options. Material precedent for Russia-aligned-state supply-chain diversification post-sanctions.",
    key_provisions: [],
    related_sources: ["KZ-NATIONAL-SPACE-PROGRAMME-2024"],
    last_verified: "2026-05-27",
  },
  {
    id: "KZ-KAZEOSAT-AIRBUS-PROGRAMME",
    jurisdiction: "KZ",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "KazEOSat Programme — Kazakhstan-France Bilateral via Airbus DS (KazEOSat-1 + KazEOSat-2 2014)",
    date_enacted: "2009-11-15",
    date_last_amended: "2024-04-22",
    source_url: "https://gharyshsapary.kz/kazeosat-programme/",
    issuing_body:
      "Republic of Kazakhstan (KGS) + Government of France (Airbus DS)",
    competent_authorities: ["KZ-KGS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration", "scientific_research", "procurement"],
    scope_description:
      "KazEOSat Programme — Kazakhstan's sovereign EO programme via Airbus DS. Material missions: KazEOSat-1 (April 2014, Airbus DS AstroBus-1000 platform, 1m panchromatic + 4m multispectral, ~€213M); KazEOSat-2 (June 2014, SSTL-150 platform, 6.5m HiRes EO, ~€85M). Both operational through 2024-2025. Material precedent: established Kazakhstan-France ITAR-free European supply chain alongside Russian KazSat track — parallels Morocco Mohammed VI + Vietnam VNREDSat templates. KazEOSat-3 procurement underway 2024 with Airbus DS proposal selected over Russian Roscosmos (post-Ukraine 2022 Kazakh strategic supplier diversification).",
    key_provisions: [],
    related_sources: [
      "KZ-NATIONAL-SPACE-PROGRAMME-2024",
      "MA-MOHAMMED-VI-PROGRAMME",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "KZ-DATA-PROTECTION-LAW-2013",
    jurisdiction: "KZ",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law on Personal Data and Their Protection No. 94-V (2013) + 2022 Reform",
    date_enacted: "2013-05-21",
    date_last_amended: "2023-07-19",
    source_url: "https://adilet.zan.kz/eng/docs/Z1300000094",
    issuing_body: "Parliament of the Republic of Kazakhstan",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "Law 94-V (2013) — Kazakhstan's data protection law, GDPR-inspired 2022 reform expanded scope. Material for satellite-imagery + EO-as-a-service operators serving Kazakhstani customers: (i) Art. 12 explicit consent for sensitive data including location; (ii) Art. 25 cross-border data-transfer rules + 2022-amended data-localisation requirement for personal data of Kazakh citizens (must be stored on Kazakh servers); (iii) Art. 33 penalties up to KZT 10M (~$22K) + criminal sanctions; (iv) Authorized Body of Data Protection under MDDIAI operational from 2022. Material practitioner challenge: Kazakhstan data-localisation is most restrictive in Central Asia + Russia-equivalent in scope.",
    key_provisions: [
      "Art. 12 — explicit consent for sensitive data",
      "Art. 25 — data-localisation for Kazakh citizens",
      "Art. 33 — penalties (KZT 10M + criminal)",
    ],
    related_sources: ["KZ-LAW-SPACE-ACTIVITIES-2012"],
    last_verified: "2026-05-27",
  },
];
