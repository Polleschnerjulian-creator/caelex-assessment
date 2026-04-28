// src/data/legal-sources/types.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Legal source type definitions for the multi-jurisdiction regulatory
 * knowledge base. These types are the contract between jurisdiction
 * data files and the lookup/rendering layer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Enums ───────────────────────────────────────────────────────────

export type LegalSourceType =
  | "international_treaty"
  | "federal_law"
  | "federal_regulation"
  | "technical_standard"
  | "eu_regulation"
  | "eu_directive"
  | "policy_document"
  | "draft_legislation";

export type LegalSourceStatus =
  | "in_force"
  | "draft"
  | "proposed"
  | "superseded"
  | "planned"
  | "not_ratified"
  | "expired";

export type RelevanceLevel =
  | "fundamental"
  | "critical"
  | "high"
  | "medium"
  | "low";

export type ComplianceArea =
  | "licensing"
  | "registration"
  | "liability"
  | "insurance"
  | "cybersecurity"
  | "export_control"
  | "data_security"
  | "frequency_spectrum"
  | "environmental"
  | "debris_mitigation"
  | "space_traffic_management"
  | "human_spaceflight"
  | "military_dual_use";

export type OperatorApplicability =
  | "satellite_operator"
  | "launch_provider"
  | "ground_segment"
  | "data_provider"
  | "in_orbit_services"
  | "constellation_operator"
  | "space_resource_operator"
  | "all";

// ─── Interfaces ──────────────────────────────────────────────────────

export interface KeyProvision {
  section: string;
  title: string;
  summary: string;
  complianceImplication?: string;

  /**
   * Verbatim statutory text — the actual paragraph as enacted, with
   * minimal editorial intervention (paragraph numbers preserved,
   * footnote markers stripped). Optional because backfilling 5 000+
   * provisions is a content-sprint job; we ship the lawyer-facing
   * "show me the law's own words" affordance for the top-citation
   * provisions and grow coverage from there.
   *
   * When present, the source-detail page renders an "Original-
   * Wortlaut" expandable section, and the [ATLAS-…] citation pill
   * hover-card shows the first ~300 characters with an "Open
   * official text" deep-link.
   *
   * Provenance contract: ALWAYS quote from the official consolidated
   * text linked at `paragraph_url` (or the parent `source_url`).
   * Never paraphrase. If a paragraph is too long for inline display,
   * include the canonical opening sentence(s) plus an ellipsis and
   * keep `paragraph_url` populated so the partner can read on.
   */
  paragraph_text?: string;

  /**
   * Deep-link to the official text of THIS specific paragraph
   * (preferred) or to the section anchor on the consolidated act.
   * Falls back to `LegalSource.source_url` at render time when
   * absent. Examples: an EUR-Lex article anchor, a CFR section URL,
   * a Bundestag-PDF page-anchor.
   */
  paragraph_url?: string;
}

/**
 * A dated amendment to a law or regulation. Captures what changed,
 * when, and points back to the official amending instrument.
 */
export interface Amendment {
  /** ISO date when the amendment entered into force. */
  date: string;
  /** Parliamentary/official reference for the amending instrument
   *  (e.g. "BGBl. I 2023 p. 417", "SI 2023/503", "COM(2024) 191"). */
  reference: string;
  /** One-line human summary of what changed. */
  summary: string;
  /** Optional list of affected articles/sections. */
  affected_sections?: string[];
  /** Direct link to the amending instrument's official text. */
  source_url?: string;
}

/**
 * Type of milestone in a law's legislative history. The vocabulary
 * covers the typical lifecycle from "first proposed" through "in
 * force" and beyond. UI maps each type to a tone (grey for proposal
 * stages, emerald for in-force, red for repealed) and to a label
 * localised per language.
 *
 * Values cover both EU/national legislative procedures and UN-treaty
 * lifecycles — the same field rendered differently per jurisdiction.
 */
export type LegislativeMilestoneType =
  // ─── Pre-adoption ─────────────────────────────────────────────────
  | "proposal" // Bill/proposal introduced (BT-Drucksache, COM document)
  | "first_reading" // First parliamentary reading
  | "committee_review" // Committee/rapporteur stage
  | "council_position" // Council general approach (EU)
  | "second_reading" // Second parliamentary reading
  | "trilogue" // EU trilogue negotiations
  | "interservice" // Cross-ministry consultation (DE Ressortabstimmung etc.)
  | "consultation" // Public/stakeholder consultation
  // ─── Adoption ─────────────────────────────────────────────────────
  | "adoption" // Formally adopted/passed/voted through
  | "presidential_signature" // Federal-President signature (DE), Royal Assent (UK), Presidential signing (US)
  | "promulgation" // Published in the official gazette (BGBl., OJ, BOE, …)
  // ─── Post-adoption ────────────────────────────────────────────────
  | "in_force" // Entered into force / commencement
  | "transition_phase" // Transitional regime in effect, full provisions phased in
  | "amendment" // Subsequent amending act
  | "consolidation" // Consolidated/codified version released
  | "implementation_act" // National transposition (for EU directives) or implementing regulation
  // ─── Treaty-specific ──────────────────────────────────────────────
  | "signed" // Treaty opened for signature / first signatures
  | "ratification" // Specific country ratifies
  | "deposit" // Instruments deposited with depositary
  | "entry_into_force_treaty" // Treaty enters into force globally
  // ─── Termination ──────────────────────────────────────────────────
  | "repeal" // Formally repealed
  | "supersession" // Superseded by a successor instrument
  | "sunset"; // Automatic expiry date reached

