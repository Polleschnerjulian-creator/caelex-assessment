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
];
