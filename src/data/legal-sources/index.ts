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

import {
  LEGAL_SOURCE_TRANSLATIONS_DE,
  AUTHORITY_TRANSLATIONS_DE,
  type TranslatedProvision,
  type TranslatedSource,
  type TranslatedAuthority,
} from "./translations-de";

export type { TranslatedProvision, TranslatedSource, TranslatedAuthority };

// ─── Import jurisdiction data ────────────────────────────────────────

import { LEGAL_SOURCES_DE, AUTHORITIES_DE } from "./sources/de";
import { LEGAL_SOURCES_FR, AUTHORITIES_FR } from "./sources/fr";
import { LEGAL_SOURCES_UK, AUTHORITIES_UK } from "./sources/uk";
import { LEGAL_SOURCES_IT, AUTHORITIES_IT } from "./sources/it";
import { LEGAL_SOURCES_LU, AUTHORITIES_LU } from "./sources/lu";
import { LEGAL_SOURCES_NL, AUTHORITIES_NL } from "./sources/nl";
import { LEGAL_SOURCES_BE, AUTHORITIES_BE } from "./sources/be";
import { LEGAL_SOURCES_ES, AUTHORITIES_ES } from "./sources/es";
import { LEGAL_SOURCES_NO, AUTHORITIES_NO } from "./sources/no";
import { LEGAL_SOURCES_SE, AUTHORITIES_SE } from "./sources/se";
import { LEGAL_SOURCES_FI, AUTHORITIES_FI } from "./sources/fi";
import { LEGAL_SOURCES_DK, AUTHORITIES_DK } from "./sources/dk";
import { LEGAL_SOURCES_AT, AUTHORITIES_AT } from "./sources/at";
import { LEGAL_SOURCES_CH, AUTHORITIES_CH } from "./sources/ch";

// ─── Aggregated data ─────────────────────────────────────────────────

const ALL_SOURCES: LegalSource[] = [
  ...LEGAL_SOURCES_DE,
  ...LEGAL_SOURCES_FR,
  ...LEGAL_SOURCES_UK,
  ...LEGAL_SOURCES_IT,
  ...LEGAL_SOURCES_LU,
  ...LEGAL_SOURCES_NL,
  ...LEGAL_SOURCES_BE,
  ...LEGAL_SOURCES_ES,
  ...LEGAL_SOURCES_NO,
  ...LEGAL_SOURCES_SE,
  ...LEGAL_SOURCES_FI,
  ...LEGAL_SOURCES_DK,
  ...LEGAL_SOURCES_AT,
  ...LEGAL_SOURCES_CH,
];

