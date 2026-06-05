/**
 * Caelex Trade — Astra knowledge overview of all Trade features
 * shipped after Astra's original setup. This file is the single
 * source-of-truth for Astra's understanding of post-T8 Trade
 * functionality and is injected into the Trade-context system
 * prompt as `TRADE_FEATURES_SUMMARY`.
 *
 * Each entry contains:
 *   - `name`: human-readable feature name
 *   - `regulationAnchor`: the CFR / EU regulation / national law
 *     anchor Astra should cite when discussing the feature
 *   - `summary`: 2-3 sentence description Astra paraphrases when
 *     asked what the feature does
 *   - `examples`: 1-2 example operator questions Astra is now
 *     equipped to answer with this feature
 *   - `pagePath`: the Caelex UI route operators visit to use the
 *     feature (Astra references this in answers)
 *   - `astraTools` (optional): Astra tools that wrap this feature
 *
 * Adding a new entry: append to TRADE_FEATURE_ENTRIES then run the
 * test suite — the system-prompt test verifies every entry name is
 * referenced in the Trade summary text.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface TradeFeatureEntry {
  /** Short identifier used by Astra in CTAs (kebab-case). */
  id: string;
  /** Human-readable name shown in chat answers. */
  name: string;
  /** CFR / EU / national-law anchor for citations. */
  regulationAnchor: string;
  /** 2-3 sentence summary Astra uses verbatim or paraphrases. */
  summary: string;
  /** 1-2 example questions Astra should now answer. */
  examples: string[];
  /** Caelex UI route operators visit (always starts with `/trade/`). */
  pagePath: string;
  /** Optional list of Astra tools that wrap this feature. */
  astraTools?: string[];
}

