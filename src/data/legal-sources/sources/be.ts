// src/data/legal-sources/sources/be.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Belgium space law sources — complete legal framework for jurisdiction BE.
 *
 * Sources: ejustice.just.fgov.be, belspo.be, moniteur.be
 * Last verified: 2026-04-14
 *
 * Notable: Belgium enacted Europe's EARLIEST "new wave" national space law
 * (2005, predating France by 3 years). Party to ALL 5 UN space treaties
 * including Moon Agreement (acceded 2004). Unique turnover-based 10% liability
 * cap. Federal-regional export control split across 3 autonomous regions.
 * ESA founding member; hosts ESEC at Redu.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── BE Authorities (15) ──────────────────────────────────────────

export const AUTHORITIES_BE: Authority[] = [
  {
    id: "BE-BELSPO",
    jurisdiction: "BE",
    name_en: "Belgian Federal Science Policy Office",
    name_local:
      "Service public fédéral de programmation Politique scientifique",
    abbreviation: "BELSPO",
    website: "https://www.belspo.be",
    space_mandate:
      "De facto space agency for Belgium. Implements the authorization procedure under the 2005 Space Law, manages ESA contributions (~€296M in 2024, 5th largest contributor), coordinates EU and bilateral space programmes, and maintains the National Register of Space Objects. Space activities represent over 40% of BELSPO's budget. Space Research and Applications directorate (~20 staff). Not formally a space agency — ESA acts as Belgium's de facto space agency. Key contact: Jean-François Mayence, BELSPO Legal Service.",
    legal_basis: "Loi du 17 septembre 2005",
    applicable_areas: ["licensing", "registration", "debris_mitigation"],
  },
  {
    id: "BE-MINISTER-SCIENCE",
    jurisdiction: "BE",
    name_en: "Minister/Secretary of State for Science Policy",
    name_local:
      "Ministre/Secrétaire d'État chargé de la Politique scientifique",
    abbreviation: "Min. Science",
    website: "https://www.belspo.be",
    space_mandate:
      "Issues ministerial authorization decrees (arrêtés ministériels) for space activities under the 2005 law. Recently held by Thomas Dermine (Secretary of State for Economic Recovery, in charge of Science Policy). At CM25 (November 2025, Bremen), Federal Science Minister Vanessa Matz represented Belgium.",
    applicable_areas: ["licensing"],
  },
  {
    id: "BE-MOD",
    jurisdiction: "BE",
    name_en: "Ministry of Defence",
    name_local: "Ministère de la Défense",
    abbreviation: "MOD",
    website: "https://www.mil.be",
    space_mandate:
      "Administers the STAR Plan (Security, Technology, Ambition, and Resilience) with €616M earmarked for space capabilities through 2034: ground-based SSA sensors, optical telescope development, satellite terminals. Cyber Command (5th military component, operational 2024) addresses space asset protection. At CM22, Belgium included €100M from Defence budget for ESA programmes meeting security/defence needs.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "BE-BIPT",
    jurisdiction: "BE",
    name_en: "Belgian Institute for Postal Services and Telecommunications",
    name_local: "Institut belge des services postaux et des télécommunications",
    abbreviation: "BIPT",
    website: "https://www.bipt.be",
    space_mandate:
      "Satellite spectrum management, frequency allocation, and ITU filings as Belgium's notifying administration. Manages satellite earth station licensing under the Royal Decree of 16 April 1998. Independent regulatory status under the Act of 17 January 2003. Primary operating legislation: Electronic Communications Act of 13 June 2005.",
    legal_basis:
      "Act of 17 January 2003; Electronic Communications Act of 13 June 2005",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "BE-APD",
    jurisdiction: "BE",
    name_en: "Belgian Data Protection Authority",
    name_local:
      "Autorité de protection des données / Gegevensbeschermingsautoriteit",
    abbreviation: "APD/GBA",
    website: "https://www.dataprotectionauthority.be",
    space_mandate:
      "GDPR enforcement in Belgium. Established by the Law of 3 December 2017, succeeding the former Privacy Commission. No space-specific guidance issued. The 2022 Royal Decree integrates GDPR compliance into the space authorization framework.",
    legal_basis: "Law of 3 December 2017; Law of 30 July 2018 (GDPR Framework)",
    applicable_areas: ["data_security"],
  },
  {
    id: "BE-CCB",
    jurisdiction: "BE",
    name_en: "Centre for Cybersecurity Belgium",
    name_local: "Centre pour la Cybersécurité Belgique",
    abbreviation: "CCB",
    website: "https://ccb.belgium.be",
    space_mandate:
      "National cybersecurity authority and CSIRT (via CERT.be) under NIS2. Designated by Royal Decree of 9 June 2024. Belgium was the FIRST EU Member State to complete NIS2 transposition (Law of 26 April 2024, in force 18 October 2024). Space classified as sector of high criticality. Uses CyberFundamentals (CyFun®) Framework as domestic ISO 27001 alternative.",
    legal_basis: "Law of 26 April 2024; Royal Decree of 9 June 2024",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "BE-NCCN",
    jurisdiction: "BE",
    name_en: "National Crisis Centre",
    name_local: "Centre de Crise National",
    abbreviation: "NCCN",
    parent_ministry: "FPS Interior",
    website: "https://centredecrise.be",
    space_mandate:
      "Crisis management body for Belgian-registered space object malfunctions. Designated since 2008, confirmed in the 2022 Royal Decree. Operators must notify NCCN of imminent danger — failure forfeits the 10% liability cap.",
    applicable_areas: ["licensing"],
  },
  {
    id: "BE-FPS-FA",
    jurisdiction: "BE",
    name_en: "Federal Public Service Foreign Affairs",
    name_local: "Service public fédéral Affaires étrangères",
    abbreviation: "FPS FA",
    website: "https://diplomatie.belgium.be",
    space_mandate:
      "International space diplomacy and treaty negotiations. Monitors international space policy. Participates in ESA International Relations Committee. Led EU Presidency space priorities in 2024, launching negotiations on the EU Space Act. Belgian delegation at COPUOS headed by Belgian Ambassador in Vienna.",
    applicable_areas: ["licensing"],
  },
  {
    id: "BE-FPS-ECO",
    jurisdiction: "BE",
    name_en: "Federal Public Service Economy — Licence Unit",
    name_local: "Service public fédéral Économie — Unité des licences",
    abbreviation: "FPS Eco",
    website: "https://economie.fgov.be",
    space_mandate:
      "Retains export control competence ONLY for Belgian Army/Police transactions. Nuclear goods exports require authorization from the Federal Minister of Energy, based on CANVEK (Belgian Advisory Committee for Non-Proliferation) advice. For private companies, export licensing is a REGIONAL competence since the Special Law of 12 August 2003.",
    legal_basis: "Special Law of 12 August 2003",
    applicable_areas: ["export_control"],
  },
  {
    id: "BE-WALL-EXPORT",
    jurisdiction: "BE",
    name_en: "Wallonia — Direction de la gestion des licences d'armes",
    name_local: "Direction de la gestion des licences d'armes (DG Economics)",
    abbreviation: "Wall. Export",
    website: "https://economie.wallonie.be",
    space_mandate:
      "Regional export control authority for Wallonia under the Decree of the Walloon Region of 21 June 2012. Handles dual-use and arms export licensing for Wallonia-based space companies including Thales Alenia Space Belgium (Charleroi). Wallonia accounts for >70% of Belgian aeronautical activity.",
    legal_basis: "Decree of the Walloon Region of 21 June 2012",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "BE-FLAND-EXPORT",
    jurisdiction: "BE",
    name_en: "Flanders — Strategic Goods Control Unit",
    name_local: "Strategische Goederen — Vlaamse overheid",
    abbreviation: "Fland. SGC",
    website: "https://www.fdfa.be/en/strategic-goods-control",
    space_mandate:
      "Regional export control authority for Flanders under the Flemish Arms Trade Act of 15 June 2012. Handles dual-use and arms export licensing for Flanders-based space companies including Redwire Space Belgium (Kruibeke). VRI (Vlaamse Ruimtevaartindustrie) represents Flemish space industry.",
    legal_basis: "Flemish Arms Trade Act of 15 June 2012",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "BE-BXL-EXPORT",
    jurisdiction: "BE",
    name_en: "Brussels-Capital — Licensing Office (SPRB)",
    name_local: "Service public régional de Bruxelles — Bureau des licences",
    abbreviation: "BXL Export",
    website: "https://economie-emploi.brussels",
    space_mandate:
      "Regional export control authority for Brussels-Capital Region under the Ordinance of 20 June 2013. Handles dual-use licensing for Brussels-based space companies. BAG (Brussels Aerospace & Defence Group) promotes Brussels aerospace sector.",
    legal_basis: "Ordinance of 20 June 2013",
    applicable_areas: ["export_control"],
  },
  {
    id: "BE-ROB",
    jurisdiction: "BE",
    name_en: "Royal Observatory of Belgium",
    name_local: "Observatoire Royal de Belgique",
    abbreviation: "ROB",
    website: "https://www.astro.oma.be",
    space_mandate:
      "Federal scientific institute under BELSPO. Hosts the Solar-Terrestrial Centre of Excellence (STCE) and the ESA Space Weather Services Coordination Centre (SSCC). Belgium has been a leader in space weather research for 20+ years.",
    applicable_areas: ["environmental"],
  },
  {
    id: "BE-CSL",
    jurisdiction: "BE",
    name_en: "Centre Spatial de Liège",
    name_local: "Centre Spatial de Liège",
    abbreviation: "CSL",
    website: "https://www.csl.uliege.be",
    space_mandate:
      "Applied research centre at the University of Liège (founded 1964). One of four ESA-coordinated testing facilities. Specialises in design, integration, qualification, and calibration of space instruments. ~100 staff, ~€19M turnover, ~60 projects. Major: PROBA-3/ASPIICS, Solar Orbiter, Euclid. FOCAL-7 (7m vacuum chamber) under construction.",
    applicable_areas: ["licensing"],
  },
  {
    id: "BE-VKI",
    jurisdiction: "BE",
    name_en: "Von Karman Institute for Fluid Dynamics",
    name_local: "Institut Von Karman de Dynamique des Fluides",
    abbreviation: "VKI",
    website: "https://www.vki.ac.be",
    space_mandate:
      "Non-profit international research organisation (founded 1956, Rhode-Saint-Genèse). Funded by 16 NATO members plus BELSPO. Operates ~50 facilities including Mach 14/20 hypersonic wind tunnels and 1,200 kW plasmatron for re-entry simulation. Cooperation agreements with ESA (MOU 2011, renewed 2023) and NASA (Space Act Agreement, 2022).",
    applicable_areas: ["licensing"],
  },
];

