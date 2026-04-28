// src/data/legal-sources/sources/is.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Iceland space law sources — complete legal framework for jurisdiction IS.
 *
 * Sources: stjr.is, fjarskiptastofa.is, cert.is, personuvernd.is,
 * althingi.is, stjornartidindi.is
 * Last verified: 2026-04-20
 *
 * Notable: NO dedicated national space act, NO national space agency,
 * and essentially no commercial space industry. Iceland IS tracked
 * because: (i) as an EEA member, EU instruments apply directly via
 * EEA Joint Committee decisions — EU Space Act, NIS2, CRA will all
 * reach Iceland; (ii) the Arctic position makes Iceland relevant
 * for polar-orbit ground-station siting and reentry-corridor
 * observation; (iii) the Þingvellir and Reykjavík regions host
 * research ground stations used by ESA/NASA/commercial partners.
 * Iceland is NOT an ESA member. Regulatory framework is thin:
 * EEA-transposed EU law plus sectoral Icelandic statutes.
 *
 * Coverage status: MINIMAL but complete. Treaty accession dates
 * require UN depositary verification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { LegalSource, Authority } from "../types";

// ─── IS Authorities (4) ───────────────────────────────────────────

export const AUTHORITIES_IS: Authority[] = [
  {
    id: "IS-HVIN",
    jurisdiction: "IS",
    name_en: "Ministry of Higher Education, Science and Innovation",
    name_local: "Háskóla-, iðnaðar- og nýsköpunarráðuneytið",
    abbreviation: "HVIN",
    website: "https://stjr.is/hvin",
    space_mandate:
      "Coordinates Iceland's engagement with international space affairs, research cooperation (via the Icelandic Centre for Research, Rannís), and EEA-transposed EU space instruments. Iceland has no national space agency; this ministry serves as the government point of contact for ESA cooperation frameworks (though Iceland is not an ESA member) and the EU Space Programme via EEA.",
    applicable_areas: ["licensing"],
  },
  {
    id: "IS-FJS",
    jurisdiction: "IS",
    name_en: "Electronic Communications Office of Iceland",
    name_local: "Fjarskiptastofa",
    abbreviation: "FJS",
    website: "https://fjarskiptastofa.is",
    space_mandate:
      "National regulatory authority for electronic communications under the Electronic Communications Act (fjarskiptalög, nr. 70/2022). Issues individual authorisations for satellite earth stations and satellite uplink services. Manages Icelandic radio spectrum, coordinates ITU satellite filings on behalf of the Icelandic administration. Renamed from Póst- og fjarskiptastofnun (PFS) in 2022.",
    legal_basis: "Fjarskiptalög nr. 70/2022",
    applicable_areas: ["frequency_spectrum"],
  },
  {
    id: "IS-CERTIS",
    jurisdiction: "IS",
    name_en: "Computer Emergency Response Team Iceland",
    name_local: "CERT-IS",
    abbreviation: "CERT-IS",
    website: "https://cert.is",
    space_mandate:
      "National cybersecurity incident response team operating under Fjarskiptastofa. Coordinates cybersecurity for critical infrastructure including satellite communications. EEA-transposed NIS2 framework reaches Iceland via the EEA Joint Committee mechanism — transposition of NIS2 into Icelandic law is in progress (target: 2026–2027).",
    applicable_areas: ["cybersecurity"],
  },
  {
    id: "IS-PV",
    jurisdiction: "IS",
    name_en: "Data Protection Authority",
    name_local: "Persónuvernd",
    abbreviation: "Persónuvernd",
    website: "https://personuvernd.is",
    space_mandate:
      "GDPR-equivalent data protection authority under the Act on Data Protection and the Processing of Personal Data (lög nr. 90/2018), which transposes GDPR via the EEA Joint Committee Decision No. 154/2018. Relevant for Earth observation imagery and satellite-derived data products.",
    legal_basis: "Lög nr. 90/2018",
    applicable_areas: ["data_security"],
  },
];

// ─── International Treaties (2) ──────────────

