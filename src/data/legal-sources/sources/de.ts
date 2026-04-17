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

const TREATIES_DE: LegalSource[] = [];

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

// ─── BSI Technical Standards (6) ─────────────────────────────────────

const STANDARDS_DE: LegalSource[] = [
  {
    id: "DE-BSI-TR-03184-1",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "BSI TR-03184 Part 1: Information Security for Space Systems — Space Segment",
    title_local:
      "BSI TR-03184-1: Informationssicherheit für Weltraumsysteme — Teil 1: Raumsegment",
    date_enacted: "2023-07-01",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03184/TR-03184_node.html",
    issuing_body: "Bundesamt für Sicherheit in der Informationstechnik (BSI)",
    competent_authorities: ["DE-BSI"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Chapter 3",
        title: "Threat landscape for space segment",
        summary:
          "Systematic analysis of cybersecurity threats to satellite platforms: jamming, spoofing, replay attacks, command injection, firmware manipulation, supply chain compromise.",
      },
      {
        section: "Chapter 4",
        title: "Security measures for spacecraft",
        summary:
          "Mandatory and recommended countermeasures covering: encrypted TT&C links, authenticated command channels, firmware integrity verification, secure boot, anomaly detection, key management, redundancy.",
        complianceImplication:
          "Quasi-mandatory for KRITIS operators. ESA, DLR, and Bundeswehr contracts require TR-03184 compliance. Haftungsrelevanz: failure to implement creates negligence exposure.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-2", "DE-BSIG-NIS2"],
    caelex_data_file_mapping: [
      "cybersecurity-requirements.ts",
      "bnetza-regulatory-knowledge.ts",
    ],
    notes: [
      "Formally a 'recommendation' (Empfehlung), but quasi-mandatory: ESA, DLR, and Bundeswehr require compliance. Failure to implement creates negligence exposure under tort law.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-TR-03184-2",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "BSI TR-03184 Part 2: Information Security for Space Systems — Ground Segment",
    title_local:
      "BSI TR-03184-2: Informationssicherheit für Weltraumsysteme — Teil 2: Bodensegment",
    date_enacted: "2025-05-01",
    source_url:
      "https://www.bsi.bund.de/SharedDocs/Downloads/DE/BSI/Publikationen/TechnischeRichtlinien/TR03184/BSI-TR-03184-2.pdf",
    issuing_body: "BSI",
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
        section: "Full document",
        title: "Ground segment security requirements",
        summary:
          "Security requirements for mission control centres, ground stations, TT&C infrastructure, data processing. Covers network segmentation, access control, key management, secure operations, monitoring. Compatible with ISO 27001/27002, NIST CSF, ECSS, CCSDS, MITRE ATT&CK.",
        complianceImplication:
          "Ground segment operators who are NIS2 entities must implement these measures. TR-03184-2 is the BSI's interpretation of 'state of the art' for space ground infrastructure.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-1", "DE-BSIG-NIS2"],
    caelex_data_file_mapping: [
      "cybersecurity-requirements.ts",
      "bnetza-regulatory-knowledge.ts",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-TR-03184-AUDIT",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en: "BSI TR-03184 Conformity Assessment (Audit Standard)",
    title_local:
      "BSI TR-03184 Prüfvorschrift (Konformitätsbewertung Raum- und Bodensegment)",
    date_enacted: "2026-03-01",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03184/TR-03184_node.html",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full document",
        title: "Conformity assessment procedures",
        summary:
          "Defines audit criteria and procedures for assessing compliance with TR-03184 Parts 1 and 2. Establishes the certification basis for space cybersecurity conformity.",
        complianceImplication:
          "Organizations seeking TR-03184 certification must follow this audit standard. Published March 2026 — the newest BSI space publication.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-1", "DE-BSI-TR-03184-2"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-TR-03140",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en: "BSI TR-03140: Conformity Assessment under SatDSiG",
    title_local:
      "BSI TR-03140: Konformitätsbewertung nach Satellitendatensicherheitsgesetz",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/Technische-Richtlinien/TR-nach-Thema-sortiert/tr03140/tr-03140.html",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI", "DE-BAFA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["data_security", "cybersecurity"],
    key_provisions: [
      {
        section: "Full document",
        title: "IT security conformity for EO systems",
        summary:
          "Defines the IT security assessment criteria that must be met to obtain a BAFA licence under SatDSiG. BSI conducts the technical evaluation.",
        complianceImplication:
          "Mandatory prerequisite for SatDSiG licensing — BAFA will not issue a licence without a positive BSI TR-03140 conformity assessment.",
      },
    ],
    related_sources: ["DE-SATDSIG-2007"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-GRUNDSCHUTZ-SPACE",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en: "BSI IT-Grundschutz Profile for Space Infrastructures",
    title_local:
      "IT-Grundschutz-Profil für Weltraumsysteme (Raum- und Bodensegment)",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Standards-und-Zertifizierung/IT-Grundschutz/it-grundschutz_node.html",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full profile",
        title: "Minimum security baseline for space systems",
        summary:
          "Applies the BSI IT-Grundschutz methodology to the entire space system lifecycle. Defines minimum security measures (Basisabsicherung) and standard measures (Standardabsicherung) for space and ground segments.",
        complianceImplication:
          "Provides a structured path to demonstrating NIS2 compliance via the IT-Grundschutz certification scheme. Recognized by German authorities as evidence of adequate security measures.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-1", "DE-BSI-TR-03184-2", "DE-BSIG-NIS2"],
    caelex_data_file_mapping: ["bnetza-regulatory-knowledge.ts"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-BSI-POSITION-SPACE",
    jurisdiction: "DE",
    type: "technical_standard",
    status: "in_force",
    title_en: "BSI Position Paper: Cybersecurity for Space Infrastructures",
    title_local:
      "BSI Positionspapier: Cybersicherheit für Weltrauminfrastrukturen",
    source_url:
      "https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/IT-Sicherheit-in-Luft-und-Raumfahrt/it-sicherheit-in-luft-und-raumfahrt_node.html",
    issuing_body: "BSI",
    competent_authorities: ["DE-BSI"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full paper",
        title: "BSI policy position on space cybersecurity",
        summary:
          "Strategic policy document outlining BSI's approach to space infrastructure protection. Contextualizes TR-03184, IT-Grundschutz, and NIS2 requirements within the broader cybersecurity policy framework.",
      },
    ],
    related_sources: ["DE-BSI-TR-03184-1", "DE-BSIG-NIS2"],
    last_verified: "2026-04-13",
  },
];

// ─── EU Law with Space Relevance (6) ─────────────────────────────────

const EU_LAW_DE: LegalSource[] = [];

// ─── Policy Documents (3) ────────────────────────────────────────────

const POLICY_DE: LegalSource[] = [
  {
    id: "DE-RAUMFAHRTSTRATEGIE-2023",
    jurisdiction: "DE",
    type: "policy_document",
    status: "in_force",
    title_en: "German Federal Space Strategy 2023",
    title_local: "Raumfahrtstrategie der Bundesregierung 2023",
    date_published: "2023-09-01",
    source_url:
      "https://www.bmwk.de/Redaktion/DE/Publikationen/Technologie/raumfahrtstrategie-der-bundesregierung.html",
    issuing_body: "Bundesregierung / BMWK",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Chapter: Regulatory Framework",
        title: "Announcement of a national space law",
        summary:
          "The strategy commits to enacting a comprehensive German space law (Weltraumgesetz) to establish licensing, registration, liability, and insurance obligations for all non-governmental space activities.",
        complianceImplication:
          "Policy signal that a Weltraumgesetz is politically intended. Operators should prepare for future licensing obligations.",
      },
    ],
    related_sources: ["DE-WRG-ECKPUNKTE-2024"],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-WRG-ECKPUNKTE-2024",
    jurisdiction: "DE",
    type: "draft_legislation",
    status: "superseded",
    title_en: "Key Points for a German Space Law (Weltraumgesetz)",
    title_local: "Eckpunktepapier der Bundesregierung für ein Weltraumgesetz",
    date_published: "2024-09-01",
    parliamentary_reference: "BT-Drs. 20/12775",
    source_url:
      "https://www.bundeswirtschaftsministerium.de/Redaktion/DE/Downloads/E/eckpunkte-der-bundesregierung-fuer-ein-weltraumgesetz.pdf",
    issuing_body: "BMWK / Raumfahrtkoordinatorin Anna Christmann",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "environmental",
    ],
    key_provisions: [
      {
        section: "Genehmigungspflicht",
        title: "Licensing obligation for all non-governmental space activities",
        summary:
          "All private space activities conducted from German territory or by German-controlled entities would require government authorization.",
      },
      {
        section: "Registrierung",
        title: "National space object registry",
        summary:
          "Mandatory registration of all space objects launched under German jurisdiction in a national registry.",
      },
      {
        section: "Haftung & Regress",
        title: "Liability regime with capped recourse",
        summary:
          "Operator liability with recourse capped at 10% of 3-year average annual turnover, maximum €50 million. State bears residual liability above operator coverage.",
        complianceImplication:
          "If enacted, the €50M cap and 10% recourse limit would be the most operator-friendly regime in Europe. This was a key negotiation point.",
      },
      {
        section: "Versicherungspflicht",
        title: "Mandatory insurance",
        summary:
          "Operators must carry third-party liability insurance. Bank guarantee (Bankbürgschaft) accepted as alternative. Coverage thresholds to be set by regulation.",
      },
      {
        section: "Startplatzzulassung",
        title: "Launch site licensing with environmental assessment",
        summary:
          "Launch facilities on German territory require specific authorization including full environmental impact assessment (UVP).",
      },
      {
        section: "Notstandsregelung",
        title: "Emergency access provision",
        summary:
          "Bundeswehr granted emergency access rights to private space assets in crisis situations.",
        complianceImplication:
          "Controversial provision — space operators should be aware of potential military commandeering of commercial assets during emergencies.",
      },
    ],
    scope_description:
      "Cabinet-approved key points (September 2024). The full draft law was NEVER introduced to the Bundestag — the Ampel coalition collapsed in December 2024 before a legislative text was finalized. The Eckpunkte remain the most detailed public document on Germany's planned space law architecture.",
    related_sources: [
      "DE-RAUMFAHRTSTRATEGIE-2023",
      "DE-KOALITIONSVERTRAG-2025",
    ],
    notes: [
      "Status: SUPERSEDED — the Eckpunkte were the Ampel coalition's plan. The new CDU/SPD coalition (2025) has announced its own Weltraumgesetz effort but no draft exists as of April 2026.",
      "Despite being superseded, the Eckpunkte are the best public indicator of what a German space law will contain, as many provisions were technically consensus positions across parties.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "DE-KOALITIONSVERTRAG-2025",
    jurisdiction: "DE",
    type: "policy_document",
    status: "in_force",
    title_en: "Coalition Agreement CDU/CSU-SPD 2025",
    title_local:
      "Koalitionsvertrag zwischen CDU, CSU und SPD — 21. Legislaturperiode",
    date_published: "2025-04-01",
    source_url:
      "https://www.bundesregierung.de/breg-de/service/gesetzesvorhaben/koalitionsvertrag-2025",
    issuing_body: "CDU/CSU, SPD",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Space section",
        title: "Weltraumgesetz commitment",
        summary:
          "The coalition agreement explicitly mentions the enactment of a comprehensive German space law (Weltraumgesetz) as a legislative priority. Details and timeline not specified.",
        complianceImplication:
          "Political commitment exists — a new Weltraumgesetz effort is expected during this legislative period (2025-2029). Operators should anticipate future licensing obligations.",
      },
    ],
    related_sources: ["DE-WRG-ECKPUNKTE-2024", "DE-RAUMFAHRTSTRATEGIE-2023"],
    last_verified: "2026-04-13",
  },
];

// ─── Aggregated Export ───────────────────────────────────────────────

export const LEGAL_SOURCES_DE: LegalSource[] = [
  ...TREATIES_DE,
  ...NATIONAL_LAWS_DE,
  ...STANDARDS_DE,
  ...EU_LAW_DE,
  ...POLICY_DE,
];
