// src/data/legal-sources/sources/in.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * India — space-law sources and authorities.
 *
 * Coverage: stub-level entry covering the post-2020 reform stack
 * (IN-SPACe authorisation regime, Indian Space Policy 2023, draft Space
 * Activities Bill). India has no comprehensive primary statute yet —
 * regulation is via the IN-SPACe authorisation framework and the policy
 * documents below; the Space Activities Bill is the long-running draft.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_IN: Authority[] = [
  {
    id: "IN-SPACE",
    jurisdiction: "IN",
    name_en: "Indian National Space Promotion and Authorization Centre",
    name_local: "भारतीय राष्ट्रीय अंतरिक्ष संवर्धन और प्राधिकरण केंद्र",
    abbreviation: "IN-SPACe",
    parent_ministry: "Department of Space (DOS)",
    website: "https://www.inspace.gov.in/",
    space_mandate:
      "Single-window authorisation, supervision and promotion authority for non-governmental space activities in India. Issues authorisations under the Norms, Guidelines and Procedures (NGP) and the 2023 Indian Space Policy. Reports to the Prime Minister via the Department of Space.",
    legal_basis:
      "Department of Space Order (15 June 2020); Indian Space Policy 2023",
    applicable_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "frequency_spectrum",
    ],
  },
  {
    id: "IN-DOS",
    jurisdiction: "IN",
    name_en: "Department of Space",
    name_local: "अंतरिक्ष विभाग",
    abbreviation: "DOS",
    parent_ministry: "Government of India (Prime Minister's Office)",
    website: "https://dos.gov.in/",
    space_mandate:
      "Apex policy department under the Prime Minister. Houses ISRO (research and operations), IN-SPACe (authorisation), NSIL (commercial), and ANTRIX (export). The legal/policy authority above the operational entities.",
    legal_basis: "Allocation of Business Rules",
    applicable_areas: ["licensing"],
  },
  {
    id: "IN-ISRO",
    jurisdiction: "IN",
    name_en: "Indian Space Research Organisation",
    name_local: "भारतीय अंतरिक्ष अनुसंधान संगठन",
    abbreviation: "ISRO",
    parent_ministry: "Department of Space",
    website: "https://www.isro.gov.in/",
    space_mandate:
      "National space agency operating PSLV/GSLV/LVM3 launches, the Chandrayaan/Aditya/Gaganyaan programmes, and the Indian satellite fleet. Provides technical advice to IN-SPACe on authorisation applications.",
    legal_basis: "Established 1969; reorganised 2020",
    applicable_areas: ["licensing"],
  },
];

