// src/data/legal-sources/source-meta.ts

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Legal Sources — CLIENT-SAFE per-source meta lookup (perf pass F3).
 *
 * Re-inflates the baked tuple rows from `source-meta.generated.ts`
 * (~95KB minified vs ~3MB for the corpus barrel) into
 * LegalSourceMetaRecord objects and exposes an O(1) id lookup. For
 * client surfaces that only need id → title/type/jurisdiction labels
 * (e.g. "applied sources" link lists). Full source bodies stay
 * server-side — fetch /api/atlas/source-preview/[id] when needed.
 *
 * Regenerate after corpus changes:
 *
 *   npx tsx scripts/generate-legal-sources-meta.ts
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { SOURCE_META_TUPLES } from "./source-meta.generated";
import type { LegalSourceMetaRecord } from "./types";

export type { LegalSourceMetaRecord };

/** Light per-source records, in corpus (ALL_SOURCES) order. */
export const SOURCE_META: readonly LegalSourceMetaRecord[] =
  SOURCE_META_TUPLES.map(([id, jurisdiction, type, status, title_en]) => ({
    id,
    jurisdiction,
    type,
    status,
    title_en,
  }));

const BY_ID = new Map<string, LegalSourceMetaRecord>(
  SOURCE_META.map((s) => [s.id, s]),
);

/** O(1) light lookup — client-safe sibling of getLegalSourceById(). */
export function getSourceMetaById(
  id: string,
): LegalSourceMetaRecord | undefined {
  return BY_ID.get(id);
}
