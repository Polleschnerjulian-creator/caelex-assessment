// src/data/legal-sources/sources/ru.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Russian Federation — space-law sources and authorities.
 *
 * 2026-05-26 expansion: corpus now covers Roscosmos State Corp structure,
 * sanctions / counter-sanctions framework (2022+), data localisation
 * (152-FZ), CII Security Law (187-FZ), FDI screening (57-FZ), Civil
 * Code Part IV (IP), Information Law (149-FZ), Crypto licensing, and
 * bilateral instruments (Baikonur lease, Soyuz IGAs, ILRS MOUs).
 *
 * Active sanctions context: Operators considering RU exposure must
 * overlay EU/UK/US/JP sanctions diligence on Russian-domestic licensing.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_RU: Authority[] = [
  {
    id: "RU-ROSCOSMOS",
    jurisdiction: "RU",
    name_en: "State Corporation for Space Activities — Roscosmos",
    name_local:
      "Государственная корпорация по космической деятельности «Роскосмос»",
    abbreviation: "Roscosmos",
    parent_ministry: "Government of the Russian Federation",
    website: "https://www.roscosmos.ru/",
    space_mandate:
      "State corporation since 2015 (replacing the prior federal agency). Operates as both regulator and principal operator: licensing of Russian space activities under Federal Law No. 5663-1 of 1993, manages launches from Baikonur and Plesetsk/Vostochny, and oversees the Russian segment of the ISS.",
    legal_basis:
      "Federal Law No. 215-FZ of 13 July 2015 on the State Corporation for Space Activities Roscosmos",
    applicable_areas: ["licensing", "registration", "liability", "insurance"],
  },
  {
    id: "RU-FSTEC",
    jurisdiction: "RU",
    name_en: "Federal Service for Technical and Export Control",
    name_local: "Федеральная служба по техническому и экспортному контролю",
    abbreviation: "FSTEC",
    parent_ministry: "Ministry of Defence",
    website: "https://fstec.ru/",
    space_mandate:
      "Lead authority for Russian export controls including dual-use space items. Operates the export-control list under Federal Law No. 183-FZ on Export Controls (1999, amended). Also a national lead on Critical Information Infrastructure protection (187-FZ).",
    legal_basis: "Federal Law No. 183-FZ of 18 July 1999 on Export Controls",
    applicable_areas: ["export_control", "critical_infrastructure"],
  },
  {
    id: "RU-FSB-CRYPTO",
    jurisdiction: "RU",
    name_en:
      "FSB Centre for Licensing, Certification and Protection of State Secrets",
    name_local: "ЦЛСЗ ФСБ России",
    abbreviation: "FSB-CLSZ",
    parent_ministry: "Federal Security Service (FSB)",
    website: "http://www.fsb.ru/",
    space_mandate:
      "Issues licences for use, development, and distribution of cryptographic means in the Russian Federation. Ground-segment encryption, satellite link-layer crypto, and satcom hardware sold in Russia require FSB notification or licensing depending on key length and intended use.",
    legal_basis:
      "Federal Law No. 99-FZ on Licensing; Government Decree No. 313",
    applicable_areas: ["cybersecurity", "export_control"],
  },
  {
    id: "RU-MOD",
    jurisdiction: "RU",
    name_en: "Russian Ministry of Defence — Aerospace Forces",
    name_local: "Министерство обороны Российской Федерации",
    abbreviation: "MoD-VKS",
    website: "https://function.mil.ru/",
    space_mandate:
      "Operates the Russian Aerospace Forces (VKS) including the Space Forces branch. Range authority for Plesetsk + military launches from Vostochny. Owns military satellite programmes (Kosmos series). Counterparty for foreign payload owners only via Roscosmos commercial-services arm.",
    legal_basis: "Federal Law No. 61-FZ on Defence; Presidential Decree on VKS",
    applicable_areas: ["military_dual_use"],
  },
  {
    id: "RU-MINCIFRY",
    jurisdiction: "RU",
    name_en: "Ministry of Digital Development, Communications and Mass Media",
    name_local:
      "Министерство цифрового развития, связи и массовых коммуникаций",
    abbreviation: "Mincifry",
    website: "https://digital.gov.ru/",
    space_mandate:
      "Frequency-spectrum administration. National authority for ITU coordination filings (in coordination with Roscosmos for satellite networks). Telecommunications licensing including VSAT and satcom subscriber services.",
    legal_basis: "Federal Law No. 126-FZ on Communications",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "RU-ROSKOMNADZOR",
    jurisdiction: "RU",
    name_en:
      "Federal Service for Supervision of Communications, IT and Mass Media",
    name_local:
      "Федеральная служба по надзору в сфере связи, информационных технологий и массовых коммуникаций",
    abbreviation: "Roskomnadzor",
    website: "https://rkn.gov.ru/",
    space_mandate:
      "Enforcement authority for telecommunications licensing, data-localisation under 152-FZ, and personal-data cross-border transfer review. Major satcom operators serving Russian subscribers must comply with Roskomnadzor data-localisation orders.",
    legal_basis: "Federal Law No. 152-FZ on Personal Data",
    applicable_areas: ["data_security"],
  },
  {
    id: "RU-FAS",
    jurisdiction: "RU",
    name_en: "Federal Antimonopoly Service",
    name_local: "Федеральная антимонопольная служба",
    abbreviation: "FAS",
    website: "https://fas.gov.ru/",
    space_mandate:
      "Antitrust + foreign-investment review authority. Reviews concentrations involving Russian space-industry entities. Under 57-FZ, foreign acquisitions of stakes ≥25% in Russian strategic-sector entities (including space) require Government Commission approval coordinated through FAS.",
    legal_basis:
      "Federal Law No. 135-FZ on Protection of Competition; 57-FZ FDI",
    applicable_areas: ["competition_antitrust", "fdi_screening"],
  },
];

