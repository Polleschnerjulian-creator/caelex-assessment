// src/data/legal-sources/sources/intl.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * International treaties and conventions — canonical single source.
 *
 * Previously these instruments were duplicated across every country file
 * (19x). This file holds them once with `applies_to_jurisdictions` listing
 * every Party/Member State. Country pages read from here via filter.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── International jurisdictions have no single competent authority,
//     but UNOOSA and ITU are the key administrators ───────────────────

export const AUTHORITIES_INT: Authority[] = [
  {
    id: "INT-UNOOSA",
    jurisdiction: "INT",
    name_en: "United Nations Office for Outer Space Affairs",
    name_local: "United Nations Office for Outer Space Affairs",
    abbreviation: "UNOOSA",
    website: "https://www.unoosa.org",
    space_mandate:
      "Promotes international cooperation in the peaceful uses of outer space. Administers the UN Register of Objects Launched into Outer Space (Registration Convention Art. III). Secretariat of the UN Committee on the Peaceful Uses of Outer Space (COPUOS).",
    legal_basis: "UN General Assembly Resolution 1348 (XIII)",
    applicable_areas: ["registration", "liability"],
  },
  {
    id: "INT-ITU",
    jurisdiction: "INT",
    name_en: "International Telecommunication Union",
    name_local: "International Telecommunication Union",
    abbreviation: "ITU",
    website: "https://www.itu.int",
    space_mandate:
      "UN specialized agency for information and communication technologies. Maintains the Master International Frequency Register (MIFR). Administers the Radio Regulations including Article 22 EPFD limits and Resolution 35 NGSO deployment milestones.",
    legal_basis: "ITU Constitution and Convention",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "INT-COPUOS",
    jurisdiction: "INT",
    name_en: "Committee on the Peaceful Uses of Outer Space",
    name_local: "Committee on the Peaceful Uses of Outer Space",
    abbreviation: "COPUOS",
    website: "https://www.unoosa.org/oosa/en/ourwork/copuos/index.html",
    space_mandate:
      "UN body governing international cooperation in the peaceful uses of outer space. Develops guidelines on space debris mitigation and long-term sustainability. Forum for negotiating the five UN space treaties.",
    legal_basis: "UN General Assembly Resolution 1472 (XIV)",
    applicable_areas: ["debris_mitigation", "space_traffic_management"],
  },
];

// ─── International Treaties (7) — applies_to_jurisdictions lists Parties ─

