// src/data/legal-sources/sources/sk.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Slovakia space law sources — complete legal framework for jurisdiction SK.
 *
 * Sources: minedu.sk, teluniv.sk, nbu.gov.sk, teleoff.gov.sk, slov-lex.sk,
 * esa.int
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act. Slovakia joined ESA as a
 * European Cooperating State on 16 February 2010, graduated to PECS in
 * 2015, and became an ESA Associate Member on 30 September 2022. The
 * Ministry of Education, Research, Development and Youth (MŠVVaM) is
 * the ESA delegation ministry. skCUBE — launched 23 June 2017 on PSLV-C38 —
 * was Slovakia's first satellite (1U CubeSat, developed by the Slovak
 * Organisation for Space Activities / SOSA). Notable companies: Needronix
 * (nanosatellite systems), GA Drilling (space mining), Spacemanic
 * (CubeSat integration). Regulatory framework layered from (i) EU
 * instruments applied directly, (ii) sectoral Slovak law — Electronic
 * Communications Act, Foreign Trade Act (dual-use), Cybersecurity Act —
 * and (iii) ESA programme agreements coordinated via MŠVVaM.
 *
 * Coverage status: PRELIMINARY. Treaty accession dates (Czechoslovak
 * succession 1993) require UNOOSA depositary verification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── SK Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_SK: Authority[] = [
  {
    id: "SK-MSVVAM",
    jurisdiction: "SK",
    name_en: "Ministry of Education, Research, Development and Youth",
    name_local:
      "Ministerstvo školstva, výskumu, vývoja a mládeže Slovenskej republiky",
    abbreviation: "MŠVVaM",
    website: "https://minedu.sk",
    space_mandate:
      "ESA delegation ministry and primary coordinator of Slovak space activities. Manages Slovakia's ESA contribution (~€3M/year), approves industrial participation strategy, and coordinates the national space policy. Represents Slovakia at the EU Space Programme Committee. Oversees the Slovak Organisation for Space Activities (SOSA) partnership.",
    applicable_areas: ["licensing"],
  },
  {
    id: "SK-RU",
    jurisdiction: "SK",
    name_en:
      "Regulatory Authority for Electronic Communications and Postal Services",
    name_local: "Regulačný úrad pre elektronické komunikácie a poštové služby",
    abbreviation: "RÚ",
    website: "https://teleoff.gov.sk",
    space_mandate:
      "National regulatory authority for electronic communications under the Electronic Communications Act (zákon č. 452/2021 Z.z.). Issues individual authorisations for satellite earth stations and satellite uplink services. Manages Slovak radio spectrum, coordinates ITU satellite filings and orbital slot notifications.",
    legal_basis: "Zákon č. 452/2021 Z.z.",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "SK-MZV",
    jurisdiction: "SK",
    name_en: "Ministry of Foreign and European Affairs",
    name_local: "Ministerstvo zahraničných vecí a európskych záležitostí",
    abbreviation: "MZVEZ",
    website: "https://mzv.sk",
    space_mandate:
      "International space treaty matters, COPUOS representation, and treaty deposit coordination. Slovakia succeeded to the major UN space treaties via Czechoslovak succession on 1 January 1993.",
    applicable_areas: ["licensing"],
  },
  {
    id: "SK-MH",
    jurisdiction: "SK",
    name_en: "Ministry of Economy — Licensing Department",
    name_local: "Ministerstvo hospodárstva Slovenskej republiky",
    abbreviation: "MH SR",
    website: "https://mhsr.sk",
    space_mandate:
      "Export control authority for dual-use items under the Foreign Trade Act (zákon č. 39/2011 Z.z.) implementing EU Regulation 2021/821. Issues export licences for Category 9 (Aerospace/Propulsion) items. Slovakia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
    legal_basis: "Zákon č. 39/2011 Z.z.",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "SK-NBU",
    jurisdiction: "SK",
    name_en: "National Security Authority (SK-CERT host)",
    name_local: "Národný bezpečnostný úrad",
    abbreviation: "NBÚ",
    website: "https://nbu.gov.sk",
    space_mandate:
      "NIS2 national competent authority under the Cybersecurity Act (zákon č. 69/2018 Z.z., as amended for NIS2 in 2024). Operates SK-CERT (national computer security incident response team), coordinates incident response, and supervises essential and important entities including space-sector operators whose services qualify under NIS2 Annex I (space sector is high-criticality).",
    legal_basis: "Zákon č. 69/2018 Z.z.",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "SK-UOOU",
    jurisdiction: "SK",
    name_en: "Office for Personal Data Protection",
    name_local: "Úrad na ochranu osobných údajov Slovenskej republiky",
    abbreviation: "ÚOOÚ",
    website: "https://dataprotection.gov.sk",
    space_mandate:
      "GDPR enforcement under zákon č. 18/2018 Z.z. for Earth observation imagery, satellite-derived data products, and space-based telecommunications services.",
    legal_basis: "Zákon č. 18/2018 Z.z.",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────
// NOTE: Slovakia succeeded to UN space treaties via Czechoslovak
// dissolution (1 January 1993).

const TREATIES_SK: LegalSource[] = [
  {
    id: "SK-OST",
    jurisdiction: "SK",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Slovak Republic (Czechoslovak Succession)",
    title_local:
      "Zmluva o zásadách činnosti štátov pri prieskume a využívaní kozmického priestoru",
    date_enacted: "1967-01-27",
    date_in_force: "1993-01-01",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations (Czechoslovak succession)",
    competent_authorities: ["SK-MZV", "SK-MSVVAM"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic implementation",
        summary:
          "Slovakia bears international responsibility for national space activities (via Czechoslovak succession 1993). However, NO domestic authorization regime exists — Slovakia has no dedicated national space law. Regulatory framework relies on (i) EU instruments, (ii) sectoral Slovak law (telecoms, export control, cybersecurity), and (iii) ESA programme agreements coordinated via MŠVVaM.",
        complianceImplication:
          "Slovak operators must navigate multiple sectoral regulators: RÚ for spectrum, NBÚ for cybersecurity, MH SR for export control. MŠVVaM provides ESA-programme coordination but no direct licensing authority.",
      },
    ],
    related_sources: ["SK-LIABILITY"],
    notes: [
      "Czechoslovakia signed 27 January 1967, ratified 22 May 1967.",
      "Slovak Republic succeeded 1 January 1993.",
      "Specific modern accession confirmation requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "SK-LIABILITY",
    jurisdiction: "SK",
    type: "international_treaty",
    status: "in_force",
    title_en:
      "Liability Convention — Slovak Republic (Czechoslovak Succession)",
    date_enacted: "1972-03-29",
    date_in_force: "1993-01-01",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations (Czechoslovak succession)",
    competent_authorities: ["SK-MZV"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Slovakia is absolutely liable for surface damage caused by Slovak space objects. No dedicated space liability or insurance framework exists under Slovak law. Civil Code general strict-liability provisions may apply. NO mandatory insurance, NO recourse cap, NO government backstop for private operators.",
      },
    ],
    related_sources: ["SK-OST"],
    notes: [
      "Czechoslovakia signed 29 March 1972, ratified 8 September 1976.",
      "Slovak Republic succeeded 1 January 1993.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (3) ──────────────────

const SECTORAL_SK: LegalSource[] = [
  {
    id: "SK-ECA-2021",
    jurisdiction: "SK",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act",
    title_local: "Zákon č. 452/2021 Z.z. o elektronických komunikáciách",
    date_enacted: "2021-11-16",
    date_in_force: "2022-02-01",
    official_reference: "452/2021 Z.z.",
    source_url: "https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2021/452/",
    issuing_body: "Národná rada Slovenskej republiky",
    competent_authorities: ["SK-RU"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "§§ 27–42",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. RÚ is the issuing authority and manages Slovakia's position in ITU filings and orbital slot coordination. Transposes the EU Electronic Communications Code (Directive 2018/1972).",
      },
    ],
    related_sources: ["SK-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "SK-EXPORT-2011",
    jurisdiction: "SK",
    type: "federal_law",
    status: "in_force",
    title_en: "Foreign Trade Act (Dual-Use Goods)",
    title_local: "Zákon č. 39/2011 Z.z. o zahraničnom obchode",
    date_enacted: "2011-02-15",
    official_reference: "39/2011 Z.z.",
    source_url: "https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2011/39/",
    issuing_body: "Národná rada Slovenskej republiky",
    competent_authorities: ["SK-MH"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["export_control", "military_dual_use"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "Export control for dual-use space technology",
        summary:
          "Implements EU Regulation 2021/821. The Ministry of Economy's Licensing Department issues export licences for Category 9 (Aerospace/Propulsion) items. Slovakia is a member of the Wassenaar Arrangement, MTCR, NSG, and Australia Group.",
      },
    ],
    related_sources: ["SK-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "SK-CYBERSEC-2018",
    jurisdiction: "SK",
    type: "federal_law",
    status: "in_force",
    title_en: "Cybersecurity Act (NIS2 transposition framework)",
    title_local: "Zákon č. 69/2018 Z.z. o kybernetickej bezpečnosti",
    date_enacted: "2018-01-30",
    date_last_amended: "2024-10-01",
    official_reference: "69/2018 Z.z.",
    source_url: "https://www.slov-lex.sk/pravne-predpisy/SK/ZZ/2018/69/",
    issuing_body: "Národná rada Slovenskej republiky",
    competent_authorities: ["SK-NBU"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["cybersecurity"],
    implements: "EU-NIS2-2022",
    key_provisions: [
      {
        section: "Full instrument",
        title: "NIS2 transposition — space sector as high-criticality",
        summary:
          "Originally enacted as the first Slovak NIS transposition in 2018. Amended in 2024 to transpose NIS2 Directive (EU 2022/2555). NBÚ (National Security Authority) is the national competent authority via SK-CERT. Space sector classified as high-criticality under Annex I.",
      },
    ],
    related_sources: ["SK-OST"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / Strategy (1) ─────────────────────

const POLICY_SK: LegalSource[] = [
  {
    id: "SK-ESA-2022",
    jurisdiction: "SK",
    type: "policy_document",
    status: "in_force",
    title_en: "ESA Associate Membership Agreement — Slovakia",
    title_local: "Asociovaná dohoda s ESA — Slovensko",
    date_enacted: "2022-09-30",
    date_in_force: "2022-09-30",
    source_url:
      "https://www.esa.int/About_Us/Corporate_news/Slovakia_joins_ESA",
    issuing_body: "European Space Agency",
    competent_authorities: ["SK-MSVVAM"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "ESA Associate Member status",
        summary:
          "Slovakia became an ESA Associate Member State on 30 September 2022, following European Cooperating State status since 16 February 2010 and PECS from 2015. Associate membership grants fuller participation in ESA programmes and voting rights in certain ESA Council matters.",
      },
    ],
    related_sources: ["SK-OST"],
    notes: [
      "European Cooperating State: 16 February 2010. PECS: 2015. Associate Member: 30 September 2022.",
      "skCUBE (first Slovak satellite) launched 23 June 2017 on PSLV-C38.",
      "Slovak Organisation for Space Activities (SOSA) led skCUBE development.",
      "Active sector: Needronix (nanosats), Spacemanic (CubeSat integration), GA Drilling.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_SK: LegalSource[] = [
  ...TREATIES_SK,
  ...SECTORAL_SK,
  ...POLICY_SK,
];
