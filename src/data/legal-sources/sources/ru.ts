// src/data/legal-sources/sources/ru.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Russian Federation — space-law sources and authorities.
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
      "Lead authority for Russian export controls including dual-use space items. Operates the export-control list under Federal Law No. 183-FZ on Export Controls (1999, amended).",
    legal_basis: "Federal Law No. 183-FZ of 18 July 1999 on Export Controls",
    applicable_areas: ["export_control"],
  },
];

export const LEGAL_SOURCES_RU: LegalSource[] = [
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
      "USSR was an original 1967 OST signatory and the Russian Federation continues that ratification. State-responsibility and registration obligations are discharged through the 1993 Space Activity Law and Roscosmos procedures. Russia is NOT a signatory to the Artemis Accords.",
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
];