/**
 * Issuing body / actor responsible for a milestone — drives the
 * "by whom" line in the timeline. Free-form string because the
 * exact body name varies by jurisdiction (Bundestag, Bundesrat,
 * European Parliament, ITRE Committee, Conseil constitutionnel,
 * UN Secretary-General, etc.). Render as-is — do not translate.
 */
export type LegislativeBody = string;

/**
 * One step in a law's legislative history. The collection
 * `LegalSource.legislative_history` is intended to be the canonical
 * "this is how this law came to be" timeline that lawyers consult
 * to argue from legislative intent — distinct from `amendments[]`
 * which only tracks post-adoption changes.
 *
 * Provenance: every entry should be backed by a source-URL pointing
 * at the official document (BT-Drucksache, COM-document, BGBl. issue,
 * EUR-Lex procedure file, Bundestag video archive, etc.) so a lawyer
 * who clicks through lands on the canonical record, not a Caelex
 * paraphrase. Description is Caelex-curated but flagged as such in
 * the UI.
 */
export interface LegislativeMilestone {
  /** ISO date of the milestone. For dated-but-not-day-precise events
   *  (e.g. "October 2024 — committee phase"), use the first day of
   *  the month and disclose the granularity in `description`. */
  date: string;

  /** Milestone-type — drives icon + tone in the UI. */
  type: LegislativeMilestoneType;

  /** Issuing body / actor (Bundestag, EP-ITRE, Council, UN-SG, etc.).
   *  Free-form, render verbatim. */
  body: LegislativeBody;

  /** Parliamentary / official reference. Examples:
   *  - "BT-Drucksache 20/12345"
   *  - "COM(2025) 335 final"
   *  - "Council doc. 12345/24"
   *  - "BGBl. I 2024 S. 234"
   *  - "OJ EU L 2026/xxx"
   *  - "UN doc. A/RES/2222 (XXI)"
   *  Optional because not every step has a published reference. */
  reference?: string;

  /** Caelex-authored 1-sentence description of what happened in this
   *  step. Marked as Caelex-curated in the UI. Omit when the type +
   *  body + reference combination already self-explains (e.g. an
   *  `in_force` entry with a date is self-explanatory). */
  description?: string;

  /** Direct link to the official record of this step. STRONGLY
   *  preferred — without a URL, the entry is harder for a lawyer to
   *  audit. Use the canonical archive URL when available. */
  source_url?: string;

  /** Optional articles/sections especially affected by this step.
   *  Useful for amendment milestones where only specific provisions
   *  changed. */
  affected_sections?: string[];
}

export interface LegalSource {
  id: string;
  jurisdiction: string;
  type: LegalSourceType;
  status: LegalSourceStatus;

  title_en: string;
  title_local?: string;

  date_enacted?: string;
  date_in_force?: string;
  date_last_amended?: string;
  date_published?: string;

  official_reference?: string;
  parliamentary_reference?: string;
  un_reference?: string;
  source_url: string;

  issuing_body: string;
  competent_authorities: string[];

  relevance_level: RelevanceLevel;
  applicable_to: OperatorApplicability[];
  compliance_areas: ComplianceArea[];

  key_provisions: KeyProvision[];
  scope_description?: string;

  related_sources: string[];
  amends?: string;
  amended_by?: string[];
  implements?: string;
  superseded_by?: string;

  caelex_engine_mapping?: string[];
  caelex_data_file_mapping?: string[];

  /**
   * Chronological amendment history. Most-recent-first is the
   * render convention; the UI sorts by date descending regardless.
   */
  amendments?: Amendment[];

  /**
   * Full legislative-history timeline — covers the lifecycle of the
   * law from first proposal through committee, adoption, promulgation,
   * commencement, and any later amendments. Distinct from
   * `amendments[]` (which is post-adoption-only) and richer than
   * `date_enacted` / `date_in_force` (which are single milestones).
   *
   * Sparsely populated: only "showcase" laws have full timelines for
   * the first ship. Backfilled progressively. Entries with `type ===
   * 'amendment'` should also appear in `amendments[]` for backward
   * compatibility — the timeline is the new canonical surface, the
   * legacy `amendments[]` array stays for the redline / cron-detected
   * change-history view.
   *
   * UI: rendered as a vertical timeline above the key-provisions
   * section on `/atlas/sources/[id]`.
   */
  legislative_history?: LegislativeMilestone[];

  /**
   * For jurisdiction "INT" or "EU" records: list of ISO-alpha-2 country
   * codes that have ratified/are party to / are bound by this instrument.
   * Allows the UI to surface "Applies to this jurisdiction" on country
   * detail pages without duplicating the instrument across country files.
   */
  applies_to_jurisdictions?: string[];

  /**
   * Countries that have signed but not ratified the instrument.
   * Separately tracked from applies_to_jurisdictions so UI can show
   * "Signatory only" status differently from "Party" status.
   */
  signed_by_jurisdictions?: string[];

  notes?: string[];
  last_verified: string;
}

export interface Authority {
  id: string;
  jurisdiction: string;
  name_en: string;
  name_local: string;
  abbreviation: string;
  parent_ministry?: string;
  website: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  space_mandate: string;
  legal_basis?: string;
  applicable_areas: ComplianceArea[];
}

// ─── Jurisdiction Data Bundle ────────────────────────────────────────

export interface JurisdictionLegalData {
  jurisdiction: string;
  sources: LegalSource[];
  authorities: Authority[];
}
