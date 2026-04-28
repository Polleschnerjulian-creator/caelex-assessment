// src/data/legal-sources/sources/nz.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * New Zealand space law sources — complete regulatory framework for
 * jurisdiction NZ.
 *
 * Sources: mbie.govt.nz, legislation.govt.nz, space.govt.nz, caa.govt.nz,
 *          minister.govt.nz (Science, Innovation and Technology portfolio)
 * Last verified: 2026-04-21
 *
 * Notable: New Zealand is one of only a handful of small states with a
 * dedicated national space act — the Outer Space and High-altitude
 * Activities Act 2017 (OSHAA). Trigger event: US private launch
 * company Rocket Lab establishing Launch Complex 1 at Mahia (first
 * launch May 2017). NZ is a party to the 1967 Outer Space Treaty
 * (accession 31 May 1968) and the Registration Convention. The 2023
 * ADR/IOS Policy Statement (referenced in the ClearSpace framework
 * graphic) sets out NZ's position on authorising active debris
 * removal and in-orbit servicing missions — the first Southern-
 * Hemisphere ADR/IOS policy framework.
 *
 * Licensing regime: OSHAA 2017 + OSHAA (Authorisation) Regulations
 * 2017 require Payload Permits, Launch Licences, Overseas Launch
 * Licences, Facility Licences, and Return Licences, all issued by
 * MBIE's New Zealand Space Agency on advice from the MBIE Secretary.
 * The Act has extraterritorial reach — any launch by a NZ national
 * or from NZ territory triggers the regime.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── NZ Authorities (5) ───────────────────────────────────────────

export const AUTHORITIES_NZ: Authority[] = [
  {
    id: "NZ-MBIE-NZSA",
    jurisdiction: "NZ",
    name_en:
      "New Zealand Space Agency (within Ministry of Business, Innovation and Employment)",
    name_local: "New Zealand Space Agency",
    abbreviation: "NZSA",
    parent_ministry: "Ministry of Business, Innovation and Employment (MBIE)",
    website: "https://www.mbie.govt.nz/business-and-employment/space",
    contact_email: "spaceagency@mbie.govt.nz",
    space_mandate:
      "Primary regulator for all New Zealand space activities under OSHAA 2017. Issues Payload Permits, Launch Licences, Overseas Launch Licences, Facility Licences, and Return Licences. Operates the NZ registry of space objects, coordinates COPUOS representation, and administers ADR/IOS authorisations under the 2023 Policy Statement. The NZSA was established in 2016 specifically to support Rocket Lab's Mahia operations and has since expanded to cover all NZ space regulatory activity.",
    legal_basis:
      "Outer Space and High-altitude Activities Act 2017; MBIE administrative delegation",
    applicable_areas: [
      "licensing",
      "registration",
      "liability",
      "debris_mitigation",
      "space_traffic_management",
    ],
  },
  {
    id: "NZ-CAA",
    jurisdiction: "NZ",
    name_en: "Civil Aviation Authority of New Zealand",
    name_local: "Civil Aviation Authority of New Zealand",
    abbreviation: "CAA-NZ",
    website: "https://www.aviation.govt.nz",
    space_mandate:
      "Co-regulator for the high-altitude-activity portion of OSHAA 2017 (balloons, sub-orbital vehicles, stratospheric platforms) and for the airspace integration of orbital launches from NZ territory. Consulted on any launch licence with NZ territorial airspace impact. Also operates civil aviation safety oversight over spaceports.",
    legal_basis: "Civil Aviation Act 1990; OSHAA 2017 (high-altitude portion)",
    applicable_areas: ["licensing", "space_traffic_management"],
  },
  {
    id: "NZ-MFAT",
    jurisdiction: "NZ",
    name_en: "Ministry of Foreign Affairs and Trade",
    name_local: "Manatū Aorere",
    abbreviation: "MFAT",
    website: "https://www.mfat.govt.nz",
    space_mandate:
      "International treaty obligations, UNOOSA registration submissions, and bilateral space-cooperation arrangements (notably the 2016 NZ-US Technology Safeguards Agreement covering Rocket Lab operations). Responsible for NZ's COPUOS representation and national UN space-registry notifications under the 1975 Registration Convention.",
    applicable_areas: ["licensing", "liability", "export_control"],
  },
  {
    id: "NZ-MFAT-EXPORT",
    jurisdiction: "NZ",
    name_en: "MFAT Export Controls Office",
    name_local: "MFAT Export Controls Office",
    abbreviation: "MFAT-EC",
    parent_ministry: "Ministry of Foreign Affairs and Trade",
    website: "https://www.mfat.govt.nz/en/trade/export-controls/",
    space_mandate:
      "Export control authority for dual-use space technology and strategic goods. NZ is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group. Administers strategic-goods export permits under the Customs and Excise Act 2018 (Prohibited Exports Regulations). Coordinates with US ITAR/EAR via the 2016 Technology Safeguards Agreement.",
    legal_basis:
      "Customs and Excise Act 2018; Customs Export Prohibition Order 2017",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "NZ-CERT-NZ",
    jurisdiction: "NZ",
    name_en: "Computer Emergency Response Team NZ",
    name_local: "CERT NZ",
    abbreviation: "CERT NZ",
    website: "https://www.cert.govt.nz",
    space_mandate:
      "National cybersecurity incident response and coordinator for the space-sector cybersecurity programme. While NZ has no NIS2-equivalent space-sector cybersecurity mandate, CERT NZ maintains sector-specific guidance for space operators operating from NZ territory or using NZ ground infrastructure.",
    applicable_areas: ["cybersecurity"],
  },
];

