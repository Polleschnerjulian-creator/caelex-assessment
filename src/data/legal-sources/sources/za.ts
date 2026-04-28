// src/data/legal-sources/sources/za.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * South Africa — space-law sources and authorities.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_ZA: Authority[] = [
  {
    id: "ZA-SANSA",
    jurisdiction: "ZA",
    name_en: "South African National Space Agency",
    name_local: "South African National Space Agency",
    abbreviation: "SANSA",
    parent_ministry: "Department of Science, Technology and Innovation",
    website: "https://www.sansa.org.za/",
    space_mandate:
      "National space agency since 2010 (under Act 36 of 2008). Operates Earth observation, space science, space operations (Hartebeesthoek tracking station), and space engineering programmes. Technical advisor to DTIC on Space Affairs Council licensing.",
    legal_basis: "South African National Space Agency Act, No. 36 of 2008",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "ZA-SACOUNCIL",
    jurisdiction: "ZA",
    name_en: "South African Council for Space Affairs",
    name_local: "South African Council for Space Affairs",
    abbreviation: "SACSA",
    parent_ministry: "Department of Trade, Industry and Competition (DTIC)",
    website: "https://www.dtic.gov.za/",
    space_mandate:
      "Statutory licensing council under the Space Affairs Act 84 of 1993. Issues launch and space-object operation licences and maintains the South African space-objects registry.",
    legal_basis: "Space Affairs Act, No. 84 of 1993",
    applicable_areas: ["licensing", "registration", "liability"],
  },
];

export const LEGAL_SOURCES_ZA: LegalSource[] = [
  {
    id: "ZA-SPACE-AFFAIRS-ACT-1993",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Affairs Act",
    title_local: "Space Affairs Act, No. 84 of 1993",
    date_enacted: "1993-06-23",
    date_last_amended: "1995-06-30",
    official_reference: "Act No. 84 of 1993",
    source_url:
      "https://www.gov.za/sites/default/files/gcis_document/201409/act84of1993.pdf",
    issuing_body: "Parliament of the Republic of South Africa",
    competent_authorities: ["ZA-SACOUNCIL"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability", "insurance"],
    scope_description:
      "South Africa's primary space-activities statute. Establishes the SACSA Council, the licensing regime for launches and on-orbit operations, the national registry, and the indemnification framework. South Africa is one of the few African states with a comprehensive primary space statute.",
    key_provisions: [
      {
        section: "§ 5-9",
        title: "Licence required for space activities",
        summary:
          "Launches from South African territory and operation of South African-controlled space objects require a SACSA licence; the Council reviews technical, safety, and financial criteria.",
      },
      {
        section: "§ 13",
        title: "Liability and insurance",
        summary:
          "Operator strict liability for surface damage; mandatory third-party-liability insurance set by the Minister; State indemnification framework above the operator-insurance ceiling.",
      },
    ],
    related_sources: ["ZA-SANSA-ACT-2008", "INT-OST-1967"],
    last_verified: "2026-04-22",
  },
  {
    id: "ZA-SANSA-ACT-2008",
    jurisdiction: "ZA",
    type: "federal_law",
    status: "in_force",
    title_en: "South African National Space Agency Act",
    title_local: "South African National Space Agency Act, No. 36 of 2008",
    date_enacted: "2008-12-19",
    date_in_force: "2010-12-09",
    official_reference: "Act No. 36 of 2008",
    source_url:
      "https://www.gov.za/sites/default/files/gcis_document/201409/a36-08.pdf",
    issuing_body: "Parliament of the Republic of South Africa",
    competent_authorities: ["ZA-SANSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Establishes SANSA as a Schedule 3A public entity with a mandate over civil space programmes and as technical advisor to the SACSA Council. Coordinates South African civil space cooperation, including with ESA, NASA, JAXA, and the African Union.",
    key_provisions: [
      {
        section: "§ 5",
        title: "SANSA mandate",
        summary:
          "SANSA promotes the peaceful use of space, advises Government, and operates national civil-space infrastructure including the Hartebeesthoek deep-space tracking facility.",
      },
    ],
    related_sources: ["ZA-SPACE-AFFAIRS-ACT-1993"],
    last_verified: "2026-04-22",
  },
  {
    id: "ZA-OST-1968",
    jurisdiction: "ZA",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — South African Ratification",
    date_enacted: "1968-10-30",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of South Africa",
    competent_authorities: ["ZA-SACOUNCIL"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "South Africa's ratification of the OST. State-responsibility and registration obligations are discharged through the Space Affairs Act 1993 and SACSA procedures. South Africa is NOT a signatory to the Artemis Accords as of April 2026.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "South Africa is internationally responsible for national activities in outer space — discharged through the Space Affairs Act 1993 licensing framework.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-22",
  },
];
