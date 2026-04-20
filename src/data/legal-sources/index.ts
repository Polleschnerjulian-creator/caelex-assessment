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
  Amendment,
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
import { LEGAL_SOURCES_PT, AUTHORITIES_PT } from "./sources/pt";
import { LEGAL_SOURCES_IE, AUTHORITIES_IE } from "./sources/ie";
import { LEGAL_SOURCES_GR, AUTHORITIES_GR } from "./sources/gr";
import { LEGAL_SOURCES_CZ, AUTHORITIES_CZ } from "./sources/cz";
import { LEGAL_SOURCES_PL, AUTHORITIES_PL } from "./sources/pl";
import { LEGAL_SOURCES_EE, AUTHORITIES_EE } from "./sources/ee";
import { LEGAL_SOURCES_RO, AUTHORITIES_RO } from "./sources/ro";
import { LEGAL_SOURCES_HU, AUTHORITIES_HU } from "./sources/hu";
import { LEGAL_SOURCES_SI, AUTHORITIES_SI } from "./sources/si";
import { LEGAL_SOURCES_INT, AUTHORITIES_INT } from "./sources/intl";
import { LEGAL_SOURCES_EU, AUTHORITIES_EU } from "./sources/eu";

// ─── Aggregated data ─────────────────────────────────────────────────

const ALL_SOURCES: LegalSource[] = [
  ...LEGAL_SOURCES_INT,
  ...LEGAL_SOURCES_EU,
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
  ...LEGAL_SOURCES_PT,
  ...LEGAL_SOURCES_IE,
  ...LEGAL_SOURCES_GR,
  ...LEGAL_SOURCES_CZ,
  ...LEGAL_SOURCES_PL,
  ...LEGAL_SOURCES_EE,
  ...LEGAL_SOURCES_RO,
  ...LEGAL_SOURCES_HU,
  ...LEGAL_SOURCES_SI,
];

const ALL_AUTHORITIES: Authority[] = [
  ...AUTHORITIES_INT,
  ...AUTHORITIES_EU,
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
  ...AUTHORITIES_PT,
  ...AUTHORITIES_IE,
  ...AUTHORITIES_GR,
  ...AUTHORITIES_CZ,
  ...AUTHORITIES_PL,
  ...AUTHORITIES_EE,
  ...AUTHORITIES_RO,
  ...AUTHORITIES_HU,
  ...AUTHORITIES_SI,
];

const JURISDICTION_DATA: Map<string, JurisdictionLegalData> = new Map([
  [
    "INT",
    {
      jurisdiction: "INT",
      sources: LEGAL_SOURCES_INT,
      authorities: AUTHORITIES_INT,
    },
  ],
  [
    "EU",
    {
      jurisdiction: "EU",
      sources: LEGAL_SOURCES_EU,
      authorities: AUTHORITIES_EU,
    },
  ],
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
  [
    "PT",
    {
      jurisdiction: "PT",
      sources: LEGAL_SOURCES_PT,
      authorities: AUTHORITIES_PT,
    },
  ],
  [
    "IE",
    {
      jurisdiction: "IE",
      sources: LEGAL_SOURCES_IE,
      authorities: AUTHORITIES_IE,
    },
  ],
  [
    "GR",
    {
      jurisdiction: "GR",
      sources: LEGAL_SOURCES_GR,
      authorities: AUTHORITIES_GR,
    },
  ],
  [
    "CZ",
    {
      jurisdiction: "CZ",
      sources: LEGAL_SOURCES_CZ,
      authorities: AUTHORITIES_CZ,
    },
  ],
  [
    "PL",
    {
      jurisdiction: "PL",
      sources: LEGAL_SOURCES_PL,
      authorities: AUTHORITIES_PL,
    },
  ],
  [
    "EE",
    {
      jurisdiction: "EE",
      sources: LEGAL_SOURCES_EE,
      authorities: AUTHORITIES_EE,
    },
  ],
  [
    "RO",
    {
      jurisdiction: "RO",
      sources: LEGAL_SOURCES_RO,
      authorities: AUTHORITIES_RO,
    },
  ],
  [
    "HU",
    {
      jurisdiction: "HU",
      sources: LEGAL_SOURCES_HU,
      authorities: AUTHORITIES_HU,
    },
  ],
  [
    "SI",
    {
      jurisdiction: "SI",
      sources: LEGAL_SOURCES_SI,
      authorities: AUTHORITIES_SI,
    },
  ],
]);

// ─── Lookup functions ────────────────────────────────────────────────

export function getLegalSourcesByJurisdiction(code: string): LegalSource[] {
  // Country-specific sources
  const data = JURISDICTION_DATA.get(code);
  const national = data?.sources ?? [];

  // Plus international + EU instruments that list this country in
  // applies_to_jurisdictions. Single-source-of-truth: the canonical
  // treaty/regulation record lives in intl.ts or eu.ts, and country
  // pages pull from there via filter instead of duplicating.
  if (code === "INT" || code === "EU") {
    return national;
  }
  const applicable = ALL_SOURCES.filter(
    (s) =>
      (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
      s.applies_to_jurisdictions?.includes(code),
  );

  return [...applicable, ...national];
}

/**
 * Returns only the national sources for a country (no INT/EU cross-refs).
 * Useful when the UI wants to show "national laws" separately from
 * "international instruments that apply here".
 */
export function getNationalSources(code: string): LegalSource[] {
  const data = JURISDICTION_DATA.get(code);
  return data?.sources ?? [];
}

/**
 * Returns only the international + EU instruments that apply to a country.
 * Filters by applies_to_jurisdictions.
 */
export function getApplicableInternationalSources(code: string): LegalSource[] {
  return ALL_SOURCES.filter(
    (s) =>
      (s.jurisdiction === "INT" || s.jurisdiction === "EU") &&
      s.applies_to_jurisdictions?.includes(code),
  );
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
export { LEGAL_SOURCES_PT, AUTHORITIES_PT };
export { LEGAL_SOURCES_IE, AUTHORITIES_IE };
export { LEGAL_SOURCES_GR, AUTHORITIES_GR };
export { LEGAL_SOURCES_CZ, AUTHORITIES_CZ };
export { LEGAL_SOURCES_PL, AUTHORITIES_PL };
export { LEGAL_SOURCES_EE, AUTHORITIES_EE };
export { LEGAL_SOURCES_RO, AUTHORITIES_RO };
export { LEGAL_SOURCES_HU, AUTHORITIES_HU };
export { LEGAL_SOURCES_SI, AUTHORITIES_SI };
