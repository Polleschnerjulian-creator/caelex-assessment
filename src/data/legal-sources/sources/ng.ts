/**
 * Nigeria — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - NASRDA (National Space Research and Development Agency) — established
 *   2001, Africa's first dedicated national space agency.
 * - NigComSat (Nigerian Communications Satellite Ltd) — operates
 *   NIGCOMSAT-1 (failed 2008) + NIGCOMSAT-1R (2011, Chinese CGWIC-built,
 *   replacement under EXIM Bank China financing).
 * - NigeriaSat-1 (2003), NigeriaSat-2 (2011), NigeriaSat-X (2011),
 *   Edusat-1 (2017) — sovereign EO + science satellites.
 * - Nigerian Space Policy 2001 + National Space Policy and Programme
 *   2014 — institutional framework.
 * - ARCSSTE-E (Africa Regional Centre for Space Science and Technology
 *   Education in English, Obafemi Awolowo University) — UN-affiliated.
 * - Material for AfSA + AU space cooperation, China space partnerships,
 *   ECOWAS regional integration.
 *
 * Naming convention: NG-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Nigeria Authorities ─────────────────────────────────────────────

export const AUTHORITIES_NG: Authority[] = [
  {
    id: "NG-NASRDA",
    name_en: "National Space Research and Development Agency (NASRDA)",
    jurisdiction: "NG",
    role_description:
      "National space agency, established by NASRDA Act 2010 (operational since 2001). Reports to Federal Ministry of Innovation, Science and Technology. Authority for satellite operations, registration, NigeriaSat programme.",
    website: "https://nasrda.gov.ng/",
    applicable_areas: [
      "licensing",
      "registration",
      "scientific_research",
      "procurement",
    ],
  },
  {
    id: "NG-NCC",
    name_en: "Nigerian Communications Commission (NCC)",
    jurisdiction: "NG",
    role_description:
      "Independent telecommunications regulator established under Nigerian Communications Act 2003. Authority for satellite-services licensing + frequency spectrum allocation + ITU coordination.",
    website: "https://www.ncc.gov.ng/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "NG-NIGCOMSAT",
    name_en: "Nigerian Communications Satellite Ltd (NigComSat)",
    jurisdiction: "NG",
    role_description:
      "Government-owned commercial satcom operator under Federal Ministry of Communications and Digital Economy. Operates NIGCOMSAT-1R + ground-segment infrastructure. Material for ECOWAS satcom coverage + Chinese commercial-space partnership precedent.",
    website: "https://www.nigcomsat.gov.ng/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
  {
    id: "NG-NDPC",
    name_en: "Nigeria Data Protection Commission (NDPC)",
    jurisdiction: "NG",
    role_description:
      "Independent DPA established under Nigeria Data Protection Act 2023. Replaces former Nigeria Data Protection Bureau (NDPB, 2022-2023). Authority for satellite-imagery + EO-as-a-service data-protection enforcement.",
    website: "https://ndpc.gov.ng/",
    applicable_areas: ["data_security"],
  },
];

// ─── Nigeria Legal Sources ───────────────────────────────────────────

export const LEGAL_SOURCES_NG: LegalSource[] = [
  {
    id: "NG-NASRDA-ACT-2010",
    jurisdiction: "NG",
    type: "federal_law",
    status: "in_force",
    title_en:
      "National Space Research and Development Agency (Establishment) Act 2010",
    date_enacted: "2010-05-27",
    date_last_amended: "2023-10-15",
    source_url:
      "https://nasrda.gov.ng/wp-content/uploads/2023/03/NASRDA-ACT-2010.pdf",
    issuing_body: "National Assembly (Nigeria)",
    competent_authorities: ["NG-NASRDA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "scientific_research"],
    scope_description:
      "NASRDA Act 2010 — statutorily anchors NASRDA (operational since 2001 via Federal Executive decision) as Nigerian space agency. Material provisions: (i) §3 NASRDA mandates incl. national space policy implementation; (ii) §6 NASRDA Governing Council; (iii) §13 commercialisation of NASRDA technologies; (iv) §15 international cooperation authority. No comprehensive national space law on launch licensing — practitioners operate under NCC + NASRDA permit-of-cooperation framework. Draft Nigeria Space Bill under stakeholder consultation since 2023 (status: pending National Assembly enactment).",
    key_provisions: [
      "§3 — NASRDA functions + mandates",
      "§6 — NASRDA Governing Council",
      "§13 — commercialisation authority",
      "§15 — international cooperation",
    ],
    related_sources: [
      "NG-NATIONAL-SPACE-POLICY-2014",
      "NG-NIGCOMSAT-CHINA-EXIM-FINANCING",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "NG-NATIONAL-SPACE-POLICY-2014",
    jurisdiction: "NG",
    type: "policy_document",
    status: "in_force",
    title_en: "National Space Policy and Programme (NSPP) 2014 — Vision 2030",
    date_enacted: "2014-12-15",
    date_last_amended: "2023-08-22",
    source_url: "https://nasrda.gov.ng/national-space-policy/",
    issuing_body:
      "Federal Ministry of Innovation, Science and Technology + NASRDA",
    competent_authorities: ["NG-NASRDA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research"],
    scope_description:
      "National Space Policy and Programme 2014 (Vision 2030) — establishes 25-year roadmap for Nigerian space capability. Phase 1 (2001-2010) NigeriaSat-1/2/X EO constellation. Phase 2 (2011-2020) NIGCOMSAT-1R operational + ARCSSTE-E. Phase 3 (2021-2025) Nigerian-built satellite (Edusat-1 indigenously-designed). Phase 4 (2026-2030) Nigerian launch capability (Centre for Space Transport and Propulsion at Epe, Lagos State, planned). Material for any commercial-space partnership: NASRDA strategic priorities + offset/local-content requirements.",
    key_provisions: [],
    related_sources: ["NG-NASRDA-ACT-2010"],
    last_verified: "2026-05-27",
  },
  {
    id: "NG-NIGCOMSAT-CHINA-EXIM-FINANCING",
    jurisdiction: "NG",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "NIGCOMSAT-1R Bilateral Financing — Nigeria-China EXIM Bank Agreement (2011) + NIGCOMSAT-2 MoU (2023)",
    date_enacted: "2011-12-19",
    date_last_amended: "2023-09-04",
    source_url: "https://www.nigcomsat.gov.ng/about-nigcomsat-1r/",
    issuing_body:
      "Federal Government of Nigeria + Export-Import Bank of China + CGWIC",
    competent_authorities: ["NG-NIGCOMSAT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "procurement",
      "military_dual_use",
      "frequency_spectrum",
    ],
    scope_description:
      "NIGCOMSAT-1R bilateral — China EXIM Bank US$257M financing for Chinese CGWIC-built DFH-4 platform satcom, replacing failed NIGCOMSAT-1 (2007 launch, 2008 power-system failure). Operational from December 2011 with Chinese operational support through CGWIC. Material precedent for African space-tech Chinese partnerships: (i) Chinese EXIM Bank financing as alternative to Western development finance; (ii) CGWIC commercial-launch + Long March 3B operational expertise; (iii) ground-segment cyber-security questions raised in 2021 US-Nigeria diplomatic exchanges. NIGCOMSAT-2 MoU (September 2023) commits to follow-on Chinese-built replacement (~US$550M, expected launch 2027).",
    key_provisions: [
      "2011 Agreement Art. 4 — China EXIM US$257M financing",
      "2011 Agreement Art. 7 — CGWIC operational support",
      "2023 MoU §3 — NIGCOMSAT-2 follow-on commitment",
    ],
    related_sources: [
      "CN-CGWIC-COMMERCIAL-LAUNCH",
      "INT-AFRICAN-SPACE-AGENCY-CONVENTION",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "NG-NIGERIAN-COMMUNICATIONS-ACT-2003",
    jurisdiction: "NG",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Nigerian Communications Act 2003 (Act No. 19 of 2003) — Satellite Services Licensing",
    date_enacted: "2003-07-08",
    date_last_amended: "2024-04-30",
    source_url:
      "https://www.ncc.gov.ng/docman-main/legal-regulatory/acts-bills/118-nigerian-communications-act-2003/file",
    issuing_body: "National Assembly (Nigeria)",
    competent_authorities: ["NG-NCC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["frequency_spectrum", "media_broadcasting", "licensing"],
    scope_description:
      "Nigerian Communications Act 2003 — primary telecoms framework. NCC licensing authority covers: (i) §31 individual + class licenses for satellite services; (ii) §32 frequency assignments + ITU coordination; (iii) §99 foreign-ownership rules (no caps, but local-content + tech-transfer obligations); (iv) §157 enforcement penalties. Material for satellite-operator Nigeria market entry: Starlink launched January 2023 (first African market, ahead of Kenya + Mozambique), under NCC class license + local-presence requirement (Nigerian incorporated subsidiary). NCC Internet Service Provider Licensing Framework 2022 governs LEO mega-constellation entries.",
    key_provisions: [
      "§31 — individual + class licenses",
      "§32 — frequency + ITU coordination",
      "§99 — foreign-ownership + local-content obligations",
      "§157 — enforcement penalties",
    ],
    related_sources: ["NG-NDPA-2023"],
    last_verified: "2026-05-27",
  },
  {
    id: "NG-NIGERIASAT-PROGRAMME",
    jurisdiction: "NG",
    type: "policy_document",
    status: "in_force",
    title_en:
      "NigeriaSat Programme — Sovereign EO Capability (NigeriaSat-1 2003, NigeriaSat-2 + NigeriaSat-X 2011, Edusat-1 2017, NigeriaSat-3 planned)",
    date_enacted: "2003-09-27",
    date_last_amended: "2024-07-12",
    source_url: "https://nasrda.gov.ng/satellite-programmes/",
    issuing_body: "NASRDA",
    competent_authorities: ["NG-NASRDA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["registration", "scientific_research"],
    scope_description:
      "NigeriaSat Programme — Africa's most ambitious sovereign EO programme. Material missions: NigeriaSat-1 (2003, SSTL DMC-platform, decommissioned 2012), NigeriaSat-2 (2011, SSTL HiRes-22m EO, operational), NigeriaSat-X (2011, SSTL-trained Nigerian engineers in UK, operational), Edusat-1 (2017, ZARM/Bremen-built 1U CubeSat for educational purposes, decommissioned), NigeriaSat-3 (under contract with Airbus DS UK, expected launch 2026, 1.5m EO). Material for Nigeria satellite registration practice + Africa DMC (Disaster Monitoring Constellation) cooperation + UK SSTL technology-transfer precedents.",
    key_provisions: [],
    related_sources: ["NG-NASRDA-ACT-2010", "NG-NATIONAL-SPACE-POLICY-2014"],
    last_verified: "2026-05-27",
  },
  {
    id: "NG-NDPA-2023",
    jurisdiction: "NG",
    type: "federal_law",
    status: "in_force",
    title_en: "Nigeria Data Protection Act 2023 (Act No. 16 of 2023)",
    date_enacted: "2023-06-12",
    date_last_amended: "2024-04-04",
    source_url:
      "https://ndpc.gov.ng/Files/Nigeria_Data_Protection_Act_2023.pdf",
    issuing_body: "National Assembly (Nigeria)",
    competent_authorities: ["NG-NDPC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    scope_description:
      "Nigeria Data Protection Act 2023 — replaces 2019 NDPR (Nigeria Data Protection Regulation) regulatory framework with statutory law. GDPR-inspired but with Nigerian adaptations: (i) §62 establishes Nigeria Data Protection Commission (NDPC) as independent DPA; (ii) §25-30 lawful bases for processing; (iii) §41 cross-border transfer adequacy decisions; (iv) §48 penalties up to NGN 10M or 2% turnover. Material for satellite-imagery + EO-as-a-service operators serving Nigerian customers. NDPC operationalised October 2023; first NDPC enforcement actions Q2 2024 against major banks for breach-notification failures.",
    key_provisions: [
      "§25-30 — lawful bases for processing",
      "§41 — cross-border transfer rules",
      "§48 — penalties (NGN 10M or 2% turnover)",
      "§62 — NDPC independent DPA",
    ],
    related_sources: ["NG-NIGERIAN-COMMUNICATIONS-ACT-2003"],
    last_verified: "2026-05-27",
  },
  {
    id: "NG-ARCSSTE-E-UN-AFFILIATION",
    jurisdiction: "NG",
    type: "multilateral_agreement",
    status: "in_force",
    title_en:
      "African Regional Centre for Space Science and Technology Education in English (ARCSSTE-E) — UN Affiliation 1998",
    date_enacted: "1998-11-24",
    date_last_amended: "2022-06-17",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/psa/regional-centres/arcsste-e.html",
    issuing_body:
      "United Nations (UNOOSA) + Federal Government of Nigeria + Obafemi Awolowo University",
    competent_authorities: ["NG-NASRDA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["scientific_research", "procurement"],
    scope_description:
      "ARCSSTE-E — UN-affiliated regional centre for space science + technology education (English-speaking Africa). Established 1998 at Obafemi Awolowo University (Ife), affiliated with UNOOSA Programme on Space Applications. Co-affiliated centres: ARCSSTE-F (Morocco, French-speaking Africa), CRECTEALC (Brazil + Mexico, Latin America), CSSTEAP (India, Asia-Pacific), RCSSTE-NEAA (Jordan, MENA). Material for Africa-wide space-tech talent pipeline + technology transfer + UN-Nigeria capacity-building partnerships. Practitioner relevance for AU-aligned procurement preference + AfSA workforce-development obligations.",
    key_provisions: [],
    related_sources: [
      "NG-NATIONAL-SPACE-POLICY-2014",
      "KE-AFSA-FOUNDING-MEMBER",
    ],
    last_verified: "2026-05-27",
  },
];
