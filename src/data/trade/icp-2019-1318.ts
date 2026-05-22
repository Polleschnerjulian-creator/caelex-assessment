/**
 * Caelex Trade — EU Commission Recommendation 2019/1318 (Internal
 * Compliance Programme for dual-use trade controls).
 *
 * Sprint Z8 — Seven-element mapping.
 *
 * The 2019/1318 Recommendation defines a structured ICP framework that
 * BAFA's "Merkblatt zu Internal Compliance Programmes" treats as the
 * canonical structure for German exporters seeking general or global
 * authorizations (Sammelgenehmigungen). Each element below carries:
 *
 *   - a stable ID that the matcher uses to project a
 *     `TradeComplianceProgram` onto the framework
 *   - sub-items reflecting the Recommendation's enumerated guidance
 *   - a `programFields` accessor list — when a sub-item is satisfied
 *     by a known field on `TradeComplianceProgram`, the mapping
 *     service consults those fields to compute the element's
 *     completion percentage
 *
 * The data is intentionally pure (no React, no Prisma). The mapping
 * engine in `src/lib/trade/icp-mapping-service.ts` consumes this and
 * a program record to produce per-element scoring.
 *
 * Reference: Commission Recommendation (EU) 2019/1318 of 30 July 2019
 *            (OJ L 205, 5.8.2019, p. 15) — updated to reflect EU
 *            2021/821 nomenclature (Art. 2(21) defines the ICP).
 *            See also BAFA Merkblatt zu Internal Compliance
 *            Programmes (Stand 2023; last reviewed 2025).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Stable element identifiers — the seven core elements of the 2019/
 * 1318 Recommendation. Order is the order the Recommendation uses.
 */
export type ICPElementId =
  | "E1_MANAGEMENT_COMMITMENT"
  | "E2_ORGANISATION_RESPONSIBILITIES"
  | "E3_TRAINING_AWARENESS"
  | "E4_TRANSACTION_SCREENING"
  | "E5_PERFORMANCE_REVIEW"
  | "E6_RECORDKEEPING"
  | "E7_PHYSICAL_INFORMATION_SECURITY";

/**
 * Boolean fields on `TradeComplianceProgram` that the matcher can
 * consult to auto-satisfy an ICP check item. The list is restrictive
 * by design — only fields the matcher actually inspects are listed;
 * adding a new boolean is an explicit codebase change.
 */
export type ProgramBooleanField =
  | "hasITARItems"
  | "hasEARItems"
  | "hasTCP"
  | "hasECL"
  | "hasAutomatedScreening"
  | "registeredWithDDTC"
  | "usesLicenseExceptions"
  | "hasVoluntaryDisclosures";

/**
 * Fields on `TradeComplianceProgram` that should hold a non-null
 * scalar (string, date, number) for an item to count as satisfied.
 * The matcher treats null / undefined / empty string as unsatisfied.
 */
export type ProgramScalarField =
  | "empoweredOfficialName"
  | "empoweredOfficialEmailEnc"
  | "empoweredOfficialTitle"
  | "screeningVendor"
  | "lastTrainingDate"
  | "nextTrainingDue"
  | "trainingCompletionRate"
  | "lastAuditDate"
  | "nextAuditDue"
  | "lastAuditFindings"
  | "jurisdictionDetermination"
  | "licenseExceptionsUsed";

export interface ICPCheckItem {
  /** Stable ID — element prefix + zero-padded ordinal (E1-01, E1-02, ...). */
  id: string;
  /** Plain-language title, English. */
  title: string;
  /** Plain-language guidance, English — what BAFA expects to see. */
  guidance: string;
  /**
   * Mandatory items must be satisfied for the operator to qualify for
   * SAG/general authorizations. Non-mandatory items are good-practice.
   */
  mandatory: boolean;
  /**
   * Optional auto-satisfaction wiring. If ANY listed boolean field on
   * the program is `true`, OR any scalar field is non-null/non-empty,
   * the item is auto-marked satisfied.
   */
  autoSatisfyBooleans?: ProgramBooleanField[];
  autoSatisfyScalars?: ProgramScalarField[];
  /**
   * Verbatim quote / paraphrase of the Recommendation passage that
   * grounds this item. Used for the operator-facing rationale string.
   */
  citation: string;
}

export interface ICPElement {
  id: ICPElementId;
  /** 1-7 — display order. */
  ordinal: number;
  /** Short title (English). */
  title: string;
  /** German BAFA-equivalent title. */
  titleDe: string;
  /** Short summary of what the element covers. */
  summary: string;
  /** Check items the operator must satisfy for the element. */
  items: ICPCheckItem[];
}

