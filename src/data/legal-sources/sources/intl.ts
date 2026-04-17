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
];
