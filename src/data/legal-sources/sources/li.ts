// src/data/legal-sources/sources/li.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Liechtenstein space law sources — complete legal framework for jurisdiction LI.
 *
 * Sources: regierung.li, llv.li, sra.llv.li, datenschutzstelle.li,
 * gesetze.li
 * Last verified: 2026-04-20
 *
 * Notable: THE thinnest jurisdiction in Atlas. Liechtenstein has NO
 * space industry, NO national space agency, and NO operational
 * satellites. It is tracked because:
 *   (i)  EEA membership routes EU space-regulatory evolution —
 *        EU Space Act, NIS2, CRA — into Liechtenstein via the
 *        EEA Joint Committee mechanism, with typical 6–24 month
 *        transposition lag;
 *   (ii) Liechtenstein is a well-established Special Purpose
 *        Vehicle (SPV) and holding-company jurisdiction; space
 *        assets and IP are occasionally held in Liechtenstein
 *        trusts or foundations for tax and succession planning;
 *        any such holding triggers LI's State-responsibility
 *        exposure under OST Art. VI if the entity operates or
 *        procures launch of space objects.
 *   (iii) Financial Market Authority (FMA) supervises asset-
 *        holding structures that may include space collateral.
 *
 * Regulatory framework is minimal — EEA-transposed EU law plus
 * Liechtenstein Principality statutes. Treaty accession dates
 * require UN depositary verification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── LI Authorities (4) ───────────────────────────────────────────

export const AUTHORITIES_LI: Authority[] = [
  {
    id: "LI-REG",
    jurisdiction: "LI",
    name_en: "Government of the Principality of Liechtenstein",
    name_local: "Regierung des Fürstentums Liechtenstein",
    abbreviation: "Regierung",
    website: "https://regierung.li",
    space_mandate:
      "No dedicated space portfolio. The government (via the Ministry of Foreign Affairs, Justice and Culture) coordinates international treaty matters and EEA Joint Committee positions. Given no domestic space activity, this ministry's role is purely representational and administrative. Treaty deposit coordination flows through the Ministry of Foreign Affairs.",
    applicable_areas: ["licensing"],
  },
  {
    id: "LI-AFK",
    jurisdiction: "LI",
    name_en: "Office of Communications",
    name_local: "Amt für Kommunikation",
    abbreviation: "AK",
    website: "https://llv.li/de/landesverwaltung/amt-fuer-kommunikation",
    space_mandate:
      "National regulatory authority for electronic communications under the Electronic Communications Act (Kommunikationsgesetz, KomG). Theoretically competent to issue satellite earth-station authorisations if any Liechtenstein operator applied; in practice, no such applications have been processed. Coordinates with Switzerland on spectrum management under the Liechtenstein–Switzerland customs and monetary union.",
    legal_basis: "Kommunikationsgesetz (KomG)",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "LI-FMA",
    jurisdiction: "LI",
    name_en: "Financial Market Authority Liechtenstein",
    name_local: "Finanzmarktaufsicht Liechtenstein",
    abbreviation: "FMA",
    website: "https://fma-li.li",
    space_mandate:
      "Supervises financial institutions and asset-holding structures (trusts, foundations, domiciliary companies). Relevant for space-sector SPVs and asset-financing structures held in Liechtenstein. Not a regulator of space activities per se, but any securitisation or trust arrangement holding space assets comes under FMA supervision under the Trust Enterprise Act (Treuunternehmen) and the Banking Act.",
    applicable_areas: ["licensing"],
  },
  {
    id: "LI-DSS",
    jurisdiction: "LI",
    name_en: "Data Protection Office",
    name_local: "Datenschutzstelle",
    abbreviation: "DSS",
    website: "https://datenschutzstelle.li",
    space_mandate:
      "GDPR enforcement under the Data Protection Act (Datenschutzgesetz, DSG 2018) which transposes GDPR via the EEA Joint Committee Decision No. 154/2018. Relevant for Earth observation imagery and satellite-derived data products if processed by Liechtenstein entities.",
    legal_basis: "Datenschutzgesetz (2018)",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────

const TREATIES_LI: LegalSource[] = [
  {
    id: "LI-OST",
    jurisdiction: "LI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Liechtenstein Accession",
    title_local: "Weltraumvertrag",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["LI-REG"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — theoretical exposure",
        summary:
          "Liechtenstein bears international responsibility for any national space activities. In practice no domestic space activities exist and no authorization regime has been codified. The Art. VI exposure becomes material only if a Liechtenstein-domiciled entity (SPV, foundation, trust) operates or procures the launch of space objects — in which case LI would be the State-of-Registry or launching State in the OST sense.",
      },
    ],
    related_sources: ["LI-LIABILITY"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "LI-LIABILITY",
    jurisdiction: "LI",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Liechtenstein Accession",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["LI-REG"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Liechtenstein is absolutely liable for surface damage caused by any space objects for which it is the launching State or State of Registry. No domestic space-liability framework exists. If a Liechtenstein SPV holds a satellite and the launch State routes registration to Liechtenstein (rare but possible under OST Art. VIII consultation), the Principality inherits unlimited State liability without any recourse cap.",
      },
    ],
    related_sources: ["LI-OST"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral + EEA (2) ────────────────────────

const SECTORAL_LI: LegalSource[] = [
  {
    id: "LI-DSG-2018",
    jurisdiction: "LI",
    type: "federal_law",
    status: "in_force",
    title_en: "Data Protection Act (GDPR via EEA)",
    title_local: "Datenschutzgesetz (DSG)",
    date_enacted: "2018-06-04",
    date_in_force: "2018-08-01",
    official_reference: "LGBl. 2018 Nr. 272",
    source_url: "https://gesetze.li",
    issuing_body: "Landtag des Fürstentums Liechtenstein",
    competent_authorities: ["LI-DSS"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "GDPR transposition via EEA",
        summary:
          "Transposes the EU GDPR into Liechtenstein law via the EEA Joint Committee Decision No. 154/2018. Relevant for Earth observation imagery and satellite-derived data products processed by Liechtenstein entities. DSS enforces compliance.",
      },
    ],
    related_sources: ["LI-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "LI-EEA-1995",
    jurisdiction: "LI",
    type: "policy_document",
    status: "in_force",
    title_en: "EEA Agreement — Liechtenstein Membership",
    title_local: "EWR-Abkommen",
    date_enacted: "1995-05-01",
    date_in_force: "1995-05-01",
    source_url: "https://www.efta.int/eea/eea-agreement",
    issuing_body: "European Economic Area",
    competent_authorities: ["LI-REG"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "EEA membership — EU law applies via Joint Committee",
        summary:
          "Liechtenstein is an EEA member since 1 May 1995. EU instruments relevant to Atlas — EU Space Act, NIS2, CRA, GDPR, Electronic Communications Code — apply to Liechtenstein via EEA Joint Committee Decisions, with appropriate adaptations. This is the only meaningful channel by which EU space-regulatory evolution touches Liechtenstein operators. Liechtenstein is NOT an ESA member.",
        complianceImplication:
          "EEA adoption introduces a typical 6–24 month lag between EU adoption and Liechtenstein transposition. For a space-asset SPV domiciled in Liechtenstein and serving EU markets, the operating reality is EU-equivalent but with delayed regulatory updates.",
      },
    ],
    related_sources: ["LI-OST"],
    notes: [
      "EEA membership since 1 May 1995 (via EFTA).",
      "Not an ESA member.",
      "Customs and monetary union with Switzerland provides additional regulatory overlay on electronic communications.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_LI: LegalSource[] = [...TREATIES_LI, ...SECTORAL_LI];