// ─── International Treaties (NZ-specific entries, 4) ────────────────

const TREATIES_NZ: LegalSource[] = [
  {
    id: "NZ-OST-1968",
    jurisdiction: "NZ",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — New Zealand Accession",
    date_enacted: "1968-05-31",
    date_in_force: "1968-05-31",
    un_reference:
      "UN depositary notification; NZ party status via UN treaty series",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["NZ-MFAT", "NZ-MBIE-NZSA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — implemented via OSHAA 2017",
        summary:
          "NZ bears international responsibility for national space activities. Domestic implementation is via the Outer Space and High-altitude Activities Act 2017, administered by MBIE's New Zealand Space Agency. Any launch from NZ territory, or by an NZ national from abroad, triggers the OSHAA licensing regime.",
        complianceImplication:
          "Before any NZ-origin launch or NZ-national-operated mission, the operator must hold the relevant OSHAA permit(s): Payload Permit, Launch Licence, Overseas Launch Licence, or Return Licence as applicable.",
      },
      {
        section: "Art. VIII",
        title: "Jurisdiction and control — NZ registry",
        summary:
          "NZ retains jurisdiction over space objects on its national registry. The registry is maintained by the NZ Space Agency and submitted to UNOOSA via MFAT.",
      },
    ],
    related_sources: [
      "NZ-LIABILITY-1974",
      "NZ-REGISTRATION-1978",
      "NZ-OSHAA-2017",
    ],
    notes: [
      "NZ ratified 31 May 1968.",
      "Implementing domestic statute: OSHAA 2017.",
    ],
    last_verified: "2026-04-21",
  },
  {
    id: "NZ-RESCUE-1969",
    jurisdiction: "NZ",
    type: "international_treaty",
    status: "in_force",
    title_en: "Rescue Agreement — New Zealand Accession",
    date_enacted: "1969-03-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introrescueagreement.html",
    issuing_body: "United Nations",
    competent_authorities: ["NZ-MFAT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["liability"],
    key_provisions: [
      {
        section: "Art. 2",
        title: "Assistance to astronauts",
        summary:
          "NZ is bound to assist astronauts in distress within its territory or in areas beyond national jurisdiction under NZ control. Coordination through MFAT with search-and-rescue agencies.",
      },
    ],
    related_sources: ["NZ-OST-1968"],
    notes: [],
    last_verified: "2026-04-21",
  },
  {
    id: "NZ-LIABILITY-1974",
    jurisdiction: "NZ",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — New Zealand Ratification",
    date_enacted: "1974-03-30",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["NZ-MFAT", "NZ-MBIE-NZSA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability on surface / aircraft in flight",
        summary:
          "NZ is absolutely liable to other states for damage caused on the Earth's surface or to aircraft in flight by NZ space objects. Domestic implementation includes indemnity provisions under OSHAA 2017 s. 15, with recourse against the operator subject to insurance requirements set in each individual licence.",
      },
      {
        section: "Art. III",
        title: "Fault-based liability in space",
        summary:
          "For damage occurring elsewhere than the Earth's surface, liability is fault-based. NZ operators must demonstrate adequate space-traffic-management practice (conjunction screening, manoeuvre capability) at licensing stage.",
      },
    ],
    related_sources: ["NZ-OST-1968", "NZ-OSHAA-2017"],
    notes: [
      "OSHAA 2017 gives MBIE recourse power against launch operators when NZ pays out under the Convention.",
    ],
    last_verified: "2026-04-21",
  },
  {
    id: "NZ-REGISTRATION-1978",
    jurisdiction: "NZ",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — New Zealand Accession",
    date_enacted: "1978-02-02",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["NZ-MFAT", "NZ-MBIE-NZSA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "NZ national registry — MBIE NZSA",
        summary:
          "Every space object launched from NZ territory or by an NZ national is entered on the NZ registry of space objects maintained by MBIE's New Zealand Space Agency and transmitted to UNOOSA via MFAT. Registration is a precondition of OSHAA licensing.",
      },
    ],
    related_sources: ["NZ-OST-1968", "NZ-OSHAA-2017"],
    notes: [],
    last_verified: "2026-04-21",
  },
];