export const TRADE_FEATURE_ENTRIES: readonly TradeFeatureEntry[] = [
  // ─── 1. VSD PDF generation ──────────────────────────────────────
  {
    id: "vsd-pdf",
    name: "VSD PDF Generation (OFAC / BIS / DDTC)",
    regulationAnchor:
      "31 CFR § 501.601 (OFAC), 15 CFR § 764.5 (BIS), 22 CFR § 127.12 (DDTC)",
    summary:
      "Generates regulator-ready Voluntary Self-Disclosure PDFs for the three US export-control / sanctions agencies. Operator picks template (OFAC initial / BIS initial / DDTC initial), Astra renders a complete PDF with cover narrative, facts, root-cause, remedial steps, and citation footer.",
    examples: [
      "Draft a VSD for shipping a 9A515.a part to a non-listed Polish end-user",
      "What goes into an OFAC voluntary self-disclosure?",
    ],
    pagePath: "/trade/vsd",
  },

  // ─── 2. Sammelgenehmigung Lifecycle ─────────────────────────────
  {
    id: "sammelgenehmigung",
    name: "Sammelgenehmigung Lifecycle (BAFA bulk authorisation)",
    regulationAnchor: "§ 8 AWG, §§ 4-5 AWV, BAFA Allgemeine Genehmigungen",
    summary:
      "Tracks BAFA Sammelgenehmigungen (bulk export authorisations) through DRAFT → ACTIVE → EXHAUSTED / EXPIRED with full draw-down accounting. Each shipment can be debited against an active SAG up to its EUR cap; the engine surfaces remaining capacity and matching SAGs for a given (ECCN, destination, end-user).",
    examples: [
      "Do I have an active Sammelgenehmigung covering 9A515.a to FR for €50k?",
      "How much capacity remains on SAG BAFA-2026-EU-001?",
    ],
    pagePath: "/trade/sammelgenehmigungen",
    astraTools: ["find_covering_license"],
  },

  // ─── 3. Deemed Export Controls ──────────────────────────────────
  {
    id: "deemed-export",
    name: "Deemed Export Controls (in-country foreign-national access)",
    regulationAnchor: "15 CFR § 734.13 (EAR), 22 CFR § 120.50 (ITAR)",
    summary:
      "Models in-country technology / source-code release to foreign-national employees as a 'deemed export'. Each TradeDeemedExportAuthorization row covers a (foreign national, technology class) tuple; when a Trade operation has `hasForeignNationalAccess=true` and references controlled tech, the engine cross-references active authorisations and flags coverage gaps as licensing-required.",
    examples: [
      "Is a deemed-export licence required if our French engineer accesses ITAR source code in Munich?",
      "Which of our open operations need a deemed-export authorization?",
    ],
    pagePath: "/trade/deemed-exports",
  },

  // ─── 4. Supplement No. 2 Workflow ───────────────────────────────
  {
    id: "supplement-2",
    name: "Supplement No. 2 Reporting (high-performance computer)",
    regulationAnchor: "15 CFR Part 743 Supplement No. 2",
    summary:
      "Aggregates HPC / advanced-computing exports across a calendar quarter into the BIS Supplement No. 2 one-time report. Eligible ECCNs (3A090 / 4A090 / 4D090 / 4E001.c subsets) trigger automatic snapshot rows; the report is filed once per period with semi-annual cadence per § 743.9.",
    examples: [
      "Do I need to file a Supplement No. 2 report this quarter?",
      "Which ECCNs trigger Supplement No. 2 reporting?",
    ],
    pagePath: "/trade/reports/supplement-2",
  },

  // ─── 5. AUKUS 9A515 Overlay ─────────────────────────────────────
  {
    id: "aukus-overlay",
    name: "AUKUS 9A515 License-Free Overlay",
    regulationAnchor:
      "15 CFR § 740.2(a)(7) (AUS), 15 CFR § 740.20 (STA-AUKUS), Defense Production Act AUKUS amendments 2024",
    summary:
      "Detects when an export of 9A515.x to Australia, UK, or Canada qualifies for the AUS or STA-AUKUS licence-exception overlay. The engine checks counterparty type (AUKUS-eligible), end-use restrictions, and the Supplement No. 5 carve-out list before declaring 'no licence required'.",
    examples: [
      "Can I ship 9A515.a to an AU government end-user under AUKUS exemption?",
      "What disqualifies a shipment from STA-AUKUS coverage?",
    ],
    pagePath: "/trade/operations",
  },

  // ─── 6. DCS Generator ───────────────────────────────────────────
  {
    id: "dcs",
    name: "Destination Control Statement Generator",
    regulationAnchor: "15 CFR § 758.6",
    summary:
      "Pure-function generator that emits the regulator-mandated Destination Control Statement for inclusion on shipping documents (commercial invoice, bill of lading, air waybill). Auto-detects 9x515 / 600-series ECCNs and switches to the extended § 758.6(b) language; refuses to emit when the upstream cascade declared DCS not-required.",
    examples: [
      "Generate the DCS text for operation OP-2026-Q2-007",
      "What's the difference between § 758.6(a) and (b) statements?",
    ],
    pagePath: "/trade/operations",
    astraTools: ["generate_dcs"],
  },

  // ─── 7. OFAC Sham-Transaction Doctrine ──────────────────────────
  {
    id: "ofac-sham-doctrine",
    name: "OFAC Sham-Transaction Doctrine Detector",
    regulationAnchor:
      "31 CFR § 501.601, OFAC Sanctions Advisory of 31 March 2026 (Guidance on Sham Transactions and Sanctions Evasion)",
    summary:
      "Scans a Trade operation for the six OFAC sham-transaction red flags: indirect ownership chain (UBO depth > 3), shell-company markers, geography mismatch, payment-routing divergence, pricing anomaly, and re-export risk history. Emits a 0-100 risk score, categorical recommendation (PROCEED / EDD / ESCALATE / REJECT), and skipped-checks list with enforcement-action citations.",
    examples: [
      "Run sham-transaction risk on operation OP-2026-Q2-007",
      "Why did Caelex flag this counterparty under the OFAC sham doctrine?",
    ],
    pagePath: "/trade/operations",
    astraTools: ["evaluate_sham_risk"],
  },

  // ─── 8. BAFA ELAN-K2 XML Export ─────────────────────────────────
  {
    id: "elan-k2-xml",
    name: "BAFA ELAN-K2 XML Export",
    regulationAnchor: "§ 22 AWV, BAFA ELAN-K2 portal specification",
    summary:
      "Generates the BAFA ELAN-K2 XML filing payload for German export operations, including all mandatory antragsteller / counterparty / item / value / end-use fields. The XML is ready to upload to the BAFA portal — Caelex never auto-submits, the operator uploads in ELAN-K2.",
    examples: [
      "Export my Q2 operations as an ELAN-K2 XML batch",
      "What fields does BAFA's ELAN-K2 portal require?",
    ],
    pagePath: "/trade/operations",
  },

  // ─── 9. ATLAS DE + AES US Customs Filing ────────────────────────
  {
    id: "customs-filing",
    name: "ATLAS DE + AES US Customs Filing Payloads",
    regulationAnchor:
      "§ 11 AWV (ATLAS, DE), 15 CFR § 30.1 et seq. (AES / EEI, US)",
    summary:
      "Generates customs-filing payloads for German ATLAS-Ausfuhr and US AES (Automated Export System) per-operation. Mandatory fields (HS code, ECCN, value, weight, exporter EORI / EIN, consignee, destination, end-use) are pre-filled from the TradeOperation. Operator copies the payload into ATLAS / AESDirect; no auto-submission.",
    examples: [
      "Generate the ATLAS payload for operation OP-2026-Q3-014",
      "What's an AES filing and when do I need it?",
    ],
    pagePath: "/trade/operations",
  },

  // ─── 10. Predictive Licence-Time Analytics ──────────────────────
  {
    id: "license-analytics",
    name: "Predictive Licence-Time Analytics",
    regulationAnchor:
      "BIS Annual Report Tables 3-5, DDTC Statistical Report Annex II, BAFA Jahresbericht Tabelle 4, ECJU SDR Quarterly Report",
    summary:
      "Bayesian-blended predictor that returns p25 / median / p75 calendar days to approval for a draft licence application, keyed by (authority × form-type × destination-group × ECCN bucket). When the org has > 5 historical samples for the same (authority, destination), the industry baseline is blended with the org-specific median.",
    examples: [
      "How long will a BIS standard licence to China for 9A515.a take?",
      "What's the typical BAFA Einzelgenehmigung processing time for EU destinations?",
    ],
    pagePath: "/trade/licenses",
    astraTools: ["predict_license_time"],
  },

  // ─── 11. Z23-Z28 Tier-3 Ontology Depth ──────────────────────────
  {
    id: "ontology-tier3",
    name: "Tier-3 Classification Ontology Depth (Z23-Z28)",
    regulationAnchor:
      "22 CFR § 121.1 (USML XV), 15 CFR Part 774 Cat. 3/4/5/6/7 + 9, Wassenaar 6/9, MTCR Cat. I (9A101-9A121), AM entries",
    summary:
      "Extends the classification engine with full-depth USML XV(a)-(f) decomposition, EU Annex I categories 3-7, Wassenaar Cat. 6 + 9, MTCR Cat. I (9A101-9A121), AM entries, suffix-digit correlator, and an order-of-review auto-trump (USML > MTCR > Wassenaar > EU dual-use > EAR99). Operators get precise multi-jurisdiction code suggestions instead of catch-all heuristics.",
    examples: [
      "Classify my X-band SAR antenna with 0.6 m aperture under USML and EU Annex I",
      "Does my Hall thruster fall under MTCR Cat. I or Cat. II?",
    ],
    pagePath: "/trade/classify",
  },

  // ─── 12. France LOS Authorisation ───────────────────────────────
  {
    id: "france-los",
    name: "France LOS Authorisation Lifecycle",
    regulationAnchor:
      "Loi n° 2008-518 du 3 juin 2008 (Loi sur les Opérations Spatiales), Décret n° 2009-643",
    summary:
      "Tracks French CNES LOS (Loi sur les Opérations Spatiales) authorisations for launch / re-entry / orbital operations through DRAFT → SUBMITTED → APPROVED with mandatory third-party liability and debris-mitigation supporting evidence. Cross-links to the launch-vehicle TradeOperation when applicable.",
    examples: [
      "Do I need a LOS authorisation if I launch from Kourou on a non-French vehicle?",
      "What documents are needed for a French CNES LOS application?",
    ],
    pagePath: "/trade/france-los",
  },

  // ─── 13. UK ECJU Licensing ──────────────────────────────────────
  {
    id: "uk-ecju",
    name: "UK ECJU Licensing (SIEL / OIEL / OGEL / SIEL-TC / OITCL)",
    regulationAnchor:
      "Export Control Order 2008 (UK), ECJU Notices to Exporters, UK Strategic Export Control Lists",
    summary:
      "Full UK ECJU licence lifecycle for SIEL (standard individual), OIEL (open individual), OGEL (open general), SIEL-TC (temporary control), and OITCL (open intra-Community transfer). Each licence type has its own validity ceiling, end-user requirement, and value-cap draw-down model. The find-covering query returns ACTIVE licences that match a (control-list entry, destination, end-user, value) request.",
    examples: [
      "Do I have an active SIEL covering PL5002.a to AU for £200k?",
      "What's the difference between OIEL and OGEL?",
    ],
    pagePath: "/trade/uk-ecju",
    astraTools: ["find_covering_license"],
  },

  // ─── 14. FAA AST Launch Licensing ───────────────────────────────
  {
    id: "faa-ast",
    name: "FAA AST Launch Licensing (Part 450)",
    regulationAnchor:
      "14 CFR Part 450 (Streamlined Launch + Reentry Licensing Requirements)",
    summary:
      "Tracks FAA Office of Commercial Space Transportation licences (Part 450 launch / re-entry / vehicle-operator licences, plus legacy Part 435 re-usable re-entry) with explicit Ec (maximum probability of casualty) threshold checking at § 450.101 (Ec ≤ 1.0×10⁻⁴ per mission). Operator may stash a draft above threshold but cannot advance to PRE_APP_CONSULTATION until Ec compliance is demonstrated.",
    examples: [
      "What Ec threshold applies under 14 CFR Part 450?",
      "Show me my FAA AST licences expiring this year",
    ],
    pagePath: "/trade/faa-ast",
  },

  // ─── 15. Caelex Comply Cross-Domain Bridge ──────────────────────
  {
    id: "comply-bridge",
    name: "Caelex Comply Cross-Domain Bridge",
    regulationAnchor:
      "EU Space Act Art. 31-37 (debris), Art. 27-30 (cybersecurity), Art. 16 (authorisation), ITU RR Art. 5 (spectrum)",
    summary:
      "Surfaces Trade-side compliance signals (license posture, screening hits, classification status) inside the Caelex Comply panels (Debris, Spectrum, Authorization). E.g., a missing export licence on a launch hardware item raises a flag inside the launch-authorisation workflow, not only inside Trade.",
    examples: [
      "Do my open Trade operations affect my authorisation-workflow readiness?",
      "Show Trade-side blockers on my launch readiness checklist",
    ],
    pagePath: "/dashboard/modules/authorization",
  },

  // ─── 16. 5-Year Recordkeeping Retention ─────────────────────────
  {
    id: "recordkeeping",
    name: "Recordkeeping 5-Year Retention",
    regulationAnchor:
      "15 CFR § 762.6 (BIS / EAR), 22 CFR § 122.5 (DDTC / ITAR)",
    summary:
      "Enforces the regulator-mandated 5-year retention window on Trade records (operations, licences, screenings, classifications, VSDs, customs filings). The retention engine sets `retainUntil` on every persisted row and emits a retention-status report so the operator can prove compliance during an audit; deletion is blocked until `retainUntil` passes.",
    examples: [
      "How long must I keep my export-licence records?",
      "Show me the retention status of last quarter's operations",
    ],
    pagePath: "/trade/audit-center",
  },

  // ─── 17. OpenSanctions + Orbis UBO Screening ────────────────────
  {
    id: "opensanctions-orbis",
    name: "Extended Sanctions Screening (OpenSanctions + Orbis UBO)",
    regulationAnchor:
      "31 CFR § 510 (OFAC 50%-rule), § 22 AWV (DE), EU Regulation 269/2014 (UBO transparency)",
    summary:
      "Z9 extends sanctions screening beyond OFAC SDN / BIS Entity List / DDTC Debarred to OpenSanctions consolidated lists (UN, EU, UK, AU, CA, Swiss) plus Orbis UBO chain enrichment. The 50%-rule cascade traverses the UBO graph upward and aggregates effective ownership from sanctioned ancestors; ≥50% combined ownership automatically blocks even when the direct counterparty's name doesn't match.",
    examples: [
      "Screen ICEYE Polska against all sanctions lists including OpenSanctions",
      "Who are the ultimate beneficial owners of counterparty XYZ?",
    ],
    pagePath: "/trade/parties",
    astraTools: ["check_sanctions_status"],
  },
] as const;

