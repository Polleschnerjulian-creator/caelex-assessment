// src/data/legal-sources/sources/nl.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Netherlands space law sources — complete legal framework for jurisdiction NL.
 *
 * Sources: wetten.overheid.nl, officielebekendmakingen.nl, spaceoffice.nl
 * Last verified: 2026-04-09
 *
 * Notable: Netherlands is the ONLY major space-faring nation to have ratified
 * ALL 5 UN space treaties including the Moon Agreement (1983).
 * Hosts ESTEC (ESA's largest facility, Noordwijk).
 * Originates the Wassenaar Arrangement and Hague Code of Conduct.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── NL Authorities (15) ──────────────────────────────────────────

export const AUTHORITIES_NL: Authority[] = [
  {
    id: "NL-NSO",
    jurisdiction: "NL",
    name_en: "Netherlands Space Office",
    name_local: "Netherlands Space Office",
    abbreviation: "NSO",
    website: "https://www.spaceoffice.nl",
    space_mandate:
      "National space agency and primary contact for space activities licensing under the WRA 2007. Manages the Dutch space programme, ESA delegation, and international cooperation. Maintains the national registry of space objects (dual-part: operational + decommissioned).",
    legal_basis: "Wet ruimtevaartactiviteiten (WRA) 2007",
    applicable_areas: ["licensing", "registration", "debris_mitigation"],
  },
  {
    id: "NL-EZK",
    jurisdiction: "NL",
    name_en: "Ministry of Economic Affairs and Climate Policy",
    name_local: "Ministerie van Economische Zaken en Klimaat",
    abbreviation: "EZK",
    website:
      "https://www.rijksoverheid.nl/ministeries/ministerie-van-economische-zaken-en-klimaat",
    space_mandate:
      "Lead ministry for space policy. Issues licences under the WRA 2007. Responsible for the national space strategy and ESA ministerial council decisions. Space policy coordination through the Interdepartmental Commission on Space (ICR).",
    applicable_areas: ["licensing"],
  },
  {
    id: "NL-RDI",
    jurisdiction: "NL",
    name_en: "National Inspectorate for Digital Infrastructure",
    name_local: "Rijksinspectie Digitale Infrastructuur",
    abbreviation: "RDI",
    website: "https://www.rdi.nl",
    space_mandate:
      "Spectrum management and radio frequency coordination for satellite services. Formerly Agentschap Telecom. National frequency regulator responsible for ITU filings and coordination of satellite frequency assignments under the Telecommunicatiewet.",
    legal_basis: "Telecommunicatiewet",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "NL-NCSC",
    jurisdiction: "NL",
    name_en: "National Cyber Security Centre",
    name_local: "Nationaal Cyber Security Centrum",
    abbreviation: "NCSC",
    website: "https://www.ncsc.nl",
    space_mandate:
      "Cybersecurity authority for critical infrastructure including space systems. Coordinates NIS2 implementation. Central point for cyber incident response. Under the Cyberbeveiligingswet (Cbw) once enacted, NCSC responsibilities expand to cover space as essential service sector.",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "NL-AP",
    jurisdiction: "NL",
    name_en: "Dutch Data Protection Authority",
    name_local: "Autoriteit Persoonsgegevens",
    abbreviation: "AP",
    website: "https://www.autoriteitpersoonsgegevens.nl",
    space_mandate:
      "GDPR/AVG enforcement for space data processing. Supervises Earth observation operators and satellite data providers handling personal data. Enforces the Uitvoeringswet AVG (UAVG).",
    legal_basis: "Uitvoeringswet Algemene verordening gegevensbescherming",
    applicable_areas: ["data_security"],
  },
  {
    id: "NL-CDIU",
    jurisdiction: "NL",
    name_en: "Central Import & Export Service",
    name_local: "Centrale Dienst voor In- en Uitvoer",
    abbreviation: "CDIU",
    website:
      "https://www.belastingdienst.nl/wps/wcm/connect/nl/douane_voor_bedrijven/content/centrale-dienst-voor-in-en-uitvoer",
    space_mandate:
      "Export control licensing for dual-use goods and defence products under the Wet strategische goederen (Wsg). Issues export licences for satellite components, encryption technology, and space-related items on the EU dual-use list and Wassenaar Arrangement control lists.",
    legal_basis: "Wet strategische goederen (Wsg)",
    applicable_areas: ["export_control"],
  },
  {
    id: "NL-DEFENCE",
    jurisdiction: "NL",
    name_en: "Ministry of Defence",
    name_local: "Ministerie van Defensie",
    abbreviation: "DEF",
    website: "https://www.defensie.nl",
    space_mandate:
      "Military space operations and NATO Space Centre of Excellence (proposed The Hague). Operates the Defence Space Command (Defensie Space Commando). Coordinates military satellite communications and space situational awareness.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "NL-BZ",
    jurisdiction: "NL",
    name_en: "Ministry of Foreign Affairs",
    name_local: "Ministerie van Buitenlandse Zaken",
    abbreviation: "BZ",
    website:
      "https://www.rijksoverheid.nl/ministeries/ministerie-van-buitenlandse-zaken",
    space_mandate:
      "International space diplomacy and treaty negotiations. Netherlands representation at UN COPUOS. Administers the Hague Code of Conduct against Ballistic Missile Proliferation (HCoC) — The Hague is the depositary city.",
    applicable_areas: ["licensing"],
  },
  {
    id: "NL-IenW",
    jurisdiction: "NL",
    name_en: "Ministry of Infrastructure and Water Management",
    name_local: "Ministerie van Infrastructuur en Waterstaat",
    abbreviation: "IenW",
    website:
      "https://www.rijksoverheid.nl/ministeries/ministerie-van-infrastructuur-en-waterstaat",
    space_mandate:
      "Environmental regulation for launch and re-entry activities under the Wet milieubeheer (Wm). Responsible for environmental impact assessments for space infrastructure. KNMI operates under this ministry.",
    applicable_areas: ["environmental"],
  },
  {
    id: "NL-KNMI",
    jurisdiction: "NL",
    name_en: "Royal Netherlands Meteorological Institute",
    name_local: "Koninklijk Nederlands Meteorologisch Instituut",
    abbreviation: "KNMI",
    website: "https://www.knmi.nl",
    space_mandate:
      "National meteorological and seismological service. Operates Copernicus Climate Change Service (C3S) and manages Dutch Earth observation satellite data. Provides space weather monitoring relevant to satellite operations.",
    parent_ministry: "Ministry of Infrastructure and Water Management",
    applicable_areas: ["environmental"],
  },
  {
    id: "NL-BTI",
    jurisdiction: "NL",
    name_en: "Bureau for Investment Screening",
    name_local: "Bureau Toetsing Investeringen",
    abbreviation: "BTI",
    website: "https://www.bureautoetsinginvesteringen.nl",
    space_mandate:
      "Foreign investment screening for sensitive technologies under the Wet veiligheidstoets investeringen, fusies en overnames (Vifo). Space technology classified as sensitive — acquisitions of Dutch space companies by non-EU investors subject to mandatory screening.",
    legal_basis:
      "Wet veiligheidstoets investeringen, fusies en overnames (Vifo)",
    applicable_areas: ["licensing", "military_dual_use"],
  },
  {
    id: "NL-ILT",
    jurisdiction: "NL",
    name_en: "Human Environment and Transport Inspectorate",
    name_local: "Inspectie Leefomgeving en Transport",
    abbreviation: "ILT",
    website: "https://www.ilent.nl",
    space_mandate:
      "Environmental enforcement and transport safety inspectorate. Enforces environmental regulations applicable to space launch and ground infrastructure. Inspects compliance with Wet milieubeheer requirements for space-related facilities.",
    applicable_areas: ["environmental"],
  },
  {
    id: "NL-TUDELFT",
    jurisdiction: "NL",
    name_en:
      "Delft University of Technology — Faculty of Aerospace Engineering",
    name_local:
      "Technische Universiteit Delft — Faculteit Luchtvaart- en Ruimtevaarttechniek",
    abbreviation: "TU Delft",
    website: "https://www.tudelft.nl/lr",
    space_mandate:
      "Leading European aerospace research university. Operates the Delfi programme (student satellites). Faculty of Aerospace Engineering is the largest in Europe. Key contributor to Dutch space technology development and ESA programmes.",
    applicable_areas: ["licensing"],
  },
  {
    id: "NL-ESTEC",
    jurisdiction: "NL",
    name_en: "European Space Research and Technology Centre (ESA)",
    name_local: "European Space Research and Technology Centre",
    abbreviation: "ESTEC",
    website: "https://www.esa.int/About_Us/ESTEC",
    space_mandate:
      "ESA's largest establishment, located in Noordwijk. Primary technology development and test centre for ESA. Hosts the ESTEC Test Centre (largest satellite test facility in Europe). Governed by the ESA/Netherlands Headquarters Agreement — grants ESA privileges and immunities on Dutch territory.",
    applicable_areas: ["licensing"],
  },
  {
    id: "NL-ACM",
    jurisdiction: "NL",
    name_en: "Authority for Consumers and Markets",
    name_local: "Autoriteit Consument & Markt",
    abbreviation: "ACM",
    website: "https://www.acm.nl",
    space_mandate:
      "Market regulation and competition authority. Oversees telecommunications market including satellite communications services. Enforces the Telecommunicatiewet alongside RDI for market regulation aspects.",
    legal_basis: "Telecommunicatiewet",
    applicable_areas: ["frequency_spectrum"],
  },
];

// ─── International Treaties (NL-specific entries, 5) ──────────────
// NOTE: Netherlands ratified ALL 5 UN space treaties — unique among major space nations

const TREATIES_NL: LegalSource[] = [
  {
    id: "NL-OST-1967",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Netherlands Ratification Record",
    title_local:
      "Verdrag inzake de beginselen waaraan de activiteiten van Staten zijn onderworpen bij het onderzoek en gebruik van de kosmische ruimte",
    date_enacted: "1967-02-10",
    date_in_force: "1969-10-10",
    official_reference: "Trb. 1967, 20",
    source_url: "https://wetten.overheid.nl/BWBV0004862",
    issuing_body: "United Nations / Staten-Generaal",
    competent_authorities: ["NL-BZ", "NL-EZK"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "The Netherlands bears international responsibility for all national space activities including by non-governmental entities. This is the constitutional foundation of the WRA 2007.",
        complianceImplication:
          "Art. VI is the direct legal basis for the Dutch licensing regime under the WRA 2007. Every Dutch space operator must be licensed because the Netherlands bears responsibility under this article.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "The Netherlands is a 'launching State' for objects launched from its territory or by Dutch entities. This drives the liability provisions in WRA 2007 Chapter 4.",
      },
      {
        section: "Art. VIII",
        title: "Registration and jurisdiction",
        summary:
          "A State on whose registry a space object is entered retains jurisdiction and control. The Netherlands maintains a dual-part registry (operational + decommissioned) under the WRA 2007.",
      },
    ],
    related_sources: [
      "NL-WRA-2007",
      "NL-LIABILITY-1972",
      "NL-REGISTRATION-1975",
      "NL-RESCUE-1968",
      "NL-MOON-1979",
    ],
    notes: [
      "Netherlands signed 10 February 1967 — one of the earliest signatories. Ratified 10 October 1969.",
      "Trb. 1967, 20 — published in the Tractatenblad.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-RESCUE-1968",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Rescue Agreement — Netherlands Ratification Record",
    title_local:
      "Overeenkomst inzake de redding van ruimtevaarders, de terugkeer van ruimtevaarders en de teruggave van in de kosmische ruimte gelanceerde voorwerpen",
    date_enacted: "1968-04-22",
    date_in_force: "1969-12-24",
    official_reference: "Trb. 1968, 67",
    source_url: "https://wetten.overheid.nl/BWBV0004569",
    issuing_body: "United Nations / Staten-Generaal",
    competent_authorities: ["NL-BZ"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "Rescue and return of astronauts",
        summary:
          "Contracting parties shall notify, rescue, and return astronauts who land in their territory. The Netherlands RATIFIED this treaty (unlike Luxembourg which only signed).",
      },
      {
        section: "Art. 5",
        title: "Return of space objects",
        summary:
          "Space objects found in the territory of a contracting party shall be returned to the launching State. Recovery costs reimbursed by the launching authority.",
      },
    ],
    related_sources: ["NL-OST-1967", "NL-WRA-2007"],
    notes: [
      "Netherlands ratified the Rescue Agreement — full treaty obligations apply.",
      "Trb. 1968, 67.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-LIABILITY-1972",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Netherlands Ratification Record",
    title_local:
      "Verdrag inzake de internationale aansprakelijkheid voor schade veroorzaakt door ruimtevoorwerpen",
    date_enacted: "1972-03-29",
    date_in_force: "1981-03-26",
    official_reference: "Trb. 1974, 11",
    source_url: "https://wetten.overheid.nl/BWBV0003725",
    issuing_body: "United Nations / Staten-Generaal",
    competent_authorities: ["NL-BZ", "NL-EZK"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "The Netherlands as launching State is absolutely liable for damage caused by its space objects on the surface of the Earth. Drives the liability regime in WRA 2007 Chapter 4.",
        complianceImplication:
          "WRA 2007 implements a flexible liability regime — no fixed statutory cap. The Minister sets liability limits case-by-case in the licence conditions. This is more flexible than the German or French approach.",
      },
      {
        section: "Art. III",
        title: "Fault-based liability in space",
        summary:
          "For damage caused elsewhere than the Earth's surface, the launching State is liable only if damage is due to its fault or the fault of persons for whom it is responsible.",
      },
    ],
    related_sources: ["NL-OST-1967", "NL-WRA-2007"],
    notes: [
      "Netherlands ratified 26 March 1981.",
      "Trb. 1974, 11.",
      "The flexible liability regime in WRA 2007 (no fixed cap, case-by-case) contrasts with the strict approach of Luxembourg (unlimited, no backstop) and France (EUR 60M cap).",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-REGISTRATION-1975",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Netherlands Ratification Record",
    title_local:
      "Verdrag nopens de registratie van in de kosmische ruimte gelanceerde voorwerpen",
    date_enacted: "1975-01-14",
    date_in_force: "1981-03-26",
    official_reference: "Trb. 1976, 38",
    source_url: "https://wetten.overheid.nl/BWBV0003900",
    issuing_body: "United Nations / Staten-Generaal",
    competent_authorities: ["NL-NSO", "NL-BZ"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "The Netherlands must maintain a national registry of space objects. Implemented through WRA 2007 Chapter 5 and the Besluit Register Ruimtevoorwerpen — a unique dual-part registry (operational + decommissioned objects).",
        complianceImplication:
          "All space objects for which the Netherlands bears international responsibility must be registered with the NSO. The dual-part registry is a Dutch innovation.",
      },
    ],
    related_sources: ["NL-OST-1967", "NL-WRA-2007", "NL-REGISTRY-DECREE"],
    notes: [
      "Netherlands ratified 26 March 1981.",
      "Trb. 1976, 38.",
      "Dutch registry is dual-part: operational objects and decommissioned objects — a unique approach.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-MOON-1979",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Moon Agreement — Netherlands Ratification Record",
    title_local:
      "Overeenkomst ter regeling van de activiteiten van Staten op de maan en andere hemellichamen",
    date_enacted: "1979-12-18",
    date_in_force: "1984-07-11",
    date_last_amended: "1983-02-17",
    official_reference: "Trb. 1980, 21",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html",
    issuing_body: "United Nations / Staten-Generaal",
    competent_authorities: ["NL-BZ"],
    relevance_level: "high",
    applicable_to: ["space_resource_operator", "all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 11(1)",
        title: "Common heritage of mankind",
        summary:
          "The Moon and its natural resources are the common heritage of mankind. No State shall claim sovereignty over celestial bodies.",
        complianceImplication:
          "The Netherlands is BOUND by the common heritage principle — unlike the US, Luxembourg, and most other space nations. Dutch space resource operators face unique legal constraints.",
      },
      {
        section: "Art. 11(5)",
        title: "International regime for exploitation",
        summary:
          "An international regime shall be established to govern the exploitation of natural resources of the Moon when such exploitation becomes feasible.",
      },
      {
        section: "Art. 6(2)",
        title: "Scientific samples permitted",
        summary:
          "Samples of lunar minerals and substances may be collected and removed for scientific purposes. Larger-scale resource extraction requires the Art. 11(5) international regime.",
      },
    ],
    scope_description:
      "The Netherlands is one of only 18 parties to the Moon Agreement and the ONLY major space-faring nation to have ratified it (17 February 1983). This creates a unique tension: NL signed the Artemis Accords (2024) despite the Moon Agreement's common heritage principle potentially conflicting with Artemis Section 10 (space resources). The Dutch government's position is that these instruments are complementary rather than contradictory.",
    related_sources: ["NL-OST-1967", "NL-WRA-2007", "NL-HAGUE-BUILDING-BLOCKS"],
    notes: [
      "Netherlands ratified 17 February 1983 — one of the original parties.",
      "ONLY major space-faring nation to have ratified the Moon Agreement.",
      "Creates unique tension with the Artemis Accords (signed 2024) — NL position is that they are complementary.",
      "Trb. 1980, 21.",
      "Only 18 parties globally as of 2026 — the Moon Agreement is widely considered a diplomatic failure, but NL ratification is legally binding.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Primary National Legislation (1 — THE CORE) ─────────────────

const PRIMARY_LEGISLATION_NL: LegalSource[] = [
  {
    id: "NL-WRA-2007",
    jurisdiction: "NL",
    type: "federal_law",
    status: "in_force",
    title_en: "Space Activities Act (Wet ruimtevaartactiviteiten — WRA)",
    title_local: "Wet ruimtevaartactiviteiten",
    date_enacted: "2006-12-14",
    date_in_force: "2007-01-01",
    official_reference: "Stb. 2006, 580 / Stb. 2007, 12",
    source_url: "https://wetten.overheid.nl/BWBR0021418",
    issuing_body: "Staten-Generaal",
    competent_authorities: ["NL-EZK", "NL-NSO"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
    ],
    key_provisions: [
      {
        section: "§ 2 (Art. 3)",
        title: "Licensing requirement",
        summary:
          "It is prohibited to carry out space activities from the territory of the Netherlands or from ships or aircraft registered in the Netherlands without a licence from the Minister of Economic Affairs.",
        complianceImplication:
          "All space activities attributable to the Netherlands require a licence. The territorial and registration link determines Dutch jurisdiction.",
      },
      {
        section: "§ 2 (Art. 3a)",
        title: "Extension to command and control",
        summary:
          "The licensing requirement extends to command and control activities over space objects from Dutch territory, even if the object was launched elsewhere.",
        complianceImplication:
          "Ground segment operators commanding foreign-launched satellites from the Netherlands also require a WRA licence — broad jurisdictional reach.",
      },
      {
        section: "§ 3 (Art. 7-9)",
        title: "Registration — dual-part registry",
        summary:
          "Space objects must be registered in the national registry maintained by the NSO. The registry has two parts: operational objects and decommissioned objects. Transfer of control triggers re-registration obligations.",
        complianceImplication:
          "The dual-part registry is a Dutch innovation. Decommissioned objects remain tracked — relevant for debris mitigation compliance.",
      },
      {
        section: "§ 4 (Art. 10-11)",
        title: "Liability — flexible regime, no fixed cap",
        summary:
          "Operators are liable for damage caused by their space activities. The State has a right of recourse against the operator. There is NO fixed statutory liability cap — the Minister sets liability limits on a case-by-case basis in the licence conditions.",
        complianceImplication:
          "The flexible liability regime is a key differentiator. Unlike Germany (no cap), France (EUR 60M), or Luxembourg (unlimited, no backstop), the Netherlands determines liability limits per licence. This creates both opportunity and uncertainty.",
      },
      {
        section: "§ 5 (Art. 12-14)",
        title: "Supervision and enforcement",
        summary:
          "The Minister may impose administrative penalties (last onder bestuursdwang, dwangsom) for non-compliance. Licence conditions may include insurance requirements, debris mitigation obligations, and operational restrictions.",
        complianceImplication:
          "Administrative enforcement regime — fines and coercive measures. Less severe than the criminal sanctions in Luxembourg or France.",
      },
      {
        section: "§ 6 (Art. 15-17)",
        title: "Criminal provisions",
        summary:
          "Conducting space activities without a licence is a criminal offence (economisch delict). Maximum fine of the fourth category (EUR 25,750 as of 2026).",
        complianceImplication:
          "Criminal sanctions are relatively modest compared to Luxembourg (EUR 1.25M) or France (EUR 200K + imprisonment). Classified as an economic offence under the Wet op de economische delicten.",
      },
      {
        section: "§ 7 (Art. 18-28)",
        title: "Transitional and final provisions",
        summary:
          "Existing operators had transitional period to obtain licences. The law entered into force on 1 January 2007 (Stb. 2007, 12).",
      },
    ],
    scope_description:
      "One of Europe's earliest comprehensive space laws (enacted 2006, in force 2007). 28 sections across 7 chapters. Covers licensing, registration, liability, supervision, and criminal provisions. Notable features: command-and-control jurisdiction extension, dual-part registry, flexible case-by-case liability limits, and relatively modest criminal sanctions.",
    related_sources: [
      "NL-OST-1967",
      "NL-LIABILITY-1972",
      "NL-REGISTRATION-1975",
      "NL-WRA-DECREE-2008",
      "NL-WRA-REGULATION-2008",
      "NL-REGISTRY-DECREE",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "One of Europe's earliest comprehensive space laws — predates the French LOS 2008, UK Space Industry Act 2018, and Luxembourg's 2017/2020 laws.",
      "Stb. 2006, 580 (Royal Decree) / Stb. 2007, 12 (entry into force).",
      "Unique dual-part registry: operational objects + decommissioned objects.",
      "Flexible liability: no fixed cap, case-by-case in licence conditions — most nuanced approach in Europe.",
      "Art. 3a extends jurisdiction to command-and-control from Dutch territory — broad reach.",
      "Review recommended: the government has indicated potential modernization to address mega-constellations and in-orbit servicing.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Implementing Legislation (3) ────────────────────────────────

const IMPLEMENTING_LEGISLATION_NL: LegalSource[] = [
  {
    id: "NL-WRA-DECREE-2008",
    jurisdiction: "NL",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Activities Decree (Besluit ruimtevaartactiviteiten)",
    title_local: "Besluit ruimtevaartactiviteiten",
    date_enacted: "2008-02-13",
    date_in_force: "2008-03-01",
    official_reference: "Stb. 2008, 52",
    source_url: "https://wetten.overheid.nl/BWBR0023440",
    issuing_body: "Kroon (Council of State advice)",
    competent_authorities: ["NL-EZK", "NL-NSO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "insurance", "debris_mitigation"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Licence application requirements",
        summary:
          "Detailed requirements for licence applications: technical documentation, financial capacity proof, insurance arrangements, debris mitigation plans, and operator competence. Specifies the information that must be provided with a WRA licence application.",
        complianceImplication:
          "Operators must provide comprehensive documentation. The decree operationalizes the WRA 2007 licensing requirements with specific technical and financial criteria.",
      },
    ],
    related_sources: ["NL-WRA-2007", "NL-WRA-REGULATION-2008"],
    notes: ["Stb. 2008, 52 — primary implementing decree for the WRA 2007."],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-WRA-REGULATION-2008",
    jurisdiction: "NL",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Space Activities Regulation (Regeling ruimtevaartactiviteiten)",
    title_local: "Regeling ruimtevaartactiviteiten",
    date_enacted: "2008-02-07",
    date_in_force: "2008-03-01",
    official_reference: "Stcrt. 2008, 27",
    source_url: "https://wetten.overheid.nl/BWBR0023443",
    issuing_body: "Minister van Economische Zaken",
    competent_authorities: ["NL-EZK", "NL-NSO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "debris_mitigation"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Ministerial regulation — application forms and procedures",
        summary:
          "Detailed ministerial regulation specifying application forms, procedural requirements, licence conditions, and technical standards for space activities. Includes debris mitigation guidelines and operational safety requirements.",
        complianceImplication:
          "The regulation provides the practical detail operators need for licence applications. Debris mitigation requirements reflect IADC guidelines.",
      },
    ],
    related_sources: ["NL-WRA-2007", "NL-WRA-DECREE-2008"],
    notes: ["Stcrt. 2008, 27 — ministerial regulation under the WRA 2007."],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-REGISTRY-DECREE",
    jurisdiction: "NL",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Space Objects Registry Decree (Besluit Register Ruimtevoorwerpen)",
    title_local: "Besluit Register Ruimtevoorwerpen",
    date_enacted: "2008-02-13",
    date_in_force: "2008-03-01",
    official_reference: "Stb. 2008, 53",
    source_url: "https://wetten.overheid.nl/BWBR0023441",
    issuing_body: "Kroon (Council of State advice)",
    competent_authorities: ["NL-NSO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "National registry — dual-part structure",
        summary:
          "Establishes the detailed structure and operation of the national registry of space objects. Two parts: Part A (operational space objects) and Part B (decommissioned space objects). Specifies data fields, registration procedures, and UN notification requirements.",
        complianceImplication:
          "Operators must provide launch data, orbital parameters, and decommissioning plans for registration. Transfer of control triggers re-registration. The dual-part structure ensures lifetime tracking.",
      },
    ],
    related_sources: ["NL-WRA-2007", "NL-REGISTRATION-1975"],
    notes: [
      "Stb. 2008, 53 — implements WRA Chapter 5 and the Registration Convention.",
      "Part A: operational objects. Part B: decommissioned objects — Dutch innovation in space object tracking.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Telecommunications (1) ──────────────────────────────────────

const TELECOM_NL: LegalSource[] = [
  {
    id: "NL-TW-2004",
    jurisdiction: "NL",
    type: "federal_law",
    status: "in_force",
    title_en: "Telecommunications Act (Telecommunicatiewet)",
    title_local: "Telecommunicatiewet",
    date_enacted: "2004-04-22",
    date_last_amended: "2025-01-01",
    official_reference: "Stb. 2004, 189",
    source_url: "https://wetten.overheid.nl/BWBR0009950",
    issuing_body: "Staten-Generaal",
    competent_authorities: ["NL-RDI", "NL-ACM"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Ch. 3",
        title: "Radio frequency management",
        summary:
          "RDI (formerly Agentschap Telecom) manages radio frequency allocation and satellite frequency coordination. Includes ITU filing obligations and interference management for satellite services.",
        complianceImplication:
          "Satellite operators using Dutch-filed frequencies require RDI spectrum authorization. All ITU coordination procedures run through RDI.",
      },
    ],
    related_sources: ["NL-WRA-2007"],
    notes: [
      "Stb. 2004, 189 — comprehensive telecommunications framework.",
      "RDI (formerly Agentschap Telecom) handles satellite frequency coordination.",
      "Multiple amendments — most recent incorporates EU Electronic Communications Code.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Export Control (1) ──────────────────────────────────────────

const EXPORT_CONTROL_NL: LegalSource[] = [
  {
    id: "NL-WSG-2012",
    jurisdiction: "NL",
    type: "federal_law",
    status: "in_force",
    title_en: "Strategic Goods Act (Wet strategische goederen — Wsg)",
    title_local: "Wet strategische goederen",
    date_enacted: "2012-01-01",
    official_reference: "Stb. 2011, 595",
    source_url: "https://wetten.overheid.nl/BWBR0030842",
    issuing_body: "Staten-Generaal",
    competent_authorities: ["NL-CDIU"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Dual-use and defence export control",
        summary:
          "Implements EU Dual-Use Regulation (EU 2021/821) and national defence export controls. CDIU is the competent authority for all export licensing decisions. Includes Wassenaar Arrangement control lists — the Wassenaar Arrangement itself is headquartered in The Hague.",
        complianceImplication:
          "Satellite components, encryption technology, and space-related items require CDIU export authorization. The Netherlands has particular significance as the host of the Wassenaar Arrangement Secretariat.",
      },
    ],
    related_sources: ["NL-WRA-2007"],
    notes: [
      "Stb. 2011, 595.",
      "The Wassenaar Arrangement on Export Controls for Conventional Arms and Dual-Use Goods and Technologies is headquartered in The Hague — the Netherlands plays a central role in the global export control regime.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Cybersecurity (2) ───────────────────────────────────────────

const CYBERSECURITY_NL: LegalSource[] = [
  {
    id: "NL-WBNI-2018",
    jurisdiction: "NL",
    type: "federal_law",
    status: "in_force",
    title_en: "Network and Information Systems Security Act (Wbni)",
    title_local: "Wet beveiliging netwerk- en informatiesystemen",
    date_enacted: "2018-11-09",
    date_in_force: "2018-11-09",
    official_reference: "Stb. 2018, 387",
    source_url: "https://wetten.overheid.nl/BWBR0041515",
    issuing_body: "Staten-Generaal",
    competent_authorities: ["NL-NCSC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS1 Directive transposition",
        summary:
          "Transposes the NIS1 Directive (EU 2016/1148) into Dutch law. Establishes cybersecurity obligations for operators of essential services (AED — aanbieders van essentiële diensten) and digital service providers. NCSC as the central coordination point.",
        complianceImplication:
          "Space operators classified as essential services must comply with security and incident reporting requirements. Currently applicable pending NIS2 transposition.",
      },
    ],
    related_sources: ["NL-CBW-NIS2"],
    notes: [
      "Stb. 2018, 387.",
      "Currently applicable — NIS2 transposition (Cbw) in progress.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-CBW-NIS2",
    jurisdiction: "NL",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Cybersecurity Act (Cyberbeveiligingswet — Cbw) — NIS2 Transposition",
    title_local: "Cyberbeveiligingswet",
    date_published: "2024-05-01",
    source_url: "https://www.internetconsultatie.nl/cyberbeveiligingswet",
    issuing_body: "Staten-Generaal",
    competent_authorities: ["NL-NCSC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full draft",
        title: "NIS2 Directive transposition",
        summary:
          "Draft law transposing the NIS2 Directive (EU 2022/2555). Space sector explicitly included as an essential service sector. Enhanced cybersecurity obligations, mandatory incident reporting, and supply chain security requirements. NCSC responsibilities expanded.",
        complianceImplication:
          "Space operators will face significantly enhanced cybersecurity obligations under the Cbw. The Netherlands missed the 17 October 2024 transposition deadline. Operators should prepare proactively.",
      },
    ],
    related_sources: ["NL-WBNI-2018"],
    notes: [
      "Netherlands missed the 17 October 2024 NIS2 transposition deadline.",
      "Internet consultation completed May 2024. Parliamentary process ongoing.",
      "Wbni remains applicable until the Cbw enters into force.",
      "Space explicitly included as essential service sector — expanded scope compared to NIS1.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Data Protection (1) ─────────────────────────────────────────

const DATA_PROTECTION_NL: LegalSource[] = [
  {
    id: "NL-UAVG-2018",
    jurisdiction: "NL",
    type: "federal_law",
    status: "in_force",
    title_en: "GDPR Implementation Act (Uitvoeringswet AVG — UAVG)",
    title_local: "Uitvoeringswet Algemene verordening gegevensbescherming",
    date_enacted: "2018-05-16",
    date_in_force: "2018-05-25",
    official_reference: "Stb. 2018, 144",
    source_url: "https://wetten.overheid.nl/BWBR0040940",
    issuing_body: "Staten-Generaal",
    competent_authorities: ["NL-AP"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator", "all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "GDPR national implementation",
        summary:
          "Implements GDPR into Dutch law. Establishes the Autoriteit Persoonsgegevens (AP) as the national data protection authority. Specific provisions on processing of special categories of data and derogations.",
        complianceImplication:
          "Earth observation operators and satellite data providers processing personal data must comply with GDPR via the UAVG framework. Particularly relevant for high-resolution EO imagery.",
      },
    ],
    related_sources: [],
    notes: [
      "Stb. 2018, 144 — entered into force simultaneously with GDPR on 25 May 2018.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Environmental (1) ──────────────────────────────────────────

const ENVIRONMENTAL_NL: LegalSource[] = [
  {
    id: "NL-WM-1979",
    jurisdiction: "NL",
    type: "federal_law",
    status: "in_force",
    title_en: "Environmental Management Act (Wet milieubeheer — Wm)",
    title_local: "Wet milieubeheer",
    date_enacted: "1979-09-13",
    date_last_amended: "2025-01-01",
    source_url: "https://wetten.overheid.nl/BWBR0003245",
    issuing_body: "Staten-Generaal",
    competent_authorities: ["NL-IenW", "NL-ILT"],
    relevance_level: "medium",
    applicable_to: ["launch_provider", "ground_segment"],
    compliance_areas: ["environmental"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Environmental management framework",
        summary:
          "General environmental management framework applicable to space launch and ground infrastructure. Environmental impact assessment (m.e.r.) may be required for significant space-related activities. ILT enforces compliance.",
        complianceImplication:
          "Space ground infrastructure and any potential future launch facilities require environmental permits under this law.",
      },
    ],
    related_sources: ["NL-WRA-2007"],
    last_verified: "2026-04-09",
  },
];

// ─── Investment Screening (1) ───────────────────────────────────

const INVESTMENT_SCREENING_NL: LegalSource[] = [
  {
    id: "NL-VIFO-2023",
    jurisdiction: "NL",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Security Screening of Investments, Mergers and Acquisitions Act (Wet Vifo)",
    title_local: "Wet veiligheidstoets investeringen, fusies en overnames",
    date_enacted: "2023-06-01",
    date_in_force: "2023-06-01",
    official_reference: "Stb. 2022, 459",
    source_url: "https://wetten.overheid.nl/BWBR0046921",
    issuing_body: "Staten-Generaal",
    competent_authorities: ["NL-BTI"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Foreign investment screening for sensitive technologies",
        summary:
          "Mandatory screening of investments, mergers, and acquisitions involving sensitive technology operators. Space technology explicitly classified as sensitive technology. Bureau Toetsing Investeringen (BTI) administers the screening process.",
        complianceImplication:
          "Acquisitions of Dutch space companies by non-EU investors are subject to mandatory BTI screening. Retroactive effect to 8 September 2020 for space technology transactions.",
      },
    ],
    related_sources: ["NL-WRA-2007"],
    notes: [
      "Stb. 2022, 459 — entered into force 1 June 2023.",
      "Retroactive to 8 September 2020 for sensitive technology acquisitions including space.",
      "BTI can block, conditionally approve, or unwind transactions.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Policy Documents & Initiatives (4) ─────────────────────────

const POLICY_NL: LegalSource[] = [
  {
    id: "NL-SPACE-STRATEGY-2019",
    jurisdiction: "NL",
    type: "policy_document",
    status: "in_force",
    title_en: "Dutch Long-Term Space Agenda (Lange-Termijn Ruimtevaart Agenda)",
    title_local: "Lange-Termijn Ruimtevaart Agenda",
    date_published: "2019-06-01",
    source_url: "https://www.spaceoffice.nl/en/dutch-space-sector/space-policy",
    issuing_body: "Ministry of Economic Affairs and Climate Policy",
    competent_authorities: ["NL-EZK", "NL-NSO"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full document",
        title: "National space strategy 2019-2025",
        summary:
          "Dutch long-term space policy agenda. Netherlands contributes approximately EUR 200M annually to ESA. Priorities include Earth observation (Copernicus), satellite navigation (Galileo), space science, and space safety/sustainability.",
        complianceImplication:
          "Strategic priorities signal regulatory direction. The agenda emphasizes space sustainability and debris mitigation — potential future regulatory tightening.",
      },
    ],
    related_sources: ["NL-WRA-2007", "NL-ARTEMIS-ACCORDS"],
    notes: [
      "Netherlands contributes approximately EUR 200M annually to ESA — one of the largest per-capita contributions.",
      "Strong emphasis on Earth observation and space sustainability.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-ARTEMIS-ACCORDS",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Netherlands Signatory (2024)",
    date_enacted: "2024-04-08",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["NL-BZ", "NL-NSO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Signatories affirm that the extraction of space resources does not inherently constitute national appropriation under the Outer Space Treaty. The Netherlands signed despite being party to the Moon Agreement — creating a unique legal tension.",
        complianceImplication:
          "Dutch operators face a unique dual framework: bound by both the Moon Agreement (common heritage) and the Artemis Accords (permissive resources extraction). The government position is that these are complementary.",
      },
      {
        section: "Section 11",
        title: "Deconfliction of activities",
        summary:
          "Signatories commit to avoiding harmful interference with other activities and providing notification of operations that could cause interference.",
      },
    ],
    related_sources: [
      "NL-MOON-1979",
      "NL-OST-1967",
      "NL-HAGUE-BUILDING-BLOCKS",
    ],
    notes: [
      "Netherlands signed the Artemis Accords on 8 April 2024.",
      "Unique position: only Artemis Accords signatory that is also party to the Moon Agreement.",
      "The government asserts the two instruments are complementary, not contradictory.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-HAGUE-BUILDING-BLOCKS",
    jurisdiction: "NL",
    type: "policy_document",
    status: "in_force",
    title_en:
      "The Hague International Space Resources Governance Working Group — Building Blocks",
    date_published: "2019-11-12",
    source_url:
      "https://www.universiteitleiden.nl/en/law/institute-of-public-law/institute-of-air-space-law/the-hague-space-resources-governance-working-group",
    issuing_body: "The Hague Working Group / Leiden University",
    competent_authorities: ["NL-BZ"],
    relevance_level: "medium",
    applicable_to: ["space_resource_operator"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Building Blocks",
        title: "International governance framework for space resources",
        summary:
          "20 building blocks for an international framework on space resource activities. Developed by the Hague International Space Resources Governance Working Group hosted by Leiden University. Non-binding but influential in shaping the international discourse on space resource governance.",
        complianceImplication:
          "The Building Blocks influence international discussions including at COPUOS. Dutch operators should monitor as these may crystallize into binding norms.",
      },
    ],
    related_sources: ["NL-MOON-1979", "NL-ARTEMIS-ACCORDS"],
    notes: [
      "Published 12 November 2019.",
      "Hosted by Leiden University's International Institute of Air and Space Law — the Netherlands' premier space law institution.",
      "20 building blocks addressing priority, property rights, benefit sharing, environmental protection, and dispute resolution.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "NL-HCOC",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Hague Code of Conduct against Ballistic Missile Proliferation (HCoC)",
    date_enacted: "2002-11-25",
    source_url: "https://www.hcoc.at",
    issuing_body: "Subscribing States / The Hague",
    competent_authorities: ["NL-BZ", "NL-DEFENCE"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["military_dual_use", "export_control"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Ballistic missile non-proliferation and confidence-building",
        summary:
          "Politically binding code of conduct providing transparency and confidence-building measures for ballistic missile and space launch vehicle programmes. Pre-launch notifications required. The Hague is the named city — the Netherlands plays a central symbolic and logistical role.",
        complianceImplication:
          "Launch providers must comply with pre-launch notification obligations. The HCoC complements the MTCR and Wassenaar Arrangement — all linked to The Hague/Netherlands.",
      },
    ],
    related_sources: ["NL-WSG-2012"],
    notes: [
      "Launched 25 November 2002 at The Hague. 143 subscribing states as of 2026.",
      "Politically binding (not legally binding) — but influences export control decisions.",
      "The Netherlands hosts the HCoC annual meetings and maintains the central contact point.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── EU Law — NL-specific (1) ───────────────────────────────────

const EU_NL: LegalSource[] = [
  {
    id: "NL-ESA-HQ-AGREEMENT",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en: "ESA/Netherlands Headquarters Agreement (ESTEC)",
    title_local:
      "Verdrag tussen het Koninkrijk der Nederlanden en het Europees Ruimte-Agentschap inzake het Europees Centrum voor Ruimtetechnologie",
    date_enacted: "1975-12-10",
    source_url: "https://www.esa.int/About_Us/ESTEC",
    issuing_body: "Kingdom of the Netherlands / ESA",
    competent_authorities: ["NL-BZ"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESTEC privileges and immunities",
        summary:
          "Grants ESA privileges and immunities for ESTEC operations in Noordwijk. ESTEC is ESA's largest establishment with approximately 2,500 staff. Hosts the ESTEC Test Centre (largest satellite test facility in Europe). The agreement governs the legal status of ESA personnel and property on Dutch territory.",
        complianceImplication:
          "ESA operations at ESTEC are not subject to Dutch regulatory jurisdiction under this agreement. Operators using ESTEC test facilities should be aware of the dual legal regime.",
      },
    ],
    related_sources: ["NL-WRA-2007"],
    notes: [
      "ESTEC: European Space Research and Technology Centre — Noordwijk, Netherlands.",
      "Approximately 2,500 staff — ESA's largest facility globally.",
      "Hosts the largest satellite test facility in Europe (ESTEC Test Centre).",
      "The agreement grants ESA functional immunity from Dutch jurisdiction for ESTEC operations.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Wassenaar Arrangement (1) ──────────────────────────────────

const WASSENAAR_NL: LegalSource[] = [
  {
    id: "NL-WASSENAAR",
    jurisdiction: "NL",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Wassenaar Arrangement on Export Controls for Conventional Arms and Dual-Use Goods and Technologies",
    date_enacted: "1996-07-12",
    date_last_amended: "2025-12-01",
    source_url: "https://www.wassenaar.org",
    issuing_body: "Wassenaar Arrangement Secretariat (The Hague)",
    competent_authorities: ["NL-CDIU", "NL-BZ"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Dual-Use List",
        title: "Export control lists for space technology",
        summary:
          "Maintains control lists for dual-use goods and technologies including satellite components, propulsion systems, guidance systems, and encryption technology. 42 participating states. Headquartered in The Hague — named after the Wassenaar suburb.",
        complianceImplication:
          "The Wassenaar lists are directly implemented in EU Regulation 2021/821 and national export control law (Wsg). Dutch space technology exporters must check Wassenaar list classifications.",
      },
    ],
    related_sources: ["NL-WSG-2012", "NL-HCOC"],
    notes: [
      "Headquartered in Wassenaar (suburb of The Hague), Netherlands.",
      "42 participating states — the primary multilateral export control regime for conventional arms and dual-use technologies.",
      "Named after the location: Wassenaar, South Holland, Netherlands.",
      "Dual-use list updated annually at Plenary meetings.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_NL: LegalSource[] = [
  ...TREATIES_NL,
  ...PRIMARY_LEGISLATION_NL,
  ...IMPLEMENTING_LEGISLATION_NL,
  ...TELECOM_NL,
  ...EXPORT_CONTROL_NL,
  ...CYBERSECURITY_NL,
  ...DATA_PROTECTION_NL,
  ...ENVIRONMENTAL_NL,
  ...INVESTMENT_SCREENING_NL,
  ...POLICY_NL,
  ...EU_NL,
  ...WASSENAAR_NL,
];