export const LEGAL_SOURCES_IN: LegalSource[] = [
  {
    id: "IN-SPACE-POLICY-2023",
    jurisdiction: "IN",
    type: "policy_document",
    status: "in_force",
    title_en: "Indian Space Policy 2023",
    title_local: "भारतीय अंतरिक्ष नीति 2023",
    date_published: "2023-04-06",
    source_url:
      "https://www.isro.gov.in/media_isro/pdf/IndianSpacePolicy2023.pdf",
    issuing_body: "Department of Space, Government of India",
    competent_authorities: ["IN-SPACE", "IN-DOS"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    scope_description:
      "Foundational policy enabling end-to-end participation of non-governmental entities (NGEs) in Indian space activities. Sets IN-SPACe as the single-window authoriser, defines roles for ISRO (R&D), NSIL (commercial), and DOS (policy), and opens space for FDI subject to authorisation. The policy under which IN-SPACe issues every commercial authorisation today, pending the Space Activities Bill.",
    key_provisions: [
      {
        section: "§ 4-5",
        title: "Authorisation regime for NGEs",
        summary:
          "All non-governmental space activities — launch, satellite manufacture and operation, ground stations, downstream services — require IN-SPACe authorisation. IN-SPACe issues Norms, Guidelines and Procedures specifying technical, safety, and financial criteria.",
      },
      {
        section: "§ 6",
        title: "FDI in space sector",
        summary:
          "100 % FDI permitted for satellite component manufacturing; 74 % automatic route for satellite manufacturing/operation/data; 49 % automatic route for launch vehicles. Above these thresholds requires Government-route approval.",
      },
    ],
    related_sources: ["IN-NGP-2024", "IN-SPACE-ACTIVITIES-BILL"],
    last_verified: "2026-04-22",
  },
  {
    id: "IN-NGP-2024",
    jurisdiction: "IN",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "IN-SPACe Norms, Guidelines and Procedures for Authorisation of Space Activities",
    title_local: "IN-SPACe NGP",
    date_published: "2024-05-01",
    source_url:
      "https://www.inspace.gov.in/inspace/public/document/2024-NGP-final.pdf",
    issuing_body: "IN-SPACe",
    competent_authorities: ["IN-SPACE"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "liability",
      "insurance",
      "debris_mitigation",
      "frequency_spectrum",
    ],
    scope_description:
      "Operational ruleset that turns the 2023 policy into application-ready procedures. Defines authorisation classes (launch, satellite operation, ground station, transfer of control, etc.), evidence standards, fee schedule, indemnification thresholds, and the IN-SPACe technical-evaluation workflow. The actual document IN-SPACe applies to every commercial application.",
    key_provisions: [
      {
        section: "Part B",
        title: "Authorisation classes and evidence",
        summary:
          "Eight authorisation classes covering launch, satellite operations, ground stations, in-orbit-services, transfers of ownership/control, and downstream applications. Each carries an evidence template, fee, and target review timeline.",
      },
      {
        section: "Part D",
        title: "Indemnification and insurance",
        summary:
          "Operator-State indemnification template for surface damage. Mandatory third-party-liability insurance scaling with mission risk; IN-SPACe accepts equivalent State-to-State assurance for partner-government missions.",
      },
    ],
    related_sources: ["IN-SPACE-POLICY-2023"],
    last_verified: "2026-04-22",
  },
  {
    id: "IN-SPACE-ACTIVITIES-BILL",
    jurisdiction: "IN",
    type: "draft_legislation",
    status: "draft",
    title_en: "Space Activities Bill",
    title_local: "अंतरिक्ष गतिविधियाँ विधेयक",
    date_published: "2017-11-21",
    parliamentary_reference: "Draft circulated 2017; revised drafts 2020, 2023",
    source_url: "https://dos.gov.in/space-activities-bill",
    issuing_body: "Department of Space",
    competent_authorities: ["IN-DOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability", "insurance", "registration"],
    scope_description:
      "Long-pending draft primary statute that would replace the policy-and-NGP regime with a comprehensive Space Activities Act covering authorisation, liability, insurance, and registration. Successive drafts since 2017; not yet introduced in Parliament. Operators should treat the 2023 policy + 2024 NGP as authoritative until the Bill is enacted.",
    key_provisions: [
      {
        section: "Draft Ch. II",
        title: "Statutory authorisation regime",
        summary:
          "Would put the IN-SPACe authorisation regime on statutory footing, with offences, penalties, and a tribunal route currently absent from the policy framework.",
      },
    ],
    related_sources: ["IN-SPACE-POLICY-2023", "IN-NGP-2024"],
    last_verified: "2026-04-22",
  },
  {
    id: "IN-OST-1982",
    jurisdiction: "IN",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Indian Ratification",
    date_enacted: "1982-01-18",
    official_reference: "Indian ratification 18 January 1982",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of India",
    competent_authorities: ["IN-DOS"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "India's ratification record for the 1967 Outer Space Treaty. Anchors India's obligations under Art. VI to authorise and continuously supervise national space activities — the international-law foundation that the Indian Space Policy 2023 and the IN-SPACe NGP discharge domestically.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "India is internationally responsible for national activities in outer space. Domestically discharged via the IN-SPACe authorisation regime under the 2023 Policy and 2024 NGP.",
      },
    ],
    related_sources: ["INT-OST-1967", "IN-SPACE-POLICY-2023"],
    last_verified: "2026-04-22",
  },

  {
    id: "IN-FEMA-FDI-SPACE",
    jurisdiction: "IN",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "FEMA Foreign Direct Investment Rules — Space Sector (2024 Amendment)",
    title_local: "FEMA — Space FDI Rules",
    date_enacted: "2024-04-16",
    official_reference: "Notification S.O. 1610(E), 16 April 2024",
    source_url:
      "https://dpiit.gov.in/sites/default/files/SpaceFDIRules_16April2024.pdf",
    issuing_body: "Department for Promotion of Industry and Internal Trade",
    competent_authorities: ["IN-DOS", "IN-SPACE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "April 2024 liberalisation of foreign direct investment in the Indian space sector under the Foreign Exchange Management Act. Sets the FDI ceilings and routes (automatic vs. Government approval) for satellite manufacturing/operation/data, launch vehicles and sub-systems, and satellite component manufacturing — operative for any non-Indian investor pursuing IN exposure.",
    key_provisions: [
      {
        section: "FDI Schedule",
        title: "Automatic-route ceilings",
        summary:
          "Up to 74 % automatic for satellite manufacturing, operation, and data products; up to 49 % automatic for launch vehicles and associated systems; up to 100 % automatic for components and sub-systems. Above-ceiling investment requires Government route approval.",
      },
    ],
    related_sources: ["IN-SPACE-POLICY-2023", "IN-NGP-2024"],
    last_verified: "2026-04-22",
  },
  {
    id: "IN-DPDP-2023",
    jurisdiction: "IN",
    type: "federal_law",
    status: "in_force",
    title_en: "Digital Personal Data Protection Act 2023",
    title_local: "Digital Personal Data Protection Act, 2023",
    date_enacted: "2023-08-11",
    date_in_force: "2025-09-01",
    official_reference: "Act No. 22 of 2023",
    source_url: "https://www.meity.gov.in/data-protection-framework",
    issuing_body: "Parliament of India",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "data_provider", "ground_segment"],
    compliance_areas: ["data_security"],
    scope_description:
      "India's first comprehensive data-protection statute. Captures Earth-observation operators whose imagery resolves identifiable individuals, satcom-subscriber data, and any cross-border transfer touching Indian data principals. Enforcement by the Data Protection Board of India established under the Act.",
    key_provisions: [
      {
        section: "§ 16",
        title: "Cross-border data transfers",
        summary:
          "Transfers permitted to all jurisdictions except those notified by the Central Government as restricted — a permissive regime relative to the EU GDPR adequacy framework.",
      },
    ],
    related_sources: ["EU-GDPR-2016"],
    last_verified: "2026-04-22",
  },
  {
    id: "IN-ANTRIX-NSIL",
    jurisdiction: "IN",
    type: "policy_document",
    status: "in_force",
    title_en: "Antrix-NSIL Reform — Commercial Space Procurement and Marketing",
    date_published: "2024-12-01",
    source_url: "https://www.nsilindia.co.in/",
    issuing_body: "Department of Space",
    competent_authorities: ["IN-DOS"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Reference for the dual commercial-arm structure of Indian space: NewSpace India Limited (NSIL, est. 2019) is the public-sector commercial arm executing demand-driven satellite and launch contracts, while Antrix Corporation continues as ISRO's marketing arm. NSIL has now taken the lead role for end-to-end commercial space business; international counterparties contract through NSIL for PSLV/SSLV launches.",
    key_provisions: [
      {
        section: "Demand-driven model",
        title: "End-to-end commercial space contracting",
        summary:
          "NSIL contracts with private satellite operators (domestic and foreign) for build-launch-and-operate missions, transferring revenue and risk to a commercial entity rather than ISRO directly.",
      },
    ],
    related_sources: ["IN-SPACE-POLICY-2023"],
    last_verified: "2026-04-22",
  },
  {
    id: "IN-ITU-TRAI-SPACE",
    jurisdiction: "IN",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Telecommunications Act 2023 + TRAI Recommendations on Satellite Spectrum",
    title_local: "Telecommunications Act, 2023",
    date_enacted: "2023-12-24",
    date_in_force: "2024-06-26",
    official_reference: "Act No. 44 of 2023",
    source_url:
      "https://dot.gov.in/sites/default/files/Telecommunications%20Act%2C%202023.pdf",
    issuing_body: "Parliament of India",
    competent_authorities: ["IN-SPACE"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "New Telecommunications Act 2023 replaces the Indian Telegraph Act 1885 and the Wireless Telegraphy Act 1933. Section 6 explicitly authorises administrative allocation of satellite spectrum (rather than auction) for specified satellite-services bands. Pairs with TRAI recommendations on commercial space-spectrum and IN-SPACe authorisation for the Indian satcom market.",
    key_provisions: [
      {
        section: "§ 6",
        title: "Administrative allocation of satellite spectrum",
        summary:
          "Spectrum for specified satellite-services use cases is allocated administratively under Government rules, subject to terms and conditions. Resolves a long-running debate over satellite vs. terrestrial spectrum-allocation models.",
      },
    ],
    related_sources: ["INT-ITU-RR", "IN-SPACE-POLICY-2023"],
    last_verified: "2026-04-22",
  },
];