// ─── International Treaties (BE-specific entries, 6) ──────────────
// NOTE: Belgium ratified ALL 5 UN space treaties — one of fewer than 10 states globally

const TREATIES_BE: LegalSource[] = [
  {
    id: "BE-OST-1967",
    jurisdiction: "BE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Belgium Ratification Record",
    title_local:
      "Traité sur les principes régissant les activités des États en matière d'exploration et d'utilisation de l'espace extra-atmosphérique",
    date_enacted: "1967-01-27",
    date_in_force: "1973-03-28",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations / Parlement fédéral",
    competent_authorities: ["BE-FPS-FA", "BE-BELSPO"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Belgium bears international responsibility for all national space activities including by non-governmental entities. This is the constitutional foundation of the 2005 Space Law.",
        complianceImplication:
          "Art. VI is the direct legal basis for Belgium's authorization regime. Every Belgian space operator must be authorized because Belgium bears responsibility under this article.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "Belgium is a 'launching State' for objects launched from its territory or by Belgian entities. Belgium takes a restrictive position — private actions alone do not implicate Belgium; an act of a state organ is required.",
      },
    ],
    related_sources: [
      "BE-SPACE-LAW-2005",
      "BE-LIABILITY-1972",
      "BE-REGISTRATION-1975",
      "BE-RESCUE-1968",
      "BE-MOON-2004",
    ],
    notes: [
      "Belgium was among the original signatories on 27 January 1967 (opening day).",
      "Ratification deposited 28 March 1973.",
      "Belgium adopted ONLY territorial jurisdiction (ratione loci), rejecting nationality-based jurisdiction — a deliberate choice distinguishing Belgian law from France and others.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-RESCUE-1968",
    jurisdiction: "BE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Rescue Agreement — Belgium Ratification Record",
    date_enacted: "1968-04-22",
    date_in_force: "1977-03-28",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introrescueagreement.html",
    issuing_body: "United Nations / Parlement fédéral",
    competent_authorities: ["BE-FPS-FA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "Rescue and return of astronauts",
        summary:
          "Contracting parties shall notify, rescue, and return astronauts who land in their territory. Belgium ratified — full treaty obligations apply.",
      },
    ],
    related_sources: ["BE-OST-1967", "BE-SPACE-LAW-2005"],
    notes: [
      "Belgium ratified the Rescue Agreement, deposit approximately 28 March 1977.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-LIABILITY-1972",
    jurisdiction: "BE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Belgium Ratification Record",
    date_enacted: "1972-03-29",
    date_in_force: "1976-08-13",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations / Parlement fédéral",
    competent_authorities: ["BE-FPS-FA", "BE-BELSPO"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Belgium as launching State is absolutely liable for damage caused by its space objects on the Earth's surface. The 2005 law implements this through the right of recourse (action récursoire) against the operator, capped at 10% of annual turnover.",
        complianceImplication:
          "The 10% turnover cap is Belgium's distinctive innovation. The cap is forfeited entirely if authorization conditions were violated or the operator failed to notify the Crisis Centre.",
      },
      {
        section: "Art. III",
        title: "Fault-based liability in space",
        summary:
          "For damage in space, the launching State is liable only on a fault basis.",
      },
    ],
    related_sources: ["BE-OST-1967", "BE-SPACE-LAW-2005"],
    notes: [
      "Belgium ratified, deposit approximately 13 August 1976.",
      "The 2005 law's 10% turnover recourse cap directly implements this convention's liability framework domestically.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-REGISTRATION-1975",
    jurisdiction: "BE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Belgium Ratification Record",
    date_enacted: "1975-01-14",
    date_in_force: "1977-02-24",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introregistration-convention.html",
    issuing_body: "United Nations / Parlement fédéral",
    competent_authorities: ["BE-BELSPO", "BE-FPS-FA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Belgium must maintain a national registry of space objects. Implemented through the 2005 law (Chapter V, Art. 14) — BELSPO maintains the National Register and communicates data to the UN Secretary-General.",
        complianceImplication:
          "All space objects for which Belgium qualifies as a launching State must be registered unless registered by another state. Between 2014 and 2020, 36 objects were registered.",
      },
    ],
    related_sources: ["BE-OST-1967", "BE-SPACE-LAW-2005", "BE-RD-2022"],
    notes: ["Belgium ratified, deposit approximately 24 February 1977."],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-MOON-2004",
    jurisdiction: "BE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Moon Agreement — Belgium Accession Record",
    date_enacted: "1979-12-18",
    date_in_force: "2005-01-12",
    date_last_amended: "2004-11-12",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/intromoon-agreement.html",
    issuing_body: "United Nations / Parlement fédéral",
    competent_authorities: ["BE-FPS-FA"],
    relevance_level: "high",
    applicable_to: ["space_resource_operator", "all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 11(1)",
        title: "Common heritage of mankind",
        summary:
          "The Moon and its natural resources are the common heritage of mankind. Belgium is BOUND by this principle as one of approximately 17 parties to the Moon Agreement.",
        complianceImplication:
          "Belgium resolves the Moon Agreement / Artemis Accords tension through pragmatic multilateralism — treating the Accords as non-binding political principles while advocating for a multilateral COPUOS framework for space resources.",
      },
      {
        section: "Art. 11(5)",
        title: "International regime for exploitation",
        summary:
          "An international regime shall govern the exploitation of Moon resources when feasible. Belgium has been the leading advocate within COPUOS for establishing this regime.",
      },
    ],
    scope_description:
      "Belgium acceded on 12 November 2004 as part of a COPUOS-driven push. One of only ~17 parties globally and one of very few ESA member states. Creates unique tension with the Artemis Accords (signed 23 January 2024). Belgium positions itself as a bridge between the Moon Agreement framework and the Artemis programme's operational realities.",
    related_sources: ["BE-OST-1967", "BE-SPACE-LAW-2005", "BE-ARTEMIS-ACCORDS"],
    notes: [
      "Belgium acceded 12 November 2004 — one of very few ESA member states party to the Moon Agreement.",
      "Only ~17 parties globally as of 2026.",
      "Belgium and Greece jointly proposed the COPUOS Working Group on Space Resource Activities (2019).",
      "Belgium submitted formal contributions on potential legal models (A/AC.105/C.2/L.325, 2023).",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-ARTEMIS-ACCORDS",
    jurisdiction: "BE",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Belgium Signatory (2024)",
    date_enacted: "2024-01-23",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["BE-FPS-FA", "BE-BELSPO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Signatories affirm that extraction of space resources does not inherently constitute national appropriation. Belgium signed despite being party to the Moon Agreement — treating the Accords as legally non-binding political principles.",
        complianceImplication:
          "Belgian operators face a dual framework: bound by the Moon Agreement (common heritage) while their state endorses Artemis principles (permissive extraction). Belgium channels both into COPUOS multilateral governance.",
      },
    ],
    related_sources: ["BE-MOON-2004", "BE-OST-1967", "BE-SPACE-LAW-2005"],
    notes: [
      "Belgium signed the Artemis Accords on 23 January 2024 at the Museum of Fine Arts in Brussels.",
      "34th signatory, 11th ESA member state to sign.",
      "Signed by Hadja Lahbib (Foreign Affairs) and Thomas Dermine (Science Policy).",
      "Belgium had been the largest ESA contributor that had not yet signed.",
      "Belgium treats the Accords as non-binding political principles, avoiding formal conflict with Moon Agreement obligations.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Primary National Legislation (2) ────────────────────────────

const PRIMARY_LEGISLATION_BE: LegalSource[] = [
  {
    id: "BE-SPACE-LAW-2005",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law of 17 September 2005 on Space Object Launch, Flight Operation or Guidance Activities",
    title_local:
      "Loi du 17 septembre 2005 relative aux activités de lancement, d'opération de vol ou de guidage d'objets spatiaux",
    date_enacted: "2005-09-17",
    date_in_force: "2006-01-01",
    official_reference: "Numac 2005011439; Moniteur belge 16/11/2005",
    parliamentary_reference: "Chambre 51-1607/1 to 51-1607/5",
    source_url: "https://www.belspo.be/belspo/space/doc/beLaw/Loi_en.pdf",
    issuing_body: "Parlement fédéral",
    competent_authorities: ["BE-BELSPO", "BE-MINISTER-SCIENCE", "BE-NCCN"],
    relevance_level: "critical",
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
        section: "Art. 4",
        title: "Authorization requirement — personal and non-transferable",
        summary:
          "All activities of launching, flight operations, or guidance of space objects within Belgian jurisdiction require prior authorization from the Minister responsible for space research. Authorization is personal and non-transferable.",
        complianceImplication:
          "Belgium adopted ONLY territorial jurisdiction (ratione loci). Application fee: €1,000. Decision within 90 days (extendable to 120). Silence constitutes rejection.",
      },
      {
        section: "Art. 5",
        title: "Authorization conditions — discretionary insurance",
        summary:
          "The King may set conditions addressing safety, environmental protection, optimal use of outer space, Belgian strategic interests, and international compliance. The Minister may attach insurance obligations for third-party liability on a case-by-case basis.",
        complianceImplication:
          "Belgium does NOT mandate a fixed insurance amount. Insurance is discretionary, tailored per activity — distinctly more flexible than France's mandatory €60M cap.",
      },
      {
        section: "Art. 7-8",
        title: "Application requirements and environmental impact",
        summary:
          "Applications require operator/manufacturer identification, activity description, environmental impact study, and collaborator identification. Environmental impact assessment is mandatory, covering both terrestrial and space consequences. Special regime for nuclear energy sources on board.",
        complianceImplication:
          "The 2022 Royal Decree expanded the EIA to include measures for sustainable and rational use of natural resources of the space environment.",
      },
      {
        section: "Art. 14",
        title: "National Register of Space Objects",
        summary:
          "National Register for objects where Belgium qualifies as launching state. Data elements follow Registration Convention Art. IV plus manufacturer, operator, components. Registration at time of launch; modifications communicated within 30 days. BELSPO communicates data to the UN Secretary-General.",
      },
      {
        section: "Art. 15",
        title: "Liability — 10% turnover recourse cap",
        summary:
          "When Belgium is liable under the Outer Space Treaty or Liability Convention, it has a right of recourse (action récursoire) against the operator. The King may CAP this recourse at 10% of the operator's average annual turnover or budget.",
        complianceImplication:
          "The 10% turnover cap is Belgium's most distinctive innovation — a proportional mechanism designed to responsabilize the operator without risking bankruptcy. This model influenced Germany's proposed Space Act and EU Space Act discussions.",
      },
      {
        section: "Art. 15 §4 / Art. 16 §2",
        title: "Cap forfeiture conditions",
        summary:
          "The 10% cap is FORFEITED entirely (operator liable for full damages) if: authorization conditions violated, activities conducted without authorization, authorization obtained through misrepresentation, or operator failed to notify the Crisis Centre of imminent danger.",
        complianceImplication:
          "Strict compliance with authorization conditions is essential to retain the protection of the turnover cap.",
      },
      {
        section: "Art. 19",
        title: "Criminal sanctions",
        summary:
          "Unauthorized space operations: 8 days to 1 year imprisonment and/or fines of €25 to €25,000.",
        complianceImplication:
          "Criminal sanctions are relatively modest compared to Luxembourg (€1.25M) or France (€200K + imprisonment).",
      },
    ],
    scope_description:
      "Europe's EARLIEST 'new wave' national space law — enacted 17 September 2005, predating France (2008), Austria, Denmark, Finland, and the Netherlands. 7 chapters, 21 articles. Three pillars: authorization/supervision, national registry, and liability/recourse. The turnover-based 10% liability cap and discretionary insurance regime are unique Belgian innovations.",
    related_sources: [
      "BE-OST-1967",
      "BE-LIABILITY-1972",
      "BE-REGISTRATION-1975",
      "BE-SPACE-LAW-AMENDMENT-2013",
      "BE-RD-2022",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "Europe's FIRST 'new wave' national space law — predates France (2008), Netherlands (2007), Austria (2011), etc.",
      "Numac 2005011439. Erratum: Numac 2006011075 (6 March 2006).",
      "Belgium adopted ONLY territorial jurisdiction (ratione loci), rejecting nationality-based jurisdiction (ratione personae) — deliberate choice.",
      "10% turnover cap: proportional mechanism now influencing Germany's proposed Space Act and EU Space Act.",
      "Between 2014 and 2020, 7 national activities authorized and 36 objects registered.",
      "Ministerial authorizations issued for: OUFTI-1 (2016), QB50 (2017), QARMAN (2019), ARTHUR-1 (2020), PVCC (2022), VANILLA/SPIP/CASTORS/ROSE (2023).",
    ],
    legislative_history: [
      {
        date: "2005-09-17",
        type: "presidential_signature",
        body: "Royaume de Belgique · Roi Albert II",
        reference: "Loi du 17 septembre 2005 — Numac 2005011439",
        description:
          "Sanction royale par S.M. le Roi Albert II de la 'Loi relative aux activités de lancement, d'opération de vol ou de guidage d'objets spatiaux'.",
        source_url:
          "http://www.ejustice.just.fgov.be/eli/loi/2005/09/17/2005011439/justel",
        verified: true,
        verified_by: "claude (WebFetch, ejustice.just.fgov.be)",
        verified_at: "2026-04-28",
        verification_note:
          "Date de sanction royale 17.9.2005 et Numac 2005011439 vérifiés contre la base ejustice (eli/loi/2005/09/17/2005011439/justel).",
      },
      {
        date: "2005-11-16",
        type: "promulgation",
        body: "Service Public Fédéral Justice · Moniteur belge",
        reference: "Moniteur belge du 16 novembre 2005",
        description:
          "Publication de la loi au Moniteur belge le 16 novembre 2005.",
        source_url:
          "http://www.ejustice.just.fgov.be/eli/loi/2005/09/17/2005011439/justel",
        verified: true,
        verified_by: "claude (WebFetch, ejustice.just.fgov.be)",
        verified_at: "2026-04-28",
        verification_note:
          "Date de publication 16.11.2005 confirmée contre la base ejustice.",
      },
      {
        date: "2006-01-01",
        type: "in_force",
        body: "Royaume de Belgique",
        reference: "Loi du 17 septembre 2005, art. 20 (entrée en vigueur)",
        description:
          "Entrée en vigueur le 1er janvier 2006 conformément à l'art. 20 : « La présente loi entre en vigueur le premier jour du deuxième mois qui suit celui au cours duquel elle aura été publiée au Moniteur belge » — publication 16.11.2005 → EIF 1.1.2006.",
        source_url:
          "http://www.ejustice.just.fgov.be/eli/loi/2005/09/17/2005011439/justel",
        verified: true,
        verified_by: "claude (WebFetch, ejustice.just.fgov.be)",
        verified_at: "2026-04-28",
        verification_note:
          "Date d'entrée en vigueur 1.1.2006 et le texte de l'art. 20 vérifiés contre la base ejustice.",
      },
      {
        date: "2006-03-06",
        type: "amendment",
        body: "Service Public Fédéral Justice · Moniteur belge",
        reference: "Erratum — Numac 2006011075",
        description:
          "Erratum à la loi du 17 septembre 2005 publié au Moniteur belge le 6 mars 2006 (Numac 2006011075, p. 13442) — corrections rédactionnelles sans modification substantielle.",
        source_url:
          "http://www.ejustice.just.fgov.be/eli/loi/2005/09/17/2005011439/justel",
        verified: true,
        verified_by: "claude (WebFetch, ejustice.just.fgov.be)",
        verified_at: "2026-04-28",
        verification_note:
          "Numac de l'erratum 2006011075 et date 6.3.2006 confirmés contre la base ejustice.",
      },
      {
        date: "2013-12-01",
        type: "amendment",
        body: "Royaume de Belgique · Parlement fédéral",
        reference: "Loi du 1er décembre 2013 — Numac 2014021002",
        description:
          "Modification de l'art. 3 (définitions) pour adapter la loi aux objets spatiaux non manœuvrables (cubesats, nanosatellites). Sanction royale 1.12.2013, publication au Moniteur belge 15.1.2014, EIF 15.1.2014.",
        source_url:
          "http://www.ejustice.just.fgov.be/eli/loi/2013/12/01/2014021002/justel",
        verified: true,
        verified_by: "claude (WebFetch, ejustice.just.fgov.be)",
        verified_at: "2026-04-28",
        verification_note:
          "Cross-référence vérifiée contre la fiche BE-SPACE-LAW-AMENDMENT-2013 (Numac 2014021002) — sanction royale 1.12.2013, publication MB 15.1.2014, EIF 15.1.2014 confirmés contre la base ejustice.",
        affected_sections: ["Art. 3 §§ 1, 2, 3, 5 — définitions"],
      },
    ],
    last_verified: "2026-04-28",
  },
  {
    id: "BE-SPACE-LAW-AMENDMENT-2013",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en: "Law of 1 December 2013 — Amendment to 2005 Space Law",
    title_local:
      "Loi du 1er décembre 2013 modifiant la loi du 17 septembre 2005",
    date_enacted: "2013-12-01",
    official_reference: "Numac 2014021002; Moniteur belge January 2014",
    source_url: "https://www.belspo.be/belspo/space/belaw_en.stm",
    issuing_body: "Parlement fédéral",
    competent_authorities: ["BE-BELSPO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    amends: "BE-SPACE-LAW-2005",
    key_provisions: [
      {
        section: "Art. 3, 2°",
        title: "Operator definition — non-manoeuvrable objects",
        summary:
          "For space objects not susceptible to being operated in flight once in orbit (cubesats, nanosatellites), the operator is deemed the person who orders the positioning — the entity contracting for launch.",
        complianceImplication:
          "Cubesat operators who contract for launch into specific orbital parameters are the 'operator' under Belgian law, even without ongoing flight control capability.",
      },
      {
        section: "Art. 3, 3°",
        title: "Effective control — revised definition",
        summary:
          "Changed from 'mastery of command means' to 'authority exercised over the activation of command or telecommand means and, where applicable, associated surveillance means.'",
      },
      {
        section: "Art. 3, 5°",
        title: "Positioning (mise à poste) added",
        summary:
          "Added 'positioning' alongside existing operational concepts of flight operation and guidance.",
      },
    ],
    scope_description:
      "Amended Article 3 to accommodate non-manoeuvrable objects in orbit (cubesats, nanosatellites). Did NOT modify the insurance or liability provisions. Proposed by Minister Paul Magnette (Science Policy).",
    related_sources: ["BE-SPACE-LAW-2005"],
    notes: [
      "Numac 2014021002.",
      "Only substantive amendment to the 2005 law in its 20+ year history.",
      "Three changes to Art. 3: operator definition, effective control, and positioning concept.",
    ],
    legislative_history: [
      {
        date: "2013-12-01",
        type: "presidential_signature",
        body: "Royaume de Belgique · Roi Philippe",
        reference: "Loi du 1er décembre 2013 — Numac 2014021002",
        description:
          "Sanction royale par S.M. le Roi Philippe de la 'Loi modifiant la loi du 17 septembre 2005 relative aux activités de lancement, d'opération de vol ou de guidage d'objets spatiaux'.",
        source_url:
          "http://www.ejustice.just.fgov.be/eli/loi/2013/12/01/2014021002/justel",
        verified: true,
        verified_by: "claude (WebFetch, ejustice.just.fgov.be)",
        verified_at: "2026-04-28",
        verification_note:
          "Date de sanction royale 1.12.2013 et Numac 2014021002 vérifiés contre la base ejustice (eli/loi/2013/12/01/2014021002/justel).",
      },
      {
        date: "2014-01-15",
        type: "promulgation",
        body: "Service Public Fédéral Justice · Moniteur belge",
        reference: "Moniteur belge du 15 janvier 2014",
        description:
          "Publication de la loi modificative au Moniteur belge le 15 janvier 2014.",
        source_url:
          "http://www.ejustice.just.fgov.be/eli/loi/2013/12/01/2014021002/justel",
        verified: true,
        verified_by: "claude (WebFetch, ejustice.just.fgov.be)",
        verified_at: "2026-04-28",
        verification_note:
          "Date de publication 15.1.2014 confirmée contre la base ejustice.",
      },
      {
        date: "2014-01-15",
        type: "in_force",
        body: "Royaume de Belgique",
        reference: "Loi du 1er décembre 2013 — entrée en vigueur",
        description:
          "Entrée en vigueur le jour de la publication au Moniteur belge (15 janvier 2014) — pas de vacatio legis spécifiée.",
        source_url:
          "http://www.ejustice.just.fgov.be/eli/loi/2013/12/01/2014021002/justel",
        verified: true,
        verified_by: "claude (WebFetch, ejustice.just.fgov.be)",
        verified_at: "2026-04-28",
        verification_note:
          "EIF 15.1.2014 (même date que publication) confirmée contre la base ejustice.",
      },
    ],
    last_verified: "2026-04-28",
  },
];

