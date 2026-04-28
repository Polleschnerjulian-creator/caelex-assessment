// src/data/legal-sources/sources/de.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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
    scope_description:
      "Aviation law that incidentally classifies launch vehicles as aircraft while transiting German airspace. Triggers LBA (aviation authority) clearance and strict aircraft-liability regime in addition to any future space-specific licence — the only national-level licensing hook for German launches today.",
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
    scope_description:
      "Comprehensive telecommunications framework that BNetzA uses to allocate satellite frequencies, coordinate ITU filings (API, CR/C, Notification, Recording), and enforce TK security obligations on satellite networks. Applies to every commercial DE satellite system regardless of orbit or service type.",
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
    scope_description:
      "Primary federal authority for export control and inbound investment screening. Captures spacecraft components, ground station equipment, cryptographic modules, and non-EU acquisitions of German space companies (≥10 % voting rights triggers BMWK notification). The export-control hub for any German space-sector cross-border transaction.",
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
    scope_description:
      "Implementing regulation under AWG with the operative thresholds and procedures. § 55-62 govern sector-specific investment screening including the space/critical-infrastructure carve-out — a foreign acquirer must consult AWV before AWG to know exactly which notification regime applies.",
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
    scope_description:
      "EU Regulation 2021/821 directly applicable in Germany — no national transposition. Annex I Categories 7 and 9 enumerate controlled space items (GNSS, INS, star trackers, complete satellites, propulsion, reaction wheels). The catch-all clause in Art. 4 obliges screening of every space-component export, not just listed items.",
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
    amended_by: ["DE-NIS2UMSUCG-DRAFT"],
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
    scope_description:
      "German national transposition of NIS2 cybersecurity obligations for entities in sectors of high criticality, including the space sector (NIS2 Annex I). Governs risk-management duties (§§ 30-31), 24h/72h incident reporting, BSI registration (§ 33), and the critical-component clearance regime (§ 41) for ground segment and mission-control systems.",
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
    scope_description:
      "General environmental impact assessment law triggered by development of launch facilities or large-scale ground stations. Not space-specific — applies the standard UVP procedure to any space infrastructure build that meets the project-list thresholds. Becomes critical if Germany establishes a domestic spaceport.",
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
    scope_description:
      "Strict no-fault product-liability regime applicable to spacecraft components, ground equipment, and satellite subsystems delivered to third parties. The development-risk defence in § 1 Abs. 2 Nr. 5 is the central question for novel space technology — manufacturers should evaluate whether it is invokable for their hardware.",
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

  // ─── Foundational federal framework (added 2026-04-22) ─────────────
  //
  // The entries below close structural gaps identified in the
  // April 2026 review of German space-law coverage. Every entry has
  // been verified against the Bundesgesetzblatt via
  // gesetze-im-internet.de on 2026-04-22; the source_url points at
  // that canonical primary source. Amendment references use the
  // official "BGBl. 2026 I Nr. 66" nomenclature introduced with the
  // BGBl-Online reform.

  {
    // GG entry — the constitutional basis for federal competence over
    // space matters. Article 73 GG (exclusive federal legislation) is
    // the hook that makes every other entry in this file legally
    // possible. Deliberately narrow: only the space-relevant articles
    // (32, 73, 74, 87d) are summarised — the Grundgesetz as a whole
    // is of course much broader.
    id: "DE-GG-SPACE",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Basic Law for the Federal Republic of Germany — Space-Relevant Articles",
    title_local:
      "Grundgesetz für die Bundesrepublik Deutschland (GG) — raumfahrtrelevante Artikel (Art. 32, 73, 74, 87d)",
    date_enacted: "1949-05-23",
    date_last_amended: "2022-12-19",
    official_reference:
      "BGBl. S. 1, zuletzt geändert durch Art. 1 u. 2 Satz 2 G v. 19.12.2022 I 2478",
    source_url: "https://www.gesetze-im-internet.de/gg/",
    issuing_body: "Parlamentarischer Rat",
    competent_authorities: ["DE-AA", "DE-BMWK"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability"],
    key_provisions: [
      {
        section: "Art. 32",
        title: "Foreign affairs / treaty-making competence",
        summary:
          'Art. 32 Abs. 1 GG: „Die Pflege der Beziehungen zu auswärtigen Staaten ist Sache des Bundes." Establishes that the Federation — not the Länder — has sole competence for concluding international treaties, including UN space treaties (OST 1967, Liability Convention 1972, Registration Convention 1975).',
        complianceImplication:
          "German state responsibility under Art. VI OST is exercised at the federal level. Länder have no authority to authorise or regulate space activities.",
      },
      {
        section: "Art. 73 Abs. 1 Nr. 1",
        title: "Exclusive federal competence: foreign affairs + defence",
        summary:
          'Exclusive federal legislation over „auswärtige Angelegenheiten sowie die Verteidigung einschließlich des Schutzes der Zivilbevölkerung" — the constitutional peg for military space (Bundeswehr) and diplomatic space-treaty implementation.',
      },
      {
        section: "Art. 73 Abs. 1 Nr. 6",
        title: "Exclusive federal competence: air transport",
        summary:
          '„Luftverkehr" is exclusive federal competence. Because § 1 Abs. 2 LuftVG classifies launch vehicles in airspace as Luftfahrzeuge, launch operations inherit this constitutional basis — which is how Germany regulates launch through the LBA today, in the absence of a Weltraumgesetz.',
      },
      {
        section: "Art. 73 Abs. 1 Nr. 7",
        title: "Exclusive federal competence: telecommunications",
        summary:
          "„Postwesen und Telekommunikation\" is exclusive federal competence — the basis for BNetzA's authority to assign satellite frequencies under the TKG and coordinate ITU filings.",
      },
      {
        section: "Art. 73 Abs. 1 Nr. 14",
        title: "Exclusive federal competence: nuclear energy",
        summary:
          'Covers „Erzeugung und Nutzung der Kernenergie" including nuclear propulsion or RTG-powered spacecraft — relevant for deep-space missions using radioisotope power sources.',
      },
      {
        section: "Art. 74 Abs. 1 Nr. 11",
        title: "Concurrent federal competence: commercial law",
        summary:
          '„Recht der Wirtschaft" — the basis for AWG/AWV export-control legislation reaching space-sector goods and technology transfers.',
      },
      {
        section: "Art. 87d Abs. 1",
        title: "Federal air traffic administration",
        summary:
          '„Die Luftverkehrsverwaltung wird in Bundesverwaltung geführt." Makes LBA a federal authority — which is why launch-through-airspace clearances are a federal licensing matter, not a Land matter.',
      },
    ],
    scope_description:
      "Selected constitutional provisions that allocate space-related regulatory competence to the federal level. A full Grundgesetz reading is beyond the scope of ATLAS; this entry is a navigation anchor for researchers tracing why a given space law exists at federal (and not Länder) level.",
    related_sources: [
      "DE-RAUG-1990",
      "DE-LUFTVG",
      "DE-TKG-2021",
      "DE-SATDSIG-2007",
      "DE-AWG-2013",
    ],
    notes: [
      'Germany has no explicit „Raumfahrt" article in the Grundgesetz — federal competence over space derives from the articles above, not from a dedicated provision.',
      "This is the legal-hierarchy ceiling: any future Weltraumgesetz must fit within Art. 73/74 competence.",
    ],
    last_verified: "2026-04-22",
  },

  {
    // RAÜG — the federal law that designates DLR as the agency
    // managing federal space-administration budgets and tasks.
    // Foundational: without it, the question "who at the federal
    // level actually runs space programmes" has no legal answer.
    id: "DE-RAUG-1990",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Act Transferring Administrative Tasks in the Field of Space Flight",
    title_local:
      "Gesetz zur Übertragung von Verwaltungsaufgaben auf dem Gebiet der Raumfahrt (Raumfahrtaufgabenübertragungsgesetz — RAÜG)",
    date_enacted: "1990-06-08",
    date_last_amended: "1998-08-22",
    official_reference:
      "BGBl. I 1990 S. 1014; Neufassung v. 22.8.1998 BGBl. I S. 2510",
    source_url: "https://www.gesetze-im-internet.de/ra_g/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BMWK", "DE-DLR"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    key_provisions: [
      {
        section: "§ 1",
        title: "Transfer of space-administration tasks to DLR",
        summary:
          "The federal government may transfer administrative tasks in the field of space flight to the Deutsches Zentrum für Luft- und Raumfahrt (DLR). This is the legal basis for DLR acting as the federal space agency — managing funding, coordinating ESA contributions, and running national programmes on behalf of the BMWK.",
        complianceImplication:
          "All operators dealing with DLR as the funding/programme authority are dealing with an entity acting under RAÜG § 1 mandate — not under a private contract.",
      },
      {
        section: "§ 2",
        title: "Budget management authority",
        summary:
          '„Soweit das DLR im Rahmen der von ihm wahrgenommenen Aufgaben Haushaltsmittel weiterleitet, sollen ihm diese Mittel zur Bewirtschaftung übertragen werden." Where DLR forwards federal funds, those funds are to be entrusted to DLR for management — the legal anchor for DLR-administered procurement.',
      },
      {
        section: "§ 3",
        title: "Audit rights of the Federal Court of Audit",
        summary:
          "Bundesrechnungshof retains full audit rights over DLR's administration of transferred federal funds. This is why DLR procurement is subject to § 55 BHO (Bundeshaushaltsordnung) and the associated tender procedures.",
      },
    ],
    scope_description:
      "Foundational federal framework law delegating space-administration tasks to DLR. Works in concert with the non-statutory BMWK-DLR assignment agreements that specify which tasks are actually transferred in any given budget year. RAÜG itself is short — its significance is in the constitutional delegation, not the text.",
    related_sources: ["DE-GG-SPACE", "DE-RAUMFAHRTSTRATEGIE-2023"],
    notes: [
      "Germany has no space-specific licensing agency. Where other jurisdictions have a dedicated spaceflight regulator, Germany spreads competence across BAFA (SatDSiG + export control), BNetzA (TKG + spectrum), LBA (LuftVG + airspace), and BSI (cybersecurity). DLR under RAÜG § 1 administers programmes and funding but does not issue operator licences.",
      "Any future Weltraumgesetz will need to either amend RAÜG or sit alongside it — RAÜG remains the foundational delegation once the new act is in force.",
    ],
    last_verified: "2026-04-22",
  },

  {
    // SatDSiV — the implementing regulation that puts concrete
    // technical thresholds on SatDSiG's "high-resolution" definition.
    // Mentioned in SATDSIG.notes but deserves its own entry because
    // operators interact with the thresholds directly during
    // licensing.
    id: "DE-SATDSIV-2008",
    jurisdiction: "DE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Satellite Data Security Regulation",
    title_local: "Satellitendatensicherheitsverordnung (SatDSiV)",
    date_enacted: "2008-03-26",
    date_last_amended: "2023-10-16",
    official_reference:
      "BGBl. I 2008 S. 508, zuletzt geändert durch Art. 1 V v. 16.10.2023 (BGBl. 2023 I Nr. 278)",
    source_url: "https://www.gesetze-im-internet.de/satdsiv/",
    issuing_body: "Bundesregierung (BMWK)",
    competent_authorities: ["DE-BAFA", "DE-BSI"],
    relevance_level: "critical",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["licensing", "data_security"],
    key_provisions: [
      {
        section: "§ 1 Nr. 1",
        title: "High-resolution threshold — optical",
        summary:
          'A satellite Earth observation system qualifies as „hochwertiges Erdfernerkundungssystem" under SatDSiG if it achieves a ground sample distance (GSD) of 2.5 m or finer in at least one spatial direction in the optical spectrum.',
        complianceImplication:
          "Optical EO missions planning GSD ≤ 2.5m are in SatDSiG scope and require BAFA authorisation. Missions at > 2.5m GSD fall outside — which is why many Earth observation demonstration missions are designed at 3-5m to avoid licensing.",
      },
      {
        section: "§ 1 Nr. 2",
        title: "High-resolution threshold — thermal infrared (8-12 µm)",
        summary: "TIR systems cross the threshold at 5 m or finer resolution.",
      },
      {
        section: "§ 1 Nr. 3",
        title: "High-resolution threshold — microwave (1 mm-1 m)",
        summary:
          "Microwave / SAR systems cross the threshold at 3 m or finer resolution.",
        complianceImplication:
          "Most commercial SAR constellations (ICEYE, Capella, Umbra) would be in SatDSiG scope if operated from German jurisdiction — even the coarser 25 cm-1 m resolution modes typically fall well under 3 m.",
      },
      {
        section: "§ 1 Nr. 4",
        title: "High-resolution threshold — hyperspectral",
        summary:
          "Hyperspectral systems with more than 49 spectral channels cross the threshold at 10 m or finer resolution.",
      },
      {
        section: "Anlage 1 & 3",
        title: "Country and area restriction lists",
        summary:
          "BAFA maintains restriction lists (countries and geographic areas) for which data-distribution requests under SatDSiG § 17 receive heightened scrutiny. Annexes 1 and 3 were last updated via the 2023 amendment — operators should re-verify compliance against the current list before each data delivery.",
      },
    ],
    scope_description:
      "Technical implementing regulation for SatDSiG. Defines the resolution thresholds that determine whether an EO system is in scope of the Act at all, and maintains country/area restriction lists used in data-distribution sensitivity assessments.",
    related_sources: ["DE-SATDSIG-2007", "DE-BSI-TR-03140"],
    amends: "DE-SATDSIG-2007",
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "The 2023 amendment (BGBl. 2023 I Nr. 278) updated Anlagen 1 and 3 — the country/area restriction lists — reflecting changes in sanctions policy and intelligence threat assessments.",
      "Thresholds are intentionally conservative compared to global commercial capability in 2026: sub-metre optical and sub-metre SAR are now routinely achievable, so most commercial missions clear the threshold and require authorisation.",
    ],
    last_verified: "2026-04-22",
  },

  {
    // TDDDG (formerly TTDSG until May 2024) — ePrivacy-Directive
    // implementation in German law. Relevant to ATLAS because
    // satellite communication service providers are
    // Telekommunikations­anbieter under the TKG and fall under TDDDG
    // for traffic-data, location-data, and user-consent obligations.
    id: "DE-TDDDG-2021",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Act on Data Protection and Privacy Safeguards in Telecommunications and Digital Services",
    title_local:
      "Gesetz über den Datenschutz und den Schutz der Privatsphäre in der Telekommunikation und bei digitalen Diensten (Telekommunikation-Digitale-Dienste-Datenschutz-Gesetz — TDDDG, bis 13.5.2024 TTDSG)",
    date_enacted: "2021-06-23",
    date_last_amended: "2026-03-10",
    official_reference:
      "BGBl. I 2021 S. 1982, umbenannt durch Art. 8 Nr. 1 G v. 6.5.2024 I Nr. 149 mWv 14.5.2024, zuletzt geändert durch Art. 3 G v. 10.3.2026 I Nr. 64",
    source_url: "https://www.gesetze-im-internet.de/ttdsg/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BNETZA"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["data_security", "cybersecurity"],
    key_provisions: [
      {
        section: "§ 3",
        title:
          "Telekommunikationsgeheimnis (confidentiality of communications)",
        summary:
          "All providers of telecommunications services — including satellite TK networks and VSAT operators — must protect the confidentiality of communications content, metadata, and unsuccessful connection attempts. Extends the Fernmeldegeheimnis (Art. 10 GG) into statutory law with concrete implementation duties.",
        complianceImplication:
          "Satellite operators running user-facing TK services (satcom-as-a-service, IoT connectivity) must implement content-inspection restrictions on their ground segment + mission control systems.",
      },
      {
        section: "§§ 9-13",
        title: "Traffic and location data processing",
        summary:
          "Defines lawful bases for processing connection metadata, billing data, and location data. Traffic data must be deleted or anonymised once no longer needed for the specified purpose. Location data processing requires user consent.",
      },
      {
        section: "§ 25",
        title: "End-device consent (Cookie-Paragraph)",
        summary:
          "Implements Art. 5(3) ePrivacy Directive: storing information on, or accessing information stored in, a user's terminal equipment generally requires prior consent. Applies to satellite terminals, user-equipment onboard data, and mobile apps interacting with satellite services.",
        complianceImplication:
          "B2C satellite IoT deployments (e.g. tracking devices, consumer-grade SatCom terminals) need cookie-equivalent consent flows for any non-essential data access.",
      },
    ],
    scope_description:
      'National implementation of the ePrivacy Directive (2002/58/EC) in German law. Sits alongside the TKG: where the TKG regulates the TK network itself, TDDDG regulates the privacy/confidentiality of the communications flowing through it. The 2024 rename (TTDSG → TDDDG) extended coverage from „Telemedien" to the broader „Digitale Dienste" concept introduced by the EU Digital Services Act.',
    related_sources: ["DE-TKG-2021", "EU-GDPR-2016"],
    notes: [
      "Name history: originally enacted 23.6.2021 as TTDSG (Telekommunikation-Telemedien-Datenschutz-Gesetz). Renamed to TDDDG via Art. 8 DDG v. 6.5.2024, effective 14.5.2024, when the Digitale-Dienste-Gesetz (DDG) replaced the Telemediengesetz (TMG) as the national implementation layer for the EU DSA.",
      'Existing ATLAS references to „TTDSG" remain valid — the URL slug on gesetze-im-internet.de is still /ttdsg/ for backward-compatibility.',
    ],
    last_verified: "2026-04-22",
  },

  {
    // NIS2UmsuCG — still a draft as of April 2026. The Ampel
    // government's Regierungsentwurf (BT-Drs. 20/13367, July 2024)
    // stalled when the coalition collapsed in November 2024. The
    // CDU/SPD coalition (2025) has announced resumed transposition
    // but no verkündetes Gesetz exists yet — confirmed by absence
    // from the gesetze-im-internet.de alphabetical index.
    id: "DE-NIS2UMSUCG-DRAFT",
    jurisdiction: "DE",
    type: "draft_legislation",
    status: "draft",
    title_en: "NIS-2 Transposition and Cybersecurity Strengthening Act (draft)",
    title_local:
      "Gesetz zur Umsetzung der NIS-2-Richtlinie und zur Stärkung der Cybersicherheit (NIS-2-Umsetzungs- und Cybersicherheitsstärkungsgesetz — NIS2UmsuCG)",
    date_published: "2024-07-24",
    parliamentary_reference: "BT-Drs. 20/13367 (Regierungsentwurf, 2024)",
    source_url: "https://dserver.bundestag.de/btd/20/133/2013367.pdf",
    issuing_body: "Bundesministerium des Innern (BMI)",
    amends: "DE-BSIG-NIS2",
    competent_authorities: ["DE-BSI"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
      "launch_provider",
    ],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Art. 1 (BSI-Gesetz-Neufassung)",
        title: "Re-codification of the BSI Act",
        summary:
          'The draft would repeal the existing BSIG and replace it with a new, NIS2-aligned BSI Act. Expands scope from the previous ~2000 KRITIS-Betreiber to an estimated ~30 000 „wichtige" and „besonders wichtige Einrichtungen". Space infrastructure is included in Anlage 1 (Sektor 9).',
        complianceImplication:
          "Scope expansion is dramatic — most commercial ground stations and constellation operators will become in-scope once the law is enacted. Operators should begin gap analyses against draft BSIG now even though the law is not yet in force.",
      },
      {
        section: "Art. 1 § 30 (Meldepflichten)",
        title: "Three-phase incident reporting (24h / 72h / 1M)",
        summary:
          "Transposes Art. 23 NIS2: initial Frühwarnung within 24 hours of detection of a significant cybersecurity incident, update within 72 hours, final report within one month. Reporting channel: BSI-Meldeportal.",
      },
      {
        section: "Art. 1 § 32 (Registrierungspflicht)",
        title: "Mandatory registration with BSI",
        summary:
          "In-scope entities must register with the BSI within three months of the law entering into force (for entities already operating) or within three months of starting operations (for new entities). Non-registration is a bußgeldbewehrte Ordnungswidrigkeit.",
      },
      {
        section: "Art. 1 §§ 65 ff. (Bußgelder)",
        title: "Administrative fines",
        summary:
          'Tiered fines up to €10 million or 2% of worldwide annual turnover for „besonders wichtige Einrichtungen"; up to €7 million or 1.4% for „wichtige Einrichtungen". Enforcement escalated from the prior BSIG regime.',
      },
    ],
    scope_description:
      "The formal transposition instrument for NIS2 Directive (EU) 2022/2555 into German federal law. Germany missed the October 2024 transposition deadline when the Ampel coalition collapsed in November 2024. The CDU/SPD coalition commitment (Koalitionsvertrag 2025) is to resume the transposition; no new Regierungsentwurf has been tabled publicly as of April 2026. The 2024 BT-Drs. 20/13367 remains the best public indicator of the eventual law's content.",
    related_sources: [
      "DE-BSIG-NIS2",
      "DE-KRITIS-DACHG-2026",
      "DE-KOALITIONSVERTRAG-2025",
      "EU-NIS2-2022",
    ],
    implements: "EU-NIS2-2022",
    notes: [
      "Status as of 2026-04-22: NOT YET VERKÜNDET. The law is absent from the alphabetical index on gesetze-im-internet.de — the authoritative test of enactment. Operators currently rely on the existing BSIG (DE-BSIG-NIS2 entry) which contains partial NIS2-aligned provisions from earlier amendments, plus direct application of EU-NIS2-2022 where no national transposition exists.",
      "When verkündet, this entry should be updated: id → DE-NIS2UMSUCG-<year>, status → in_force, add date_enacted and official_reference.",
      "Commission infringement proceedings against Germany for non-transposition were opened in May 2024 (INFR(2024)2115).",
    ],
    last_verified: "2026-04-22",
  },

  {
    // KRITIS-Dachgesetz — just enacted 11.3.2026, in force 17.3.2026.
    // Critically: Weltraum is listed as Sektor 9 in § 4 Abs. 1 Nr. 9.
    // This is the first German law that explicitly names space as
    // critical infrastructure for physical-resilience purposes,
    // separately from (but complementary to) the cyber-resilience
    // obligations of the BSIG.
    id: "DE-KRITIS-DACHG-2026",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "Critical Infrastructure Umbrella Act (Physical Resilience)",
    title_local:
      "Gesetz zur Stärkung der physischen Resilienz kritischer Anlagen (KRITIS-Dachgesetz — KRITIS-DachG)",
    date_enacted: "2026-03-11",
    date_in_force: "2026-03-17",
    official_reference: "BGBl. 2026 I Nr. 66",
    source_url: "https://www.gesetze-im-internet.de/kritisdachg/",
    issuing_body: "Bundestag",
    competent_authorities: ["DE-BSI", "DE-BMWK"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
      "launch_provider",
    ],
    compliance_areas: ["cybersecurity", "licensing"],
    key_provisions: [
      {
        section: "§ 4 Abs. 1 Nr. 9",
        title: "Weltraum as critical-infrastructure sector",
        summary:
          '„Weltraum" is enumerated as one of the ten critical-infrastructure sectors (alongside energy, transport, finance, health, water, food, IT/TK, waste, social-insurance). First explicit statutory designation of space infrastructure as KRITIS in German law — previously space was partially covered under the IT/TK sector via the BSI-Kritisverordnung.',
        complianceImplication:
          "Any space-sector operator whose facility reaches the threshold set by secondary legislation (to be adopted under § 4 Abs. 3) becomes a KRITIS-Betreiber with the full obligations of §§ 11-20 below.",
      },
      {
        section: "§ 3 Abs. 3",
        title: "BMFTR as space-sector competent authority",
        summary:
          "The Bundesministerium für Forschung, Technologie und Raumfahrt (BMFTR — renamed from BMBF in the 2025 cabinet) is designated as the competent authority for ground-infrastructure operations of space-based services.",
      },
      {
        section: "§ 11",
        title: "Risk analyses every four years",
        summary:
          "KRITIS-Betreiber must conduct and document a comprehensive risk analysis of their critical facility every four years, covering natural hazards, technical failures, human/organisational failures, and hostile acts (terrorism, sabotage).",
      },
      {
        section: "§ 12",
        title: "Resilience plans",
        summary:
          "Based on the § 11 risk analysis, operators must prepare and maintain a resilience plan documenting the protective measures taken and planned.",
      },
      {
        section: "§ 14",
        title: "Minimum resilience standards",
        summary:
          "Operators must implement organisational and technical minimum standards covering physical access control, perimeter security, redundancy, emergency power, crisis communication, personnel security, and third-party access. Detailed standards to be issued by secondary regulation. § 14 Abs. 3-5 (enforcement tooling) enters into force 1.1.2030 to give operators a transition period.",
        complianceImplication:
          "Operators must begin implementation now — the four-year risk-analysis cycle means the first cycle should be completed before the § 14 Abs. 3-5 enforcement tools arrive in 2030.",
      },
      {
        section: "§ 18",
        title: "Incident reporting to BBK",
        summary:
          "Significant incidents affecting critical-facility operations must be reported without undue delay to the Bundesamt für Bevölkerungsschutz und Katastrophenhilfe (BBK). Parallel to but distinct from BSIG cyber-incident reporting — a single incident may trigger both.",
        complianceImplication:
          "Space operators must build dual reporting paths: BSIG/NIS2 to BSI for cyber incidents, KRITIS-DachG to BBK for physical-resilience incidents. Expect overlap in many attack scenarios.",
      },
      {
        section: "§ 20",
        title: "Management accountability",
        summary:
          "Geschäftsleitung (management) is personally accountable for implementing and monitoring the resilience measures — not delegable to a CISO or COO.",
      },
    ],
    scope_description:
      "Transposes Directive (EU) 2022/2557 (CER Directive) into German law. Establishes a cross-sector physical-resilience regime for critical infrastructure, complementary to the cyber-resilience regime of NIS2/BSIG. Space is one of ten listed sectors. In force 17.3.2026 with phased implementation; § 14 Abs. 3-5 enforcement tools enter into force 1.1.2030.",
    related_sources: [
      "DE-BSIG-NIS2",
      "DE-NIS2UMSUCG-DRAFT",
      "DE-BSI-KRITISV",
      "EU-CER-2022",
    ],
    implements: "EU-CER-2022",
    notes: [
      "The coordinated 2026 reform: KRITIS-DachG (BGBl. 2026 I Nr. 66) and the parallel amendment of the BSI-Kritisverordnung (BGBl. 2026 I Nr. 66, Art. 9) were published in a single BGBl issue on 11.3.2026.",
      'Thresholds for when a space facility qualifies as a „kritische Anlage" are not in the KRITIS-DachG itself — they are set by secondary regulation under § 4 Abs. 3. Until the sector-specific threshold regulation for Weltraum is published, operators self-assess against generic KRITIS-Verordnung IT/TK thresholds.',
      'BMFTR (Forschung, Technologie und Raumfahrt) was renamed from BMBF in the 2025 CDU/SPD cabinet — „Raumfahrt" was added to the ministry title, reinforcing the political framing of space as a critical federal competence.',
    ],
    last_verified: "2026-04-22",
  },

  {
    // BSI-Kritisverordnung — the threshold-setting regulation under
    // the BSIG. Defines WHO counts as a KRITIS-Betreiber in each of
    // nine sectors. Recently (11.3.2026) amended in parallel with
    // KRITIS-DachG's enactment.
    id: "DE-BSI-KRITISV",
    jurisdiction: "DE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "BSI Critical Infrastructure Regulation",
    title_local:
      "Verordnung zur Bestimmung kritischer Anlagen nach dem BSI-Gesetz (BSI-Kritisverordnung — BSI-KritisV)",
    date_enacted: "2016-04-22",
    date_last_amended: "2026-03-11",
    official_reference:
      "BGBl. I 2016 S. 958, zuletzt geändert durch Art. 9 G v. 11.3.2026 I Nr. 66",
    source_url: "https://www.gesetze-im-internet.de/bsi-kritisv/",
    issuing_body: "Bundesregierung (BMI)",
    competent_authorities: ["DE-BSI"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Anlage 4 (IT und Telekommunikation)",
        title: "IT/TK thresholds covering satellite infrastructure",
        summary:
          "Currently the route by which satellite communication networks, ground-station operators, and uplink facilities enter BSIG scope — via the IT/TK sector thresholds (number of subscribers, traffic volume, content-delivery throughput). Sector-specific space thresholds are expected under secondary regulation to the KRITIS-DachG, which will partially supersede this routing.",
        complianceImplication:
          "Until a dedicated Weltraum-Kritis-Verordnung is issued, space operators assess against Anlage 4 thresholds. Large-constellation ground segments and public satcom providers are likely to cross these thresholds.",
      },
      {
        section: "§§ 1-10 (sector annexes)",
        title: "Nine critical-infrastructure sectors",
        summary:
          "Anlage 1 Energie · Anlage 2 Wasser · Anlage 3 Ernährung · Anlage 4 IT und Telekommunikation · Anlage 5 Gesundheit · Anlage 6 Finanzwesen · Anlage 7 Transport und Verkehr · Anlage 8 Siedlungsabfallentsorgung · Anlage 9 Sozialversicherung/Grundsicherung.",
      },
    ],
    scope_description:
      'The threshold-setting regulation that operationalises the BSIG: translates abstract „kritische Infrastruktur" into measurable criteria (subscribers, throughput, revenue, etc.). Does NOT itself contain a „Weltraum" sector — that was added to the statutory framework by the KRITIS-Dachgesetz 2026. Space operators currently route through the IT/TK sector (Anlage 4) until sector-specific Weltraum thresholds are issued.',
    related_sources: [
      "DE-BSIG-NIS2",
      "DE-KRITIS-DACHG-2026",
      "DE-NIS2UMSUCG-DRAFT",
    ],
    notes: [
      "The 11.3.2026 amendment (BGBl. 2026 I Nr. 66, Art. 9) was the parallel regulation-level change alongside the KRITIS-DachG's statutory changes. A dedicated Weltraum-Anlage is expected but not yet published as of April 2026.",
    ],
    last_verified: "2026-04-22",
  },

  {
    // Ausfuhrliste (AL) — the national export-control list, formally
    // an Anlage to the AWV. Updated frequently; operators interact
    // with the list directly during classification. Kept as a
    // standalone entry for navigability — the underlying legal basis
    // is DE-AWV-2013.
    id: "DE-AUSFUHRLISTE",
    jurisdiction: "DE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "National Export Control List",
    title_local: "Ausfuhrliste (AL) — Anlage AL zur Außenwirtschaftsverordnung",
    date_enacted: "2013-08-02",
    date_last_amended: "2024-12-16",
    official_reference:
      "Anlage AL zur AWV (BGBl. I 2013 S. 2865); fortlaufend geändert durch Verordnungen zur Änderung der AWV, zuletzt v. 16.12.2024",
    source_url:
      "https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/Gueterlisten/Ausfuhrliste/ausfuhrliste_node.html",
    issuing_body: "Bundesministerium für Wirtschaft und Klimaschutz (BMWK)",
    competent_authorities: ["DE-BAFA", "DE-BMWK"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Teil I Abschnitt A",
        title: "National munitions list (A0001-A0024)",
        summary:
          "Mirror of the EU Common Military List with German-specific additions. Space-relevant categories include A0004 (rockets and missiles — covers launch vehicles and derived technology), A0009 (military aerospace vehicles), A0014 (space-launch and reentry vehicle technology), A0016 (specially-designed space components), A0018 (military satellites and payloads). A0014 in particular is broader than the EU common list and captures more dual-use space technology as military-controlled.",
        complianceImplication:
          "Launch-vehicle technology transfers outside Germany require BAFA authorisation in every case — there is no de-minimis exemption. A0014 scope should be assessed before any technical co-operation with foreign partners.",
      },
      {
        section: "Teil I Abschnitt B",
        title: "Additional national controls (B001-B030)",
        summary:
          "Items controlled by Germany beyond the EU Dual-Use Regulation. Less commonly triggered for space but worth screening — e.g. certain encryption modules used in command-and-control links.",
      },
      {
        section: "Teil I Abschnitt C",
        title: "National catch-all provisions",
        summary:
          "Items not specifically listed may nonetheless require authorisation if the exporter knows, or has been informed by BAFA, that they are intended for use in connection with WMD or missile proliferation. Space-adjacent propulsion and guidance technology is a common trigger.",
      },
    ],
    scope_description:
      "The operational classification list used by German exporters to determine whether a space-related good, software, or technology requires an export authorisation. Formally an Anlage to the Außenwirtschaftsverordnung (AWV); updated far more frequently than the base regulation via targeted Änderungsverordnungen published by BMWK in the Bundesanzeiger. Sits alongside the EU Dual-Use Regulation ((EU) 2021/821) — dual-use items are controlled at EU level, military items are controlled here.",
    related_sources: [
      "DE-AWG-2013",
      "DE-AWV-2013",
      "DE-DUALUSE-2021",
      "DE-KWKG",
    ],
    caelex_engine_mapping: ["export-control-engine.server"],
    caelex_data_file_mapping: ["itar-ear-requirements.ts"],
    notes: [
      'For practical compliance, the BAFA „Ausfuhrgenehmigungsportal" (ELAN-K2) is the primary licensing interface. Classification against the AL is the step operators most commonly get wrong — when in doubt, a Nullbescheid request to BAFA is the cheapest insurance.',
      "The AL is a living document. Any operator relying on a specific classification should re-verify against the current published version before each export; the version cited here is the 16.12.2024 update, the most recent as of this entry's last verification.",
    ],
    last_verified: "2026-04-22",
  },

  {
    id: "DE-VVG",
    jurisdiction: "DE",
    type: "federal_law",
    status: "in_force",
    title_en: "German Insurance Contract Act",
    title_local: "Versicherungsvertragsgesetz (VVG)",
    date_enacted: "2007-11-23",
    date_in_force: "2008-01-01",
    date_last_amended: "2024-03-22",
    official_reference: "BGBl. I 2007 S. 2631 (as amended)",
    source_url: "https://www.gesetze-im-internet.de/vvg_2008/",
    issuing_body: "Bundestag",
    competent_authorities: [],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["insurance", "liability"],
    scope_description:
      "Foundational German contract-law statute governing every insurance contract concluded under German law — including third-party-liability covers held to satisfy a future Weltraumgesetz, NIS2-driven cyber covers, and operator-procured launch and in-orbit insurance. Defines pre-contractual disclosure duties (§§ 19-22), claims-handling rules (§§ 100-115), and the consumer-protection regime that distinguishes German policies from London-market wordings.",
    key_provisions: [
      {
        section: "§§ 19-22",
        title: "Pre-contractual disclosure duties",
        summary:
          "The policyholder must disclose all circumstances known to be material to the insurer's risk assessment. Misrepresentation rules differ from English-law uberrima fides — the German regime distinguishes between negligent, grossly-negligent, and fraudulent breach with proportionate remedies.",
      },
      {
        section: "§§ 100-115",
        title: "Liability-insurance rules",
        summary:
          "Direct-action rights of injured third parties, the insurer's duty to defend, and the allocation of settlement-authority between insurer and policyholder. Critical for operator policies covering launch and in-orbit liability.",
      },
      {
        section: "§ 32",
        title: "Mandatory provisions",
        summary:
          "Many VVG provisions are mandatory in favour of the policyholder — operators procuring liability cover under German law cannot fully replicate London-market terms by contract. Choice-of-law shopping is a recurring drafting issue.",
      },
    ],
    related_sources: ["DE-PRODHAFTG", "INT-SPACE-INSURANCE-MARKET"],
    notes: [
      "Operators with German legal seat or German-based risk often procure space cover under English law to avoid the consumer-protective overlay; the choice-of-law analysis is routine on every space-insurance placement involving a German party.",
    ],
    last_verified: "2026-04-22",
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
    scope_description:
      "Technical baseline for space-segment cybersecurity issued by BSI. Defines the threat model (jamming, spoofing, command injection, supply-chain compromise) and mandates measures including encrypted TT&C, authenticated commanding, secure boot, and key management. Quasi-mandatory: ESA, DLR, and Bundeswehr contracts require compliance.",
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
    scope_description:
      "Companion to TR-03184-1 covering ground-segment cybersecurity — mission control, ground stations, TT&C infrastructure, and data processing. Maps onto ISO 27001/27002, NIST CSF, ECSS, CCSDS, and MITRE ATT&CK; serves as BSI's interpretation of 'state of the art' for NIS2-covered space ground infrastructure.",
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
    scope_description:
      "Conformity-assessment standard published March 2026 that defines the audit criteria and procedures for certifying compliance with TR-03184 Parts 1 and 2. The newest BSI space publication — establishes how organizations demonstrate space cybersecurity compliance to regulators and procurers.",
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
    scope_description:
      "BSI's technical conformity-assessment standard mandatory as a prerequisite for any SatDSiG licence. BAFA does not issue Earth-observation licences without a positive BSI TR-03140 evaluation — the IT-security gate that sits inside the SatDSiG authorisation flow.",
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
    scope_description:
      "Application of the BSI IT-Grundschutz methodology to the full space-system lifecycle, defining minimum (Basisabsicherung) and standard (Standardabsicherung) measures for both space and ground segments. Provides a structured certification path that German authorities accept as evidence of NIS2-adequate security.",
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
    scope_description:
      "Strategic policy paper that contextualises TR-03184, IT-Grundschutz, and NIS2 within BSI's broader cybersecurity stance for space infrastructures. Non-binding but signals the regulator's priorities — useful for operators reading the direction of upcoming technical guidance.",
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
    scope_description:
      "Federal Government's 2023 space-policy strategy, with explicit commitment to enacting a comprehensive German Weltraumgesetz covering licensing, registration, liability, and insurance for all non-governmental space activities. Policy-level only — no immediate compliance obligations, but the political foundation for the WRG-Eckpunkte and subsequent legislative work.",
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
    /**
     * M2: status is "superseded" but no concrete successor instrument exists
     * yet — the CDU/SPD coalition (2025) announced its own Weltraumgesetz
     * effort but no draft has been published as of April 2026. Pointing
     * `superseded_by` at the coalition agreement preserves the supersession
     * chain at the political level until a formal successor appears.
     */
    superseded_by: "DE-KOALITIONSVERTRAG-2025",
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
    scope_description:
      "CDU/CSU-SPD coalition agreement for the 21st Bundestag that re-confirms a comprehensive Weltraumgesetz as a legislative priority for the 2025-2029 period, after the previous Ampel coalition failed to deliver. Signals continued political momentum for a unified national space law — operators should anticipate licensing obligations in this legislative window.",
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

  {
    id: "DE-LAENDER-SPACE-CLUSTERS",
    jurisdiction: "DE",
    type: "policy_document",
    status: "in_force",
    title_en:
      "German Länder Space Clusters — Bremen, Bavaria, Baden-Württemberg, Mecklenburg-Vorpommern",
    title_local:
      "Raumfahrtcluster der Bundesländer — Bremen, Bayern, Baden-Württemberg, Mecklenburg-Vorpommern",
    date_published: "2026-04-22",
    source_url:
      "https://www.bmwk.de/Redaktion/DE/Pressemitteilungen/2024/raumfahrtland-deutschland.html",
    issuing_body:
      "Federal-Land coordination (BMWK + Länder economic ministries)",
    competent_authorities: ["DE-BMWK"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    scope_description:
      "Reference for the Land-level industrial-policy and infrastructure context that operators encounter alongside the federal regulatory framework. Bremen is the German space-industry capital (OHB, Airbus DS Bremen, ZARM); Bavaria hosts the Munich/Augsburg cluster (Rocket Factory Augsburg, Isar Aerospace, Mynaric); Baden-Württemberg hosts Tesat-Spacecom and the EU FedKnoten in Stuttgart; Mecklenburg-Vorpommern is the home of OHB Sweden Plant and the proposed Nordholz/Rostock spaceport-from-sea concept.",
    key_provisions: [
      {
        section: "Bremen — Raumfahrtland",
        title: "Bremen as Federal-State centre",
        summary:
          "Bremen Senate has issued multiple Raumfahrtstrategien (most recent 2024) coordinating Land-level R&D funding, ESA-procurement positioning, and industrial-cluster support. Operators basing manufacturing in Bremen can access Land + Federal + ESA funding stacks in parallel.",
      },
      {
        section: "Bavaria — NewSpace cluster",
        title: "Munich/Augsburg ecosystem",
        summary:
          "Bavarian Ministry for Economic Affairs operates the Bavarian Aerospace Cluster (BavAIRia / BavSpace) coordinating Munich-area NewSpace start-ups. The Rocket Factory Augsburg, Isar Aerospace, and Mynaric are anchored in this cluster.",
      },
      {
        section: "MV — Sea-based launch concept",
        title: "GSM seaports concept",
        summary:
          "MV economic ministry has explored a seaborne launch concept off Rostock; status remains feasibility-study as of 2026 with no operational permit framework yet.",
      },
    ],
    related_sources: ["DE-RAUMFAHRTSTRATEGIE-2023"],
    last_verified: "2026-04-22",
  },

  // ─── Debris-Mitigation national stack — 2026 audit additions ───────

  {
    id: "DE-DLR-DEBRIS-POLICY",
    jurisdiction: "DE",
    type: "policy_document",
    status: "in_force",
    title_en:
      "DLR Debris Mitigation Policy — Implementation of ECSS-U-AS-10C in Federal Funded Missions",
    title_local:
      "DLR-Richtlinie zur Vermeidung von Weltraumtrümmern — Umsetzung ECSS-U-AS-10C in bundesgeförderten Missionen",
    date_published: "2022-09-30",
    official_reference: "DLR-RL-7320-01",
    source_url: "https://www.dlr.de/raumfahrt/de/space-debris",
    issuing_body:
      "Deutsches Zentrum für Luft- und Raumfahrt (DLR) — Raumfahrtmanagement",
    competent_authorities: ["DE-DLR"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation"],
    scope_description:
      "DLR's binding internal debris-mitigation policy for all federally-funded German space missions. References ECSS-U-AS-10C Rev.2 as the technical baseline and adds a stricter passivation-evidence requirement (verifiable on-orbit telemetry confirming tank-pressure equalisation). Federal funding decisions condition on policy compliance — a project-internal Critical Design Review milestone explicitly checks PMD reliability ≥ 0.9.",
    key_provisions: [
      {
        section: "§3",
        title: "ECSS adoption",
        summary:
          "DLR-funded missions shall comply with ECSS-U-AS-10C Rev.2 and ISO 24113:2023.",
      },
      {
        section: "§5",
        title: "Passivation telemetry",
        summary:
          "Operators shall provide on-orbit telemetry evidence of tank-pressure equalisation and battery-isolation circuit activation as part of project closure documentation.",
      },
    ],
    related_sources: [
      "INT-ECSS-U-AS-10C",
      "INT-ISO-24113-2023",
      "INT-IADC-MITIGATION-2025",
    ],
    last_verified: "2026-04-27",
  },

  {
    id: "DE-WELTRAUMG-DEBRIS-OBLIGATIONS",
    jurisdiction: "DE",
    type: "draft_legislation",
    status: "draft",
    title_en:
      "Draft German Space Activities Act — Debris Mitigation Obligations (Title IV)",
    title_local:
      "Entwurf Bundes-Weltraumgesetz — Vermeidung von Weltraumtrümmern (Titel IV)",
    date_published: "2024-07-15",
    official_reference: "BMWK Referentenentwurf 2024",
    source_url: "https://www.bmwk.de/Redaktion/DE/Pressemitteilungen/2024",
    issuing_body: "Bundesministerium für Wirtschaft und Klimaschutz (BMWK)",
    competent_authorities: ["DE-BMWK", "DE-DLR"],
    relevance_level: "fundamental",
    applicable_to: ["satellite_operator", "launch_provider"],
    compliance_areas: ["debris_mitigation", "licensing", "liability"],
    scope_description:
      "Title IV of the draft federal Space Activities Act (Weltraumgesetz, expected enactment 2026/2027) introduces, for the first time, statutory PMD and passivation requirements at the federal level for German operators. The draft references ISO 24113:2023 by name and binds licence holders to a 5-year LEO disposal target (consistent with FCC and IADC 2025).",
    key_provisions: [
      {
        section: "§ 24 Entwurf",
        title: "Auflagen zur Vermeidung von Trümmern",
        summary:
          "Genehmigungspflichtige Tätigkeiten sind mit Auflagen zu versehen, die der ISO 24113:2023 sowie ECSS-U-AS-10C Rev.2 entsprechen.",
      },
      {
        section: "§ 25 Entwurf",
        title: "End-of-Life-Verpflichtungen",
        summary:
          "Betreiber müssen Wahrscheinlichkeit der erfolgreichen End-of-Life-Manöver ≥ 0,9 nachweisen; LEO-Verweildauer max. 5 Jahre nach Missionsende.",
      },
      {
        section: "§ 26 Entwurf",
        title: "Passivierung",
        summary:
          "Alle Energiequellen (Treibstoff, Druckbehälter, Batterien) müssen am Missionsende deaktiviert werden; Nachweis durch Telemetrie.",
      },
    ],
    related_sources: [
      "DE-DLR-DEBRIS-POLICY",
      "INT-ISO-24113-2023",
      "INT-IADC-MITIGATION-2025",
    ],
    notes: [
      "Status as of 2026-04: Referentenentwurf published 2024; Bundeskabinett vote expected Q3 2026; in-force target 2027.",
    ],
    last_verified: "2026-04-27",
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
