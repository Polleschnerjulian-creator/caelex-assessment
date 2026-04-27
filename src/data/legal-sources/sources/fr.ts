// src/data/legal-sources/sources/fr.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * French space law sources — complete legal framework for jurisdiction FR.
 *
 * Sources: Legifrance, CNES, SGDSN, Journal Officiel, Ministère des Armées
 * Last verified: 2026-04-13
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── French Authorities (15) ────────────────────────────────────────

export const AUTHORITIES_FR: Authority[] = [
  {
    id: "FR-CNES",
    jurisdiction: "FR",
    name_en: "National Centre for Space Studies",
    name_local: "Centre National d'Études Spatiales",
    abbreviation: "CNES",
    website: "https://www.cnes.fr",
    space_mandate:
      "French space agency and technical authority under the Loi relative aux opérations spatiales (LOS 2008). Maintains the national space object register. Exercises police spéciale at the Centre Spatial Guyanais (CSG). Conducts technical assessments for authorization decisions. Budget ~€3B.",
    legal_basis:
      "Loi n° 61-1382 du 19 décembre 1961; Code de la recherche L.331-1 to L.331-8",
    applicable_areas: [
      "licensing",
      "registration",
      "debris_mitigation",
      "environmental",
    ],
  },
  {
    id: "FR-CDE",
    jurisdiction: "FR",
    name_en: "Space Command",
    name_local: "Commandement de l'Espace",
    abbreviation: "CDE",
    website: "https://www.defense.gouv.fr/espace",
    space_mandate:
      "Military space operations command. Conducts space situational awareness (SSA), active space defense, and space surveillance under French military authority. Established by Arrêté du 3 septembre 2019.",
    legal_basis: "Arrêté du 3 septembre 2019",
    applicable_areas: ["military_dual_use", "space_traffic_management"],
  },
  {
    id: "FR-DGA",
    jurisdiction: "FR",
    name_en: "Directorate General for Armament",
    name_local: "Direction Générale de l'Armement",
    abbreviation: "DGA",
    parent_ministry: "Ministère des Armées",
    website: "https://www.defense.gouv.fr/dga",
    space_mandate:
      "Military space procurement and dual-use technology control. Manages acquisition of military satellite systems (CSO, Syracuse, CERES) and oversees defense space technology exports.",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "FR-DGAC",
    jurisdiction: "FR",
    name_en: "Directorate General for Civil Aviation",
    name_local: "Direction Générale de l'Aviation Civile",
    abbreviation: "DGAC",
    parent_ministry: "Ministère de la Transition Écologique",
    website:
      "https://www.ecologie.gouv.fr/direction-generale-laviation-civile-dgac",
    space_mandate:
      "Manages airspace restrictions during launches from the Centre Spatial Guyanais and coordinates NOTAMs for launch windows.",
    applicable_areas: ["licensing"],
  },
  {
    id: "FR-ARCEP",
    jurisdiction: "FR",
    name_en: "Electronic Communications and Postal Regulatory Authority",
    name_local:
      "Autorité de Régulation des Communications Électroniques, des Postes et de la Distribution de la Presse",
    abbreviation: "ARCEP",
    website: "https://www.arcep.fr",
    space_mandate:
      "Satellite frequency authorizations under the Code des postes et des communications électroniques (CPCE). Regulates satellite broadband operators and ensures compliance with frequency assignment conditions.",
    legal_basis: "Code des postes et des communications électroniques",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "FR-ANFR",
    jurisdiction: "FR",
    name_en: "National Frequency Agency",
    name_local: "Agence Nationale des Fréquences",
    abbreviation: "ANFR",
    website: "https://www.anfr.fr",
    space_mandate:
      "Submits ITU frequency declarations and coordination filings on behalf of France. Manages the national frequency allocation table. Coordinates spectrum use between civil, military, and scientific users including satellite operators.",
    legal_basis: "Loi n° 96-659 du 26 juillet 1996",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "FR-ANSSI",
    jurisdiction: "FR",
    name_en: "National Cybersecurity Agency of France",
    name_local: "Agence Nationale de la Sécurité des Systèmes d'Information",
    abbreviation: "ANSSI",
    website: "https://www.ssi.gouv.fr",
    space_mandate:
      "Space cybersecurity authority. Supervises operators of vital importance (OIV) in the space sector. Designated NIS2 national authority under the Loi Résilience transposition. Issues security frameworks and conducts audits of critical space infrastructure.",
    legal_basis: "Décret n° 2009-834 du 7 juillet 2009",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "FR-CNIL",
    jurisdiction: "FR",
    name_en: "National Commission on Informatics and Liberty",
    name_local: "Commission Nationale de l'Informatique et des Libertés",
    abbreviation: "CNIL",
    website: "https://www.cnil.fr",
    space_mandate:
      "Data protection authority for Earth observation data with personal data implications. Enforces GDPR and Loi n° 78-17 (Loi Informatique et Libertés) as they apply to satellite-derived geospatial data processing.",
    legal_basis: "Loi n° 78-17 du 6 janvier 1978",
    applicable_areas: ["data_security"],
  },
  {
    id: "FR-SGDSN",
    jurisdiction: "FR",
    name_en: "Secretariat-General for National Defence and Security",
    name_local: "Secrétariat Général de la Défense et de la Sécurité Nationale",
    abbreviation: "SGDSN",
    website: "https://www.sgdsn.gouv.fr",
    space_mandate:
      "Coordinates national space security policy. Administers the Earth observation data regime under LOS Art. 23-25 (Décret n° 2009-640). Authored the Stratégie Nationale Spatiale 2025-2040. Chairs the CIEEMG (defense export commission).",
    applicable_areas: ["data_security", "military_dual_use"],
  },
  {
    id: "FR-MINARMES",
    jurisdiction: "FR",
    name_en: "Ministry of the Armed Forces",
    name_local: "Ministère des Armées",
    abbreviation: "MinArmées",
    website: "https://www.defense.gouv.fr",
    space_mandate:
      "Space defense policy authority. Author of the Stratégie Spatiale de Défense (2019). Co-tutelle over CNES alongside MESR and Économie. Responsible for the Loi de Programmation Militaire (LPM) space investment (€10.2B through 2030).",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "FR-MINECO",
    jurisdiction: "FR",
    name_en: "Ministry of the Economy — Directorate General for Enterprise",
    name_local:
      "Ministère de l'Économie, des Finances et de la Souveraineté Industrielle et Numérique — DGE",
    abbreviation: "MinÉco/DGE",
    website: "https://www.economie.gouv.fr",
    space_mandate:
      "Chef de file for space industrial policy. Manages France 2030 space investments (€1.5B under Objective 9). Administers dual-use export controls via the Service des Biens à Double Usage (SBDU) and the EGIDE platform.",
    applicable_areas: ["export_control", "licensing"],
  },
  {
    id: "FR-MESR",
    jurisdiction: "FR",
    name_en: "Ministry of Higher Education and Research",
    name_local: "Ministère de l'Enseignement Supérieur et de la Recherche",
    abbreviation: "MESR",
    website: "https://www.enseignementsup-recherche.gouv.fr",
    space_mandate:
      "Primary tutelle ministry over CNES. Oversees the Code de la recherche provisions governing the space agency's mission, organization, and governance.",
    applicable_areas: ["licensing"],
  },
  {
    id: "FR-ASN",
    jurisdiction: "FR",
    name_en: "Nuclear Safety Authority",
    name_local: "Autorité de Sûreté Nucléaire",
    abbreviation: "ASN",
    website: "https://www.asn.fr",
    space_mandate:
      "Nuclear safety for nuclear-powered spacecraft and radioisotope thermoelectric generators (RTGs). Oversight of any mission involving nuclear materials launched from or operated under French jurisdiction.",
    applicable_areas: ["environmental"],
  },
  {
    id: "FR-PREFET-GUYANE",
    jurisdiction: "FR",
    name_en: "Prefect of the Guiana Region",
    name_local: "Préfet de la Région Guyane",
    abbreviation: "Préfet Guyane",
    website: "https://www.guyane.gouv.fr",
    space_mandate:
      "Territorial authority for the Centre Spatial Guyanais (CSG) in Kourou. Coordinates local security, ICPE (classified installations) permits, SEVESO oversight, and environmental protection for launch operations.",
    applicable_areas: ["licensing", "environmental"],
  },
  {
    id: "FR-DRM",
    jurisdiction: "FR",
    name_en: "Military Intelligence Directorate",
    name_local: "Direction du Renseignement Militaire",
    abbreviation: "DRM",
    parent_ministry: "Ministère des Armées",
    website: "https://www.defense.gouv.fr/drm",
    space_mandate:
      "Military satellite payload control and intelligence exploitation. Operates imagery intelligence (IMINT) from CSO constellation. Reviews military payload authorizations.",
    applicable_areas: ["military_dual_use"],
  },
];

// ─── International Treaties ratified by FR (FR-specific entries only) ──
//
// TODO(H6 data consolidation): INT-ISS-1998 and INT-CTBT-1996 below carry
// `jurisdiction: "INT"` but live in this country file. They are reachable
// via getLegalSourceById() but are NOT part of JURISDICTION_DATA.get("INT")
// in src/data/legal-sources/index.ts, which breaks the single-source-of-
// truth contract. Before migrating them into sources/intl.ts, the full
// ratifier list (applies_to_jurisdictions) needs to be researched from
// UN Treaty Collection — do not guess.