// ─── Implementing Legislation (2) ───────────────────────────────

const IMPLEMENTING_LEGISLATION_BE: LegalSource[] = [
  {
    id: "BE-RD-2022",
    jurisdiction: "BE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Royal Decree of 15 March 2022 — Implementing Decree (current)",
    title_local: "Arrêté royal du 15 mars 2022",
    date_enacted: "2022-03-15",
    date_in_force: "2022-05-12",
    official_reference: "Numac 2022031435; Moniteur belge 12/05/2022",
    source_url:
      "https://www.belspo.be/belspo/space/doc/beLaw/AR20220315_en.pdf",
    issuing_body: "Roi / Conseil des Ministres",
    competent_authorities: ["BE-BELSPO", "BE-NCCN"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "debris_mitigation"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "BELSPO role — application processing",
        summary:
          "BELSPO's role formally specified in receiving and processing applications, replacing the never-activated expert committee system of the 2008 decree. Coordinates ESA technical expertise for Class U (cubesat) objects.",
        complianceImplication:
          "ESA technical expertise is mandatory for Class U objects, with costs borne by the applicant (withdrawal option available). Exceptions for state-supervised activities and operators with prior Class U authorization within 10 years.",
      },
      {
        section: "Transfer provisions",
        title: "Registration transfer framework",
        summary:
          "Framework for both active transfer (Belgium to another state) and passive transfer (another state to Belgium). Registration criteria for privately-launched objects: designed/manufactured in Belgium, launched by Belgian-domiciled entities (5+ years), or part of projects receiving Belgian public funding.",
      },
      {
        section: "GDPR integration",
        title: "Data protection in authorization procedures",
        summary:
          "Personal data excluded from published files. Retention limited to orbital presence duration plus associated risk period.",
      },
      {
        section: "Environmental expansion",
        title: "Space resource sustainability",
        summary:
          "Environmental impact assessment expanded to include measures for the sustainable and rational use of natural resources of the space environment.",
      },
    ],
    scope_description:
      "Replaced and repealed the original Royal Decree of 19 March 2008 (Numac 2008021031). Proposed by Secretary of State Thomas Dermine. Key innovations: BELSPO role codified, mandatory ESA expertise for Class U, transfer of registration framework, GDPR compliance, space resource sustainability in EIA.",
    related_sources: ["BE-SPACE-LAW-2005", "BE-SPACE-LAW-AMENDMENT-2013"],
    notes: [
      "Numac 2022031435. Published Moniteur belge 12 May 2022.",
      "English translation: belspo.be/belspo/space/doc/beLaw/AR20220315_en.pdf",
      "Replaced the 2008 Royal Decree (Numac 2008021031).",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-ESA-REDU-2021",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law of 12 October 2021 — ESA/Belgium ESEC Hosting Agreement (Redu)",
    title_local:
      "Loi du 12 octobre 2021 portant assentiment à l'Accord entre la Belgique et l'ESA concernant le Centre ESEC à Redu",
    date_enacted: "2021-10-12",
    official_reference: "Numac 2021033486",
    source_url: "https://www.belspo.be/belspo/space/belaw_en.stm",
    issuing_body: "Parlement fédéral",
    competent_authorities: ["BE-BELSPO"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESEC hosting agreement ratification",
        summary:
          "Ratifies the hosting agreement between Belgium and ESA concerning the ESEC centre at Redu (signed Brussels, 24 May 2017). ESEC hosts mission control for Proba satellite series, Galileo signal validation, ESA Space Weather Data Centre, and Europe's first cyber-security training centre for space systems (€30M).",
        complianceImplication:
          "ESEC operations in Redu governed by this agreement. Adjacent ESEC-Galaxia site hosts EUSPA's Galileo Integrated Logistic Support Centre (GILSC).",
      },
    ],
    related_sources: ["BE-SPACE-LAW-2005"],
    notes: [
      "Numac 2021033486.",
      "ESEC at Redu operational since 1 January 1968 — part of ESA's Estrack network.",
      "33,000 sq m site with ~40 controllable antennas (S, Ku, Ka, L, C, UHF bands).",
      "Telespazio Belgium provides industrial support (since 2022, succeeding Redu Space Services).",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Cybersecurity (2) ──────────────────────────────────────────

const CYBERSECURITY_BE: LegalSource[] = [
  {
    id: "BE-NIS2-2024",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en: "Law of 26 April 2024 — NIS2 Transposition",
    title_local:
      "Loi du 26 avril 2024 établissant un cadre pour la cybersécurité des réseaux et des systèmes d'information",
    date_enacted: "2024-04-26",
    date_in_force: "2024-10-18",
    source_url: "https://ccb.belgium.be/en/nis2-directive",
    issuing_body: "Parlement fédéral",
    competent_authorities: ["BE-CCB"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 Directive transposition — first in EU",
        summary:
          "Belgium was the FIRST EU Member State to complete NIS2 transposition. Space classified as sector of high criticality (NIS2 Annex I). Entity registration deadline: 18 April 2026. Incident reporting: 24h initial warning, 72h further information, 30-day final report.",
        complianceImplication:
          "Space operators classified as essential entities face mandatory cybersecurity obligations. Management bodies personally liable with mandatory director training. ~1,500 essential and ~2,500 important entities registered by November 2025.",
      },
    ],
    related_sources: ["BE-NIS2-RD-2024"],
    notes: [
      "Belgium was the FIRST EU Member State to complete NIS2 transposition.",
      "In force 18 October 2024.",
      "Uses CyberFundamentals (CyFun®) Framework as domestic ISO 27001 alternative.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-NIS2-RD-2024",
    jurisdiction: "BE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Royal Decree of 9 June 2024 — CCB Designation under NIS2",
    title_local: "Arrêté royal du 9 juin 2024",
    date_enacted: "2024-06-09",
    source_url: "https://ccb.belgium.be",
    issuing_body: "Roi / Conseil des Ministres",
    competent_authorities: ["BE-CCB"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "CCB as national cybersecurity authority",
        summary:
          "Designates the Centre for Cybersecurity Belgium (CCB) as national cybersecurity authority and CSIRT (via CERT.be). Implements the institutional framework for NIS2 enforcement.",
      },
    ],
    related_sources: ["BE-NIS2-2024"],
    last_verified: "2026-04-14",
  },
];

// ─── Telecommunications (2) ─────────────────────────────────────

const TELECOM_BE: LegalSource[] = [
  {
    id: "BE-ECA-2005",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act of 13 June 2005",
    title_local:
      "Loi du 13 juin 2005 relative aux communications électroniques",
    date_enacted: "2005-06-13",
    source_url: "https://www.ejustice.just.fgov.be/eli/loi/2005/06/13",
    issuing_body: "Parlement fédéral",
    competent_authorities: ["BE-BIPT"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Electronic communications framework",
        summary:
          "General authorization regime with BIPT notification for telecommunications providers. Specific spectrum rights require separate user rights. BIPT manages satellite frequency coordination, ITU filings, and satellite earth station licensing.",
        complianceImplication:
          "Satellite operators providing electronic communications services in Belgium must comply with BIPT regulatory requirements and spectrum allocation procedures.",
      },
    ],
    related_sources: ["BE-SAT-EARTH-STATIONS-1998"],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-SAT-EARTH-STATIONS-1998",
    jurisdiction: "BE",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Royal Decree of 16 April 1998 — Satellite Earth Stations",
    title_local:
      "Arrêté royal du 16 avril 1998 relatif aux stations terriennes de satellites",
    date_enacted: "1998-04-16",
    source_url: "https://www.bipt.be",
    issuing_body: "Roi / Conseil des Ministres",
    competent_authorities: ["BE-BIPT"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Satellite earth station licensing",
        summary:
          "Governs satellite earth stations requiring BIPT compliance for fixed and mobile stations. TV reception dishes and satellite phones are exempt.",
      },
    ],
    related_sources: ["BE-ECA-2005"],
    last_verified: "2026-04-14",
  },
];

