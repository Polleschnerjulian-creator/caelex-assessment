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
];
