// src/data/legal-sources/sources/au.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Australia — space-law sources and authorities.
 *
 * Coverage: stub-level entry covering the 2018 Space (Launches and
 * Returns) Act and its 2019 Regulations, plus the dual-use export-control
 * stack. Sufficient for cross-border due diligence; deeper coverage will
 * follow when an AU-licensee mandate triggers the need.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_AU: Authority[] = [
  {
    id: "AU-ASA",
    jurisdiction: "AU",
    name_en: "Australian Space Agency",
    name_local: "Australian Space Agency",
    abbreviation: "ASA",
    parent_ministry: "Department of Industry, Science and Resources (DISR)",
    website:
      "https://www.industry.gov.au/science-technology-and-innovation/space",
    space_mandate:
      "National space agency since 2018 and the regulatory body issuing launch, return, overseas-launch, and high-power rocket licences and permits under the Space (Launches and Returns) Act 2018. Operates the Australian Register of Space Objects.",
    legal_basis: "Space (Launches and Returns) Act 2018 (Cth)",
    applicable_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
    ],
  },
  {
    id: "AU-ACMA",
    jurisdiction: "AU",
    name_en: "Australian Communications and Media Authority",
    name_local: "Australian Communications and Media Authority",
    abbreviation: "ACMA",
    website: "https://www.acma.gov.au/",
    space_mandate:
      "Spectrum allocation, satellite earth-station licensing, and ITU coordination filings for Australian satellite systems. Administers the Radiocommunications Act 1992.",
    legal_basis: "Radiocommunications Act 1992 (Cth)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "AU-DEFENCE",
    jurisdiction: "AU",
    name_en: "Department of Defence — Defence Export Controls",
    name_local: "Department of Defence — Defence Export Controls",
    abbreviation: "DEC",
    parent_ministry: "Department of Defence",
    website: "https://www.defence.gov.au/business-industry/export",
    space_mandate:
      "Defence-export control under the Defence Trade Controls Act 2012 — captures most space-launch and many spacecraft items. Operates the AUSTRAC sanctions screening for end-user diligence.",
    legal_basis: "Defence Trade Controls Act 2012 (Cth)",
    applicable_areas: ["export_control"],
  },
];