// ─── Export Control (3) ─────────────────────────────────────────

const EXPORT_CONTROL_BE: LegalSource[] = [
  {
    id: "BE-SPECIAL-LAW-2003",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Special Law of 12 August 2003 — Regional Export Control Transfer",
    title_local:
      "Loi spéciale du 12 août 2003 modifiant la loi spéciale du 8 août 1980",
    date_enacted: "2003-08-12",
    source_url: "https://www.ejustice.just.fgov.be",
    issuing_body: "Parlement fédéral",
    competent_authorities: [
      "BE-FPS-ECO",
      "BE-WALL-EXPORT",
      "BE-FLAND-EXPORT",
      "BE-BXL-EXPORT",
    ],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Transfer of arms/dual-use export licensing to regions",
        summary:
          "Transferred arms and dual-use export licensing from the federal level to Belgium's three regions: Flanders, Wallonia, and Brussels-Capital. Each region has its own authority and legislation. Federal competence retained only for Belgian Army/Police transactions and nuclear goods.",
        complianceImplication:
          "Belgium's most distinctive regulatory feature. Space companies apply for export licences from their regional authority based on establishment location. Companies in Wallonia (e.g., Thales Alenia Space Belgium, Charleroi) apply to Walloon authorities; Flemish-based companies (e.g., Redwire, Kruibeke) apply to Flanders.",
      },
    ],
    related_sources: ["BE-SPACE-LAW-2005"],
    notes: [
      "Creates Europe's most complex dual-use licensing architecture.",
      "Three autonomous regions each with own export control legislation and authority.",
      "Cooperation Agreement of 17 July 2007 governs federal-regional coordination.",
    ],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-FLANDERS-ARMS-2012",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en: "Flemish Arms Trade Act of 15 June 2012",
    title_local: "Vlaams Wapenhandeldecreet van 15 juni 2012",
    date_enacted: "2012-06-15",
    source_url: "https://www.fdfa.be/en/strategic-goods-control",
    issuing_body: "Vlaams Parlement",
    competent_authorities: ["BE-FLAND-EXPORT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Flemish strategic goods export control",
        summary:
          "Flemish regional legislation governing dual-use and arms export licensing. Strategic Goods Control Unit (Flemish Department of Foreign Affairs) handles licensing. Implementing Government Decree of 20 July 2012 provides procedural detail.",
        complianceImplication:
          "All Flanders-based space companies (e.g., Redwire Space Belgium, Newtec, OIP Sensor Systems) must apply for export licences through this regime. Space technology falls under Categories 7 and 9 of the dual-use annex.",
      },
    ],
    related_sources: ["BE-SPECIAL-LAW-2003"],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-WALLONIA-EXPORT-2012",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en: "Decree of the Walloon Region of 21 June 2012 — Export Control",
    title_local: "Décret de la Région wallonne du 21 juin 2012",
    date_enacted: "2012-06-21",
    source_url: "https://economie.wallonie.be",
    issuing_body: "Parlement wallon",
    competent_authorities: ["BE-WALL-EXPORT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Walloon export control framework",
        summary:
          "Walloon regional legislation governing dual-use and arms export licensing. Direction de la gestion des licences d'armes handles licensing. Wallonia accounts for >70% of Belgian aeronautical activity.",
        complianceImplication:
          "All Wallonia-based space companies (e.g., Thales Alenia Space Belgium, Spacebel, Safran Aero Boosters) must apply through this regime.",
      },
    ],
    related_sources: ["BE-SPECIAL-LAW-2003"],
    last_verified: "2026-04-14",
  },
];

