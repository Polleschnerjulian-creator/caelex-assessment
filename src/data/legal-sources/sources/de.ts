// src/data/legal-sources/sources/de.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * German space law sources — complete legal framework for jurisdiction DE.
 *
 * Sources: Auswärtiges Amt, BMWK, BAFA, BSI, BNetzA, DLR, gesetze-im-internet.de
 * Last verified: 2026-04-13
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── German Authorities (8) ──────────────────────────────────────────

export const AUTHORITIES_DE: Authority[] = [
  {
    id: "DE-BMWK",
    jurisdiction: "DE",
    name_en: "Federal Ministry for Economic Affairs and Climate Action",
    name_local: "Bundesministerium für Wirtschaft und Klimaschutz",
    abbreviation: "BMWK",
    website: "https://www.bmwk.de",
    contact_email: "raumfahrt@bmwk.bund.de",
    space_mandate:
      "Lead ministry for space policy. Designated future licensing authority under a national space law. Currently oversees SatDSiG implementation and coordinates DLR's space agency role.",
    legal_basis: "Grundgesetz Art. 65 (Ressortprinzip); SatDSiG § 3",
    applicable_areas: ["licensing", "registration", "data_security"],
  },
  {
    id: "DE-DLR",
    jurisdiction: "DE",
    name_en: "German Aerospace Center — Space Agency",
    name_local: "Deutsches Zentrum für Luft- und Raumfahrt — Raumfahrtagentur",
    abbreviation: "DLR",
    website: "https://www.dlr.de/rd",
    contact_email: "info-ra@dlr.de",
    space_mandate:
      "Manages the German national space programme on behalf of BMWK. Represents Germany in ESA governance. Provides technical assessment for licensing decisions. Operates the German Space Situational Awareness Centre (GSSAC).",
    legal_basis: "BMWK delegation; DLR-Gesetz",
    applicable_areas: [
      "licensing",
      "registration",
      "debris_mitigation",
      "space_traffic_management",
    ],
  },
  {
    id: "DE-BAFA",
    jurisdiction: "DE",
    name_en: "Federal Office for Economic Affairs and Export Control",
    name_local: "Bundesamt für Wirtschaft und Ausfuhrkontrolle",
    abbreviation: "BAFA",
    website: "https://www.bafa.de",
    contact_email: "poststelle@bafa.bund.de",
    space_mandate:
      "Competent authority for SatDSiG licensing (high-resolution Earth observation). Administers dual-use and military export controls for space technology under AWG/AWV and EU Regulation 2021/821.",
    legal_basis: "SatDSiG § 3; AWG § 13; EU VO 2021/821",
    applicable_areas: ["licensing", "export_control", "data_security"],
  },
  {
    id: "DE-BSI",
    jurisdiction: "DE",
    name_en: "Federal Office for Information Security",
    name_local: "Bundesamt für Sicherheit in der Informationstechnik",
    abbreviation: "BSI",
    website: "https://www.bsi.bund.de",
    contact_email: "certrequest@bsi.bund.de",
    space_mandate:
      "IT security conformity assessments under SatDSiG (TR-03140). Publishes TR-03184 (space segment + ground segment cybersecurity). National NIS2 supervisory authority for critical infrastructure including space sector (BSIG §§ 30-31).",
    legal_basis: "BSIG; SatDSiG § 9; NIS2 transposition via NIS2UmsuCG",
    applicable_areas: ["cybersecurity", "data_security"],
  },
  {
    id: "DE-BNETZA",
    jurisdiction: "DE",
    name_en: "Federal Network Agency",
    name_local: "Bundesnetzagentur",
    abbreviation: "BNetzA",
    website: "https://www.bundesnetzagentur.de",
    contact_email: "info@bnetza.de",
    space_mandate:
      "Allocates radio frequencies for satellite communications, TT&C, and payload links under TKG § 91. Submits ITU filings on behalf of German operators. Issues domestic spectrum licences. Enforces TK security requirements (TKG § 165).",
    legal_basis: "TKG §§ 91, 165; ITU Radio Regulations",
    applicable_areas: ["frequency_spectrum", "cybersecurity"],
  },
  {
    id: "DE-LBA",
    jurisdiction: "DE",
    name_en: "Federal Aviation Authority",
    name_local: "Luftfahrt-Bundesamt",
    abbreviation: "LBA",
    website: "https://www.lba.de",
    space_mandate:
      "Regulates transit of launch vehicles through German airspace under LuftVG § 1(2). Issues airspace closure orders and coordinates with military air traffic control for launch windows.",
    legal_basis: "LuftVG § 1 Abs. 2; LuftVO",
    applicable_areas: ["licensing"],
  },
  {
    id: "DE-BMVG",
    jurisdiction: "DE",
    name_en: "Federal Ministry of Defence — Space Command",
    name_local: "Bundesministerium der Verteidigung — Weltraumkommando",
    abbreviation: "BMVg/WRKdo",
    website: "https://www.bundeswehr.de",
    space_mandate:
      "Operates the Weltraumkommando (Space Command) at Uedem for military space situational awareness. Responsible for Bundeswehr satellite systems and space security policy. WRG Eckpunkte included a Notstandsregelung (emergency access) provision.",
    applicable_areas: ["military_dual_use", "space_traffic_management"],
  },
  {
    id: "DE-AA",
    jurisdiction: "DE",
    name_en: "Federal Foreign Office",
    name_local: "Auswärtiges Amt",
    abbreviation: "AA",
    website: "https://www.auswaertiges-amt.de",
    space_mandate:
      "Represents Germany in UN COPUOS and other international space law fora. Responsible for treaty ratification processes and diplomatic aspects of space activities (Outer Space Treaty Art. VI compliance).",
    legal_basis: "Grundgesetz Art. 32 (Auswärtige Beziehungen)",
    applicable_areas: ["registration", "liability"],
  },
];

