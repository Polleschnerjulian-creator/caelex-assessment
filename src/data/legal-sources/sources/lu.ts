// src/data/legal-sources/sources/lu.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Luxembourg space law sources — complete legal framework for jurisdiction LU.
 *
 * Sources: legilux.public.lu, LSA, ILR, CSSF, Chambre des Deputes
 * Last verified: 2026-04-09
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── LU Authorities (11) ───────────────────────────────────────────

export const AUTHORITIES_LU: Authority[] = [
  {
    id: "LU-LSA",
    jurisdiction: "LU",
    name_en: "Luxembourg Space Agency",
    name_local: "Luxembourg Space Agency",
    abbreviation: "LSA",
    website: "https://space-agency.public.lu",
    space_mandate:
      "Operational space agency established by foundation on 8 July 2021, under the authority of the Ministry of the Economy. Processes authorization applications under the 2017 and 2020 space laws. Maintains the national registry of space objects. Leads the SpaceResources.lu initiative. CEO: Marc Serres.",
    legal_basis: "Loi du 20 juillet 2017; Loi du 15 décembre 2020",
    applicable_areas: ["licensing", "registration", "debris_mitigation"],
  },
  {
    id: "LU-MECO",
    jurisdiction: "LU",
    name_en: "Ministry of the Economy",
    name_local: "Ministère de l'Économie",
    abbreviation: "MECO",
    website: "https://meco.gouvernement.lu",
    space_mandate:
      "Grants and withdraws authorizations for space activities and space resource exploration/utilization via arrêté ministériel. Ultimate decision authority under both the 2017 and 2020 space laws.",
    applicable_areas: ["licensing"],
  },
  {
    id: "LU-ILR",
    jurisdiction: "LU",
    name_en: "Luxembourg Institute of Regulation",
    name_local: "Institut Luxembourgeois de Régulation",
    abbreviation: "ILR",
    website: "https://web.ilr.lu",
    space_mandate:
      "Spectrum management and satellite frequency coordination. Manages radio frequency band assignments for satellite operators. Responsible for NIS registrations under cybersecurity framework. Operates under the Loi du 30 mai 2005 (radio frequencies) and Loi du 17 décembre 2021 (electronic communications).",
    legal_basis: "Loi du 30 mai 2005; Loi du 17 décembre 2021",
    applicable_areas: ["frequency_spectrum", "cybersecurity"],
  },
  {
    id: "LU-SMC",
    jurisdiction: "LU",
    name_en: "Service for Media, Connectivity and Digital Policy",
    name_local:
      "Service des médias, de la connectivité et de la politique numérique",
    abbreviation: "SMC",
    website: "https://smc.gouvernement.lu",
    space_mandate:
      "Satellite system concessions and frequency/orbital position concessions. Manages the regulatory framework for Luxembourg satellite systems including concession agreements with SES.",
    applicable_areas: ["frequency_spectrum", "licensing"],
  },
  {
    id: "LU-CSSF",
    jurisdiction: "LU",
    name_en: "Commission de Surveillance du Secteur Financier",
    name_local: "Commission de Surveillance du Secteur Financier",
    abbreviation: "CSSF",
    website: "https://www.cssf.lu",
    space_mandate:
      "Financial supervision of listed space companies (SES S.A.) and space investment funds. Regulates the financial governance model adopted by the 2017 Space Resources Law (Art. 7-9).",
    applicable_areas: ["licensing"],
  },
  {
    id: "LU-CNPD",
    jurisdiction: "LU",
    name_en: "National Commission for Data Protection",
    name_local: "Commission Nationale pour la Protection des Données",
    abbreviation: "CNPD",
    website: "https://cnpd.public.lu",
    space_mandate:
      "GDPR compliance for space data processing. Enforces data protection obligations for Earth observation imagery and satellite-derived data with personal data implications.",
    legal_basis: "Loi du 1er août 2018",
    applicable_areas: ["data_security"],
  },
  {
    id: "LU-DEFENCE",
    jurisdiction: "LU",
    name_en: "Directorate of Defence",
    name_local: "Direction de la Défense",
    abbreviation: "DD",
    website: "https://defense.gouvernement.lu",
    space_mandate:
      "Military satellite communications through the GovSat partnership (LuxGovSat S.A.). NATO space domain coordination. Manages Luxembourg's participation in NATO and EU defence space programmes.",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "LU-OCEIT",
    jurisdiction: "LU",
    name_en: "Office for Export, Import and Transit Control",
    name_local:
      "Office de contrôle des exportations, importations et du transit",
    abbreviation: "OCEIT",
    website: "https://maee.gouvernement.lu/fr/directions/oceit.html",
    space_mandate:
      "Export licensing for dual-use goods and defence products. Administers export controls under the Loi du 27 juin 2018 for satellite components, encryption technology, and space-related items.",
    legal_basis: "Loi du 27 juin 2018",
    applicable_areas: ["export_control"],
  },
  {
    id: "LU-MAE",
    jurisdiction: "LU",
    name_en: "Ministry of Foreign and European Affairs",
    name_local: "Ministère des Affaires étrangères et européennes",
    abbreviation: "MAE",
    website: "https://maee.gouvernement.lu",
    space_mandate:
      "International space diplomacy and treaty negotiations. Represents Luxembourg in UN COPUOS, Artemis Accords, and bilateral space cooperation agreements.",
    applicable_areas: ["licensing"],
  },
  {
    id: "LU-HCPN",
    jurisdiction: "LU",
    name_en: "High Commission for National Protection",
    name_local: "Haut-Commissariat à la Protection nationale",
    abbreviation: "HCPN",
    website: "https://hcpn.gouvernement.lu",
    space_mandate:
      "National cybersecurity policy and critical infrastructure protection. Coordinates Luxembourg's response to cyber threats targeting space systems and satellite ground infrastructure.",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "LU-ESRIC",
    jurisdiction: "LU",
    name_en: "European Space Resources Innovation Centre",
    name_local: "European Space Resources Innovation Centre",
    abbreviation: "ESRIC",
    website: "https://www.esric.lu",
    space_mandate:
      "World's first space resources innovation centre, established August 2020. Joint initiative of LSA, Luxembourg Institute of Science and Technology (LIST), and ESA. Conducts research and supports start-ups in space resource utilization.",
    applicable_areas: ["licensing"],
  },
];

