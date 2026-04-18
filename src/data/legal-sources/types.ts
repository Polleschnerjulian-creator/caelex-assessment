// src/data/legal-sources/types.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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