export const LEGAL_SOURCES_AU: LegalSource[] = [
  {
    id: "AU-SLR-ACT-2018",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Space (Launches and Returns) Act 2018",
    title_local: "Space (Launches and Returns) Act 2018 (Cth)",
    date_enacted: "2018-08-31",
    date_in_force: "2019-08-31",
    official_reference: "Act No. 89 of 2018",
    source_url: "https://www.legislation.gov.au/Details/C2019C00121",
    issuing_body: "Parliament of Australia",
    competent_authorities: ["AU-ASA"],
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
      "Operative Australian launch-and-return licensing statute. Replaced the 1998 Space Activities Act; introduced a flexible four-permit taxonomy (Australian launch facility, launch, return, overseas-payload), a returns regime, and a high-power-rocket permit threshold. Implemented through the Space (Launches and Returns) (General) Rules 2019 and supporting standards.",
    key_provisions: [
      {
        section: "Part 3",
        title: "Australian launch-facility licence",
        summary:
          "Operator of an Australian launch facility requires an ASA-issued facility licence with a safety-case demonstrating capability to host launches without unacceptable risk to the public.",
      },
      {
        section: "Part 4-5",
        title: "Launch and return permits",
        summary:
          "Each launch and each return requires its own ASA permit, including third-party-liability insurance, debris-mitigation analysis, and CASA-coordinated airspace clearance.",
      },
      {
        section: "Part 6",
        title: "Overseas-payload permit",
        summary:
          "An Australian-controlled payload launched from an overseas facility requires an ASA overseas-payload permit — captures Australian operators using foreign launch vehicles.",
      },
      {
        section: "Part 7",
        title: "Liability and insurance",
        summary:
          "Mandatory third-party-liability insurance to a Maximum Probable Loss; Commonwealth indemnification above the cap, mirroring CSLA §50914 architecture.",
      },
    ],
    related_sources: [
      "AU-SLR-RULES-2019",
      "INT-OST-1967",
      "INT-LIABILITY-1972",
    ],
    last_verified: "2026-04-22",
  },
  {
    id: "AU-SLR-RULES-2019",
    jurisdiction: "AU",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space (Launches and Returns) (General) Rules 2019",
    title_local: "Space (Launches and Returns) (General) Rules 2019 (Cth)",
    date_in_force: "2019-08-31",
    official_reference: "F2019L01097",
    source_url: "https://www.legislation.gov.au/Details/F2019L01097",
    issuing_body: "Australian Government",
    competent_authorities: ["AU-ASA"],
    relevance_level: "high",
    applicable_to: [
      "launch_provider",
      "satellite_operator",
      "constellation_operator",
    ],
    compliance_areas: ["licensing", "debris_mitigation", "insurance"],
    scope_description:
      "Implementing rules for the Space (Launches and Returns) Act 2018 — application content, evidence standards, debris-mitigation thresholds (25-year LEO), insurance amounts, and the high-power-rocket exemption thresholds. The day-to-day handbook for any AU launch or return permit.",
    key_provisions: [
      {
        section: "Part 4",
        title: "Application content for launch permits",
        summary:
          "Detailed evidence requirements for launch-permit applications: vehicle qualification, flight-safety analysis, range coordination, environmental assessment, third-party-liability insurance.",
      },
      {
        section: "Part 7",
        title: "Debris-mitigation requirements",
        summary:
          "Aligns with the IADC Space Debris Mitigation Guidelines: 25-year LEO clearance, post-mission passivation, end-of-life disposal plan submitted with the launch-permit application.",
      },
    ],
    related_sources: ["AU-SLR-ACT-2018", "INT-COPUOS-DEBRIS-2007"],
    last_verified: "2026-04-22",
  },
  {
    id: "AU-DTC-ACT-2012",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Defence Trade Controls Act 2012",
    title_local: "Defence Trade Controls Act 2012 (Cth)",
    date_enacted: "2012-11-13",
    date_in_force: "2015-04-02",
    official_reference: "Act No. 153 of 2012",
    source_url: "https://www.legislation.gov.au/Details/C2019C00104",
    issuing_body: "Parliament of Australia",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "Australia's defence-export-control statute, mapping closely to the US ITAR/EAR architecture and capturing most space-launch and many spacecraft items in the Defence and Strategic Goods List (DSGL). Permits are issued by Defence Export Controls (DEC) within the Department of Defence.",
    key_provisions: [
      {
        section: "Part 2",
        title: "Permits for controlled supplies",
        summary:
          "Tangible and intangible supplies of DSGL items — including transmission of technical data — require a DEC permit. The intangible-transfer obligation captures cross-border engineering collaboration.",
      },
      {
        section: "Part 3",
        title: "Brokering controls",
        summary:
          "Even an Australian person acting as an intermediary in a foreign-to-foreign transaction in DSGL items can require a brokering permit.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-22",
  },
  {
    id: "AU-OST-1967",
    jurisdiction: "AU",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Australian Ratification",
    date_enacted: "1967-10-10",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of Australia",
    competent_authorities: ["AU-ASA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Australia's ratification of the 1967 Outer Space Treaty. Anchors the State-responsibility and registration obligations that the SLR Act 2018 discharges domestically. Australia is also a signatory to the Artemis Accords (2020).",
    key_provisions: [
      {
        section: "Art. VI / VII",
        title: "State responsibility and liability",
        summary:
          "Australia is internationally responsible and liable for damage caused by Australian-launched space objects — discharged through the SLR Act 2018 indemnification framework.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-04-22",
  },

  {
    id: "AU-RADIOCOM-ACT-1992",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Radiocommunications Act 1992",
    title_local: "Radiocommunications Act 1992 (Cth)",
    date_enacted: "1992-12-23",
    date_last_amended: "2024-09-04",
    official_reference: "Act No. 174 of 1992",
    source_url: "https://www.legislation.gov.au/Details/C2023C00299",
    issuing_body: "Parliament of Australia",
    competent_authorities: ["AU-ACMA"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Operative Australian spectrum-licensing statute administered by ACMA. Captures earth-station licensing, spectrum allocation, satellite-network coordination, and the Australian filing point for ITU procedures. Companion to the SLR Act 2018 on the spectrum side of any commercial AU satellite system.",
    key_provisions: [
      {
        section: "Part 3.1",
        title: "Spectrum licences",
        summary:
          "ACMA-issued spectrum licences confer exclusive rights over frequency bands; satellite earth-station licences are issued separately for individual installations.",
      },
    ],
    related_sources: ["AU-SLR-ACT-2018", "INT-ITU-RR"],
    last_verified: "2026-04-22",
  },
  {
    id: "AU-PRIVACY-ACT",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Privacy Act 1988 (with 2024 Privacy Reform amendments)",
    title_local: "Privacy Act 1988 (Cth)",
    date_enacted: "1988-12-14",
    date_last_amended: "2024-12-12",
    official_reference: "Act No. 119 of 1988 (as amended)",
    source_url: "https://www.legislation.gov.au/Details/C2024C00224",
    issuing_body: "Parliament of Australia",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "data_provider", "ground_segment"],
    compliance_areas: ["data_security"],
    scope_description:
      "Australia's general data-protection statute under the Australian Privacy Principles (APPs). 2024 reforms introduce a statutory right of action for serious privacy invasions, tightened cross-border-transfer rules, and significantly higher penalties. Captures Earth-observation imagery resolving identifiable individuals and satcom-subscriber data with an Australian nexus.",
    key_provisions: [
      {
        section: "APP 8 (cross-border)",
        title: "Cross-border data transfers",
        summary:
          "Cross-border disclosure of personal information is permitted only where the recipient is bound by substantially similar protections or the data subject has explicitly consented.",
      },
    ],
    related_sources: ["EU-GDPR-2016"],
    last_verified: "2026-04-22",
  },
  {
    id: "AU-SPACEPORTS-2026",
    jurisdiction: "AU",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Australian Spaceports — Bowen Orbital Spaceport / Whalers Way / Arnhem Space Centre",
    date_published: "2026-04-22",
    source_url: "https://www.industry.gov.au/space",
    issuing_body: "Australian Space Agency",
    competent_authorities: ["AU-ASA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Reference catalogue of currently-operating Australian launch facilities. Bowen Orbital Spaceport (Queensland, Gilmour Space Eris-1 launches), Whalers Way Orbital Launch Complex (South Australia, Southern Launch), Arnhem Space Centre (Northern Territory, Equatorial Launch Australia, partnered with NASA for sub-orbital sounding-rocket campaigns since 2022).",
    key_provisions: [
      {
        section: "Bowen — Equatorial-friendly latitude",
        title: "Gilmour Space tenant operations",
        summary:
          "Tropical-latitude site favouring inclined LEO launches; ASA spaceport licence held by Gilmour Space; first orbital launch attempted with Eris in 2024.",
      },
      {
        section: "Whalers Way — Polar/SSO advantage",
        title: "Southern Launch tenant operations",
        summary:
          "South Australian site with clear southern-azimuth corridor for polar and SSO launches; licensed for sub-orbital and orbital operations.",
      },
      {
        section: "Arnhem Space Centre",
        title: "NASA partner-launch site",
        summary:
          "First commercial spaceport outside the US to host a NASA sub-orbital launch campaign (June 2022); ASA-licensed for ELA's commercial business.",
      },
    ],
    related_sources: ["AU-SLR-ACT-2018", "AU-SLR-RULES-2019"],
    last_verified: "2026-04-22",
  },
  {
    id: "AU-CIVIL-AVIATION-ACT-1988",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Civil Aviation Act 1988 — Airspace Coordination for Launches",
    title_local: "Civil Aviation Act 1988 (Cth)",
    date_enacted: "1988-09-15",
    date_last_amended: "2024-06-30",
    official_reference: "Act No. 63 of 1988",
    source_url: "https://www.legislation.gov.au/Details/C2024C00094",
    issuing_body: "Parliament of Australia",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "CASA (Civil Aviation Safety Authority) administers airspace clearances for launch-vehicle transit through Australian controlled airspace. Operators with ASA launch permits coordinate with CASA for airspace activations, NOTAMs, and danger-area declarations around spaceports. Operative complement to the SLR Act for any AU launch.",
    key_provisions: [
      {
        section: "Part III — Airspace declarations",
        title: "Restricted-area activation",
        summary:
          "CASA activates restricted areas for launch and re-entry windows, coordinating with AirServices Australia for airspace traffic redirection.",
      },
    ],
    related_sources: ["AU-SLR-ACT-2018"],
    last_verified: "2026-04-22",
  },

  // ─── Debris-Mitigation national stack — 2026 audit additions ───────

  {
    id: "AU-ASA-OPERATING-CONDITIONS",
    jurisdiction: "AU",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Australian Space Agency — Standard Operating Conditions Schedule 1 (Debris Mitigation)",
    date_published: "2019-08-31",
    date_last_amended: "2024-11-12",
    official_reference: "ASA-OC-Sched-1-Rev3",
    source_url:
      "https://www.industry.gov.au/science-technology-and-innovation/space",
    issuing_body: "Australian Space Agency (ASA)",
    competent_authorities: ["AU-ASA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation", "licensing"],
    scope_description:
      "Schedule 1 of the standard operating conditions attached to launch and overseas-payload permits under the Space (Launches and Returns) Act 2018. Establishes binding debris-mitigation conditions: ISO 24113 as technical baseline, 5-year LEO PMD target (Rev. 3, 2024), passivation evidence, and CDM-format conjunction-data sharing with the Australian Defence Force Space Surveillance.",
    key_provisions: [
      {
        section: "Sched. 1 §3",
        title: "Technical baseline — ISO 24113",
        summary:
          "All licensed missions shall comply with ISO 24113:2023 in technical submission.",
      },
      {
        section: "Sched. 1 §6",
        title: "5-year LEO PMD",
        summary:
          "Spacecraft operating in LEO shall be disposed of within 5 years of end of mission (Rev. 3, 2024).",
      },
      {
        section: "Sched. 1 §8",
        title: "Conjunction-data sharing",
        summary:
          "Operators shall participate in the ADF Space Surveillance CDM exchange.",
      },
    ],
    related_sources: [
      "AU-SLR-ACT-2018",
      "INT-ISO-24113-2023",
      "INT-IADC-MITIGATION-2025",
    ],
    last_verified: "2026-04-27",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Atlas P2 (2026-05-26): AU sub-domain entries — Murchison Radio-Quiet
  // Zone (SKA-Low precursor + ASKAP).
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "AU-MURCHISON-RADIO-QUIET",
    jurisdiction: "AU",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Murchison Radio-astronomy Observatory Radio Quiet Zone",
    date_enacted: "2005-01-01",
    source_url: "https://www.acma.gov.au/",
    issuing_body: "Australian Communications and Media Authority",
    competent_authorities: ["AU-ASA"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum", "scientific_research"],
    scope_description:
      "70-km-radius radio-quiet zone in Western Australia protecting the Murchison Radio-astronomy Observatory (MWA + ASKAP + SKA-Low precursor). ACMA coordinates terrestrial + satellite-downlink frequency assignments to avoid interference into protected low-frequency RAS bands. Material for NGSO operators with broad spectral footprints downlinking over Australian territory.",
    key_provisions: [],
    related_sources: ["INT-ITU-RR-ART-29", "ZA-SKA-PROTECTION-ACT"],
    last_verified: "2026-05-26",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Atlas P4 (2026-05-26): Australia sub-tier deepening — Defence Space
  // Command (2022), SOCI Act space inclusion (2022 reform), Foreign
  // Investment FATA, Five Eyes space cooperation, Artemis signing 2020,
  // Privacy Act 2024 reform, ITU notifying admin, EOSA pivot, Whalers
  // Way / Arnhem Land equatorial launch sites. Per
  // ATLAS-CORPUS-EXPANSION-PLAN.md § 8.A.
  // ═══════════════════════════════════════════════════════════════════════

  // ─── Defence Space Command + Space Strategy ──────────────────────────
  {
    id: "AU-DEFENCE-SPACE-COMMAND-2022",
    jurisdiction: "AU",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Defence Space Command Establishment",
    date_enacted: "2022-01-18",
    source_url: "https://www.defence.gov.au/about/who-we-are/space",
    issuing_body: "Department of Defence / Royal Australian Air Force",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "fdi_screening"],
    scope_description:
      "Australian Defence Force Space Command established January 2022 within RAAF. Operationally coordinates with US Space Command + UK Space Command under Five Eyes framework. Material institutional reform — counsel for dual-use FDI screening of Australian space-tech firms should expect Defence Space Command interest in deals with national-security implications.",
    key_provisions: [],
    related_sources: ["AU-DEFENCE-SPACE-STRATEGY-2022"],
    last_verified: "2026-05-26",
  },
  {
    id: "AU-DEFENCE-SPACE-STRATEGY-2022",
    jurisdiction: "AU",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Australian Defence Space Strategy",
    date_published: "2022-03-22",
    source_url:
      "https://www.defence.gov.au/about/strategic-planning/defence-space-strategy",
    issuing_body: "Department of Defence",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    scope_description:
      "Foundational Defence Space Strategy — articulates Australia's posture: 'sovereign space capabilities + resilience + cooperation with allies'. Aligns with 2023 Defence Strategic Review. Material context for any Australian space-tech firm interfacing with Defence procurement (Hex20, Saber Astronautics, Skykraft, Inovor Technologies).",
    key_provisions: [],
    related_sources: ["AU-DEFENCE-SPACE-COMMAND-2022"],
    last_verified: "2026-05-26",
  },

  // ─── Critical Infrastructure + Cybersecurity ─────────────────────────
  {
    id: "AU-SOCI-ACT-2018",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Security of Critical Infrastructure Act 2018 — Space Sector Inclusion 2022",
    date_enacted: "2018-04-11",
    date_last_amended: "2022-04-02",
    official_reference: "Act No. 29 of 2018 (amended by Acts 2021-2022)",
    source_url: "https://www.cisc.gov.au/",
    issuing_body: "Parliament of Australia",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["critical_infrastructure", "cybersecurity"],
    scope_description:
      "Security of Critical Infrastructure Act 2018 substantially amended 2021-2022 to include space technology as a critical-infrastructure sector. Subject entities must register with Cyber and Infrastructure Security Centre (CISC), report material risks + incidents, and may face Ministerial directions. Material for any satcom + ground-segment operator with material Australian operations.",
    key_provisions: [
      {
        section: "Section 12L",
        title: "Space technology sector designation",
        summary:
          "Space technology added as designated critical-infrastructure sector. Critical Space Technology Entity (CSTE) designation triggers reporting + audit + Ministerial-direction risk-management obligations.",
      },
    ],
    related_sources: ["AU-CYBER-SECURITY-STRAT-2023"],
    last_verified: "2026-05-26",
  },
  {
    id: "AU-CYBER-SECURITY-STRAT-2023",
    jurisdiction: "AU",
    type: "policy_document",
    status: "in_force",
    title_en: "Australian Cyber Security Strategy 2023-2030",
    date_published: "2023-11-22",
    source_url:
      "https://www.homeaffairs.gov.au/about-us/our-portfolios/cyber-security",
    issuing_body: "Department of Home Affairs",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity", "critical_infrastructure"],
    scope_description:
      "Strategy through 2030 with six 'cyber shields' framework. Shield 1 (strong businesses + citizens) + Shield 6 (resilient region + global leadership) most relevant to space sector. Backed by Cyber Security Legislative Reforms Bill 2024 (mandatory ransomware reporting + 'Cyber Incident Review Board').",
    key_provisions: [],
    related_sources: ["AU-SOCI-ACT-2018"],
    last_verified: "2026-05-26",
  },

  // ─── FDI / Foreign Investment ────────────────────────────────────────
  {
    id: "AU-FATA-2015-FOREIGN-INVESTMENT",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Acquisitions and Takeovers Act 1975 + 2024 Amendments",
    date_enacted: "1975-09-25",
    date_last_amended: "2024-01-01",
    official_reference: "Act No. 92 of 1975",
    source_url: "https://firb.gov.au/",
    issuing_body: "Parliament of Australia",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Foreign Investment Review Board (FIRB) framework. 2020 + 2024 amendments tightened scrutiny of foreign investment in critical-technology sectors including space. National-security tests apply to acquisitions of space-tech firms regardless of monetary threshold. Material for any cross-border M&A involving Australian space-tech entities.",
    key_provisions: [],
    related_sources: ["AU-SOCI-ACT-2018"],
    last_verified: "2026-05-26",
  },

  // ─── Spaceports — Whalers Way + Arnhem ───────────────────────────────
  {
    id: "AU-WHALERS-WAY-LAUNCH",
    jurisdiction: "AU",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Whalers Way Launch Complex (Southern Launch) Regulatory Framework",
    date_published: "2021-06-08",
    source_url: "https://southernlaunch.space/whalers-way/",
    issuing_body: "Australian Space Agency / Southern Launch",
    competent_authorities: ["AU-ASA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing", "environmental"],
    scope_description:
      "Whalers Way Orbital Launch Complex (Southern Launch) on Eyre Peninsula — Australia's first orbital launch site licensed under Space (Launches and Returns) Act 2018. Faced environmental + Indigenous-rights challenges 2021-2024. ASA facility licence + EPA environmental approvals required.",
    key_provisions: [],
    related_sources: ["AU-SLR-ACT-2018"],
    last_verified: "2026-05-26",
  },
  {
    id: "AU-ARNHEM-LAND-EQUATORIAL",
    jurisdiction: "AU",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Arnhem Space Centre — Equatorial Launch Australia Framework",
    date_published: "2022-06-26",
    source_url: "https://www.ela.space/",
    issuing_body: "Australian Space Agency / Equatorial Launch Australia",
    competent_authorities: ["AU-ASA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing", "environmental"],
    scope_description:
      "Arnhem Space Centre at Nhulunbuy (East Arnhem, Northern Territory) — Australia's tropical-latitude launch site (~12°S). Indigenous Land Use Agreements with traditional owners established. NASA conducted 3 sounding-rocket campaigns 2022 — Australia's first launches from continental Australia in decades. Material for foreign launch-providers considering equatorial-launch operations.",
    key_provisions: [],
    related_sources: ["AU-SLR-ACT-2018", "AU-INDIGENOUS-LAND-USE-AGREEMENTS"],
    last_verified: "2026-05-26",
  },
  {
    id: "AU-INDIGENOUS-LAND-USE-AGREEMENTS",
    jurisdiction: "AU",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Indigenous Land Use Agreements (ILUAs) — Spaceport Frameworks",
    date_enacted: "1993-12-22",
    date_last_amended: "2024-01-01",
    official_reference: "Native Title Act 1993",
    source_url: "https://www.nntt.gov.au/ILUAs/Pages/default.aspx",
    issuing_body: "Parliament of Australia / National Native Title Tribunal",
    competent_authorities: ["AU-ASA"],
    relevance_level: "medium",
    applicable_to: ["launch_provider", "ground_segment"],
    compliance_areas: ["environmental", "consumer_protection"],
    scope_description:
      "Indigenous Land Use Agreements under Native Title Act 1993. Material for launch-site + ground-station development on or near native-title-determined land. ELA Arnhem operations conducted under ILUA with Yolŋu traditional owners. Whalers Way faced challenges with native title + environmental groups 2021-2024. Material for any Australian spaceport development.",
    key_provisions: [],
    related_sources: ["AU-ARNHEM-LAND-EQUATORIAL", "AU-WHALERS-WAY-LAUNCH"],
    last_verified: "2026-05-26",
  },

  // ─── Privacy Act 2024 reform ─────────────────────────────────────────
  {
    id: "AU-PRIVACY-ACT-2024-REFORM",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Privacy and Other Legislation Amendment Act 2024",
    date_enacted: "2024-12-10",
    date_in_force: "2024-12-11",
    source_url: "https://www.oaic.gov.au/",
    issuing_body: "Parliament of Australia",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "First major reform of Privacy Act 1988 since 2014. Introduces statutory tort for serious invasions of privacy, enhanced enforcement powers for OAIC (Office of the Australian Information Commissioner), automated-decision transparency rules. Material for satcom + space-data services with Australian subscribers + data subjects.",
    key_provisions: [],
    related_sources: ["AU-PRIVACY-ACT"],
    last_verified: "2026-05-26",
  },

  // ─── ITU + Five Eyes ─────────────────────────────────────────────────
  {
    id: "AU-ITU-NOTIFYING-ADMIN",
    jurisdiction: "AU",
    type: "policy_document",
    status: "in_force",
    title_en: "Australia as ITU Notifying Administration",
    date_published: "2000-01-01",
    source_url: "https://www.acma.gov.au/",
    issuing_body: "Australian Communications and Media Authority",
    competent_authorities: ["AU-ACMA"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "ACMA operates as Australia's national notifying administration for ITU filings. Handles satellite-frequency coordination, earth-station licensing, ITU API/CR/N filings for Australian-flagged satellite networks. Material for foreign satcom operators serving Australian subscribers + Australian-headquartered operators (Sky Muster NBN-Co, Australian Defence satcom programmes).",
    key_provisions: [],
    related_sources: ["AU-RADIOCOM-ACT-1992"],
    last_verified: "2026-05-26",
  },
  {
    id: "AU-FIVE-EYES-SPACE-COOP",
    jurisdiction: "AU",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "Five Eyes Space Cooperation Framework — Australia",
    date_enacted: "2014-12-01",
    date_last_amended: "2024-01-01",
    source_url: "https://www.defence.gov.au/",
    issuing_body: "Five Eyes Member Governments (US, UK, AU, NZ, CA)",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    scope_description:
      "Five Eyes Combined Space Operations (CSpO) initiative + bilateral US-AU + UK-AU MOUs operationalise space-domain awareness sharing, military-space cooperation, and dual-use technology coordination. Material for FDI screening + dual-use export-control assessment — Five Eyes alignment is a positive factor in CFIUS / FIRB / NSI Act reviews of Australian space-tech.",
    key_provisions: [],
    related_sources: ["AU-DEFENCE-SPACE-COMMAND-2022"],
    last_verified: "2026-05-26",
  },
  {
    id: "AU-ARTEMIS-ACCORDS-2020",
    jurisdiction: "AU",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "Australia Artemis Accords Signing",
    date_enacted: "2020-10-13",
    source_url: "https://www.nasa.gov/news-release/artemis-accords/",
    issuing_body: "Government of Australia",
    competent_authorities: ["AU-ASA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Australia became founding signatory of Artemis Accords 13 October 2020 (1st cohort with US, UK, Canada, Italy, Japan, Luxembourg, UAE). Material political alignment with US-led lunar + deep-space framework. Operationalised through ASA Trailblazer programme + Australia's commercial lunar-rover contracts under NASA CLPS.",
    key_provisions: [],
    related_sources: ["INT-ARTEMIS-ACCORDS-2020", "AU-MOON-TO-MARS-INITIATIVE"],
    last_verified: "2026-05-26",
  },

  // ─── ASA Trailblazer + Moon-to-Mars ──────────────────────────────────
  {
    id: "AU-MOON-TO-MARS-INITIATIVE",
    jurisdiction: "AU",
    type: "policy_document",
    status: "in_force",
    title_en: "ASA Moon to Mars Initiative + Trailblazer Programme",
    date_published: "2021-07-07",
    source_url:
      "https://www.industry.gov.au/science-technology-and-innovation/space/moon-mars-initiative",
    issuing_body: "Australian Space Agency",
    competent_authorities: ["AU-ASA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "state_aid"],
    scope_description:
      "A$150M+ ASA Moon to Mars Initiative supports Australian companies contributing to Artemis programme. Trailblazer (Australia's first NASA-bound lunar rover, 2026 launch target) selected ELA + AROSE consortium 2023. Material counterparty framework for foreign-Australian Artemis-related cooperation.",
    key_provisions: [],
    related_sources: ["AU-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-05-26",
  },

  // ─── Defence Trade Controls amendments 2024 ──────────────────────────
  {
    id: "AU-DTC-AMENDMENT-2024",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Defence Trade Controls Amendment Act 2024 — AUKUS Carve-Outs",
    date_enacted: "2024-03-27",
    date_in_force: "2024-09-01",
    source_url: "https://www.defence.gov.au/business-industry/export",
    issuing_body: "Parliament of Australia",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "Major DTC Act 2012 amendment establishing AUKUS-aligned licence-free zone for defence-trade between AU, US, UK. Reciprocal US ITAR + UK Export Control reforms passed parallel 2024. Material precedent: AUKUS members enjoy expedited dual-use technology flow for defence-related space tech (resilient PNT, secure satcom, ISR).",
    key_provisions: [],
    related_sources: ["AU-DTC-ACT-2012", "INT-US-AUSTRALIA-TSA-2019"],
    last_verified: "2026-05-26",
  },

  // ─── Autonomous Sanctions ────────────────────────────────────────────
  {
    id: "AU-AUTONOMOUS-SANCTIONS-2011",
    jurisdiction: "AU",
    type: "federal_law",
    status: "in_force",
    title_en: "Autonomous Sanctions Act 2011",
    date_enacted: "2011-03-23",
    date_last_amended: "2024-01-01",
    source_url:
      "https://www.dfat.gov.au/international-relations/security/sanctions",
    issuing_body: "Parliament of Australia",
    competent_authorities: ["AU-DEFENCE"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["sanctions_compliance"],
    scope_description:
      "Australia's autonomous-sanctions framework (parallel to UN Security Council sanctions implementation). Active sanctions regimes including Russia/Belarus (2022+), Iran, North Korea, Syria, Myanmar. Material for any space-tech transaction involving Australian counterparty + sanctioned-state nexus. DFAT operates Sanctions Office screening.",
    key_provisions: [],
    related_sources: ["AU-DTC-AMENDMENT-2024"],
    last_verified: "2026-05-26",
  },
];
