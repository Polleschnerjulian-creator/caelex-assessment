// src/data/legal-sources/meta.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Legal Sources — CLIENT-SAFE corpus metadata facade (perf pass F3).
 *
 * Thin lookup layer over `meta.generated.ts` (~40KB of light, baked
 * aggregates) so client components can render inventory counts and
 * per-jurisdiction stats WITHOUT value-importing the ~3MB corpus
 * barrel (./index.ts). Regenerate the artifact after corpus changes:
 *
 *   npx tsx scripts/generate-legal-sources-meta.ts
 *
 * Need more than counts/labels client-side? Use ./source-meta (id →
 * title records), ./translations (translated titles), or the on-demand
 * API route /api/atlas/source-preview/[id] — NOT the barrel.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  CORPUS_STATS,
  JURISDICTION_CODES,
  SOURCE_JURISDICTION_CODES,
  JURISDICTION_META,
} from "./meta.generated";
import type { CorpusStats, JurisdictionMetaRecord } from "./types";

export {
  CORPUS_STATS,
  JURISDICTION_CODES,
  SOURCE_JURISDICTION_CODES,
  JURISDICTION_META,
};
export type { CorpusStats, JurisdictionMetaRecord };

const BY_CODE = new Map<string, JurisdictionMetaRecord>(
  JURISDICTION_META.map((j) => [j.code, j]),
);

/**
 * Per-jurisdiction aggregate (counts, treaty flags, quick-ref preview)
 * or undefined for codes without a legal-sources catalogue entry —
 * mirrors the `hasSources` gating consumers previously derived from
 * getAvailableJurisdictions().
 */
export function getJurisdictionMeta(
  code: string,
): JurisdictionMetaRecord | undefined {
  return BY_CODE.get(code);
}
