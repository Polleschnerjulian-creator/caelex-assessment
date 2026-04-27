// src/data/legal-sources/sources/us.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * United States space law sources — complete legal framework for jurisdiction US.
 *
 * Sources: faa.gov/space, fcc.gov, nesdis.noaa.gov, pmddtc.state.gov,
 * bis.doc.gov, nasa.gov, cisa.gov, law.cornell.edu, ecfr.gov
 * Last verified: 2026-04-20
 *
 * Notable: the USA is Atlas's first non-European full jurisdiction.
 * Structurally it is the most complex entry in the database — a
 * multi-agency regime with NO single "space law" but rather five
 * layered federal statutes and corresponding regulators:
 *
 *   FAA/AST          launch + reentry licensing (CSLA 1984)
 *   FCC              spectrum + orbital debris rules (47 CFR Part 25)
 *   NOAA/NESDIS      commercial remote-sensing licensing (LRSPA 1992)
 *   DDTC (State)     ITAR defense-article export (22 CFR 120-130)
 *   BIS  (Commerce)  EAR dual-use export (15 CFR 730-774)
 *
 * NASA is a civil space agency and procurer, not a commercial-operator
 * regulator. The Space Force / USSF and DoD regulate national-security
 * payloads separately. CISA coordinates space-sector cybersecurity.
 *
 * Policy notable: USA is NOT a party to the Moon Agreement (1979) —
 * deliberate policy choice, reinforced by the 2015 CSLCA §51303 which
 * recognises private property rights over in-situ resources, and by
 * the 2020 Artemis Accords which the USA originated and signed as
 * the 1st signatory (13 October 2020).
 *
 * Coverage status: COMPLETE (proof-of-concept for global expansion).
 * Treaty ratification dates verified against US Department of State
 * TIAS registry and UNOOSA depositary.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── US Authorities (8) ───────────────────────────────────────────

export const AUTHORITIES_US: Authority[] = [
  {
    id: "US-FAA-AST",
    jurisdiction: "US",
    name_en:
      "Federal Aviation Administration — Office of Commercial Space Transportation",
    name_local: "FAA/AST",
    abbreviation: "FAA/AST",
    parent_ministry: "Department of Transportation",
    website: "https://faa.gov/space",
    space_mandate:
      "Primary licensing authority for commercial launch, reentry, and launch-site operations under the Commercial Space Launch Act (51 USC Ch. 509) and 14 CFR Parts 400-450. Issues launch licences, reentry licences, experimental permits, and launch-site operator licences. Administers the government third-party liability indemnification regime (51 USC §50914) — historically capped at $3.1B above Maximum Probable Loss. The §50914 indemnification authority was previously authorised through 30 September 2025; operators should treat the post-sunset status as actively unsettled and confirm current reauthorisation before relying on federal indemnification in launch contracts. Houses the Commercial Space Transportation Advisory Committee (COMSTAC).",
    legal_basis: "51 USC Ch. 509; 14 CFR Parts 400-450",
    applicable_areas: ["licensing", "liability", "insurance"],
  },
  {
    id: "US-FCC",
    jurisdiction: "US",
    name_en: "Federal Communications Commission",
    name_local: "FCC",
    abbreviation: "FCC",
    parent_ministry: "Independent federal agency",
    website: "https://fcc.gov",
    space_mandate:
      "Licenses satellite earth stations, satellite services, and orbital operations under the Communications Act of 1934 and 47 CFR Parts 2, 5, 25, 87, 101. Manages ITU coordination for US satellite filings and orbital slots. Issues market-access grants to non-US satellite operators serving US customers. Adopted landmark 5-year post-mission disposal rule (2022) reducing the prior 25-year guideline. Orbital debris rules codified in 47 CFR § 25.114.",
    legal_basis: "Communications Act 1934; 47 CFR Parts 2, 5, 25, 87, 101",
    applicable_areas: ["frequency_spectrum", "debris_mitigation"],
  },
  {
    id: "US-NOAA-CRSRA",
    jurisdiction: "US",
    name_en: "NOAA Commercial Remote Sensing Regulatory Affairs Office",
    name_local: "NOAA/NESDIS/CRSRA",
    abbreviation: "NOAA/CRSRA",
    parent_ministry: "Department of Commerce",
    website: "https://nesdis.noaa.gov/CRSRA",
    space_mandate:
      "Licenses private operation of commercial Earth observation systems under the Land Remote Sensing Policy Act of 1992 (51 USC Ch. 601) and 15 CFR Part 960. 2020 tiering reform established Tier 1 (unrestricted), Tier 2 (limited conditions), and Tier 3 (temporary conditions possible) based on comparable foreign availability. Conditions can cover resolution caps, imagery shutter control, and data-handling restrictions in extraordinary circumstances.",
    legal_basis: "51 USC Ch. 601; 15 CFR Part 960",
    applicable_areas: ["data_security", "licensing"],
  },
  {
    id: "US-DDTC",
    jurisdiction: "US",
    name_en: "US Department of State — Directorate of Defense Trade Controls",
    name_local: "DDTC",
    abbreviation: "DDTC",
    parent_ministry: "Department of State",
    website: "https://pmddtc.state.gov",
    space_mandate:
      "Administers the International Traffic in Arms Regulations (ITAR, 22 CFR 120-130) under the Arms Export Control Act (22 USC 2751). US Munitions List (USML) Category IV (Launch Vehicles, Missiles) and Category XV (Spacecraft Systems) cover most military and dual-use spacecraft components. ITAR export violations carry criminal penalties up to 20 years imprisonment and $1M per violation. Technical Assistance Agreements (TAAs) required for technical data transfers to foreign persons.",
    legal_basis: "22 USC 2751 (AECA); 22 CFR 120-130 (ITAR)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "US-BIS",
    jurisdiction: "US",
    name_en: "US Department of Commerce — Bureau of Industry and Security",
    name_local: "BIS",
    abbreviation: "BIS",
    parent_ministry: "Department of Commerce",
    website: "https://bis.doc.gov",
    space_mandate:
      "Administers the Export Administration Regulations (EAR, 15 CFR 730-774) under the Export Control Reform Act of 2018 (50 USC Ch. 58). Commerce Control List (CCL) Category 9 (Aerospace and Propulsion) covers dual-use space items not on the ITAR USML. 2014 Export Control Reform migrated most commercial satellite components from ITAR Category XV to EAR 9E515 / 9A515. BIS screening procedures for end-users, end-uses, and destinations (especially China, Russia, Iran).",
    legal_basis: "50 USC Ch. 58 (ECRA); 15 CFR 730-774 (EAR)",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "US-NASA",
    jurisdiction: "US",
    name_en: "National Aeronautics and Space Administration",
    name_local: "NASA",
    abbreviation: "NASA",
    parent_ministry: "Independent federal agency",
    website: "https://nasa.gov",
    space_mandate:
      "US civil space agency established by the National Aeronautics and Space Act of 1958 (51 USC Ch. 201). Not a regulator of commercial operators, but the primary civil space procurer (Commercial Crew, Commercial Cargo, CLPS, Artemis). Publishes NASA-STD-8719.14 orbital debris mitigation standards and the ISS National Lab Reference Mission docs. International partner for bilateral space agreements; host and first signatory of the Artemis Accords (13 October 2020).",
    legal_basis: "51 USC Ch. 201 (Space Act 1958)",
    applicable_areas: ["licensing"],
  },
  {
    id: "US-CISA",
    jurisdiction: "US",
    name_en: "Cybersecurity and Infrastructure Security Agency",
    name_local: "CISA",
    abbreviation: "CISA",
    parent_ministry: "Department of Homeland Security",
    website: "https://cisa.gov",
    space_mandate:
      "Operational lead for US critical-infrastructure cybersecurity. Space Systems were designated the 16th critical infrastructure sector under PPD-21 / Sector-Specific Agency framework (active discussion; not yet codified as of 2026). Issues space-sector cybersecurity guidance via the Space Systems Cybersecurity Working Group and coordinates with the National Cybersecurity Strategy Implementation Plan 2023. No dedicated NIS2-equivalent federal law — US cybersecurity regime is sector-specific with FCC rules, FTC enforcement, and voluntary NIST 800-171/800-53 controls.",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "US-USSF",
    jurisdiction: "US",
    name_en: "United States Space Force",
    name_local: "USSF",
    abbreviation: "USSF",
    parent_ministry: "Department of the Air Force",
    website: "https://spaceforce.mil",
    space_mandate:
      "Military service established 20 December 2019 by the National Defense Authorization Act 2020. Responsible for military space operations, space domain awareness (via Space Surveillance Network), and conjunction warnings to commercial operators (via 18th Space Defense Squadron and the Space Domain Awareness catalog). Issues no commercial licences but its collision-avoidance services (historically free via space-track.org) are transitioning to Department of Commerce Office of Space Commerce (OSC) under Space Policy Directive-3.",
    applicable_areas: ["space_traffic_management", "military_dual_use"],
  },
];

