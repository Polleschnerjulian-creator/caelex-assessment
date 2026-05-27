/**
 * Iran — Legal Sources + Competent Authorities
 *
 * Material context for practitioners:
 * - Iranian Space Agency (ISA) — established 2003, civil successor to
 *   military Aerospace Industries Organization (AIO).
 * - Active national space programme despite sanctions: Pars-1 EO (Apr
 *   2024) + Khayyam Russian-built EO (Aug 2022) + Soraya domestic launch
 *   via Qaem-100 (Jan 2024).
 * - Material for sanctions-compliance practitioners: OFAC SDN designations,
 *   EU Council Regulation 359/2011, UK OFSI sanctions, secondary sanctions
 *   under MGSA 2010 + ITRA 2012 + CAATSA 2017 + NDAA 2024.
 * - IRGC Aerospace Force (military) parallel to ISA (civil), operational
 *   ballistic-missile + ASAT-capability programmes.
 *
 * Naming convention: IR-* (ISO-3166-1 alpha-2).
 */

import type { LegalSource, Authority } from "../types";

// ─── Iran Authorities ────────────────────────────────────────────────

export const AUTHORITIES_IR: Authority[] = [
  {
    id: "IR-ISA",
    name_en: "Iranian Space Agency (ISA / سازمان فضایی ایران)",
    jurisdiction: "IR",
    role_description:
      "Iran's national civil space agency, established 2003 by Act of Parliament Article 9, reports to Ministry of Information and Communications Technology (MICT). Material for civil-space programmes (Pars-1, Khayyam, future indigenous communication satellites).",
    website: "https://isa.gov.ir/",
    applicable_areas: ["licensing", "registration", "scientific_research"],
  },
  {
    id: "IR-IRGC-AEROSPACE",
    name_en: "IRGC Aerospace Force (Quds Force / نیروی هوافضای سپاه پاسداران)",
    jurisdiction: "IR",
    role_description:
      "Islamic Revolutionary Guard Corps Aerospace Force — military space + ballistic-missile + ASAT operations. Operates Qaem-100 + Simorgh + Zoljanah launch vehicles. SDN-designated by OFAC + UK OFSI + EU Council. Material for any military_dual_use analysis.",
    website: "https://www.sepahnews.ir/",
    applicable_areas: ["military_dual_use", "registration"],
  },
  {
    id: "IR-CRA",
    name_en: "Communications Regulatory Authority (CRA / رگولاتوری ارتباطات)",
    jurisdiction: "IR",
    role_description:
      "Telecommunications regulator under MICT (Ministry of Information and Communications Technology). Authority for satellite-services licensing + frequency spectrum + ITU coordination.",
    website: "https://www.cra.ir/",
    applicable_areas: ["frequency_spectrum", "media_broadcasting"],
  },
];

// ─── Iran Legal Sources ──────────────────────────────────────────────

