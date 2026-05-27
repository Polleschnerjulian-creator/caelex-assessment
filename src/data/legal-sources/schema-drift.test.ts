/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas Corpus Expansion — P0 Schema Drift Test (2026-05-26).
 *
 * Validates that every entry in ALL_SOURCES + ALL_AUTHORITIES uses
 * ONLY values from the canonical union types in `types.ts`. Catches:
 *
 *   - Typos in `compliance_areas` (e.g. "compliancce_area_typo")
 *   - Stale values that lingered after a union refactor
 *   - Authority entries using compliance areas not in the source-side union
 *
 * Runs in CI; fails fast if a developer adds a source with a value
 * the type-system somehow let through (e.g. via a cast).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { ALL_SOURCES, ALL_AUTHORITIES } from "./index";
import type {
  ComplianceArea,
  LegalSourceType,
  LegalSourceStatus,
  OperatorApplicability,
  RelevanceLevel,
} from "./types";

/* The canonical sets — must mirror the unions in `types.ts`. Updates
 * to types.ts MUST also update these sets in the same commit. */

const COMPLIANCE_AREAS: ReadonlySet<ComplianceArea> = new Set<ComplianceArea>([
  // Original 13
  "licensing",
  "registration",
  "liability",
  "insurance",
  "cybersecurity",
  "export_control",
  "data_security",
  "frequency_spectrum",
  "environmental",
  "debris_mitigation",
  "space_traffic_management",
  "human_spaceflight",
  "military_dual_use",
  // Atlas P0 — 16 additions (2026-05-26)
  "competition_antitrust",
  "state_aid",
  "procurement",
  "tax_customs",
  "sanctions_compliance",
  "ip_patents",
  "product_liability",
  "fdi_screening",
  "ai_compliance",
  "aml_kyc",
  "consumer_protection",
  "employment_labor",
  "scientific_research",
  "media_broadcasting",
  "critical_infrastructure",
  "sustainability_reporting",
]);

const SOURCE_TYPES: ReadonlySet<LegalSourceType> = new Set<LegalSourceType>([
  // Hard law
  "international_treaty",
  "federal_law",
  "federal_regulation",
  "eu_regulation",
  "eu_directive",
  // Standards
  "technical_standard",
  "certification_standard",
  "industry_guideline",
  "insurance_clause",
  "scientific_protocol",
  // Soft law
  "policy_document",
  "soft_law_resolution",
  "national_security_doctrine",
  // Bilateral / multilateral
  "bilateral_agreement",
  "multilateral_agreement",
  // Adjacent
  "case_law",
  "procurement_framework",
  "safety_regulation",
  "tax_treaty",
  // Pre-enactment
  "draft_legislation",
]);

const SOURCE_STATUSES: ReadonlySet<LegalSourceStatus> =
  new Set<LegalSourceStatus>([
    "in_force",
    "draft",
    "proposed",
    "superseded",
    "planned",
    "not_ratified",
    "expired",
  ]);

const OPERATOR_APPLICABILITIES: ReadonlySet<OperatorApplicability> =
  new Set<OperatorApplicability>([
    "satellite_operator",
    "launch_provider",
    "ground_segment",
    "data_provider",
    "in_orbit_services",
    "constellation_operator",
    "space_resource_operator",
    "all",
  ]);

const RELEVANCE_LEVELS: ReadonlySet<RelevanceLevel> = new Set<RelevanceLevel>([
  "fundamental",
  "critical",
  "high",
  "medium",
  "low",
]);

/* ── Sources ─────────────────────────────────────────────────────────── */

describe("Atlas corpus — schema drift safety", () => {
  it("ALL_SOURCES is non-empty (sanity: corpus loads)", () => {
    expect(ALL_SOURCES.length).toBeGreaterThan(0);
  });

  it("every source.type is in the LegalSourceType union", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      if (!SOURCE_TYPES.has(s.type)) {
        offenders.push(`${s.id}: type="${s.type}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every source.status is in the LegalSourceStatus union", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      if (!SOURCE_STATUSES.has(s.status)) {
        offenders.push(`${s.id}: status="${s.status}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every source.relevance_level is in the RelevanceLevel union", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      if (!RELEVANCE_LEVELS.has(s.relevance_level)) {
        offenders.push(`${s.id}: relevance_level="${s.relevance_level}"`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every entry in source.compliance_areas is in the ComplianceArea union", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      for (const area of s.compliance_areas) {
        if (!COMPLIANCE_AREAS.has(area)) {
          offenders.push(`${s.id}: compliance_areas contains "${area}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every entry in source.applicable_to is in the OperatorApplicability union", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      for (const op of s.applicable_to) {
        if (!OPERATOR_APPLICABILITIES.has(op)) {
          offenders.push(`${s.id}: applicable_to contains "${op}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every source has a unique id (no collisions)", () => {
    const ids = new Set<string>();
    const duplicates: string[] = [];
    for (const s of ALL_SOURCES) {
      if (ids.has(s.id)) duplicates.push(s.id);
      ids.add(s.id);
    }
    expect(duplicates).toEqual([]);
  });

  it("every source has non-empty compliance_areas (would be UI dead-weight)", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      if (s.compliance_areas.length === 0) {
        offenders.push(s.id);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("source.source_url is non-empty (lawyers need the canonical link)", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      if (!s.source_url || s.source_url.trim().length === 0) {
        offenders.push(s.id);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("source.last_verified is set + ISO-like (YYYY-MM-DD or YYYY-MM-DDT...)", () => {
    const offenders: string[] = [];
    for (const s of ALL_SOURCES) {
      if (!s.last_verified) {
        offenders.push(`${s.id}: missing last_verified`);
        continue;
      }
      if (!/^\d{4}-\d{2}-\d{2}/.test(s.last_verified)) {
        offenders.push(`${s.id}: last_verified="${s.last_verified}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

/* ── Authorities ─────────────────────────────────────────────────────── */

describe("Atlas corpus — authorities drift safety", () => {
  it("ALL_AUTHORITIES is non-empty", () => {
    expect(ALL_AUTHORITIES.length).toBeGreaterThan(0);
  });

  it("every entry in authority.applicable_areas is in the ComplianceArea union", () => {
    const offenders: string[] = [];
    for (const a of ALL_AUTHORITIES) {
      for (const area of a.applicable_areas) {
        if (!COMPLIANCE_AREAS.has(area)) {
          offenders.push(`${a.id}: applicable_areas contains "${area}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every authority has a unique id (no collisions)", () => {
    const ids = new Set<string>();
    const duplicates: string[] = [];
    for (const a of ALL_AUTHORITIES) {
      if (ids.has(a.id)) duplicates.push(a.id);
      ids.add(a.id);
    }
    expect(duplicates).toEqual([]);
  });
});

/* ── Schema-side invariants ─────────────────────────────────────────── */

describe("Atlas corpus — union cardinality (defensive checks)", () => {
  it("ComplianceArea union has 29 values (13 original + 16 Atlas P0)", () => {
    expect(COMPLIANCE_AREAS.size).toBe(29);
  });

  it("LegalSourceType union has 20 values (8 original + 12 Atlas P0)", () => {
    expect(SOURCE_TYPES.size).toBe(20);
  });

  it("LegalSourceStatus union has 7 values", () => {
    expect(SOURCE_STATUSES.size).toBe(7);
  });

  it("OperatorApplicability union has 8 values", () => {
    expect(OPERATOR_APPLICABILITIES.size).toBe(8);
  });

  it("RelevanceLevel union has 5 values", () => {
    expect(RELEVANCE_LEVELS.size).toBe(5);
  });
});