const TREATIES_FR: LegalSource[] = [
  {
    id: "INT-ISS-1998",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Intergovernmental Agreement on the International Space Station",
    title_local:
      "Accord intergouvernemental relatif à la Station spatiale internationale",
    date_enacted: "1998-01-29",
    date_in_force: "2001-03-27",
    official_reference:
      "Loi n° 2004-1107 du 18/10/2004; Décret n° 2005-1498 du 05/12/2005",
    source_url:
      "https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/International_Space_Station/International_Space_Station_legal_framework",
    issuing_body:
      "Governments of the United States, Russia, Japan, Canada, and ESA Member States",
    competent_authorities: ["FR-CNES"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability"],
    key_provisions: [
      {
        section: "Art. 16",
        title: "Cross-waiver of liability",
        summary:
          "Partner States and their related entities agree to a cross-waiver of liability for damage arising out of ISS activities, except for wilful misconduct and certain IP claims.",
        complianceImplication:
          "French entities operating payloads on the ISS benefit from the cross-waiver regime. This is a unique liability framework that departs from the standard Liability Convention regime.",
      },
      {
        section: "Art. 21",
        title: "Intellectual property",
        summary:
          "IP produced on a Partner's element is treated as if produced in that Partner's territory, applying national IP laws.",
      },
    ],
    related_sources: ["FR-INT-OST-RATIFICATION", "INT-ESA-CONV-1975"],
    notes: [
      "France ratified via Loi n° 2004-1107 du 18/10/2004 and Décret n° 2005-1498 du 05/12/2005.",
      "France participates through ESA's contribution (Columbus module, ATV, crew participation).",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "INT-CTBT-1996",
    jurisdiction: "INT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Comprehensive Nuclear-Test-Ban Treaty",
    title_local: "Traité d'interdiction complète des essais nucléaires (TICE)",
    date_enacted: "1996-09-24",
    official_reference: "Loi n° 98-164 du 6 avril 1998",
    source_url: "https://www.ctbto.org/the-treaty/treaty-text",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["FR-MINARMES"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "environmental"],
    key_provisions: [
      {
        section: "Art. I",
        title: "Basic obligations",
        summary:
          "Each State Party undertakes not to carry out any nuclear weapon test explosion or any other nuclear explosion, including in outer space.",
        complianceImplication:
          "Prohibits any nuclear test or explosion in outer space. France was one of the first nuclear-weapon states to ratify (6 April 1998), reflecting its commitment after ending Pacific nuclear testing.",
      },
      {
        section: "Art. IV",
        title: "Verification regime",
        summary:
          "Establishes the International Monitoring System (IMS) with seismic, hydroacoustic, infrasound, and radionuclide stations. France hosts multiple IMS stations.",
      },
    ],
    related_sources: ["FR-INT-OST-RATIFICATION"],
    notes: [
      "France ratified on 6 April 1998 — one of the first nuclear-weapon states to do so.",
      "While the CTBT has not formally entered into force (pending ratification by key states), France treats it as binding.",
    ],
    last_verified: "2026-04-13",
  },
  // H6 fix: FR-INT-MOON-1979 removed as a duplicate of the canonical
  // INT-MOON-1979 in sources/intl.ts, which already lists France under
  // signed_by_jurisdictions (signed 1980, never ratified). Keeping two
  // records for the same instrument caused a jurisdiction mismatch
  // ("jurisdiction: INT" inside fr.ts) and a conflicting narrative on
  // ratification status.
  {
    id: "FR-INT-OST-RATIFICATION",
    jurisdiction: "FR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — French Ratification Record",
    title_local:
      "Traité sur les principes régissant les activités des États en matière d'exploration et d'utilisation de l'espace extra-atmosphérique — Ratification française",
    date_enacted: "1967-01-27",
    date_in_force: "1970-08-05",
    official_reference: "Décret n° 70-960 du 16/10/1970; Loi du 19 juin 1970",
    source_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000878178",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["FR-CNES"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "France bears international responsibility for all French space activities, including those by non-governmental entities. This is the constitutional foundation of the LOS 2008 authorization regime.",
        complianceImplication:
          "Art. VI is the direct legal basis for France's Loi relative aux opérations spatiales (LOS 2008). Every French space operator must be authorized because France bears responsibility under this article.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "France is a 'launching State' for objects launched from CSG (Kourou) and by French operators. This drives the mandatory insurance requirements of LOS Art. 6.",
        complianceImplication:
          "As the primary European launch state (via CSG), France bears significant launching state liability exposure, which underpins the strict insurance regime in LOS 2008.",
      },
    ],
    related_sources: ["FR-LOS-2008", "INT-ESA-CONV-1975"],
    notes: [
      "France ratified the Outer Space Treaty on 5 August 1970 (Décret n° 70-960 du 16/10/1970, Loi du 19 juin 1970).",
      "Art. VI is the foundational legal basis for the entire French space authorization framework (LOS 2008).",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-INT-REGISTRATION-1975",
    jurisdiction: "FR",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Registration Convention — French Ratification Record (First State to Ratify)",
    title_local:
      "Convention sur l'immatriculation des objets lancés dans l'espace extra-atmosphérique — Ratification française",
    date_enacted: "1975-01-14",
    date_in_force: "1976-09-15",
    official_reference: "Décret n° 76-1011 du 5 novembre 1976",
    source_url:
      "https://treaties.un.org/Pages/ViewDetails.aspx?src=IND&mtdsg_no=XXIV-1&chapter=24&clang=_en",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["FR-CNES"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "France must maintain a national registry of space objects launched into Earth orbit or beyond. CNES manages the French national register under LOS Art. 12.",
        complianceImplication:
          "All space objects launched under French jurisdiction must be registered. CNES maintains the register; operators must provide required data under Décret n° 2009-644.",
      },
      {
        section: "Art. IV",
        title: "Registration data requirements",
        summary:
          "France must furnish to the UN: name of launching State(s), designator/registration number, date and territory of launch, basic orbital parameters, and general function.",
      },
    ],
    related_sources: ["FR-LOS-2008", "FR-DECRET-2009-644"],
    notes: [
      "France was the FIRST state to ratify the Registration Convention (17 December 1975), reflecting its early commitment to space governance transparency.",
      "French registration obligations are implemented through LOS Art. 12 and Décret n° 2009-644.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-INT-RESCUE-1968",
    jurisdiction: "FR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Rescue Agreement — French Ratification Record",
    title_local:
      "Accord sur le sauvetage des astronautes, le retour des astronautes et la restitution des objets lancés dans l'espace extra-atmosphérique — Ratification française",
    date_enacted: "1968-04-22",
    date_in_force: "1975-12-31",
    official_reference: "Décret n° 76-1 du 02/01/1976",
    source_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000505530",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["FR-CNES"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "Rescue and return of astronauts",
        summary:
          "France as a contracting party shall notify, rescue, and return astronauts who land in French territory (including overseas territories). Relevant for re-entry scenarios over French Guiana.",
        complianceImplication:
          "CSG proximity creates specific rescue obligations. France maintains emergency response capabilities for crew return scenarios in the Guiana region.",
      },
      {
        section: "Art. 5",
        title: "Return of space objects",
        summary:
          "Space objects found in French territory shall, upon request, be returned to the launching authority. Operators should plan for controlled re-entry to avoid triggering return obligations.",
      },
    ],
    related_sources: ["FR-INT-OST-RATIFICATION", "FR-LOS-2008"],
    notes: [
      "France ratified the Rescue Agreement in 1975 (Décret n° 76-1 du 02/01/1976).",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-INT-LIABILITY-1972",
    jurisdiction: "FR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — French Ratification Record",
    title_local:
      "Convention sur la responsabilité internationale pour les dommages causés par des objets spatiaux — Ratification française",
    date_enacted: "1972-03-29",
    date_in_force: "1975-12-31",
    official_reference:
      "Loi n° 75-1131 du 10/12/1975; Décret n° 76-1 du 02/01/1976",
    source_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000000700077",
    issuing_body: "United Nations General Assembly",
    competent_authorities: ["FR-CNES"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "France as launching State is absolutely liable for damage caused by space objects on the surface of the Earth or to aircraft in flight. This drives the mandatory insurance requirements in LOS Art. 6.",
        complianceImplication:
          "As the primary European launch state (CSG), France bears significant absolute liability exposure for surface damage from launches. This is the direct legal basis for the strict LOS insurance regime.",
      },
      {
        section: "Art. III",
        title: "Fault-based liability in space",
        summary:
          "In-orbit damage requires proof of fault. Less burdensome than surface liability but still drives collision avoidance obligations under the Technical Regulations.",
      },
      {
        section: "Art. V",
        title: "Joint and several liability",
        summary:
          "Joint launches (e.g., Ariane rideshare missions from CSG) create joint liability. France and co-launching States are jointly and severally liable.",
        complianceImplication:
          "Rideshare missions from CSG involve multiple launching States. Each participating State can be held liable for the full damage amount.",
      },
    ],
    related_sources: [
      "FR-INT-OST-RATIFICATION",
      "FR-LOS-2008",
      "FR-CODE-ASSURANCES-SPACE",
    ],
    notes: [
      "France ratified the Liability Convention in 1975 (Loi n° 75-1131 du 10/12/1975, Décret n° 76-1 du 02/01/1976).",
      "The Liability Convention is the direct legal basis for the LOS 2008 insurance and liability regime (Art. 6, Art. 13-20).",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── LOS Framework — National Law (7) ──────────────────────────────

const LOS_FRAMEWORK_FR: LegalSource[] = [
  {
    id: "FR-LOS-2008",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Law on Space Operations",
    title_local:
      "Loi n° 2008-518 du 3 juin 2008 relative aux opérations spatiales",
    date_enacted: "2008-06-03",
    date_in_force: "2008-12-10",
    date_last_amended: "2023-08-01",
    official_reference: "JORF n° 0128 du 4 juin 2008",
    source_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000018931380",
    issuing_body: "Parlement (Assemblée nationale + Sénat)",
    competent_authorities: ["FR-CNES", "FR-MESR", "FR-MINARMES"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "registration",
      "liability",
      "insurance",
      "debris_mitigation",
      "data_security",
      "environmental",
    ],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Definitions — opération spatiale",
        summary:
          "Defines 'space operation' as any activity of launching, attempting to launch, or taking command of a space object, as well as all phases of flight until end of the object's active life or return to Earth. Also defines 'space operator'.",
        complianceImplication:
          "Broad definition captures launch providers, satellite operators, and in-orbit service providers. Any entity conducting these activities under French jurisdiction needs authorization.",
      },
      {
        section: "Art. 2-8 (Titre II)",
        title: "Authorization regime",
        summary:
          "Any operator conducting space operations under French jurisdiction must obtain prior authorization from the Minister. Dual authorization required: one for launch, one for command of space object. License conditions include technical, financial, and moral requirements.",
        complianceImplication:
          "The authorization regime is the core obligation. Applications require a 3-part dossier (administrative, technical, defense) under Décret n° 2009-643. Minister decides within 4 months.",
      },
      {
        section: "Art. 6",
        title: "Mandatory third-party liability insurance",
        summary:
          "Operators must maintain insurance or financial guarantee covering damage to third parties. The State guarantees beyond the insured amount. Insurance conditions set by Code des assurances L.176-1 to L.176-5.",
        complianceImplication:
          "France operates a two-tier liability system: operator covers insured amount, State covers beyond. No fixed cap — amounts determined per authorization. Claims-made basis (Ordonnance n° 2011-839).",
      },
      {
        section: "Art. 12",
        title: "National space object registration",
        summary:
          "CNES maintains the national register of space objects. Operators must declare launches and provide orbital data. Registration data transmitted to the UN Secretary-General.",
        complianceImplication:
          "Mandatory registration with CNES for all objects launched under French jurisdiction. France was the first state to ratify the Registration Convention.",
      },
      {
        section: "Art. 13-20 (Titre IV)",
        title: "Liability regime",
        summary:
          "Operator is liable for damage caused by space objects during operations. State may seek recourse against operator for amounts paid in international claims. Prescription period: 1 year from discovery of damage, max 3 years from event.",
      },
      {
        section: "Art. 21 (Titre V)",
        title: "CNES police spéciale at CSG",
        summary:
          "CNES exercises police spéciale (regulatory police power) for safety at the Centre Spatial Guyanais. Covers technical safety of launch operations, ground segments, and personnel at the Guiana Space Centre.",
        complianceImplication:
          "All operators at CSG are subject to CNES safety regulations. Broadened by LPM 2023-703 to include new operational scenarios.",
      },
      {
        section: "Art. 23-25 (Titre VI)",
        title: "Earth observation data regime",
        summary:
          "Exploitation of primary EO data from space requires declaration to SGDSN. Data may be subject to restrictions for national defense and security. Extended by Ordonnance 2022-232 to include space-from-space observation.",
        complianceImplication:
          "EO data operators must file with SGDSN 2 months before commercial exploitation begins (Décret n° 2009-640).",
      },
    ],
    scope_description:
      "The LOS 2008 is the cornerstone of French space law. It is the ONLY comprehensive national space law in operation among major European space nations. 30 articles across 8 titles covering authorization, insurance, registration, liability, CSG safety, and EO data. Amended by Ordonnance 2022-232 (defense) and Loi 2023-703 Art. 60 (constellations, reusable launchers).",
    related_sources: [
      "FR-ORD-2022-232",
      "FR-LPM-2023-703-ART60",
      "FR-DECRET-2009-643",
      "FR-DECRET-2009-644",
      "FR-DECRET-2009-640",
      "FR-ARRETE-2011-RT",
      "FR-CODE-ASSURANCES-SPACE",
      "FR-INT-OST-RATIFICATION",
    ],
    amended_by: ["FR-ORD-2022-232", "FR-LPM-2023-703-ART60"],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "France's LOS 2008 is widely regarded as the most complete and mature national space law in Europe. It predates the proposed EU Space Act by 17 years.",
      "The law applies based on French 'jurisdiction' — meaning launches from French territory (CSG), operations by French-controlled entities, and operations authorized by France regardless of where the operator is established.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-ORD-2022-232",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Ordinance on Defense Space Operations",
    title_local:
      "Ordonnance n° 2022-232 du 23 février 2022 relative aux opérations spatiales conduites au titre de la défense nationale",
    date_enacted: "2022-02-23",
    date_in_force: "2022-02-25",
    official_reference: "JORF n° 0046 du 24 février 2022",
    source_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045230287",
    issuing_body: "Gouvernement (par habilitation du Parlement)",
    competent_authorities: ["FR-MINARMES", "FR-CDE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "licensing", "data_security"],
    key_provisions: [
      {
        section: "Art. 1-3",
        title: "Defense operations exemption",
        summary:
          "Space operations conducted for national defense purposes may be exempted from certain LOS 2008 authorization requirements. Establishes a separate, classified authorization track for military operations.",
        complianceImplication:
          "Military space operators (CDE, DGA) operate under a parallel regime. Commercial operators supporting defense missions may also benefit from streamlined procedures.",
      },
      {
        section: "Art. 4-6",
        title: "Requisition regime",
        summary:
          "The State may requisition private space assets and capabilities in situations of national security urgency. Compensation provisions included.",
        complianceImplication:
          "Commercial operators should be aware that their space assets may be requisitioned in crisis situations. This is codified in Code de la défense L.2224-1 to L.2224-6.",
      },
      {
        section: "Art. 7",
        title: "Space-from-space observation",
        summary:
          "Expands the EO data regime (LOS Art. 23-25) to cover observation of objects in space from space (rendezvous and proximity operations, SSA from orbit).",
      },
    ],
    amends: "FR-LOS-2008",
    related_sources: [
      "FR-LOS-2008",
      "FR-LPM-2023-703-ART60",
      "FR-CODE-DEFENSE-SPACE",
    ],
    notes: [
      "Adopted by ordinance (legislative delegation) under Art. 38 of the Constitution. Ratified by Loi n° 2023-703 Art. 60.",
      "Key innovation: extends French space law to cover 'active defense' operations and space-from-space observation.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-LPM-2023-703-ART60",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Military Programming Law 2024-2030, Article 60 — Space Provisions",
    title_local:
      "Loi n° 2023-703 du 1er août 2023 relative à la programmation militaire pour les années 2024 à 2030 — Article 60",
    date_enacted: "2023-08-01",
    date_in_force: "2023-08-03",
    official_reference: "JORF n° 0178 du 2 août 2023",
    source_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047914986",
    issuing_body: "Parlement (Assemblée nationale + Sénat)",
    competent_authorities: ["FR-CNES", "FR-MINARMES"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
    ],
    compliance_areas: ["licensing", "military_dual_use", "debris_mitigation"],
    key_provisions: [
      {
        section: "Art. 60 §I",
        title: "Ratification of Ordonnance 2022-232",
        summary:
          "Formally ratifies the February 2022 ordinance on defense space operations, giving it full legislative force.",
      },
      {
        section: "Art. 60 §II",
        title: "Constellation concept in LOS",
        summary:
          "Introduces the legal concept of 'constellation' into French space law. Enables group authorization for constellations of 10 or more objects under a single operator.",
        complianceImplication:
          "Mega-constellation operators can now seek a single authorization covering the entire constellation rather than per-object authorizations.",
      },
      {
        section: "Art. 60 §III",
        title: "Reusable launcher provisions",
        summary:
          "Adapts the LOS framework to accommodate reusable launch vehicles. Clarifies that return-to-launch-site operations are covered under the authorization regime.",
        complianceImplication:
          "Designed for Ariane 6 SUSIE and future reusable vehicles. The authorization can cover multiple flights of the same vehicle.",
      },
      {
        section: "Art. 60 §IV",
        title: "Broadened CNES police spéciale",
        summary:
          "Expands CNES's safety regulatory power at CSG to cover new operational scenarios including reusable launcher recovery and horizontal launch/landing.",
      },
    ],
    amends: "FR-LOS-2008",
    related_sources: ["FR-LOS-2008", "FR-ORD-2022-232", "FR-LPM-2024-2030"],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-DECRET-2009-643",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Authorization Procedure Decree",
    title_local:
      "Décret n° 2009-643 du 9 juin 2009 relatif aux autorisations délivrées en application de la loi n° 2008-518",
    date_enacted: "2009-06-09",
    date_last_amended: "2024-06-28",
    official_reference: "JORF n° 0133 du 10 juin 2009",
    source_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020714558",
    issuing_body: "Premier ministre",
    competent_authorities: ["FR-CNES", "FR-MINARMES", "FR-MINECO"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-5",
        title: "Three-part authorization dossier",
        summary:
          "Applications require a 3-part dossier: administrative (operator identity, financial capacity, insurance), technical (mission design, debris mitigation, cybersecurity), and defense (security assessment by MinArmées).",
        complianceImplication:
          "The 3-part dossier structure is the procedural backbone of French space licensing. CNES provides technical assessment; MinArmées provides the defense assessment.",
      },
      {
        section: "Art. 6-8",
        title: "Decision timeline and conditions",
        summary:
          "Minister decides within 4 months of receiving a complete dossier. Silence after 4 months constitutes refusal. Authorization may be conditional (modified orbital parameters, additional debris mitigation, etc.).",
        complianceImplication:
          "Operators should plan for 4-6 months licensing timeline including CNES technical review. Incomplete dossiers restart the clock.",
      },
      {
        section: "Art. 9-12",
        title: "Authorization modification and transfer",
        summary:
          "Material changes to authorized operations require prior approval. Authorization transfer requires new application by the transferee. Lapse period reduced from 10 to 5 years by Décret 2024-625.",
      },
    ],
    related_sources: [
      "FR-LOS-2008",
      "FR-ARRETE-2022-DOSSIER",
      "FR-DECRET-2024-625",
    ],
    amended_by: ["FR-DECRET-2024-625"],
    caelex_engine_mapping: ["space-law-engine.server"],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-DECRET-2009-644",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "CNES Obligations and Registration Decree",
    title_local:
      "Décret n° 2009-644 du 9 juin 2009 relatif aux obligations mises à la charge du Centre national d'études spatiales",
    date_enacted: "2009-06-09",
    official_reference: "JORF n° 0133 du 10 juin 2009",
    source_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020714590",
    issuing_body: "Premier ministre",
    competent_authorities: ["FR-CNES"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["registration", "licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "CNES technical assessment obligations",
        summary:
          "CNES must provide technical assessments for all authorization applications. Includes verifying debris mitigation compliance, orbital safety, and re-entry risk assessments.",
        complianceImplication:
          "CNES is the mandatory technical assessor — no authorization is granted without its positive assessment. Budget: incorporated into CNES's general mission.",
      },
      {
        section: "Art. 5-8",
        title: "National register management",
        summary:
          "CNES maintains the national space object register (Code de la recherche R.331-1 to R.331-26). Must record launch date, orbital parameters, operator identity, and status changes. Data transmitted to the UN.",
      },
    ],
    related_sources: [
      "FR-LOS-2008",
      "FR-DECRET-2009-643",
      "FR-INT-REGISTRATION-1975",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-DECRET-2009-640",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Earth Observation Data Decree",
    title_local:
      "Décret n° 2009-640 du 9 juin 2009 portant application des dispositions prévues au titre VI de la loi n° 2008-518 (données d'observation de la Terre)",
    date_enacted: "2009-06-09",
    official_reference: "JORF n° 0133 du 10 juin 2009",
    source_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000020714481",
    issuing_body: "Premier ministre",
    competent_authorities: ["FR-SGDSN", "FR-CNES"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "data_provider"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Art. 1-3",
        title: "Declaration requirement for EO data exploitation",
        summary:
          "Operators intending to exploit primary Earth observation data must file a declaration with SGDSN at least 2 months before the start of commercial exploitation.",
        complianceImplication:
          "Any French or France-authorized EO satellite operator must notify SGDSN before selling or distributing primary data. Failure to declare: administrative sanctions.",
      },
      {
        section: "Art. 4-6",
        title: "Security restrictions on EO data",
        summary:
          "SGDSN may impose restrictions on specific data categories for national defense and security reasons. Includes resolution limits, geographic restrictions, and temporal embargoes.",
      },
    ],
    related_sources: ["FR-LOS-2008", "FR-ORD-2022-232"],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-DECRET-2024-625",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Updated Authorization Procedures Decree",
    title_local:
      "Décret n° 2024-625 du 28 juin 2024 modifiant le décret n° 2009-643 relatif aux autorisations",
    date_enacted: "2024-06-28",
    date_in_force: "2024-06-30",
    official_reference: "JORF n° 0150 du 29 juin 2024",
    source_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049827439",
    issuing_body: "Premier ministre",
    competent_authorities: ["FR-CNES", "FR-MINECO"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "in_orbit_services",
      "constellation_operator",
    ],
    compliance_areas: ["licensing", "insurance"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Reduced authorization lapse period",
        summary:
          "Reduces the authorization lapse period from 10 years to 5 years, requiring more frequent renewal. Operators must re-apply before expiration.",
        complianceImplication:
          "Existing authorizations granted under the 10-year regime will transition to 5-year renewals. Operators should update their compliance calendars.",
      },
      {
        section: "Art. 2",
        title: "In-orbit servicing provisions",
        summary:
          "Establishes authorization procedures for in-orbit servicing operations (inspection, maintenance, refueling, debris removal). Requires specific technical dossier elements.",
        complianceImplication:
          "First explicit regulatory framework for in-orbit services in French law. Operators like Astroscale or ClearSpace must comply when operating under French jurisdiction.",
      },
      {
        section: "Art. 3",
        title: "Removal of GEO insurance exemption",
        summary:
          "Removes the previous exemption from mandatory insurance for GEO satellite operators during the graveyard orbit phase. All phases now require insurance coverage.",
        complianceImplication:
          "GEO operators must now maintain insurance coverage through end-of-life disposal, including graveyard orbit operations.",
      },
    ],
    amends: "FR-DECRET-2009-643",
    related_sources: [
      "FR-DECRET-2009-643",
      "FR-LOS-2008",
      "FR-CODE-ASSURANCES-SPACE",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Technical Regulations (3) ──────────────────────────────────────

const TECHNICAL_FR: LegalSource[] = [
  {
    id: "FR-ARRETE-2011-RT",
    jurisdiction: "FR",
    type: "technical_standard",
    status: "in_force",
    title_en:
      "Technical Regulations for Space Operations (Réglementation Technique)",
    title_local:
      "Arrêté du 31 mars 2011 relatif à la réglementation technique en application de la loi n° 2008-518",
    date_enacted: "2011-03-31",
    date_last_amended: "2024-06-28",
    official_reference: "JORF n° 0098 du 27 avril 2011",
    source_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000024095828",
    issuing_body: "CNES (par délégation du ministre)",
    competent_authorities: ["FR-CNES"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
      "in_orbit_services",
    ],
    compliance_areas: [
      "debris_mitigation",
      "licensing",
      "cybersecurity",
      "environmental",
    ],
    key_provisions: [
      {
        section: "Titre II",
        title: "Debris mitigation requirements",
        summary:
          "LEO re-entry within 3 times the mission duration, maximum 25 years. GEO disposal orbit requirements. Passivation obligations. Constellations of 10 or more objects subject to enhanced requirements.",
        complianceImplication:
          "France's debris mitigation rules are among the strictest in the world. The 25-year maximum is being superseded by the EU Space Act's proposed 5-year rule, but 3x mission duration may be shorter.",
      },
      {
        section: "Titre III",
        title: "Orbital safety and collision avoidance",
        summary:
          "Operators must implement collision avoidance capabilities, track their objects, and respond to conjunction warnings. Ground-based tracking data must be available.",
      },
      {
        section: "Titre IV (2024 amendment)",
        title: "Cybersecurity requirements for TM/TC links",
        summary:
          "Telemetry and telecommand links must be protected against unauthorized access, jamming, and spoofing. Encryption and authentication required for all command channels.",
        complianceImplication:
          "The June 2024 amendment added explicit cybersecurity requirements to the Technical Regulations for the first time, aligning with NIS2 and CRA expectations.",
      },
      {
        section: "Titre V (2024 amendment)",
        title: "Constellation-specific requirements",
        summary:
          "Constellations of 10 or more objects must demonstrate enhanced collision avoidance, coordinated end-of-life disposal, and replacement planning. Environmental impact of constellation re-entries must be assessed.",
      },
    ],
    related_sources: [
      "FR-LOS-2008",
      "FR-DECRET-2009-643",
      "FR-ARRETE-2022-DOSSIER",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: [
      "national-space-laws.ts",
      "debris-mitigation-requirements.ts",
    ],
    notes: [
      "MASSIVELY amended in June 2024 to cover cybersecurity, constellations, and reusable launchers. The 2024 version is essentially a new instrument retaining the 2011 shell.",
      "These Technical Regulations are the operational heart of French space compliance — more detailed than the LOS itself.",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-ARRETE-2022-DOSSIER",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Authorization Dossier Composition Decree",
    title_local:
      "Arrêté du 23 février 2022 relatif à la composition du dossier de demande d'autorisation",
    date_enacted: "2022-02-23",
    date_last_amended: "2024-06-28",
    official_reference: "JORF n° 0046 du 24 février 2022",
    source_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045230346",
    issuing_body: "Ministre chargé de l'espace",
    competent_authorities: ["FR-CNES", "FR-MINARMES"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "Administrative dossier requirements",
        summary:
          "Specifies the documents required for the administrative part of the authorization dossier: operator legal status, financial capacity demonstration, insurance certificates, and corporate governance details.",
      },
      {
        section: "Art. 5-10",
        title: "Technical dossier requirements",
        summary:
          "Detailed technical documentation required: mission description, orbital mechanics analysis, debris mitigation plan, re-entry risk assessment, cybersecurity measures, and frequency coordination evidence.",
        complianceImplication:
          "The technical dossier must demonstrate compliance with the Arrêté of 31 March 2011 (Technical Regulations). CNES reviews against these requirements.",
      },
    ],
    related_sources: ["FR-DECRET-2009-643", "FR-ARRETE-2011-RT", "FR-LOS-2008"],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-ARRETE-CSG-REI",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "CSG Exploitation Rules (Règlement d'Exploitation Intérieur)",
    title_local:
      "Arrêté CNES/P n° 2010-1 du 9 décembre 2010 — Règlement d'Exploitation Intérieur du CSG",
    date_enacted: "2010-12-09",
    official_reference: "CNES/P n° 2010-1",
    source_url: "https://www.cnes.fr/en/centre-spatial-guyanais-regulations",
    issuing_body: "CNES (Président-Directeur Général)",
    competent_authorities: ["FR-CNES", "FR-PREFET-GUYANE"],
    relevance_level: "high",
    applicable_to: ["launch_provider", "ground_segment"],
    compliance_areas: ["licensing", "environmental"],
    key_provisions: [
      {
        section: "Titre I-III (Art. 1-30)",
        title: "General rules and site access",
        summary:
          "Access control, security clearance requirements, and general safety rules for all personnel and entities operating at the Centre Spatial Guyanais.",
      },
      {
        section: "Titre IV-VI (Art. 31-97)",
        title: "Launch operations safety rules",
        summary:
          "Detailed safety procedures for launch campaigns: assembly, testing, propellant handling, countdown, launch, and post-launch operations. 97 articles covering all operational phases.",
        complianceImplication:
          "All launch service providers at CSG (Arianespace, Avio, ArianeGroup) must comply with these rules. Non-compliance can result in launch suspension by CNES.",
      },
    ],
    related_sources: ["FR-LOS-2008", "FR-ICPE-CSG"],
    notes: [
      "97 articles governing operations at CSG — one of the most detailed launch site regulatory frameworks in the world.",
      "CNES exercises police spéciale authority under LOS Art. 21 to enforce these rules.",
    ],
    last_verified: "2026-04-13",
  },

  {
    id: "FR-RTF-2011",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Technical Regulation for the Loi sur les Opérations Spatiales (RTF — quantitative safety thresholds)",
    title_local:
      "Arrêté du 31 mars 2011 relatif à la réglementation technique en application du décret n° 2009-643 du 9 juin 2009",
    date_enacted: "2011-03-31",
    date_in_force: "2011-04-01",
    official_reference: "JORF n° 0083 du 8 avril 2011, NOR: ESRR1106355A",
    source_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000023815719/",
    issuing_body: "Ministère chargé de l'espace",
    competent_authorities: ["FR-CNES"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "in_orbit_services",
    ],
    compliance_areas: [
      "licensing",
      "debris_mitigation",
      "space_traffic_management",
    ],
    scope_description:
      "Quantitative safety regulation implementing Article 4 of decree 2009-643 under the LOS framework. Sets the casualty-risk thresholds, end-of-life disposal requirements (25-year LEO clearance, post-mission passivation) and ground-segment robustness standards used to assess LOS authorisation files. Reissued unchanged on key thresholds in subsequent updates.",
    key_provisions: [
      {
        section: "Art. 22-25",
        title: "Casualty risk thresholds",
        summary:
          "Casualty risk from uncontrolled re-entry must not exceed 1 in 10 000 per event (collective) and 1 in 1 000 000 per individual on the ground.",
      },
      {
        section: "Art. 30-34",
        title: "Post-mission disposal",
        summary:
          "LEO objects must be removed from the protected region within 25 years of end of mission; passivation required before disposal to prevent fragmentation events.",
      },
    ],
    related_sources: ["FR-LOS-2008", "FR-DECRET-2009-643"],
    last_verified: "2026-04-22",
  },
];

// ─── CNES Legal Framework (1) ───────────────────────────────────────

const CNES_FRAMEWORK_FR: LegalSource[] = [
  {
    id: "FR-CODE-RECHERCHE-CNES",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Research Code — CNES Provisions",
    title_local:
      "Code de la recherche, Articles L.331-1 à L.331-8 et R.331-1 à R.331-26",
    source_url:
      "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006071190/LEGISCTA000006166618",
    issuing_body: "Parlement",
    competent_authorities: ["FR-CNES", "FR-MESR", "FR-MINARMES", "FR-MINECO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration"],
    key_provisions: [
      {
        section: "Art. L.331-1 to L.331-2",
        title: "CNES status and mission",
        summary:
          "CNES is an EPIC (Établissement Public à caractère Industriel et Commercial) under joint tutelle of the Ministry of Research, Ministry of Armed Forces, and Ministry of Economy. Mission: propose and implement French space policy.",
        complianceImplication:
          "CNES's unique tri-ministerial tutelle structure means space policy decisions involve defense, research, and industry ministries. Operators interact primarily with CNES but ultimate authority rests with the ministers.",
      },
      {
        section: "Art. R.331-1 to R.331-26",
        title: "CNES governance and regulatory powers",
        summary:
          "Details CNES governance structure (board of directors, scientific council), budget procedures, and regulatory delegations. Includes the space object registration obligations.",
      },
    ],
    related_sources: ["FR-LOS-2008", "FR-DECRET-2009-644"],
    last_verified: "2026-04-13",
  },
];

// ─── Defense & Military (3) ─────────────────────────────────────────

const DEFENSE_FR: LegalSource[] = [
  {
    id: "FR-CODE-DEFENSE-SPACE",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Defense Code — Space Provisions",
    title_local:
      "Code de la défense — Dispositions relatives à l'espace (Titre II bis, Art. L.2335-2, Art. L.2391-1)",
    source_url: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006071307",
    issuing_body: "Parlement",
    competent_authorities: ["FR-MINARMES", "FR-CDE", "FR-DGA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "export_control"],
    key_provisions: [
      {
        section: "Titre II bis (Art. L.2224-1 to L.2224-6)",
        title: "Requisition of space assets",
        summary:
          "The State may requisition private space assets (satellites, ground stations, data) in situations threatening national security. Compensation at fair market value. Introduced by Ordonnance 2022-232.",
        complianceImplication:
          "Commercial operators must plan for potential requisition scenarios. Contractual arrangements with non-French customers should account for force majeure requisition provisions.",
      },
      {
        section: "Art. L.2335-2",
        title: "Defense materials export control",
        summary:
          "Export of defense materials including military satellites, military payloads, and designated space technologies requires authorization from CIEEMG (Commission Interministérielle pour l'Étude des Exportations de Matériels de Guerre).",
      },
      {
        section: "Art. L.2391-1",
        title: "Opérations sensibles (sensitive operations)",
        summary:
          "Certain space operations classified as 'sensitive' by the Ministry of Armed Forces are subject to enhanced oversight and restrictions.",
      },
    ],
    related_sources: ["FR-ORD-2022-232", "FR-CIEEMG", "FR-LOS-2008"],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-LPM-2024-2030",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Military Programming Law 2024-2030 — Space Investment",
    title_local:
      "Loi n° 2023-703 du 1er août 2023 relative à la programmation militaire pour les années 2024 à 2030",
    date_enacted: "2023-08-01",
    date_in_force: "2023-08-03",
    official_reference: "JORF n° 0178 du 2 août 2023",
    source_url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000047914986",
    issuing_body: "Parlement (Assemblée nationale + Sénat)",
    competent_authorities: ["FR-MINARMES", "FR-CDE", "FR-DGA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    key_provisions: [
      {
        section: "Art. 2 (Annexe — Rapport annexé)",
        title: "€413.3B total defense budget, €10.2B for space",
        summary:
          "The LPM allocates €413.3B total for 2024-2030, with €10.2B dedicated to space defense capabilities. Covers next-generation satellite systems, SSA, active defense, and ground segment modernization.",
        complianceImplication:
          "€10.2B space defense investment creates significant procurement opportunities for French and European space industry. Key programmes: YODA (SSA), FLAMHE (high-energy weapons), BloomLase (directed energy), C4OS (command and control).",
      },
      {
        section: "Art. 60",
        title: "Space law amendments",
        summary:
          "Art. 60 ratifies Ordonnance 2022-232, introduces constellation concept, reusable launcher provisions, and broadens CNES police spéciale. See FR-LPM-2023-703-ART60 for details.",
      },
    ],
    related_sources: [
      "FR-LPM-2023-703-ART60",
      "FR-SSD-2019",
      "FR-CODE-DEFENSE-SPACE",
    ],
    notes: [
      "The €10.2B space defense envelope is the largest in French history, reflecting the 2019 Stratégie Spatiale de Défense priorities.",
      "Key programmes: YODA (patrol satellite), FLAMHE (directed energy), BloomLase (laser dazzling), C4OS (space C2).",
    ],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-SSD-2019",
    jurisdiction: "FR",
    type: "policy_document",
    status: "in_force",
    title_en: "Space Defense Strategy",
    title_local: "Stratégie Spatiale de Défense",
    date_published: "2019-07-25",
    source_url: "https://www.vie-publique.fr/files/rapport/pdf/194000642.pdf",
    issuing_body: "Ministère des Armées",
    competent_authorities: ["FR-MINARMES", "FR-CDE"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "space_traffic_management"],
    key_provisions: [
      {
        section: "Chapter 2",
        title: "Four operational functions",
        summary:
          "Defines 4 operational functions for French military space: (1) space support to operations, (2) space situational awareness, (3) space support to strategic operations, (4) active defense of space assets.",
        complianceImplication:
          "The SSD establishes that France reserves the right to conduct 'active defense' operations in space — a position unique among European nations. This includes self-defense measures against hostile actions targeting French space assets.",
      },
      {
        section: "Chapter 3",
        title: "Three graduated response modes",
        summary:
          "Defines 3 levels of graduated response: (1) detection and characterization (SSA), (2) deterrence (demonstration of capability), (3) active countermeasures (defensive operations). Each level calibrated to the threat severity.",
      },
    ],
    related_sources: ["FR-LPM-2024-2030", "FR-CODE-DEFENSE-SPACE"],
    notes: [
      "Published July 2019 by Minister Florence Parly. The first comprehensive military space strategy by a European nation.",
      "Led directly to the creation of the Commandement de l'Espace (CDE) in September 2019.",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Telecommunications (1) ─────────────────────────────────────────

const TELECOM_FR: LegalSource[] = [
  {
    id: "FR-CPCE-SATELLITE",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Postal and Electronic Communications Code — Satellite Provisions",
    title_local:
      "Code des postes et des communications électroniques, Titre VIII (Art. L.97-2 à L.97-4)",
    source_url: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006070987",
    issuing_body: "Parlement",
    competent_authorities: ["FR-ARCEP", "FR-ANFR"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Art. L.97-2",
        title: "Satellite frequency assignment",
        summary:
          "Satellite frequency assignments are made by ANFR on behalf of France. Operators must obtain frequency assignments before operating any satellite communications system. ANFR coordinates ITU filings.",
        complianceImplication:
          "No satellite system under French jurisdiction may operate without ANFR frequency assignment. Filing lead times vary: 2-7 years for GEO, 1-3 years for LEO.",
      },
      {
        section: "Art. L.97-3 to L.97-4",
        title: "Penalties for unauthorized use",
        summary:
          "Unauthorized use of satellite frequencies is punishable by up to 6 months imprisonment and €75,000 fine. ARCEP may also impose administrative sanctions including frequency revocation.",
        complianceImplication:
          "Criminal penalties distinguish France from jurisdictions that impose only administrative fines for frequency violations.",
      },
    ],
    related_sources: ["FR-LOS-2008"],
    caelex_engine_mapping: ["spectrum-engine.server"],
    caelex_data_file_mapping: ["spectrum-itu-requirements.ts"],
    last_verified: "2026-04-13",
  },
];

// ─── Insurance & Liability (1) ──────────────────────────────────────

const INSURANCE_FR: LegalSource[] = [
  {
    id: "FR-CODE-ASSURANCES-SPACE",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Insurance Code — Space Liability Insurance Provisions",
    title_local:
      "Code des assurances, Articles L.176-1 à L.176-5 (Ordonnance n° 2011-839 du 15 juillet 2011)",
    date_enacted: "2011-07-15",
    official_reference: "Ordonnance n° 2011-839 du 15/07/2011",
    source_url:
      "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006073984/LEGISCTA000024398530",
    issuing_body: "Gouvernement (par ordonnance)",
    competent_authorities: ["FR-CNES"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["insurance", "liability"],
    key_provisions: [
      {
        section: "Art. L.176-1",
        title: "Mandatory space liability insurance",
        summary:
          "Every space operator authorized under LOS 2008 must maintain third-party liability insurance or equivalent financial guarantee for the duration of space operations.",
        complianceImplication:
          "Insurance is a precondition for authorization. No authorization is granted without proof of adequate coverage.",
      },
      {
        section: "Art. L.176-2 to L.176-3",
        title: "Claims-made basis and coverage scope",
        summary:
          "Space liability insurance operates on a claims-made basis (not occurrence). Covers damage to third parties caused by space objects during all phases of operations. Extended reporting period available.",
        complianceImplication:
          "Claims-made basis means operators need continuous coverage. Gaps in coverage create uninsured liability exposure. GEO graveyard disposal now also requires coverage (Décret 2024-625).",
      },
      {
        section: "Art. L.176-4 to L.176-5",
        title: "State guarantee and subrogation",
        summary:
          "The French State guarantees payment beyond the insured amount for international claims under the Liability Convention. The State may seek subrogation (recourse) against the operator.",
      },
    ],
    related_sources: ["FR-LOS-2008", "FR-DECRET-2024-625"],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["insurance-requirements.ts"],
    last_verified: "2026-04-13",
  },
];

// ─── Export Control (2) ─────────────────────────────────────────────

const EXPORT_FR: LegalSource[] = [
  {
    id: "FR-CIEEMG",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Defense Materials Export Control — CIEEMG Commission",
    title_local:
      "Code de la défense — Commission Interministérielle pour l'Étude des Exportations de Matériels de Guerre (CIEEMG)",
    source_url: "https://www.legifrance.gouv.fr/codes/id/LEGITEXT000006071307",
    issuing_body: "Parlement / Gouvernement",
    competent_authorities: ["FR-SGDSN", "FR-DGA", "FR-MINARMES"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Code de la défense L.2335-1 to L.2335-4",
        title: "Defense export licensing",
        summary:
          "Export of defense materials (including military satellites, military payloads, and designated space technologies) requires CIEEMG authorization. SGDSN chairs the commission. Decisions made by the Prime Minister on CIEEMG advice.",
        complianceImplication:
          "Space companies exporting military-grade components or complete military satellite systems must obtain CIEEMG clearance. Processing time: typically 2-6 months.",
      },
      {
        section: "SIGALE system",
        title: "Electronic export licensing system",
        summary:
          "All defense export applications processed through SIGALE (Système d'Information et de Gestion Automatisée des Licences d'Exportation). Electronic filing mandatory since 2015.",
      },
    ],
    related_sources: ["FR-CODE-DEFENSE-SPACE", "FR-SBDU-DUALUSE"],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-SBDU-DUALUSE",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Dual-Use Goods Export Control — SBDU/EGIDE",
    title_local:
      "Contrôle des biens à double usage — Service des Biens à Double Usage (SBDU/DGE), Règlement (UE) 2021/821",
    source_url:
      "https://www.entreprises.gouv.fr/fr/commerce-exterieur/controle-des-exportations/biens-double-usage",
    issuing_body: "Ministère de l'Économie / DGE",
    competent_authorities: ["FR-MINECO", "FR-DGA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "EU Reg. 2021/821 — French implementation",
        title: "Dual-use export licensing",
        summary:
          "France implements EU Dual-Use Regulation 2021/821 through SBDU (Service des Biens à Double Usage) under DGE. Space components (Category 7 and 9 items) require individual or global export licenses. Applications via EGIDE platform.",
        complianceImplication:
          "Space component exporters must screen every transaction against Annex I, Categories 7 (navigation/avionics) and 9 (aerospace/propulsion). Catch-all clause (Art. 4) applies for unlisted items.",
      },
      {
        section: "EGIDE platform",
        title: "Electronic export licensing platform",
        summary:
          "EGIDE is France's electronic platform for dual-use export license applications. Mandatory for all dual-use export authorization requests. Replaces the former paper-based process.",
      },
    ],
    related_sources: ["FR-CIEEMG"],
    caelex_engine_mapping: ["export-control-engine.server"],
    caelex_data_file_mapping: ["itar-ear-requirements.ts"],
    last_verified: "2026-04-13",
  },
];

// ─── NIS2 Transposition (1) ─────────────────────────────────────────

const NIS2_FR: LegalSource[] = [
  {
    id: "FR-NIS2-TRANSPOSITION",
    jurisdiction: "FR",
    type: "draft_legislation",
    status: "draft",
    title_en: "Loi Résilience — French NIS2 Transposition",
    title_local:
      "Projet de loi relatif à la résilience des infrastructures critiques et au renforcement de la cybersécurité (Loi Résilience)",
    date_published: "2025-10-15",
    source_url:
      "https://www.assemblee-nationale.fr/dyn/actualites-accueil-hub/projet-de-loi-resilience",
    issuing_body: "Gouvernement / Assemblée nationale",
    competent_authorities: ["FR-ANSSI", "FR-SGDSN"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "ground_segment",
      "constellation_operator",
    ],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Titre I",
        title: "Three-tier entity classification",
        summary:
          "Establishes three tiers of regulated entities: Opérateurs d'Importance Vitale (OIV — existing regime, highest tier), Essential entities (NIS2 essential), and Important entities (NIS2 important). Space sector falls under essential entities; critical space infrastructure as OIV.",
        complianceImplication:
          "French space operators classified as 'essential' will face ANSSI supervision, mandatory risk management measures, and incident reporting obligations similar to NIS2 Art. 21 and 23.",
      },
      {
        section: "Titre II",
        title: "ANSSI as competent authority",
        summary:
          "Designates ANSSI as the national competent authority for NIS2 implementation. ANSSI conducts audits, receives incident reports, and may impose administrative sanctions. ~15,000 entities expected to be in scope.",
        complianceImplication:
          "Space operators must register with ANSSI and comply with its technical frameworks. ANSSI may conduct unannounced audits of critical space infrastructure.",
      },
    ],
    implements: "EU-NIS2-2022",
    related_sources: ["FR-LOS-2008"],
    caelex_engine_mapping: ["nis2-engine.server"],
    caelex_data_file_mapping: [
      "nis2-requirements.ts",
      "cybersecurity-requirements.ts",
    ],
    notes: [
      "Status as of April 2026: passed the Assemblée nationale. Awaiting implementing decrees. Full application expected H2 2026.",
      "France's transposition adds the OIV tier on top of NIS2's essential/important classification — a uniquely French approach maintaining the existing SAIV/OIV framework.",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Environmental (1) ──────────────────────────────────────────────

const ENVIRONMENTAL_FR: LegalSource[] = [
  {
    id: "FR-ICPE-CSG",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Environmental Code — ICPE Regime at Centre Spatial Guyanais",
    title_local:
      "Code de l'environnement — Régime ICPE au CSG (Art. L.515-15 et suiv., classification SEVESO seuil haut)",
    source_url:
      "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074220/LEGISCTA000006176645",
    issuing_body: "Parlement",
    competent_authorities: ["FR-PREFET-GUYANE", "FR-CNES"],
    relevance_level: "high",
    applicable_to: ["launch_provider", "ground_segment"],
    compliance_areas: ["environmental"],
    key_provisions: [
      {
        section: "Art. L.515-15 to L.515-26",
        title: "SEVESO upper-tier classification",
        summary:
          "The Centre Spatial Guyanais is classified as a SEVESO upper-tier (seuil haut / AS) installation due to propellant storage and handling. Subject to the strictest environmental and safety requirements under the ICPE (Installations Classées pour la Protection de l'Environnement) regime.",
        complianceImplication:
          "Launch operations at CSG must comply with SEVESO III directive requirements including safety management systems, emergency planning, and public information. PPRT (Plan de Prévention des Risques Technologiques) applies.",
      },
      {
        section: "PPRT",
        title: "Technological Risk Prevention Plan",
        summary:
          "A PPRT (Plan de Prévention des Risques Technologiques) is established around CSG defining land use restrictions and protective measures for surrounding communities.",
      },
    ],
    related_sources: ["FR-ARRETE-CSG-REI", "FR-LOS-2008"],
    last_verified: "2026-04-13",
  },
];

// ─── Policy Documents (2) ───────────────────────────────────────────

const POLICY_FR: LegalSource[] = [
  {
    id: "FR-FRANCE2030-SPACE",
    jurisdiction: "FR",
    type: "policy_document",
    status: "in_force",
    title_en: "France 2030 Space Investment Plan",
    title_local: "France 2030 — Objectif 9 : Investir dans l'espace",
    date_published: "2021-10-12",
    source_url: "https://www.gouvernement.fr/france-2030",
    issuing_body: "Président de la République / Gouvernement",
    competent_authorities: ["FR-MINECO", "FR-CNES"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Objective 9",
        title: "€1.5B space investment under France 2030",
        summary:
          "France 2030 dedicates €1.5B to space under Objective 9, covering: access to space (reusable launchers), new space constellations, Earth observation, and space applications. Managed through CNES and BPI France.",
        complianceImplication:
          "Policy signal for significant public investment in French space industry. Operators may access subsidies and co-investment for qualifying projects.",
      },
      {
        section: "Launcher priority",
        title: "Support for next-generation launchers",
        summary:
          "Priority investment in reusable launch vehicle technologies (Ariane 6 evolution, micro-launchers). Aim: maintain European launch autonomy.",
      },
    ],
    related_sources: ["FR-SNS-2025-2040"],
    last_verified: "2026-04-13",
  },
  {
    id: "FR-SNS-2025-2040",
    jurisdiction: "FR",
    type: "policy_document",
    status: "in_force",
    title_en: "National Space Strategy 2025-2040",
    title_local: "Stratégie Nationale Spatiale 2025-2040",
    date_published: "2025-11-12",
    source_url:
      "https://www.sgdsn.gouv.fr/publications/strategie-nationale-spatiale-2025-2040",
    issuing_body: "SGDSN",
    competent_authorities: ["FR-SGDSN", "FR-CNES", "FR-MINARMES"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: [
      "licensing",
      "cybersecurity",
      "military_dual_use",
      "space_traffic_management",
    ],
    key_provisions: [
      {
        section: "Pillar 1",
        title: "Sovereign access to space",
        summary:
          "Maintaining European autonomous access to space through continued investment in Ariane and Vega launcher families, development of reusable technologies, and CSG modernization.",
      },
      {
        section: "Pillar 2",
        title: "Space resilience and defense",
        summary:
          "Strengthening French space defense capabilities including SSA, active defense, cyber protection of space assets, and international partnerships for space security.",
      },
      {
        section: "Pillar 3-5",
        title: "Competitiveness, sustainability, regulation",
        summary:
          "Supporting French New Space companies, implementing sustainability frameworks (debris, environment), and adapting regulatory frameworks to emerging activities (in-orbit services, mega-constellations).",
        complianceImplication:
          "The SNS signals further evolution of French space regulation to cover in-orbit services, space traffic management, and space sustainability — operators should prepare for additional regulatory requirements.",
      },
    ],
    related_sources: ["FR-FRANCE2030-SPACE", "FR-SSD-2019", "FR-LOS-2008"],
    notes: [
      "Published 12 November 2025 by SGDSN — the most comprehensive French space policy document, establishing 5 strategic pillars for 2025-2040.",
      "Supersedes earlier fragmentary policy documents and integrates civil, defense, and industrial space policy.",
    ],
    last_verified: "2026-04-13",
  },
];

// ─── Pending Technical-Regulation Update (1) ────────────────────────
// Graphic reference: ClearSpace "Recent developments in the
// regulatory framework", October 2023 — French consultation on
// new technical regulation (in development).

const PENDING_TECHNICAL_FR: LegalSource[] = [
  {
    id: "FR-TECHREG-CONSULT-2024",
    jurisdiction: "FR",
    type: "draft_legislation",
    status: "proposed",
    title_en:
      "French Consultation on Updated Space Technical Regulation (RTF — Réglementation Technique Française)",
    title_local:
      "Consultation publique sur la mise à jour de la Réglementation Technique Française (RTF) pour les opérations spatiales",
    date_enacted: "2024-03-01",
    date_published: "2024-03-01",
    official_reference:
      "Consultation publique CNES/DGAC sur la refonte de l'Arrêté du 31 mars 2011 relatif à la réglementation technique (LOS 2008 art. 5)",
    source_url:
      "https://cnes.fr/fr/reglementation-technique-operations-spatiales",
    issuing_body:
      "Centre National d'Études Spatiales (CNES) / Direction Générale de l'Aviation Civile (DGAC) / Ministère de l'Enseignement supérieur et de la Recherche",
    competent_authorities: ["FR-CNES", "FR-DGAC", "FR-MINARMES"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "constellation_operator",
    ],
    compliance_areas: [
      "debris_mitigation",
      "licensing",
      "space_traffic_management",
      "environmental",
    ],
    scope_description:
      "French public consultation on a comprehensive update to the 2011 Arrêté Technique implementing the 2008 Loi sur les Opérations Spatiales (LOS). Proposed reforms align French technical requirements with the ESA Zero Debris Standard, introduce a reduced post-mission disposal window (5 years for LEO), strengthen casualty-risk thresholds for uncontrolled re-entry, and introduce new rules for mega-constellations and in-orbit servicing. Final revised arrêté expected 2026.",
    key_provisions: [
      {
        section: "Section PMD",
        title: "5-year post-mission disposal for LEO",
        summary:
          "Proposed reduction of the LEO post-mission disposal window from 25 years (2011 arrêté) to 5 years, aligned with FCC 2022 and the ESA Zero Debris Standard.",
      },
      {
        section: "Section Constellations",
        title: "Constellation-specific obligations",
        summary:
          "New licensing thresholds and reliability requirements for constellations above 100 satellites; per-satellite failure-rate disclosure required.",
      },
      {
        section: "Section IOS",
        title: "In-orbit servicing authorisation regime",
        summary:
          "Introduces a dedicated technical framework for IOS operations: safety distance requirements, abort-protocol demonstration, client-consent documentation.",
      },
      {
        section: "Section Ré-entrée",
        title: "On-ground casualty risk ≤ 1×10⁻⁴",
        summary:
          "Alignment with COPUOS and ESA thresholds: casualty risk from uncontrolled re-entry must not exceed 1 in 10 000 per event.",
      },
    ],
    related_sources: [
      "FR-LOS-2008",
      "FR-RTF-2011",
      "INT-ESA-ZERO-DEBRIS-STD",
      "INT-LTS-2019",
      "US-FCC-5YR-PMD-2022",
    ],
    notes: [
      "Consultation launched March 2024 by CNES in coordination with DGAC and the Ministry of Armed Forces (space-defense overlap).",
      "Final revised arrêté expected during 2026 — target application date 2027 for new missions, with transition regime for legacy licensees.",
      "Represents the first major overhaul of French technical space regulation since 2011.",
    ],
    last_verified: "2026-04-21",
  },
];

// ─── Foundational & Cross-Cutting (4) ───────────────────────────────
//
// Entries added 2026-04-22 to close structural gaps in the French
// dataset. None of these instruments are space-specific, but each
// one sits in the legal chain that any French space operator
// navigates: constitutional foundations, personal-data protection
// applied to satellite imagery, PPST for sensitive R&D, and the
// FDI screening regime that gates foreign investment in space-sector
// French entities.
//
// Verification strategy: Légifrance blocks automated fetches, so
// live verification was done via CNIL (LIL), Wikisource
// (Constitution), and known-stable Légifrance URL patterns for the
// two decrees. source_url values are the canonical public URLs that
// front-end users will click through to.

const FOUNDATIONAL_FR: LegalSource[] = [
  {
    // Constitution — the articles that allocate treaty-making and
    // legislative power for space matters. Narrower than the full
    // constitution; only the space-relevant articles are summarised.
    id: "FR-CONSTITUTION",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Constitution of the Fifth Republic — Space-Relevant Articles",
    title_local:
      "Constitution du 4 octobre 1958 — articles relatifs à la compétence spatiale (Art. 34, 52, 55)",
    date_enacted: "1958-10-04",
    date_last_amended: "2024-03-08",
    official_reference:
      "JORF du 5 octobre 1958, consolidation la plus récente : révision constitutionnelle du 8 mars 2024 (liberté de recourir à l'IVG)",
    source_url: "https://www.legifrance.gouv.fr/loda/id/LEGITEXT000006071194/",
    issuing_body: "Assemblée constituante / Parlement réuni en Congrès",
    competent_authorities: ["FR-MINARMES", "FR-MINECO"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability"],
    key_provisions: [
      {
        section: "Art. 34",
        title: "Matters reserved to statute",
        summary:
          "La loi fixe les règles concernant les garanties fondamentales accordées aux citoyens pour l'exercice des libertés publiques, la nationalité, les droits civils, le régime d'émission de la monnaie, les principes fondamentaux de la défense nationale, et les obligations imposées par cette défense. This is the constitutional anchor for why the Loi sur les opérations spatiales (LOS) must be a loi (statute) and not a simple décret.",
        complianceImplication:
          "The licensing regime for space activities touches fundamental liberties (industry, property) and national defence — so constitutional reserve to statute requires Parliament action, not executive-only regulation. Explains why LOS amendments must pass both chambers.",
      },
      {
        section: "Art. 52",
        title: "Treaty negotiation and ratification",
        summary:
          "« Le Président de la République négocie et ratifie les traités. » The President has exclusive power to negotiate and ratify international treaties — the hook by which France became party to the OST, Liability, Registration, and Rescue conventions.",
      },
      {
        section: "Art. 55",
        title: "Primacy of treaties",
        summary:
          "« Les traités ou accords régulièrement ratifiés ou approuvés ont, dès leur publication, une autorité supérieure à celle des lois, sous réserve, pour chaque accord ou traité, de son application par l'autre partie. » Ratified treaties have authority superior to statute. Means OST, Liability, and Registration Convention obligations prevail over conflicting domestic law — a key principle when LOS is interpreted against international space-law obligations.",
        complianceImplication:
          "In litigation, operators can invoke OST / Liability Convention provisions directly against the French state when LOS interpretation diverges from treaty text.",
      },
    ],
    scope_description:
      "Selected constitutional provisions structuring French space-law competence. Art. 34 establishes that space licensing belongs to the legislative domain; Art. 52 vests treaty-making in the Executive; Art. 55 places ratified space treaties above statute. Not a full Constitution reading — use as navigation anchor for the French legal hierarchy.",
    related_sources: [
      "FR-LOS-2008",
      "FR-INT-OST-RATIFICATION",
      "FR-INT-LIABILITY-1972",
      "FR-INT-REGISTRATION-1975",
    ],
    notes: [
      "The French Constitution has no explicit « espace » or « activités spatiales » article — federal competence derives from Art. 34 (national defence principles) and Art. 52 (treaty-making) read together with the treaties listed above.",
      "Constitutional Council jurisprudence (décisions Nos. 74-54 DC, 79-105 DC) treats space activities as falling within the State's sovereign competence under Art. 34.",
    ],
    last_verified: "2026-04-22",
  },

  {
    // Loi Informatique et Libertés — the French personal-data
    // protection statute. Matters for ATLAS because high-resolution
    // Earth observation data routinely captures identifiable persons
    // (vehicles, buildings, individuals in large-aperture imagery),
    // and French satellite operators must apply LIL + GDPR to data
    // processing decisions.
    id: "FR-LIL-1978",
    jurisdiction: "FR",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Protection Act",
    title_local:
      "Loi n° 78-17 du 6 janvier 1978 relative à l'informatique, aux fichiers et aux libertés (Loi Informatique et Libertés — LIL)",
    date_enacted: "1978-01-06",
    date_last_amended: "2024-05-21",
    official_reference:
      "JORF du 7 janvier 1978, refondue par Ord. n° 2018-1125 du 12 décembre 2018 et Loi n° 2018-493 du 20 juin 2018 (transposition RGPD); mises à jour via Loi n° 2024-449 du 21 mai 2024",
    source_url: "https://www.legifrance.gouv.fr/loda/id/LEGISCTA000037817521/",
    issuing_body: "Parlement",
    competent_authorities: ["FR-CNIL"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "data_provider",
      "constellation_operator",
    ],
    compliance_areas: ["data_security", "cybersecurity"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Founding principle",
        summary:
          "« L'informatique doit être au service de chaque citoyen. Elle ne doit porter atteinte ni à l'identité humaine, ni aux droits de l'homme, ni à la vie privée, ni aux libertés individuelles ou publiques. »",
      },
      {
        section: "Art. 2",
        title: "Material scope — personal data processing",
        summary:
          "Applies to automated processing of personal data, and to non-automated processing of data contained in files. Personal data means any information relating to an identified or identifiable natural person — incorporating GDPR Art. 4 definitions.",
        complianceImplication:
          "High-resolution Earth observation imagery in which individuals are identifiable (e.g. vehicles + location context, recognisable individuals) is personal data. CNIL has taken this position in enforcement against street-level imaging services — operators should assume the same reasoning applies to sub-30cm GSD satellite imagery.",
      },
      {
        section: "Art. 4.3",
        title: "Data minimisation",
        summary:
          "Processing must be « adéquate, pertinente et, au regard des finalités pour lesquelles elles sont traitées, limitée à ce qui est nécessaire ». Collecting incidental persons in satellite imagery tests this principle — the operator must justify the resolution-fidelity trade-off.",
      },
      {
        section: "Title II Chapter III",
        title: "Transfers outside the EU",
        summary:
          "Transfers of personal data to non-EU recipients require adequacy decision, Standard Contractual Clauses, or other GDPR-compatible safeguards. Relevant for satellite data relayed to US ground stations or distributed to non-EU customers.",
        complianceImplication:
          "French EO operators with US downlink stations or US-based constellation-as-a-service customers must have SCC or Data Privacy Framework in place.",
      },
      {
        section: "CNIL sanction powers",
        title: "Administrative fines up to €20M or 4% of worldwide turnover",
        summary:
          "CNIL applies the GDPR sanction scale. Historical precedent: high-resolution imagery providers have been the subject of CNIL formal notices and sanctions in the Street View / aerial mapping context.",
      },
    ],
    scope_description:
      "The French transposition and complement to the GDPR. French space operators processing imagery, customer data, or ground-station user data are subject to CNIL enforcement under this statute — distinct from but parallel to the LOS licensing regime. Matters especially at resolution levels where individuals become identifiable in the imagery itself.",
    related_sources: ["FR-DECRET-2009-640", "EU-GDPR-2016"],
    implements: "EU-GDPR-2016",
    notes: [
      "2018 was the substantive refoundation — Loi 2018-493 (20 June 2018) and Ord. 2018-1125 (12 December 2018) rewrote LIL to align with GDPR while preserving French-specific derogations (e.g. journalism, research).",
      "For satellite EO operators, the CNIL's « imagerie aérienne et satellitaire » position paper (updated 2022) is the most useful soft-law guidance on how resolution + metadata combinations create personal-data risk.",
    ],
    last_verified: "2026-04-22",
  },

  {
    // PPST — the sensitive-research protection regime. Directly
    // relevant for space operators because CNES, ONERA, and major
    // satellite primes (Airbus Defence & Space Toulouse, Thales
    // Alenia Cannes) hold ZRR classifications under PPST. Foreign
    // personnel assignments, internships, and research-collaboration
    // visits at these sites require prior SGDSN / FSD authorisation.
    id: "FR-PPST",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Protection of National Scientific and Technical Heritage",
    title_local:
      "Protection du potentiel scientifique et technique de la nation (PPST) — Art. 413-7 Code pénal, Décrets n° 2011-1425 du 2 novembre 2011 et n° 2012-901 du 20 juillet 2012",
    date_enacted: "2011-11-02",
    date_last_amended: "2022-07-06",
    official_reference:
      "Art. 413-7 du Code pénal; Décret n° 2011-1425 du 2.11.2011 (JORF n°0256 du 4.11.2011); Décret n° 2012-901 du 20.7.2012 (JORF n°0170 du 24.7.2012); mises à jour via Décret n° 2022-965 du 1.7.2022",
    source_url: "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000024780923/",
    issuing_body: "Premier ministre / SGDSN",
    competent_authorities: ["FR-SGDSN", "FR-MINARMES", "FR-MESR"],
    relevance_level: "critical",
    applicable_to: [
      "satellite_operator",
      "launch_provider",
      "ground_segment",
      "data_provider",
    ],
    compliance_areas: [
      "export_control",
      "military_dual_use",
      "cybersecurity",
      "data_security",
    ],
    key_provisions: [
      {
        section: "Art. 413-7 Code pénal",
        title: "Criminal basis",
        summary:
          "Criminalises unauthorised physical access, data exfiltration, or disclosure affecting the scientific and technical heritage of the nation. Penalties up to 7 years imprisonment and €100 000 fine (aggravated cases); aggravated 10-year / €150 000 when committed for the benefit of a foreign power.",
      },
      {
        section: "Décret 2011-1425 Art. 2",
        title: "ZRR — zones à régime restrictif",
        summary:
          "Sensitive research establishments are designated as Zones à Régime Restrictif. All access by foreign nationals (and certain French nationals with extra-EU ties) requires prior authorisation by the competent minister (typically via the FSD — Fonctionnaire de Sécurité de Défense — ministériel), issued after SGDSN concurrence.",
        complianceImplication:
          "Any foreign engineer, intern, researcher, or business visitor to CNES, ONERA, Airbus DS Toulouse, Thales Alenia Cannes, or ArianeGroup Vernon needs prior PPST clearance. Typical processing time: 6-8 weeks for EU nationals, 3-5 months for extra-EU. Operators must plan for this lead time.",
      },
      {
        section: "Décret 2012-901 Art. 1",
        title: "Protected scientific domains",
        summary:
          "Defines protected domains including aerospace propulsion, advanced materials, cryptography, electronic warfare, space-situational awareness and space C2 — all directly space-relevant. Establishments hosting these activities are eligible for ZRR designation.",
      },
      {
        section: "FSD obligations",
        title: "Ministry-level security officer duties",
        summary:
          "Each ministry designates an FSD (Fonctionnaire de Sécurité de Défense) who runs the PPST vetting for establishments under ministry oversight. CNES falls under MESR; ONERA under Minarmées; private primes fall under Minéco via the DGE.",
      },
      {
        section: "Décret 2022-965",
        title: "2022 update — expanded scope",
        summary:
          "The 2022 update extended the PPST classification criteria to cover emerging technologies (quantum computing, AI/ML in defence applications, bio-tech) and reinforced the FSD's audit powers over ZRR establishments.",
      },
    ],
    scope_description:
      "Cross-cutting national security regime protecting sensitive French scientific and technical capability. Overlaps with but is legally distinct from export control (CIEEMG for munitions, SBDU for dual-use) — PPST is about controlling access to the *research environment*, not about controlling the export of the *output*. Space operators interact with PPST primarily through visitor authorisation processes at ZRR-designated facilities.",
    related_sources: ["FR-CIEEMG", "FR-SBDU-DUALUSE"],
    notes: [
      "PPST compliance failure is under-appreciated as a risk in international space collaboration. A foreign engineer entering a ZRR without prior clearance is a criminal offence under Art. 413-7 — on the part of both the visitor AND the establishment that admitted them.",
      "For French primes, the « Correspondant PPST » (internal security coordinator) role is the operational counterparty for visitor/hiring authorisations.",
    ],
    last_verified: "2026-04-22",
  },

  {
    // IEF / FDI screening — Décret 2019-1590 + Art. L.151-3 +
    // R.151-3 Code monétaire et financier. Space is explicitly
    // listed as a protected sector. Directly mirrors the AWG § 55 ff.
    // function in German law and is the gate for foreign acquisitions
    // of French space-sector companies.
    id: "FR-IEF-2019",
    jurisdiction: "FR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Foreign Direct Investment Screening in France",
    title_local:
      "Contrôle des investissements étrangers en France (IEF) — Décret n° 2019-1590 du 31 décembre 2019 et Art. L.151-3 / R.151-3 du Code monétaire et financier",
    date_enacted: "2019-12-31",
    date_last_amended: "2023-12-28",
    official_reference:
      "Décret n° 2019-1590 du 31 décembre 2019 (JORF n°0001 du 1.1.2020); Art. L.151-3 et R.151-1 à R.151-17 Code monétaire et financier; modifié par Décrets n° 2020-892 du 22.7.2020, n° 2023-1293 du 28.12.2023",
    source_url:
      "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072026/LEGISCTA000041411379/",
    issuing_body: "Ministère de l'économie — Direction générale du Trésor",
    competent_authorities: ["FR-MINECO"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "licensing"],
    key_provisions: [
      {
        section: "Art. R.151-3 I 2°",
        title: "Space activities listed as sensitive sector",
        summary:
          "« Activités dans le secteur de l'aéronautique et du spatial » are explicitly enumerated as sensitive activities triggering the IEF screening regime. Applies when the French target performs R&D, production, or supply in the aerospace and space sector.",
        complianceImplication:
          "Every acquisition, merger, or significant investment in a French space company by a non-French investor triggers a prior-authorisation requirement. The target cannot close the transaction until Minéco authorisation is granted (typically 30-75 business days, extendable).",
      },
      {
        section: "Art. R.151-2",
        title: "Investment thresholds triggering review",
        summary:
          "Review is triggered by: (a) acquiring control over a French entity active in the listed sectors, (b) acquiring ≥25% of voting rights (for investors from EU/EEA), (c) acquiring ≥10% of voting rights (for investors from outside EU/EEA — threshold lowered from 25% by the COVID-era Décret 2020-892, made permanent in 2023).",
      },
      {
        section: "Art. L.151-3 II",
        title: "Sanctions for non-compliance",
        summary:
          "Transactions closed without prior IEF authorisation are voidable. The Minister can impose financial penalties up to the amount of the investment or up to twice the amount of the irregular transaction. Can also order divestiture or impose corrective conditions post-closing.",
      },
      {
        section: "Art. R.151-6",
        title: "« Rescrit IEF » pre-filing consultation",
        summary:
          "Investors may file a « demande de rescrit » to obtain a binding Treasury opinion on whether a proposed transaction falls within the regime — useful where the target's space-sector activities are marginal or ambiguous. Response within 2 months; binding on the administration.",
      },
      {
        section: "Post-closing conditions",
        title: "Undertakings typically imposed on space-sector targets",
        summary:
          "Authorisations are typically conditional on undertakings: maintenance of strategic industrial capabilities in France, ring-fencing of sensitive technologies, continuity of supply to French state customers (especially Minarmées), information rights for the French state on board/C-suite changes, and export-compliance undertakings.",
      },
    ],
    scope_description:
      "France's foreign-investment-screening regime for sensitive sectors. Aerospace & space is explicitly a listed sensitive sector — every cross-border deal involving a French space company needs Minéco clearance. Applies to direct acquisitions, mergers, and financial investments at the 10%/25% thresholds depending on investor origin. Administered by the Direction générale du Trésor; technical assessment typically involves inter-ministerial consultation with Minarmées and CNES.",
    related_sources: ["FR-CIEEMG", "FR-SBDU-DUALUSE", "FR-LOS-2008"],
    notes: [
      "Procedural reality: operators should anticipate IEF clearance as part of transaction timelines. Deal-length impact typically 6-12 weeks beyond standard M&A, longer for complex technology transfers.",
      "Interaction with LOS: a change of control at a LOS licensee can separately trigger a licence review under LOS Art. 3, independent of the IEF authorisation.",
    ],
    last_verified: "2026-04-22",
  },
];

// ─── Aggregated Export ──────────────────────────────────────────────

export const LEGAL_SOURCES_FR: LegalSource[] = [
  ...TREATIES_FR,
  ...FOUNDATIONAL_FR,
  ...LOS_FRAMEWORK_FR,
  ...TECHNICAL_FR,
  ...CNES_FRAMEWORK_FR,
  ...DEFENSE_FR,
  ...TELECOM_FR,
  ...INSURANCE_FR,
  ...EXPORT_FR,
  ...NIS2_FR,
  ...ENVIRONMENTAL_FR,
  ...POLICY_FR,
  ...PENDING_TECHNICAL_FR,
];