// ─── International Treaties ratified by DE (7) ──────────────────────

const TREATIES_DE: LegalSource[] = [
  {
    id: "INT-OST-1967",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, including the Moon and Other Celestial Bodies",
    title_local:
      "Vertrag über die Grundsätze zur Regelung der Tätigkeiten von Staaten bei der Erforschung und Nutzung des Weltraums einschließlich des Mondes und anderer Himmelskörper",
    date_enacted: "1967-01-27",
    date_in_force: "1967-10-10",
    official_reference: "BGBl. 1969 II S. 1967",
    un_reference: "Resolution 2222 (XXI)",
    source_url:
      "https://www.auswaertiges-amt.de/de/aussenpolitik/regelbasierte-internationale-ordnung/voelkerrecht-internationales-recht/einzelfragen/weltraumrecht/weltraumrecht/217086",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["DE-AA"],
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
    notes: [
      "Ratified by Germany — constitutes binding international law under Art. 25 GG.",
      "Art. VI is the single most important provision for space compliance: it creates the obligation for States to authorize and supervise ALL private space activities.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-RESCUE-1968",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Agreement on the Rescue of Astronauts, the Return of Astronauts and the Return of Objects Launched into Outer Space",
    title_local:
      "Übereinkommen über die Rettung und Rückführung von Raumfahrern sowie die Rückgabe von in den Weltraum gestarteten Gegenständen",
    date_enacted: "1968-04-22",
    date_in_force: "1968-12-03",
    official_reference: "BGBl. 1971 II S. 237",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/rescueagreement.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["DE-AA"],
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
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Convention on International Liability for Damage Caused by Space Objects",
    title_local:
      "Übereinkommen über die völkerrechtliche Haftung für Schäden durch Weltraumgegenstände",
    date_enacted: "1972-03-29",
    date_in_force: "1972-09-01",
    official_reference: "BGBl. 1975 II S. 1209",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["DE-AA", "DE-BMWK"],
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
    notes: [
      "The Liability Convention is the direct legal basis for national insurance and indemnification requirements.",
      "Germany's planned Weltraumgesetz included a liability cap of €50M and operator recourse limited to 10% of 3-year average turnover.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-REGISTRATION-1975",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Convention on Registration of Objects Launched into Outer Space",
    title_local:
      "Übereinkommen über die Registrierung von in den Weltraum gestarteten Gegenständen",
    date_enacted: "1975-01-14",
    date_in_force: "1976-09-15",
    official_reference: "BGBl. 1979 II S. 650",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["DE-AA", "DE-DLR"],
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
    jurisdiction: "INT",
    type: "international_treaty",
    status: "not_ratified",
    title_en:
      "Agreement Governing the Activities of States on the Moon and Other Celestial Bodies",
    title_local:
      "Übereinkommen zur Regelung der Tätigkeiten von Staaten auf dem Mond und anderen Himmelskörpern",
    date_enacted: "1979-12-18",
    date_in_force: "1984-07-11",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html",
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
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Treaty Banning Nuclear Weapon Tests in the Atmosphere, in Outer Space and Under Water",
    title_local:
      "Vertrag über das Verbot von Kernwaffenversuchen in der Atmosphäre, im Weltraum und unter Wasser",
    date_enacted: "1963-08-05",
    date_in_force: "1963-10-10",
    official_reference: "BGBl. 1964 II S. 906",
    source_url:
      "https://treaties.un.org/Pages/showDetails.aspx?objid=08000002801313d9",
    issuing_body: "Trilateral (USA, USSR, UK) — open for accession",
    competent_authorities: ["DE-AA"],
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
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Constitution and Convention of the International Telecommunication Union",
    date_enacted: "1992-12-22",
    date_last_amended: "2022-10-07",
    official_reference: "BGBl. 1996 II S. 1306",
    source_url:
      "https://www.itu.int/en/council/Pages/constitution-convention.aspx",
    issuing_body: "International Telecommunication Union",
    competent_authorities: ["DE-BNETZA"],
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
    notes: [
      "ITU Constitution was last revised at PP-22 (Bucharest). Radio Regulations updated at WRC-23.",
      "BNetzA acts as Germany's ITU administration for all frequency filings.",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── German National Laws (10) ───────────────────────────────────────

const NATIONAL_LAWS_DE: LegalSource[] = [
  {
    id: "DE-SATDSIG-2007",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Satellite Data Security Act",
    title_local:
      "Gesetz zum Schutz vor Gefährdung der Sicherheit der Bundesrepublik Deutschland durch das Verbreiten von hochwertigen Erdfernerkundungsdaten (Satellitendatensicherheitsgesetz — SatDSiG)",
    date_enacted: "2007-11-23",
    date_last_amended: "2021-04-19",
    official_reference:
      "BGBl. I S. 2590, zuletzt geändert durch Art. 5 G v. 19.4.2021 (BGBl. I S. 771)",
    source_url: "https://www.gesetze-im-internet.de/satdsig/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BAFA", "DE-BSI"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["licensing", "data_security"],
    key_provisions: [
      {
        section: "§§ 3-9 (Teil 2)",
        title: "Licensing of Earth observation systems",
        summary:
          "Operating a high-resolution Earth observation system from German jurisdiction requires BAFA authorization. Applications must demonstrate data security measures, IT conformity (BSI TR-03140), and compliance with sensitivity thresholds.",
        complianceImplication:
          "Any German operator of EO satellites with ground resolution ≤ 2.5m needs a BAFA licence before operations begin.",
      },
      {
        section: "§§ 11-20 (Teil 3)",
        title: "Data provider licensing",
        summary:
          "Distributing high-resolution satellite data requires a separate data provider licence. Subject to sensitivity checks (§ 17) and priority government access (§§ 21-22).",
        complianceImplication:
          "Downstream data distributors — not just satellite operators — need their own licence.",
      },
      {
        section: "§ 17",
        title: "Sensitivity assessment for data requests",
        summary:
          "BAFA conducts security assessments on specific data distribution requests. Federal Intelligence Service (BND) may be consulted for high-sensitivity requests.",
      },
      {
        section: "§§ 25-26 (Teil 6)",
        title: "Penalties",
        summary:
          "Violations carry fines up to €500,000 (administrative offences) or criminal penalties for intentional violations involving national security data.",
      },
    ],
    scope_description:
      "Applies ONLY to operators of high-resolution Earth observation systems and distributors of EO data. Does NOT cover: spacecraft operations generally, launch, in-orbit services, communications satellites, or navigation. This is Germany's only space-specific federal law.",
    related_sources: ["DE-BSI-TR-03140", "INT-OST-1967"],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "SatDSiG is the ONLY space-specific German federal law. All other space activities fall under general legislation (LuftVG, TKG, AWG).",
      "Supplemented by SatDSiV (Satellitendatensicherheitsverordnung) for technical thresholds.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-LUFTVG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Air Traffic Act",
    title_local: "Luftverkehrsgesetz (LuftVG)",
    date_last_amended: "2024-07-15",
    official_reference: "BGBl. I, diverse Änderungen",
    source_url: "https://www.gesetze-im-internet.de/luftvg/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-LBA"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "§ 1 Abs. 2",
        title: "Space vehicles in airspace",
        summary:
          "Raumfahrzeuge, Raketen und ähnliche Flugkörper gelten als Luftfahrzeuge, solange sie sich im Luftraum befinden. — Launch vehicles are classified as aircraft while transiting through airspace.",
        complianceImplication:
          "Any launch from German territory requires LBA clearance for airspace transit, in addition to any future space-specific licence.",
      },
      {
        section: "§§ 33 ff.",
        title: "Liability provisions",
        summary:
          "Strict liability for damage caused by aircraft (including launch vehicles during airspace transit) to persons and property on the ground.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-TKG-2021",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Telecommunications Act",
    title_local: "Telekommunikationsgesetz (TKG)",
    date_enacted: "2021-06-23",
    date_last_amended: "2024-03-01",
    official_reference: "BGBl. I 2021 S. 1858",
    source_url: "https://www.gesetze-im-internet.de/tkg_2021/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BNETZA"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum", "cybersecurity"],
    key_provisions: [
      {
        section: "§§ 91 ff.",
        title: "Frequency allocation for satellite systems",
        summary:
          "Satellite operators must obtain frequency assignments from BNetzA for all TT&C and payload frequencies. BNetzA coordinates ITU filings (API, CR/C, Notification, Recording) on behalf of German operators.",
        complianceImplication:
          "No German satellite system may operate without a BNetzA frequency assignment. Filing lead times are typically 2-7 years for GEO, 1-3 years for LEO.",
      },
      {
        section: "§ 165",
        title: "Security requirements for TK networks",
        summary:
          "Operators of public telecommunications networks must implement appropriate technical and organizational security measures. Includes satellite networks. Critical components subject to § 165 Abs. 4 review.",
        complianceImplication:
          "Satellite communication networks are TK networks under the TKG — security obligations apply to ground segment and mission control infrastructure.",
      },
      {
        section: "§ 168",
        title: "Incident reporting obligations",
        summary:
          "Security incidents affecting TK networks must be reported to BNetzA and BSI without undue delay.",
        complianceImplication:
          "Overlaps with NIS2 incident reporting. Satellite operators must report to both BNetzA (TKG) and BSI (NIS2/BSIG) for cyber incidents.",
      },
    ],
    related_sources: ["INT-ITU-CONST", "DE-BSIG-NIS2"],
    caelex_engine_mapping: ["spectrum-engine.server"],
    caelex_data_file_mapping: [
      "national-space-laws.ts",
      "spectrum-itu-requirements.ts",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-AWG-2013",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Trade and Payments Act",
    title_local: "Außenwirtschaftsgesetz (AWG)",
    date_enacted: "2013-06-06",
    official_reference: "BGBl. I 2013 S. 1482",
    source_url: "https://www.gesetze-im-internet.de/awg_2013/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BAFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "§§ 4-8",
        title: "Export licensing requirements",
        summary:
          "Export of goods, software, and technology listed in the Dual-Use Regulation or national control lists requires BAFA authorization. Includes spacecraft components, ground station equipment, and cryptographic modules.",
      },
      {
        section: "§§ 55 ff. AWV",
        title: "Investment screening",
        summary:
          "Acquisitions of German companies by non-EU/EFTA investors are subject to BMWK review if the company operates in sensitive sectors including space/defence.",
        complianceImplication:
          "Foreign investment in German space companies triggers mandatory notification to BMWK if the investor acquires ≥10% of voting rights.",
      },
    ],
    related_sources: ["DE-AWV-2013", "DE-DUALUSE-2021"],
    caelex_engine_mapping: ["export-control-engine.server"],
    caelex_data_file_mapping: ["itar-ear-requirements.ts"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-AWV-2013",
    jurisdiction: "DE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Foreign Trade and Payments Regulation",
    title_local: "Außenwirtschaftsverordnung (AWV)",
    date_enacted: "2013-08-02",
    official_reference: "BGBl. I 2013 S. 2865",
    source_url: "https://www.gesetze-im-internet.de/awv_2013/",
    issuing_body: "Bundesregierung",
    competent_authorities: ["DE-BAFA", "DE-BMWK"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "§§ 55-62",
        title: "Sector-specific investment screening",
        summary:
          "Detailed rules for investment screening in defence, IT security, and critical infrastructure sectors. Space sector falls under critical infrastructure.",
      },
    ],
    related_sources: ["DE-AWG-2013"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-DUALUSE-2021",
    jurisdiction: "DE",
    type: "eu_regulation",
    status: "in_force",
    title_en: "EU Dual-Use Regulation",
    title_local: "EU-Dual-Use-Verordnung",
    date_in_force: "2021-09-09",
    official_reference: "Verordnung (EU) 2021/821",
    source_url: "https://eur-lex.europa.eu/eli/reg/2021/821/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["DE-BAFA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "Annex I, Category 7",
        title: "Navigation and avionics",
        summary:
          "GNSS receivers, inertial navigation systems, star trackers, and related technology subject to export control.",
      },
      {
        section: "Annex I, Category 9",
        title: "Aerospace and propulsion",
        summary:
          "Spacecraft, launch vehicles, propulsion systems, and associated software/technology. Includes complete satellites, reaction wheels, solar arrays above specified thresholds.",
      },
      {
        section: "Art. 4",
        title: "Catch-all clause",
        summary:
          "Even unlisted items require authorization if the exporter is aware they may be intended for WMD, military end-use in embargoed countries, or listed end-users.",
        complianceImplication:
          "Space component exporters must screen every transaction, not just listed items.",
      },
    ],
    related_sources: ["DE-AWG-2013", "DE-AWV-2013"],
    notes: [
      "Directly applicable in Germany as EU Regulation — no national transposition needed.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-KWKG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "War Weapons Control Act",
    title_local:
      "Gesetz über die Kontrolle von Kriegswaffen (Kriegswaffenkontrollgesetz — KWKG)",
    official_reference: "BGBl. I 1990 S. 2506",
    source_url: "https://www.gesetze-im-internet.de/krwaffkontrg/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "export_control"],
    key_provisions: [
      {
        section: "§§ 1-3",
        title: "Prohibition and licensing of war weapons",
        summary:
          "Production, acquisition, transfer, and transport of war weapons requires government authorization. War weapons list includes certain missile systems and space-capable launch vehicles above specified thresholds.",
      },
    ],
    related_sources: ["DE-AWG-2013"],
    scope_description:
      "Relevant for launch vehicles with military-origin technology and dual-use payloads. Most commercial space activities do not fall under KWKG unless the payload or carrier has military classification.",
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSIG-NIS2",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "BSI Act (with NIS2 Implementation)",
    title_local:
      "Gesetz über das Bundesamt für Sicherheit in der Informationstechnik (BSI-Gesetz — BSIG), geändert durch NIS2UmsuCG",
    date_last_amended: "2025-03-01",
    official_reference: "BGBl. I, zuletzt geändert durch NIS2UmsuCG",
    source_url: "https://www.gesetze-im-internet.de/bsig_2009/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BSI"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "§§ 30-31",
        title: "Risk management and incident reporting for NIS2 entities",
        summary:
          "Entities in sectors of high criticality (including space — NIS2 Annex I) must implement cybersecurity risk management measures and report significant incidents to BSI within 24 hours (early warning) and 72 hours (full notification).",
        complianceImplication:
          "German space operators classified as 'important' or 'essential' under NIS2 must comply with BSIG §§ 30-31. This is the DE-specific implementation of NIS2 Art. 21 and Art. 23.",
      },
      {
        section: "§ 33",
        title: "Registration obligation",
        summary:
          "NIS2 entities must register with BSI, providing contact details, sector classification, and member state presence.",
      },
      {
        section: "§ 41",
        title: "Critical components",
        summary:
          "Use of critical components in covered infrastructure requires notification to BSI. BMWK may prohibit use of specific components from untrusted vendors.",
        complianceImplication:
          "Ground segment and mission control systems using components from certain vendors may require BSI clearance.",
      },
    ],
    implements: "EU-NIS2-2022",
    related_sources: ["EU-NIS2-2022", "DE-BSI-TR-03184-1", "DE-BSI-TR-03184-2"],
    caelex_engine_mapping: ["nis2-engine.server"],
    caelex_data_file_mapping: [
      "nis2-requirements.ts",
      "cybersecurity-requirements.ts",
    ],
    notes: [
      "NIS2UmsuCG transposed the NIS2 Directive into German law, making space explicitly a sector of high criticality.",
      "§§ 30-31 BSIG are the German equivalents of NIS2 Art. 21 (risk management) and Art. 23 (incident reporting).",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-UVPG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Environmental Impact Assessment Act",
    title_local: "Gesetz über die Umweltverträglichkeitsprüfung (UVPG)",
    source_url: "https://www.gesetze-im-internet.de/uvpg/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["environmental"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Purpose and scope",
        summary:
          "Environmental impact assessments are mandatory for projects that may have significant effects on the environment. Includes construction and operation of launch facilities.",
        complianceImplication:
          "Any launch site development in Germany triggers a full UVP. Relevant for future German spaceport proposals.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-PRODHAFTG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Product Liability Act",
    title_local: "Produkthaftungsgesetz (ProdHaftG)",
    source_url: "https://www.gesetze-im-internet.de/prodhaftg/",
    issuing_body: "Bundestag",
    competent_authorities: [],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["liability"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Strict product liability",
        summary:
          "A manufacturer is liable for damage caused by a defect in their product. Potentially applicable to spacecraft components, ground equipment, and satellite subsystems delivered to third parties.",
        complianceImplication:
          "Space component manufacturers should verify product liability coverage. The development risk defence (§ 1 Abs. 2 Nr. 5) may apply to novel space technologies.",
      },
    ],
    related_sources: ["EU-CRA-2024"],
    last_verified: "2026-04-13",
  },
];