export const LEGAL_SOURCES_RU: LegalSource[] = [
  // ─── Foundational ─────────────────────────────────────────────────────
  {
    id: "RU-OST-1967",
    jurisdiction: "RU",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Outer Space Treaty — USSR/Russian Federation Ratification (continuing)",
    date_enacted: "1967-10-10",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "USSR (1967) / Russian Federation (continuing State)",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "USSR was an original 1967 OST signatory and the Russian Federation continues that ratification. State-responsibility and registration obligations are discharged through the 1993 Space Activity Law and Roscosmos procedures. Russia is NOT a signatory to the Artemis Accords and instead leads (with China) the International Lunar Research Station (ILRS) framework.",
    key_provisions: [
      {
        section: "Art. VI / VII",
        title: "State responsibility and liability",
        summary:
          "Russia is internationally responsible and liable for damage caused by Russian-launched space objects — discharged via the 1993 Federal Law on Space Activity.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-22",
  },
  {
    id: "RU-SPACE-LAW-1993",
    jurisdiction: "RU",
    type: "federal_law",
    status: "in_force",
    title_en: "Federal Law on Space Activity",
    title_local: "Закон Российской Федерации «О космической деятельности»",
    date_enacted: "1993-08-20",
    date_last_amended: "2024-01-01",
    official_reference: "Law No. 5663-1 of 20 August 1993 (as amended)",
    source_url: "https://www.roscosmos.ru/22392/",
    issuing_body: "Supreme Soviet / State Duma (post-1993 amendments)",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability", "insurance"],
    scope_description:
      "Russia's primary space-activities statute. Establishes the licensing regime administered by Roscosmos, mandates third-party-liability insurance, sets out State indemnification, governs the national registry of space objects, and defines the legal status of space objects and personnel. Substantially amended over time but the 1993 architecture remains foundational.",
    key_provisions: [
      {
        section: "Art. 9-11",
        title: "Licensing of space activities",
        summary:
          "Roscosmos issues licences for the design, manufacture, testing, launch, and operation of space objects by Russian entities or from Russian territory. Licences carry safety, technical, and financial conditions.",
      },
      {
        section: "Art. 25-29",
        title: "Liability and insurance",
        summary:
          "Operator strict liability for surface damage; mandatory third-party-liability insurance; State indemnification framework for amounts above the operator-insurance ceiling.",
      },
      {
        section: "Art. 18",
        title: "Registry of space objects",
        summary:
          "Mandatory national registry of Russian-launched space objects, with notification to the UN Secretary-General as required by the Registration Convention.",
      },
    ],
    related_sources: ["RU-EXPORT-CONTROL-1999", "INT-OST-1967"],
    notes: [
      "Russia's space-law regime operates against an active sanctions backdrop: EU, UK, US, and Japanese sanctions since 2022 substantially restrict Russian counterparty transactions for space hardware, satcom services, and launch procurement. Operators considering RU exposure must overlay sanctions diligence on top of Russian-domestic licensing.",
    ],
    last_verified: "2026-04-22",
  },
  {
    id: "RU-ROSCOSMOS-CHARTER-2015",
    jurisdiction: "RU",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Federal Law on the State Corporation for Space Activities Roscosmos",
    title_local:
      "Федеральный закон «О Государственной корпорации по космической деятельности «Роскосмос»",
    date_enacted: "2015-07-13",
    official_reference: "Law No. 215-FZ of 13 July 2015",
    source_url: "https://www.roscosmos.ru/22390/",
    issuing_body: "State Duma",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "procurement"],
    scope_description:
      "Establishes Roscosmos as a State Corporation (госкорпорация) — combining regulatory authority with industrial-holding ownership of the major Russian space enterprises (RSC Energia, NPO Lavochkin, Khrunichev, etc.). Counsel for foreign clients must understand that Roscosmos negotiates commercial contracts AND issues licences — concentrated regulatory + commercial power in one entity.",
    key_provisions: [
      {
        section: "Art. 3-7",
        title: "Functions of the State Corporation",
        summary:
          "Roscosmos is empowered to license Russian space activities, conclude international cooperation agreements, manage federal space property, and act as the State purchaser for federal space-procurement budgets.",
      },
    ],
    related_sources: ["RU-SPACE-LAW-1993"],
    last_verified: "2026-05-26",
  },

  // ─── Export control + sanctions / counter-sanctions ──────────────────
  {
    id: "RU-EXPORT-CONTROL-1999",
    jurisdiction: "RU",
    type: "federal_law",
    status: "in_force",
    title_en: "Federal Law on Export Controls",
    title_local: "Федеральный закон «Об экспортном контроле»",
    date_enacted: "1999-07-18",
    date_last_amended: "2024-01-01",
    official_reference: "Law No. 183-FZ of 18 July 1999 (as amended)",
    source_url: "https://fstec.ru/dokumenty/zakony",
    issuing_body: "State Duma",
    competent_authorities: ["RU-FSTEC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "Russia's export-control statute administered by FSTEC. Captures dual-use and military space items, with a list architecture broadly aligned with the Wassenaar/MTCR regimes (notwithstanding Russia's withdrawal from select cooperation mechanisms).",
    key_provisions: [
      {
        section: "Art. 6",
        title: "Permit required for controlled items",
        summary:
          "Export of items on the Russian Control Lists requires an FSTEC permit; intangible technology transfers and brokering are explicitly captured.",
      },
    ],
    related_sources: ["RU-SPACE-LAW-1993"],
    last_verified: "2026-04-22",
  },
  {
    id: "RU-COUNTER-SANCTIONS-DECREES",
    jurisdiction: "RU",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Russian Counter-Sanctions Decrees (2022+)",
    title_local: "Указы Президента Российской Федерации об ответных санкциях",
    date_enacted: "2022-03-01",
    source_url: "http://www.kremlin.ru/acts/news",
    issuing_body: "Office of the President of the Russian Federation",
    competent_authorities: ["RU-FAS", "RU-FSTEC"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["sanctions_compliance", "tax_customs"],
    scope_description:
      "Cluster of Presidential decrees imposing Russian counter-sanctions on 'unfriendly' jurisdictions (EU, UK, US, JP, AU, CH and 40+ others). Restricts: USD/EUR conversion, foreign-investor exit transactions, IP licensing payments to unfriendly counterparties, satellite-services payments, and customs-classification of dual-use space hardware. Counsel for foreign space firms must overlay these RU counter-sanctions on top of their home-jurisdiction sanctions when assessing exposure.",
    key_provisions: [
      {
        section: "Decree 79 (2022) + Decree 95 (2022) + Decree 254 (2022)",
        title: "Foreign-investor exit + payments regime",
        summary:
          "Government Commission approval required for unfriendly-state investors selling Russian assets; payments to unfriendly counterparties may be made into Type-C accounts (frozen).",
      },
    ],
    related_sources: ["RU-FOREIGN-INVESTMENT-57-FZ"],
    last_verified: "2026-05-26",
  },

  // ─── Critical info infra + cyber ─────────────────────────────────────
  {
    id: "RU-CII-SECURITY-187-FZ",
    jurisdiction: "RU",
    type: "federal_law",
    status: "in_force",
    title_en: "Federal Law on Security of Critical Information Infrastructure",
    title_local:
      "Федеральный закон «О безопасности критической информационной инфраструктуры Российской Федерации»",
    date_enacted: "2017-07-26",
    date_in_force: "2018-01-01",
    official_reference: "Law No. 187-FZ of 26 July 2017",
    source_url:
      "http://publication.pravo.gov.ru/Document/View/0001201707260023",
    issuing_body: "State Duma",
    competent_authorities: ["RU-FSTEC", "RU-FSB-CRYPTO"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: [
      "cybersecurity",
      "critical_infrastructure",
      "data_security",
    ],
    scope_description:
      "Critical Information Infrastructure (CII) regime. Russian satcom operators serving the State + major ground-stations + space-data infrastructure are designated CII subjects. CII subjects must: (a) categorise their objects under FSTEC methodology, (b) connect to GosSOPKA national incident-response, (c) report incidents within strict deadlines, (d) use Russian-cryptography means certified by FSB.",
    key_provisions: [
      {
        section: "Art. 9, 10, 12",
        title: "Categorisation + GosSOPKA connection",
        summary:
          "CII subjects categorise objects into Categories 1-3 + uncategorised. Categories 1+2 must connect to GosSOPKA (FSB-run national incident-response).",
      },
    ],
    related_sources: ["RU-INFORMATION-LAW-149-FZ"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-INFORMATION-LAW-149-FZ",
    jurisdiction: "RU",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Federal Law on Information, Information Technologies and Information Protection",
    title_local:
      "Федеральный закон «Об информации, информационных технологиях и о защите информации»",
    date_enacted: "2006-07-27",
    date_last_amended: "2024-01-01",
    official_reference: "Law No. 149-FZ of 27 July 2006",
    source_url:
      "http://publication.pravo.gov.ru/Document/View/0001200607310003",
    issuing_body: "State Duma",
    competent_authorities: ["RU-ROSKOMNADZOR"],
    relevance_level: "high",
    applicable_to: ["data_provider", "ground_segment", "satellite_operator"],
    compliance_areas: ["data_security", "media_broadcasting"],
    scope_description:
      "Master information-protection statute. Cross-references the 152-FZ data-protection regime, the 187-FZ CII regime, and the foreign-software-restriction regime. Used as the basis for Roskomnadzor blocking orders on foreign satcom services (e.g. blocking specific satellite-internet endpoints).",
    key_provisions: [],
    related_sources: ["RU-DATA-LOCAL-152-FZ", "RU-CII-SECURITY-187-FZ"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-DATA-LOCAL-152-FZ",
    jurisdiction: "RU",
    type: "federal_law",
    status: "in_force",
    title_en: "Federal Law on Personal Data",
    title_local: "Федеральный закон «О персональных данных»",
    date_enacted: "2006-07-27",
    date_last_amended: "2024-07-08",
    official_reference: "Law No. 152-FZ of 27 July 2006",
    source_url:
      "http://publication.pravo.gov.ru/Document/View/0001200607310038",
    issuing_body: "State Duma",
    competent_authorities: ["RU-ROSKOMNADZOR"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment", "data_provider"],
    compliance_areas: ["data_security"],
    scope_description:
      "Russian personal-data regime including the data-localisation requirement (Art. 18 cl. 5): personal data of Russian citizens collected via the internet must be initially stored in databases located in Russia. Satellite-internet subscriber services serving Russian users were Roskomnadzor-targeted multiple times for non-compliance.",
    key_provisions: [
      {
        section: "Art. 18(5)",
        title: "Data localisation",
        summary:
          "Personal data of Russian citizens must be initially collected, recorded, systematised, accumulated, stored, clarified and extracted using databases physically located in the Russian Federation.",
      },
    ],
    related_sources: ["RU-INFORMATION-LAW-149-FZ"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-CRYPTO-LICENSING-313",
    jurisdiction: "RU",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Government Decree No. 313 on Cryptographic Means Licensing",
    title_local:
      "Постановление Правительства РФ № 313 о лицензировании криптографических средств",
    date_enacted: "2012-04-16",
    official_reference: "Government Decree No. 313 of 16 April 2012",
    source_url: "http://government.ru/docs/all/82079/",
    issuing_body: "Government of the Russian Federation",
    competent_authorities: ["RU-FSB-CRYPTO"],
    relevance_level: "medium",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["cybersecurity", "export_control"],
    scope_description:
      "FSB licensing regime for cryptographic means. Imported satcom hardware containing cryptographic functionality requires FSB notification (for low-strength) or licensing (for strong-crypto, > 56-bit symmetric or > 512-bit asymmetric).",
    key_provisions: [],
    related_sources: ["RU-CII-SECURITY-187-FZ"],
    last_verified: "2026-05-26",
  },

  // ─── FDI screening ───────────────────────────────────────────────────
  {
    id: "RU-FOREIGN-INVESTMENT-57-FZ",
    jurisdiction: "RU",
    type: "federal_law",
    status: "in_force",
    title_en: "Federal Law on Foreign Investment in Strategic Sectors",
    title_local:
      "Федеральный закон «О порядке осуществления иностранных инвестиций в хозяйственные общества, имеющие стратегическое значение для обеспечения обороны страны и безопасности государства»",
    date_enacted: "2008-04-29",
    date_last_amended: "2023-12-01",
    official_reference: "Law No. 57-FZ of 29 April 2008",
    source_url:
      "http://publication.pravo.gov.ru/Document/View/0001200804300006",
    issuing_body: "State Duma",
    competent_authorities: ["RU-FAS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["fdi_screening"],
    scope_description:
      "FDI screening law identifying 'strategic sectors' (Art. 6) — includes space activities + dual-use technology + critical info infrastructure. Foreign investor acquiring >25% (>50% for non-state foreign investors) of a strategic-sector Russian entity requires prior approval of the Government Commission chaired by the Prime Minister. The 2022+ counter-sanctions regime layered additional restrictions on top of this.",
    key_provisions: [
      {
        section: "Art. 6, 7",
        title: "Strategic-sector list + thresholds",
        summary:
          "Space activities listed as strategic-sector. >25% foreign stake (or >50% for non-state foreign investors) requires Government Commission approval. Time-line: up to 6 months from filing.",
      },
    ],
    related_sources: ["RU-COUNTER-SANCTIONS-DECREES"],
    last_verified: "2026-05-26",
  },

  // ─── Civil Code ──────────────────────────────────────────────────────
  {
    id: "RU-CIVIL-CODE-IV",
    jurisdiction: "RU",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Civil Code of the Russian Federation — Part IV (Intellectual Property)",
    title_local: "Гражданский кодекс Российской Федерации (Часть четвёртая)",
    date_enacted: "2006-12-18",
    date_in_force: "2008-01-01",
    date_last_amended: "2024-01-01",
    official_reference: "Law No. 230-FZ of 18 December 2006",
    source_url:
      "http://publication.pravo.gov.ru/Document/View/0001200612220004",
    issuing_body: "State Duma",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["ip_patents", "liability"],
    scope_description:
      "Russian IP regime including patent rights, know-how + trade secrets, software copyright. Russian-developed space hardware IP routinely the subject of joint-venture or technology-transfer arrangements; counsel for foreign partners must navigate the 2022+ counter-sanctions regime restricting royalty payments to 'unfriendly' rights-holders.",
    key_provisions: [],
    related_sources: ["RU-COUNTER-SANCTIONS-DECREES"],
    last_verified: "2026-05-26",
  },

  // ─── Aerospace doctrine + military ───────────────────────────────────
  {
    id: "RU-MILITARY-DOCTRINE-2014",
    jurisdiction: "RU",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Military Doctrine of the Russian Federation",
    title_local: "Военная доктрина Российской Федерации",
    date_published: "2014-12-25",
    source_url: "http://kremlin.ru/events/president/news/47334",
    issuing_body: "President of the Russian Federation",
    competent_authorities: ["RU-MOD"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "fdi_screening"],
    scope_description:
      "Russian military doctrine. Contains a space chapter naming outer-space dominance among military priorities. Cited by Western FDI / sanctions / export-control authorities as evidence of dual-use intent for Russian space programmes. Updated 2024 version not yet officially published.",
    key_provisions: [],
    related_sources: ["RU-AEROSPACE-DOCTRINE"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-AEROSPACE-DOCTRINE",
    jurisdiction: "RU",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Russian Aerospace Forces Operational Doctrine",
    title_local: "Концепция строительства и развития Воздушно-космических сил",
    date_published: "2015-08-01",
    source_url: "https://function.mil.ru/",
    issuing_body: "Ministry of Defence",
    competent_authorities: ["RU-MOD"],
    relevance_level: "medium",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use"],
    scope_description:
      "Establishes the Russian Aerospace Forces (VKS) combining Air Force + Space Forces + Aerospace Defence. Cited together with the 2014 Military Doctrine in CFIUS / EU 2019/452 screening of Russian space-tech acquisitions.",
    key_provisions: [],
    related_sources: ["RU-MILITARY-DOCTRINE-2014"],
    last_verified: "2026-05-26",
  },

  // ─── Bilateral / launch sites ────────────────────────────────────────
  {
    id: "RU-BAIKONUR-LEASE",
    jurisdiction: "RU",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "Russia-Kazakhstan Baikonur Cosmodrome Lease Agreement",
    title_local:
      "Договор аренды комплекса «Байконур» между Российской Федерацией и Республикой Казахстан",
    date_enacted: "1994-03-28",
    date_last_amended: "2004-01-09",
    source_url: "http://government.ru/docs/all/55748/",
    issuing_body: "Governments of Russia + Kazakhstan",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "high",
    applicable_to: ["launch_provider"],
    compliance_areas: ["liability", "environmental"],
    scope_description:
      "Russia leases the Baikonur Cosmodrome from Kazakhstan through 2050 (extended 2004). Counterparty risk: under the 2014+ political tensions and 2022+ sanctions, the lease has been under strain. Foreign payload owners launching from Baikonur via Roscosmos commercial-services inherit this bilateral framework.",
    key_provisions: [
      {
        section: "Lease Articles 1, 5, 7",
        title: "Term + jurisdiction",
        summary:
          "50-year lease (1994-2044, extended to 2050). Russian-jurisdictional authority over operations; Kazakh state retains residual environmental + safety oversight.",
      },
    ],
    related_sources: ["RU-VOSTOCHNY-COSMODROME"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-VOSTOCHNY-COSMODROME",
    jurisdiction: "RU",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Vostochny Cosmodrome Operational Framework",
    title_local: "Космодром Восточный — нормативно-правовая база",
    date_enacted: "2015-04-01",
    source_url: "https://www.roscosmos.ru/26242/",
    issuing_body: "Roscosmos",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["licensing", "environmental"],
    scope_description:
      "Vostochny — Russia's sovereign-territory cosmodrome (Amur Oblast), designed as the post-Baikonur strategic launch base. First Soyuz launch 2016. Operational rules co-issued by Roscosmos + MoD-VKS. Foreign payload partnerships at Vostochny are subject to the same Roscosmos licensing + counter-sanctions regime as Baikonur operations.",
    key_provisions: [],
    related_sources: ["RU-BAIKONUR-LEASE"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-FR-SOYUZ-IGA",
    jurisdiction: "RU",
    type: "bilateral_agreement",
    status: "in_force",
    title_en: "France-Russia Soyuz at the Guiana Space Centre IGA",
    title_local:
      "Межправительственное соглашение Россия–Франция о запусках «Союз» в Куру",
    date_enacted: "2003-11-07",
    source_url: "https://treaties.un.org/",
    issuing_body: "Governments of France + Russian Federation",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "medium",
    applicable_to: ["launch_provider"],
    compliance_areas: ["liability"],
    scope_description:
      "Bilateral IGA permitting Soyuz launches from the Guiana Space Centre (Kourou) from 2011. Suspended in March 2022 following the Russian invasion of Ukraine — Soyuz operations at Kourou are no longer commercially active. Retained in the corpus as historical reference for IGA structure + as a contingent-revival case study.",
    key_provisions: [],
    related_sources: ["RU-EU-SOYUZ-IGA"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-EU-SOYUZ-IGA",
    jurisdiction: "RU",
    type: "bilateral_agreement",
    status: "superseded",
    title_en: "Russia-EU Soyuz Cooperation Framework",
    title_local: "Сотрудничество Россия–ЕС по запускам «Союз»",
    date_enacted: "2009-11-12",
    source_url: "https://www.esa.int/About_Us/Corporate_news",
    issuing_body: "Roscosmos + European Space Agency",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "low",
    applicable_to: ["launch_provider"],
    compliance_areas: ["procurement"],
    scope_description:
      "Roscosmos-ESA Soyuz cooperation framework (including OneWeb-related launches). Frozen indefinitely March 2022. ESA has since pivoted to Ariane 6 + commercial-provider alternatives.",
    key_provisions: [],
    related_sources: ["RU-FR-SOYUZ-IGA"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-CN-LUNAR-COOP-2021",
    jurisdiction: "RU",
    type: "bilateral_agreement",
    status: "in_force",
    title_en:
      "Russia-China Joint Declaration on the International Lunar Research Station (ILRS)",
    title_local:
      "Совместное заявление Россия–Китай о Международной научной лунной станции",
    date_enacted: "2021-06-16",
    source_url: "https://www.roscosmos.ru/31206/",
    issuing_body: "Roscosmos + China National Space Administration",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Foundational ILRS instrument — Russia-China lead the framework, parallel + competing with the US-led Artemis Accords. Subsequent bilateral MOUs (CN-ZA, CN-PK, CN-VE) all derive from this declaration.",
    key_provisions: [
      {
        section: "Joint Declaration § II",
        title: "Open framework for partners",
        summary:
          "ILRS open to new partners that sign bilateral MOUs with both Russia + China.",
      },
    ],
    related_sources: ["CN-LUNAR-COOP-MOUS", "INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-05-26",
  },
  {
    id: "RU-EAEU-CUSTOMS-SPACE",
    jurisdiction: "RU",
    type: "multilateral_agreement",
    status: "in_force",
    title_en: "EAEU Customs Code — Space Hardware Classifications",
    title_local: "Таможенный кодекс ЕАЭС — классификация космической техники",
    date_enacted: "2017-12-26",
    source_url: "https://www.alta.ru/tamdoc/17000074/",
    issuing_body: "Eurasian Economic Union Council",
    competent_authorities: ["RU-FAS"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["tax_customs", "export_control"],
    scope_description:
      "EAEU (Russia, Belarus, Kazakhstan, Armenia, Kyrgyzstan) unified customs code. Establishes TN VED (EAEU tariff codes) for space hardware including launch vehicles, satellites, ground-station equipment, and dual-use space items. Counsel for cross-border space-hardware transactions touching EAEU jurisdictions must verify EAEU-customs classification + applicable duty rates.",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── ASAT capability + recent incidents ──────────────────────────────
  {
    id: "RU-NUDOL-ASAT-DOCTRINE",
    jurisdiction: "RU",
    type: "national_security_doctrine",
    status: "in_force",
    title_en: "Russian Direct-Ascent ASAT Capability (Nudol / PL-19)",
    title_local: "Российское противоспутниковое оружие — система «Нудоль»",
    date_published: "2021-11-15",
    source_url: "https://function.mil.ru/news_page",
    issuing_body: "Ministry of Defence",
    competent_authorities: ["RU-MOD"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["military_dual_use", "debris_mitigation"],
    scope_description:
      "Russian direct-ascent ASAT system. 15 November 2021 Nudol test destroyed Kosmos-1408 satellite — produced 1,500+ catalogued debris pieces threatening ISS + other LEO assets. Cited in the 2022 UN moratorium proposal on destructive ASAT testing (sponsored by US, supported by 36+ states; Russia + China voted against).",
    key_provisions: [],
    related_sources: [],
    last_verified: "2026-05-26",
  },

  // ─── Procurement ──────────────────────────────────────────────────────
  {
    id: "RU-ROSCOSMOS-PROCUREMENT",
    jurisdiction: "RU",
    type: "procurement_framework",
    status: "in_force",
    title_en: "Roscosmos Federal Procurement Framework",
    title_local: "Закупочная деятельность Госкорпорации «Роскосмос»",
    date_enacted: "2015-07-13",
    source_url: "https://zakupki.gov.ru/",
    issuing_body: "Roscosmos",
    competent_authorities: ["RU-ROSCOSMOS"],
    relevance_level: "low",
    applicable_to: ["all"],
    compliance_areas: ["procurement"],
    scope_description:
      "Roscosmos operates under Federal Law No. 223-FZ on Procurement (state-owned-entity regime) — distinct from the stricter 44-FZ federal-budget regime. Subcontractor selection + tender procedures published on zakupki.gov.ru. Counter-sanctions regime restricts foreign-supplier participation since 2022.",
    key_provisions: [],
    related_sources: ["RU-ROSCOSMOS-CHARTER-2015"],
    last_verified: "2026-05-26",
  },
];
