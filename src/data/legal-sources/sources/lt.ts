// src/data/legal-sources/sources/lt.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Lithuania space law sources — complete legal framework for jurisdiction LT.
 *
 * Sources: eimin.lt, rrt.lt, nksc.lt, vdai.lrv.lt, e-tar.lt, esa.int
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act. Lithuania signed the ESA
 * European Cooperating State Agreement on 7 October 2014 (PECS 2015)
 * and became an ESA Associate Member on 21 May 2021. The Ministry of
 * Economy and Innovation (EIM) is the ESA delegation ministry and
 * houses the Space Affairs Division. Lithuania is a global hub for
 * nanosatellites: NanoAvionics (nanosat integrator, acquired by
 * Kongsberg NanoAvionics in 2022) leads Europe's small-satellite
 * bus market. Other active companies: Astrolight (laser comms),
 * Blackswan Space (RPO and on-orbit servicing), Kongsberg NanoAvionics,
 * Brolis Semiconductors. Regulatory framework layered from
 * (i) EU instruments applied directly, (ii) sectoral Lithuanian law —
 * Electronic Communications Law, Export Control Law, Cybersecurity
 * Law — and (iii) ESA programme agreements coordinated via EIM.
 *
 * Coverage status: PRELIMINARY. Treaty accession dates require UNOOSA
 * depositary verification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── LT Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_LT: Authority[] = [
  {
    id: "LT-EIM",
    jurisdiction: "LT",
    name_en: "Ministry of Economy and Innovation — Space Affairs Division",
    name_local: "Ekonomikos ir inovacijų ministerija — Kosmoso reikalų skyrius",
    abbreviation: "EIM",
    website: "https://eimin.lrv.lt",
    space_mandate:
      "ESA delegation ministry and primary coordinator of Lithuanian space activities. The Space Affairs Division manages Lithuania's ESA contribution (~€1.5M/year), approves industrial participation strategy, and coordinates the national space policy. Represents Lithuania at the EU Space Programme Committee. Supports the Lithuanian Space Association (Kosmoso asociacija).",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "LT-RRT",
    jurisdiction: "LT",
    name_en: "Communications Regulatory Authority",
    name_local: "Ryšių reguliavimo tarnyba",
    abbreviation: "RRT",
    website: "https://rrt.lt",
    space_mandate:
      "National regulatory authority for electronic communications under the Law on Electronic Communications (Elektroninių ryšių įstatymas, 2004, as amended). Issues individual authorisations for satellite earth stations and satellite uplink services. Manages Lithuanian radio spectrum, coordinates ITU satellite filings and orbital slot notifications on behalf of the Lithuanian administration.",
    legal_basis: "Elektroninių ryšių įstatymas (2004)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "LT-URM",
    jurisdiction: "LT",
    name_en: "Ministry of Foreign Affairs",
    name_local: "Užsienio reikalų ministerija",
    abbreviation: "URM",
    website: "https://urm.lt",
    space_mandate:
      "International space treaty matters, COPUOS representation, and treaty deposit coordination. Signed the Artemis Accords on 13 May 2024 as the 40th signatory.",
    applicable_areas: ["licensing"],
  },
  {
    id: "LT-KAM",
    jurisdiction: "LT",
    name_en: "Ministry of National Defence — Strategic Goods Export Control",
    name_local:
      "Krašto apsaugos ministerija — Strateginių prekių eksporto kontrolė",
    abbreviation: "KAM",
    website: "https://kam.lt",
    space_mandate:
      "Export control authority for dual-use items under the Law on Control of Strategic Goods (Strateginių prekių kontrolės įstatymas) implementing EU Regulation 2021/821. Issues export licences for Category 9 (Aerospace/Propulsion) items. Lithuania is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
    legal_basis: "Strateginių prekių kontrolės įstatymas",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "LT-NKSC",
    jurisdiction: "LT",
    name_en: "National Cyber Security Centre",
    name_local: "Nacionalinis kibernetinio saugumo centras",
    abbreviation: "NKSC",
    website: "https://nksc.lt",
    space_mandate:
      "NIS2 national competent authority under the Law on Cybersecurity (Kibernetinio saugumo įstatymas). Operates under the Ministry of National Defence. Coordinates incident response via LT-CERT, supervises essential and important entities including space-sector operators whose services qualify under NIS2 Annex I (space sector is high-criticality).",
    legal_basis: "Kibernetinio saugumo įstatymas",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "LT-VDAI",
    jurisdiction: "LT",
    name_en: "State Data Protection Inspectorate",
    name_local: "Valstybinė duomenų apsaugos inspekcija",
    abbreviation: "VDAI",
    website: "https://vdai.lrv.lt",
    space_mandate:
      "GDPR enforcement for Earth observation imagery, satellite-derived data products, and space-based telecommunications services under the Law on Legal Protection of Personal Data (Asmens duomenų teisinės apsaugos įstatymas).",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────

const TREATIES_LT: LegalSource[] = [
  {
    id: "LT-OST",
    jurisdiction: "LT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Lithuanian Accession",
    title_local:
      "Sutartis dėl valstybių veiklos tyrinėjant ir naudojant kosminę erdvę principų",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["LT-URM", "LT-EIM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Lithuania bears international responsibility for national space activities. However, NO domestic authorization regime exists — Lithuania has no dedicated national space law. Regulatory framework relies on (i) EU instruments, (ii) sectoral Lithuanian law (telecoms, export control, cybersecurity), and (iii) ESA programme agreements coordinated via EIM.",
        complianceImplication:
          "Lithuanian operators must navigate multiple sectoral regulators: RRT for spectrum, NKSC for cybersecurity, KAM for export control. EIM Space Affairs Division provides ESA-programme coordination but no direct licensing authority.",
      },
    ],
    related_sources: ["LT-LIABILITY"],
    notes: [
      "Lithuania restored independence 1990; UN space treaty accession as independent state.",
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "LT-LIABILITY",
    jurisdiction: "LT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Lithuanian Accession",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["LT-URM"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Lithuania is absolutely liable for surface damage caused by Lithuanian space objects. No dedicated space liability or insurance framework exists under Lithuanian law. Civil Code general strict-liability provisions may apply. NO mandatory insurance, NO recourse cap, NO government backstop for private operators. Given Lithuania's nanosatellite industry concentration (NanoAvionics flies >100 satellites for customers globally), this liability gap is particularly salient.",
      },
    ],
    related_sources: ["LT-OST"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (3) ──────────────────

const SECTORAL_LT: LegalSource[] = [
  {
    id: "LT-ECA-2004",
    jurisdiction: "LT",
    type: "federal_law",
    status: "in_force",
    title_en: "Law on Electronic Communications",
    title_local: "Elektroninių ryšių įstatymas",
    date_enacted: "2004-04-15",
    date_in_force: "2004-05-01",
    official_reference: "IX-2135",
    source_url: "https://e-tar.lt",
    issuing_body: "Seimas",
    competent_authorities: ["LT-RRT"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Chapter III",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. RRT is the issuing authority and manages Lithuania's position in ITU filings and orbital slot coordination. Amended multiple times to align with successive EU electronic communications directives, including 2018/1972.",
      },
    ],
    related_sources: ["LT-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "LT-EXPORT",
    jurisdiction: "LT",
    type: "federal_law",
    status: "in_force",
    title_en: "Law on the Control of Strategic Goods",
    title_local: "Strateginių prekių kontrolės įstatymas",
    date_enacted: "2004-04-22",
    official_reference: "IX-2153",
    source_url: "https://e-tar.lt",
    issuing_body: "Seimas",
    competent_authorities: ["LT-KAM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Export control for dual-use space technology",
        summary:
          "Implements EU Regulation 2021/821. The Ministry of National Defence issues export licences for Category 9 (Aerospace/Propulsion) items in coordination with MFA. Lithuania is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group. Particularly relevant for nanosatellite exports to non-EU customers — NanoAvionics and others regularly ship to North America, Asia-Pacific.",
      },
    ],
    related_sources: ["LT-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "LT-CYBERSEC",
    jurisdiction: "LT",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Law (NIS2 transposition)",
    title_local: "Kibernetinio saugumo įstatymas",
    date_enacted: "2014-12-11",
    date_last_amended: "2024-10-17",
    official_reference: "XII-1428",
    source_url: "https://e-tar.lt",
    issuing_body: "Seimas",
    competent_authorities: ["LT-NKSC"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space sector as high-criticality",
        summary:
          "Originally enacted as NIS transposition in 2014, substantially amended in October 2024 to transpose NIS2 Directive (EU 2022/2555). NKSC (under the Ministry of National Defence) is the national competent authority. Space sector classified as high-criticality; operators providing satellite-based services to essential entities fall under the essential/important entity regime.",
      },
    ],
    related_sources: ["LT-OST"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / Strategy (2) ─────────────────────

const POLICY_LT: LegalSource[] = [
  {
    id: "LT-ESA-2021",
    jurisdiction: "LT",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA Associate Membership Agreement — Lithuania",
    title_local: "ESA Asocijuotosios narystės sutartis — Lietuva",
    date_enacted: "2021-05-21",
    date_in_force: "2021-05-21",
    source_url:
      "https://www.esa.int/About_Us/Corporate_news/Lithuania_becomes_an_Associate_Member_State_of_ESA",
    issuing_body: "European Space Agency",
    competent_authorities: ["LT-EIM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA Associate Member status",
        summary:
          "Lithuania became an ESA Associate Member State on 21 May 2021, succeeding the European Cooperating State Agreement of 7 October 2014 and the PECS arrangement of 2015. Associate membership grants fuller participation in ESA programmes and voting rights in certain ESA Council matters.",
      },
    ],
    related_sources: ["LT-OST"],
    notes: [
      "European Cooperating State: 7 October 2014. PECS: 2015. Associate Member: 21 May 2021.",
      "Strong nanosatellite industry: NanoAvionics (acquired by Kongsberg 2022), Astrolight, Blackswan Space, Brolis Semiconductors.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "LT-ARTEMIS-2024",
    jurisdiction: "LT",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Lithuanian Signatory (2024)",
    date_enacted: "2024-05-13",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["LT-URM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources",
        summary:
          "Lithuania signed the Artemis Accords on 13 May 2024 as the 40th signatory, aligning with the NASA-led principles on peaceful use of outer space and interoperability for lunar exploration.",
      },
    ],
    related_sources: ["LT-OST"],
    notes: ["40th signatory, 13 May 2024."],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_LT: LegalSource[] = [
  ...TREATIES_LT,
  ...SECTORAL_LT,
  ...POLICY_LT,
];
