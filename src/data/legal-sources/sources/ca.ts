// src/data/legal-sources/sources/ca.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Canada — space-law sources and authorities.
 *
 * Coverage: stub-level entry covering the Remote Sensing Space Systems
 * Act (RSSSA) and the radio-licensing regime under the Radiocommunication
 * Act. Canada has no comprehensive primary space-activities statute;
 * commercial launch from Canadian territory remains outside the RSSSA
 * scope and is addressed mission-by-mission via Transport Canada and ISED.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_CA: Authority[] = [
  {
    id: "CA-CSA",
    jurisdiction: "CA",
    name_en: "Canadian Space Agency",
    name_local: "Agence spatiale canadienne",
    abbreviation: "CSA / ASC",
    parent_ministry: "Innovation, Science and Industry (ISED)",
    website: "https://www.asc-csa.gc.ca/",
    space_mandate:
      "National space agency. Civil space programmes (RADARSAT, ISS Canadarm, lunar exploration) and policy advisor to ISED on space-sector regulation.",
    legal_basis: "Canadian Space Agency Act (1990)",
    applicable_areas: ["licensing"],
  },
  {
    id: "CA-ISED",
    jurisdiction: "CA",
    name_en: "Innovation, Science and Economic Development Canada",
    name_local: "Innovation, Sciences et Développement économique Canada",
    abbreviation: "ISED",
    website: "https://ised-isde.canada.ca/",
    space_mandate:
      "Spectrum-licensing authority for Canadian satellite systems and earth stations. Issues spectrum and radio licences under the Radiocommunication Act and operates the Canadian satellite-spectrum policy framework.",
    legal_basis: "Radiocommunication Act (1985)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "CA-FOREIGN-AFFAIRS",
    jurisdiction: "CA",
    name_en: "Global Affairs Canada — RSSSA Licensing",
    name_local: "Affaires mondiales Canada",
    abbreviation: "GAC",
    website: "https://www.international.gc.ca/space/",
    space_mandate:
      "Lead authority for the Remote Sensing Space Systems Act (RSSSA): commercial-EO licensing, shutter-control authority, and end-user assurance regime. Operates the Canadian export-control regime for space items.",
    legal_basis: "Remote Sensing Space Systems Act (2005)",
    applicable_areas: ["licensing", "data_security", "export_control"],
  },
];

export const LEGAL_SOURCES_CA: LegalSource[] = [
  {
    id: "CA-RSSSA-2005",
    jurisdiction: "CA",
    type: "federal_law",
    status: "in_force",
    title_en: "Remote Sensing Space Systems Act",
    title_local: "Loi sur les systèmes de télédétection spatiale",
    date_enacted: "2005-11-25",
    date_in_force: "2007-04-05",
    official_reference: "S.C. 2005, c. 45",
    source_url: "https://laws-lois.justice.gc.ca/eng/acts/r-5.4/",
    issuing_body: "Parliament of Canada",
    competent_authorities: ["CA-FOREIGN-AFFAIRS"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["licensing", "data_security"],
    scope_description:
      "Canada's primary commercial space-activity statute, but narrowly scoped: it covers only commercial Earth-observation systems with capability above defined thresholds. Imposes a Global Affairs Canada licensing regime, shutter-control authority for national-security purposes, and end-user assurance obligations on data distribution. Outside RSSSA scope (e.g., communications, launch) Canada has no unified statute.",
    key_provisions: [
      {
        section: "§ 8",
        title: "Licence required to operate or distribute",
        summary:
          "No person may operate a remote-sensing space system or distribute raw or enhanced data from such a system without a licence from the Minister of Foreign Affairs.",
      },
      {
        section: "§ 14",
        title: "Conditions on data distribution",
        summary:
          "Licences carry conditions on customer screening, area-of-interest restrictions, resolution thresholds for export, and a shutter-control mechanism the Minister may invoke for national security.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-22",
  },
  {
    id: "CA-CISSIA-1999",
    jurisdiction: "CA",
    type: "federal_law",
    status: "in_force",
    title_en: "Civil International Space Station Agreement Implementation Act",
    title_local:
      "Loi de mise en œuvre de l'Accord intergouvernemental civil sur la Station spatiale internationale",
    date_enacted: "1999-04-19",
    official_reference: "S.C. 1999, c. 35",
    source_url: "https://laws-lois.justice.gc.ca/eng/acts/c-31.3/",
    issuing_body: "Parliament of Canada",
    competent_authorities: ["CA-CSA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["liability", "licensing"],
    scope_description:
      "Domestic implementing legislation for the ISS Intergovernmental Agreement (INT-ISS-1998). Establishes Canadian jurisdiction over Canadian ISS modules and crew, the cross-waiver of liability among ISS partners, and CSA's authority over Canadian flight-element operations.",
    key_provisions: [
      {
        section: "§ 5-6",
        title: "Canadian jurisdiction over Canadian flight elements",
        summary:
          "Confers Canadian jurisdiction and control over Canadian flight elements (Canadarm2, Dextre) and Canadian crew aboard the ISS, consistent with the IGA.",
      },
    ],
    related_sources: ["INT-ISS-1998"],
    last_verified: "2026-04-22",
  },
  {
    id: "CA-RADIOCOM-ACT",
    jurisdiction: "CA",
    type: "federal_law",
    status: "in_force",
    title_en: "Radiocommunication Act",
    title_local: "Loi sur la radiocommunication",
    date_enacted: "1985-12-01",
    date_last_amended: "2024-06-20",
    official_reference: "R.S.C. 1985, c. R-2",
    source_url: "https://laws-lois.justice.gc.ca/eng/acts/r-2/",
    issuing_body: "Parliament of Canada",
    competent_authorities: ["CA-ISED"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Spectrum and radio-licensing statute used by ISED to license Canadian satellite systems, ground stations, and ITU coordination filings. Companion to the RSSSA on the spectrum side.",
    key_provisions: [
      {
        section: "§ 4-5",
        title: "Radio-station and spectrum licences",
        summary:
          "Operation of a radio apparatus, including satellite TT&C and earth stations, requires an ISED licence; foreign satellite systems serving Canadian customers typically require a Canadian gateway licence.",
      },
    ],
    related_sources: ["CA-RSSSA-2005"],
    last_verified: "2026-04-22",
  },
  {
    id: "CA-OST-1967",
    jurisdiction: "CA",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Canadian Ratification",
    date_enacted: "1967-10-10",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of Canada",
    competent_authorities: ["CA-CSA", "CA-FOREIGN-AFFAIRS"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Canada's ratification of the 1967 Outer Space Treaty. State-responsibility obligation discharged in part by the RSSSA (commercial EO) and by Crown-prerogative authorisation for other space activities given the absence of a comprehensive statute. Canada is also an Artemis Accords signatory.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "Canada is internationally responsible for national activities in outer space — the basis for the RSSSA licensing regime and inter-departmental authorisation outside the RSSSA scope.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-04-22",
  },
];
