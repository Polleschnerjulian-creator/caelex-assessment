/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Type definitions for the Atlas case law / enforcement-action knowledge
 * base. Sits alongside `legal-sources/` and shares the `ComplianceArea`
 * vocabulary so that both surfaces are filterable by the same axes.
 *
 * A "case" here is broader than a court judgment — it covers court
 * rulings, regulator settlements, civil penalties, administrative
 * decisions, and binding arbitral awards. What unites them is that
 * each entry establishes a precedent or enforcement-pattern that
 * informs how a legal source is *actually* applied in practice.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ComplianceArea } from "../legal-sources/types";

// ─── Enums ──────────────────────────────────────────────────────────

/**
 * The institutional context in which the matter was decided.
 * `treaty_award` covers Liability-Convention awards (Cosmos-954, etc.)
 * even though those are technically inter-state diplomatic settlements
 * — they have precedential weight in space law commentary.
 */
export type CaseForum =
  | "court"
  | "regulator_order"
  | "regulator_settlement"
  | "criminal_settlement"
  | "civil_settlement"
  | "treaty_award"
  | "administrative_appeal"
  | "arbitral_award";

export type CaseStatus =
  | "decided"
  | "settled"
  | "pending"
  | "withdrawn"
  | "vacated"
  | "appeal_pending";

export type PrecedentialWeight =
  | "binding" // Authoritative for the relevant jurisdiction.
  | "persuasive" // Frequently cited but not binding outside its forum.
  | "settled_facts" // Settlement — establishes regulator practice but no legal holding.
  | "non_precedential" // Administrative-only, no broader applicability.
  | "treaty_only"; // Diplomatic / inter-state — informs commentary, not domestic courts.

// ─── Interfaces ─────────────────────────────────────────────────────

export interface CaseRemedy {
  /** Did the matter result in a money payment? */
  monetary: boolean;
  /** Civil-penalty / damages / forfeiture / settlement amount, in USD-equivalent if monetary. */
  amount_usd?: number;
  /** Original currency for the award if not USD. */
  amount_local?: { currency: string; amount: number };
  /** Non-monetary remedies (revocation, injunction, undertaking, debarment). */
  non_monetary?: string[];
}

export interface LegalCase {
  /** Stable identifier — `CASE-` prefix. */
  id: string;

  /** Primary jurisdiction whose law governs (ISO-alpha-2, "INT", or "EU"). */
  jurisdiction: string;

  /** Court / regulator / forum that decided the matter. */
  forum: CaseForum;

  /** Forum name in English — e.g. "U.S. Federal Communications Commission". */
  forum_name: string;

  /** Case caption / canonical title. */
  title: string;

  /** Plaintiff / complainant / regulator. */
  plaintiff: string;

  /** Defendant / respondent / licensee. */
  defendant: string;

  /** ISO date of the decision / settlement / order. */
  date_decided: string;

  /** ISO date the matter was filed (if known). */
  date_filed?: string;

  /** Formal citation — e.g. "FCC 18-138", "Settlement Agreement, In re ITT Corp.". */
  citation?: string;

  /** Internal docket / case number. */
  case_number?: string;

  /** Status of the matter at last verification. */
  status: CaseStatus;

  /** 1–2 paragraph plain-English summary of the facts. */
  facts: string;

  /** What the forum actually decided / agreed. */
  ruling_summary: string;

  /** The legal holding distilled to one or two sentences. */
  legal_holding: string;

  /** Remedies imposed / agreed. */
  remedy?: CaseRemedy;

  /** Why this matters for operators today. */
  industry_significance: string;

  /** Compliance areas the matter touches. */
  compliance_areas: ComplianceArea[];

  /** Precedential weight. */
  precedential_weight: PrecedentialWeight;

  /**
   * Legal-source IDs (matching `LegalSource.id` in the legal-sources/
   * dataset) that the matter applied or interpreted. This is the join
   * column linking case law to statute.
   */
  applied_sources: string[];

  /** Operators / companies whose name appears in the case. */
  parties_mentioned?: string[];

  /** Direct link to the official decision / order text (or best public source). */
  source_url: string;

  /** Free-form notes — historical context, follow-on litigation, dissent. */
  notes?: string[];

  /** Date the entry was last verified against authoritative source. */
  last_verified: string;
}
