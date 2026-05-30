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
import {
  ofacSdnParser,
  parseOfacAltAliases,
  mergeAliasesIntoEntries,
  OFAC_ALT_URL,
} from "./sources/ofac-sdn";
import { bisEntityParser } from "./sources/bis-entity";
import { ddtcDebarredParser } from "./sources/ddtc-debarred";
import { euFsfParser } from "./sources/eu-fsf";
import { ukOfsiParser } from "./sources/uk-ofsi";
import { unConsolidatedParser } from "./sources/un-consolidated";
import { euAnnexIvParser } from "./sources/eu-annex-iv";
import { openSanctionsParser } from "./sources/opensanctions";
import type { SanctionsSourceParser } from "./sources/types";
import { upsertSnapshot } from "./snapshot-store.server";

/**
 * Registered parsers for the orchestrator. All eight sources tracked by
 * TradeSanctionsList are now wired:
 *   OFAC_SDN · BIS_ENTITY · DDTC_DEBARRED · EU_FSF · UK_OFSI ·
 *   UN_CONSOLIDATED · EU_ANNEX_IV (Sprint Z2) · OPEN_SANCTIONS (Sprint Z9a)
 *
 * EU_ANNEX_IV is distinct from EU_FSF — the FSF carries asset-freeze
 * obligations under Reg. 269/2014, while Annex IV (Reg. 833/2014
 * Art. 2b) prohibits dual-use exports to listed entities regardless of
 * civilian intent. Same legal universe, different prohibition surface.
 *
 * OPEN_SANCTIONS aggregates 50+ government sources (including all of
 * the above plus regional / PEP / debarment lists with no direct US/EU
 * equivalent). Its hits carry primary-source attribution via FtM
 * `referents[]` so the operator can trace back to the originating
 * authority.
 */
export const REGISTERED_PARSERS: readonly SanctionsSourceParser[] = [
  ofacSdnParser,
  bisEntityParser,
  ddtcDebarredParser,
  euFsfParser,
  ukOfsiParser,
  unConsolidatedParser,
  euAnnexIvParser,
  openSanctionsParser,
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

    let entries = parser.parse(raw);

    // OFAC-specific: merge AKA aliases from the companion alt.csv.
    // Fail-soft — a failed alt.csv fetch must never drop the primary SDN
    // entries; aliases are a bonus that improve recall but are not required
    // for the snapshot to be valid.
    if (parser.list === "OFAC_SDN") {
      try {
        const altRaw = options?.fetchOverride
          ? await options.fetchOverride(OFAC_ALT_URL)
          : await fetchWithTimeout(OFAC_ALT_URL, FETCH_TIMEOUT_MS);
        const aliasMap = parseOfacAltAliases(altRaw);
        entries = mergeAliasesIntoEntries(entries, aliasMap);
        logger.info(
          { list: parser.list, aliasUids: aliasMap.size },
          "sanctions sync: merged OFAC alt.csv aliases",
        );
      } catch (altErr) {
        const msg = altErr instanceof Error ? altErr.message : String(altErr);
        logger.warn(
          { list: parser.list, err: msg, altUrl: OFAC_ALT_URL },
          "sanctions sync: alt.csv fetch failed — proceeding without aliases (fail-soft)",
        );
        // Primary entries are already in `entries` — continue with them unchanged.
      }
    }

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
