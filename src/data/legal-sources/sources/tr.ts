// src/data/legal-sources/sources/tr.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Turkey space law sources — complete legal framework for jurisdiction TR.
 *
 * Sources: tua.gov.tr, btk.gov.tr, usom.gov.tr, mfa.gov.tr, kvkk.gov.tr,
 * resmigazete.gov.tr, mevzuat.gov.tr
 * Last verified: 2026-04-20
 *
 * Notable: Turkey is NOT an EU or EEA member — non-EU jurisdiction
 * with distinct regulatory posture. The Turkish Space Agency
 * (Türkiye Uzay Ajansı, TUA) was established 13 December 2018 by
 * Presidential Decree No. 23 and reorganised 2024 under Presidential
 * Decree No. 170. Turkey has not yet enacted a dedicated national
 * space activities law; authorisation flows through TUA's decree-
 * based mandate plus sectoral legislation (Electronic Communications
 * Law, Foreign Trade Regime, Cybersecurity framework). Turkey's
 * 10-Year National Space Programme (announced Feb 2021) targets a
 * 2028 lunar mission via international cooperation; Alper Gezeravcı
 * flew to the ISS on Axiom Mission 3 (18 January 2024) as the
 * first Turkish astronaut. Turkey signed the Artemis Accords on
 * 13 April 2024 (36th signatory). No ESA membership; cooperation
 * via framework agreements.
 *
 * Coverage status: PRELIMINARY. Treaty accession dates require UN
 * depositary verification. Export control regime interactions with
 * EU dual-use framework require specialist legal review.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── TR Authorities (6) ───────────────────────────────────────────

