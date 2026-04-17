/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 *
 * Landing Rights aggregation and lookup. All content is statically
 * imported from per-country / per-entity files — no async, no cache.
 */

import type {
  LandingRightsProfile,
  CategoryDeepDive,
  CaseStudy,
  OperatorMatrixRow,
  ConductCondition,
  LandingRightsCategory,
  OperatorStatus,
} from "./types";
import type { JurisdictionCode } from "./_helpers";

// ─── Profile imports ─────────────────────────────────────────────────
import { PROFILE_DE } from "./profiles/de";
import { PROFILE_US } from "./profiles/us";
import { PROFILE_IN } from "./profiles/in";

// ─── Category deep-dive imports ──────────────────────────────────────
import { MARKET_ACCESS_DEEP_DIVES } from "./category-deep-dives/market-access";
import { ITU_COORDINATION_DEEP_DIVES } from "./category-deep-dives/itu-coordination";
import { EARTH_STATION_DEEP_DIVES } from "./category-deep-dives/earth-station";
import { RE_ENTRY_DEEP_DIVES } from "./category-deep-dives/re-entry";

// ─── Other entities ──────────────────────────────────────────────────
import { CASE_STUDIES } from "./case-studies";
import { OPERATOR_MATRIX_ROWS } from "./operator-matrix";
import { CONDUCT_CONDITIONS } from "./conduct-conditions";

export type {
  LandingRightsProfile,
  CategoryDeepDive,
  CaseStudy,
  OperatorMatrixRow,
  ConductCondition,
  LandingRightsCategory,
  OperatorStatus,
  RegimeType,
  CoverageDepth,
  ConductType,
} from "./types";
export type { JurisdictionCode } from "./_helpers";

// ─── Aggregated arrays ───────────────────────────────────────────────

export const ALL_LANDING_RIGHTS_PROFILES: LandingRightsProfile[] = [
  PROFILE_DE,
  PROFILE_US,
  PROFILE_IN,
];

export const ALL_DEEP_DIVES: CategoryDeepDive[] = [
  ...MARKET_ACCESS_DEEP_DIVES,
  ...ITU_COORDINATION_DEEP_DIVES,
  ...EARTH_STATION_DEEP_DIVES,
  ...RE_ENTRY_DEEP_DIVES,
];

export const ALL_CASE_STUDIES: CaseStudy[] = CASE_STUDIES;
export const OPERATOR_MATRIX: OperatorMatrixRow[] = OPERATOR_MATRIX_ROWS;
export const ALL_CONDUCT_CONDITIONS: ConductCondition[] = CONDUCT_CONDITIONS;

// ─── Lookup functions ────────────────────────────────────────────────

export function getProfile(
  code: JurisdictionCode,
): LandingRightsProfile | undefined {
  return ALL_LANDING_RIGHTS_PROFILES.find((p) => p.jurisdiction === code);
}

export function getDeepDives(code: JurisdictionCode): CategoryDeepDive[] {
  return ALL_DEEP_DIVES.filter((d) => d.jurisdiction === code);
}

export function getDeepDive(
  code: JurisdictionCode,
  category: LandingRightsCategory,
): CategoryDeepDive | undefined {
  return ALL_DEEP_DIVES.find(
    (d) => d.jurisdiction === code && d.category === category,
  );
}

export function getCaseStudiesFor(code: JurisdictionCode): CaseStudy[] {
  return ALL_CASE_STUDIES.filter((c) => c.jurisdiction === code);
}

export function getConductFor(code: JurisdictionCode): ConductCondition[] {
  return ALL_CONDUCT_CONDITIONS.filter((c) => c.jurisdiction === code);
}

export function getOperatorStatus(
  operator: string,
  code: JurisdictionCode,
): OperatorStatus | undefined {
  const row = OPERATOR_MATRIX.find(
    (r) => r.operator.toLowerCase() === operator.toLowerCase(),
  );
  return row?.statuses[code]?.status;
}