/**
 * Human-readable summary block injected into the Trade-context system
 * prompt. Generated from TRADE_FEATURE_ENTRIES so a new feature added
 * to the list above is automatically known to Astra after the next
 * deploy.
 */
export const TRADE_FEATURES_SUMMARY = `
## Trade-Side Features Astra Knows About (T9-Z32)

Astra has full awareness of the following Trade features, including
their CFR / regulation anchors and the Caelex UI page where operators
work with them. Cite the regulation anchor when discussing each
feature; link to the page path when proposing a CTA.

${TRADE_FEATURE_ENTRIES.map(
  (e, i) => `${i + 1}. **${e.name}** — ${e.regulationAnchor}
   ${e.summary.replace(/\s+/g, " ").trim()}
   Page: \`${e.pagePath}\`${e.astraTools && e.astraTools.length > 0 ? ` · Tools: ${e.astraTools.map((t) => `\`${t}\``).join(", ")}` : ""}`,
).join("\n\n")}

When an operator asks about any of these topics, prefer the dedicated
tool when one is listed, then cite the regulation anchor and the page
path. When no tool exists, summarise from this overview, cite the
anchor, and recommend the operator visit the page path for the full
workflow.
`;

/**
 * Lookup helper — find a Trade feature entry by id.
 */
export function getTradeFeatureById(id: string): TradeFeatureEntry | undefined {
  return TRADE_FEATURE_ENTRIES.find((e) => e.id === id);
}

/**
 * Lookup helper — list all Trade feature entries linked to a given
 * Astra tool name (used by the system prompt to cross-reference
 * tools ↔ features).
 */
export function getTradeFeaturesForTool(
  toolName: string,
): readonly TradeFeatureEntry[] {
  return TRADE_FEATURE_ENTRIES.filter((e) => e.astraTools?.includes(toolName));
}