// ─── Data Protection (1) ─────────────────────────────────────────

const DATA_PROTECTION_BE: LegalSource[] = [
  {
    id: "BE-GDPR-2018",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en: "Law of 30 July 2018 — GDPR Framework Act",
    title_local:
      "Loi du 30 juillet 2018 relative à la protection des personnes physiques à l'égard des traitements de données à caractère personnel",
    date_enacted: "2018-07-30",
    source_url: "https://www.dataprotectionauthority.be",
    issuing_body: "Parlement fédéral",
    competent_authorities: ["BE-APD"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator", "all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "GDPR national implementation",
        summary:
          "Implements GDPR into Belgian law. The Autorité de protection des données (APD/GBA) enforces compliance. No space-specific GDPR guidance issued. The 2022 Royal Decree integrates GDPR compliance into space authorization framework.",
        complianceImplication:
          "Earth observation operators and satellite data providers processing personal data must comply with GDPR. Personal data from authorization procedures no longer published online under 2022 Royal Decree.",
      },
    ],
    related_sources: ["BE-RD-2022"],
    last_verified: "2026-04-14",
  },
];

// ─── Investment Screening (1) ───────────────────────────────────

const INVESTMENT_SCREENING_BE: LegalSource[] = [
  {
    id: "BE-FDI-2023",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en: "Cooperation Agreement of 30 November 2022 — FDI Screening",
    title_local:
      "Accord de coopération du 30 novembre 2022 relatif au filtrage des investissements directs étrangers",
    date_enacted: "2022-11-30",
    date_in_force: "2023-07-01",
    source_url: "https://www.ejustice.just.fgov.be",
    issuing_body: "Federal/Regional Governments",
    competent_authorities: ["BE-FPS-ECO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Foreign direct investment screening",
        summary:
          "Explicitly lists aerospace, space, and defence as sensitive sectors subject to FDI screening. Coordinated by the Interfederal Screening Committee (ISC). Implements EU FDI Screening Regulation (EU) 2019/452.",
        complianceImplication:
          "Foreign acquisitions of Belgian space companies (e.g., Redwire's €32M acquisition of QinetiQ Space NV in 2022) subject to screening. Aerospace explicitly listed as sensitive sector.",
      },
    ],
    related_sources: ["BE-SPACE-LAW-2005"],
    notes: [
      "In force 1 July 2023.",
      "Aerospace, space, and defence explicitly listed as sensitive sectors.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Policy Documents (2) ───────────────────────────────────────

const POLICY_BE: LegalSource[] = [
  {
    id: "BE-CM25-ESA",
    jurisdiction: "BE",
    type: "policy_document",
    status: "in_force",
    title_en: "Belgium CM25 ESA Commitment (November 2025, Bremen)",
    title_local: "Engagement de la Belgique au CM25 (Bremen, novembre 2025)",
    date_published: "2025-11-01",
    // Policy/announcement document — canonical reference is the BELSPO
    // space portal section (no per-CM page exists).
    source_url: "https://www.belspo.be/belspo/space/index_en.stm",
    issuing_body: "BELSPO / Federal Government",
    competent_authorities: ["BE-BELSPO"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Programme",
        title: "Five-year ESA commitment ~€1.1 billion",
        summary:
          "Belgium committed approximately €1.1 billion over five years at ESA CM25: €114M for European launcher development, €113M for Earth observation/Copernicus, €205M for scientific research, €110M for space exploration, and significant allocations for space resilience.",
        complianceImplication:
          "Belgium's 5th largest ESA contributor status signals continued commitment. ESA contribution in 2024: €296M.",
      },
    ],
    related_sources: ["BE-SPACE-LAW-2005"],
    last_verified: "2026-04-14",
  },
  {
    id: "BE-BENELUX-MOU-2024",
    jurisdiction: "BE",
    type: "policy_document",
    status: "in_force",
    title_en: "Benelux Space Cooperation MOU (September 2024)",
    title_local: "Mémorandum de coopération spatiale Benelux (septembre 2024)",
    date_published: "2024-09-01",
    // Inter-governmental MOU — canonical reference is BELSPO's policy index
    // (no per-MOU page published in primary register).
    source_url: "https://www.belspo.be/belspo/space/index_en.stm",
    issuing_body: "SpaceNed / VRI / BAG / Wallonie Espace",
    competent_authorities: ["BE-BELSPO"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "MOU",
        title: "Benelux space industry cooperation",
        summary:
          "MOU between SpaceNed (Netherlands), VRI (Flanders), BAG (Brussels), and Wallonie Espace (Wallonia) fostering Benelux space cooperation. Signed during Belgium's 2024 EU Council Presidency.",
      },
    ],
    related_sources: ["BE-SPACE-LAW-2005"],
    last_verified: "2026-04-14",
  },
];