// ─── International Treaties (LU-specific entries, 5) ───────────────

const TREATIES_LU: LegalSource[] = [
  {
    id: "LU-OST-RATIFICA",
    jurisdiction: "LU",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Luxembourg Ratification Record",
    title_local:
      "Loi du 31 juillet 2005 portant approbation du Traité sur l'espace extra-atmosphérique",
    date_enacted: "2005-07-31",
    date_in_force: "2006-01-17",
    parliamentary_reference: "dossier n° 5363",
    source_url: "https://legilux.public.lu/eli/etat/leg/loi/2005/07/31/n1/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-MAE", "LU-LSA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorization",
        summary:
          "Luxembourg bears international responsibility for all national space activities including by non-governmental entities. This is the constitutional foundation of both the 2017 Space Resources Law and the 2020 Space Activities Law.",
        complianceImplication:
          "Art. VI is the direct legal basis for Luxembourg's dual space law authorization regime. Every Luxembourg space operator must be authorized because Luxembourg bears responsibility under this article.",
      },
      {
        section: "Art. VII",
        title: "Launching State liability",
        summary:
          "Luxembourg is a 'launching State' for objects launched from its territory or by Luxembourg entities. This drives the liability and insurance requirements in the 2020 Space Activities Law (Chapter 5).",
      },
    ],
    related_sources: [
      "LU-SPACE-RESOURCES-2017",
      "LU-SPACE-ACTIVITIES-2020",
      "LU-LIABILITY-RATIFICA",
      "LU-REGISTRATION-RATIFICA",
    ],
    notes: [
      "Luxembourg signed the Outer Space Treaty in 1967 but ratified 39 years later via the Loi du 31 juillet 2005 (dossier n° 5363). Ratification deposited 17 January 2006.",
      "The extraordinarily late ratification was catalyzed by the growth of SES operations — Luxembourg needed to formalize its international obligations as a major satellite jurisdiction.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-LIABILITY-RATIFICA",
    jurisdiction: "LU",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Luxembourg Ratification Record",
    title_local:
      "Loi du 9 juin 1983 portant approbation de la Convention sur la responsabilité internationale",
    date_enacted: "1983-06-09",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-MAE"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability for surface damage",
        summary:
          "Luxembourg as launching State is absolutely liable for damage caused by space objects on the surface of the Earth. This drives the full operator liability regime in the 2020 Space Activities Law (Chapter 5).",
        complianceImplication:
          "The 2020 law imposes full operator liability with NO statutory cap and NO government indemnity — one of the strictest liability regimes in Europe.",
      },
    ],
    related_sources: ["LU-OST-RATIFICA", "LU-SPACE-ACTIVITIES-2020"],
    notes: [
      "Luxembourg ratified the Liability Convention via the Loi du 9 juin 1983.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-REGISTRATION-RATIFICA",
    jurisdiction: "LU",
    type: "international_treaty",
    status: "in_force",
    title_en: "Registration Convention — Luxembourg Accession Record",
    title_local:
      "Loi du 15 décembre 2020 portant approbation de la Convention sur l'immatriculation",
    date_enacted: "2020-12-15",
    date_in_force: "2021-01-27",
    official_reference: "Mémorial A n° 1087",
    source_url:
      "https://legilux.public.lu/eli/etat/leg/loi/2020/12/15/a1087/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-LSA", "LU-MAE"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["registration"],
    key_provisions: [
      {
        section: "Art. II",
        title: "National registry obligation",
        summary:
          "Luxembourg must maintain a national registry of space objects. The 2020 Space Activities Law (Chapter 6) implements this obligation — the LSA maintains the national registry.",
        complianceImplication:
          "All space objects for which Luxembourg bears international responsibility must be registered. Operators must provide launch and orbital data to the LSA.",
      },
    ],
    related_sources: ["LU-OST-RATIFICA", "LU-SPACE-ACTIVITIES-2020"],
    notes: [
      "Luxembourg acceded to the Registration Convention simultaneously with the adoption of the 2020 Space Activities Law. Accession deposited 27 January 2021.",
      "Mémorial A n° 1087 — published alongside the Space Activities Law (Mémorial A n° 1086).",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-INT-MOON-1979",
    jurisdiction: "LU",
    type: "international_treaty",
    status: "not_ratified",
    title_en:
      "Agreement Governing the Activities of States on the Moon and Other Celestial Bodies",
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
      "NOT ratified by Luxembourg. Luxembourg's 2017 Space Resources Law takes a fundamentally different approach — Art. 1 explicitly permits appropriation of space resources. Luxembourg signed the Artemis Accords in 2020 as a founding signatory, further reinforcing its position.",
    related_sources: ["LU-OST-RATIFICA", "LU-SPACE-RESOURCES-2017"],
    notes: [
      "Luxembourg has NOT ratified the Moon Agreement — no binding obligations for Luxembourg entities.",
      "Luxembourg's 2017 Space Resources Law directly contradicts the Moon Agreement's common heritage principle by establishing private property rights over extracted space resources.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-RESCUE-STATUS",
    jurisdiction: "LU",
    type: "international_treaty",
    status: "not_ratified",
    title_en: "Rescue Agreement — Luxembourg Signature Record (not ratified)",
    date_enacted: "1968-04-22",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introrescueagreement.html",
    issuing_body: "United Nations General Assembly",
    competent_authorities: [],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Art. 1-4",
        title: "Rescue and return of astronauts",
        summary:
          "Contracting parties shall notify, rescue, and return astronauts who land in their territory, and assist astronauts in distress.",
      },
    ],
    scope_description:
      "Luxembourg signed the Rescue Agreement but has NOT ratified it. No binding obligations beyond general OST Art. V duty of care.",
    related_sources: ["LU-OST-RATIFICA"],
    notes: [
      "Luxembourg signed the Rescue Agreement but has NOT ratified it.",
      "Signed only — no binding treaty obligation beyond the general duty under OST Art. V.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Primary National Legislation (3 — THE CORE) ──────────────────

const PRIMARY_LEGISLATION_LU: LegalSource[] = [
  {
    id: "LU-SPACE-RESOURCES-2017",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Law of 20 July 2017 on the Exploration and Use of Space Resources",
    title_local:
      "Loi du 20 juillet 2017 sur l'exploration et l'utilisation des ressources de l'espace",
    date_enacted: "2017-07-20",
    date_in_force: "2017-08-01",
    official_reference: "Mémorial A n° 674",
    source_url: "https://legilux.public.lu/eli/etat/leg/loi/2017/07/20/a674/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-MECO", "LU-LSA", "LU-CSSF"],
    relevance_level: "critical",
    applicable_to: ["space_resource_operator", "all"],
    compliance_areas: ["licensing", "registration", "insurance"],
    key_provisions: [
      {
        section: "Art. 1",
        title: "Property rights — appropriation of space resources",
        summary:
          "Les ressources de l'espace sont susceptibles d'appropriation — space resources are capable of being appropriated. Establishes private property rights over extracted space resources. World's second space resources law (after the US SPACE Act of 2015).",
        complianceImplication:
          "Luxembourg law explicitly permits the appropriation of space resources. Operators authorized under this law acquire legal title to extracted resources.",
      },
      {
        section: "Art. 2",
        title: "Authorization requirement",
        summary:
          "The exploration and utilization of space resources requires prior authorization from the Minister of the Economy.",
        complianceImplication:
          "No space resource activity may be conducted without ministerial authorization. Applications must be filed at least 6 months in advance.",
      },
      {
        section: "Art. 4",
        title: "Luxembourg incorporation required — SA/SCA/SARL/SE",
        summary:
          "Only companies incorporated in Luxembourg as SA (société anonyme), SCA (société en commandite par actions), SARL (société à responsabilité limitée), or SE (Societas Europaea) may apply for authorization.",
        complianceImplication:
          "Foreign operators MUST establish a Luxembourg subsidiary in one of the four permitted corporate forms to conduct space resource activities.",
      },
      {
        section: "Art. 7",
        title: "Financial sector governance model",
        summary:
          "The law adopts Luxembourg's established financial sector governance framework for the authorization and supervision of space resource operators.",
        complianceImplication:
          "Space resource operators face governance requirements comparable to those of regulated financial entities — a unique approach globally.",
      },
      {
        section: "Art. 8",
        title: "Shareholder disclosure threshold",
        summary:
          "Any person acquiring 10% or more of the shares of an authorized operator must notify the Minister. Change of control triggers enhanced scrutiny.",
        complianceImplication:
          "Share acquisitions above 10% require advance disclosure. This mirrors financial services regulation and ensures continuous supervision.",
      },
      {
        section: "Art. 10",
        title: "Risk assessment and insurance",
        summary:
          "Authorized operators must conduct a risk assessment and maintain insurance coverage obtained from an insurer outside the operator's group.",
        complianceImplication:
          "Insurance must be obtained from an external (non-group) insurer. This prevents self-insurance and ensures genuine risk transfer.",
      },
      {
        section: "Art. 13",
        title: "Authorization fee",
        summary:
          "Authorization fee between EUR 5,000 and EUR 500,000, set by the Minister based on the nature and scale of activities.",
      },
      {
        section: "Art. 18",
        title: "Criminal sanctions",
        summary:
          "Conducting unauthorized space resource activities is a criminal offence carrying 8 days to 5 years imprisonment and/or a fine of EUR 1,250 to EUR 1,250,000.",
        complianceImplication:
          "Criminal liability for both natural persons and legal entities. Maximum EUR 1,250,000 fine — significant deterrent.",
      },
    ],
    scope_description:
      "World's second space resources law after the US SPACE Act of 2015. 18 articles establishing a complete regulatory framework for the exploration and utilization of space resources. Adopts a financial sector governance model unique among space legislation globally.",
    related_sources: [
      "LU-SPACE-ACTIVITIES-2020",
      "LU-OST-RATIFICA",
      "LU-RGD-2025-FEES",
      "LU-SPACERESOURCES-LU",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "World's second space resources law — adopted 20 July 2017 (after the US SPACE Act of 2015 / 51 USC §51303).",
      "Art. 1: 'Les ressources de l'espace sont susceptibles d'appropriation' — explicitly establishes private property rights over space resources.",
      "Unique financial sector governance model: borrows from CSSF regulatory architecture for space operator supervision.",
      "ispace Europe S.A. received the first authorization under this law for the HAKUTO-R Mission 2 lunar lander (2024).",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-SPACE-ACTIVITIES-2020",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en: "Law of 15 December 2020 on Space Activities",
    title_local: "Loi du 15 décembre 2020 portant sur les activités spatiales",
    date_enacted: "2020-12-15",
    date_in_force: "2021-01-01",
    official_reference: "Mémorial A n° 1086",
    source_url:
      "https://legilux.public.lu/eli/etat/leg/loi/2020/12/15/a1086/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-MECO", "LU-LSA"],
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
        section: "Ch. 1",
        title: "Scope — activities under Luxembourg responsibility",
        summary:
          "The law applies to space activities for which Luxembourg bears international responsibility under the Outer Space Treaty. 8 chapters, 20 articles. Comprehensive lex generalis complementing the 2017 lex specialis.",
        complianceImplication:
          "All space activities attributable to Luxembourg — whether conducted from Luxembourg or by Luxembourg entities abroad — require authorization.",
      },
      {
        section: "Ch. 2",
        title: "Authorization regime — Minister of the Economy",
        summary:
          "Authorization by the Minister of the Economy. Applications must be filed at least 6 months in advance. Authorization fee EUR 5,000-500,000. Annual supervision fee EUR 2,000-50,000.",
        complianceImplication:
          "6-month advance filing requirement. Fee structure: one-time authorization fee (EUR 5,000-500,000) plus recurring annual supervision fee (EUR 2,000-50,000).",
      },
      {
        section: "Ch. 3",
        title: "Continuous supervision and public register",
        summary:
          "Authorized operators are subject to continuous supervision by the Ministry. A public register of authorized operators is maintained.",
        complianceImplication:
          "Ongoing reporting obligations. The public register provides transparency but also competitive intelligence exposure.",
      },
      {
        section: "Ch. 4",
        title: "Transfer and change of control thresholds",
        summary:
          "Transfer of authorization requires ministerial approval. Change of control thresholds at 10%, 20%, 33%, and 50% trigger notification and/or approval requirements.",
        complianceImplication:
          "Multi-tiered change of control regime: 10/20/33/50% thresholds. M&A and investment transactions involving authorized operators require advance regulatory clearance.",
      },
      {
        section: "Ch. 5",
        title:
          "Full operator liability — NO statutory cap, NO government indemnity",
        summary:
          "Operators bear full liability for damage caused by their space activities. There is NO statutory liability cap and NO government indemnity or backstop.",
        complianceImplication:
          "One of the strictest liability regimes in Europe. Operators face unlimited liability with no government backstop. Insurance planning is critical.",
      },
      {
        section: "Ch. 6",
        title: "National registry — Registration Convention implementation",
        summary:
          "Establishes Luxembourg's national registry of space objects, implementing the Registration Convention (acceded simultaneously).",
      },
      {
        section: "Ch. 7",
        title: "Criminal sanctions",
        summary:
          "Unauthorized space activities: up to 5 years imprisonment and/or fine up to EUR 1,250,000.",
      },
      {
        section: "Ch. 8",
        title: "Transitional provisions — SES concession",
        summary:
          "SES concession transition: existing concession arrangements under the 1991 Electronic Media Law must transition to the new authorization regime by 31 December 2022. Tax exemptions for space insurance premiums and operator income tax credit.",
        complianceImplication:
          "SES transitioned from the 1991 concession model to the 2020 authorization regime. Tax incentives designed to maintain Luxembourg's attractiveness as a satellite jurisdiction.",
      },
    ],
    scope_description:
      "Comprehensive lex generalis for all Luxembourg space activities. 8 chapters, 20 articles. Adopted simultaneously with the Registration Convention accession. Complements the 2017 Space Resources Law (lex specialis). Together they form Luxembourg's dual space law framework.",
    related_sources: [
      "LU-SPACE-RESOURCES-2017",
      "LU-OST-RATIFICA",
      "LU-REGISTRATION-RATIFICA",
      "LU-ELECTRONIC-MEDIA-1991",
    ],
    caelex_engine_mapping: ["space-law-engine.server"],
    caelex_data_file_mapping: ["national-space-laws.ts"],
    notes: [
      "Together with the 2017 Space Resources Law, forms Luxembourg's unique dual space law framework: 2017 law = lex specialis (resources), 2020 law = lex generalis (all activities).",
      "Chapter 5: full operator liability with NO statutory cap and NO government indemnity — one of the strictest regimes in Europe.",
      "Adopted simultaneously with Registration Convention accession (Mémorial A n° 1087).",
      "SES concession transition deadline: 31 December 2022. Tax incentives for space insurance and operator income.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-ELECTRONIC-MEDIA-1991",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en: "Modified Law of 27 July 1991 on Electronic Media",
    title_local: "Loi modifiée du 27 juillet 1991 sur les médias électroniques",
    date_enacted: "1991-07-27",
    source_url: "https://legilux.public.lu/eli/etat/leg/loi/1991/07/27/n1/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-SMC", "LU-MECO"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["licensing", "frequency_spectrum"],
    key_provisions: [
      {
        section: "Art. 20",
        title: "Concession for Luxembourg satellite systems",
        summary:
          "Concession required for the operation of Luxembourg satellite systems. The Government of Luxembourg holds 33.33% voting rights in SES via Class B shares under this framework.",
        complianceImplication:
          "The SES concession model established Luxembourg as a global satellite jurisdiction. Government retains strategic control through golden share mechanism.",
      },
    ],
    scope_description:
      "The foundational SES concession framework. Art. 20 requires a concession for Luxembourg satellite systems. Government holds 33.33% voting rights in SES via Class B shares. Partially superseded by the 2020 Space Activities Law for new authorizations.",
    related_sources: ["LU-SPACE-ACTIVITIES-2020"],
    notes: [
      "This is the law that made Luxembourg a global satellite jurisdiction through SES (formerly Astra).",
      "Government holds 33.33% voting rights in SES via Class B shares — strategic control mechanism.",
      "New space activities after 2020 are authorized under the Space Activities Law, but the 1991 framework remains relevant for the SES concession transition.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Implementing Regulations (1) ─────────────────────────────────

const IMPLEMENTING_REGULATIONS_LU: LegalSource[] = [
  {
    id: "LU-RGD-2025-FEES",
    jurisdiction: "LU",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Grand-Ducal Regulation of 11 July 2025 — Fee Collection Procedures",
    title_local:
      "Règlement grand-ducal du 11 juillet 2025 relatif aux procédures de perception des redevances",
    date_enacted: "2025-07-11",
    source_url: "https://legilux.public.lu/eli/etat/leg/rgd/2025/07/11/jo",
    issuing_body: "Grand Duke (Conseil de Gouvernement)",
    competent_authorities: ["LU-MECO", "LU-LSA"],
    relevance_level: "medium",
    applicable_to: ["space_resource_operator"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Fee collection under 2017 law Art. 13",
        summary:
          "Establishes detailed procedures for collecting authorization fees (EUR 5,000-500,000) under Art. 13 of the 2017 Space Resources Law.",
        complianceImplication:
          "Operators must comply with the fee schedule and payment procedures. The implementing regulation for the 2020 law fees and register is still pending as of April 2026.",
      },
    ],
    related_sources: ["LU-SPACE-RESOURCES-2017"],
    notes: [
      "Implements Art. 13 of the 2017 Space Resources Law.",
      "The implementing regulation for the 2020 Space Activities Law (fees + national register) is still pending as of April 2026.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Telecommunications (2) ────────────────────────────────────────

const TELECOM_LU: LegalSource[] = [
  {
    id: "LU-ELECTRONIC-COMMS-2021",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en: "Law of 17 December 2021 on Electronic Communications",
    title_local: "Loi du 17 décembre 2021 sur les communications électroniques",
    date_enacted: "2021-12-17",
    official_reference: "Mémorial A n° 927",
    source_url: "https://legilux.public.lu/eli/etat/leg/loi/2021/12/17/a927/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-ILR"],
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
        title: "EU Electronic Communications Code transposition",
        summary:
          "Transposes the EU Electronic Communications Code (Directive 2018/1972) into Luxembourg law. ILR as the national regulatory authority for electronic communications including satellite services.",
        complianceImplication:
          "Satellite operators providing electronic communications services in Luxembourg must comply with ILR regulatory requirements.",
      },
    ],
    related_sources: ["LU-RADIO-FREQUENCIES-2005"],
    notes: [
      "Transposes EU Electronic Communications Code (Directive 2018/1972).",
      "ILR designated as the national regulatory authority.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-RADIO-FREQUENCIES-2005",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en: "Modified Law of 30 May 2005 on Radio Frequency Bands Management",
    title_local:
      "Loi modifiée du 30 mai 2005 concernant la gestion des fréquences radioélectriques",
    date_enacted: "2005-05-30",
    source_url: "https://legilux.public.lu/eli/etat/leg/loi/2005/05/30/n4/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-ILR"],
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
        title: "Radio frequency band management",
        summary:
          "Framework for radio frequency band allocation and management. ILR manages spectrum assignments including satellite frequency coordination.",
        complianceImplication:
          "Satellite operators using Luxembourg-filed frequencies require ILR spectrum authorization.",
      },
    ],
    related_sources: ["LU-ELECTRONIC-COMMS-2021"],
    last_verified: "2026-04-09",
  },
];