const TREATIES_IS: LegalSource[] = [
  {
    id: "IS-OST",
    jurisdiction: "IS",
    type: "international_treaty",
    status: "in_force",
    title_en: "Outer Space Treaty — Icelandic Accession",
    title_local: "Samningur um meginreglur um starfsemi ríkja í geimnum",
    date_enacted: "1967-01-27",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introouterspacetreaty.html",
    issuing_body: "United Nations",
    competent_authorities: ["IS-HVIN"],
    relevance_level: "fundamental",
    applicable_to: ["all"],
    compliance_areas: ["licensing", "registration", "liability"],
    key_provisions: [
      {
        section: "Art. VI",
        title: "State responsibility — no domestic framework",
        summary:
          "Iceland bears international responsibility for any national space activities. However, there is NO domestic authorization regime and effectively no commercial space industry. Any future Icelandic space operator would rely on (i) EEA-transposed EU Space Act once in force, and (ii) sectoral Icelandic law (telecoms, data protection) for ancillary activities such as ground-station operation.",
      },
    ],
    related_sources: ["IS-LIABILITY"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
  {
    id: "IS-LIABILITY",
    jurisdiction: "IS",
    type: "international_treaty",
    status: "in_force",
    title_en: "Liability Convention — Icelandic Accession",
    date_enacted: "1972-03-29",
    source_url:
      "https://www.unoosa.org/oosa/en/ourwork/spacelaw/treaties/introliability-convention.html",
    issuing_body: "United Nations",
    competent_authorities: ["IS-HVIN"],
    relevance_level: "critical",
    applicable_to: ["all"],
    compliance_areas: ["liability", "insurance"],
    key_provisions: [
      {
        section: "Art. II",
        title: "Absolute liability — no domestic framework",
        summary:
          "Iceland is absolutely liable for surface damage caused by any Icelandic space objects. No dedicated space liability or insurance framework exists. Given essentially no commercial space activity, the liability exposure is theoretical rather than material — but any future ground-station operator handling reentering objects triggers Iceland's State responsibility under OST Art. VI.",
      },
    ],
    related_sources: ["IS-OST"],
    notes: [
      "Specific accession date requires UNOOSA depositary record verification.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Sectoral Legislation (2) ──────────────────

const SECTORAL_IS: LegalSource[] = [
  {
    id: "IS-ECA-2022",
    jurisdiction: "IS",
    type: "federal_law",
    status: "in_force",
    title_en: "Electronic Communications Act",
    title_local: "Fjarskiptalög",
    date_enacted: "2022-06-16",
    date_in_force: "2022-07-01",
    official_reference: "Lög nr. 70/2022",
    source_url: "https://www.althingi.is/lagas/nuna/2022070.html",
    issuing_body: "Alþingi",
    competent_authorities: ["IS-FJS"],
    relevance_level: "high",
    applicable_to: ["satellite_operator", "ground_segment"],
    compliance_areas: ["frequency_spectrum"],
    key_provisions: [
      {
        section: "Chapter V",
        title: "Radio spectrum authorisations",
        summary:
          "Regulates the issuance of individual authorisations for radio spectrum use, including satellite earth stations and satellite uplink services. Fjarskiptastofa is the issuing authority. Transposes the EU Electronic Communications Code (Directive 2018/1972) via the EEA Joint Committee Decision No. 210/2021.",
      },
    ],
    related_sources: ["IS-OST"],
    last_verified: "2026-04-20",
  },
  {
    id: "IS-GDPR-2018",
    jurisdiction: "IS",
    type: "federal_law",
    status: "in_force",
    title_en: "Act on Data Protection and the Processing of Personal Data",
    title_local: "Lög um persónuvernd og vinnslu persónuupplýsinga",
    date_enacted: "2018-06-13",
    date_in_force: "2018-07-15",
    official_reference: "Lög nr. 90/2018",
    source_url: "https://www.althingi.is/lagas/nuna/2018090.html",
    issuing_body: "Alþingi",
    competent_authorities: ["IS-PV"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["data_security"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "GDPR transposition via EEA",
        summary:
          "Transposes the EU GDPR into Icelandic law via the EEA Joint Committee Decision No. 154/2018. Relevant for Earth observation imagery and satellite-derived data products. Persónuvernd enforces compliance.",
      },
    ],
    related_sources: ["IS-OST"],
    last_verified: "2026-04-20",
  },
];

// ─── Policy / EEA Status (1) ─────────────────

const POLICY_IS: LegalSource[] = [
  {
    id: "IS-EEA-1994",
    jurisdiction: "IS",
    type: "policy_document",
    status: "in_force",
    title_en: "EEA Agreement — Icelandic Membership",
    title_local: "EES-samningurinn",
    date_enacted: "1994-01-01",
    date_in_force: "1994-01-01",
    source_url: "https://www.efta.int/eea/eea-agreement",
    issuing_body: "European Economic Area",
    competent_authorities: ["IS-HVIN"],
    relevance_level: "high",
    applicable_to: ["all"],
    compliance_areas: ["licensing"],
    key_provisions: [
      {
        section: "Full instrument",
        title: "EEA membership — EU law applies via Joint Committee",
        summary:
          "Iceland is an EEA member since 1 January 1994. EU instruments relevant to Atlas — EU Space Act, NIS2, CRA, GDPR, Electronic Communications Code — apply to Iceland via EEA Joint Committee Decisions, with appropriate adaptations. This is the primary channel by which EU space-regulatory evolution reaches Icelandic operators. Iceland is NOT an ESA member.",
        complianceImplication:
          "EEA adoption introduces a 6–18 month lag between EU adoption and Icelandic transposition. Operators serving EEA markets should verify the transposition status of each relevant EU instrument before assuming equivalence.",
      },
    ],
    related_sources: ["IS-OST"],
    notes: [
      "EEA membership since 1 January 1994 (via EFTA).",
      "Not an ESA member; cooperation frameworks on ad-hoc basis.",
    ],
    last_verified: "2026-04-20",
  },
];

// ─── Aggregated Export ────────────────────────────────────────────

export const LEGAL_SOURCES_IS: LegalSource[] = [
  ...TREATIES_IS,
  ...SECTORAL_IS,
  ...POLICY_IS,
];
