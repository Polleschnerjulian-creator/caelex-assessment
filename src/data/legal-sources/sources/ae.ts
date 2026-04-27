// src/data/legal-sources/sources/ae.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * United Arab Emirates — space-law sources and authorities.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_AE: Authority[] = [
  {
    id: "AE-UAESA",
    jurisdiction: "AE",
    name_en: "UAE Space Agency",
    name_local: "وكالة الإمارات للفضاء",
    abbreviation: "UAESA",
    parent_ministry: "Ministry of Industry and Advanced Technology",
    website: "https://space.gov.ae/",
    space_mandate:
      "National space agency and licensing authority under Federal Decree-Law No. 12 of 2019 on the Regulation of the Space Sector and its Executive Regulations. Issues space-activity permits, manages the national space-objects registry, and oversees space-resource extraction authorisations.",
    legal_basis:
      "Federal Decree-Law No. 12 of 2019; Cabinet Resolution No. 57 of 2020 (Executive Regulations)",
    applicable_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "frequency_spectrum",
    ],
  },
  {
    id: "AE-MBRSC",
    jurisdiction: "AE",
    name_en: "Mohammed Bin Rashid Space Centre",
    name_local: "مركز محمد بن راشد للفضاء",
    abbreviation: "MBRSC",
    website: "https://www.mbrsc.ae/",
    space_mandate:
      "Operational space-engineering organisation (KhalifaSat, MBZ-SAT, Hope Mars Mission, Rashid lunar rover). Reports to the Dubai Government; not a regulator but the principal AE-flagged operator that all UAESA permits flow around.",
    legal_basis: "Dubai Government Decree",
    applicable_areas: ["licensing"],
  },
];

export const LEGAL_SOURCES_AE: LegalSource[] = [
  {
    id: "AE-DECREE-12-2019",
    jurisdiction: "AE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Federal Decree-Law No. 12 of 2019 on the Regulation of the Space Sector",
    title_local: "مرسوم بقانون اتحادي رقم 12 لسنة 2019 بشأن تنظيم قطاع الفضاء",
    date_enacted: "2019-12-19",
    date_in_force: "2020-01-01",
    official_reference: "Federal Decree-Law No. 12 of 2019",
    source_url: "https://uaelegislation.gov.ae/en/legislations/1255/download",
    issuing_body: "President of the United Arab Emirates",
    competent_authorities: ["AE-UAESA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
    ],
    scope_description:
      "UAE's primary space-law statute. Establishes UAESA as the national licensing authority, mandates permits for every space activity by UAE-flagged or UAE-territory operators, sets liability and insurance rules, and explicitly authorises space-resource extraction (UAE was the third jurisdiction to legislate space-resource ownership after the US and Luxembourg).",
    key_provisions: [
      {
        section: "Art. 4-9",
        title: "Permit regime",
        summary:
          "All space activities (launch, satellite operation, ground stations, in-orbit services, space-resource extraction) require a UAESA permit. Permits are issued for defined activity classes with technical, safety, and financial criteria.",
      },
      {
        section: "Art. 18",
        title: "Space-resource activities",
        summary:
          "Authorises and regulates the exploration and use of space resources by permitted operators. Detailed framework set by Cabinet Resolution.",
      },
      {
        section: "Art. 22-25",
        title: "Liability and insurance",
        summary:
          "Operator liability for surface damage; mandatory third-party-liability insurance; State indemnification framework set by the Executive Regulations.",
      },
    ],
    related_sources: ["AE-EXECREG-2020", "INT-OST-1967"],
    last_verified: "2026-04-22",
  },
  {
    id: "AE-EXECREG-2020",
    jurisdiction: "AE",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Executive Regulations of Federal Decree-Law No. 12 of 2019 — Cabinet Resolution No. 57 of 2020",
    title_local: "اللائحة التنفيذية للمرسوم بقانون اتحادي رقم 12 لسنة 2019",
    date_enacted: "2020-09-09",
    official_reference: "Cabinet Resolution No. 57 of 2020",
    source_url: "https://space.gov.ae/Page/19880/19948/Laws-and-Regulations",
    issuing_body: "UAE Cabinet",
    competent_authorities: ["AE-UAESA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "debris_mitigation", "insurance"],
    scope_description:
      "Operational rulebook implementing the 2019 Decree-Law. Sets permit-application content, fees, technical evaluation procedures, debris-mitigation thresholds (25-year LEO clearance), insurance amounts by mission class, and the space-resource permit framework.",
    key_provisions: [
      {
        section: "Title 2",
        title: "Permit application content",
        summary:
          "Detailed evidence templates for each permit class: launch, satellite operation, ground station, in-orbit services, and space-resource activities. Includes technical, safety-case, financial, and end-user-screening evidence.",
      },
      {
        section: "Title 4",
        title: "Debris-mitigation requirements",
        summary:
          "Aligns with IADC Space Debris Mitigation Guidelines: 25-year LEO clearance, post-mission passivation, end-of-life disposal plan reviewed before permit issuance.",
      },
    ],
    related_sources: ["AE-DECREE-12-2019"],
    last_verified: "2026-04-22",
  },
  {
    id: "AE-OST-2000",
    jurisdiction: "AE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — UAE Ratification",
    date_enacted: "2000-03-04",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "UAE Government",
    competent_authorities: ["AE-UAESA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "UAE ratified the OST in 2000. State-responsibility and registration obligations discharged through Federal Decree-Law 12/2019 and the UAESA permit regime. UAE is also a signatory to the Artemis Accords (October 2020).",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "UAE is internationally responsible for national space activities — discharged through the UAESA permit framework.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-04-22",
  },
];