// ─── Export Control (2) ────────────────────────────────────────────

const EXPORT_CONTROL_LU: LegalSource[] = [
  {
    id: "LU-EXPORT-CONTROL-2018",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en: "Law of 27 June 2018 on Export Control",
    title_local: "Loi du 27 juin 2018 relative au contrôle des exportations",
    date_enacted: "2018-06-27",
    official_reference: "Mémorial A n° 603",
    source_url: "https://legilux.public.lu/eli/etat/leg/loi/2018/06/27/a603/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-OCEIT"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Consolidated export control framework",
        summary:
          "Consolidated export control law for dual-use goods, defence products, and other controlled items. OCEIT as the competent authority for all export licensing decisions.",
        complianceImplication:
          "Satellite components, encryption technology, and space-related items on the EU dual-use list require OCEIT export authorization.",
      },
    ],
    related_sources: ["LU-EXPORT-IMPL-2018"],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-EXPORT-IMPL-2018",
    jurisdiction: "LU",
    type: "federal_regulation",
    status: "in_force",
    title_en:
      "Grand-Ducal Regulation of 14 December 2018 — Export Control Implementation",
    title_local:
      "Règlement grand-ducal du 14 décembre 2018 portant exécution de la loi du 27 juin 2018",
    date_enacted: "2018-12-14",
    source_url: "https://legilux.public.lu/eli/etat/leg/rgd/2018/12/14/jo",
    issuing_body: "Grand Duke (Conseil de Gouvernement)",
    competent_authorities: ["LU-OCEIT"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Implementing regulation for export control",
        summary:
          "Detailed implementing provisions including intra-EU transfer procedures for cryptographic equipment and controlled technology.",
        complianceImplication:
          "Includes provisions for intra-EU cryptographic transfer — relevant for satellite encryption systems and ground segment equipment.",
      },
    ],
    related_sources: ["LU-EXPORT-CONTROL-2018"],
    last_verified: "2026-04-09",
  },
];