// ─── Primary National Legislation (1) ──────────────────────────────

const PRIMARY_LEGISLATION_NZ: LegalSource[] = [
  {
    id: "NZ-OSHAA-2017",
    jurisdiction: "NZ",
    type: "federal_law",
    status: "in_force",
    title_en: "Outer Space and High-altitude Activities Act 2017 (OSHAA)",
    title_local: "Outer Space and High-altitude Activities Act 2017",
    date_enacted: "2017-07-10",
    date_in_force: "2017-12-21",
    official_reference: "Public Act 2017 No. 29",
    source_url:
      "https://www.legislation.govt.nz/act/public/2017/0029/latest/whole.html",
    issuing_body: "New Zealand Parliament",
    competent_authorities: ["NZ-MBIE-NZSA", "NZ-CAA"],
    relevance_level: "fundamental",
    applicable_to: [
      "all",
      "satellite_operator",
      "launch_provider",
      "in_orbit_services",
      "constellation_operator",
    ],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
      "space_traffic_management",
      "military_dual_use",
    ],
    scope_description:
      "The dedicated NZ national space act, covering both orbital (outer-space) and sub-orbital (high-altitude) activities. Created five licence categories — Payload Permit, Launch Licence, Overseas Launch Licence, Facility Licence, Return Licence — and gives MBIE's NZ Space Agency the authorising role. Has extraterritorial reach: any NZ national launching from overseas, or any launch from NZ territory, triggers the regime. Accompanied by the OSHAA (Authorisation) Regulations 2017 which flesh out documentation requirements.",
    key_provisions: [
      {
        section: "Part 2 (ss. 7–24)",
        title: "Authorisations regime",
        summary:
          "Creates the five OSHAA authorisations. Each requires operator fitness assessment, risk/safety analysis, orbital debris mitigation plan, insurance/indemnity, and national-interest review. The Minister may impose mission-specific conditions including TT&C, encryption, or end-of-life disposal requirements.",
        complianceImplication:
          "Every NZ launch must secure (i) a Payload Permit for each payload, (ii) a Launch Licence for the launch event from NZ territory, and (iii) a Facility Licence for the spaceport. Overseas operations by NZ nationals require an Overseas Launch Licence.",
      },
      {
        section: "s. 15 — Liability and indemnity",
        title: "Crown indemnity with recourse against operators",
        summary:
          "NZ Crown pays international Liability Convention claims but has recourse against the authorised operator up to the insurance ceiling defined in the relevant licence. Insurance thresholds are typically NZD 100M for orbital launches but are set case-by-case.",
      },
      {
        section: "s. 30 — National interest grounds",
        title: "National-security refusal power",
        summary:
          "The Minister may refuse any authorisation on national-interest grounds — explicitly including space-debris generation risk, foreign-state linkage, and dual-use technology exposure. Used in conjunction with the 2016 NZ-US Technology Safeguards Agreement for ITAR-implicated missions.",
      },
      {
        section: "s. 54 — High-altitude activities",
        title: "High-altitude authorisation regime",
        summary:
          "Separate authorisation track for stratospheric platforms, sub-orbital vehicles, and high-altitude balloons. Co-regulated with CAA for airspace integration.",
      },
    ],
    related_sources: [
      "NZ-OST-1968",
      "NZ-LIABILITY-1974",
      "NZ-REGISTRATION-1978",
      "NZ-TSA-2016",
      "NZ-OSHAA-REGS-2017",
      "NZ-ADR-IOS-POLICY-2023",
    ],
    amendments: [
      {
        date: "2020-07-01",
        reference: "OSHAA Amendment 2020",
        summary:
          "Streamlined Payload Permit procedure for repeat operators of the same satellite platform family; introduced fast-track path for constellation batches.",
      },
    ],
    notes: [
      "Trigger event for OSHAA: Rocket Lab's planned commercial launches from Mahia, Launch Complex 1 (first orbital attempt \"It's a Test\" 25 May 2017).",
      "First Southern-Hemisphere dedicated national space act.",
      "Complemented by the OSHAA (Authorisation) Regulations 2017 which define documentation requirements.",
    ],
    last_verified: "2026-04-21",
  },
];

