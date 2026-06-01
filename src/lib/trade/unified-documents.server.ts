/**
 * Caelex Trade — Unified Documents aggregator (UI Phase 3D, server-only).
 *
 * `listUnifiedDocuments(orgId)` fans the 8 EXISTING org-scoped `list*`
 * service reads out in a single `Promise.all`, maps each typed result
 * through the matching PURE normalizer in `./unified-documents`, stamps a
 * derived expiry bucket against a single `now`, and returns the merged
 * list newest-activity-first.
 *
 * This is a READ-ONLY aggregation — no new Prisma model, no migration,
 * no per-type HTTP route (the sub-pages call these same services directly
 * from their server components). Every returned row is flat +
 * JSON-serializable so it crosses the RSC → client boundary cleanly.
 *
 * The wired service functions (confirmed to exist as the plan assumed):
 *   listEucRequests                 (euc-service)
 *   listReexportConsents            (reexport-service)
 *   listVsds                        (vsd-service)
 *   listSammelgenehmigungen         (sammelgenehmigung/sammelgenehmigung-service)
 *   listLosAuthorisations           (france-los/france-los-service)
 *   listUkEcjuLicenses              (uk-ecju/uk-ecju-service)
 *   listFaaAstLicenses              (faa-ast/faa-ast-service)
 *   listDeemedExportAuthorizations  (deemed-export/deemed-export-service)
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { listEucRequests } from "@/lib/trade/euc-service";
import { listReexportConsents } from "@/lib/trade/reexport-service";
import { listVsds } from "@/lib/trade/vsd-service";
import { listSammelgenehmigungen } from "@/lib/trade/sammelgenehmigung/sammelgenehmigung-service";
import { listLosAuthorisations } from "@/lib/trade/france-los/france-los-service";
import { listUkEcjuLicenses } from "@/lib/trade/uk-ecju/uk-ecju-service";
import { listFaaAstLicenses } from "@/lib/trade/faa-ast/faa-ast-service";
import { listDeemedExportAuthorizations } from "@/lib/trade/deemed-export/deemed-export-service";

import {
  type UnifiedTradeDocumentRow,
  normalizeEuc,
  normalizeReexport,
  normalizeVsd,
  normalizeSammel,
  normalizeFranceLos,
  normalizeUkEcju,
  normalizeFaaAst,
  normalizeDeemed,
  withExpiryBuckets,
  sortUnifiedByRecency,
} from "@/lib/trade/unified-documents";

/**
 * Per-type counts of the merged set, surfaced to the page header so it can
 * show "N Dokumente · M Typen" without re-deriving from the row array.
 */
export interface UnifiedDocumentsSummary {
  total: number;
  expiringSoon: number;
  expired: number;
}

export interface UnifiedDocumentsResult {
  rows: UnifiedTradeDocumentRow[];
  summary: UnifiedDocumentsSummary;
}

/**
 * Aggregate every Trade document type for an org into one merged,
 * recency-sorted list. All 8 reads run concurrently; a single `now`
 * (captured once) drives expiry bucketing so every row is classified
 * against the same instant.
 */
export async function listUnifiedDocuments(
  orgId: string,
): Promise<UnifiedDocumentsResult> {
  const [eucs, reexports, vsds, sammel, franceLos, ukEcju, faaAst, deemed] =
    await Promise.all([
      listEucRequests(orgId),
      listReexportConsents(orgId),
      listVsds(orgId),
      listSammelgenehmigungen(orgId),
      listLosAuthorisations(orgId),
      listUkEcjuLicenses(orgId),
      listFaaAstLicenses(orgId),
      listDeemedExportAuthorizations(orgId),
    ]);

  const normalized: UnifiedTradeDocumentRow[] = [
    ...eucs.map(normalizeEuc),
    ...reexports.map(normalizeReexport),
    ...vsds.map(normalizeVsd),
    ...sammel.map(normalizeSammel),
    ...franceLos.map(normalizeFranceLos),
    ...ukEcju.map(normalizeUkEcju),
    ...faaAst.map(normalizeFaaAst),
    ...deemed.map(normalizeDeemed),
  ];

  const now = new Date();
  const withBuckets = withExpiryBuckets(normalized, now);
  const rows = sortUnifiedByRecency(withBuckets);

  const summary: UnifiedDocumentsSummary = {
    total: rows.length,
    expiringSoon: rows.filter((r) => r.expiryBucket === "soon").length,
    expired: rows.filter((r) => r.expiryBucket === "expired").length,
  };

  return { rows, summary };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
