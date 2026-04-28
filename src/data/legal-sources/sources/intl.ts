// src/data/legal-sources/sources/intl.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
        paragraph_text:
          "The exploration and use of outer space, including the moon and other celestial bodies, shall be carried out for the benefit and in the interests of all countries, irrespective of their degree of economic or scientific development, and shall be the province of all mankind. Outer space, including the moon and other celestial bodies, shall be free for exploration and use by all States without discrimination of any kind, on a basis of equality and in accordance with international law, and there shall be free access to all areas of celestial bodies. There shall be freedom of scientific investigation in outer space, including the moon and other celestial bodies, and States shall facilitate and encourage international co-operation in such investigation.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
      },
      {
        section: "Art. II",
        title: "Non-appropriation principle",
        summary:
          "Outer space and celestial bodies are not subject to national appropriation by claim of sovereignty, use, occupation, or any other means.",
        paragraph_text:
          "Outer space, including the moon and other celestial bodies, is not subject to national appropriation by claim of sovereignty, by means of use or occupation, or by any other means.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
      },
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "States bear international responsibility for national space activities including by non-governmental entities. Activities of non-governmental entities require authorization and continuing supervision by the appropriate State.",
        complianceImplication:
          "This is the legal foundation for ALL national licensing regimes. Every German space operator must be authorized because Germany bears responsibility under Art. VI for their activities.",
        paragraph_text:
          "States Parties to the Treaty shall bear international responsibility for national activities in outer space, including the moon and other celestial bodies, whether such activities are carried on by governmental agencies or by non-governmental entities, and for assuring that national activities are carried out in conformity with the provisions set forth in the present Treaty. The activities of non-governmental entities in outer space, including the moon and other celestial bodies, shall require authorization and continuing supervision by the appropriate State Party to the Treaty. When activities are carried on in outer space, including the moon and other celestial bodies, by an international organization, responsibility for compliance with this Treaty shall be borne both by the international organization and by the States Parties to the Treaty participating in such organization.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "A State that launches or procures the launch of an object into outer space, and a State from whose territory or facility an object is launched, is internationally liable for damage to another State or its natural or juridical persons.",
        complianceImplication:
          "Germany is liable as 'launching State' for damage caused by objects launched from its territory or by its nationals. This drives insurance and liability requirements.",
        paragraph_text:
          "Each State Party to the Treaty that launches or procures the launching of an object into outer space, including the moon and other celestial bodies, and each State Party from whose territory or facility an object is launched, is internationally liable for damage to another State Party to the Treaty or to its natural or juridical persons by such object or its component parts on the Earth, in air space or in outer space, including the moon and other celestial bodies.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
      },
      {
        section: "Art. VIII",
        title: "Registration and jurisdiction",
        summary:
          "A State Party on whose registry an object launched into outer space is carried shall retain jurisdiction and control over such object and over any personnel thereof.",
        complianceImplication:
          "Registration determines which State has jurisdiction. German-registered satellites are under German jurisdiction regardless of their orbital position.",
        paragraph_text:
          "A State Party to the Treaty on whose registry an object launched into outer space is carried shall retain jurisdiction and control over such object, and over any personnel thereof, while in outer space or on a celestial body. Ownership of objects launched into outer space, including objects landed or constructed on a celestial body, and of their component parts, is not affected by their presence in outer space or on a celestial body or by their return to the Earth. Such objects or component parts found beyond the limits of the State Party to the Treaty on whose registry they are carried shall be returned to that State Party, which shall, upon request, furnish identifying data prior to their return.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
      },
      {
        section: "Art. IX",
        title: "Consultation and contamination avoidance",
        summary:
          "States shall conduct exploration so as to avoid harmful contamination and adverse changes in the environment of Earth. Consultation required if activities would cause potentially harmful interference.",
        complianceImplication:
          "Legal basis for debris mitigation and environmental requirements.",
        paragraph_text:
          "In the exploration and use of outer space, including the moon and other celestial bodies, States Parties to the Treaty shall be guided by the principle of co-operation and mutual assistance and shall conduct all their activities in outer space, including the moon and other celestial bodies, with due regard to the corresponding interests of all other States Parties to the Treaty. States Parties to the Treaty shall pursue studies of outer space, including the moon and other celestial bodies, and conduct exploration of them so as to avoid their harmful contamination and also adverse changes in the environment of the Earth resulting from the introduction of extraterrestrial matter and, where necessary, shall adopt appropriate measures for this purpose. If a State Party to the Treaty has reason to believe that an activity or experiment planned by it or its nationals in outer space, including the moon and other celestial bodies, would cause potentially harmful interference with activities of other States Parties in the peaceful exploration and use of outer space, including the moon and other celestial bodies, it shall undertake appropriate international consultations before proceeding with any such activity or experiment.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/outerspacetreaty.html",
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
        paragraph_text:
          "A launching State shall be absolutely liable to pay compensation for damage caused by its space object on the surface of the earth or to aircraft in flight.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html",
      },
      {
        section: "Art. III",
        title: "Fault-based liability in space",
        summary:
          "Damage caused in outer space to a space object of another State is compensated only if the damage is due to fault of the launching State or its agents.",
        complianceImplication:
          "In-orbit collisions require proof of fault. This is less burdensome than surface liability but still drives collision avoidance obligations.",
        paragraph_text:
          "In the event of damage being caused elsewhere than on the surface of the earth to a space object of one launching State or to persons or property on board such a space object by a space object of another launching State, the latter shall be liable only if the damage is due to its fault or the fault of persons for whom it is responsible.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/liability-convention.html",
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
        paragraph_text:
          "When a space object is launched into earth orbit or beyond, the launching State shall register the space object by means of an entry in an appropriate registry which it shall maintain. Each launching State shall inform the Secretary-General of the United Nations of the establishment of such a registry. Where there are two or more launching States in respect of any such space object, they shall jointly determine which one of them shall register the object in accordance with paragraph 1 of this article, bearing in mind the provisions of article VIII of the Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies, and without prejudice to appropriate agreements concluded or to be concluded among the launching States on jurisdiction and control over the space object and over any personnel thereof. The contents of each registry and the conditions under which it is maintained shall be determined by the State of registry concerned.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/registration-convention.html",
      },
      {
        section: "Art. IV",
        title: "Registration data requirements",
        summary:
          "Each State must furnish to the UN: name of launching State(s), designator/registration number, date and territory of launch, basic orbital parameters, general function of the space object.",
        complianceImplication:
          "Operators must provide launch and orbit data to enable registration.",
        paragraph_text:
          "Each State of registry shall furnish to the Secretary-General of the United Nations, as soon as practicable, the following information concerning each space object carried on its registry: (a) Name of launching State or States; (b) An appropriate designator of the space object or its registration number; (c) Date and territory or location of launch; (d) Basic orbital parameters, including: (i) Nodal period, (ii) Inclination, (iii) Apogee, (iv) Perigee; (e) General function of the space object.",
        paragraph_url:
          "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/registration-convention.html",
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

  {
    id: "INT-SPACE-INSURANCE-MARKET",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Global Space Insurance Market — Lloyd's Syndicates, Mutuals, and Captives",
    date_published: "2026-04-22",
    source_url: "https://www.lloyds.com/about-lloyds/who-we-are/our-market",
    issuing_body:
      "Lloyd's of London / IUMI / industry mutuals (composite reference)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["insurance", "liability"],
    scope_description:
      "Reference entry mapping the actual market structure operators face when placing space cover — distinct from the statutory rules in the national-jurisdiction entries (DE-VVG, FR-CODE-ASSURANCES-SPACE, UK-INSURANCE-ACT-2015). Catalogues the principal capacity providers (Lloyd's syndicates, continental Europeans, mutuals), the typical layered structure (pre-launch, launch, in-orbit, third-party liability, political risk), and the wording lineage every space-insurance placement encounters.",
    key_provisions: [
      {
        section: "Capacity providers",
        title: "Lloyd's syndicates and continental followers",
        summary:
          "The London market — Lloyd's of London syndicates including specialist space writers (Beazley, Hiscox, AEGIS London, Brit, Tokio Marine Kiln) — leads global space-risk pricing, with continental Europeans (Allianz, Munich Re, SCOR) and Asian capacity (Mitsui Sumitomo, Tokio Marine, Mapfre) following or leading regional placements. Capacity has tightened materially after the 2023-2024 loss years.",
      },
      {
        section: "Mutuals and captives",
        title: "Operator-owned alternatives",
        summary:
          "Industry mutuals (notably Galactic Re, the SES/Eutelsat-aligned facility) and operator captives provide capacity for risks that the commercial market prices punitively or refuses outright — typically EOL retirement, in-orbit-collision low-probability layers, and constellation-fleet aggregations.",
      },
      {
        section: "Standard layering",
        title: "Pre-launch, launch, in-orbit, third-party",
        summary:
          "Typical placement structure: pre-launch (transit and integration), launch (intentional ignition through separation), in-orbit-life (commissioning to EOL), and third-party-liability (legal liability to non-passengers). Each layer has its own market, wording lineage, and pricing dynamic.",
      },
      {
        section: "Wording lineage",
        title: "London Joint Hull, Lloyd's space wordings",
        summary:
          "Standard wordings include the Lloyd's Space Insurance Wording (LSW), Joint Hull Committee clauses, and the Munich Re benchmark forms. Operators should map the chosen national insurance-contract law (DE-VVG, FR Code des assurances, UK Insurance Act 2015) onto whichever wording is placed — choice-of-law conflict is the most common drafting trap.",
      },
    ],
    related_sources: [
      "DE-VVG",
      "FR-CODE-ASSURANCES-SPACE",
      "UK-INSURANCE-ACT-2015",
      "UK-LIABILITY-ARCHITECTURE",
      "INT-LIABILITY-1972",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "Reference entry rather than a statute — included because the practical insurance question on every space mandate cannot be answered from the national statute alone; the operator's actual cover sits in a London-placed policy backed by global reinsurance.",
      "Loss environment: the 2023-24 in-orbit-loss cycle (Viasat-3, Inmarsat-6 F2 anomalies, multiple LEO failures) tightened capacity and pricing markedly. Premium markets remain hardened through 2026.",
    ],
    last_verified: "2026-04-22",
  },

  // ─── Sanctions framework ──────────────────────────────────────────
  // Cross-jurisdictional reference entries for the active sanctions regimes
  // that overlay every cross-border space-sector transaction in 2024-2026.
  // Operators MUST screen against these in addition to domestic export-
  // control compliance — sanctions diligence sits on top of, not parallel
  // to, ordinary licensing review.

  {
    id: "INT-EU-SANCTIONS-RU-833",
    jurisdiction: "INT",
    type: "eu_regulation",
    status: "in_force",
    title_en:
      "Council Regulation (EU) No 833/2014 — Russia Sectoral Sanctions (with 2022+ space-sector escalations)",
    title_local: "Council Regulation (EU) No 833/2014",
    date_enacted: "2014-07-31",
    date_last_amended: "2025-12-19",
    official_reference: "Council Regulation (EU) No 833/2014",
    source_url: "https://eur-lex.europa.eu/eli/reg/2014/833/oj",
    issuing_body: "Council of the European Union",
    competent_authorities: ["EU-EC"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "Operative EU sanctions instrument for Russia, escalated repeatedly since February 2022. Annexes VII (advanced technology) and XXIII (industrial goods) capture spacecraft, launch vehicles, GNSS receivers, and many ground-segment items. Annex IV lists prohibited end-users. Directly applicable in all EU Member States — overrides any contrary commercial arrangement and cannot be displaced by choice-of-law.",
    key_provisions: [
      {
        section: "Art. 2 + Annex VII",
        title: "Advanced-technology export ban",
        summary:
          "Prohibits the sale, supply, transfer, or export — directly or indirectly — of advanced-technology goods and technology, including spacecraft, GNSS, INS, star trackers, and many spacecraft components, to any person in Russia or for use in Russia.",
      },
      {
        section: "Art. 2a + Annex XXIII",
        title: "Industrial-goods ban",
        summary:
          "Captures a broad list of industrial inputs that includes propulsion components, radiation-hardened electronics, and materials used in space hardware. Operators must screen full bills of materials, not just final products.",
      },
      {
        section: "Art. 12 / 12g",
        title: "No-circumvention and best-efforts duties",
        summary:
          "Operators must take affirmative steps to prevent third-country diversion (Art. 12g best-efforts duty for non-EU subsidiaries). Diversion to Russia via Belarus, Central Asia, or Caucasus jurisdictions is the most-frequent compliance trap.",
        complianceImplication:
          "A finding of circumvention exposes the operator to criminal liability in every EU Member State plus national-level penalties. Full end-user/end-use screening is non-optional for any 2024-2026 space-component shipment with Eurasian counterparties.",
      },
    ],
    related_sources: [
      "RU-SPACE-LAW-1993",
      "INT-UK-RUSSIA-REGS-2019",
      "INT-OFAC-SDN-SPACE",
      "DE-DUALUSE-2021",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "16th sanctions package (December 2024) added further space-sector entities to the Annex IV list and tightened the Art. 12g circumvention duty.",
      "EU sanctions interact with national export-control regimes (e.g. DE-AWG-2013, FR-SBDU-DUALUSE) — both must be cleared in parallel; clearing one does not satisfy the other.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-UK-RUSSIA-REGS-2019",
    jurisdiction: "INT",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "The Russia (Sanctions) (EU Exit) Regulations 2019 — Post-Brexit UK Russia Sanctions",
    date_enacted: "2019-04-10",
    date_last_amended: "2026-02-24",
    official_reference: "S.I. 2019/855",
    source_url: "https://www.legislation.gov.uk/uksi/2019/855/contents",
    issuing_body:
      "Secretary of State for Foreign, Commonwealth and Development Affairs",
    competent_authorities: ["UK-ECJU"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "UK's standalone post-Brexit Russia-sanctions regime under the Sanctions and Anti-Money Laundering Act 2018. Regulates trade, financial, immigration, aircraft, and ships sanctions targeting Russia. Significantly expanded since February 2022 to cover space hardware, defence-and-security items, and dual-use technology serving Russian end-users.",
    key_provisions: [
      {
        section: "Part 5 (Trade)",
        title: "Trade sanctions on dual-use and military items",
        summary:
          "Prohibits export, re-export, supply, delivery, technical assistance, and brokering of military, dual-use, critical-industry, and infrastructure-related items to Russia. Captures most space-launch and many spacecraft items via the cross-reference to the UK Strategic Export Control Lists.",
      },
      {
        section: "Reg. 19A-19F",
        title: "Financial sanctions and asset-freezes",
        summary:
          "Asset-freeze designations include space-sector entities and persons. Operators must screen counterparties via the OFSI Consolidated List of designated persons.",
      },
    ],
    related_sources: [
      "RU-SPACE-LAW-1993",
      "INT-EU-SANCTIONS-RU-833",
      "UK-ECA-2002",
      "UK-ECO-2008",
    ],
    notes: [
      "UK and EU regimes diverged after Brexit. A transaction permitted under EU sanctions can still be prohibited under UK sanctions and vice versa — both must be screened independently for any UK-touch transaction.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-OFAC-SDN-SPACE",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en: "US OFAC SDN List and Sectoral Sanctions — Space-Sector Entities",
    date_published: "2026-04-22",
    source_url:
      "https://ofac.treasury.gov/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists",
    issuing_body:
      "US Department of the Treasury, Office of Foreign Assets Control",
    competent_authorities: ["US-BIS"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "Reference entry to the principal US sanctions instruments touching the space sector: Executive Orders authorising sanctions on Russian space-defence entities (E.O. 14024 + amendments), Iran/DPRK sanctions, the Cuba Restrictions, and the broader SDN-screening obligation that applies to every US-person transaction. OFAC's secondary-sanctions theory of jurisdiction can reach non-US operators dealing with designated counterparties even without a US nexus.",
    key_provisions: [
      {
        section: "E.O. 14024 (April 2021, amended 2022+)",
        title: "Russia harmful-foreign-activities authorities",
        summary:
          "Primary US authority under which Roscosmos subsidiaries, Russian space-defence entities, and supporting third-country networks have been designated. Designations carry asset-freeze and US-person-transaction prohibitions; secondary-sanctions risk for non-US operators is significant.",
      },
      {
        section: "31 CFR Part 510 (DPRK) and 31 CFR Part 560 (Iran)",
        title: "Comprehensive country sanctions",
        summary:
          "DPRK and Iran sanctions are near-comprehensive: practically every space-sector transaction requires OFAC general-licence or specific-licence authorisation, with extraterritorial reach for US-origin content and the 'facilitation' theory.",
      },
      {
        section: "BIS Entity List (15 CFR Part 744 Supp. 4)",
        title: "Export-control designations beyond OFAC",
        summary:
          "BIS Entity List captures Chinese space-defence entities, Russian space-supply networks, and other end-users for whom EAR licence requirements are imposed beyond the standard control list. Updated continuously since 2022.",
      },
    ],
    related_sources: [
      "US-EAR",
      "US-ITAR",
      "INT-EU-SANCTIONS-RU-833",
      "INT-UK-RUSSIA-REGS-2019",
      "INT-CN-EXPORT-LAW-2020",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "OFAC '50-percent rule': any entity owned 50 % or more, directly or indirectly, by one or more designated persons is itself blocked even if not separately listed. Routine source of compliance surprises in complex cross-border space transactions.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-CN-EXPORT-LAW-2020",
    jurisdiction: "INT",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Export Control Law of the People's Republic of China (with the 2024 Dual-Use Items Export Control Regulations)",
    title_local: "中华人民共和国出口管制法",
    date_enacted: "2020-10-17",
    date_in_force: "2020-12-01",
    date_last_amended: "2024-12-01",
    official_reference: "Order of the President No. 58 (2020)",
    source_url:
      "http://www.npc.gov.cn/npc/c2/c30834/202010/t20201017_307992.html",
    issuing_body: "Standing Committee of the National People's Congress",
    competent_authorities: ["CN-MIIT"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "China's first comprehensive export-control statute, modelled in part on the US EAR. Captures dual-use items, military items, nuclear items, and 'other goods, technologies and services' related to national security — explicitly extending to spacecraft technology, space-related rare earths, and inertial-navigation components. The 2024 Dual-Use Items Export Control Regulations consolidate the catalogue. Extraterritorial reach for re-export of China-origin content; deemed-export theory captures intra-foreign transfers of Chinese-origin technology.",
    key_provisions: [
      {
        section: "Art. 12-15",
        title: "Permit and end-user/end-use screening",
        summary:
          "MIIT-administered permits required for export of items on the Dual-Use Items Catalogue. End-user and end-use commitments are mandatory; misrepresentation is a criminal offence.",
      },
      {
        section: "Art. 18",
        title: "Catch-all and unverified-end-user controls",
        summary:
          "Items outside the catalogue still require a permit if the exporter knows or should know they will be used for WMD, military end-use in restricted countries, or by listed end-users. The Unverified End-User List operates similarly to the US BIS Entity List.",
      },
      {
        section: "Art. 48",
        title: "Counter-measures provision",
        summary:
          "Authorises retaliatory export-control measures against jurisdictions imposing 'discriminatory' controls on Chinese persons — the legal basis for China's reciprocal restrictions on US space-sector counterparties.",
      },
    ],
    related_sources: ["CN-LAUNCH-REG-2002", "INT-OFAC-SDN-SPACE", "US-EAR"],
    applies_to_jurisdictions: [],
    notes: [
      "Operators sourcing rare earths or radiation-hardened electronics from Chinese suppliers must overlay this regime onto their domestic compliance — Chinese export licences are now a routine pre-condition for downstream Western shipments.",
    ],
    last_verified: "2026-04-22",
  },

  // ─── Technical standards bodies ────────────────────────────────────
  // The standards every operator's contract incorporates by reference.
  // Often quasi-mandatory: not statutes, but cited in licence conditions
  // (UK CAA CAP 2987, FR RTF, US Part 450, DE BSI TR-03184), in mission-
  // assurance contracts (ESA, NASA, JAXA), and in insurance underwriting.

  {
    id: "INT-ISO-24113",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en: "ISO 24113 — Space Systems: Space Debris Mitigation Requirements",
    date_enacted: "2019-07-01",
    date_last_amended: "2023-01-01",
    official_reference: "ISO 24113:2023",
    source_url: "https://www.iso.org/standard/83494.html",
    issuing_body:
      "International Organization for Standardization (TC 20/SC 14)",
    competent_authorities: [],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "launch_provider",
    ],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "Top-level ISO debris-mitigation standard adopted as the technical baseline by virtually every national licensing authority that regulates non-governmental space activity. Specifies quantitative requirements for orbital lifetime (LEO ≤ 25 years), passivation, end-of-life disposal, casualty risk thresholds, and design-for-disposal. Cited by FR RTF-2011, AU SLR Rules 2019, JP Space Activities Act, and the FCC 5-year PMD rule (which tightens the 25-year baseline).",
    key_provisions: [
      {
        section: "Cl. 6.3 — LEO post-mission disposal",
        title: "25-year orbital-lifetime ceiling",
        summary:
          "Spacecraft and orbital stages in LEO must be removed from the protected region within 25 years of end-of-mission, by atmospheric re-entry, transfer to a graveyard orbit, or active removal.",
      },
      {
        section: "Cl. 6.4 — GEO disposal",
        title: "GEO disposal orbit",
        summary:
          "Spacecraft in GEO must be re-orbited to at least 235 km + ΔP above the geostationary belt (the 'IADC formula') before passivation.",
      },
      {
        section: "Cl. 6.5 — Passivation",
        title: "Stored-energy passivation",
        summary:
          "Stored energy (propellant, batteries, pressurants) must be vented or depleted at end-of-mission to prevent fragmentation events.",
      },
      {
        section: "Cl. 6.6 — Casualty risk",
        title: "1 in 10,000 casualty risk ceiling",
        summary:
          "Uncontrolled re-entry of spacecraft and launch vehicles must achieve a casualty risk of less than 1 in 10,000 per event — quantitative threshold reproduced in licensing rules across jurisdictions.",
      },
    ],
    related_sources: [
      "INT-COPUOS-DEBRIS-2007",
      "INT-LTS-2019",
      "INT-ESA-ZERO-DEBRIS-STD",
      "INT-ECSS-Q-ST-80C",
      "US-FCC-5YR-PMD-2022",
      "FR-ARRETE-2011-RT",
    ],
    applies_to_jurisdictions: [],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-ECSS-Q-ST-80C",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "ECSS-Q-ST-80C — Software Product Assurance (and the broader ECSS standards stack for space)",
    date_enacted: "2017-12-15",
    official_reference: "ECSS-Q-ST-80C Rev. 1",
    source_url: "https://ecss.nl/",
    issuing_body:
      "European Cooperation for Space Standardization (ESA, EUMETSAT, CNES, DLR, ASI, UKSA + industry)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity", "debris_mitigation"],
    scope_description:
      "Reference entry for the ECSS standards stack — the European industrial-standards system co-owned by space agencies (ESA, EUMETSAT, CNES, DLR, ASI, UKSA) and industry. ECSS-M (management), ECSS-Q (product assurance, including Q-ST-80C software PA), ECSS-E (engineering), and ECSS-U (sustainability, including ECSS-U-AS-10C 'Adoption Notice of ISO 24113') are routinely cited in ESA contracts, national-agency procurement, and insurance underwriting. BSI TR-03184-2 explicitly maps to ECSS-Q-ST-80C and related families.",
    key_provisions: [
      {
        section: "ECSS-Q-ST-80C — Software product assurance",
        title: "Software-PA baseline for space products",
        summary:
          "Defines processes, documentation, and verification standards for spacecraft software development. Compliance is functionally mandatory in any ESA contract and most prime-led satellite manufacturing programmes.",
      },
      {
        section: "ECSS-U-AS-10C",
        title: "Adoption of ISO 24113",
        summary:
          "Adopts ISO 24113 (debris mitigation) as the ECSS sustainability baseline, with European-specific extensions covering casualty risk reporting and conjunction-coordination behaviour.",
      },
    ],
    related_sources: [
      "INT-ISO-24113",
      "INT-ESA-ZERO-DEBRIS-STD",
      "DE-BSI-TR-03184-1",
      "DE-BSI-TR-03184-2",
    ],
    applies_to_jurisdictions: [],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-CCSDS",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "CCSDS — Consultative Committee for Space Data Systems (Recommended Standards)",
    date_published: "2026-04-22",
    source_url: "https://public.ccsds.org/Publications/AllPubs.aspx",
    issuing_body:
      "CCSDS Member Agencies (NASA, ESA, JAXA, DLR, CNES, ASI, UKSA, ROSCOSMOS, CNSA, CSA + observers)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum", "cybersecurity"],
    scope_description:
      "International standards body publishing the Recommended Standards (the 'Blue Books') that govern telemetry, telecommand, file transfer, and security for space-data systems. Operators design space and ground segments around CCSDS standards by default — CCSDS 401.0-B (Radio Frequency and Modulation), 232.0-B (TC Space Data Link), 132.0-B (TM Space Data Link), and the 35x.0-B security suites (SDLS, ASEC) are universally referenced.",
    key_provisions: [
      {
        section: "CCSDS 401.0-B (Radio Frequency)",
        title: "RF and modulation Blue Book",
        summary:
          "Reference standard for spacecraft RF interface design — coordinates with ITU Radio Regulations for spectrum allocations and modulation schemes used across space agencies.",
      },
      {
        section: "CCSDS 232.0-B / 132.0-B (Data Links)",
        title: "TC and TM space data-link protocols",
        summary:
          "Operative protocols for telecommand and telemetry between spacecraft and ground segment — implemented in virtually every Western and many third-country missions.",
      },
      {
        section: "CCSDS 350.x / 35x.0-B (Security)",
        title: "Space Data Link Security and crypto suites",
        summary:
          "Defines authenticated and encrypted spacecraft commanding (SDLS) and the cryptographic algorithm suites approved for space use. Increasingly cited in NIS2 and BSI TR-03184 conformity assessments.",
      },
    ],
    related_sources: [
      "INT-ITU-RR",
      "DE-BSI-TR-03184-1",
      "DE-BSI-TR-03184-2",
      "INT-ECSS-Q-ST-80C",
    ],
    applies_to_jurisdictions: [],
    last_verified: "2026-04-22",
  },

  // ─── ITU framework ─────────────────────────────────────────────────
  // The international spectrum regime under which every satellite
  // operates. National frequency licences (BNetzA, Ofcom, FCC, ARCEP,
  // ANATEL, etc.) all flow from ITU coordination procedures.

  {
    id: "INT-ITU-RR",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en: "ITU Radio Regulations",
    date_in_force: "2024-01-01",
    amended_by: ["INT-ITU-WRC-23"],
    official_reference:
      "ITU Radio Regulations, Edition of 2024 (incorporating WRC-23 outcomes)",
    source_url: "https://www.itu.int/pub/R-REG-RR",
    issuing_body: "International Telecommunication Union",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Treaty-status international instrument allocating the radio-frequency spectrum and the geostationary-satellite orbit. The ITU Radio Regulations bind 194 ITU Member States and are the international layer above every national frequency-licensing regime. Article 5 (Frequency Allocations), Article 9 (Coordination procedures), Article 11 (Notification), and Article 22 (Space services) are the operative provisions for any commercial satellite system.",
    key_provisions: [
      {
        section: "Art. 5",
        title: "Frequency allocation table by region",
        summary:
          "Tripartite regional allocation table assigning each radio-frequency band to specific services. Operators must align their payload and TT&C frequency plans with the allocation tables before national licensing is even feasible.",
      },
      {
        section: "Art. 9",
        title: "Coordination — API, CR/C, bilateral",
        summary:
          "Process by which a satellite network is coordinated with potentially-affected administrations. API (Advance Publication Information) opens the procedure; CR/C (Coordination Request) triggers the bilateral coordination obligations; lead times are typically 2-7 years for GEO networks.",
        complianceImplication:
          "Operators must initiate ITU coordination via the responsible national administration (BNetzA, Ofcom, FCC, etc.) well before launch — an unfiled or uncoordinated network has no enforceable spectrum protection.",
      },
      {
        section: "Art. 11",
        title: "Notification and Recording (MIFR)",
        summary:
          "After successful coordination the network is entered into the Master International Frequency Register — securing international protection against subsequent harmful interference.",
      },
      {
        section: "Art. 22",
        title: "Space services — PFD limits and EPFD constellation rules",
        summary:
          "Sets power-flux-density (PFD) limits for space-to-Earth transmissions and equivalent PFD (EPFD) limits for non-GSO constellations operating in shared bands. Determines the technical envelope a constellation operator must respect.",
      },
    ],
    related_sources: [
      "INT-ITU-WRC-23",
      "INT-CCSDS",
      "DE-TKG-2021",
      "FR-CPCE-SATELLITE",
      "UK-WTA-2006",
      "UK-CA-2003",
      "US-COMM-ACT-1934",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "ITU Radio Regulations carry treaty force under Art. 4 of the ITU Constitution; they bind Member States, which then implement nationally via BNetzA / Ofcom / FCC / ARCEP / ANFR / ANATEL / etc.",
      "WRC-23 outcomes (effective from 2024) introduced new rules for IoT non-GSO mega-constellations and adjusted the EPFD limits in several Ku/Ka bands.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-ITU-WRC-23",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "ITU World Radiocommunication Conference 2023 — Final Acts (WRC-23)",
    date_enacted: "2023-12-15",
    date_in_force: "2024-01-01",
    official_reference: "WRC-23 Final Acts (Dubai, 2023)",
    source_url: "https://www.itu.int/wrc-23/",
    issuing_body: "ITU World Radiocommunication Conference",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "The treaty-amending instrument that produced the 2024 edition of the ITU Radio Regulations. WRC-23 outcomes — in force since January 2024 — include new rules for non-GSO mega-constellations, IMT-mobile-satellite-service primary allocations, and an updated EPFD framework. Operators planning launches in 2025-2030 must verify their RF plans against the post-WRC-23 Radio Regulations rather than the older 2020 edition.",
    key_provisions: [
      {
        section: "Agenda item 1.16",
        title: "Non-GSO FSS in Ka and Q/V bands — mega-constellation rules",
        summary:
          "New regulatory provisions for non-GSO fixed-satellite-service systems operating in Ka, Q, and V bands — captures Starlink, Kuiper, OneWeb second-generation, and emerging European constellations. Imposes coordination, EPFD, and milestone-based deployment rules.",
      },
      {
        section: "Agenda item 1.18",
        title: "IMT-2030 and 6G — future mobile-satellite service",
        summary:
          "Allocations preparing the spectrum environment for 6G/IMT-2030 satellite-direct-to-device services, with implications for satellite-cellular convergence programmes.",
      },
    ],
    related_sources: ["INT-ITU-RR"],
    applies_to_jurisdictions: [],
    notes: [
      "WRC-27 (next conference, scheduled 2027) will revisit several WRC-23 compromises; operators with long lead-time projects should monitor the Conference Preparatory Meeting (CPM) cycle that begins in 2025.",
    ],
    last_verified: "2026-04-22",
  },

  // âââ Sectoral cross-JD clusters ââââââââââââââââââââââââââââââââââââ
  // Cross-cutting reference entries for operating models that span every
  // jurisdiction: in-orbit servicing / active debris removal, suborbital
  // human spaceflight, dedicated human-spaceflight crew/participant
  // regimes, and the comparative space-resources framework.

  {
    id: "INT-IOS-ADR-FRAMEWORK",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "In-Orbit Servicing and Active Debris Removal â Comparative Regulatory Framework",
    date_published: "2026-04-22",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/copuos/lsc/icj-iaaa-iisl-iac/index.html",
    issuing_body:
      "Atlas reference entry (synthesises FCC IOSSA, JP CRD2, ESA ClearSpace-1, US AWMRA discussion)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["in_orbit_services"],
    compliance_areas: [
      "licensing",
      "liability",
      "insurance",
      "debris_mitigation",
      "space_traffic_management",
    ],
    scope_description:
      "Reference entry for the regulatory landscape governing rendezvous-and-proximity operations, on-orbit refuelling, robotic servicing, and active debris removal. No global treaty regime exists — operators navigate a patchwork of national frameworks. Captures FCC IOSSA framework, JP CRD2 commercial-removal precedent, ESA ClearSpace-1 contractual model, NASA OSAM contract structures, and the open question of liability allocation when one operator's spacecraft physically interacts with another's.",
    key_provisions: [
      {
        section: "Regulatory pathways",
        title: "Per-jurisdiction licensing routes",
        summary:
          "FCC: Part 25 + IOSSA framework (declaration regime). FAA: Part 450 mission-licensing basis. UK CAA: SIA 2018 orbital-operator licence + mission-management licence. JP Cabinet Office: Spacecraft management permit (Art. 20-23 SAA 2016). ESA: ClearSpace-1 contractual instrument under Space Safety Programme.",
      },
      {
        section: "Liability allocation",
        title: "Inter-operator agreements",
        summary:
          "OST/Liability Convention assigns State-of-launch liability but does not address operator-to-operator harm during a servicing mission. Industry practice has converged on bilateral Inter-Operator Agreements (IOAs) with mutual cross-waivers modelled on the ISS IGA cross-waiver, plus dedicated insurance layers.",
      },
      {
        section: "Debris-mitigation interaction",
        title: "ADR mission categorisation",
        summary:
          "Active debris removal missions present a regulatory paradox: removing a defunct object reduces population debris, but the rendezvous-and-grab operation creates fragmentation risk. Authorities (FCC, JP, ESA) have created mission-specific approval channels rather than treating ADR under standard collision-avoidance rules.",
      },
    ],
    related_sources: [
      "INT-ISO-24113",
      "INT-LTS-2019",
      "INT-ESA-ZERO-DEBRIS-STD",
      "US-FCC-5YR-PMD-2022",
      "US-FAA-NPRM-UPPER-STAGES-2023",
      "JP-SPACE-ACTIVITIES-ACT-2016",
      "UK-SI-2021-792",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "The 2024 ESA ClearSpace-1 mission (target: VESPA upper stage) is the first contracted commercial debris-removal mission; lessons from its execution will shape the next round of national rule-making.",
      "FCC published IOSSA framework guidance October 2024; the Commission has issued mission-by-mission Part 25 licences (Astroscale ELSA-d, Northrop Grumman MEV) under existing rules pending a formal Part 25 IOS rulemaking.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-SUBORBITAL-FRAMEWORK",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Suborbital Spaceflight — Comparative Regulatory Framework (US, UK, NM, AU)",
    date_published: "2026-04-22",
    source_url: "https://www.faa.gov/space/licenses/launch_license",
    issuing_body:
      "Atlas reference entry (FAA Part 450, UK CAA SIA 2018, NM Space Authority, ASA SLR Act)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing", "liability", "insurance"],
    scope_description:
      "Reference for the regulatory regime governing suborbital human spaceflight (Virgin Galactic, Blue Origin) and high-altitude balloon flights. The dominant operator-model is Government-licensed commercial flight under informed-consent waivers from spaceflight participants. The US 'learning period' regime under CSLA §50919(g) suspends prescriptive participant-safety regulation — Congress has repeatedly extended this.",
    key_provisions: [
      {
        section: "US",
        title: "Learning period — FAA Part 460 + CSLA §50919(g)",
        summary:
          "FAA cannot impose prescriptive safety regulations on spaceflight participants except after a triggering incident. Operators rely on participant informed consent + State-tort shields (NM, FL, TX). Learning period extended through October 2025 by 2023 NDAA; further extension legislation pending.",
      },
      {
        section: "UK",
        title: "SIA 2018 + Spaceflight Activities Regs operator licence",
        summary:
          "UK regime expressly addresses spaceflight participants in the SIA 2018 + 2021 Regulations (S.I. 2021/792-815). CAA grants operator licences with prescriptive participant-safety conditions, in contrast to the US learning-period approach.",
      },
      {
        section: "Australia + New Zealand",
        title: "SLR Act / OSHAA orbital-and-suborbital coverage",
        summary:
          "Australia covers suborbital under Part 4-5 of the Space (Launches and Returns) Act 2018; New Zealand under the OSHAA 2017 high-altitude provisions. Both regimes apply launch-permit rules to suborbital operations.",
      },
    ],
    related_sources: [
      "US-CSLA-1984",
      "US-14CFR-PART-450",
      "US-NM-SPACEPORT",
      "UK-SI-2021-792",
      "AU-SLR-ACT-2018",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "Virgin Galactic (US) and Blue Origin (US) are the operative commercial-suborbital operators; Stratolaunch and Sierra Space have suborbital ambitions. UK suborbital activity remains nascent through 2026.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-HUMAN-SPACEFLIGHT-FRAMEWORK",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Crewed Orbital Spaceflight — Astronaut and Spaceflight-Participant Regime",
    date_published: "2026-04-22",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/rescue-agreement.html",
    issuing_body:
      "Atlas reference entry (Rescue Agreement, ISS IGA, NASA SAA, Axiom commercial astronauts)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["liability", "human_spaceflight", "licensing"],
    scope_description:
      "Reference for the legal regime governing crewed orbital spaceflight. Distinguishes (1) Government-flagged astronauts (Treaty regime: Rescue Agreement, Liability Convention, ISS IGA cross-waiver), (2) Commercial spaceflight participants on Axiom-style missions (operator informed-consent + ISS IGA cross-waiver requires partner-Government acceptance), (3) Future commercial-station crew (no settled framework — Starlab, Orbital Reef, Vast Haven approaches diverge). National regimes vary: US treats commercial participants under §50919(g) learning period; UK SIA 2018 prescriptive; ESA partner-government participants flow through national agencies.",
    key_provisions: [
      {
        section: "ISS IGA Art. 5 + 11",
        title: "Jurisdiction and crew duty-of-care",
        summary:
          "Partner States exercise jurisdiction over their flight elements and personnel; cross-waiver of liability under Art. 16 immunises partner entities from claims arising from ISS activities, with carved-out exceptions for wilful misconduct.",
      },
      {
        section: "Commercial-participant access",
        title: "Axiom-style mission gating",
        summary:
          "Commercial participants flying to ISS via NASA's Commercial Crew system require ISS IGA partner-government acceptance, NASA Crew Operations agreement, plus operator informed-consent contracts. Direct commercial-station flight (Starlab, Orbital Reef) will require new bilateral arrangements not yet drafted.",
      },
    ],
    related_sources: [
      "INT-ISS-1998",
      "INT-RESCUE-1968",
      "INT-LIABILITY-1972",
      "US-CSLA-1984",
      "UK-SI-2021-792",
      "JP-ISS-AGREEMENT-IMPL",
    ],
    applies_to_jurisdictions: [],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-SPACE-RESOURCES-COMPARATOR",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Space Resources — Comparative Property-Rights Regime (US, LU, AE, JP)",
    date_published: "2026-04-22",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/copuos/working-groups/space-resources/index.html",
    issuing_body:
      "Atlas reference entry (CSLCA Title IV, LU 2017, UAE 2019, JP 2021, COPUOS WG)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["space_resource_operator"],
    compliance_areas: ["licensing"],
    scope_description:
      "Reference comparator for the four jurisdictions that have legislated commercial space-resource property rights, plus the COPUOS Working Group on Legal Aspects of Space Resource Activities (active since 2021). All four legislative regimes interpret OST Art. II's non-appropriation principle as not barring private property in extracted resources, while disagreeing in part on sovereignty implications. China and Russia reject the four regimes' interpretation; the EU has not legislated.",
    key_provisions: [
      {
        section: "US — CSLCA Title IV (2015)",
        title: "First-mover statute",
        summary:
          "51 USC §51303: A US citizen engaged in commercial recovery of an asteroid resource or space resource shall be entitled to any asteroid resource or space resource obtained, including to possess, own, transport, use, and sell. Predicate of the Artemis Accords' resource-extraction principles.",
      },
      {
        section: "Luxembourg — Law of 20 July 2017",
        title: "First non-US statutory framework",
        summary:
          "Establishes a Government authorisation regime for space-resource activities by Luxembourg-incorporated entities, with explicit recognition of property rights in extracted resources.",
      },
      {
        section: "UAE — Federal Decree-Law 12/2019 Art. 18",
        title: "Permit-based extraction regime",
        summary:
          "Authorises and regulates space-resource activities under UAESA permit. Operative since 2020 Executive Regulations.",
      },
      {
        section: "Japan — Act No. 83 of 2021",
        title: "Cabinet-Office permit + property recognition",
        summary:
          "Confers ownership of extracted resources on Cabinet-Office-permitted Japanese operators.",
      },
    ],
    related_sources: [
      "INT-OST-1967",
      "INT-MOON-1979",
      "INT-ARTEMIS-ACCORDS-2020",
      "US-CSLCA-2015",
      "AE-DECREE-12-2019",
      "JP-SPACE-RESOURCES-2021",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "COPUOS Working Group on Legal Aspects of Space Resource Activities (chaired since 2022 by Brazil-Greece) is developing recommended principles; consensus output expected 2026-2027.",
    ],
    last_verified: "2026-04-22",
  },

  // âââ Multilateral export-control regimes âââââââââââââââââââââââââââ
  // Voluntary plurilateral export-control arrangements that underpin the
  // national licensing regimes catalogued in DE-AWG, FR-CIEEMG, US-EAR/
  // ITAR, UK-ECA-2002, and the EU Dual-Use Regulation. The arrangements
  // themselves are not directly applicable, but national lists (and
  // therefore operator licensing) track the multilateral catalogues.

  {
    id: "INT-WASSENAAR",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Wassenaar Arrangement on Export Controls for Conventional Arms and Dual-Use Goods and Technologies",
    date_enacted: "1996-07-12",
    date_last_amended: "2024-12-01",
    official_reference:
      "Wassenaar Arrangement (December 1995 Initial Elements)",
    source_url: "https://www.wassenaar.org/",
    issuing_body: "Wassenaar Arrangement plenary",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "Plurilateral export-control regime among 42 participating states establishing common Control Lists for conventional arms (Munitions List) and dual-use goods (Dual-Use List). National export-control lists in EU Dual-Use Regulation 2021/821, US EAR, UK ECO 2008, JP FEFTA, AU DSGL, and CA Group all derive their structures from Wassenaar lists. Annual plenary updates flow through to national lists with 6–18 month lag.",
    key_provisions: [
      {
        section: "List of Dual-Use Goods and Technologies",
        title: "Annual control-list updates",
        summary:
          "Categories 1–9 cover everything from materials and chemicals through electronics, computers, telecoms, sensors, and aerospace/propulsion. Updated annually in December plenary; national list updates follow in Q1–Q2 of the next year.",
      },
      {
        section: "Munitions List",
        title: "Conventional arms scope",
        summary:
          "Captures launch vehicles capable of delivering 500 kg payload to 300 km range (Cat. ML4), spacecraft systems with military application (Cat. ML22), and related technology. National-level US ITAR USML and EU Common Military List parallel the Wassenaar ML.",
      },
    ],
    related_sources: [
      "DE-DUALUSE-2021",
      "DE-AUSFUHRLISTE",
      "US-EAR",
      "US-ITAR",
      "UK-ECO-2008",
      "INT-MTCR",
    ],
    applies_to_jurisdictions: [],
    notes: [
      "Russia was a participating state until its Wassenaar-membership status was effectively suspended in March 2022; formally Russia remains a member but has been excluded from plenary activities.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-MTCR",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Missile Technology Control Regime (MTCR) Annex — Categories I and II",
    date_enacted: "1987-04-16",
    date_last_amended: "2024-10-01",
    official_reference: "MTCR Equipment, Software and Technology Annex",
    source_url: "https://mtcr.info/",
    issuing_body: "MTCR partnership plenary",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["export_control", "military_dual_use"],
    scope_description:
      "Voluntary plurilateral arrangement among 35 partner states aimed at limiting proliferation of missiles capable of delivering 500 kg to 300 km. Category I (complete missile systems and major sub-systems) carries a presumption of denial; Category II (dual-use components, technology, materials) is licensed case-by-case. Captures most space-launch vehicles, propulsion systems, INS/star-trackers above thresholds, and spacecraft sub-systems with missile applicability.",
    key_provisions: [
      {
        section: "Annex Category I",
        title: "Presumption of denial",
        summary:
          "Complete rocket systems, complete unmanned aerial vehicles, and major sub-systems (rocket motors, re-entry vehicles, GNC sets) carry a presumption of denial absent extraordinary policy justification.",
      },
      {
        section: "Annex Category II",
        title: "Case-by-case licensing",
        summary:
          "Dual-use components and technology including propellants, materials, INS, star trackers, ablative materials, ground-test stands. National-list parallels in US EAR Cat. 9 and EU Dual-Use Annex I Cat. 9.",
      },
    ],
    related_sources: [
      "INT-WASSENAAR",
      "INT-HCOC-2002",
      "DE-DUALUSE-2021",
      "US-EAR",
      "US-ITAR",
    ],
    applies_to_jurisdictions: [],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-AUSTRALIA-GROUP",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Australia Group Common Control Lists — Chemical and Biological Items",
    date_enacted: "1985-06-15",
    date_last_amended: "2024-06-01",
    official_reference: "Australia Group Common Control Lists",
    amends: "INT-ITU-RR",
    source_url:
      "https://www.dfat.gov.au/publications/minisite/theaustraliagroupnet/site/en/index.html",
    issuing_body: "Australia Group plenary",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["export_control"],
    scope_description:
      "Plurilateral arrangement among 43 partners aimed at chemical and biological weapons non-proliferation. Marginal direct relevance to space — captured here because biological-payload missions (life-sciences experiments, MISSE-style), planetary-protection activities, and certain Earth-observation chemical-sensing payloads can engage AG-controlled items. National lists incorporate the AG catalogue.",
    key_provisions: [
      {
        section: "Common Control List — Biological",
        title: "Bio-payload diligence",
        summary:
          "Operators of biological-payload missions must screen against the Common Control Lists (human and animal pathogens, plant pathogens, dual-use biological equipment).",
      },
    ],
    related_sources: ["INT-WASSENAAR", "INT-MTCR"],
    applies_to_jurisdictions: [],
    last_verified: "2026-04-22",
  },

  {
    id: "INT-NSG",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Nuclear Suppliers Group Guidelines — Trigger List and Dual-Use List",
    date_enacted: "1978-09-21",
    date_last_amended: "2024-06-01",
    official_reference: "INFCIRC/254 Parts 1 and 2",
    source_url: "https://www.nuclearsuppliersgroup.org/",
    issuing_body: "Nuclear Suppliers Group",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["export_control"],
    scope_description:
      "Plurilateral arrangement among 48 nuclear-supplier states. Direct space relevance is narrow but real: radioisotope thermoelectric generators (RTGs) for deep-space missions, certain radiation-hardened electronics, and nuclear-thermal-propulsion concepts engage NSG-controlled items.",
    key_provisions: [
      {
        section: "INFCIRC/254 Part 2",
        title: "Dual-use catalogue",
        summary:
          "Captures nuclear-related dual-use items including some materials and technology relevant to nuclear-power generation in space.",
      },
    ],
    related_sources: ["INT-WASSENAAR"],
    applies_to_jurisdictions: [],
    last_verified: "2026-04-22",
  },

  // âââ EU horizontal regulations adjacent to space âââââââââââââââââââ

  // âââ NATO space framework ââââââââââââââââââââââââââââââââââââââââââ

  {
    id: "INT-NATO-SPACE-POLICY-2022",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "NATO Space Policy and the Madrid Strategic Concept — Recognition of Space as an Operational Domain",
    date_published: "2022-06-29",
    source_url: "https://www.nato.int/cps/en/natohq/topics_175419.htm",
    issuing_body: "North Atlantic Council",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "cybersecurity"],
    scope_description:
      "Reference for NATO's space-domain doctrine. Madrid Strategic Concept (2022) confirms space as an operational domain alongside land, sea, air, and cyber. NATO Space Policy (declassified summary, 2022) and AJP-3.3 (Joint Air and Space Operations doctrine) bind allied operations. NATO Space Centre of Excellence in Toulouse (since 2020) coordinates allied space exercises and capability development.",
    key_provisions: [
      {
        section: "Madrid Strategic Concept",
        title: "Space as operational domain",
        summary:
          "Article 5 deterrence and defence concepts extend to attacks on or from space. Allied military space-asset protection becomes part of the NATO collective-defence calculus.",
      },
      {
        section: "NATO AJP-3.3",
        title: "Joint air and space operations",
        summary:
          "Allied doctrine integrating space effects (PNT, satcom, ISR) into NATO joint operations. Indirectly shapes Allied Government procurement of commercial space services.",
      },
    ],
    related_sources: ["INT-WASSENAAR", "INT-MTCR"],
    applies_to_jurisdictions: [],
    last_verified: "2026-04-22",
  },

  // ─── Debris-Mitigation Stack — IADC / ISO / CCSDS / CONFERS ──────────
  // The de-facto technical baseline that every national space-debris
  // regime cross-references. None are treaties, all are referenced
  // verbatim in NCA guidance (FCC, FAA, UKSA, CNES, ASI, JAXA, ISRO).

  {
    id: "INT-IADC-MITIGATION-2002",
    jurisdiction: "INT",
    type: "policy_document",
    status: "superseded",
    title_en: "IADC Space Debris Mitigation Guidelines (Original 2002 Edition)",
    date_published: "2002-10-15",
    official_reference: "IADC-02-01 Rev. 0",
    source_url: "https://www.iadc-home.org/documents_public/file_down/id/3998",
    issuing_body: "Inter-Agency Space Debris Coordination Committee (IADC)",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "Original 2002 IADC consensus document — the engineering basis for COPUOS-2007 and every national debris regime. Defined the protected regions (LEO ≤ 2000 km altitude; GEO ±200 km × ±15° latitude), the 25-year LEO post-mission disposal rule, the GEO graveyard formula (235 km + 1000·CR·A/m above GEO), and the passivation requirement. Superseded operationally by IADC 2007 minor revision and the 2020 / 2025 updates, but the protected-region definitions remain unchanged and are still the canonical reference.",
    key_provisions: [
      {
        section: "§3",
        title: "Protected regions",
        summary:
          "Region A (LEO): spherical region from Earth's surface up to 2000 km altitude. Region B (GEO): a torus ±200 km in altitude × ±15° in latitude around the geostationary belt.",
        complianceImplication:
          "All national disposal rules (FCC 5-yr, ESA 25-yr, JAXA 25-yr, UKSA case-by-case) operate exclusively on these two regions. Operators outside Region A/B carry no formal post-mission-disposal obligation.",
      },
      {
        section: "§5.3.1",
        title: "LEO post-mission disposal — 25 years",
        summary:
          "Spacecraft and orbital stages should not remain in Region A more than 25 years after end of mission, by direct re-entry, re-entry via atmospheric drag, or transfer to a long-lifetime disposal orbit.",
      },
      {
        section: "§5.3.2",
        title: "GEO graveyard formula",
        summary:
          "Re-orbit altitude above GEO ≥ 235 km + 1000·CR·A/m, where CR is the solar-radiation-pressure coefficient (typically 1.2–1.5) and A/m is the area-to-mass ratio in m²/kg.",
        complianceImplication:
          "Most operators target ~300 km above GEO to give margin. Under-shooting the formula is the single most-cited GEO-disposal violation in operator audits.",
      },
      {
        section: "§5.2.2",
        title: "Passivation",
        summary:
          "All on-board sources of stored energy (residual propellant, batteries, pressure vessels, flywheels) must be depleted or rendered safe at end of mission to prevent post-mission break-up.",
      },
    ],
    related_sources: ["INT-COPUOS-DEBRIS-2007", "INT-IADC-MITIGATION-2020"],
    superseded_by: "INT-IADC-MITIGATION-2020",
    notes: [
      "The 'IADC 25-year rule' refers specifically to §5.3.1 of this document.",
      "Re-issued with editorial-only changes as IADC-02-01 Rev. 1 (2007) and Rev. 2 (2020).",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-IADC-MITIGATION-2020",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en: "IADC Space Debris Mitigation Guidelines (Revision 2020)",
    date_published: "2020-06-04",
    official_reference: "IADC-02-01 Rev. 2",
    source_url: "https://www.iadc-home.org/documents_public/file_down/id/4961",
    issuing_body: "Inter-Agency Space Debris Coordination Committee (IADC)",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "2020 revision tightening the 2002/2007 baseline. Adds explicit 90% disposal-reliability target for LEO post-mission disposal, sharpens the passivation language, and recommends collision-avoidance manoeuvre coordination via shared catalogue data. Still the version referenced verbatim in current FCC/FAA/UKSA/CNES guidance until each agency individually adopts the 2025 update.",
    key_provisions: [
      {
        section: "§5.3.1",
        title: "LEO disposal — 25 years and 90% reliability",
        summary:
          "Retains the 25-year rule but adds: 'the post-mission disposal manoeuvre should be designed to achieve a probability of successful disposal of at least 0.9'.",
        complianceImplication:
          "The 90% threshold is what triggers most modern licensing-condition language ('demonstrate ≥0.9 disposal reliability'). Single-string propulsion architectures usually fail this without redundancy.",
      },
      {
        section: "§5.4",
        title: "Conjunction assessment & avoidance",
        summary:
          "Operators should perform conjunction-assessment screening using the most accurate orbital data available and execute avoidance manoeuvres when probability of collision exceeds an operator-defined threshold.",
      },
      {
        section: "§5.6",
        title: "Re-entry casualty risk",
        summary:
          "Re-entering objects should comply with national casualty-risk thresholds (typically 10⁻⁴) — the IADC does not itself set a number but explicitly defers to national regimes.",
      },
    ],
    related_sources: [
      "INT-IADC-MITIGATION-2002",
      "INT-IADC-MITIGATION-2025",
      "INT-COPUOS-DEBRIS-2007",
      "INT-ISO-24113-2023",
    ],
    amends: "INT-IADC-MITIGATION-2002",
    superseded_by: "INT-IADC-MITIGATION-2025",
    notes: [
      "First IADC guidelines version to introduce a numerical disposal-reliability target.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-IADC-MITIGATION-2025",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "IADC Space Debris Mitigation Guidelines — 2025 Update (Five-Year LEO Rule)",
    date_published: "2025-03-15",
    official_reference: "IADC-02-01 Rev. 3",
    source_url: "https://www.iadc-home.org/documents_public/",
    issuing_body: "Inter-Agency Space Debris Coordination Committee (IADC)",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
    ],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "Latest IADC consensus, finalised at the 2025 plenary. Replaces the 25-year LEO disposal target with a 5-year target for new spacecraft (consistent with the FCC 2022 order), introduces a re-entry-coordination expectation, and tightens the post-mission disposal-reliability bar to 0.95. Operationally the most demanding IADC text to date — most modern licensing decisions (FCC, UKSA Standard Conditions, ASI Note 02/2024) directly reference this revision.",
    key_provisions: [
      {
        section: "§5.3.1 (Rev. 3)",
        title: "Five-year LEO disposal",
        summary:
          "New spacecraft and orbital stages should be removed from LEO within five years after end of mission, with a probability of successful disposal of at least 0.95.",
        complianceImplication:
          "Effectively requires propulsion (or aerodynamic drag-augmentation devices for sub-600-km orbits). The '5-year' figure is now the de-facto minimum for any post-2025 mission seeking US, UK, or French authorisation.",
      },
      {
        section: "§5.3.3",
        title: "Re-entry coordination",
        summary:
          "States and operators should coordinate the time and ground-track of controlled and uncontrolled re-entries to minimise risk to populated areas, and notify potentially-affected states in advance.",
      },
      {
        section: "§5.7",
        title: "Constellation-specific provisions",
        summary:
          "Large constellations (>100 spacecraft) should publish a fleet-level debris-mitigation plan, including spare-vs-active replacement strategy, end-of-life cadence, and aggregate catastrophic-collision-risk model.",
        complianceImplication:
          "First IADC text to address constellations as a category. Drives Astranis/Starlink/OneWeb/Kuiper-type filings to include fleet-wide statistics, not just per-bird.",
      },
    ],
    related_sources: [
      "INT-IADC-MITIGATION-2020",
      "INT-COPUOS-DEBRIS-2007",
      "US-FCC-5YR-PMD-2022",
      "INT-ISO-24113-2023",
    ],
    amends: "INT-IADC-MITIGATION-2020",
    notes: [
      "IADC consensus document — non-binding; binding force comes through national adoption (FCC §25.114, UKSA Standard Conditions, ASA Operating Conditions).",
      "The 5-year rule applies only to new spacecraft; legacy missions launched under prior regimes continue under the 25-year rule unless re-licensed.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-ISO-24113-2023",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "ISO 24113:2023 — Space systems — Space debris mitigation requirements",
    date_published: "2023-04-20",
    official_reference: "ISO 24113:2023 (4th edition)",
    source_url: "https://www.iso.org/standard/83702.html",
    issuing_body:
      "International Organization for Standardization (ISO/TC 20/SC 14)",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "in_orbit_services",
    ],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "Top-level ISO standard that translates IADC guidelines into auditable engineering requirements. The 4th edition (2023) aligns with the IADC 2020 Rev.2 baseline and adds explicit requirements for dispose-reliability demonstration, post-mission casualty risk, and end-of-life passivation verification. Most ESA, JAXA, and CNES contracts require ISO 24113 compliance in their technical clauses; many private operators reference it as the project-internal SDM standard.",
    key_provisions: [
      {
        section: "§6.2",
        title: "Limit debris released during normal operations",
        summary:
          "The probability of releasing operational debris ≥ 1 mm shall be demonstrably minimised. Lens covers, separation springs, and explosive-bolt fragments are explicit examples.",
      },
      {
        section: "§6.3",
        title: "Limit accidental break-ups",
        summary:
          "Spacecraft and orbital-stage design shall demonstrate that the probability of accidental break-up during operational phases is below 10⁻³.",
      },
      {
        section: "§6.4",
        title: "Limit post-mission break-ups",
        summary:
          "All sources of stored energy (propellant, pressure systems, batteries, flywheels) shall be passivated within a defined post-mission timeline. Passivation verification shall be auditable on-orbit.",
      },
      {
        section: "§6.5",
        title: "Post-mission disposal — protected regions",
        summary:
          "Disposal from LEO within 25 years (aligning with IADC 2020). Disposal from GEO via graveyard orbit per IADC formula. Demonstrated success probability ≥ 0.9.",
      },
      {
        section: "§6.6",
        title: "Casualty risk on re-entry",
        summary:
          "Casualty risk for uncontrolled re-entry shall not exceed 10⁻⁴ (the ESA / JAXA / FAA threshold). For controlled re-entry, target ground-track shall be cleared with the relevant national authorities.",
      },
      {
        section: "§6.7",
        title: "Conjunction-event handling",
        summary:
          "An operational procedure shall exist for receiving conjunction-data messages, computing collision probability, and executing avoidance manoeuvres.",
      },
    ],
    related_sources: [
      "INT-IADC-MITIGATION-2020",
      "INT-IADC-MITIGATION-2025",
      "INT-ISO-27852",
      "INT-ISO-16127",
      "INT-ECSS-U-AS-10C",
    ],
    notes: [
      "Compliance is achieved by demonstrating that each ISO 24113 requirement is met by traceable engineering evidence (analysis, test, inspection, or similarity).",
      "ISO 24113 is regularly cited in launch-licence conditions (UKSA, AEMA, ASA) as the SDM standard against which operator submissions are reviewed.",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-ISO-27852",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en: "ISO 27852:2016 — Space systems — Estimation of orbit lifetime",
    date_published: "2016-09-15",
    official_reference: "ISO 27852:2016",
    source_url: "https://www.iso.org/standard/72383.html",
    issuing_body:
      "International Organization for Standardization (ISO/TC 20/SC 14)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "Specifies the methodology for computing orbital lifetime, the headline calculation behind every '25-year rule' or '5-year rule' demonstration. Defines the atmospheric models (NRLMSISE-00, JB2008), solar-flux assumptions, drag-coefficient handling, and Monte-Carlo uncertainty propagation that an operator must apply to defend a disposal-reliability claim before a national authority.",
    key_provisions: [
      {
        section: "§5",
        title: "Required atmospheric model",
        summary:
          "Orbital-lifetime calculations shall use NRLMSISE-00 or JB2008 atmosphere with solar-flux F10.7 from a reference solar-cycle scenario (mean, +1σ, and worst-case).",
      },
      {
        section: "§7",
        title: "Monte-Carlo uncertainty",
        summary:
          "Lifetime predictions for compliance demonstrations shall be Monte-Carlo with ≥100 runs, varying initial state, drag coefficient, atmospheric density, and solar flux within their 1σ uncertainties.",
      },
      {
        section: "Annex A",
        title: "Drag-augmentation devices",
        summary:
          "Methodology for crediting drag sails, terminator tapes, and electrodynamic tethers in lifetime calculations.",
      },
    ],
    related_sources: ["INT-ISO-24113-2023", "INT-IADC-MITIGATION-2020"],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-ISO-16127",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "ISO 16127:2014 — Space systems — Prevention of break-up of unmanned spacecraft",
    date_published: "2014-08-01",
    official_reference: "ISO 16127:2014",
    source_url: "https://www.iso.org/standard/55736.html",
    issuing_body:
      "International Organization for Standardization (ISO/TC 20/SC 14)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "Engineering standard for spacecraft break-up prevention. Covers passivation procedures (propellant venting profiles, battery isolation, pressure-system depletion) and provides acceptance criteria for proving that a spacecraft is incapable of accidental fragmentation post-passivation.",
    key_provisions: [
      {
        section: "§5.2",
        title: "Propellant passivation",
        summary:
          "Residual propellant shall be vented through nominal thruster valves until tank pressure equalises with vacuum or the explosive risk is shown to be < 10⁻³.",
      },
      {
        section: "§5.3",
        title: "Battery passivation",
        summary:
          "Battery cells shall be electrically isolated and discharged below the gas-generation threshold; over-discharge protection shall be permanently disabled at end-of-life.",
      },
    ],
    related_sources: ["INT-ISO-24113-2023", "INT-IADC-MITIGATION-2020"],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-ISO-23339",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "ISO 23339:2010 — Space systems — Estimation of remaining propellant in spacecraft tanks",
    date_published: "2010-12-01",
    official_reference: "ISO 23339:2010",
    source_url: "https://www.iso.org/standard/53480.html",
    issuing_body:
      "International Organization for Standardization (ISO/TC 20/SC 14)",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "Methodology for estimating residual propellant — critical for end-of-life disposal manoeuvre planning. Defines the four families of propellant-gauging methods (book-keeping, PVT, thermal-mass, gauging-by-burn) and their accuracy bounds. NCAs cite this as the reference for any disposal-reliability statement that depends on a final delta-V calculation.",
    key_provisions: [
      {
        section: "§6",
        title: "PVT method",
        summary:
          "Pressure–volume–temperature method as the default for blow-down propellant systems, with required tank-pressure and tank-temperature instrumentation accuracy.",
      },
    ],
    related_sources: ["INT-ISO-24113-2023", "INT-ISO-16127"],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-CCSDS-CDM-508",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en: "CCSDS 508.0-B-1 — Conjunction Data Message (CDM)",
    date_published: "2013-06-01",
    official_reference: "CCSDS 508.0-B-1 (Blue Book)",
    source_url: "https://public.ccsds.org/Pubs/508x0b1e2.pdf",
    issuing_body: "Consultative Committee for Space Data Systems (CCSDS)",
    competent_authorities: [],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "Industry-standard machine-readable format for conjunction warnings. Originated by 18th Space Defense Squadron / Space-Track and adopted by every major SSA provider (LeoLabs, Slingshot, ESA SST, EU SST, JAXA SSA). Operators MUST consume CDMs in this format to participate in any modern collision-avoidance pipeline.",
    key_provisions: [
      {
        section: "§4",
        title: "CDM data fields",
        summary:
          "Defines the mandatory conjunction-event fields: TCA (time of closest approach), miss-distance, relative velocity, primary/secondary state vectors at TCA, covariance matrices, hard-body radius, and probability of collision.",
      },
      {
        section: "§5",
        title: "Probability-of-collision computation",
        summary:
          "Standardised Pc (probability-of-collision) calculation methodology; reference implementations from Foster, Patera, and Alfano are normatively listed.",
      },
    ],
    related_sources: ["INT-ISO-24113-2023", "INT-IADC-MITIGATION-2025"],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-CCSDS-NDM",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "CCSDS Navigation Data Standards Family (B-Series) — OEM, OPM, OMM, OCM, TDM",
    date_published: "2009-11-15",
    official_reference: "CCSDS 502.0-B-2 / 503.0-B-1 / 504.0-B-1 / 505.0-B-1",
    source_url: "https://public.ccsds.org/Publications/BlueBooks.aspx",
    issuing_body: "Consultative Committee for Space Data Systems (CCSDS)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "Family of navigation-data interchange standards — Orbit Ephemeris Message (OEM), Orbit Parameter Message (OPM), Orbit Mean-Elements Message (OMM), Orbit Comprehensive Message (OCM), Tracking Data Message (TDM). Used to exchange ephemerides between operators and SSA providers; mandatory format in many EU SST and US Space Force data-sharing agreements.",
    key_provisions: [
      {
        section: "OEM (502.0-B-2)",
        title: "Orbit Ephemeris Message",
        summary:
          "Time-tagged state vectors at user-defined cadence; the standard ephemeris exchange format between operators and SSA providers.",
      },
      {
        section: "OCM (505.0-B-1)",
        title: "Orbit Comprehensive Message",
        summary:
          "Latest addition (2018) — combines OEM + OPM + OMM into a single message with covariance, manoeuvre history, and physical parameters; designed to be the future canonical exchange format.",
      },
    ],
    related_sources: ["INT-CCSDS-CDM-508"],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-CONFERS-RDOP-2018",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "CONFERS Recommended Design and Operational Practices for In-Orbit Servicing (RDOP)",
    date_published: "2018-11-01",
    official_reference: "CONFERS RDOP v2.1 (2024 update)",
    source_url:
      "https://www.satelliteconfers.org/recommended-design-operational-practices/",
    issuing_body:
      "Consortium for Execution of Rendezvous and Servicing Operations (CONFERS)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["in_orbit_services", "satellite_operator"],
    compliance_areas: ["debris_mitigation", "space_traffic_management"],
    scope_description:
      "Industry consensus on the technical and operational practices for rendezvous-and-proximity-operations (RPO) and in-orbit servicing (IOS) missions — refuelling, repair, life-extension, debris removal. Founding members include Maxar, Northrop, Astroscale, ClearSpace; effectively the engineering baseline for the IOS sub-sector. Increasingly cited in NCA guidance (FCC OSAM Order, UKSA In-Orbit-Services Note 2024) as the reference for safe-RPO design.",
    key_provisions: [
      {
        section: "§3",
        title: "Mission phases",
        summary:
          "Defines the canonical phases — far-rendezvous, close-rendezvous, proximity-operations, capture/docking, joint operations, departure — and the safety constraints applicable to each.",
      },
      {
        section: "§4",
        title: "Communications & coordination",
        summary:
          "Operators of resident-space-objects (RSOs) targeted for servicing must be notified ≥ 30 days before close-approach operations begin; consent is required for non-cooperative RPO.",
      },
      {
        section: "§5",
        title: "Debris generation",
        summary:
          "Capture mechanisms shall be designed not to generate fragments; tested in vacuum at end-to-end mission-relevant relative velocities.",
      },
    ],
    related_sources: [
      "INT-IADC-MITIGATION-2025",
      "INT-CCSDS-CDM-508",
      "US-FCC-OSAM-ORDER-2024",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-ECSS-U-AS-10C",
    jurisdiction: "INT",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "ECSS-U-AS-10C Rev.2 — Adoption Notice of ISO 24113: Space Debris Mitigation Requirements",
    date_published: "2019-10-10",
    official_reference: "ECSS-U-AS-10C Rev.2",
    source_url:
      "https://ecss.nl/standard/ecss-u-as-10c-rev-2-adoption-notice-of-iso-24113-space-debris-mitigation-requirements-10-october-2019/",
    issuing_body: "European Cooperation for Space Standardization (ECSS)",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "ESA's adoption of ISO 24113 with European-specific tailoring. ECSS-U-AS-10C Rev.2 is mandatory in all ESA contracts and is referenced as the technical baseline by CNES, DLR, ASI, INTA, Belspo, NSO, and most national debris-mitigation guidances. The European tailoring tightens passivation evidence requirements and introduces casualty-risk modelling rules consistent with the ESA SDM Policy.",
    key_provisions: [
      {
        section: "Tailoring §4.1",
        title: "Disposal reliability ≥ 0.9",
        summary:
          "ESA missions shall demonstrate ≥ 0.9 probability of successful post-mission disposal at end-of-life-confirmation milestone.",
      },
      {
        section: "Tailoring §4.4",
        title: "Casualty-risk threshold 10⁻⁴",
        summary:
          "Aggregated casualty risk for any uncontrolled re-entry shall not exceed 10⁻⁴; for higher risks, controlled re-entry into SPOUA (South-Pacific Ocean Uninhabited Area) is mandatory.",
      },
    ],
    related_sources: ["INT-ISO-24113-2023", "INT-IADC-MITIGATION-2020"],
    last_verified: "2026-04-27",
  },

  // ─── Verified additions: ESA + ITU debris/STM stack ────────────────
  // Each entry below has a confirmed official reference number and a
  // working public URL on the issuing organisation's domain.

  {
    id: "INT-ESA-SDM-POLICY-2014",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA Space Debris Mitigation Policy for Agency Projects",
    date_published: "2014-03-28",
    official_reference: "ESA/ADMIN/IPOL(2014)2",
    source_url:
      "https://technology.esa.int/page/esa-space-debris-mitigation-policy-for-agency-projects",
    issuing_body: "European Space Agency — Director General",
    competent_authorities: [],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "ESA's binding internal debris-mitigation policy for all Agency projects, contracts, and partnerships. Mandates compliance with ECSS-U-AS-10C (and therefore ISO 24113) for every ESA mission, plus Agency-specific tailoring on disposal-reliability evidence, casualty-risk thresholds, and the SPOUA controlled-re-entry corridor. The policy delegated detailed technical requirements to the ECSS framework, making ECSS-U-AS-10C the operative standard for ESA-funded missions.",
    key_provisions: [
      {
        section: "§4",
        title: "Compliance with ECSS-U-AS-10C",
        summary:
          "All ESA projects shall comply with ECSS-U-AS-10C (which adopts ISO 24113) and demonstrate compliance through the project's debris-mitigation documentation.",
      },
      {
        section: "§5",
        title: "Tailoring authority",
        summary:
          "Project-specific tailoring is permitted only with formal Director-of-Programme approval; deviations must be documented and risk-justified.",
      },
    ],
    related_sources: [
      "INT-ECSS-U-AS-10C",
      "INT-ISO-24113-2023",
      "INT-IADC-MITIGATION-2020",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-ITU-RES-35",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "ITU-R Resolution 35 (WRC-19) — Milestone-based deployment of NGSO satellite systems in specific frequency bands and services",
    date_published: "2019-11-22",
    official_reference: "Resolution 35 (WRC-19)",
    source_url:
      "https://www.itu.int/dms_pub/itu-r/oth/0c/0a/R0C0A00000B0001PDFE.pdf",
    issuing_body:
      "International Telecommunication Union — World Radiocommunication Conference 2019",
    competent_authorities: ["INT-ITU"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["frequency_spectrum", "debris_mitigation"],
    scope_description:
      "Adopted at WRC-19, Resolution 35 imposes binding deployment milestones on NGSO satellite networks in specific frequency bands: at least 10% of the network deployed within 2 years of the Bringing-Into-Use date, 50% within 5 years, and 100% within 7 years. Failure to meet a milestone triggers a proportional reduction of the recorded number of satellites in the Master International Frequency Register (MIFR). Constrains constellation deployment timelines and reinforces debris-mitigation discipline by penalising paper-only filings.",
    key_provisions: [
      {
        section: "Resolves 1",
        title: "Three-stage deployment milestones",
        summary:
          "Milestone 1 (≥10% deployed) within 2 years of BIU; Milestone 2 (≥50%) within 5 years; Milestone 3 (≥100%) within 7 years.",
      },
      {
        section: "Resolves 2",
        title: "MIFR consequence of non-compliance",
        summary:
          "Failure to meet a milestone reduces the recorded number of satellites in the MIFR to the actual number deployed at that milestone date.",
        complianceImplication:
          "Operators of NGSO constellations must align deployment cadence with the milestone schedule or accept a permanent reduction of their ITU-recorded fleet — directly affects the lifetime spectrum-rights envelope.",
      },
    ],
    related_sources: ["INT-ITU-CONST", "INT-ITU-RR", "INT-ITU-WRC-23"],
    last_verified: "2026-04-27",
  },

  // ─── Verified additions: Environmental + STM tranche ──────────────

  {
    id: "INT-AARHUS-1998",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Aarhus Convention on Access to Information, Public Participation in Decision-making and Access to Justice in Environmental Matters",
    date_enacted: "1998-06-25",
    date_in_force: "2001-10-30",
    un_reference: "UN ECE Treaty Series No. 7",
    source_url:
      "https://unece.org/environment-policy/public-participation/aarhus-convention/text",
    issuing_body: "United Nations Economic Commission for Europe (UNECE)",
    competent_authorities: ["INT-UNOOSA"],
    relevance_level: "high",
    applicable_to: ["launch_provider", "satellite_operator"],
    compliance_areas: ["environmental"],
    scope_description:
      "UNECE convention granting the public three procedural rights in environmental matters: (1) access to environmental information held by public authorities, (2) participation in environmental decision-making, (3) access to justice for review of environmental decisions. Ratified by all EU Member States and the EU itself (Decision 2005/370/EC). Determines the procedural surface for spaceport licensing and launch-corridor environmental review across Europe — public-consultation obligations under EU EIA, Habitats, and national permitting regimes are Aarhus-grounded.",
    key_provisions: [
      {
        section: "Art. 4-5",
        title: "Access to environmental information",
        summary:
          "Public authorities shall make environmental information available on request and proactively disseminate certain categories of information.",
      },
      {
        section: "Art. 6",
        title: "Public participation in specific activities",
        summary:
          "Annex I activities (covering large industrial installations and certain transport infrastructure) require early and effective public participation in the permitting decision.",
      },
      {
        section: "Art. 9",
        title: "Access to justice",
        summary:
          "Members of the public must have standing to challenge alleged violations of national environmental law and the substantive and procedural legality of permitting decisions.",
      },
    ],
    applies_to_jurisdictions: [
      "AT",
      "BE",
      "CZ",
      "DE",
      "DK",
      "EE",
      "ES",
      "FI",
      "FR",
      "GR",
      "HR",
      "HU",
      "IE",
      "IT",
      "LT",
      "LU",
      "LV",
      "NL",
      "NO",
      "PL",
      "PT",
      "RO",
      "SE",
      "SI",
      "SK",
      "UK",
    ],
    related_sources: [],
    last_verified: "2026-04-27",
  },

  {
    id: "INT-SDA",
    jurisdiction: "INT",
    type: "policy_document",
    status: "in_force",
    title_en:
      "Space Data Association (SDA) — Industry Best Practices and Operational Procedures",
    date_published: "2009-07-01",
    official_reference: "SDA Founding Charter (2009); SDA Operational Manual",
    source_url: "https://www.space-data.org/sda/",
    issuing_body: "Space Data Association (industry consortium)",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["space_traffic_management", "debris_mitigation"],
    scope_description:
      "Voluntary industry consortium for sharing operational data among GEO and increasingly LEO operators. Founded 2009 by Inmarsat, Intelsat, and SES; membership has grown to include most major commercial GEO operators plus several LEO constellation operators. SDA's Space Data Center (SDC) provides member-to-member orbital-data exchange, conjunction-assessment products, and RFI (radio-frequency-interference) mitigation services. Increasingly cited in NCA guidance as a best-practice reference for inter-operator coordination.",
    key_provisions: [
      {
        section: "SDC service",
        title: "Bilateral conjunction-data exchange",
        summary:
          "Members share precision orbital data via the Space Data Center; conjunction analyses use member-supplied data rather than public-catalogue data, reducing covariance and improving Pc accuracy.",
      },
      {
        section: "RFI service",
        title: "Radio-frequency interference reporting",
        summary:
          "Members report RFI events; SDA coordinates investigation and source identification across operator boundaries.",
      },
    ],
    related_sources: ["INT-CCSDS-CDM-508", "INT-IADC-MITIGATION-2025"],
    last_verified: "2026-04-27",
  },
];
