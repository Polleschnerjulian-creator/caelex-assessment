// src/data/legal-sources/sources/hu.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Hungary space law sources — complete legal framework for jurisdiction HU.
 *
 * Sources: kormany.hu, nmhh.hu, kekkh.gov.hu, njt.hu, esa.int
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act. Hungary became a full ESA
 * Member State on 24 February 2015. The Hungarian Space Office (Űrügyi
 * Főosztály) operates within the Ministry of Foreign Affairs and Trade
 * (KKM) and coordinates national space policy, ESA participation, and
 * COPUOS representation. Hungary has historical space heritage — Bertalan
 * Farkas became the first Hungarian cosmonaut in 1980 (Soyuz-36 /
 * Salyut-6), and more recently Tibor Kapu flew to the ISS in 2025 (HUNOR
 * programme, Axiom Mission 4). Regulatory framework layered from
 * (i) EU instruments applied directly, (ii) sectoral Hungarian law —
 * Electronic Communications Act, Defence Industry Production Act,
 * Cybersecurity Act — and (iii) government decrees on ESA coordination.
 *
 * Coverage status: PRELIMINARY. Treaty accession dates require UNOOSA
 * depositary verification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── HU Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_HU: Authority[] = [
  {
    id: "HU-HSO",
    jurisdiction: "HU",
    name_en: "Hungarian Space Office",
    name_local: "Űrügyi Főosztály",
    abbreviation: "HSO",
    website: "https://kormany.hu",
    space_mandate:
      "Primary coordinator of Hungarian space activities. Operates within the Ministry of Foreign Affairs and Trade (KKM) as Űrügyi Főosztály (Space Affairs Department). Serves as the ESA delegation authority, coordinates COPUOS representation, oversees the HUNOR astronaut programme, and manages the national space industry strategy. Represents Hungary at the EU Space Programme Committee.",
    parent_ministry: "Ministry of Foreign Affairs and Trade (KKM)",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "HU-NMHH",
    jurisdiction: "HU",
    name_en: "National Media and Infocommunications Authority",
    name_local: "Nemzeti Média- és Hírközlési Hatóság",
    abbreviation: "NMHH",
    website: "https://nmhh.hu",
    space_mandate:
      "National regulatory authority for electronic communications under Act C of 2003 (as amended). Issues individual authorisations for satellite earth stations and satellite uplink services. Manages Hungarian radio spectrum, coordinates ITU satellite filings and orbital slot notifications on behalf of the Hungarian administration.",
    legal_basis: "2003. évi C. törvény az elektronikus hírközlésről",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "HU-KKM",
    jurisdiction: "HU",
    name_en: "Ministry of Foreign Affairs and Trade",
    name_local: "Külgazdasági és Külügyminisztérium",
    abbreviation: "KKM",
    website: "https://kormany.hu/kulgazdasagi-es-kulugyminiszterium",
    space_mandate:
      "Host ministry for the Hungarian Space Office. Handles international space treaty matters, COPUOS representation, and treaty deposit coordination. Signed the Artemis Accords on 18 December 2024 as the 53rd signatory.",
    applicable_areas: ["licensing"],
  },
  {
    id: "HU-SZTNH",
    jurisdiction: "HU",
    name_en:
      "Hungarian Intellectual Property Office — Trade Control Department",
    name_local:
      "Szellemi Tulajdon Nemzeti Hivatala — Kereskedelem-ellenőrzési Osztály",
    abbreviation: "KVI",
    website: "https://kereskedelmiengedely.hu",
    space_mandate:
      "Export control authority for dual-use items under Act CLVII of 2011 implementing EU Regulation 2021/821 (formerly administered by the Hungarian Trade Licensing Office / MKEH, consolidated with SZTNH in 2016). Issues export licences for Category 9 (Aerospace/Propulsion) items. Hungary is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
    legal_basis: "2011. évi CLVII. törvény",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "HU-SZTFH",
    jurisdiction: "HU",
    name_en: "Supervisory Authority for Regulatory Affairs",
    name_local: "Szabályozott Tevékenységek Felügyeleti Hatósága",
    abbreviation: "SZTFH",
    website: "https://sztfh.hu",
    space_mandate:
      "NIS2 national competent authority for Hungary under Act XXIII of 2023 (Cybersecurity Certification and Supervision Act). Supervises essential and important entities, including space-sector operators whose services qualify under NIS2 Annex I. Operates the national cybersecurity incident coordination function.",
    legal_basis: "2023. évi XXIII. törvény",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "HU-NAIH",
    jurisdiction: "HU",
    name_en:
      "National Authority for Data Protection and Freedom of Information",
    name_local: "Nemzeti Adatvédelmi és Információszabadság Hatóság",
    abbreviation: "NAIH",
    website: "https://naih.hu",
    space_mandate:
      "GDPR enforcement for Earth observation imagery, satellite-derived data products, and space-based telecommunications services. Relevant for high-resolution EO where personal data implications arise under GDPR Art. 4(1).",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────

const TREATIES_HU: LegalSource[] = [
  {
    id: "HU-OST",
    jurisdiction: "HU",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Hungarian Ratification",
    title_local:
      "A világűr szerződés — a világűr kutatása és használata terén folytatott tevékenységet szabályozó elvekről",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["HU-KKM", "HU-HSO"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Hungary bears international responsibility for national space activities. However, NO domestic authorization regime exists — Hungary has no dedicated national space law. Regulatory framework relies on (i) EU instruments, (ii) sectoral Hungarian law (telecoms, export control, cybersecurity), and (iii) government decrees coordinating ESA participation via the Hungarian Space Office.",
        complianceImplication:
          "Hungarian operators must navigate multiple sectoral regulators: NMHH for spectrum, SZTFH for cybersecurity, SZTNH for export control. HSO provides policy coordination but no direct licensing authority.",
      },
    ],
    related_sources: ["HU-LIABILITY"],
    notes: [
      "Hungary ratified the Outer Space Treaty during the Hungarian People's Republic era (pre-1989).",
      "Specific ratification date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "HU-LIABILITY",
    jurisdiction: "HU",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Hungarian Ratification",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["HU-KKM"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Hungary is absolutely liable for surface damage caused by Hungarian space objects. No dedicated space liability or insurance framework exists under Hungarian law. Civil Code general dangerous-operation strict liability may apply. NO mandatory insurance, NO recourse cap, NO government backstop for private operators.",
      },
    ],
    related_sources: ["HU-OST"],
    notes: [
      "Specific ratification date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (3) ──────────────────

const SECTORAL_HU: LegalSource[] = [
  {
    id: "HU-ECA-2003",
    jurisdiction: "HU",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act",
    title_local: "2003. évi C. törvény az elektronikus hírközlésről",
    date_enacted: "2003-11-18",
    date_in_force: "2004-01-01",
    official_reference: "2003. évi C. törvény",
    source_url: "https://njt.hu/jogszabaly/2003-100-00-00",
    issuing_body: "Országgyűlés",
    competent_authorities: ["HU-NMHH"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Chapters X–XI",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. NMHH is the issuing authority and manages Hungary's position in ITU filings and orbital slot coordination. Amended multiple times to align with successive EU electronic communications directives.",
      },
    ],
    related_sources: ["HU-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "HU-EXPORT-2011",
    jurisdiction: "HU",
    type: "federal_law",
    status: "in_force",
    title_en: "Export Control Act (Dual-Use Goods)",
    title_local:
      "2011. évi CLVII. törvény a kettős felhasználású termékek külkereskedelmi forgalmának engedélyezéséről",
    date_enacted: "2011-12-19",
    official_reference: "2011. évi CLVII. törvény",
    source_url: "https://njt.hu/jogszabaly/2011-157-00-00",
    issuing_body: "Országgyűlés",
    competent_authorities: ["HU-SZTNH"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Export control for dual-use space technology",
        summary:
          "Implements EU Regulation 2021/821. SZTNH Trade Control Department (KVI) issues export licences for Category 9 (Aerospace/Propulsion) items. Hungary is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
      },
    ],
    related_sources: ["HU-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "HU-CYBERSEC-2023",
    jurisdiction: "HU",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Certification and Supervision Act (NIS2)",
    title_local:
      "2023. évi XXIII. törvény a kiberbiztonsági tanúsításról és a kiberbiztonsági felügyeletről",
    date_enacted: "2023-05-10",
    date_in_force: "2023-06-24",
    official_reference: "2023. évi XXIII. törvény",
    source_url: "https://njt.hu/jogszabaly/2023-23-00-00",
    issuing_body: "Országgyűlés",
    competent_authorities: ["HU-SZTFH"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space sector as high-criticality",
        summary:
          "Transposes NIS2 Directive (EU 2022/2555). SZTFH (Supervisory Authority for Regulatory Affairs) is the national competent authority. Space sector classified as high-criticality under Annex I.",
      },
    ],
    related_sources: ["HU-OST"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / Strategy (2) ─────────────────────

const POLICY_HU: LegalSource[] = [
  {
    id: "HU-ESA-2015",
    jurisdiction: "HU",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA Convention — Hungarian Full Membership",
    title_local: "ESA Egyezmény — Magyarország csatlakozása",
    date_enacted: "2015-02-24",
    date_in_force: "2015-02-24",
    source_url: "https://www.esa.int/About_Us/Corporate_news/Hungary_joins_ESA",
    issuing_body: "European Space Agency",
    competent_authorities: ["HU-HSO", "HU-KKM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA full membership",
        summary:
          "Hungary became the 22nd full member state of the European Space Agency on 24 February 2015. ESA membership anchors Hungarian industrial participation in ESA industry contracts. HSO (within KKM) is the national delegation authority.",
      },
    ],
    related_sources: ["HU-OST"],
    notes: [
      "ESA European Cooperating State since 2003, full member since 24 February 2015.",
      "HUNOR astronaut programme announced 2022; Tibor Kapu flew Axiom Mission 4 to ISS in 2025.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "HU-ARTEMIS-2024",
    jurisdiction: "HU",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Hungarian Signatory (2024)",
    date_enacted: "2024-12-18",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["HU-KKM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Hungary signed the Artemis Accords on 18 December 2024 as the 53rd signatory, signalling alignment with the NASA-led principles on peaceful use of outer space and interoperability for lunar exploration.",
      },
    ],
    related_sources: ["HU-OST"],
    notes: ["53rd signatory, 18 December 2024."],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_HU: LegalSource[] = [
  ...TREATIES_HU,
  ...SECTORAL_HU,
  ...POLICY_HU,
];