// ─── EU Law — BE-specific (1) ───────────────────────────────────

const EU_BE: LegalSource[] = [
  {
    id: "BE-CRA-2024",
    jurisdiction: "BE",
    type: "eu_regulation",
    status: "in_force",
    title_en:
      "Cyber Resilience Act (Regulation (EU) 2024/2847) — Belgian Application",
    title_local:
      "Cyber Resilience Act — Verordening (EU) 2024/2847 (Belgian implementation context)",
    date_enacted: "2024-10-23",
    date_in_force: "2024-12-10",
    source_url: "https://eur-lex.europa.eu/eli/reg/2024/2847/oj",
    issuing_body: "European Parliament and Council",
    competent_authorities: ["BE-CCB"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full regulation",
        title: "Product cybersecurity for space components",
        summary:
          "Applies to all products with digital elements on the EU market including satellite components, ground station software, on-board computers, and mission control systems. Most obligations apply from 11 December 2027; vulnerability reporting from 11 September 2026. Directly applicable without transposition.",
        complianceImplication:
          "Belgian manufacturers (Redwire Space Belgium, Thales Alenia Space Belgium, Aerospacelab, Spacebel) must prepare for compliance. Particularly relevant for on-board software and ground segment digital products.",
      },
    ],
    related_sources: ["BE-NIS2-2024"],
    last_verified: "2026-04-14",
  },
];