// ─── Secondary Legislation (1) ─────────────────────────────────────

const SECONDARY_LEGISLATION_NZ: LegalSource[] = [
  {
    id: "NZ-OSHAA-REGS-2017",
    jurisdiction: "NZ",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Outer Space and High-altitude Activities (Authorisations) Regulations 2017",
    date_enacted: "2017-11-20",
    date_in_force: "2017-12-21",
    official_reference: "LI 2017/295",
    source_url:
      "https://www.legislation.govt.nz/regulation/public/2017/0295/latest/whole.html",
    issuing_body: "Governor-General in Council / MBIE",
    competent_authorities: ["NZ-MBIE-NZSA"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "in_orbit_services",
    ],
    compliance_areas: ["licensing", "registration", "debris_mitigation"],
    scope_description:
      "Implementing regulations under OSHAA 2017 s. 112. Specifies the documentation, fees, and procedural steps for each of the five OSHAA authorisations. Defines the mission-risk-assessment methodology, orbital debris mitigation plan contents, and the format of the NZ space objects registry.",
    key_provisions: [
      {
        section: "Reg. 9",
        title: "Payload Permit documentation",
        summary:
          "Applicant must supply payload technical specification, orbital parameters, communications spectrum use, end-of-life disposal plan, and ITU coordination status.",
      },
      {
        section: "Reg. 14",
        title: "Launch Licence risk analysis",
        summary:
          "Applicant submits failure-mode and effects analysis, abort trajectories, casualty-risk computation (target ≤ 1 × 10⁻⁴), and range safety coordination with NZDF where applicable.",
      },
      {
        section: "Reg. 22",
        title: "Debris mitigation plan",
        summary:
          "Every authorisation must be accompanied by a debris mitigation plan aligned with COPUOS Guidelines (2007) and LTS-21 (2019). Post-mission disposal commitments are licence-binding.",
      },
    ],
    related_sources: [
      "NZ-OSHAA-2017",
      "INT-COPUOS-DEBRIS-2007",
      "INT-LTS-2019",
    ],
    notes: [],
    last_verified: "2026-04-21",
  },
];

// ─── ADR / IOS Policy (1) — ClearSpace-graphic anchor ──────────────