export const LEGAL_SOURCES_INT: LegalSource[] = [
  {
    id: "INT-OST-1967",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies",
    date_enacted: "1967-01-27",
    date_in_force: "1967-10-10",
    un_reference: "Resolution 2222 (XXI)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. I",
        title: "Freedom of exploration and use",
        summary:
          "Outer space shall be free for exploration and use by all States on a basis of equality and in accordance with international law.",
      },
      {
        section: "Art. II",
        title: "Non-appropriation principle",
        summary:
          "Outer space and celestial bodies are not subject to national appropriation by claim of sovereignty, use, occupation, or any other means.",
      },
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "States bear international responsibility for national space activities including by non-governmental entities. Activities of non-governmental entities require authorization and continuing supervision by the appropriate State.",
        complianceImplication:
          "This is the legal foundation for ALL national licensing regimes. Every German space operator must be authorized because Germany bears responsibility under Art. VI for their activities.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "A State that launches or procures the launch of an object into outer space, and a State from whose territory or facility an object is launched, is internationally liable for damage to another State or its natural or juridical persons.",
        complianceImplication:
          "Germany is liable as 'launching State' for damage caused by objects launched from its territory or by its nationals. This drives insurance and liability requirements.",
      },
      {
        section: "Art. VIII",
        title: "Registration and jurisdiction",
        summary:
          "A State Party on whose registry an object launched into outer space is carried shall retain jurisdiction and control over such object and over any personnel thereof.",
        complianceImplication:
          "Registration determines which State has jurisdiction. German-registered satellites are under German jurisdiction regardless of their orbital position.",
      },
      {
        section: "Art. IX",
        title: "Consultation and contamination avoidance",
        summary:
          "States shall conduct exploration so as to avoid harmful contamination and adverse changes in the environment of Earth. Consultation required if activities would cause potentially harmful interference.",
        complianceImplication:
          "Legal basis for debris mitigation and environmental requirements.",
      },
    ],
    related_sources: [
      "INT-LIABILITY-1972",
      "INT-REGISTRATION-1975",
      "INT-RESCUE-1968",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-RESCUE-1968",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    signed_by_jurisdictions: ["LU"],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space",
    date_enacted: "1968-04-22",
    date_in_force: "1968-12-03",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/rescueagreement.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "Rescue and return of astronauts",
        summary:
          "Contracting parties shall notify, rescue, and return astronauts who land in their territory, and assist astronauts in distress.",
      },
      {
        section: "Art. 5",
        title: "Return of space objects",
        summary:
          "Space objects found beyond the territory of the launching authority shall, upon request, be returned to the launching authority.",
        complianceImplication:
          "Relevant for mission planning and end-of-life procedures — operators should plan for controlled re-entry to avoid triggering return obligations.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-LIABILITY-1972",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Convention on International Liability for Damage Caused by Space Objects",
    date_enacted: "1972-03-29",
    date_in_force: "1972-09-01",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: [],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "A launching State shall be absolutely liable to pay compensation for damage caused by its space object on the surface of the Earth or to aircraft in flight.",
        complianceImplication:
          "Launching States face strict (no-fault) liability for ground damage. This drives mandatory insurance requirements in national space laws — operators must carry coverage because the State is ultimately liable.",
      },
      {
        section: "Art. III",
        title: "Fault-based liability in space",
        summary:
          "Damage caused in outer space to a space object of another State is compensated only if the damage is due to fault of the launching State or its agents.",
        complianceImplication:
          "In-orbit collisions require proof of fault. This is less burdensome than surface liability but still drives collision avoidance obligations.",
      },
      {
        section: "Art. V",
        title: "Joint and several liability for joint launches",
        summary:
          "Where two or more States jointly launch a space object, they shall be jointly and severally liable for any damage caused.",
        complianceImplication:
          "Shared launches (e.g., rideshare missions) create joint liability exposure. Each participating State can be held liable for the full damage amount.",
      },
    ],
    related_sources: ["INT-OST-1967", "DE-SATDSIG-2007"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-REGISTRATION-1975",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Convention on Registration of Objects Launched into Outer Space",
    date_enacted: "1975-01-14",
    date_in_force: "1976-09-15",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/registration-convention.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: [],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Each launching State shall maintain a registry of space objects launched into Earth orbit or beyond and shall inform the UN Secretary-General of the establishment of such a registry.",
        complianceImplication:
          "Germany must maintain a national space object registry. Currently managed informally via DLR; a formal registry is planned under EU Space Act and the future Weltraumgesetz.",
      },
      {
        section: "Art. IV",
        title: "Registration data requirements",
        summary:
          "Each State must furnish to the UN: name of launching State(s), designator/registration number, date and territory of launch, basic orbital parameters, general function of the space object.",
        complianceImplication:
          "Operators must provide launch and orbit data to enable registration.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-MOON-1979",
    applies_to_jurisdictions: ["AT", "BE", "NL"],
    signed_by_jurisdictions: ["FR"],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "not_ratified",
    title_en:
      "Agreement Governing the Activities of States on the Moon and Other Celestial Bodies",
    date_enacted: "1979-12-18",
    date_in_force: "1984-07-11",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/moon-agreement.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["space_resource_operator"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 11",
        title: "Common heritage of mankind",
        summary:
          "The Moon and its natural resources are the common heritage of mankind. An international regime shall govern exploitation of resources.",
      },
    ],
    scope_description:
      "NOT ratified by Germany (nor by any major spacefaring nation except Austria within DACH). Included for completeness — the common heritage principle is contextually relevant for space resource operators but creates no binding obligations for German entities.",
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-PTBT-1963",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "SE",
      "CH",
      "UK",
    ],
    signed_by_jurisdictions: ["PT"],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Treaty Banning Nuclear Weapon Tests in the Atmosphere, in Outer Space and Under Water",
    date_enacted: "1963-08-05",
    date_in_force: "1963-10-10",
    source_url:
      "https://www.state.gov/treaty-banning-nuclear-weapon-tests-in-the-atmosphere-in-outer-space-and-under-water/",
    issuing_body: "Trilateral (USA, USSR, UK) — open for accession",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Art. I",
        title: "Nuclear test ban in outer space",
        summary:
          "Parties undertake to prohibit, prevent, and not carry out any nuclear weapon test explosion in outer space.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-ITU-CONST",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Constitution and Convention of the International Telecommunication Union",
    date_enacted: "1992-12-22",
    date_last_amended: "2022-10-07",
    source_url: "https://www.itu.int/hub/publication/S-CONV-ITUCONST-2023/",
    issuing_body: "International Telecommunication Union",
    competent_authorities: [],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Art. 44",
        title: "Use of the radio-frequency spectrum and satellite orbits",
        summary:
          "Member States shall endeavour to limit the number of frequencies and spectrum used to the minimum essential. Radio frequencies and associated orbits are limited natural resources that must be used rationally, efficiently, and economically.",
        complianceImplication:
          "Legal basis for all frequency coordination obligations. Every satellite operator must file through their national administration (BNetzA for Germany) before using any radio frequency.",
      },
      {
        section: "Radio Regulations",
        title: "ITU Radio Regulations (binding treaty-level instrument)",
        summary:
          "The Radio Regulations govern the allocation, allotment, and assignment of radio frequencies and satellite orbits worldwide. Procedures for advance publication (API), coordination (CR/C), notification, and recording.",
        complianceImplication:
          "The ITU filing process (API → Coordination → Notification → Recording) is mandatory for all satellite systems. Non-compliance risks harmful interference claims and loss of frequency rights.",
      },
    ],
    related_sources: ["DE-TKG-2021"],
    amendments: [
      {
        date: "2022-10-07",
        reference:
          "Plenipotentiary Conference 2022 (PP-22), Bucharest — Final Acts",
        summary:
          "Revisions to the ITU Constitution and Convention adopted at PP-22 (Bucharest, 2022). Updates governance provisions and refines the ITU mandate; consolidated text published 2023.",
        source_url: "https://www.itu.int/hub/publication/S-CONF-PLENI-2022/",
      },
      {
        date: "2018-11-16",
        reference:
          "Plenipotentiary Conference 2018 (PP-18), Dubai — Final Acts",
        summary:
          "Amendments adopted at PP-18 (Dubai, 2018), including cybersecurity-related mandate adjustments.",
        source_url: "https://www.itu.int/hub/publication/S-CONF-PLENI-2018/",
      },
    ],
    last_verified: "2026-04-13",
  },

  // ─── Principles & Guidelines (non-binding but universally cited) ───

  {
    id: "INT-COPUOS-DEBRIS-2007",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Space Debris Mitigation Guidelines of the Committee on the Peaceful Uses of Outer Space",
    date_enacted: "2007-06-07",
    date_in_force: "2007-06-07",
    un_reference: "GA Resolution 62/217 (22 Dec 2007, endorsement)",
    source_url: "https://www.unoosa.org/pdf/publications/st_space_49E.pdf",
    issuing_body: "UN Committee on the Peaceful Uses of Outer Space (COPUOS)",
    competent_authorities: ["INT-COPUOS"],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "Seven non-binding guidelines forming the international baseline for debris mitigation. Endorsed by the UN General Assembly (Res. 62/217) and referenced by virtually every national space law debris regime (FR LOS, IT Law 89/2025, UK SIA 2018, FAA 14 CFR Part 450, ESA policy).",
    key_provisions: [
      {
        section: "Guideline 1",
        title: "Limit debris released during normal operations",
        summary:
          "Space systems should be designed not to release debris during normal operations. Where this is not feasible, the effect on the orbital environment should be minimised.",
      },
      {
        section: "Guideline 2",
        title: "Minimise break-ups during operational phases",
        summary:
          "Design and operation should minimise the potential for accidental explosion or break-up during operational phases.",
      },
      {
        section: "Guideline 3",
        title: "Limit probability of accidental collision in orbit",
        summary:
          "Orbit selection, avoidance manoeuvres, and coordination should reduce collision probability. Operators should take active measures to avoid known space objects.",
      },
      {
        section: "Guideline 4",
        title: "Avoid intentional destruction and harmful activities",
        summary:
          "Intentional destruction that generates long-lived debris should be avoided. This guideline frames international reaction to ASAT tests.",
      },
      {
        section: "Guideline 5",
        title: "Minimise post-mission break-ups from stored energy",
        summary:
          "Passivation: depletion of residual propellant and batteries at end-of-mission to prevent explosive break-up.",
      },
      {
        section: "Guideline 6",
        title: "Limit LEO long-term presence",
        summary:
          "Post-mission disposal from LEO within 25 years (the '25-year rule'), via re-entry or transfer to a disposal orbit. Increasingly superseded by 5-year rules (FCC 2022) and reinforced by IADC 2025 update.",
      },
      {
        section: "Guideline 7",
        title: "Limit GEO long-term presence",
        summary:
          "Post-mission disposal from GEO via transfer to a graveyard orbit at least 235 km + (1000 × CR × A/m) above GEO.",
      },
    ],
    related_sources: ["INT-LTS-2019", "INT-OST-1967"],
    notes: [
      "Voluntary, non-binding. Implementation is through domestic policies, laws, and regulations.",
      "The 25-year rule (Guideline 6) is being superseded by stricter 5-year post-mission disposal requirements (FCC 2022, UK CAA policy).",
    ],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-LTS-2019",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Guidelines for the Long-term Sustainability of Outer Space Activities",
    date_enacted: "2019-06-21",
    date_in_force: "2019-06-21",
    un_reference:
      "GA Resolution 74/20 (Dec 2019, endorsement); A/74/20 Annex II",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/topics/long-term-sustainability-of-outer-space-activities.html",
    issuing_body: "UN Committee on the Peaceful Uses of Outer Space (COPUOS)",
    competent_authorities: ["INT-COPUOS"],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider", "ground_segment"],
    compliance_areas: [
      "debris_mitigation",
      "space_traffic_management",
      "cybersecurity",
    ],
    scope_description:
      "21 non-binding guidelines (LTS-21) covering policy and regulatory framework (A), safety of operations (B), international cooperation (C), and scientific/technical research (D). The modern framework for responsible space operations; referenced by CAA UK, BNetzA, FCC, and the EU Space Act proposal.",
    key_provisions: [
      {
        section: "A.1",
        title: "Policy and regulatory framework for space activities",
        summary:
          "States should adopt, revise, and amend national regulatory frameworks to address the long-term sustainability of outer space activities.",
      },
      {
        section: "B.2",
        title: "Consider numerous factors in spacecraft design",
        summary:
          "Operators should consider collision-avoidance, debris mitigation, and conjunction assessment throughout the mission lifecycle.",
      },
      {
        section: "B.4",
        title: "Take all reasonable measures to maintain orbital safety",
        summary:
          "Share orbital data, participate in conjunction assessment, and coordinate pre-launch and end-of-life activities.",
      },
      {
        section: "B.7",
        title: "Investigate new measures to manage debris population",
        summary:
          "Active debris removal and end-of-life spacecraft management technologies should be investigated and implemented where feasible.",
      },
      {
        section: "B.9",
        title: "Take measures to address risks from uncontrolled re-entry",
        summary:
          "Casualty risk from uncontrolled re-entry should be below accepted international thresholds (typically 1 × 10⁻⁴).",
      },
    ],
    related_sources: ["INT-COPUOS-DEBRIS-2007"],
    notes: [
      "Often cited together with the 2007 COPUOS Debris Guidelines as the 'international STM baseline'.",
      "The EU Space Act proposal (COM(2025) 335) explicitly references LTS-21 as a regulatory anchor.",
    ],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-REMOTE-SENSING-1986",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Principles Relating to Remote Sensing of the Earth from Outer Space",
    date_enacted: "1986-12-03",
    date_in_force: "1986-12-03",
    un_reference: "GA Resolution 41/65 (3 Dec 1986)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/principles/remote-sensing-principles.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["INT-COPUOS"],
    relevance_level: "high",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "data_security"],
    scope_description:
      "15 Principles framing international rules on Earth observation from space. Key for operators running EO constellations (Copernicus, Planet, Airbus DS, ICEYE) — addresses data access rights of sensed States and duties of sensing States.",
    key_provisions: [
      {
        section: "Principle IV",
        title: "Use for benefit and interest of all States",
        summary:
          "Remote sensing activities shall be conducted for the benefit and in the interests of all States.",
      },
      {
        section: "Principle XII",
        title: "Data access for sensed State",
        summary:
          "As soon as primary and processed data concerning a sensed State's territory is produced, it shall be made available to that State on a non-discriminatory basis and on reasonable cost terms.",
        complianceImplication:
          "Direct operational impact: EO operators with commercial data policies must still honour sensed-State access requests. Used as negotiation baseline when foreign States request data on their territory.",
      },
      {
        section: "Principle XIII",
        title: "Data for disaster management",
        summary:
          "Data should be transmitted promptly to States affected by natural disasters.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    notes: [
      "Non-binding but widely observed. National EO regimes (US NOAA CRSRA, French LOS for satellite data, UK CAA satellite data licensing) reflect these principles.",
    ],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-DIRECT-BROADCASTING-1982",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Principles Governing the Use by States of Artificial Earth Satellites for International Direct Television Broadcasting",
    date_enacted: "1982-12-10",
    date_in_force: "1982-12-10",
    un_reference: "GA Resolution 37/92 (10 Dec 1982)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/principles/direct-broadcasting-principles.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["INT-COPUOS"],
    relevance_level: "high",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    scope_description:
      "Framework for international direct-to-home (DTH) satellite broadcasting — the legal foundation for every national landing-rights regime applied to DTH services. Note: WTO GATS Annex on Telecoms para 2(b) explicitly EXCLUDES cable/broadcast distribution, which is why DTH landing-rights regimes escape WTO disciplines.",
    key_provisions: [
      {
        section: "Principle J (Consultation)",
        title: "Prior consultation and agreement",
        summary:
          "A State intending to establish a DTH service shall without delay notify proposed receiving States of that intention, and promptly enter into consultation with any State that so requests.",
        complianceImplication:
          "The operational source of 'landing rights' as a practice: receiving States are entitled to consultation and can condition reception. This principle grounds the contemporary Mexican IFT model, Indian DoT GMPCS, and similar national regimes.",
      },
      {
        section: "Principle I (Peaceful settlement)",
        title: "Peaceful settlement of disputes",
        summary:
          "Disputes should be settled by the established procedures under the UN Charter.",
      },
    ],
    related_sources: ["INT-ITU-CONST"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-NPS-1992",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Principles Relevant to the Use of Nuclear Power Sources in Outer Space",
    date_enacted: "1992-12-14",
    date_in_force: "1992-12-14",
    un_reference: "GA Resolution 47/68 (14 Dec 1992)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/principles/nps-principles.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["INT-COPUOS"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["environmental", "liability"],
    scope_description:
      "Safety framework and notification procedures for missions using nuclear power sources (RTGs, reactors). Relevant for deep-space operators (Mars, outer planets) and any lunar power infrastructure. Complementary IAEA/COPUOS Safety Framework 2009 extends the technical guidance.",
    key_provisions: [
      {
        section: "Principle 3",
        title: "Guidelines and criteria for safe use",
        summary:
          "NPS shall be used only in missions where non-nuclear energy sources would be unable to fulfil mission objectives in a reasonable way.",
      },
      {
        section: "Principle 4",
        title: "Safety assessment",
        summary:
          "A thorough safety assessment, including a probabilistic risk analysis, shall be conducted prior to each launch.",
      },
      {
        section: "Principle 5",
        title: "Notification of re-entry",
        summary:
          "In the event of a malfunction that could result in re-entry, the launching State shall inform States concerned and shall respond promptly to requests for information or assistance.",
      },
    ],
    related_sources: ["INT-LIABILITY-1972", "INT-OST-1967"],
    notes: [
      "Reinforced by the 2009 COPUOS/IAEA 'Safety Framework for Nuclear Power Source Applications in Outer Space'.",
    ],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-LEGAL-PRINCIPLES-1963",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Declaration of Legal Principles Governing the Activities of States in the Exploration and Use of Outer Space",
    date_enacted: "1963-12-13",
    date_in_force: "1963-12-13",
    un_reference: "GA Resolution 1962 (XVIII) (13 Dec 1963)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/principles/legal-principles.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["INT-COPUOS"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "liability"],
    scope_description:
      "Historical precursor to the 1967 Outer Space Treaty. All nine principles were subsequently codified into the OST. Cited by legal scholars as evidence of customary international law on non-appropriation, State responsibility, and freedom of exploration.",
    key_provisions: [
      {
        section: "Principle 5",
        title: "State responsibility for national activities",
        summary:
          "States bear international responsibility for national activities in outer space, whether carried on by governmental agencies or by non-governmental entities. The activities of non-governmental entities in outer space shall require authorization and continuing supervision by the State concerned.",
        complianceImplication:
          "This is the textual origin of OST Art. VI (the foundation of national licensing regimes). Predates the treaty by 4 years.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    notes: [
      "Effectively superseded by OST 1967, but often cited in customary-international-law arguments.",
    ],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-BRS-1974",
    applies_to_jurisdictions: ["AT", "DE", "GR", "IT", "PT", "CH"],
    signed_by_jurisdictions: ["BE", "ES", "FR"],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Convention Relating to the Distribution of Programme-Carrying Signals Transmitted by Satellite (Brussels Convention)",
    date_enacted: "1974-05-21",
    date_in_force: "1979-08-25",
    source_url: "https://www.wipo.int/treaties/en/ip/brussels/",
    issuing_body: "United Nations (Secretary-General as Depositary)",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["data_security"],
    scope_description:
      "Protects broadcasters from unauthorised distribution of satellite programme-carrying signals. Relevant for Direct-To-Home (DTH) satellite broadcasters and content distribution regulation. Cited in anti-signal-piracy cases.",
    key_provisions: [
      {
        section: "Main obligation",
        title: "Main obligation",
        summary:
          "Art. 2: Contracting States undertake to prevent the distribution on or from their territory of programme-carrying signals by distributors for whom the signals emitted to or passing through a satellite are not intended.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-ITSO-1971",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Agreement Relating to the International Telecommunications Satellite Organization (ITSO)",
    date_enacted: "1971-08-20",
    date_in_force: "1973-02-12",
    source_url: "https://itso.int/legal-framework/",
    issuing_body: "United States of America (Depositary)",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    scope_description:
      "Legal basis for Intelsat, the commercial satellite operator that was privatised in 2001. ITSO (the treaty-based body) retained limited oversight of Intelsat's privatised successor to ensure continued global connectivity and non-discriminatory access. Still relevant for Inmarsat-style maritime/aviation communications operators and historical Intelsat-era constellations.",
    key_provisions: [
      {
        section: "Art. III",
        title: "Art. III",
        summary:
          "Core principles: global coverage, non-discrimination, efficiency, and common benefit. Framework preserved even after 2001 Intelsat privatisation.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-INTERSPUTNIK-1971",
    applies_to_jurisdictions: ["CZ", "PL"],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Agreement on the Establishment of the INTERSPUTNIK International System and Organization of Space Communications",
    date_enacted: "1971-11-15",
    date_in_force: "1972-07-12",
    source_url: "https://intersputnik.com/about/documents/",
    issuing_body: "Russian Federation (Depositary)",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    scope_description:
      "Russian/Soviet-era satellite communications cooperation treaty. Germany denounced it in April 2023 (effective July 2023) following geopolitical shifts. Maintained by CZ, PL among Atlas countries. Limited operational relevance for Western operators today.",
    key_provisions: [
      {
        section: "Art. 1",
        title: "Art. 1",
        summary:
          "Establishes Intersputnik as the commercial satellite communications organisation originally covering the Soviet sphere. Post-1991 opened to international members.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-ESA-CONV-1975",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Convention for the Establishment of a European Space Agency (ESA)",
    date_enacted: "1975-05-30",
    date_in_force: "1980-10-30",
    source_url:
      "https://www.esa.int/About_Us/Law_at_ESA/Convention_for_the_establishment_of_a_European_Space_Agency_and_Related_Procedural_Documents",
    issuing_body: "France (Depositary)",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider", "ground_segment"],
    compliance_areas: ["licensing", "registration", "debris_mitigation"],
    scope_description:
      "Legal foundation of the European Space Agency. Establishes ESA's competence over European space activities, budgetary mechanisms, and governance. Every European operator's licensing context touches ESA policy frameworks (debris, launch, science cooperation). Non-EU states UK, NO, CH are full ESA members — a critical distinction from EU membership.",
    key_provisions: [
      {
        section: "Art. II (Purposes)",
        title: "Art. II (Purposes)",
        summary:
          "ESA's purpose: provide for and promote, for exclusively peaceful purposes, cooperation among European States in space research and technology and their space applications, with a view to their being used for scientific purposes and for operational space applications systems.",
      },
      {
        section: "Art. V (Programmes)",
        title: "Art. V (Programmes)",
        summary:
          "Distinguishes between mandatory activities (scientific programme, basic activities) and optional programmes which Member States may freely subscribe to. Critical for understanding which ESA rules bind which Member States.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-IMSO-1976",
    applies_to_jurisdictions: [
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IT",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Convention on the International Mobile Satellite Organization (IMSO)",
    date_enacted: "1976-09-03",
    date_in_force: "1979-07-16",
    source_url: "https://imso.org/key-documents/",
    issuing_body:
      "International Maritime Organization (Secretary-General as Depositary)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    scope_description:
      "Legal basis for Inmarsat (now part of Viasat after the 2023 merger). 1998 amendment restructured Inmarsat into a commercial company; IMSO retained oversight of GMDSS (Global Maritime Distress and Safety System) and LRIT (long-range tracking and identification of ships) public-service obligations. Directly relevant post-Viasat-Inmarsat merger for maritime satcom landing rights.",
    key_provisions: [
      {
        section: "Art. 3 (Purposes)",
        title: "Art. 3 (Purposes)",
        summary:
          "Ensure the continued provision of global maritime distress and safety satellite communications services, and oversee the public-service obligations of Inmarsat's commercial successor.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-EUTELSAT-1982",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Convention Establishing the European Telecommunications Satellite Organization (EUTELSAT)",
    date_enacted: "1982-07-15",
    date_in_force: "1985-09-01",
    source_url:
      "https://www.itu.int/en/publications/ITU-R/Pages/publications.aspx",
    issuing_body: "France (Depositary)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    scope_description:
      "Legal basis for Eutelsat. Restructured in 1999 to create the commercial Eutelsat SA; the intergovernmental organisation retained oversight of public-service obligations and orbital resource management. Post Eutelsat-OneWeb merger (2023), framework relevant for the combined GEO+LEO operator's regulatory interface.",
    key_provisions: [
      {
        section: "Art. III",
        title: "Art. III",
        summary:
          "Original purpose: the design, establishment, operation and maintenance of the space segment of the European telecommunications satellite system for international public telecommunications services in Europe.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-EUMETSAT-1983",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "CH",
      "UK",
    ],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Convention for the Establishment of a European Organization for the Exploitation of Meteorological Satellites (EUMETSAT)",
    date_enacted: "1983-05-24",
    date_in_force: "1986-06-19",
    source_url: "https://www.eumetsat.int/about-us/who-we-are/legal-framework",
    issuing_body: "Switzerland (Depositary)",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    scope_description:
      "Legal basis for EUMETSAT, operating meteorological satellites (Metop, MTG, Copernicus Sentinel-3, Sentinel-6). Amended in 1991 to broaden scope to climate monitoring and optional programmes. Critical for Copernicus programme operators and meteorological data regulation.",
    key_provisions: [
      {
        section: "Art. 2",
        title: "Art. 2",
        summary:
          "Purpose: establish, maintain and exploit European systems of operational meteorological satellites, in close cooperation with national meteorological services.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-ARABSAT-1976",
    applies_to_jurisdictions: [],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Agreement of the Arab Corporation for Space Communications (ARABSAT)",
    date_enacted: "1976-04-14",
    date_in_force: "1976-07-16",
    source_url: "https://www.arabsat.com/About/",
    issuing_body: "League of Arab States (Depositary)",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    scope_description:
      "Treaty basis for Arabsat, covering 21 Arab League member states. No Atlas jurisdictions are parties. Included for completeness — relevant only for operators serving Middle East / North Africa markets.",
    key_provisions: [
      {
        section: "Art. 1",
        title: "Art. 1",
        summary:
          "Establishes the Arab Corporation for Space Communications as the commercial space telecommunications provider for the Arab world.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },

  {
    id: "INT-INTERCOSMOS-1976",
    applies_to_jurisdictions: ["CZ", "PL"],
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Agreement on Cooperation in the Exploration and Use of Outer Space for Peaceful Purposes (INTERCOSMOS)",
    date_enacted: "1976-07-13",
    date_in_force: "1977-03-25",
    source_url: "https://www.unoosa.org/pdf/spacelaw/treaties/intercosmos.pdf",
    issuing_body: "Russian Federation (Depositary)",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    scope_description:
      "Soviet-era scientific cooperation framework. Maintained by CZ, PL among Atlas countries. Primarily historical relevance today; superseded in practice by bilateral arrangements and ISS cooperation.",
    key_provisions: [
      {
        section: "Art. 1",
        title: "Art. 1",
        summary:
          "Framework for cooperation in space research among original signatory states (Eastern Bloc + some non-aligned).",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-17",
  },
  {
    id: "INT-UNGA-1721B-1961",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "International co-operation in the peaceful uses of outer space — Resolution 1721 B (XVI)",
    date_enacted: "1961-12-20",
    date_in_force: "1961-12-20",
    un_reference: "GA Resolution 1721 B (XVI) (20 Dec 1961)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/resolutions.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["INT-UNOOSA", "INT-COPUOS"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["registration"],
    scope_description:
      "First UN instrument on space-object registration (predates the 1975 Registration Convention by 14 years). Still operative as an alternative vehicle for non-State-Parties to the Registration Convention to submit launch information to the UN Secretary-General. Referenced throughout UNOOSA Toolkit ST/SPACE/95 (2025).",
    key_provisions: [
      {
        section: "Paragraph 1",
        title: "Furnishing launch information to the Secretary-General",
        summary:
          "Calls upon States launching objects into orbit or beyond to furnish information promptly to the Committee on the Peaceful Uses of Outer Space, through the Secretary-General, for the registration of launchings.",
        complianceImplication:
          "Establishes the pre-treaty obligation now fulfilled via the UN Register. Relevant for States that have not ratified the 1975 Registration Convention but still submit registration data.",
      },
      {
        section: "Paragraph 2",
        title: "Establishment of the UN Register",
        summary:
          "Requests the Secretary-General to maintain a public register of the information so furnished — what evolved into the UN Register of Objects Launched into Outer Space.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-REGISTRATION-1975"],
    last_verified: "2026-04-18",
  },
  {
    id: "INT-UNGA-59-115-2004",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Application of the concept of the 'launching State' — Resolution 59/115",
    date_enacted: "2004-12-10",
    date_in_force: "2004-12-10",
    un_reference: "GA Resolution 59/115 (10 Dec 2004)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/resolutions.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["INT-UNOOSA", "INT-COPUOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability", "registration"],
    scope_description:
      "Clarifies how the 'launching State' concept should be applied given the rise of multi-State and commercial launches. Foundational interpretation for State-of-registry determinations when more than one launching State is involved.",
    key_provisions: [
      {
        section: "Para. 1",
        title: "National legislation to implement launching-State obligations",
        summary:
          "Recommends that States consider enacting and implementing national laws authorizing and providing for continuing supervision of the activities of non-governmental entities under their jurisdiction, and to reflect the launching-State definition from OST and Liability Convention in those laws.",
        complianceImplication:
          "Underpins Art. VI OST national-supervision duties. Directly cited in EU Space Act Art. 20 (third-country operator obligations).",
      },
      {
        section: "Para. 2",
        title: "Agreements between multiple launching States",
        summary:
          "Encourages States to conclude agreements in accordance with the Registration Convention on the jurisdiction and control over space objects and personnel and on the apportioning of liability for damage.",
      },
    ],
    related_sources: [
      "INT-OST-1967",
      "INT-LIABILITY-1972",
      "INT-REGISTRATION-1975",
    ],
    last_verified: "2026-04-18",
  },
  {
    id: "INT-UNGA-62-101-2007",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Recommendations on enhancing the practice of States and international intergovernmental organizations in registering space objects — Resolution 62/101",
    date_enacted: "2007-12-17",
    date_in_force: "2007-12-17",
    un_reference: "GA Resolution 62/101 (17 Dec 2007)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/resolutions.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["INT-UNOOSA", "INT-COPUOS"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["registration"],
    scope_description:
      "Enumerates voluntary additional information States should submit beyond the Registration Convention Art. IV minimum — e.g. geostationary slot, change of status, disposal maneuvers, transfer of ownership. The definitive modern supplement to the Registration Convention referenced throughout UNOOSA Toolkit ST/SPACE/95.",
    key_provisions: [
      {
        section: "Para. 2(a)",
        title: "Additional voluntary registration information",
        summary:
          "Recommends States furnish on a voluntary basis: geostationary-orbit location; change of status in operations (including when a space object is no longer functional); approximate date of de-orbiting; physical conditions and orbital parameters change.",
        complianceImplication:
          "Defines the current best-practice data set for national registries. Operators should expect national authorities to request this information at authorization and throughout the mission.",
      },
      {
        section: "Para. 3",
        title: "Transfer of ownership and on-orbit transfer",
        summary:
          "Recommends transparency on transfer of ownership of a space object in orbit, including notification to the UN.",
      },
    ],
    related_sources: ["INT-REGISTRATION-1975", "INT-UNGA-1721B-1961"],
    last_verified: "2026-04-18",
  },
  {
    id: "INT-UNGA-68-74-2013",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Recommendations on national legislation relevant to the peaceful exploration and use of outer space — Resolution 68/74",
    date_enacted: "2013-12-11",
    date_in_force: "2013-12-11",
    un_reference: "GA Resolution 68/74 (11 Dec 2013)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/resolutions.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["INT-UNOOSA", "INT-COPUOS"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
    ],
    scope_description:
      "Sets out the seven key elements every national space law should address: (1) scope of application; (2) authorization and licensing; (3) continuing supervision; (4) registration of space objects; (5) liability and insurance; (6) safety; (7) transfer of ownership/control on orbit. The de-facto template used by EU Member States when drafting national space legislation (referenced directly in GermanSpaceAct drafts and Italian L. 103/2024).",
    key_provisions: [
      {
        section: "Annex, Para. 2",
        title: "Seven key elements of national space law",
        summary:
          "(a) Scope of application; (b) Authorization; (c) Continuing supervision; (d) Registration; (e) Liability and insurance; (f) Safety; (g) Transfer of ownership and control.",
        complianceImplication:
          "Every modern European national space law (UK 2018, Luxembourg 2017, Italy 2024, proposed German Weltraumgesetz, Portuguese 2019) traces its structure back to these seven elements.",
      },
    ],
    related_sources: [
      "INT-OST-1967",
      "INT-LIABILITY-1972",
      "INT-REGISTRATION-1975",
    ],
    last_verified: "2026-04-18",
  },
  {
    id: "INT-UNOOSA-REG-TOOLKIT-2025",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Toolkit on Good Registration Practices for Objects Launched into Outer Space (ST/SPACE/95)",
    date_enacted: "2025-08-01",
    date_in_force: "2025-08-01",
    official_reference: "ST/SPACE/95",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/registration/registration-project.html",
    issuing_body: "United Nations Office for Outer Space Affairs (UNOOSA)",
    competent_authorities: ["INT-UNOOSA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["registration"],
    scope_description:
      "Definitive 2025 UNOOSA guidance on implementing the Registration Convention at the national level. Structured around four pillars: ESTABLISH (national registry), MAINTAIN (internal procedures), REPORT (UN submission), EVOLVE (constellations, on-orbit servicing, transfer of ownership). Funded by UK Space Agency. Published August 2025, released to coincide with the 50th anniversary of the Registration Convention in 2026.",
    key_provisions: [
      {
        section: "Pillar ESTABLISH",
        title: "National registry fundamentals",
        summary:
          "Seven core elements a national registry should capture (Registration Convention Art. IV baseline) plus voluntary additions from Res. 62/101. Recommends formal legislative anchorage and public accessibility.",
      },
      {
        section: "Pillar EVOLVE",
        title: "Modern scenarios: constellations, transfer of ownership, ADR",
        summary:
          "Guidance for mega-constellation registration, transfer of registry between States, on-orbit deployment from the ISS, and active debris removal — scenarios not anticipated by the 1975 Convention.",
        complianceImplication:
          "Operators planning constellations, rideshare deployment from ISS Kibo/Nanoracks, or on-orbit ownership transfers should follow this toolkit's procedural recommendations to avoid registration gaps.",
      },
    ],
    related_sources: [
      "INT-REGISTRATION-1975",
      "INT-UNGA-62-101-2007",
      "INT-LTS-2019",
    ],
    notes: [
      "Non-binding UNOOSA publication but represents the international consensus benchmark for registration practices.",
      "Cites UNOOSA ASTRO Portal (https://www.unoosa.org/oosa/en/ourwork/spacelaw/nationalspacelaw/index.html) as the authoritative index of national space legislation.",
    ],
    last_verified: "2026-04-18",
  },
  {
    id: "INT-COPUOS-BENEFITS-GUIDANCE",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Bringing the benefits of space to all countries — Guidance Document on the Legal Framework for Space Activities",
    date_enacted: "2024-06-01",
    date_in_force: "2024-06-01",
    un_reference:
      "A/AC.105/C.2/2024/CRP (Working Group on the Status and Application of the Five UN Treaties on Outer Space)",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/copuos/lsc/status-treaties/index.html",
    issuing_body:
      "COPUOS Legal Subcommittee — Working Group on the Status and Application of the Five UN Treaties on Outer Space",
    competent_authorities: ["INT-COPUOS", "INT-UNOOSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    scope_description:
      "Guidance document developed over multiple years by the COPUOS Legal Subcommittee Working Group. Consolidates best practice on how States — especially emerging space nations — should implement the five UN space treaties (OST, Rescue, Liability, Registration, Moon). Particularly useful as a reference on Art. VI OST national-supervision duties.",
    key_provisions: [
      {
        section: "Chapter on national implementation",
        title: "Interpretation of the five UN space treaties",
        summary:
          "Provides harmonized interpretation of key treaty concepts — launching State, space object, jurisdiction and control, international responsibility — drawing on 50+ years of State practice.",
      },
    ],
    related_sources: [
      "INT-OST-1967",
      "INT-REGISTRATION-1975",
      "INT-UNGA-68-74-2013",
    ],
    last_verified: "2026-04-18",
  },
  {
    id: "INT-COPUOS-CONSTELLATION-REG",
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CH",
      "CZ",
      "DE",
      "DK",
      "ES",
      "FI",
      "FR",
      "GR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
    ],
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Recommendations on the submission of registration information on space objects forming part of a satellite constellation",
    date_enacted: "2023-06-01",
    date_in_force: "2023-06-01",
    un_reference:
      "COPUOS Legal Subcommittee — adopted by the Working Group on the Status and Application of the Five UN Treaties on Outer Space",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/copuos/lsc/status-treaties/index.html",
    issuing_body: "COPUOS Legal Subcommittee",
    competent_authorities: ["INT-COPUOS", "INT-UNOOSA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["registration", "debris_mitigation"],
    scope_description:
      "COPUOS recommendations tailored to the registration of large satellite constellations and mega-constellations. Addresses aggregated vs. per-object submission, consistent designators across a constellation, and update cadence for high-volume deployments. Directly applicable to Starlink-class and IRIS² (EU) constellation operators.",
    key_provisions: [
      {
        section: "Recommendation 1",
        title: "Per-object registration even within constellations",
        summary:
          "Each satellite within a constellation should be individually identified in registration submissions, with a common designator structure allowing unambiguous identification.",
        complianceImplication:
          "Operators of large constellations cannot register the constellation as a single 'object' — each satellite requires its own Art. IV Registration Convention data record.",
      },
      {
        section: "Recommendation 2",
        title: "Timely submission for rapid deployment cadences",
        summary:
          "For operators launching many satellites in short succession, batch submissions with consistent formats are encouraged to maintain timeliness under Art. IV of the Registration Convention.",
      },
    ],
    related_sources: [
      "INT-REGISTRATION-1975",
      "INT-UNGA-62-101-2007",
      "INT-UNOOSA-REG-TOOLKIT-2025",
    ],
    last_verified: "2026-04-18",
  },

  // ─────────────────────────────────────────────────────────────────
  //  Technical standards + industry best-practice instruments
  //  (graphic: ClearSpace "Recent developments in the regulatory
  //  framework", October 2023 — UN/International Standards and
  //  Industry Best Practices tiers)
  // ─────────────────────────────────────────────────────────────────

  {
    id: "INT-ISO-24330-2022",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "ISO 24330:2022 — Space systems — Programmatic principles and practices for rendezvous and proximity operations (RPO) and on-orbit servicing (OOS) missions",
    date_enacted: "2022-12-01",
    date_in_force: "2022-12-01",
    official_reference: "ISO 24330:2022",
    source_url: "https://www.iso.org/standard/78432.html",
    issuing_body:
      "International Organization for Standardization (ISO/TC 20/SC 14 Space systems and operations)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["in_orbit_services", "satellite_operator"],
    compliance_areas: [
      "space_traffic_management",
      "debris_mitigation",
      "liability",
    ],
    scope_description:
      "Voluntary international standard setting programmatic principles for rendezvous, proximity operations, and on-orbit servicing missions. Covers risk management, communication protocols, passivation handover, and interface compatibility between servicer and client spacecraft. Referenced by CONFERS recommended practices and increasingly by national authorization regimes for IOS missions.",
    key_provisions: [
      {
        section: "Clause 4",
        title: "Mission phases for RPO/OOS",
        summary:
          "Defines six standardised mission phases (planning, launch, commissioning, pre-RPO, RPO-active, post-mission) and the artefacts each phase must produce.",
      },
      {
        section: "Clause 6",
        title: "Safety-by-design principles",
        summary:
          "Servicer spacecraft must be designed with passive safety at every abort point; no single failure may cause collision with the client.",
      },
    ],
    related_sources: ["INT-COPUOS-DEBRIS-2007", "INT-LTS-2019"],
    applies_to_jurisdictions: [],
    notes: [
      "Voluntary industry standard — not binding under international law, but referenced by UK CAA and US FCC licensing guidance for IOS missions.",
      "Forms the programmatic baseline for CONFERS (Consortium for Execution of Rendezvous and Servicing Operations) recommended practices.",
    ],
    last_verified: "2026-04-21",
  },

  {
    id: "INT-AIAA-IOS-STDS",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "AIAA Standards for In-Orbit Servicing (IOS) — including S-143 Servicing Satellite Interface Standard",
    date_enacted: "2018-08-01",
    date_in_force: "2018-08-01",
    official_reference: "AIAA S-143-2018",
    source_url: "https://www.aiaa.org/publications/standards/space-standards",
    issuing_body: "American Institute of Aeronautics and Astronautics (AIAA)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["in_orbit_services", "satellite_operator"],
    compliance_areas: ["space_traffic_management", "debris_mitigation"],
    scope_description:
      "AIAA's suite of in-orbit servicing standards, centred on S-143 which specifies the mechanical, power, and data interface standard for servicing satellite payloads and their clients. Sister documents cover proximity operations communication protocols and servicer-client capture interface compatibility.",
    key_provisions: [
      {
        section: "S-143 §4",
        title: "Grapple fixture geometry",
        summary:
          "Standardised mechanical grapple fixture dimensions and tolerances for client satellites designed to be serviced later.",
      },
      {
        section: "S-143 §7",
        title: "Fluid-transfer interface",
        summary:
          "Standard couplings, pressures, and safety interlocks for propellant-transfer IOS missions.",
      },
    ],
    related_sources: ["INT-ISO-24330-2022", "INT-COPUOS-DEBRIS-2007"],
    applies_to_jurisdictions: [],
    notes: [
      "Voluntary industry standard; adoption driven by client-satellite designers wanting to preserve future servicing optionality.",
      "Complements ISO 24330 on the programmatic side with a concrete hardware/protocol interface specification.",
    ],
    last_verified: "2026-04-21",
  },

  {
    id: "INT-ESA-ZERO-DEBRIS-STD",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "draft",
    title_en:
      "ESA Zero Debris Standard and Policy (ESSB-ST-U-006) — requirements for ESA-procured space missions launched after 2030",
    date_enacted: "2023-11-01",
    date_in_force: "2030-01-01",
    source_url:
      "https://technology.esa.int/upload/media/ESSB-ST-U-006-Issue1-Zero-Debris-technical-requirements.pdf",
    issuing_body:
      "European Space Agency (ESA) — Technology, Engineering & Quality Directorate, Clean Space Office",
    competent_authorities: [],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
    ],
    compliance_areas: [
      "debris_mitigation",
      "space_traffic_management",
      "environmental",
    ],
    scope_description:
      "ESA's institutional zero-debris standard, mandatory for ESA-procured missions launched in or after 2030. Requires <1/1000 failure probability for post-mission disposal, active debris-removal provisioning for non-compliant legacy assets, and demisability analysis for all re-entering elements. Coupled with the ESA Zero Debris Policy which commits ESA to not generate long-lived debris in protected orbital regions.",
    key_provisions: [
      {
        section: "§4 PMD Success",
        title: "Probability of successful post-mission disposal",
        summary:
          "Missions must demonstrate ≥99.9% probability of successful post-mission disposal — an order of magnitude stricter than the IADC 90% baseline.",
      },
      {
        section: "§5 Protected Regions",
        title: "No long-lived debris in LEO or GEO protected regions",
        summary:
          "Operational fragments, explosion debris, and released hardware must be below a specified time-in-orbit threshold for the LEO (< 5 years) and GEO protected regions.",
      },
      {
        section: "§6 Casualty Risk",
        title: "On-ground casualty risk ≤ 1×10⁻⁴ per re-entry event",
        summary:
          "Aggregated casualty risk from uncontrolled and controlled re-entry must not exceed the 1-in-10000 COPUOS baseline.",
      },
    ],
    related_sources: [
      "INT-COPUOS-DEBRIS-2007",
      "INT-LTS-2019",
      "INT-ISO-24330-2022",
    ],
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "DE",
      "ES",
      "FR",
      "IE",
      "IT",
      "LU",
      "NL",
      "NO",
      "PL",
      "PT",
      "SE",
      "UK",
      "CH",
      "GR",
      "FI",
      "DK",
      "CZ",
    ],
    notes: [
      "Mandatory only for ESA-procured missions, but functions as the de-facto European sustainability baseline — national regulators (CNES, UK CAA, BNetzA) are aligning their own licensing thresholds to it.",
      "Companion instrument to the ESA Zero Debris Charter (INT-ESA-ZERO-DEBRIS-CHARTER).",
    ],
    last_verified: "2026-04-21",
  },

  {
    id: "INT-ESA-CPO-GUIDELINES",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "ESA Clean Space Programme — Clean Production Office Guidelines (environmental impact and life-cycle assessment for space missions)",
    date_enacted: "2019-01-01",
    date_in_force: "2019-01-01",
    source_url: "https://technology.esa.int/programme/clean-space",
    issuing_body:
      "European Space Agency (ESA) — Clean Space Programme, Clean Production Office",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["environmental", "debris_mitigation"],
    scope_description:
      "ESA Clean Production Office (CPO) guidelines for eco-design, life-cycle assessment (LCA), and green procurement in ESA-funded space missions. Covers material selection, propellant environmental footprint, end-of-life demisability targets, and industrial-process impact reporting. Voluntary for commercial missions but binding on ESA procurement.",
    key_provisions: [
      {
        section: "CPO-LCA-01",
        title: "Mandatory life-cycle assessment",
        summary:
          "All ESA-procured missions must submit a cradle-to-grave LCA covering raw-material extraction, manufacturing, launch, operations, and end-of-life.",
      },
      {
        section: "CPO-MAT-03",
        title: "Green procurement of materials",
        summary:
          "ESA primes must demonstrate substitution of REACH-restricted substances and preference for recyclable or demisable materials in mission design.",
      },
    ],
    related_sources: ["INT-ESA-ZERO-DEBRIS-STD", "INT-ESA-ZERO-DEBRIS-CHARTER"],
    applies_to_jurisdictions: [],
    notes: [
      "Applies directly to ESA procurement contracts; commercial operators adopt voluntarily to pre-qualify for ESA subcontracts or Copernicus/Galileo payloads.",
      "Complements the Zero Debris Standard on the environmental/materials axis.",
    ],
    last_verified: "2026-04-21",
  },

  {
    id: "INT-ESA-ZERO-DEBRIS-CHARTER",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Zero Debris Charter — industry-led commitment to zero-debris space operations by 2030",
    date_enacted: "2023-11-06",
    date_in_force: "2023-11-06",
    source_url:
      "https://www.esa.int/Space_Safety/Space_Debris/ESA_s_Zero_Debris_approach",
    issuing_body:
      "European Space Agency (ESA) — initiated; signatories include ~110 commercial operators, agencies, and organisations (as of 2024)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
      "in_orbit_services",
    ],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "A voluntary industry commitment launched at the 2023 ESA Space Summit in Seville. Signatories pledge to adopt zero-debris practices — including improved post-mission disposal, failure-rate targets, and active debris-removal contributions — by 2030. Functions as an industry self-governance layer that anticipates regulatory requirements.",
    key_provisions: [
      {
        section: "Commitment 1",
        title: "No long-lived debris generation by 2030",
        summary:
          "Signatories commit to operate so that their missions do not leave long-lived debris in the LEO or GEO protected regions after 2030.",
      },
      {
        section: "Commitment 3",
        title: "Transparency and verification",
        summary:
          "Operators will publish annual progress reports against the charter commitments and submit to independent verification.",
      },
    ],
    related_sources: [
      "INT-ESA-ZERO-DEBRIS-STD",
      "INT-COPUOS-DEBRIS-2007",
      "INT-LTS-2019",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "Not legally binding, but signatory status is increasingly treated as a soft-law reputational commitment in regulatory interactions.",
      "Signatories include ArianeGroup, Airbus, OHB, Thales Alenia Space, several constellation operators, and multiple national space agencies.",
    ],
    last_verified: "2026-04-21",
  },

  {
    id: "INT-ESSI-MEMORANDUM",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "ESSI Memorandum of Principles — Earth & Space Sustainability Initiative industry commitment on orbital sustainability and ESG disclosures",
    date_enacted: "2024-01-01",
    date_in_force: "2024-01-01",
    source_url: "https://www.earthspacesustainability.org/",
    issuing_body:
      "Earth & Space Sustainability Initiative (ESSI) — multi-stakeholder consortium of satellite operators, insurers, financiers, and space agencies",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
    ],
    compliance_areas: [
      "debris_mitigation",
      "environmental",
      "space_traffic_management",
    ],
    scope_description:
      "Industry-led Memorandum of Principles on space sustainability, covering debris mitigation, ESG disclosure, insurance-linked sustainability incentives, and investor transparency. Signatories commit to a set of measurable practices that align with the emerging sustainability rating systems (Space Sustainability Rating, Orbital Sustainability Index) and insurance underwriting criteria.",
    key_provisions: [
      {
        section: "Principle 1",
        title: "Transparent orbital sustainability disclosures",
        summary:
          "Signatories publish sustainability metrics (debris-generation events, collision-avoidance manoeuvres, PMD success) in their annual reporting.",
      },
      {
        section: "Principle 3",
        title: "Insurance-linked sustainability incentives",
        summary:
          "Signatories support and adopt insurance policies that differentiate premiums based on sustainability scoring.",
      },
    ],
    related_sources: ["INT-ESA-ZERO-DEBRIS-CHARTER", "INT-LTS-2019"],
    applies_to_jurisdictions: [],
    notes: [
      "Voluntary industry framework; adoption is growing among operators seeking better insurance terms and ESG-aligned investor relations.",
      "Complements the UK Space Sustainability Standard and ESA Zero Debris Charter on the disclosure/investor-transparency axis.",
    ],
    last_verified: "2026-04-21",
  },
];