// ─── International Treaties (5) ──────────────

const TREATIES_US: LegalSource[] = [
  {
    id: "US-OST-1967",
    jurisdiction: "US",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — United States Ratification",
    date_enacted: "1967-01-27",
    date_in_force: "1967-10-10",
    official_reference: "TIAS 6347 / 18 UST 2410",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["US-NASA", "US-FAA-AST"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "United States ratification record for the 1967 Outer Space Treaty. Anchors US Art. VI obligation to authorise and continuously supervise non-governmental US space activities — the constitutional foundation under which CSLA, FCC Part 25, NOAA CRSRA, and ITAR/EAR all operate.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — implemented via CSLA + sector laws",
        summary:
          "The United States bears international responsibility for national space activities including by non-governmental entities. US Art. VI implementation is distributed: FAA/AST licenses launch/reentry (CSLA 1984), FCC licenses satellite services (1934 Act), NOAA licenses remote sensing (LRSPA 1992), DDTC/BIS control exports (ITAR/EAR). There is no single unified 'space authorization act'.",
        complianceImplication:
          "US operators must secure parallel authorizations from multiple agencies. A typical commercial satellite operator holds FAA launch licence, FCC earth-station + space-station licences, and BIS export licences — often with concurrent review timelines.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability — CSLA indemnification regime",
        summary:
          "The US is internationally liable as 'launching State' for damage caused by its nationals or from its territory. The Commercial Space Launch Act §50914 provides a three-tier financial responsibility regime: operator insurance for Maximum Probable Loss (MPL), government indemnification for claims above MPL up to $3.1B (2023 cap), and unlimited US sovereign liability above that. The indemnification provision is scheduled to sunset 30 September 2025 absent Congressional reauthorization.",
      },
      {
        section: "Art. VIII",
        title: "Registration and jurisdiction",
        summary:
          "The US retains jurisdiction over objects on its registry. Registration is performed by the Department of State via the UN Office for Outer Space Affairs (UNOOSA) pursuant to the 1975 Registration Convention. FAA (for launch vehicles) and FCC (for communications satellites) provide the underlying authorization that drives State registration decisions.",
      },
    ],
    related_sources: [
      "US-LIABILITY-1972",
      "US-REGISTRATION-1976",
      "US-CSLA-1984",
      "US-ARTEMIS-2020",
    ],
    notes: [
      "Signed 27 January 1967; ratified 10 October 1967 (TIAS 6347).",
      "US Senate ratification by consent, 72 USC § 2401.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "US-RESCUE-1969",
    jurisdiction: "US",
    type: "international_treaty",
    status: "in_force",
    title_en: "Rescue Agreement — United States Ratification",
    date_enacted: "1968-04-22",
    date_in_force: "1968-12-03",
    official_reference: "TIAS 6599 / 19 UST 7570",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/rescueagreement.html",
    issuing_body: "United Nations",
    competent_authorities: ["US-DDTC"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "US ratification of the Rescue Agreement obliging the US to render assistance to astronauts in distress and return space objects found on US territory. Operational relevance is low for commercial operators but contributes to the international due-regard framework.",
    key_provisions: [
      {
        section: "Art. 5",
        title: "Return of space objects — US practice",
        summary:
          "The US is obligated to return foreign space objects found on its territory to the launching authority. In practice, recovered debris and returned objects are coordinated by NASA and the State Department. This is directly relevant for launch operators planning uncontrolled reentries over international waters or allied territories.",
      },
    ],
    related_sources: ["US-OST-1967"],
    notes: ["Ratified 10 October 1968; TIAS 6599."],
    last_verified: "2026-04-20",
  },
  {
    id: "US-LIABILITY-1972",
    jurisdiction: "US",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — United States Ratification",
    date_enacted: "1972-03-29",
    date_in_force: "1972-10-09",
    official_reference: "TIAS 7762 / 24 UST 2389",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["US-DDTC", "US-FAA-AST"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    scope_description:
      "US ratification of the Liability Convention. Establishes US absolute liability for surface damage and fault liability for in-orbit damage caused by US-registered space objects — drives the CSLA §50914 indemnification regime under which the US Government indemnifies licensees above a contractually-set Maximum Probable Loss.",
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — implemented via CSLA §50914",
        summary:
          "The United States is absolutely liable for surface damage caused by US space objects. Domestic implementation of the liability exposure routes through the Commercial Space Launch Act §50914 cross-waivers and indemnification regime: (1) operator insurance for MPL; (2) federal indemnification MPL → $3.1B; (3) unlimited sovereign liability above. Non-sovereign defendants can be held liable in US courts via the Outer Space Damages Act equivalents (there is no single unified statute).",
      },
    ],
    related_sources: ["US-OST-1967", "US-CSLA-1984"],
    notes: ["Ratified 18 October 1972; TIAS 7762."],
    last_verified: "2026-04-20",
  },
  {
    id: "US-REGISTRATION-1976",
    jurisdiction: "US",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — United States Ratification",
    date_enacted: "1975-01-14",
    date_in_force: "1976-09-15",
    official_reference: "TIAS 8480 / 28 UST 695",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["US-NASA", "US-DDTC"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    scope_description:
      "US ratification of the Registration Convention. Implemented domestically through the State Department / Department of State Registry of Space Objects, which is updated for every CSLA-licensed launch and every operational US satellite.",
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry — maintained by State Department",
        summary:
          "The US Registry of Space Objects is maintained by the Department of State (Bureau of Oceans and International Environmental and Scientific Affairs) and submitted to UNOOSA. Registrations are triggered by FAA launch-licence issuance and FCC space-station-licence grants. Private operators are notified but the registration itself is a State-to-State act.",
      },
    ],
    related_sources: ["US-OST-1967"],
    notes: ["Ratified 15 September 1976; TIAS 8480."],
    last_verified: "2026-04-20",
  },
  {
    id: "US-MOON-NON-PARTY",
    jurisdiction: "US",
    type: "international_treaty",
    status: "not_ratified",
    title_en: "Moon Agreement — United States (NON-PARTY)",
    date_enacted: "1979-12-18",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html",
    issuing_body: "United Nations",
    competent_authorities: ["US-DDTC"],
    relevance_level: "high",
    applicable_to: ["space_resource_operator"],
    compliance_areas: ["licensing"],
    scope_description:
      "Reference entry documenting the US position as a non-signatory and non-party to the 1979 Moon Agreement. The US explicitly rejects the Common Heritage of Mankind framing — the legal basis for US private-sector space-resource utilisation under CSLCA Title IV and the Artemis Accords' resource-extraction principles.",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NOT ratified — deliberate US policy",
        summary:
          "The United States has NOT signed or ratified the 1979 Moon Agreement. The Agreement's characterisation of celestial-body resources as the 'common heritage of mankind' (Art. 11) is inconsistent with US law, specifically the Commercial Space Launch Competitiveness Act of 2015 §51303 which recognises private property rights over in-situ lunar and asteroid resources for US citizens. The Artemis Accords (2020) further operationalise this policy via bilateral coordination rather than collective governance.",
        complianceImplication:
          "US space-resource operators rely on the 2015 CSLCA §51303 and the Artemis Accords framework. Operators serving jurisdictions that ARE party to the Moon Agreement (Australia, Austria, Belgium, Netherlands, Pakistan, etc.) face potential conflict-of-laws exposure.",
      },
    ],
    related_sources: ["US-CSLCA-2015", "US-ARTEMIS-2020"],
    notes: [
      "US is NOT a party — deliberate policy choice.",
      "Position reinforced by 2015 CSLCA §51303 (space-resource rights).",
      "Artemis Accords (2020) as an alternative coordination framework.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Core Federal Statutes (5) ──────────────────

const FEDERAL_LAWS_US: LegalSource[] = [
  {
    id: "US-CSLA-1984",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en: "Commercial Space Launch Act",
    title_local: "Commercial Space Launch Act (CSLA)",
    date_enacted: "1984-10-30",
    date_last_amended: "2023-12-22",
    official_reference: "51 USC Ch. 509 (§50901 et seq.)",
    source_url:
      "https://www.law.cornell.edu/uscode/text/51/subtitle-V/chapter-509",
    issuing_body: "United States Congress",
    competent_authorities: ["US-FAA-AST"],
    relevance_level: "fundamental",
    applicable_to: ["launch_provider", "in_orbit_services"],
    compliance_areas: ["licensing", "liability", "insurance"],
    scope_description:
      "Founding statute for US commercial space-launch regulation, codified at 51 U.S.C. Ch. 509. Establishes the FAA's authority over commercial launch and re-entry, the CSLA licensing regime, the indemnification scheme (§50914), and the framework regulators have iteratively expanded through Part 450 and successor amendments.",
    key_provisions: [
      {
        section: "51 USC §50904",
        title: "Licence required for launch and reentry",
        summary:
          "Prohibits US persons from conducting launch, reentry, or launch-site operations without an FAA licence or permit. Foreign persons operating from US territory are equally covered. Implementing regulations at 14 CFR Parts 400-450 set the detailed technical, environmental, and financial-responsibility requirements.",
      },
      {
        section: "51 USC §50914",
        title: "Financial responsibility + government indemnification",
        summary:
          "Three-tier liability regime: (1) operator maintains insurance for the Maximum Probable Loss (MPL, typically $100M–$500M), (2) government indemnifies above MPL up to $3.1B (2023 cap), (3) unlimited US sovereign liability above that. The §50914 indemnification authority was authorised through 30 September 2025 — its post-sunset status is unsettled and must be re-checked for any launch contract relying on federal indemnification.",
        complianceImplication:
          "FAA calculates MPL per licence. Government indemnification is not automatic — operators must comply with launch conditions. As of April 2026 the $3.1B/§50914 indemnification reauthorisation status should be treated as a live diligence item, not as 'in force' by default; pull the current statute text or a recent CRS/FAA update before contracting.",
      },
      {
        section: "51 USC §50919(g)",
        title: "Learning Period / FAA launch safety rulemaking moratorium",
        summary:
          "Congress has restricted FAA from adopting human-spaceflight-participant safety regulations except in the event of specified incidents. The 'learning period' was last extended by the 2023 NDAA through 1 October 2025. Designed to enable the commercial human spaceflight industry to mature before prescriptive safety rules.",
      },
    ],
    related_sources: [
      "US-OST-1967",
      "US-LIABILITY-1972",
      "US-CSLCA-2015",
      "US-14CFR-PART-450",
    ],
    notes: [
      "Most recent major amendments: Commercial Space Launch Competitiveness Act 2015, Space Act 2015, NDAAs 2020-2024.",
      "14 CFR Part 450 (adopted 2020) consolidated launch + reentry licensing into a single performance-based regulation.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "US-CSLCA-2015",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en: "Commercial Space Launch Competitiveness Act (SPACE Act of 2015)",
    title_local: "US Commercial Space Launch Competitiveness Act",
    date_enacted: "2015-11-25",
    date_in_force: "2015-11-25",
    official_reference: "Pub. L. 114-90",
    source_url: "https://www.congress.gov/bill/114th-congress/house-bill/2262",
    issuing_body: "United States Congress",
    competent_authorities: ["US-FAA-AST", "US-NASA"],
    relevance_level: "critical",
    applicable_to: ["all", "space_resource_operator"],
    compliance_areas: ["licensing"],
    scope_description:
      "2015 amendment statute (the SPACE Act) modernising CSLA: extends the indemnification regime, codifies the in-space resource-utilisation right (Title IV), opens federal facility access for commercial users, and establishes the FAA learning-period framework. The principal vehicle for current-generation US space-commerce policy.",
    key_provisions: [
      {
        section: "51 USC §51303",
        title: "Space resources — US citizen property rights",
        summary:
          "A US citizen engaged in commercial recovery of an asteroid resource or space resource is entitled to any asteroid resource or space resource obtained — including to possess, own, transport, use, and sell — in accordance with applicable law and international obligations. This is the domestic legal basis for US space-resource operators and is the main point of US non-accession to the 1979 Moon Agreement.",
        complianceImplication:
          "US space-resource operators have domestic legal certainty. Conflict-of-laws exposure remains if operating in jurisdictions that ratified the Moon Agreement. The Artemis Accords (2020) serve as the international-coordination framework.",
      },
      {
        section: "51 USC §50902(10)",
        title: "Expanded definition of launch",
        summary:
          "Incorporates 'reentry' into the CSLA definitional scheme, extends operator liability regime through 2025, and expands FAA jurisdiction over commercial space activities.",
      },
    ],
    related_sources: ["US-CSLA-1984", "US-MOON-NON-PARTY", "US-ARTEMIS-2020"],
    notes: [
      "Also known as the SPACE Act of 2015.",
      "Landmark domestic recognition of space-resource property rights.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "US-LRSPA-1992",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en: "Land Remote Sensing Policy Act",
    title_local: "Land Remote Sensing Policy Act",
    date_enacted: "1992-10-28",
    date_last_amended: "2020-05-20",
    official_reference: "51 USC Ch. 601 (§60101 et seq.)",
    source_url:
      "https://www.law.cornell.edu/uscode/text/51/subtitle-VI/chapter-601",
    issuing_body: "United States Congress",
    competent_authorities: ["US-NOAA-CRSRA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["licensing", "data_security"],
    scope_description:
      "Land Remote Sensing Policy Act establishing NOAA's authority over commercial Earth-observation systems (CRSRA programme). Tiers commercial EO operators by capability and imposes shutter-control, encryption, and data-distribution restrictions on US-flagged constellations.",
    key_provisions: [
      {
        section: "51 USC §60121",
        title: "NOAA remote-sensing licence required",
        summary:
          "US persons operating private Earth remote-sensing space systems require a NOAA licence. 2020 rulemaking established a risk-tiered framework: Tier 1 (unrestricted, for systems whose data is already commercially available internationally), Tier 2 (limited conditions possible), Tier 3 (temporary conditions possible only in extraordinary national security circumstances). Tier 1 covers most modern commercial EO missions.",
        complianceImplication:
          "Operators with sub-metre electro-optical or advanced SAR capabilities may still face Tier 2/3 conditions. NOAA consults DoD and State on national-security implications before issuing conditions.",
      },
    ],
    related_sources: ["US-OST-1967"],
    notes: [
      "15 CFR Part 960 implements.",
      "2020 rulemaking rewrite (85 Fed. Reg. 30791) enabled tiered risk framework.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "US-14CFR-PART-450",
    jurisdiction: "US",
    type: "federal_regulation",
    status: "in_force",
    title_en: "14 CFR Part 450 — Launch and Reentry Licensing Requirements",
    date_enacted: "2020-12-10",
    date_in_force: "2021-03-10",
    official_reference: "14 CFR §§ 450.1-450.245",
    source_url:
      "https://www.ecfr.gov/current/title-14/chapter-III/subchapter-C/part-450",
    issuing_body: "Federal Aviation Administration",
    competent_authorities: ["US-FAA-AST"],
    relevance_level: "critical",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Performance-based, modular FAA regulation governing commercial launch and re-entry licensing — replacing the prescriptive Part 415/431/435 regime. Operators tailor a safety-case to their mission profile rather than checking boxes; the operative document for any current commercial US launch licence.",
    key_provisions: [
      {
        section: "14 CFR 450.101",
        title: "Performance-based safety criteria",
        summary:
          "Single consolidated launch + reentry licence replacing the prior Parts 415, 417, 431, 435. Performance-based public-safety criteria: collective risk (Ec ≤ 1×10⁻⁴), individual risk (Pc ≤ 1×10⁻⁶), aircraft/ship protection. System safety process required; flight hazard analysis, mishap response plan, environmental review per NEPA.",
        complianceImplication:
          "Part 450 launch licences are operator-specific, not mission-specific (with certain limits). Enables reuse of same licence for multiple launches, but rigorous System Safety Program requires significant compliance investment.",
      },
    ],
    related_sources: ["US-CSLA-1984"],
    notes: [
      "Adopted 10 December 2020; effective 10 March 2021 (86 Fed. Reg. 10791).",
      "Major industry feedback drove FAA SpaceX-led updates; ongoing iterative rulemaking.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "US-COMM-ACT-1934",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en: "Communications Act (as applied to satellites)",
    date_enacted: "1934-06-19",
    date_last_amended: "2020-01-01",
    official_reference: "47 USC Ch. 5; 47 CFR Parts 2, 5, 25",
    source_url: "https://www.law.cornell.edu/uscode/text/47/chapter-5",
    issuing_body: "United States Congress",
    competent_authorities: ["US-FCC"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum", "debris_mitigation"],
    scope_description:
      "Foundational US telecommunications statute applied to satellite systems through 47 CFR Parts 25 (satellite services), 87 (aviation), and 101 (terrestrial fixed). FCC's licensing power for satellite spectrum, US market-access for non-US satellites, and the basis for the FCC's 5-year post-mission disposal rule.",
    key_provisions: [
      {
        section: "47 CFR §25.114",
        title: "Orbital debris mitigation plan + 5-year disposal rule",
        summary:
          "Every FCC satellite application must include an orbital debris mitigation plan addressing: collision assessment, post-mission disposal (including de-orbit within 5 years of mission end for low-Earth orbit operators, a 2022 FCC rulemaking reducing the prior 25-year guideline), passivation of stored energy, and end-of-life reliability. Applicable to both US-licensed operators and non-US operators serving the US market.",
        complianceImplication:
          "The FCC 5-year rule applies to applications filed after 29 September 2022 for operations after 2 November 2023. LEO operators with long-lived satellites must design for active deorbit capability.",
      },
      {
        section: "47 CFR §25.137",
        title: "Market-access grant — non-US operators",
        summary:
          "Non-US satellite operators seeking to serve US customers must either obtain FCC US market-access authorization or operate via an FCC-licensed US intermediary. Market-access applications face broadly equivalent technical standards to US licences but have additional 'public interest' review.",
      },
    ],
    related_sources: ["US-OST-1967"],
    notes: [
      "Orbital debris 5-year rule adopted by FCC 29 September 2022 (FCC 22-74).",
      "FCC IB (International Bureau) is the primary satellite-services office.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Export Control (2) ──────────────────────

const EXPORT_CONTROL_US: LegalSource[] = [
  {
    id: "US-ITAR",
    jurisdiction: "US",
    type: "federal_regulation",
    status: "in_force",
    title_en: "International Traffic in Arms Regulations — Category IV & XV",
    date_enacted: "1984-04-01",
    date_last_amended: "2024-01-01",
    official_reference: "22 CFR 120-130; 22 USC 2751 (AECA)",
    source_url: "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M",
    issuing_body: "Department of State",
    competent_authorities: ["US-DDTC"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "State Department / DDTC defence-export-control regime under the Arms Export Control Act. USML Categories IV (launch vehicles, missiles) and XV (spacecraft) capture most space-launch and many spacecraft items; export, re-export, and deemed-export to non-US persons require DDTC authorisation. The dominant cross-border friction for US space hardware.",
    key_provisions: [
      {
        section: "USML Category IV",
        title: "Launch vehicles and missiles",
        summary:
          "Covers launch vehicles, propulsion systems, warheads, and specifically designed missile components. Full ITAR control applies — export requires DDTC licence, technical data transfer requires Technical Assistance Agreement (TAA). Penalties include up to $1M per violation and 20 years imprisonment under the Arms Export Control Act.",
      },
      {
        section: "USML Category XV",
        title: "Spacecraft systems and associated equipment",
        summary:
          "Military, intelligence, and dual-use spacecraft subsystems. 2014 Export Control Reform migrated most commercial communications, imaging, and nav satellites from Category XV to EAR 9E515/9A515 — making them Commerce-controlled (still export-licensable but less restrictive). Category XV retained for defence-specific capabilities (sub-metre resolution, radiation-hardened processors, certain payloads).",
        complianceImplication:
          "Commercial space companies often operate under a hybrid ITAR+EAR posture — launch vehicles and propulsion on ITAR, satellites and subsystems on EAR. Deemed-export rules (disclosing technical data to foreign persons within the US) require Technical Assistance Agreement even without physical export.",
      },
    ],
    related_sources: ["US-OST-1967", "US-EAR"],
    notes: [
      "Arms Export Control Act (AECA) 22 USC 2751 is the enabling statute.",
      "2014 Export Control Reform substantially restructured Category XV.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "US-EAR",
    jurisdiction: "US",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Export Administration Regulations — Category 9 (Aerospace)",
    date_enacted: "1979-09-01",
    date_last_amended: "2024-01-01",
    official_reference: "15 CFR 730-774; 50 USC Ch. 58 (ECRA)",
    source_url:
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C",
    issuing_body: "Department of Commerce",
    competent_authorities: ["US-BIS"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "Commerce Department / BIS dual-use export-control regime governing space items not on the USML. Category 9 (Aerospace) covers commercial spacecraft, components, and technology; Category 5 (Telecom) covers satellite-communications encryption. Defines US extraterritorial reach over re-exports of US-origin content.",
    key_provisions: [
      {
        section: "ECCN 9A515 / 9E515",
        title: "Satellites and related technology",
        summary:
          "Post-2014 Export Control Reform, most commercial spacecraft items sit under EAR ECCN 9A515 (hardware) and 9E515 (technology). Licence requirements depend on destination country group, end-user screening (Entity List), end-use screening (proliferation, military), and applicable Commerce Control List reasons for control (NS, AT, RS, MT). Licence exceptions available for intra-company transfers (STA, TMP) and low-sensitivity items.",
        complianceImplication:
          "Commercial satellite operators need BIS export classification of every component; export to China and Russia is effectively prohibited (Entity List coverage, no-licence-available policy); exports to ally countries typically require licence but are granted.",
      },
    ],
    related_sources: ["US-OST-1967", "US-ITAR"],
    notes: [
      "Export Control Reform Act (ECRA) 2018 is the enabling statute post-2018.",
      "2014 Export Control Reform migrated most commercial spacecraft items from ITAR to EAR.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Policy & Accords (1) ─────────────────

const POLICY_US: LegalSource[] = [
  {
    id: "US-ARTEMIS-2020",
    jurisdiction: "US",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — United States (1st Signatory / Originator)",
    date_enacted: "2020-10-13",
    date_in_force: "2020-10-13",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["US-NASA", "US-DDTC"],
    relevance_level: "critical",
    applicable_to: ["all", "space_resource_operator"],
    compliance_areas: ["licensing"],
    scope_description:
      "United States as originator and first signatory of the Artemis Accords. Articulates the operational principles US partners must accept for participation in NASA-led lunar exploration — peaceful purposes, transparency, registration, scientific data sharing, safety zones, heritage preservation, and resource-extraction rights consistent with OST.",
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources — coordination framework",
        summary:
          "Non-binding principles for peaceful use of outer space and coordination on lunar + asteroid exploration. Section 10 acknowledges that resource extraction can occur consistent with the 1967 Outer Space Treaty — providing international diplomatic backing for the 2015 CSLCA §51303 space-resource-rights framework. Safety zones, scientific data sharing, interoperability, and registration are principal themes.",
        complianceImplication:
          "US operators relying on CSLCA §51303 for space-resource business models operate within the Artemis Accords diplomatic framework. Conflict-of-laws exposure remains for operations in Moon-Agreement states (e.g. joint missions with AU, AT, BE, NL).",
      },
    ],
    related_sources: ["US-CSLCA-2015", "US-MOON-NON-PARTY"],
    notes: [
      "Originated by NASA with 8 founding signatories on 13 October 2020.",
      "As of 2026 the Accords have 50+ signatories including most EU states.",
      "Non-binding but diplomatically significant.",
    ],
    last_verified: "2026-04-20",
  },

  // ─── State-level spaceports and incentives ─────────────────────────
  // Federal CSLA / FAA Part 450 sit alongside state-level regimes that
  // shape where operators actually base. State spaceport authorities,
  // CEQA-equivalent environmental review, and tax/incentive packages
  // are decisive in launch-site selection decisions.

  {
    id: "US-FL-SPACE-FLORIDA",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en: "Florida Statutes Chapter 331 — Space Florida Act",
    date_enacted: "2006-06-15",
    date_last_amended: "2024-07-01",
    official_reference: "Fla. Stat. §§ 331.301 et seq.",
    source_url:
      "http://www.leg.state.fl.us/Statutes/index.cfm?App_mode=Display_Statute&URL=0300-0399/0331/0331.html",
    issuing_body: "Florida Legislature",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["licensing", "environmental"],
    scope_description:
      "Establishes Space Florida as the State's spaceport authority and economic-development entity for the Cape Canaveral / KSC area. Operates the Florida Spaceport Improvement Program (FSIP) capital fund, the Cecil Field Spaceport licence, and the State liability and incentive framework. Effectively operates as the landlord and counterparty for any commercial operator basing in Florida — Federal CSLA + Part 450 sit on top of Space Florida's State-level concession agreements.",
    key_provisions: [
      {
        section: "§ 331.302",
        title: "Space Florida creation and powers",
        summary:
          "Creates Space Florida as an independent special district with the powers of a port authority — issues bonds, holds property, enters into concession agreements, and acts as the State's spaceport licensee under FAA Part 420 / 450.",
      },
      {
        section: "§ 331.367",
        title: "Spaceflight informed-consent regime",
        summary:
          "Florida-specific informed-consent statute limiting liability of launch providers to spaceflight participants — practical analogue of the FAA learning-period framework on the State-tort side.",
      },
    ],
    related_sources: ["US-CSLA-1984", "US-14CFR-PART-450"],
    notes: [
      "Space Florida holds the spaceport-operator licence covering KSC's Launch Complex 39A/B (commercial operations area), Cecil Field, and other in-State sites — operators sign concession agreements with Space Florida as part of their site selection.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "US-TX-SPACEPORT",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Texas Local Government Code Chapter 507 — Spaceport Development Corporations",
    date_enacted: "2013-06-14",
    date_last_amended: "2023-09-01",
    official_reference: "Tex. Local Gov't Code §§ 507.001-.103",
    source_url: "https://statutes.capitol.texas.gov/Docs/LG/htm/LG.507.htm",
    issuing_body: "Texas Legislature",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    scope_description:
      "Authorises Texas counties to create Spaceport Development Corporations to acquire, develop, and operate spaceports and to issue bonds for spaceport infrastructure. The legal vehicle behind the SpaceX Starbase facility at Boca Chica (Cameron County Spaceport Development Corporation) and any future Texas spaceport. Pairs with the State-level liability-limiting provisions of the Texas Spaceflight Liability Act.",
    key_provisions: [
      {
        section: "§ 507.012",
        title: "Spaceport Development Corporation powers",
        summary:
          "Counties may form a Corporation to acquire, develop, operate, and finance spaceport infrastructure; the Corporation can act as the FAA spaceport-operator licensee and as the contractual landlord for tenant launch operators.",
      },
    ],
    related_sources: ["US-CSLA-1984", "US-14CFR-PART-450", "US-TX-SLIA"],
    last_verified: "2026-04-22",
  },

  {
    id: "US-TX-SLIA",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en: "Texas Spaceflight Liability and Immunity Act",
    date_enacted: "2011-06-17",
    date_last_amended: "2021-06-15",
    official_reference: "Tex. Civ. Prac. & Rem. Code §§ 100A.001-.005",
    source_url: "https://statutes.capitol.texas.gov/Docs/CP/htm/CP.100A.htm",
    issuing_body: "Texas Legislature",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["liability"],
    scope_description:
      "State-tort liability shield for launch providers operating from Texas — limits liability to spaceflight participants who sign an informed-consent waiver, with carve-outs for gross negligence and intentional acts. Practical effect: tenant-operator at a Texas spaceport faces a more favourable State-tort environment than at a non-shielded location.",
    key_provisions: [
      {
        section: "§ 100A.002",
        title: "Limitation of liability — informed consent",
        summary:
          "A spaceflight entity is not liable to a participant for injury or death from the inherent risks of spaceflight if the participant signs the statutorily-required warning and consent.",
      },
    ],
    related_sources: ["US-TX-SPACEPORT", "US-FL-SPACE-FLORIDA"],
    last_verified: "2026-04-22",
  },

  {
    id: "US-CA-CEQA-SPACE",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en:
      "California Environmental Quality Act — Application to Space Operations",
    date_enacted: "1970-09-18",
    date_last_amended: "2024-09-01",
    official_reference: "Cal. Pub. Res. Code §§ 21000-21189.70",
    source_url:
      "https://leginfo.legislature.ca.gov/faces/codes_displayexpandedbranch.xhtml?tocCode=PRC&division=13.&title=&part=&chapter=&article=",
    issuing_body: "California Legislature",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["launch_provider", "ground_segment"],
    compliance_areas: ["environmental"],
    scope_description:
      "California's State-level environmental-review statute, broader than NEPA in important respects. Applies to spaceport development, satellite-manufacturing facility expansion, and ground-segment construction in California — most relevant for Vandenberg-area expansions, San Francisco / Bay Area satellite-manufacturer plants, and Mojave Spaceport. Operators routinely under-budget California-CEQA review timelines compared with federal NEPA.",
    key_provisions: [
      {
        section: "§ 21080-21082",
        title: "CEQA applicability",
        summary:
          "Any 'project' as defined in CEQA (which includes most space-infrastructure development) requires either a Categorical Exemption finding, a Negative Declaration, or a full Environmental Impact Report.",
      },
      {
        section: "§ 21167",
        title: "Litigation window",
        summary:
          "Strict (often 30-day) limitation period for legal challenge — but the volume of CEQA litigation against California development projects is high, and a successful challenge can stay project execution.",
      },
    ],
    related_sources: ["US-14CFR-PART-450"],
    notes: [
      "California's 2024 CEQA reforms streamlined some categories of review but did not exempt aerospace; the SpaceX Vandenberg launch-cadence increase has been a recurring CEQA litigation flashpoint.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "US-NM-SPACEPORT",
    jurisdiction: "US",
    type: "federal_law",
    status: "in_force",
    title_en: "New Mexico Spaceport Development Act",
    date_enacted: "2005-04-05",
    date_last_amended: "2010-03-08",
    official_reference: "N.M. Stat. §§ 58-31-1 to 58-31-23",
    source_url: "https://nmonesource.com/nmos/nmsa/en/item/4404/index.do",
    issuing_body: "New Mexico Legislature",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing", "liability"],
    scope_description:
      "Authorising statute for the New Mexico Spaceport Authority (operator of Spaceport America, home base of Virgin Galactic suborbital operations). Provides the legal vehicle for the State to hold the FAA spaceport-operator licence, issue revenue bonds, and limit operator liability to participant claimants under the State's spaceflight informed-consent regime.",
    key_provisions: [
      {
        section: "§ 58-31-9",
        title: "Spaceport Authority powers",
        summary:
          "New Mexico Spaceport Authority is the State entity holding the FAA spaceport-operator licence; enters into tenant agreements with launch operators (Virgin Galactic and others); operates Spaceport America revenue and tax-incentive package.",
      },
    ],
    related_sources: ["US-CSLA-1984", "US-14CFR-PART-450"],
    last_verified: "2026-04-22",
  },
];

// ─── Orbital Debris Rules (2) ─────────────────
// Graphic reference: ClearSpace "Recent developments in the
// regulatory framework", October 2023 — US National Policies
// (FCC 5-year PMD, enacted) and Licensing (FAA NPRM Upper Stages,
// in development).

const DEBRIS_RULES_US: LegalSource[] = [
  {
    id: "US-FCC-5YR-PMD-2022",
    jurisdiction: "US",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "FCC Second Report and Order — Mitigation of Orbital Debris in the New Space Age (5-year post-mission disposal rule)",
    date_enacted: "2022-09-29",
    date_in_force: "2024-09-29",
    official_reference: "FCC 22-74; 47 CFR § 25.114(d)(14)(ii)",
    source_url:
      "https://www.fcc.gov/document/fcc-adopts-new-5-year-rule-deorbiting-satellites",
    issuing_body: "Federal Communications Commission (FCC)",
    competent_authorities: ["US-FCC"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["debris_mitigation", "licensing"],
    scope_description:
      "Landmark 2022 FCC rule reducing the post-mission disposal window from the prior 25-year IADC guideline to 5 years for satellites deployed into orbits below 2000 km. Applies to FCC-licensed space stations and to non-US operators seeking US market access under 47 CFR Part 25. Takes full effect 29 September 2024 for new licence applications.",
    key_provisions: [
      {
        section: "47 CFR § 25.114(d)(14)(ii)",
        title: "5-year LEO post-mission disposal",
        summary:
          "Satellites operating below 2000 km altitude must be de-orbited within 5 years after end of mission — a 20-year reduction from the prior 25-year guideline.",
        complianceImplication:
          "Operators must demonstrate fuel budget, manoeuvring capability, and failure-mode analysis consistent with the 5-year disposal deadline at licence application time.",
      },
      {
        section: "Waiver regime",
        title: "Case-by-case waiver path",
        summary:
          "FCC may grant waivers for missions that demonstrate superior overall debris-mitigation profile (e.g. very low orbits with rapid natural decay).",
      },
    ],
    related_sources: [
      "INT-COPUOS-DEBRIS-2007",
      "INT-LTS-2019",
      "US-FAA-NPRM-UPPER-STAGES-2023",
    ],
    amendments: [
      {
        date: "2024-09-29",
        reference: "47 CFR § 25.114(d)(14)(ii) — effective date",
        summary:
          "Rule takes effect for all new FCC space-station licence applications filed on or after this date.",
      },
    ],
    notes: [
      "First major departure from the 25-year IADC guideline by a G7 regulator. Catalysed similar tightening at UK CAA and in the ESA Zero Debris Standard.",
      "Applies to both US-domiciled operators and non-US operators seeking US market access.",
    ],
    last_verified: "2026-04-21",
  },

  {
    id: "US-FAA-NPRM-UPPER-STAGES-2023",
    jurisdiction: "US",
    type: "draft_legislation",
    status: "proposed",
    title_en:
      "FAA Notice of Proposed Rulemaking — Mitigation of Orbital Debris from Launch Vehicle Upper Stages",
    date_enacted: "2023-09-20",
    date_published: "2023-09-20",
    official_reference:
      "88 FR 64672 (Sept 20, 2023); FAA-2023-1837; RIN 2120-AL77",
    source_url:
      "https://www.federalregister.gov/documents/2023/09/20/2023-20275/mitigation-of-orbital-debris-in-the-new-space-age",
    issuing_body:
      "Federal Aviation Administration (FAA), Office of Commercial Space Transportation (AST)",
    competent_authorities: ["US-FAA-AST"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: [
      "debris_mitigation",
      "licensing",
      "space_traffic_management",
    ],
    scope_description:
      "FAA proposed rulemaking extending debris-mitigation requirements specifically to launch vehicle upper stages — the largest single source of long-lived LEO debris mass. Proposes five compliance pathways: (1) controlled re-entry, (2) direct retrieval, (3) active removal within 5 years, (4) transfer to disposal orbit, (5) controlled atmospheric disposal within 30 years. Comment period closed 21 Nov 2023; final rule pending as of 2026 Q2.",
    key_provisions: [
      {
        section: "§ 450.139(b) proposed",
        title: "Five disposal pathways for upper stages",
        summary:
          "Launch providers must select one of five proposed disposal pathways for each upper stage and demonstrate its viability in the launch licence application.",
      },
      {
        section: "§ 450.139(c) proposed",
        title: "Retrospective coverage",
        summary:
          "Existing active licences must be amended within 24 months to comply with the new upper-stage rules.",
      },
    ],
    related_sources: [
      "US-FCC-5YR-PMD-2022",
      "INT-COPUOS-DEBRIS-2007",
      "INT-LTS-2019",
      "INT-ESA-ZERO-DEBRIS-STD",
    ],
    notes: [
      "Targets the ~50% of tracked debris mass that comes from launch vehicle upper stages — a gap not addressed by the FCC 5-year PMD rule which covers satellites only.",
      "Status as of 2026-04: comment period closed, final rule not yet published; interim guidance issued to licensees via FAA Advisory Circulars.",
    ],
    last_verified: "2026-04-21",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_US: LegalSource[] = [
  ...TREATIES_US,
  ...FEDERAL_LAWS_US,
  ...EXPORT_CONTROL_US,
  ...POLICY_US,
  ...DEBRIS_RULES_US,
];