// ─── The seven elements ─────────────────────────────────────────────

export const ICP_ELEMENTS: readonly ICPElement[] = [
  {
    id: "E1_MANAGEMENT_COMMITMENT",
    ordinal: 1,
    title: "Top-level management commitment to compliance",
    titleDe: "Verbindliches Bekenntnis der Unternehmensleitung",
    summary:
      "Senior leadership owns the compliance programme, demonstrates support through written policy, and allocates the resources needed to maintain it.",
    items: [
      {
        id: "E1-01",
        title:
          "Written compliance policy statement issued by senior management",
        guidance:
          "A formal, dated and signed policy statement from the CEO / Managing Director articulating the company's commitment to dual-use export controls.",
        mandatory: true,
        citation:
          "EU 2019/1318 Annex Pt. 1 (a) — 'A clearly worded, written commitment by senior management.'",
      },
      {
        id: "E1-02",
        title: "Compliance policy communicated to all employees",
        guidance:
          "Evidence that the policy has been shared with relevant staff (intranet, onboarding pack, signed acknowledgement).",
        mandatory: true,
        citation:
          "EU 2019/1318 Annex Pt. 1 (b) — 'Communicated to all employees regularly.'",
      },
      {
        id: "E1-03",
        title: "Adequate financial and human resources allocated",
        guidance:
          "Budget line, FTE headcount, or contractor arrangement specifically for export-control compliance.",
        mandatory: true,
        citation:
          "EU 2019/1318 Annex Pt. 1 (c) — 'Adequate organisational, human and technical resources.'",
      },
    ],
  },
  {
    id: "E2_ORGANISATION_RESPONSIBILITIES",
    ordinal: 2,
    title:
      "Organisation structure, responsibilities and resources (Export Control Manager / Ausfuhrverantwortlicher)",
    titleDe:
      "Organisationsstruktur, Verantwortlichkeiten und Ressourcen (Ausfuhrverantwortlicher)",
    summary:
      "A designated compliance lead with clear authority, documented organisation chart, and chain of escalation.",
    items: [
      {
        id: "E2-01",
        title: "Empowered Official / Ausfuhrverantwortlicher named",
        guidance:
          "A specific natural person designated in writing with the authority to sign export declarations and stop shipments.",
        mandatory: true,
        autoSatisfyScalars: ["empoweredOfficialName"],
        citation:
          "EU 2019/1318 Annex Pt. 2 (a) — 'Designation of a senior individual responsible for the ICP.' BAFA Merkblatt: Ausfuhrverantwortlicher pursuant to § 8 KrWaffKontrG / § 17 AWG.",
      },
      {
        id: "E2-02",
        title: "Contact data for the Empowered Official on file",
        guidance:
          "Title, business email (encrypted at rest is fine), and direct phone — BAFA may need to reach the EO during an audit.",
        mandatory: true,
        autoSatisfyScalars: [
          "empoweredOfficialEmailEnc",
          "empoweredOfficialTitle",
        ],
        citation:
          "EU 2019/1318 Annex Pt. 2 (b) — 'Responsibilities clearly assigned.'",
      },
      {
        id: "E2-03",
        title: "Organisation chart with export-control roles",
        guidance:
          "Documented chart showing the EO's reporting line and the compliance team's relationship to logistics, sales, R&D.",
        mandatory: false,
        citation:
          "EU 2019/1318 Annex Pt. 2 (c) — 'Documented organisational structure.'",
      },
      {
        id: "E2-04",
        title: "Procedure documentation in place",
        guidance:
          "A written ICP manual or equivalent set of standard operating procedures covering classification, screening, licensing and recordkeeping.",
        mandatory: true,
        autoSatisfyBooleans: ["hasTCP"],
        citation:
          "EU 2019/1318 Annex Pt. 2 (d) — 'Procedures established in writing.'",
      },
    ],
  },
  {
    id: "E3_TRAINING_AWARENESS",
    ordinal: 3,
    title: "Training and awareness raising",
    titleDe: "Schulung und Sensibilisierung",
    summary:
      "Periodic training for relevant staff, awareness materials, and tracking of completion.",
    items: [
      {
        id: "E3-01",
        title: "Annual export-control training plan",
        guidance:
          "A documented yearly training schedule with target audiences (sales, R&D, logistics, finance, executives).",
        mandatory: true,
        autoSatisfyScalars: ["nextTrainingDue"],
        citation:
          "EU 2019/1318 Annex Pt. 3 (a) — 'Regular training and awareness raising.'",
      },
      {
        id: "E3-02",
        title: "Training completion tracked",
        guidance:
          "Records of who completed which training session, at what date, with attendance proof.",
        mandatory: true,
        autoSatisfyScalars: ["lastTrainingDate", "trainingCompletionRate"],
        citation:
          "EU 2019/1318 Annex Pt. 3 (b) — 'Training records maintained.'",
      },
      {
        id: "E3-03",
        title: "Training content covers current regulation",
        guidance:
          "Material reflects EU 2021/821 (replaces 428/2009), current Annex I update, ongoing Russia/Belarus sanctions packages, recent BAFA Sammelmerkblätter.",
        mandatory: false,
        citation: "EU 2019/1318 Annex Pt. 3 (c) — 'Training kept up to date.'",
      },
    ],
  },
  {
    id: "E4_TRANSACTION_SCREENING",
    ordinal: 4,
    title: "Transaction screening process and procedures",
    titleDe: "Verfahren zur Transaktionsprüfung",
    summary:
      "Item classification, end-user / end-use checks, denied-party screening, red-flag triage, and embargo / catch-all evaluation.",
    items: [
      {
        id: "E4-01",
        title: "Item classification process documented",
        guidance:
          "A written procedure for assigning Annex I / CCL / USML / German AL codes to products and tracking their jurisdiction.",
        mandatory: true,
        autoSatisfyScalars: ["jurisdictionDetermination"],
        citation: "EU 2019/1318 Annex Pt. 4 (a) — 'Product classification.'",
      },
      {
        id: "E4-02",
        title: "Denied-party screening before every shipment",
        guidance:
          "Automated or manual screening against OFAC SDN, EU Consolidated, UK OFSI, UN Consolidated, DDTC Debarred and (for Russia/Belarus) EU Annex IV.",
        mandatory: true,
        autoSatisfyBooleans: ["hasAutomatedScreening"],
        autoSatisfyScalars: ["screeningVendor"],
        citation:
          "EU 2019/1318 Annex Pt. 4 (b) — 'Screening of parties.' Reinforced by Regulation 833/2014 Art. 12 (anti-circumvention).",
      },
      {
        id: "E4-03",
        title: "End-use / end-user assessment for sensitive transactions",
        guidance:
          "Documented EUS for shipments where the operator has reason to suspect WMD, military, or human-rights concerns. EUC collection per BAFA C1/C6/C7 templates.",
        mandatory: true,
        citation: "EU 2019/1318 Annex Pt. 4 (c) — 'End-use / end-user check.'",
      },
      {
        id: "E4-04",
        title: "Catch-all / red-flag procedure",
        guidance:
          "Written procedure for evaluating Art. 4 (WMD/military), Art. 5 (cyber), § 9(1) and § 9(2) AWV triggers; documented escalation when fired.",
        mandatory: true,
        citation:
          "EU 2019/1318 Annex Pt. 4 (d) — 'Catch-all assessment.' Aligned with Art. 4 EU 2021/821 and § 9 AWV.",
      },
    ],
  },
  {
    id: "E5_PERFORMANCE_REVIEW",
    ordinal: 5,
    title: "Performance review, audits, reporting and corrective actions",
    titleDe: "Leistungsüberprüfung, Audits, Berichte und Korrekturmaßnahmen",
    summary:
      "Periodic ICP audit, performance KPIs, internal reporting, and a documented corrective-action loop including voluntary self-disclosure where appropriate.",
    items: [
      {
        id: "E5-01",
        title: "Periodic ICP audit conducted",
        guidance:
          "Internal or external audit of the ICP at least annually (BAFA recommends every 12 months; some operators do it semi-annually).",
        mandatory: true,
        autoSatisfyScalars: ["lastAuditDate", "nextAuditDue"],
        citation: "EU 2019/1318 Annex Pt. 5 (a) — 'Periodic audits.'",
      },
      {
        id: "E5-02",
        title: "Audit findings documented and tracked",
        guidance:
          "Findings logged with assigned owner, target date, and resolution evidence.",
        mandatory: true,
        autoSatisfyScalars: ["lastAuditFindings"],
        citation: "EU 2019/1318 Annex Pt. 5 (b) — 'Audit findings tracked.'",
      },
      {
        id: "E5-03",
        title: "Voluntary self-disclosure process in place",
        guidance:
          "Written procedure for escalating suspected violations to BAFA / DDTC / BIS / OFAC, including the 60-day OFAC clock and the BIS § 764.5 'as soon as possible' standard.",
        mandatory: false,
        autoSatisfyBooleans: ["hasVoluntaryDisclosures"],
        citation:
          "EU 2019/1318 Annex Pt. 5 (c) — 'Reporting and corrective action.'",
      },
    ],
  },
  {
    id: "E6_RECORDKEEPING",
    ordinal: 6,
    title: "Recordkeeping and documentation",
    titleDe: "Aufzeichnungen und Dokumentation",
    summary:
      "Retention of classification rationales, licence applications, screening results, EUCs, audit reports and training records for the statutory period.",
    items: [
      {
        id: "E6-01",
        title: "Documentation retention policy",
        guidance:
          "Written policy specifying retention periods — at least 5 years for licences and EUCs per Art. 27 EU 2021/821; longer where national law requires (DE: 7 years per § 22(2) AWV).",
        mandatory: true,
        citation:
          "EU 2019/1318 Annex Pt. 6 (a) — 'Records maintained.' Art. 27 EU 2021/821; § 22(2) AWV.",
      },
      {
        id: "E6-02",
        title: "Licence and EUC archive accessible to BAFA",
        guidance:
          "Licences (BAFA, DDTC, BIS) and end-user certificates stored such that BAFA inspectors can retrieve any record within 24 hours.",
        mandatory: true,
        citation:
          "EU 2019/1318 Annex Pt. 6 (b) — 'Records accessible to authorities.'",
      },
      {
        id: "E6-03",
        title: "Classification rationale stored for each controlled item",
        guidance:
          "For every classified item, the technical-attribute set + predicate trail that led to the Annex I / CCL / USML / AL code (Caelex Z3 cross-walk output).",
        mandatory: false,
        citation: "EU 2019/1318 Annex Pt. 6 (c) — 'Rationale preserved.'",
      },
    ],
  },
  {
    id: "E7_PHYSICAL_INFORMATION_SECURITY",
    ordinal: 7,
    title: "Physical and information security",
    titleDe: "Physische Sicherheit und Informationssicherheit",
    summary:
      "Access controls, technology-transfer controls (incl. deemed exports), encryption of sensitive data, and information-security baseline (NIS2-aligned where applicable).",
    items: [
      {
        id: "E7-01",
        title: "Controlled access to ITAR/EAR/Annex-I technology",
        guidance:
          "Badge readers, locked rooms, network segmentation — physical and logical controls preventing unauthorized access to controlled technology.",
        mandatory: true,
        citation:
          "EU 2019/1318 Annex Pt. 7 (a) — 'Physical security measures.'",
      },
      {
        id: "E7-02",
        title: "Deemed-export controls for foreign nationals",
        guidance:
          "Nationality screening for access to ITAR-controlled technology by non-US persons in the EU; foreign-national tracking with relevant national policy.",
        mandatory: false,
        citation:
          "22 CFR § 120.17(a)(2) — Deemed exports. 15 CFR § 734.13 — EAR deemed-export concept.",
      },
      {
        id: "E7-03",
        title:
          "Information-security baseline (encryption at rest + in transit)",
        guidance:
          "AES-256 at rest for sensitive ITAR/EAR documents, TLS 1.2+ in transit, audit trail on access. NIS2-aligned where the operator is in scope.",
        mandatory: true,
        citation:
          "EU 2019/1318 Annex Pt. 7 (b) — 'Information security measures.' Aligned with NIS2 (EU 2022/2555) where applicable.",
      },
    ],
  },
];

// ─── Convenience helpers ────────────────────────────────────────────

/** Total count of check items across all seven elements. */
export const ICP_ITEM_COUNT = ICP_ELEMENTS.reduce(
  (sum, e) => sum + e.items.length,
  0,
);

/** Total count of MANDATORY check items. */
export const ICP_MANDATORY_ITEM_COUNT = ICP_ELEMENTS.reduce(
  (sum, e) => sum + e.items.filter((i) => i.mandatory).length,
  0,
);

/** Quick lookup by element ID. */
export const ICP_ELEMENT_BY_ID: Record<ICPElementId, ICPElement> =
  Object.fromEntries(ICP_ELEMENTS.map((e) => [e.id, e])) as Record<
    ICPElementId,
    ICPElement
  >;

/** Quick lookup by item ID (across all elements). */
export const ICP_ITEM_BY_ID: Record<string, ICPCheckItem> = Object.fromEntries(
  ICP_ELEMENTS.flatMap((e) => e.items.map((i) => [i.id, i] as const)),
);