// ─── Federal-Regional Structure (1) ─────────────────────────────

const FEDERAL_STRUCTURE_BE: LegalSource[] = [
  {
    id: "BE-BWHI-1980",
    jurisdiction: "BE",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Special Law on Institutional Reform (BWHI-LSRI) — Space Competence",
    title_local:
      "Bijzondere Wet op de Hervorming der Instellingen / Loi spéciale de réformes institutionnelles",
    date_enacted: "1980-08-08",
    date_last_amended: "2003-08-12",
    source_url: "https://www.ejustice.just.fgov.be",
    issuing_body: "Parlement fédéral",
    competent_authorities: ["BE-BELSPO", "BE-FPS-FA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 6bis, §2, 3°",
        title: "Space research as exclusive federal competence",
        summary:
          "Space research in the frame of international and supranational institutions or agreements is an exclusive federal competence. All ESA activities, bilateral/multilateral cooperation, and authorization regime fall exclusively within federal government.",
        complianceImplication:
          "The 2005 Space Law is exclusively federal. However, export control is regional (Special Law of 2003) and STI is parallel competence — creating Belgium's distinctive multi-level governance.",
      },
    ],
    related_sources: ["BE-SPACE-LAW-2005", "BE-SPECIAL-LAW-2003"],
    notes: [
      "Space authorization: exclusively federal.",
      "Export control: exclusively regional (since 2003).",
      "Science, technology, innovation: parallel competence (all levels).",
      "This multi-level structure is unique in European space governance.",
    ],
    last_verified: "2026-04-14",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_BE: LegalSource[] = [
  ...TREATIES_BE,
  ...PRIMARY_LEGISLATION_BE,
  ...IMPLEMENTING_LEGISLATION_BE,
  ...CYBERSECURITY_BE,
  ...TELECOM_BE,
  ...EXPORT_CONTROL_BE,
  ...DATA_PROTECTION_BE,
  ...INVESTMENT_SCREENING_BE,
  ...POLICY_BE,
  ...EU_BE,
  ...FEDERAL_STRUCTURE_BE,
];