const ALL_AUTHORITIES: Authority[] = [
  ...AUTHORITIES_DE,
  ...AUTHORITIES_FR,
  ...AUTHORITIES_UK,
  ...AUTHORITIES_IT,
  ...AUTHORITIES_LU,
  ...AUTHORITIES_NL,
  ...AUTHORITIES_BE,
  ...AUTHORITIES_ES,
  ...AUTHORITIES_NO,
  ...AUTHORITIES_SE,
  ...AUTHORITIES_FI,
  ...AUTHORITIES_DK,
  ...AUTHORITIES_AT,
  ...AUTHORITIES_CH,
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
  [
    "IT",
    {
      jurisdiction: "IT",
      sources: LEGAL_SOURCES_IT,
      authorities: AUTHORITIES_IT,
    },
  ],
  [
    "LU",
    {
      jurisdiction: "LU",
      sources: LEGAL_SOURCES_LU,
      authorities: AUTHORITIES_LU,
    },
  ],
  [
    "NL",
    {
      jurisdiction: "NL",
      sources: LEGAL_SOURCES_NL,
      authorities: AUTHORITIES_NL,
    },
  ],
  [
    "BE",
    {
      jurisdiction: "BE",
      sources: LEGAL_SOURCES_BE,
      authorities: AUTHORITIES_BE,
    },
  ],
  [
    "ES",
    {
      jurisdiction: "ES",
      sources: LEGAL_SOURCES_ES,
      authorities: AUTHORITIES_ES,
    },
  ],
  [
    "NO",
    {
      jurisdiction: "NO",
      sources: LEGAL_SOURCES_NO,
      authorities: AUTHORITIES_NO,
    },
  ],
  [
    "SE",
    {
      jurisdiction: "SE",
      sources: LEGAL_SOURCES_SE,
      authorities: AUTHORITIES_SE,
    },
  ],
  [
    "FI",
    {
      jurisdiction: "FI",
      sources: LEGAL_SOURCES_FI,
      authorities: AUTHORITIES_FI,
    },
  ],
  [
    "DK",
    {
      jurisdiction: "DK",
      sources: LEGAL_SOURCES_DK,
      authorities: AUTHORITIES_DK,
    },
  ],
  [
    "AT",
    {
      jurisdiction: "AT",
      sources: LEGAL_SOURCES_AT,
      authorities: AUTHORITIES_AT,
    },
  ],
  [
    "CH",
    {
      jurisdiction: "CH",
      sources: LEGAL_SOURCES_CH,
      authorities: AUTHORITIES_CH,
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

// ─── Translation helpers ────────────────────────────────────────────

/**
 * Returns translated content for a legal source based on the active language.
 * When language is "en", returns the original English content.
 * When language is "de", looks up German translation with English fallback.
 */
export function getTranslatedSource(
  source: LegalSource,
  language: string,
): {
  title: string;
  scopeDescription?: string;
  getProvisionTranslation: (section: string) => TranslatedProvision | null;
} {
  if (language !== "de") {
    return {
      title: source.title_en,
      scopeDescription: source.scope_description,
      getProvisionTranslation: (_section: string) => null,
    };
  }

  const translated = LEGAL_SOURCE_TRANSLATIONS_DE.get(source.id);
  if (!translated) {
    return {
      title: source.title_local ?? source.title_en,
      scopeDescription: source.scope_description,
      getProvisionTranslation: (_section: string) => null,
    };
  }

  return {
    title: translated.title,
    scopeDescription: translated.scopeDescription ?? source.scope_description,
    getProvisionTranslation: (section: string) =>
      translated.provisions[section] ?? null,
  };
}

/**
 * Returns translated content for an authority based on the active language.
 * When language is "en", returns the original English content.
 * When language is "de", looks up German translation with English fallback.
 */
export function getTranslatedAuthority(
  authority: Authority,
  language: string,
): {
  name: string;
  mandate: string;
} {
  if (language !== "de") {
    return {
      name: authority.name_en,
      mandate: authority.space_mandate,
    };
  }

  const translated = AUTHORITY_TRANSLATIONS_DE.get(authority.id);
  if (!translated) {
    return {
      name: authority.name_local ?? authority.name_en,
      mandate: authority.space_mandate,
    };
  }

  return {
    name: translated.name,
    mandate: translated.mandate,
  };
}

export { LEGAL_SOURCES_DE, AUTHORITIES_DE };
export { LEGAL_SOURCES_FR, AUTHORITIES_FR };
export { LEGAL_SOURCES_UK, AUTHORITIES_UK };
export { LEGAL_SOURCES_IT, AUTHORITIES_IT };
export { LEGAL_SOURCES_LU, AUTHORITIES_LU };
export { LEGAL_SOURCES_NL, AUTHORITIES_NL };
export { LEGAL_SOURCES_BE, AUTHORITIES_BE };
export { LEGAL_SOURCES_ES, AUTHORITIES_ES };
export { LEGAL_SOURCES_NO, AUTHORITIES_NO };
export { LEGAL_SOURCES_SE, AUTHORITIES_SE };
export { LEGAL_SOURCES_FI, AUTHORITIES_FI };
export { LEGAL_SOURCES_DK, AUTHORITIES_DK };
export { LEGAL_SOURCES_AT, AUTHORITIES_AT };
export { LEGAL_SOURCES_CH, AUTHORITIES_CH };