// ─── Cybersecurity (2) ─────────────────────────────────────────────

const CYBERSECURITY_LU: LegalSource[] = [
  {
    id: "LU-NIS1-2019",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en: "Law of 28 May 2019 on NIS1 Transposition",
    title_local:
      "Loi du 28 mai 2019 relative à la sécurité des réseaux et des systèmes d'information",
    date_enacted: "2019-05-28",
    source_url: "https://legilux.public.lu/eli/etat/leg/loi/2019/05/28/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-ILR", "LU-HCPN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS1 Directive transposition",
        summary:
          "Transposes the NIS1 Directive (EU 2016/1148) into Luxembourg law. Establishes cybersecurity obligations for operators of essential services and digital service providers. ILR handles NIS registrations.",
        complianceImplication:
          "Currently applicable pending NIS2 transposition. Satellite operators classified as essential services must comply with security and incident reporting requirements.",
      },
    ],
    related_sources: ["LU-NIS2-PENDING"],
    notes: [
      "Currently applicable — NIS2 transposition still pending as of April 2026.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-NIS2-PENDING",
    jurisdiction: "LU",
    type: "draft_legislation",
    status: "draft",
    title_en: "NIS2 Transposition — Projet de loi n° 8364",
    title_local: "Projet de loi n° 8364 transposant la directive NIS2",
    date_published: "2024-03-13",
    parliamentary_reference: "Projet de loi n° 8364",
    source_url: "https://www.chd.lu/fr/dossier/8364",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-HCPN", "LU-ILR"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full draft",
        title: "NIS2 Directive transposition",
        summary:
          "Draft law transposing the NIS2 Directive (EU 2022/2555). Filed 13 March 2024. Luxembourg missed the 17 October 2024 transposition deadline. European Commission issued a reasoned opinion on 7 May 2025.",
        complianceImplication:
          "Operators should prepare for enhanced cybersecurity obligations. The NIS2 requirements will apply once transposed, with potential retroactive compliance expectations.",
      },
    ],
    related_sources: ["LU-NIS1-2019"],
    notes: [
      "Luxembourg missed the 17 October 2024 NIS2 transposition deadline.",
      "European Commission reasoned opinion issued 7 May 2025 — second stage of infringement proceedings.",
      "NIS1 law remains applicable until NIS2 transposition is complete.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Data Protection (1) ──────────────────────────────────────────

const DATA_PROTECTION_LU: LegalSource[] = [
  {
    id: "LU-CNPD-2018",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en: "Law of 1 August 2018 — CNPD/GDPR Framework",
    title_local:
      "Loi du 1er août 2018 portant organisation de la Commission nationale pour la protection des données",
    date_enacted: "2018-08-01",
    source_url: "https://legilux.public.lu/eli/etat/leg/loi/2018/08/01/jo",
    issuing_body: "Chambre des Députés",
    competent_authorities: ["LU-CNPD"],
    relevance_level: "high",
    applicable_to: ["data_provider", "satellite_operator", "all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "CNPD establishment and GDPR implementation",
        summary:
          "Establishes the Commission Nationale pour la Protection des Données (CNPD) as Luxembourg's data protection authority and implements GDPR provisions into national law.",
        complianceImplication:
          "Earth observation operators and satellite data providers processing personal data must comply with GDPR via the CNPD framework. Luxembourg is reportedly preparing legislation on sensitive very-high-resolution EO data.",
      },
    ],
    related_sources: [],
    notes: [
      "Luxembourg reportedly preparing legislation on sensitive very-high-resolution Earth observation data — relevant for satellite imaging operators.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── EU Law — LU-specific (1) ─────────────────────────────────────

const EU_LU: LegalSource[] = [
  {
    id: "LU-IRIS2",
    jurisdiction: "LU",
    type: "policy_document",
    status: "in_force",
    title_en: "IRIS\u00B2 — Luxembourg Participation and Control Centre",
    date_published: "2024-01-01",
    source_url:
      "https://defence-industry-space.ec.europa.eu/eu-space-policy/iris2_en",
    issuing_body: "European Commission / SpaceRise Consortium",
    competent_authorities: ["LU-LSA"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "constellation_operator"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Programme",
        title: "EU secure connectivity constellation",
        summary:
          "IRIS\u00B2 (Infrastructure for Resilience, Interconnectivity and Security by Satellite) — Luxembourg hosts one of three control centres. SES leads the SpaceRise consortium that won the concession.",
        complianceImplication:
          "Luxembourg's role as IRIS\u00B2 control centre host and SES leadership of SpaceRise creates significant regulatory and commercial implications for Luxembourg-based operators.",
      },
    ],
    related_sources: ["LU-SPACE-ACTIVITIES-2020"],
    notes: [
      "Luxembourg hosts one of three IRIS\u00B2 control centres.",
      "SES leads the SpaceRise consortium — Luxembourg's largest space company driving EU secure connectivity.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Policy Documents (3) ─────────────────────────────────────────

const POLICY_LU: LegalSource[] = [
  {
    id: "LU-SPACE-STRATEGY-2023",
    jurisdiction: "LU",
    type: "policy_document",
    status: "in_force",
    title_en: "National Space Strategy 2023-2027 — Focus on Sustainability",
    title_local:
      "Stratégie spatiale nationale 2023-2027 — Focus on Sustainability",
    date_published: "2023-01-01",
    source_url: "https://space-agency.public.lu/en/agency/strategy.html",
    issuing_body: "Luxembourg Space Agency / Ministry of the Economy",
    competent_authorities: ["LU-LSA", "LU-MECO"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "debris_mitigation", "environmental"],
    key_provisions: [
      {
        section: "4 Axes",
        title: "National space strategy framework",
        summary:
          "Four strategic axes for Luxembourg space activities 2023-2027. Approximately EUR 256M total budget. Focus on sustainability, competitiveness, and innovation.",
        complianceImplication:
          "Strategic priorities signal regulatory direction — operators should align their compliance strategies with the sustainability focus.",
      },
    ],
    related_sources: [
      "LU-SPACE-ACTIVITIES-2020",
      "LU-SPACERESOURCES-LU",
      "LU-LUXIMPULSE",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-SPACERESOURCES-LU",
    jurisdiction: "LU",
    type: "policy_document",
    status: "in_force",
    title_en: "SpaceResources.lu Initiative",
    date_published: "2016-02-01",
    source_url: "https://space-agency.public.lu/en/space-resources.html",
    issuing_body: "Luxembourg Space Agency / Ministry of the Economy",
    competent_authorities: ["LU-LSA", "LU-MECO"],
    relevance_level: "high",
    applicable_to: ["space_resource_operator", "all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Initiative",
        title: "National space resources programme",
        summary:
          "SpaceResources.lu initiative launched February 2016 with EUR 200M government commitment. Over 80 companies and approximately 1,650 employees in the Luxembourg space sector. The initiative led directly to the 2017 Space Resources Law.",
        complianceImplication:
          "The initiative provides the policy context for the 2017 law. Companies attracted by SpaceResources.lu must comply with the authorization framework it created.",
      },
    ],
    related_sources: ["LU-SPACE-RESOURCES-2017", "LU-SPACE-STRATEGY-2023"],
    notes: [
      "Launched February 2016 with EUR 200M government commitment.",
      "Over 80 companies and approximately 1,650 employees in the Luxembourg space sector.",
      "Led directly to the adoption of the 2017 Space Resources Law.",
    ],
    last_verified: "2026-04-09",
  },
  {
    id: "LU-LUXIMPULSE",
    jurisdiction: "LU",
    type: "policy_document",
    status: "in_force",
    title_en: "LuxIMPULSE National Programme",
    date_published: "2025-01-01",
    source_url: "https://space-agency.public.lu/en/agency/luximpulse.html",
    issuing_body: "Luxembourg Space Agency",
    competent_authorities: ["LU-LSA"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Programme",
        title: "National space programme 2026-2029",
        summary:
          "LuxIMPULSE national programme with EUR 115.8M budget for 2026-2029. Implemented with ESA assistance. Supports Luxembourg space industry development and competitiveness.",
        complianceImplication:
          "EUR 115.8M programme signals continued Luxembourg commitment to space sector — relevant for operators considering Luxembourg as a jurisdiction.",
      },
    ],
    related_sources: ["LU-SPACE-STRATEGY-2023"],
    last_verified: "2026-04-09",
  },
];

// ─── Military / GovSat (1) ────────────────────────────────────────

const MILITARY_LU: LegalSource[] = [
  {
    id: "LU-GOVSAT",
    jurisdiction: "LU",
    type: "policy_document",
    status: "in_force",
    title_en: "GovSat — Luxembourg Government Satellite Communications",
    date_published: "2018-01-31",
    date_last_amended: "2026-01-01",
    source_url: "https://www.govsat.lu",
    issuing_body: "LuxGovSat S.A.",
    competent_authorities: ["LU-DEFENCE"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator"],
    compliance_areas: ["military_dual_use", "licensing"],
    key_provisions: [
      {
        section: "Programme",
        title: "Government satellite communications JV",
        summary:
          "GovSat — LuxGovSat S.A. is a 50/50 joint venture between the Luxembourg Government and SES. GovSat-1 launched 31 January 2018 (X-band and Ka-band military communications). GovSat-2 approved January 2026 with EUR 301M budget.",
        complianceImplication:
          "GovSat demonstrates Luxembourg's military space ambitions. Operators in the defence satellite communications space should note the government's dual-use framework.",
      },
    ],
    related_sources: ["LU-SPACE-ACTIVITIES-2020", "LU-ELECTRONIC-MEDIA-1991"],
    notes: [
      "LuxGovSat S.A.: 50/50 JV Luxembourg Government + SES.",
      "GovSat-1 launched 31 January 2018 — X-band and Ka-band military communications.",
      "GovSat-2 approved January 2026 — EUR 301M budget.",
    ],
    last_verified: "2026-04-09",
  },
];

// ─── Foundational / Constitutional (1) ─────────────────────────────
//
// Added 2026-04-22. LU's legal dataset was already comprehensive
// across the substantive regimes (Space Resources Act 2017 + Space
// Activities Act 2020 + telecoms + export + NIS + GDPR + policy
// docs), so the only material gap for parity with DE / FR is the
// constitutional anchor. Other candidate additions (environmental
// law for ground-segment siting, sanctions framework, implementing
// règlements grand-ducaux under the two space acts) could not be
// independently verified during this pass — Legilux + LSA block
// automated source verification — and were deferred rather than
// added on weaker evidence.

const FOUNDATIONAL_LU: LegalSource[] = [
  {
    // Constitution — LU remains under the 1868 Constitution,
    // continuously amended. The major 2022-2023 revision package
    // (published as four distinct revisions, in force 1 July 2023)
    // modernised the text but did NOT formally replace the 1868
    // document — common misconception worth flagging in notes.
    id: "LU-CONSTITUTION",
    jurisdiction: "LU",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Constitution of the Grand Duchy of Luxembourg — Space-Relevant Articles",
    title_local:
      "Constitution du Grand-Duché de Luxembourg (du 17 octobre 1868, modifiée; dernière révision majeure entrée en vigueur 1.7.2023)",
    date_enacted: "1868-10-17",
    date_last_amended: "2023-07-01",
    official_reference:
      "Mémorial A n°23 du 22 octobre 1868; révision majeure par quatre lois constitutionnelles (Chapitres I à III + Chapitre IV) entrées en vigueur le 1er juillet 2023",
    source_url:
      "https://legilux.public.lu/eli/etat/leg/constitution/1868/10/17/n1/jo",
    issuing_body: "Chambre des députés",
    competent_authorities: ["LU-MAE", "LU-MECO"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "liability"],
    key_provisions: [
      {
        section: "Art. 37",
        title: "Treaty-making power",
        summary:
          "The Grand Duke negotiates and signs international treaties. Treaties affecting state sovereignty or binding obligations on individuals require approval by law of the Chamber of Deputies before ratification. This is how LU ratified the OST, Liability Convention, and Registration Convention, and how LU acceded to the Moon Agreement.",
        complianceImplication:
          "Space operators relying on LU's treaty commitments (e.g. registration under the Registration Convention) are relying on obligations that required Chamber approval — robust and parliament-backed, not executive-only commitments.",
      },
      {
        section: "Art. 49bis",
        title: "Delegation of sovereign powers to international institutions",
        summary:
          "« L'exercice d'attributions réservées par la Constitution aux pouvoirs législatif, exécutif et judiciaire peut être temporairement dévolu par traité à des institutions de droit international. » Constitutional basis for LU's transfer of certain competences to ESA and the EU — relevant for ESA Convention commitments and EU space-related regulations (EU Space Act when enacted).",
      },
      {
        section: "Art. 32",
        title: "Executive power of the Grand Duke",
        summary:
          "Executive power is vested in the Grand Duke. Implementing regulations (règlements grand-ducaux, RGDs) under the Space Resources Act 2017 and Space Activities Act 2020 are issued under this executive authority — which is why implementing detail can be added administratively without reopening the primary statute.",
      },
      {
        section: "Chapter II (droits fondamentaux)",
        title: "Fundamental rights — post-2023 revision",
        summary:
          "The 2022-2023 revision package substantially expanded the fundamental-rights chapter, including environmental protection as a state objective (relevant for launch-site environmental assessments) and explicit protection of personal data (relevant for EO data processing alongside the GDPR framework).",
      },
    ],
    scope_description:
      "Luxembourg's constitutional framework for space-relevant state action: treaty ratification (Art. 37), delegation of competences to ESA/EU (Art. 49bis), and executive authority to issue implementing RGDs under the primary space statutes (Art. 32). The 1868 Constitution has been extensively revised — most recently via the four constitutional laws that entered into force 1 July 2023 — but has not been formally replaced.",
    related_sources: [
      "LU-SPACE-RESOURCES-2017",
      "LU-SPACE-ACTIVITIES-2020",
      "LU-OST-RATIFICA",
      "LU-LIABILITY-RATIFICA",
      "LU-REGISTRATION-RATIFICA",
    ],
    notes: [
      "Common misconception: the 2022-2023 changes are sometimes referred to as a « nouvelle Constitution de 2023 » — in formal terms they are revisions to the 1868 Constitution, not a replacement. The 1868 Constitution remains the numbered reference document.",
      "Unlike Germany (federal with express Länder competences to navigate) or the USA (federal with state laws), Luxembourg's unitary-state structure means constitutional competence for space is concentrated at the national level — there is no sub-national regulatory layer to reconcile.",
    ],
    last_verified: "2026-04-22",
  },
];

// ─── Aggregated Export ──────────────────────────────────────────────

export const LEGAL_SOURCES_LU: LegalSource[] = [
  ...TREATIES_LU,
  ...FOUNDATIONAL_LU,
  ...PRIMARY_LEGISLATION_LU,
  ...IMPLEMENTING_REGULATIONS_LU,
  ...TELECOM_LU,
  ...EXPORT_CONTROL_LU,
  ...CYBERSECURITY_LU,
  ...DATA_PROTECTION_LU,
  ...EU_LU,
  ...POLICY_LU,
  ...MILITARY_LU,
];
