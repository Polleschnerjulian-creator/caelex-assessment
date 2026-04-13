// src/data/legal-sources/index.ts

/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Legal Sources Aggregation and Lookup Functions.
 * Entry point for consuming legal source data across the application.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  LegalSource,
  Authority,
  LegalSourceType,
  LegalSourceStatus,
  ComplianceArea,
  JurisdictionLegalData,
} from "./types";

export type {
  LegalSource,
  Authority,
  LegalSourceType,
  LegalSourceStatus,
  ComplianceArea,
  JurisdictionLegalData,
  RelevanceLevel,
  OperatorApplicability,
  KeyProvision,
} from "./types";

// ─── Import jurisdiction data ────────────────────────────────────────

import { LEGAL_SOURCES_DE, AUTHORITIES_DE } from "./sources/de";
import { LEGAL_SOURCES_FR, AUTHORITIES_FR } from "./sources/fr";
import { LEGAL_SOURCES_UK, AUTHORITIES_UK } from "./sources/uk";

// ─── Aggregated data ─────────────────────────────────────────────────

const ALL_SOURCES: LegalSource[] = [
  ...LEGAL_SOURCES_DE,
  ...LEGAL_SOURCES_FR,
  ...LEGAL_SOURCES_UK,
];

const ALL_AUTHORITIES: Authority[] = [
  ...AUTHORITIES_DE,
  ...AUTHORITIES_FR,
  ...AUTHORITIES_UK,
];

const JURISDICTION_DATA: Map<string, JurisdictionLegalData> = new Map([
  [
    "DE",
    {
      jurisdiction: "DE",
      sources: LEGAL_SOURCES_DE,
      authorities: AUTHORITIES_DE,
    },
  ],
  [
    "FR",
    {
      jurisdiction: "FR",
      sources: LEGAL_SOURCES_FR,
      authorities: AUTHORITIES_FR,
    },
  ],
  [
    "UK",
    {
      jurisdiction: "UK",
      sources: LEGAL_SOURCES_UK,
      authorities: AUTHORITIES_UK,
    },
  ],
]);

// ─── Lookup functions ────────────────────────────────────────────────

export function getLegalSourcesByJurisdiction(code: string): LegalSource[] {
  // Include international treaties (jurisdiction "INT") and EU law
  // (jurisdiction "EU") alongside the national sources
  const data = JURISDICTION_DATA.get(code);
  if (!data) return [];
  return data.sources;
}

export function getLegalSourcesByComplianceArea(
  jurisdiction: string,
  area: ComplianceArea,
): LegalSource[] {
  return getLegalSourcesByJurisdiction(jurisdiction).filter((s) =>
    s.compliance_areas.includes(area),
  );
}

export function getLegalSourcesByType(type: LegalSourceType): LegalSource[] {
  return ALL_SOURCES.filter((s) => s.type === type);
}

export function getLegalSourceById(id: string): LegalSource | undefined {
  return ALL_SOURCES.find((s) => s.id === id);
}

export function getAuthoritiesByJurisdiction(code: string): Authority[] {
  const data = JURISDICTION_DATA.get(code);
  return data?.authorities ?? [];
}

export function getAuthorityById(id: string): Authority | undefined {
  return ALL_AUTHORITIES.find((a) => a.id === id);
}

export function getLegalBasisChain(
  jurisdiction: string,
  area: ComplianceArea,
): LegalSource[] {
  const sources = getLegalSourcesByComplianceArea(jurisdiction, area);
  // Sort by relevance: fundamental > critical > high > medium > low
  const order: Record<string, number> = {
    fundamental: 0,
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };
  return sources.sort(
    (a, b) => (order[a.relevance_level] ?? 5) - (order[b.relevance_level] ?? 5),
  );
}

export function getRelatedSources(sourceId: string): LegalSource[] {
  const source = getLegalSourceById(sourceId);
  if (!source) return [];
  return source.related_sources
    .map((id) => getLegalSourceById(id))
    .filter((s): s is LegalSource => s !== undefined);
}

export function getLegalSourceStats(): Record<
  string,
  {
    total: number;
    byType: Partial<Record<LegalSourceType, number>>;
    byStatus: Partial<Record<LegalSourceStatus, number>>;
  }
> {
  const stats: Record<
    string,
    {
      total: number;
      byType: Partial<Record<LegalSourceType, number>>;
      byStatus: Partial<Record<LegalSourceStatus, number>>;
    }
  > = {};

  for (const [code, data] of JURISDICTION_DATA) {
    const byType: Partial<Record<LegalSourceType, number>> = {};
    const byStatus: Partial<Record<LegalSourceStatus, number>> = {};
    for (const s of data.sources) {
      byType[s.type] = (byType[s.type] ?? 0) + 1;
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
    }
    stats[code] = { total: data.sources.length, byType, byStatus };
  }

  return stats;
}

export function getAvailableJurisdictions(): string[] {
  return Array.from(JURISDICTION_DATA.keys());
}

export { LEGAL_SOURCES_DE, AUTHORITIES_DE };
export { LEGAL_SOURCES_FR, AUTHORITIES_FR };
export { LEGAL_SOURCES_UK, AUTHORITIES_UK };