const POLICY_NZ: LegalSource[] = [
  {
    id: "NZ-ADR-IOS-POLICY-2023",
    jurisdiction: "NZ",
    type: "policy_document",
    status: "in_force",
    title_en:
      "New Zealand Space Agency Policy Statement on Active Debris Removal (ADR) and In-Orbit Servicing (IOS)",
    date_enacted: "2023-07-01",
    date_in_force: "2023-07-01",
    source_url:
      "https://www.mbie.govt.nz/business-and-employment/space/active-debris-removal-and-in-orbit-servicing",
    issuing_body: "New Zealand Space Agency (NZSA) — MBIE",
    competent_authorities: ["NZ-MBIE-NZSA", "NZ-MFAT"],
    relevance_level: "high",
    applicable_to: [
      "in_orbit_services",
      "satellite_operator",
      "launch_provider",
    ],
    compliance_areas: [
      "debris_mitigation",
      "space_traffic_management",
      "licensing",
      "liability",
    ],
    scope_description:
      "NZ government policy setting out the criteria under which MBIE will authorise ADR and IOS missions under OSHAA 2017. Establishes NZ as a permissive but guardrailed jurisdiction for active-debris-removal missions, specifying client-consent requirements, safety-margin expectations, end-of-life strategy for the servicer itself, and cross-recognition with other national ADR/IOS regimes. Referenced by ClearSpace as the first explicit Southern-Hemisphere ADR/IOS authorisation framework.",
    key_provisions: [
      {
        section: "Principle 1",
        title: "Client-consent requirement for any non-cooperative rendezvous",
        summary:
          "Any ADR or IOS mission targeting a client that is not under the servicer operator's ownership requires documented consent from the client's licensing state. Non-cooperative debris capture requires prior COPUOS-level notification.",
      },
      {
        section: "Principle 3",
        title: "Safety-margin thresholds",
        summary:
          "Rendezvous operations must respect specified stand-off distances during each mission phase. Abort trajectories must not worsen the debris environment under any single failure mode.",
      },
      {
        section: "Principle 5",
        title: "End-of-life responsibility for servicer spacecraft",
        summary:
          "The servicer itself must have a credible post-mission disposal plan meeting OSHAA 2017 standards — ADR operators cannot themselves become the next-generation debris source.",
      },
      {
        section: "Principle 7",
        title: "Cross-recognition with allied regimes",
        summary:
          "NZSA will consider approvals under the US FAA Part 450, UK CAA, and ESA Clean Space regimes in its authorisation assessment, reducing duplication for operators with multi-jurisdictional licences.",
      },
    ],
    related_sources: [
      "NZ-OSHAA-2017",
      "NZ-OSHAA-REGS-2017",
      "INT-ISO-24330-2022",
      "INT-AIAA-IOS-STDS",
      "INT-ESA-ZERO-DEBRIS-CHARTER",
      "INT-ESA-ZERO-DEBRIS-STD",
      "INT-LTS-2019",
    ],
    notes: [
      'Referenced in the ClearSpace "Recent developments in the regulatory framework" graphic (Oct 2023) as the anchor NZ contribution to the global ADR/IOS regulatory discussion.',
      "NZ's permissive stance is calibrated by case-by-case national-interest review under OSHAA s. 30.",
    ],
    last_verified: "2026-04-21",
  },
];

// ─── Bilateral Arrangements (1) — Technology Safeguards Agreement ──

const BILATERAL_NZ: LegalSource[] = [
  {
    id: "NZ-TSA-2016",
    jurisdiction: "NZ",
    type: "international_treaty",
    status: "in_force",
    title_en: "New Zealand–United States Technology Safeguards Agreement (TSA)",
    date_enacted: "2016-06-03",
    date_in_force: "2016-06-03",
    source_url:
      "https://www.mbie.govt.nz/business-and-employment/space/technology-safeguards-agreement",
    issuing_body:
      "Government of New Zealand — US Department of State bilateral arrangement",
    competent_authorities: ["NZ-MFAT", "NZ-MBIE-NZSA", "NZ-MFAT-EXPORT"],
    relevance_level: "critical",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["export_control", "military_dual_use", "licensing"],
    scope_description:
      "Bilateral arrangement between NZ and the US governing the handling of US ITAR-controlled space technology on NZ soil. Signed 3 June 2016 to support Rocket Lab's Electron launch vehicle operations (Rocket Lab is US-domiciled but launches from NZ). Establishes facility access controls, personnel clearance procedures, and incident-reporting requirements that allow US ITAR data to be handled at Mahia's Launch Complex 1 without constituting a US export under ITAR § 120.17.",
    key_provisions: [
      {
        section: "Art. 3",
        title: "Facility access controls",
        summary:
          "Restricted-access zones at Launch Complex 1 and Auckland Rocket Lab facilities, with NZ/US co-administered clearance lists.",
      },
      {
        section: "Art. 7",
        title: "Incident reporting",
        summary:
          "Any potential ITAR compromise is jointly investigated by NZ MFAT-EC and US State DDTC with 72-hour notification.",
      },
    ],
    related_sources: ["NZ-OSHAA-2017"],
    notes: [
      "Signed between Prime Minister Key and Secretary of State Kerry on 3 June 2016.",
      "Without this arrangement, Rocket Lab's NZ operations would have been blocked under US ITAR.",
    ],
    last_verified: "2026-04-21",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_NZ: LegalSource[] = [
  ...TREATIES_NZ,
  ...PRIMARY_LEGISLATION_NZ,
  ...SECONDARY_LEGISLATION_NZ,
  ...POLICY_NZ,
  ...BILATERAL_NZ,
];
