// src/data/legal-sources/meta-builder.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Legal Sources — meta projection builder (perf pass F3).
 *
 * Derives the CLIENT-SAFE light metadata (counts, per-jurisdiction
 * aggregates, id → title records) from the full corpus barrel. The
 * output is baked to disk by `scripts/generate-legal-sources-meta.ts`
 * as `meta.generated.ts` + `source-meta.generated.ts`, and the drift
 * test (`meta-drift.test.ts`) re-runs this builder to guarantee the
 * committed artifacts never fall behind the corpus.
 *
 * ⚠️ This module VALUE-IMPORTS the ~3MB corpus barrel. It must only be
 * imported by Node-side code (the generator script and vitest) — NEVER
 * by client components and never (transitively) by anything a client
 * component imports. Client code consumes ./meta and ./source-meta.
 *
 * The derivations here intentionally mirror, 1:1, what the client
 * consumers used to compute from the barrel directly:
 *   - atlas/jurisdictions/page.tsx       (counts + treaty flags)
 *   - components/atlas/CrossBorderQuickRef.tsx (top areas, authorities)
 *   - atlas/drafting/*                   (distinct source jurisdictions)
 *   - atlas/settings + /atlas-signup     (inventory counts)
 *   - atlas/cases/[id]                   (id → title/type/jurisdiction)
 * Change those consumers and this builder together.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  ALL_SOURCES,
  ALL_AUTHORITIES,
  getAvailableJurisdictions,
  getLegalSourcesByJurisdiction,
  getAuthoritiesByJurisdiction,
} from "./index";
import type {
  ComplianceArea,
  CorpusStats,
  JurisdictionMetaRecord,
  LegalSourceMetaRecord,
} from "./types";

export interface LegalSourcesMeta {
  stats: CorpusStats;
  /** getAvailableJurisdictions() — all catalogued jurisdiction codes. */
  jurisdictionCodes: string[];
  /** Distinct `source.jurisdiction` values across ALL_SOURCES, sorted. */
  sourceJurisdictionCodes: string[];
  /** Per-jurisdiction aggregates, in getAvailableJurisdictions() order. */
  jurisdictions: JurisdictionMetaRecord[];
}

export function buildLegalSourcesMeta(): LegalSourcesMeta {
  const jurisdictionCodes = getAvailableJurisdictions();

  const sourceJurisdictionSet = new Set<string>();
  for (const s of ALL_SOURCES) sourceJurisdictionSet.add(s.jurisdiction);
  const sourceJurisdictionCodes = Array.from(sourceJurisdictionSet).sort();

  const jurisdictions: JurisdictionMetaRecord[] = jurisdictionCodes.map(
    (code) => {
      const sources = getLegalSourcesByJurisdiction(code);
      const authorities = getAuthoritiesByJurisdiction(code);

      // Treaty flags — exact predicates from atlas/jurisdictions/page.tsx.
      const ost = sources.some(
        (s) => s.id.includes("OST") && s.status === "in_force",
      );
      const liability = sources.some(
        (s) =>
          s.id.includes("LIABILITY") &&
          s.type === "international_treaty" &&
          s.status === "in_force",
      );
      const registration = sources.some(
        (s) =>
          s.id.includes("REGISTRATION") &&
          s.type === "international_treaty" &&
          s.status === "in_force",
      );
      const moon = sources.some(
        (s) => s.id.includes("MOON") && s.status === "in_force",
      );
      const artemis = sources.some(
        (s) => s.id.includes("ARTEMIS") && s.status === "in_force",
      );

      // Top-3 compliance areas by frequency — exact tally from
      // CrossBorderQuickRef.buildCard (stable sort keeps first-seen
      // order on ties, matching Map insertion order).
      const tally = new Map<ComplianceArea, number>();
      for (const s of sources) {
        for (const a of s.compliance_areas) {
          tally.set(a, (tally.get(a) ?? 0) + 1);
        }
      }
      const topComplianceAreas = [...tally.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([a]) => a);

      const authoritiesPreview = authorities.slice(0, 3).map((a) => ({
        id: a.id,
        abbreviation: a.abbreviation ?? "",
      }));

      return {
        code,
        sourceCount: sources.length,
        authorityCount: authorities.length,
        treaties: { ost, liability, registration, moon, artemis },
        topComplianceAreas,
        authoritiesPreview,
      };
    },
  );

  return {
    stats: {
      sources: ALL_SOURCES.length,
      authorities: ALL_AUTHORITIES.length,
      jurisdictions: jurisdictionCodes.length,
    },
    jurisdictionCodes,
    sourceJurisdictionCodes,
    jurisdictions,
  };
}

/** Light per-source records, in ALL_SOURCES order. */
export function buildSourceMetaRecords(): LegalSourceMetaRecord[] {
  return ALL_SOURCES.map((s) => ({
    id: s.id,
    jurisdiction: s.jurisdiction,
    type: s.type,
    status: s.status,
    title_en: s.title_en,
  }));
}
