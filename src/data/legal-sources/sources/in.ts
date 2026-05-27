// src/data/legal-sources/sources/in.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
    title_local:
      "Antrix Corporation Limited / NewSpace India Limited (NSIL) — Operational Mandates",
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

  // ─── Debris-Mitigation national stack — 2026 audit additions ───────

  {
    id: "IN-ISRO-DEBRIS-POLICY",
    jurisdiction: "IN",
    type: "policy_document",
    status: "in_force",
    title_en:
      "ISRO System for Safe and Sustainable Operations Management (IS4OM) — Debris Mitigation Framework",
    title_local: "ISRO Space Debris Mitigation Policy",
    date_published: "2022-07-27",
    date_last_amended: "2024-12-01",
    official_reference: "IS4OM-DEBRIS-2022",
    source_url: "https://www.isro.gov.in/IS4OM.html",
    issuing_body: "Indian Space Research Organisation (ISRO)",
    competent_authorities: ["IN-ISRO"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "ISRO's debris-mitigation framework operated by the IS4OM (System for Safe and Sustainable Operations Management) centre at ISRO Bengaluru. Provides conjunction-warning service to all Indian spacecraft and commercial operators of Indian-licensed missions; references IADC guidelines and ISO 24113 as technical baseline. After India's 'Debris Free Space Mission' commitment (announced 2024), ISRO is targeting zero-debris operations for all post-2030 missions.",
    key_provisions: [
      {
        section: "§3 — Debris Free Space Mission",
        title: "Zero-debris by 2030",
        summary:
          "All ISRO and Indian-commercial missions launched after 1 Jan 2030 shall be designed for end-of-life de-orbiting within 5 years of mission completion, with no debris release during operations.",
      },
      {
        section: "§5",
        title: "Conjunction warning service",
        summary:
          "IS4OM provides daily CDM-format conjunction warnings for Indian spacecraft and commercial operators of Indian-licensed missions; operators must respond to high-Pc events within 24 hours.",
      },
    ],
    related_sources: [
      "IN-SPACE-POLICY-2023",
      "INT-IADC-MITIGATION-2025",
      "INT-CCSDS-CDM-508",
    ],
    last_verified: "2026-04-27",
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Atlas P4 (2026-05-26): India sub-tier deepening — IN-SPACe Norms 2024,
  // FDI Policy 2024 (100% automatic), Defence-space layer, Telecom Act
  // 2023 (satcom spectrum admin allocation), MTCR/Wassenaar memberships,
  // NavIC framework, Devas-Antrix dispute, CRZ Sriharikota, civil-
  // aviation overlap. Per ATLAS-CORPUS-EXPANSION-PLAN.md § 8.C.
  // ═══════════════════════════════════════════════════════════════════════

  // ─── IN-SPACe Authorization Framework + NSIL ────────────────────────
  {
    id: "IN-INSPACE-NORMS-2024",
    jurisdiction: "IN",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "IN-SPACe Norms, Guidelines and Procedures for Authorization of Space Activities",
    date_enacted: "2024-05-08",
    date_in_force: "2024-05-08",
    source_url: "https://www.inspace.gov.in/",
    issuing_body:
      "Indian National Space Promotion and Authorization Center (IN-SPACe)",
    competent_authorities: ["IN-SPACE"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "insurance",
      "debris_mitigation",
    ],
    scope_description:
      "Operational implementing norms for the Indian Space Policy 2023 authorisation regime. Defines categories of authorisation (launch vehicle, satellite operator, ground segment, space resources), application procedure, fee structure, insurance minima, debris-mitigation conformance with IADC standards. Replaces the prior ad-hoc DOS-administered framework. Material for any Indian commercial-space firm seeking authorisation.",
    key_provisions: [
      {
        section: "Chapter II - Authorisations",
        title: "Four authorisation categories",
        summary:
          "Launch vehicle, satellite, ground segment, and space-resource activities — each with distinct application requirements + processing timelines (90-365 days).",
      },
      {
        section: "Chapter IV - Insurance",
        title: "Third-party liability insurance",
        summary:
          "Minimum third-party-liability insurance set by authority — typical baseline ₹50 crore for launch, scaled to mission profile + risk class.",
      },
    ],
    related_sources: ["IN-SPACE-POLICY-2023", "IN-SPACE-ACTIVITIES-BILL"],
    last_verified: "2026-05-26",
  },
  {
    id: "IN-NSIL-CHARTER-2019",
    jurisdiction: "IN",
    type: "federal_law",
    status: "in_force",
    title_en: "NewSpace India Limited (NSIL) Charter and Commercial Mandate",
    date_enacted: "2019-03-06",
    source_url: "https://www.nsilindia.co.in/",
    issuing_body: "Department of Space / NSIL Board",
    competent_authorities: ["IN-DOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["procurement", "state_aid"],
    scope_description:
      "NewSpace India Limited (NSIL) — DOS-owned commercial arm replacing Antrix Corporation as the commercial face of Indian space programme. Operates GSLV/PSLV launch services, GSAT satellite leasing, technology transfer, and NavIC commercial-services contracts. Material counterparty for foreign customers seeking Indian launch services or ISRO-built satellites.",
    key_provisions: [],
    related_sources: ["IN-ANTRIX-NSIL", "IN-DOS"],
    last_verified: "2026-05-26",
  },
  {
    id: "IN-DOS-PROCUREMENT-FRAMEWORK",
    jurisdiction: "IN",
    type: "procurement_framework",
    status: "in_force",
    title_en: "Department of Space Procurement Manual",
    date_enacted: "2018-04-01",
    date_last_amended: "2024-01-01",
    source_url: "https://www.isro.gov.in/procurement",
    issuing_body: "Department of Space",
    competent_authorities: ["IN-DOS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "DOS-wide procurement manual aligned with General Financial Rules (GFR) 2017. Differentiates open-tender, single-source, and emergency procurement for ISRO + NSIL + IN-SPACe. 2024 amendments accommodated commercial-space-firm participation in technology transfer + supplier-base programmes.",
    key_provisions: [],
    related_sources: ["IN-NSIL-CHARTER-2019"],
    last_verified: "2026-05-26",
  },

  // ─── FDI + SEBI ──────────────────────────────────────────────────────
  {
    id: "IN-FDI-POLICY-SPACE-2024",
    jurisdiction: "IN",
    type: "policy_document",
    status: "in_force",
    title_en: "FDI Policy 2024 — Space Sector Liberalisation",
    title_local: "एफडीआई नीति 2024 — अंतरिक्ष क्षेत्र",
    date_enacted: "2024-02-21",
    date_in_force: "2024-04-16",
    official_reference: "Press Note No. 1 of 2024",
    source_url:
      "https://dpiit.gov.in/sites/default/files/PressNote_FDI_Space_2024.pdf",
    issuing_body: "Department for Promotion of Industry and Internal Trade",
    competent_authorities: ["IN-FEMA-FDI-SPACE"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "Major liberalisation of Indian FDI rules for the space sector — opened up to 100% automatic-route FDI in satellite component manufacturing, ground segments, satcom services, launch vehicles + sub-systems (subject to sectoral caps). Satellite manufacturing + operating beyond launch vehicle sub-components requires approval up to 74% automatic + 100% with approval. Material for any foreign space-tech investor — Indian market access dramatically eased.",
    key_provisions: [
      {
        section: "Categories",
        title: "Three-tier FDI categorisation",
        summary:
          "Tier 1 (100% automatic): satellite-component manufacture, ground systems, user-segment. Tier 2 (74% automatic, 100% approval): satellite-establishment + operation. Tier 3 (49% automatic, 100% approval): launch vehicles + associated systems.",
      },
    ],
    related_sources: ["IN-FEMA-FDI-SPACE", "IN-SPACE-POLICY-2023"],
    last_verified: "2026-05-26",
  },
  {
    id: "IN-SEBI-LISTING-SPACE-COS",
    jurisdiction: "IN",
    type: "federal_regulation",
    status: "in_force",
    title_en: "SEBI Listing Rules — Space-Tech Company Disclosure Framework",
    date_enacted: "2015-09-02",
    date_last_amended: "2024-07-01",
    official_reference: "SEBI (LODR) Regulations, 2015 — as amended",
    source_url: "https://www.sebi.gov.in/legal/regulations/",
    issuing_body: "Securities and Exchange Board of India",
    competent_authorities: ["IN-SPACE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["sustainability_reporting", "competition_antitrust"],
    scope_description:
      "SEBI Listing Obligations and Disclosure Requirements. Material for Indian space-tech IPOs — applicable to Skyroot, Agnikul, Pixxel, Bellatrix, Dhruva Space and other commercial-space firms approaching public-market entry. 2024 amendments enhanced ESG + technology-risk disclosure expectations. Anchor-investor + minimum-offer-size rules apply.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── Defence + space-security layer ──────────────────────────────────
  {
    id: "IN-DEFENCE-SPACE-AGENCY",
    jurisdiction: "IN",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Defence Space Agency (DSA) Establishment",
    date_enacted: "2019-04-01",
    source_url: "https://www.mod.gov.in/",
    issuing_body: "Ministry of Defence / Cabinet Committee on Security",
    competent_authorities: ["IN-DOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "fdi_screening"],
    scope_description:
      "Tri-service Defence Space Agency under Integrated Defence Staff. Operationally consolidates Indian military-space capabilities (signals intelligence, SAR Earth observation, missile-defence cueing). Material for FDI / dual-use export-control assessment of Indian space-tech firms — DSA-aligned firms face higher CFIUS / EU 2019/452 scrutiny in cross-border deals.",
    key_provisions: [],
    related_sources: ["IN-INTEGRATED-SPACE-CELL"],
    last_verified: "2026-05-26",
  },
  {
    id: "IN-INTEGRATED-SPACE-CELL",
    jurisdiction: "IN",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Integrated Defence Staff — Space Cell",
    date_enacted: "2008-06-10",
    source_url: "https://www.mod.gov.in/",
    issuing_body: "Integrated Defence Staff (IDS)",
    competent_authorities: ["IN-DOS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    scope_description:
      "Predecessor to the Defence Space Agency. Space Cell within IDS established 2008. Coordinated tri-service space requirements + interface with ISRO on dual-use programmes. Subsumed by DSA 2019 but framework continues to operate for inter-service space-doctrine development.",
    key_provisions: [],
    related_sources: ["IN-DEFENCE-SPACE-AGENCY"],
    last_verified: "2026-05-26",
  },
  {
    id: "IN-MISSION-SHAKTI-ASAT-2019",
    jurisdiction: "IN",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Mission Shakti — Indian ASAT Demonstration",
    date_published: "2019-03-27",
    source_url: "https://www.mod.gov.in/",
    issuing_body: "DRDO + Indian Air Force",
    competent_authorities: ["IN-DOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "debris_mitigation"],
    scope_description:
      "India's anti-satellite weapon test 27 March 2019 — kinetic kill of Microsat-R at ~283 km altitude, ~400 catalogued debris pieces. India became fourth state to demonstrate ASAT capability (after US, Russia, China). Test conducted at lower altitude than 2007 Chinese ASAT (~865 km) to minimise debris longevity, but still triggered diplomatic + scientific criticism. India did NOT sign the 2022 US-led moratorium on destructive ASAT testing.",
    key_provisions: [],
    related_sources: ["IN-DEFENCE-SPACE-AGENCY"],
    last_verified: "2026-05-26",
  },

  // ─── Navigation: NavIC/IRNSS ─────────────────────────────────────────
  {
    id: "IN-NAVIC-FRAMEWORK",
    jurisdiction: "IN",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "NavIC (Indian Regional Navigation Satellite System) Operational Framework",
    title_local: "NavIC — IRNSS संचालन ढाँचा",
    date_enacted: "2018-04-12",
    date_last_amended: "2024-01-01",
    source_url: "https://www.isro.gov.in/IRNSS_Programme.html",
    issuing_body: "ISRO + Department of Telecommunications",
    competent_authorities: ["IN-DOS"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "NavIC (formerly IRNSS — Indian Regional Navigation Satellite System) operational framework. 7-satellite GEO/IGSO constellation providing positioning across India + 1500 km surrounding region. 2024 mandate from Department of Telecommunications requires NavIC support in all new mobile devices sold in India by 2025 — accelerated downstream-services market. Material for chipmaker + handset OEM compliance.",
    key_provisions: [],
    related_sources: ["IN-ITU-TRAI-SPACE"],
    last_verified: "2026-05-26",
  },

  // ─── Frequency + ITU coordination ────────────────────────────────────
  {
    id: "IN-WPC-FREQUENCY-FRAMEWORK",
    jurisdiction: "IN",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Wireless Planning and Coordination Wing — Satellite Frequency Coordination",
    date_enacted: "1952-01-01",
    date_last_amended: "2024-01-01",
    source_url: "https://dot.gov.in/spectrum-management/wpc-wing",
    issuing_body:
      "Wireless Planning and Coordination Wing, Department of Telecommunications",
    competent_authorities: ["IN-ITU-TRAI-SPACE"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "WPC is India's national notifying administration for ITU filings. Operationally handles satellite-frequency coordination, earth-station licensing, ITU API/CR/N filings for Indian satellite networks. Material for any operator with Indian-flagged ITU filings + cross-border satcom services serving Indian subscribers.",
    key_provisions: [],
    related_sources: ["IN-ITU-TRAI-SPACE"],
    last_verified: "2026-05-26",
  },
  {
    id: "IN-COMMUNICATIONS-ACT-2023",
    jurisdiction: "IN",
    type: "federal_law",
    status: "in_force",
    title_en: "Telecommunications Act 2023 — Spectrum Allocation for Satcom",
    date_enacted: "2023-12-24",
    date_in_force: "2024-06-26",
    official_reference: "Act No. 44 of 2023",
    source_url: "https://dot.gov.in/telecommunications-act-2023",
    issuing_body: "Indian Parliament",
    competent_authorities: ["IN-ITU-TRAI-SPACE"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum", "licensing"],
    scope_description:
      "New Indian telecommunications statute replacing the 1885 Indian Telegraph Act + 1933 Wireless Act. Establishes administrative-allocation route for satcom-services spectrum (vs. auction route favoured by terrestrial operators) — material for Starlink + Eutelsat OneWeb + Reliance Jio Satellite + Bharti Airtel-OneWeb India market entry. Triggered TRAI consultation 2024 on satcom-services spectrum pricing.",
    key_provisions: [
      {
        section: "Section 4 + Schedule",
        title: "Administrative spectrum allocation for satcom",
        summary:
          "Satcom-services spectrum allocated administratively (not auctioned) — endpoint of years-long policy debate. Pricing methodology to be set by DoT in consultation with TRAI.",
      },
    ],
    related_sources: ["IN-WPC-FREQUENCY-FRAMEWORK", "IN-ITU-TRAI-SPACE"],
    last_verified: "2026-05-26",
  },

  // ─── Data / IT / Cybersecurity ───────────────────────────────────────
  {
    id: "IN-IT-ACT-2000",
    jurisdiction: "IN",
    type: "federal_law",
    status: "in_force",
    title_en: "Information Technology Act 2000",
    title_local: "सूचना प्रौद्योगिकी अधिनियम, 2000",
    date_enacted: "2000-06-09",
    date_last_amended: "2023-12-22",
    source_url: "https://www.indiacode.nic.in/",
    issuing_body: "Indian Parliament",
    competent_authorities: ["IN-DPDP-2023"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security", "cybersecurity"],
    scope_description:
      "Indian IT Act 2000 governs electronic records, digital signatures, cybercrime, and intermediary liability. Reasonable-security-practices (Section 43A) + CERT-In incident reporting (Section 70B) apply to satcom + ground-segment + data-provider operators. CERT-In's 2022 directions require 6-hour incident-reporting + 180-day log retention — material for satcom operators serving Indian customers.",
    key_provisions: [
      {
        section: "Section 43A + Rule 8",
        title: "Reasonable security practices",
        summary:
          "Bodies corporate holding sensitive personal data must implement reasonable security practices (default ISO 27001 + Rule 8 specific requirements).",
      },
      {
        section: "Section 70B + CERT-In Directions 2022",
        title: "Cyber-incident reporting",
        summary:
          "6-hour incident-reporting requirement to CERT-In; 180-day log retention; specified incident categories include data breaches affecting CIIs.",
      },
    ],
    related_sources: ["IN-DPDP-2023"],
    last_verified: "2026-05-26",
  },

  // ─── Export control + sanctions ──────────────────────────────────────
  {
    id: "IN-EXPORT-CONTROL-FTDR",
    jurisdiction: "IN",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Trade (Development and Regulation) Act + SCOMET List",
    date_enacted: "1992-08-07",
    date_last_amended: "2024-04-01",
    source_url: "https://www.dgft.gov.in/",
    issuing_body: "Directorate General of Foreign Trade",
    competent_authorities: ["IN-DOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "export_control",
      "military_dual_use",
      "sanctions_compliance",
    ],
    scope_description:
      "India's export-control statute. SCOMET (Special Chemicals, Organisms, Materials, Equipment and Technologies) List Category 6 covers munitions; Category 7 covers nuclear-related; Category 8 covers special-materials-related; Categories 9-10 are aerospace-related. India became Wassenaar Arrangement member 2017, MTCR member 2016 — SCOMET list aligned with these regimes. Material for any space-component supplier or customer with Indian counterparty.",
    key_provisions: [],
    related_sources: [
      "IN-MTCR-MEMBERSHIP-2016",
      "IN-WASSENAAR-MEMBERSHIP-2017",
    ],
    last_verified: "2026-05-26",
  },
  {
    id: "IN-MTCR-MEMBERSHIP-2016",
    jurisdiction: "IN",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "India MTCR Membership (Missile Technology Control Regime)",
    date_enacted: "2016-06-27",
    source_url: "https://mtcr.info/",
    issuing_body: "Missile Technology Control Regime",
    competent_authorities: ["IN-DOS"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["export_control"],
    scope_description:
      "India became 35th MTCR member June 2016. Material precedent: India aligned its SCOMET list with MTCR Annex (covering most launch-vehicle-related items). Cross-border launch-vehicle technology transfers from India face same MTCR Category I + II restrictions as other members.",
    key_provisions: [],
    related_sources: ["IN-EXPORT-CONTROL-FTDR"],
    last_verified: "2026-05-26",
  },
  {
    id: "IN-WASSENAAR-MEMBERSHIP-2017",
    jurisdiction: "IN",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "India Wassenaar Arrangement Membership",
    date_enacted: "2017-12-08",
    source_url: "https://www.wassenaar.org/",
    issuing_body: "Wassenaar Arrangement",
    competent_authorities: ["IN-DOS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "India became Wassenaar Arrangement member December 2017. Aligns Indian dual-use controls with Wassenaar Munitions List + Dual-Use Goods + Technologies List. Material for cross-border dual-use space-tech transactions involving Indian counterparties.",
    key_provisions: [],
    related_sources: ["IN-EXPORT-CONTROL-FTDR"],
    last_verified: "2026-05-26",
  },

  // ─── Devas-Antrix dispute (landmark) ─────────────────────────────────
  {
    id: "IN-DEVAS-ANTRIX-DISPUTE-FRAMEWORK",
    jurisdiction: "IN",
    type: "case_law",
    status: "in_force",
    title_en:
      "Devas-Antrix Dispute — Indian Supreme Court + International Arbitration Awards",
    date_enacted: "2011-02-17",
    date_last_amended: "2022-01-17",
    source_url: "https://main.sci.gov.in/",
    issuing_body: "Supreme Court of India + ICC + UNCITRAL Tribunals",
    competent_authorities: ["IN-ANTRIX-NSIL"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["liability", "fdi_screening", "competition_antitrust"],
    scope_description:
      "Landmark cross-border arbitration dispute. Antrix Corporation (then DOS commercial arm) terminated 2005 S-band spectrum-lease contract with Devas Multimedia citing national security. ICC + UNCITRAL tribunals awarded Devas + foreign investors ~$1.2B compensation 2015-2020. Indian Supreme Court 2022 ordered Devas wound up for alleged fraud. Material precedent for: (a) Indian sovereign-contract termination + arbitration risk; (b) foreign-investor protection in space-tech contracts; (c) cross-border enforcement of arbitration awards against Indian state-owned entities.",
    key_provisions: [],
    related_sources: ["IN-ANTRIX-NSIL"],
    last_verified: "2026-05-26",
  },

  // ─── Coastal regulation + Sriharikota ────────────────────────────────
  {
    id: "IN-COASTAL-REG-SRIHARIKOTA",
    jurisdiction: "IN",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Coastal Regulation Zone 2019 — Sriharikota Launch Site Operations",
    date_enacted: "2019-01-18",
    source_url: "https://moef.gov.in/coastal-regulation-zone-2019/",
    issuing_body: "Ministry of Environment, Forest and Climate Change",
    competent_authorities: ["IN-DOS"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental", "licensing"],
    scope_description:
      "Coastal Regulation Zone 2019 governs activities along Indian coastline. Sriharikota (Andhra Pradesh) — primary Indian launch site, all PSLV + GSLV + LVM-3 launches — is within CRZ notified area. Range operations + future spaceport expansion require CRZ clearance + Environmental Impact Assessment. Material for capacity expansion + private-launcher base co-location discussions.",
    key_provisions: [],
    related_sources: ["IN-INSPACE-NORMS-2024"],
    last_verified: "2026-05-26",
  },

  // ─── Civil Aviation overlap ──────────────────────────────────────────
  {
    id: "IN-AIRCRAFT-ACT-SPACEFLIGHT-OVERLAP",
    jurisdiction: "IN",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Aircraft Act 1934 + Bharatiya Vayuyan Adhiniyam 2024 — Suborbital Overlap",
    title_local: "विमान अधिनियम 1934 + भारतीय वायुयान अधिनियम 2024",
    date_enacted: "1934-08-19",
    date_last_amended: "2024-12-11",
    source_url: "https://www.civilaviation.gov.in/",
    issuing_body: "Indian Parliament",
    competent_authorities: ["IN-DOS"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["human_spaceflight", "consumer_protection"],
    scope_description:
      "Aircraft Act 1934 (replaced by Bharatiya Vayuyan Adhiniyam 2024) governs civilian aircraft + extends analogically to suborbital vehicles pending dedicated regulation. The 2024 Act explicitly carved out 'unmanned aircraft systems' but left suborbital regulation to future framework — IN-SPACe + Ministry of Civil Aviation joint consultation ongoing. Material for foreign suborbital-tourism operators considering India market entry.",
    key_provisions: [],
    related_sources: ["IN-INSPACE-NORMS-2024"],
    last_verified: "2026-05-26",
  },

  // ─── Competition law ─────────────────────────────────────────────────
  {
    id: "IN-COMPETITION-ACT-2002",
    jurisdiction: "IN",
    type: "federal_law",
    status: "in_force",
    title_en: "Competition Act 2002",
    title_local: "प्रतिस्पर्धा अधिनियम, 2002",
    date_enacted: "2003-01-13",
    date_last_amended: "2023-04-11",
    source_url: "https://www.cci.gov.in/",
    issuing_body: "Competition Commission of India",
    competent_authorities: ["IN-SPACE"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["competition_antitrust"],
    scope_description:
      "CCI competition framework. 2023 amendment expanded turnover-based merger-notification thresholds applicable to space-tech transactions with Indian market nexus. CCI reviewed satellite-services concentrations (e.g. Eutelsat-OneWeb 2022, Bharti Airtel investments). 2024 deal-value threshold for merger notification (₹2000 crore) captures most cross-border space-tech M&A with India touchpoints.",
    key_provisions: [],
    related_sources: ["IN-SEBI-LISTING-SPACE-COS"],
    last_verified: "2026-05-26",
  },
];
