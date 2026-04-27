// src/data/legal-sources/sources/au.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
];