export const LEGAL_SOURCES_IR: LegalSource[] = [
  {
    id: "IR-ISA-ACT-2003",
    jurisdiction: "IR",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Iranian Space Agency Establishment Act 2003 — Article 9 of National ICT Development Plan",
    date_enacted: "2003-02-01",
    date_last_amended: "2022-09-15",
    source_url: "https://isa.gov.ir/about-us/",
    issuing_body: "Islamic Consultative Assembly (Majlis)",
    competent_authorities: ["IR-ISA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research", "registration"],
    scope_description:
      "ISA Act 2003 — establishes ISA as Iran's civil space agency under MICT (separation from IRGC Aerospace military programmes). Material context: (i) reports to MICT Minister; (ii) operates 6 indigenous Earth-observation satellites + 4 ground stations (Mahdasht + Alborz + Khayyam-control + Boroujerd); (iii) 2022 amendment expanded commercial-services authority + international cooperation provisions. Material gap: existing framework does not separate civil + military space-activities licensing — practical implication that any IR commercial-space engagement triggers EAR Part 746 + ITAR §126.1 Country Group sanctions screening regardless of ISA-civil designation.",
    key_provisions: [],
    related_sources: ["IR-NATIONAL-SPACE-PROGRAMME", "IR-IRGC-LAUNCH-VEHICLES"],
    last_verified: "2026-05-27",
  },
  {
    id: "IR-NATIONAL-SPACE-PROGRAMME",
    jurisdiction: "IR",
    type: "policy_document",
    status: "in_force",
    title_en: "Iran 10-Year National Space Programme 2022-2032 + Vision 2040",
    date_enacted: "2022-03-21",
    date_last_amended: "2024-10-01",
    source_url: "https://isa.gov.ir/national-space-programme/",
    issuing_body: "Supreme Space Council of Iran + ISA",
    competent_authorities: ["IR-ISA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "scientific_research"],
    scope_description:
      "Iran 10-Year National Space Programme 2022-2032 + Vision 2040 — approved by Supreme Space Council (chaired by President). 5-pillar structure: (1) sovereign satcom (Nahid + Mesbah constellation); (2) sovereign EO (Pars + Soraya series); (3) sovereign launch capability (Simorgh + Qaem + Zoljanah); (4) human-spaceflight (announced 2025 manned suborbital ambitions, no concrete programme yet); (5) international cooperation under sanctions constraints (Russia-Iran 2022 cooperation expansion, China-Iran 2021 25-Year Comprehensive Strategic Partnership). Material for sanctions practitioners: programme prioritises self-sufficiency due to OFAC + EU sanctions denial of Western space-tech.",
    key_provisions: [],
    related_sources: ["IR-ISA-ACT-2003", "IR-OFAC-EU-UK-SANCTIONS-EXPOSURE"],
    last_verified: "2026-05-27",
  },
  {
    id: "IR-IRGC-LAUNCH-VEHICLES",
    jurisdiction: "IR",
    type: "case_law",
    status: "in_force",
    title_en:
      "Iran Sovereign Launch Vehicles — Qaem-100 (Jan 2024 Soraya) + Simorgh + Zoljanah Operational",
    date_enacted: "2009-02-02",
    date_last_amended: "2024-09-14",
    source_url: "https://en.isna.ir/news/1402100806/",
    issuing_body:
      "IRGC Aerospace Force + Iran Aerospace Industries Organization (AIO)",
    competent_authorities: ["IR-IRGC-AEROSPACE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "sanctions_compliance"],
    scope_description:
      "Iran sovereign launch vehicle inventory: (i) Safir (2009-2019, retired, 2-stage liquid-fuel, 50kg LEO payload — first Iranian satellite launch Omid 2009); (ii) Simorgh (2016+, 3-stage liquid-fuel, 250kg LEO payload, ISA-operated civil-utility); (iii) Qaem-100 (2022+, 3-stage solid-fuel, 80kg LEO payload, IRGC-operated — launched Soraya satellite 20 January 2024 to 750km orbit); (iv) Zoljanah (under-development, 3-stage hybrid, 500kg LEO payload target). Material practitioner relevance: (i) Qaem-100 solid-fuel technology widely viewed as ICBM-capable + dual-use ASAT-capable — triggers MTCR Category 1 controls + NDAA Section 1245 secondary sanctions for any non-US firm contributing components; (ii) IRGC SDN designation since 2019 makes Qaem-related dealings prohibited under OFAC Iran Sanctions Regulations.",
    key_provisions: [],
    related_sources: [
      "IR-NATIONAL-SPACE-PROGRAMME",
      "IR-OFAC-EU-UK-SANCTIONS-EXPOSURE",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "IR-KHAYYAM-RUSSIAN-EO-2022",
    jurisdiction: "IR",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Khayyam EO Satellite (Aug 2022) — Iran-Russia Bilateral Material Precedent under Sanctions",
    date_enacted: "2018-11-15",
    date_last_amended: "2022-08-09",
    source_url: "https://isa.gov.ir/khayyam-satellite/",
    issuing_body:
      "Government of Iran (ISA) + Russian Federation (Roscosmos + VNIIEM)",
    competent_authorities: ["IR-ISA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "procurement",
      "military_dual_use",
      "sanctions_compliance",
    ],
    scope_description:
      "Khayyam — Iran's first sovereign high-resolution EO satellite. Built by Russia's VNIIEM (Канопус-V derived bus), launched 9 August 2022 from Baikonur on Soyuz-2.1b, 1.2m panchromatic + 4m multispectral imagery, sun-synchronous orbit. Material practitioner relevance: (i) Russia-Iran bilateral establishment of space-tech cooperation under mutual-sanctions environment (parallel to NK-Russia + Belarus-Russia tracks); (ii) Western intelligence assessment that Khayyam supports IRGC operational tasking in Syria + Ukraine indirect support; (iii) Khayyam-2 + Khayyam-3 procurement under exploration via Russian bilateral — material precedent for ongoing sanctioned-state space-tech cooperation. ITRA Section 6(c) + NDAA 2024 Section 1245 + EU Council Regulation 359/2011 all impose secondary sanctions on any entity facilitating Khayyam-related transactions.",
    key_provisions: [],
    related_sources: [
      "IR-OFAC-EU-UK-SANCTIONS-EXPOSURE",
      "PK-PAKSAT-CHINA-CGWIC",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "IR-OFAC-EU-UK-SANCTIONS-EXPOSURE",
    jurisdiction: "IR",
    type: "case_law",
    status: "in_force",
    title_en:
      "Iran Space-Tech Sanctions Exposure — OFAC 31 CFR Part 560 + EU Council Reg 359/2011 + UK OFSI + UN SC Res 2231",
    date_enacted: "2010-07-01",
    date_last_amended: "2024-12-30",
    source_url:
      "https://ofac.treasury.gov/sanctions-programs-and-country-information/iran-sanctions",
    issuing_body:
      "US Treasury OFAC + EU Council + UK OFSI + UN Security Council",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["sanctions_compliance", "export_control"],
    scope_description:
      "Iran space-tech sanctions framework: (i) OFAC ITSR (31 CFR Part 560) + secondary sanctions under MGSA 2010 + ITRA 2012 + CAATSA 2017 + NDAA 2024; (ii) EU Council Reg 359/2011 + 267/2012 + 360/2011 + 2023/1529 (continued post-JCPOA); (iii) UK OFSI Iran (Sanctions) Regulations 2019; (iv) UN SC Res 2231 (2015) — Annex B paragraph 4 prohibits Iranian ballistic-missile-capable technology activity for 8 years (expired October 2023, but reinstated via OFAC + EU + UK national measures). Material practitioner relevance: (i) ANY non-Russian/non-Chinese space-tech firm dealing with Iran faces near-certain secondary sanctions risk; (ii) academic / scientific cooperation also subject to license requirements; (iii) Iranian-origin software + dual-use technology subject to deemed-export controls. Material framework for any sanctions-compliance practitioner advising space-tech client portfolio scrubbing.",
    key_provisions: [
      "31 CFR Part 560 — OFAC ITSR (primary sanctions)",
      "ITRA 2012 Section 6 — secondary sanctions",
      "CAATSA 2017 Section 235 — IRGC sectoral sanctions",
      "EU Council Reg 359/2011 + 2023/1529 — EU framework",
      "UN SC Res 2231 — JCPOA + Annex B paragraph 4 (expired Oct 2023)",
    ],
    related_sources: [
      "US-OFAC-SANCTIONS-PROGRAMS",
      "IR-KHAYYAM-RUSSIAN-EO-2022",
    ],
    last_verified: "2026-05-27",
  },
  {
    id: "IR-PARS-1-SORAYA-2024",
    jurisdiction: "IR",
    type: "case_law",
    status: "in_force",
    title_en:
      "Pars-1 EO Russian Launch (April 2024) + Soraya Domestic Launch (January 2024) — Material Sanctions Precedent",
    date_enacted: "2024-01-20",
    date_last_amended: "2024-04-25",
    source_url: "https://en.isna.ir/news/1403020503/",
    issuing_body: "ISA + IRGC Aerospace Force + Roscosmos",
    competent_authorities: ["IR-ISA", "IR-IRGC-AEROSPACE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "military_dual_use",
      "sanctions_compliance",
      "registration",
    ],
    scope_description:
      "Two 2024 Iranian space milestones: (1) Soraya — first Iranian satellite launched to 750km orbit via Qaem-100 (IRGC-operated solid-fuel launcher), 20 Jan 2024 — material milestone for sovereign launch capability + ASAT-capability concerns; (2) Pars-1 — EO satellite built by ISA-affiliated entity, launched 25 Feb 2024 from Vostochny (Russia) on Soyuz-2.1b. Pars-1 represents continuation of Khayyam-style Russia-Iran cooperation. Material practitioner relevance: (i) Soraya-launch capability triggered fresh UK + EU + US ballistic-missile-related sanctions (UK OFSI updated Iran (Sanctions) Regulations February 2024, EU 11th package March 2024); (ii) US Treasury September 2024 designation of three Iranian Pars-1-related front-companies; (iii) Pars-1 + Khayyam-2 procurement triggers ongoing secondary-sanctions risk for any non-Russian space-tech firm.",
    key_provisions: [],
    related_sources: [
      "IR-IRGC-LAUNCH-VEHICLES",
      "IR-KHAYYAM-RUSSIAN-EO-2022",
      "IR-OFAC-EU-UK-SANCTIONS-EXPOSURE",
    ],
    last_verified: "2026-05-27",
  },
];
