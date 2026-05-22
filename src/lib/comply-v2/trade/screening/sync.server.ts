/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sanctions-list sync orchestrator. Glues fetch → parse → upsert.
 *
 * One entry point: `syncOneList(parser)` for testability, plus
 * `syncAllLists()` that fans out across the registered parsers.
 *
 * Fetch behavior:
 *   - 30s timeout per list (sanctions-list URLs occasionally hang)
 *   - Returns raw text body for the parser to consume
 *   - Logs HTTP status + content length to surface upstream issues
 *
 * Resilience:
 *   - One failing list does NOT abort the others. Each is independently
 *     try/caught and the result is reported per-list.
 *   - Empty parser results (e.g. BIS stub) are reported as "no entries"
 *     not as failure — the orchestrator just skips snapshot creation
 *     since hashing an empty array would create churn for nothing.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { logger } from "@/lib/logger";
import type { TradeSanctionsList } from "@prisma/client";
import { ofacSdnParser } from "./sources/ofac-sdn";
import { bisEntityParser } from "./sources/bis-entity";
import { ddtcDebarredParser } from "./sources/ddtc-debarred";
import { euFsfParser } from "./sources/eu-fsf";
import { ukOfsiParser } from "./sources/uk-ofsi";
import type { SanctionsSourceParser } from "./sources/types";
import { upsertSnapshot } from "./snapshot-store.server";

/**
 * Registered parsers for the orchestrator. Adding more sources
 * (UN Consolidated remains) is a one-line append.
 */
export const REGISTERED_PARSERS: readonly SanctionsSourceParser[] = [
  ofacSdnParser,
  bisEntityParser,
  ddtcDebarredParser,
  euFsfParser,
  ukOfsiParser,
] as const;

const FETCH_TIMEOUT_MS = 30_000;

export interface SyncOneResult {
  list: TradeSanctionsList;
  ok: boolean;
  /** True if a new snapshot was inserted. False if hash matched existing. */
  changed: boolean;
  entryCount: number;
  hash?: string;
  /** Present on failure. */
  error?: string;
  /** ms elapsed for this list. */
  elapsedMs: number;
}

export interface SyncAllResult {
  totalElapsedMs: number;
  results: SyncOneResult[];
}

/**
 * Fetch + parse + persist one sanctions list. Pure orchestration —
 * delegates all parsing to the registered parser.
 *
 * The optional `fetchOverride` param is for tests: pass a function
 * that returns canned raw text instead of hitting the network.
 */
export async function syncOneList(
  parser: SanctionsSourceParser,
  options?: {
    fetchOverride?: (url: string) => Promise<string>;
    sourceUrl?: string;
  },
): Promise<SyncOneResult> {
  const url = options?.sourceUrl ?? parser.defaultSourceUrl;
  const start = Date.now();

  try {
    let raw: string;
    if (options?.fetchOverride) {
      raw = await options.fetchOverride(url);
    } else {
      raw = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
    }

    const entries = parser.parse(raw);

    if (entries.length === 0) {
      // Stub parser or genuinely empty upstream. No-op rather than
      // poison the store with an empty snapshot.
      logger.info({ list: parser.list, url }, "sanctions sync: no entries");
      return {
        list: parser.list,
        ok: true,
        changed: false,
        entryCount: 0,
        elapsedMs: Date.now() - start,
      };
    }

    const upstreamVersion = parser.extractUpstreamVersion?.(raw);
    const result = await upsertSnapshot({
      list: parser.list,
      entries,
      sourceUrl: url,
      upstreamVersion,
    });

    logger.info(
      {
        list: parser.list,
        changed: result.changed,
        entryCount: result.entryCount,
        hash: result.hash.slice(0, 12),
      },
      "sanctions sync: ok",
    );

    return {
      list: parser.list,
      ok: true,
      changed: result.changed,
      entryCount: result.entryCount,
      hash: result.hash,
      elapsedMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { list: parser.list, url, err: message },
      "sanctions sync: failed",
    );
    return {
      list: parser.list,
      ok: false,
      changed: false,
      entryCount: 0,
      error: message,
      elapsedMs: Date.now() - start,
    };
  }
}

/**
 * Sync every registered list. Independent failures — one bad source
 * does not abort the others.
 *
 * Optimization: parsers that share the same defaultSourceUrl (e.g. BIS
 * + DDTC both pull from the trade.gov consolidated CSV in Sprint A4)
 * have their fetch deduplicated — one HTTP call, multiple parses. This
 * cuts ~10 MB of redundant traffic per cron run and respects the
 * upstream's bandwidth.
 */
export async function syncAllLists(): Promise<SyncAllResult> {
  const start = Date.now();
  // Memoize fetches by URL — fetch each unique URL exactly once
  const fetchCache = new Map<string, Promise<string>>();
  const fetchOnce = (url: string): Promise<string> => {
    let p = fetchCache.get(url);
    if (!p) {
      p = fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      fetchCache.set(url, p);
    }
    return p;
  };

  // Run in series to keep memory low. Total cost is dominated by the
  // largest list (consolidated CSV, ~10 MB), not by parallelism.
  const results: SyncOneResult[] = [];
  for (const parser of REGISTERED_PARSERS) {
    results.push(await syncOneList(parser, { fetchOverride: fetchOnce }));
  }
  return {
    totalElapsedMs: Date.now() - start,
    results,
  };
}

/**
 * Fetch with a manual AbortController timeout. node-fetch / undici
 * doesn't honor a `timeout` option directly in all Node versions, so
 * we wrap explicitly.
 */
async function fetchWithTimeout(url: string, ms: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      // Identify ourselves to the upstream — some of these endpoints
      // log user-agents for abuse mitigation. Polite user-agent here.
      headers: {
        "user-agent":
          "Caelex-Comply-Trade/1.0 (+https://caelex.eu; sanctions-screening cron)",
        accept: "text/csv, text/plain, */*",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText} from ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}
