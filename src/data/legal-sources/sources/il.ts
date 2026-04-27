// src/data/legal-sources/sources/il.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Israel — space-law sources and authorities.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

export const AUTHORITIES_IL: Authority[] = [
  {
    id: "IL-ISA",
    jurisdiction: "IL",
    name_en: "Israel Space Agency",
    name_local: "סוכנות החלל הישראלית",
    abbreviation: "ISA",
    parent_ministry: "Ministry of Innovation, Science and Technology",
    website: "https://most.gov.il/en/units/Israel-Space-Agency",
    space_mandate:
      "Civil-space agency since 1983, coordinator of Israeli space-research and international cooperation. Not a full regulator: the principal licensing authority for export and dual-use control sits in the Ministry of Defense's DECA, and frequency licensing in the Ministry of Communications.",
    legal_basis: "Cabinet Resolution 1989; ISA Law 2024 (under consultation)",
    applicable_areas: ["licensing"],
  },
  {
    id: "IL-DECA",
    jurisdiction: "IL",
    name_en: "Defence Export Controls Agency",
    name_local: "אגף הפיקוח על היצוא הביטחוני",
    abbreviation: "DECA",
    parent_ministry: "Ministry of Defense",
    website: "https://www.gov.il/en/departments/units/defense_export_control",
    space_mandate:
      "Lead authority for Israeli defence and dual-use export licensing under the Defense Export Control Law 2007. Captures most space-launch and many spacecraft items. Tightly controlled — Israeli space hardware is largely defence-classified.",
    legal_basis: "Defense Export Control Law, 5767-2007",
    applicable_areas: ["export_control"],
  },
  {
    id: "IL-MOC",
    jurisdiction: "IL",
    name_en: "Ministry of Communications",
    name_local: "משרד התקשורת",
    abbreviation: "MOC",
    website: "https://www.gov.il/en/departments/ministry_of_communications",
    space_mandate:
      "Frequency-licensing authority and Israel's representative to the ITU. Licenses Israeli satellite earth stations and operators of Israeli satellite spectrum.",
    legal_basis:
      "Communications Law (Telecommunications and Broadcasting), 5742-1982",
    applicable_areas: ["frequency_spectrum"],
  },
];

export const LEGAL_SOURCES_IL: LegalSource[] = [
  {
    id: "IL-DEC-LAW-2007",
    jurisdiction: "IL",
    type: "federal_law",
    status: "in_force",
    title_en: "Defense Export Control Law, 5767-2007",
    title_local: 'חוק הפיקוח על יצוא ביטחוני, התשס"ז-2007',
    date_enacted: "2007-12-26",
    official_reference: "Sefer HaChukim 5767, Law No. 2113",
    source_url: "https://www.nevo.co.il/law_html/law01/999_517.htm",
    issuing_body: "Knesset",
    competent_authorities: ["IL-DECA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["export_control"],
    scope_description:
      "Primary statute regulating Israeli defence and dual-use exports — captures launch vehicles, missile-capable propulsion, satellite technology, and many spacecraft components. Operating without a DECA permit for items on the Defense Export Control List or Dual-Use Export Control List is a criminal offence with strict-liability provisions.",
    key_provisions: [
      {
        section: "§ 7-9",
        title: "Permit required for controlled exports",
        summary:
          "Tangible and intangible exports of items on the Defense or Dual-Use lists require a DECA permit. Brokering, technology transfers, and intangible assistance are explicitly captured.",
      },
      {
        section: "§ 17-22",
        title: "End-user assurances",
        summary:
          "Permits include end-user, end-use, and re-export conditions; DECA enforces ongoing compliance with audits and post-shipment checks.",
      },
    ],
    related_sources: ["INT-OST-1967"],
    last_verified: "2026-04-22",
  },
  {
    id: "IL-COMMS-LAW-1982",
    jurisdiction: "IL",
    type: "federal_law",
    status: "in_force",
    title_en:
      "Communications Law (Telecommunications and Broadcasting), 5742-1982",
    title_local: 'חוק התקשורת (בזק ושידורים), התשמ"ב-1982',
    date_enacted: "1982-07-14",
    official_reference: "Sefer HaChukim 5742, Law No. 1060",
    source_url: "https://www.nevo.co.il/law_html/law01/p189m1_001.htm",
    issuing_body: "Knesset",
    competent_authorities: ["IL-MOC"],
    relevance_level: "high",
    applicable_to: [
      "satellite_operator",
      "constellation_operator",
      "ground_segment",
    ],
    compliance_areas: ["frequency_spectrum"],
    scope_description:
      "Governs every Israeli telecommunications service including satellite communications. Operators of Israeli satellite spectrum, earth stations, and satellite-broadcasting services require Ministry of Communications licences. The Israeli filing point for ITU coordination.",
    key_provisions: [
      {
        section: "§ 4-6",
        title: "Telecommunications licences",
        summary:
          "Operating telecommunications infrastructure or services without a Ministry licence is prohibited; satellite networks providing Israeli or Israel-bound services fall within this regime.",
      },
    ],
    related_sources: [],
    last_verified: "2026-04-22",
  },
  {
    id: "IL-OST-1977",
    jurisdiction: "IL",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Israeli Ratification",
    date_enacted: "1977-02-18",
    source_url: "https://treaties.unoda.org/t/outer_space",
    issuing_body: "Government of Israel",
    competent_authorities: ["IL-ISA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["liability", "registration"],
    scope_description:
      "Israel's ratification of the OST. Without a comprehensive Israeli space-activities statute, the Art. VI authorisation obligation is discharged via Cabinet decisions, ISA coordination, and the Defense Export Control Law for hardware-related controls. Israel signed the Artemis Accords in 2022.",
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility and authorisation",
        summary:
          "Israel is internationally responsible for national space activities — currently discharged through inter-ministerial coordination rather than a single statute, pending the proposed Israel Space Activities Law.",
      },
    ],
    related_sources: ["INT-OST-1967", "INT-ARTEMIS-ACCORDS-2020"],
    last_verified: "2026-04-22",
  },
];