export const AUTHORITIES_TR: Authority[] = [
  {
    id: "TR-TUA",
    jurisdiction: "TR",
    name_en: "Turkish Space Agency",
    name_local: "Türkiye Uzay Ajansı",
    abbreviation: "TUA",
    website: "https://tua.gov.tr",
    space_mandate:
      "National space agency and primary coordinator of Turkish space activities. Established 13 December 2018 under Presidential Decree No. 23, reorganised 2024 under Presidential Decree No. 170. Manages the 10-Year National Space Programme, coordinates international cooperation (no ESA membership; framework agreements with JAXA, NASA, SpaceX), and oversees TÜRKSAT operations. Led by a President reporting directly to the Presidency of the Republic. Headquarters: Ankara.",
    legal_basis: "Presidential Decree No. 23 (2018); No. 170 (2024)",
    applicable_areas: ["licensing", "registration"],
  },
  {
    id: "TR-BTK",
    jurisdiction: "TR",
    name_en: "Information and Communication Technologies Authority",
    name_local: "Bilgi Teknolojileri ve İletişim Kurumu",
    abbreviation: "BTK",
    website: "https://btk.gov.tr",
    space_mandate:
      "National regulatory authority for electronic communications under the Electronic Communications Law (5809 sayılı Kanun, 2008). Issues individual authorisations for satellite earth stations and satellite uplink services. Manages Turkish radio spectrum, coordinates ITU satellite filings and orbital slot notifications on behalf of the Turkish administration. Supervises TÜRKSAT's satellite fleet.",
    legal_basis: "5809 sayılı Elektronik Haberleşme Kanunu (2008)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "TR-DIS",
    jurisdiction: "TR",
    name_en: "Ministry of Foreign Affairs",
    name_local: "Türkiye Cumhuriyeti Dışişleri Bakanlığı",
    abbreviation: "MFA",
    website: "https://mfa.gov.tr",
    space_mandate:
      "International space treaty matters, COPUOS representation, and treaty deposit coordination. Signed the Artemis Accords on 13 April 2024 (36th signatory). Coordinates Turkey's position at the UN COPUOS Legal and Technical Subcommittees.",
    applicable_areas: ["licensing"],
  },
  {
    id: "TR-SSB",
    jurisdiction: "TR",
    name_en: "Presidency of Defence Industries",
    name_local: "Savunma Sanayii Başkanlığı",
    abbreviation: "SSB",
    website: "https://ssb.gov.tr",
    space_mandate:
      "Export control authority for dual-use and military space technology. Works in coordination with the Ministry of Trade (Ticaret Bakanlığı) on the Foreign Trade Regime. Supervises TAI (Turkish Aerospace Industries) and Aselsan space-sector programmes including İMECE Earth observation satellite.",
    applicable_areas: ["export_control", "military_dual_use"],
  },
  {
    id: "TR-USOM",
    jurisdiction: "TR",
    name_en: "National Cyber Incident Response Centre",
    name_local: "Ulusal Siber Olaylara Müdahale Merkezi",
    abbreviation: "USOM",
    website: "https://usom.gov.tr",
    space_mandate:
      "National CERT operating under BTK. Coordinates cybersecurity incident response across critical infrastructure sectors including satellite communications. Works with the Presidential Digital Transformation Office on cybersecurity policy. Turkey's NIS2-equivalent framework relies on the Electronic Communications Law cybersecurity provisions and sector-specific regulations; no direct NIS2 transposition since Turkey is not an EU member state.",
    legal_basis: "5809 sayılı Kanun, cybersecurity provisions",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "TR-KVKK",
    jurisdiction: "TR",
    name_en: "Personal Data Protection Authority",
    name_local: "Kişisel Verileri Koruma Kurumu",
    abbreviation: "KVKK",
    website: "https://kvkk.gov.tr",
    space_mandate:
      "Enforces the Personal Data Protection Law (6698 sayılı Kanun, 2016) — Turkey's GDPR-adjacent framework. Relevant for Earth observation imagery, satellite-derived data products, and space-based telecommunications services. Not GDPR-equivalent in all respects; cross-border data transfers require specific safeguards.",
    legal_basis: "6698 sayılı Kanun (2016)",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (3) ──────────────

const TREATIES_TR: LegalSource[] = [
  {
    id: "TR-OST",
    jurisdiction: "TR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Turkish Ratification",
    title_local:
      "Ay ve Diğer Gök Cisimleri Dahil, Uzayın Keşfi ve Kullanılmasında Devletlerin Faaliyetlerini Yöneten İlkeler Hakkında Antlaşma",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["TR-DIS", "TR-TUA"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — TUA as coordinator",
        summary:
          "Turkey bears international responsibility for national space activities. With no dedicated space law, TUA coordinates authorization via its Presidential Decree mandate, supplemented by sectoral regulators (BTK for spectrum, SSB for export control, USOM for cybersecurity).",
        complianceImplication:
          "Turkish operators should seek TUA coordination plus BTK spectrum authorisation before any launch or ground-segment activity. Export control licensing via SSB is mandatory for dual-use items.",
      },
    ],
    related_sources: ["TR-LIABILITY", "TR-ARTEMIS-2024"],
    notes: [
      "Turkey signed OST 27 January 1967, ratified shortly after.",
      "Specific ratification date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "TR-LIABILITY",
    jurisdiction: "TR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Turkish Ratification",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["TR-DIS"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic space-insurance framework",
        summary:
          "Turkey is absolutely liable for surface damage caused by Turkish space objects. No dedicated space liability or insurance framework exists; civil law (Turkish Code of Obligations) general provisions may apply by analogy. NO mandatory insurance, NO recourse cap, NO government backstop explicitly codified — though TÜRKSAT satellites carry commercial insurance as a matter of operator practice.",
      },
    ],
    related_sources: ["TR-OST"],
    notes: [
      "Specific ratification date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "TR-ARTEMIS-2024",
    jurisdiction: "TR",
    type: "international_treaty",
    status: "in_force",
    title_en: "Artemis Accords — Turkish Signatory (2024)",
    date_enacted: "2024-04-13",
    source_url: "https://www.nasa.gov/artemis-accords",
    issuing_body: "NASA / Participating Nations",
    competent_authorities: ["TR-DIS", "TR-TUA"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Section 10",
        title: "Space resources & international cooperation",
        summary:
          "Turkey signed the Artemis Accords on 13 April 2024 (36th signatory). Aligns with NASA-led principles on peaceful use of outer space, interoperability for lunar exploration, and the handling of space resources. Supports Turkey's 10-Year National Space Programme lunar-mission objectives (target: 2028).",
      },
    ],
    related_sources: ["TR-OST"],
    notes: ["36th signatory, 13 April 2024."],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (3) ──────────────────

const SECTORAL_TR: LegalSource[] = [
  {
    id: "TR-ECL-2008",
    jurisdiction: "TR",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Law",
    title_local: "Elektronik Haberleşme Kanunu",
    date_enacted: "2008-11-05",
    date_in_force: "2008-11-10",
    official_reference: "5809 sayılı Kanun",
    source_url: "https://mevzuat.gov.tr",
    issuing_body: "Türkiye Büyük Millet Meclisi",
    competent_authorities: ["TR-BTK"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Articles 36–45",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. BTK is the issuing authority and manages Turkey's position in ITU satellite filings and orbital slot coordination. Includes cybersecurity provisions for electronic communications networks.",
      },
    ],
    related_sources: ["TR-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "TR-KVK-2016",
    jurisdiction: "TR",
    type: "federal_law",
    status: "in_force",
    title_en: "Personal Data Protection Law",
    title_local: "Kişisel Verilerin Korunması Kanunu",
    date_enacted: "2016-04-07",
    date_in_force: "2016-04-07",
    official_reference: "6698 sayılı Kanun",
    source_url: "https://mevzuat.gov.tr",
    issuing_body: "Türkiye Büyük Millet Meclisi",
    competent_authorities: ["TR-KVKK"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "GDPR-adjacent data protection regime",
        summary:
          "Turkey's GDPR-adjacent framework — similar principles but not full GDPR equivalence. Relevant for Earth observation imagery and satellite-derived data. Cross-border data transfers require explicit consent or adequacy decisions; Turkey is not on the EU adequacy list. KVKK enforces compliance and issues fines.",
      },
    ],
    related_sources: ["TR-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "TR-TUA-DECREE-2018",
    jurisdiction: "TR",
    type: "federal_regulation",
    status: "in_force",
    title_en: "Presidential Decree Establishing the Turkish Space Agency",
    title_local:
      "Türkiye Uzay Ajansı Kurulması Hakkında Cumhurbaşkanlığı Kararnamesi",
    date_enacted: "2018-12-13",
    date_in_force: "2018-12-13",
    date_last_amended: "2024-01-01",
    official_reference:
      "23 sayılı Cumhurbaşkanlığı Kararnamesi (2018); 170 sayılı (2024)",
    source_url: "https://resmigazete.gov.tr",
    issuing_body: "Cumhurbaşkanlığı",
    competent_authorities: ["TR-TUA"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title:
          "TUA mandate — quasi-regulatory function in absence of space act",
        summary:
          "Establishes the Turkish Space Agency (TUA) and grants it coordination authority over national space activities. In the absence of a dedicated national space law, TUA's decree-based mandate serves as the primary authorization-coordination framework. TUA publishes the 10-Year National Space Programme (announced 9 February 2021) targeting a 2028 lunar mission and first-Turkish-astronaut milestone.",
        complianceImplication:
          "Turkish space operators should engage TUA as the primary regulatory counterpart. A dedicated national space activities law is under discussion but not enacted.",
      },
    ],
    related_sources: ["TR-OST"],
    notes: [
      "10-Year National Space Programme announced 9 February 2021.",
      "Alper Gezeravcı flew to the ISS on Axiom Mission 3 (18 January 2024) as first Turkish astronaut.",
      "İMECE Earth observation satellite launched April 2023 (SpaceX Transporter-7).",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_TR: LegalSource[] = [...TREATIES_TR, ...SECTORAL_TR];
