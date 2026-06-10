/**
 * Caelex Trade — Sanctions-list freshness strip (ILA review item #6).
 *
 * The first thing a compliance officer wants to know is whether the
 * screening data underneath every verdict is CURRENT. This strip makes
 * the trust signal explicit on the hub: one chip per sanctions list with
 * the age of its latest snapshot.
 *
 * Honesty rules:
 *  - a list with NO snapshot says "nie geladen" loudly — never hidden;
 *  - ages are bucketed (fresh ≤48h / aging ≤7d / stale >7d) — the same
 *    conservative direction as the screening engine's stale-TTL, which
 *    remains the enforcement layer (this strip is display-only).
 *
 * Pure helpers exported for node tests (no jsdom needed).
 */

import type { TradeSanctionsList } from "@prisma/client";

export type FreshnessBucket = "fresh" | "aging" | "stale" | "never";

export interface ListFreshnessRow {
  list: TradeSanctionsList;
  fetchedAt: Date | null;
}

/** Human labels — keep in sync with the TradeSanctionsList enum. */
export const SANCTIONS_LIST_LABELS: Record<TradeSanctionsList, string> = {
  OFAC_SDN: "OFAC SDN",
  BIS_ENTITY: "BIS Entity",
  DDTC_DEBARRED: "DDTC Debarred",
  EU_FSF: "EU FSF",
  UK_OFSI: "UK OFSI",
  UN_CONSOLIDATED: "UN",
  EU_ANNEX_IV: "EU Annex IV",
  OPEN_SANCTIONS: "OpenSanctions",
};

export function freshnessBucket(
  now: Date,
  fetchedAt: Date | null,
): FreshnessBucket {
  if (fetchedAt === null) return "never";
  const ageMs = now.getTime() - fetchedAt.getTime();
  if (ageMs <= 48 * 60 * 60 * 1000) return "fresh";
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return "aging";
  return "stale";
}

export function freshnessAgeLabel(now: Date, fetchedAt: Date | null): string {
  if (fetchedAt === null) return "nie geladen";
  const hours = Math.floor(
    (now.getTime() - fetchedAt.getTime()) / (60 * 60 * 1000),
  );
  if (hours < 1) return "gerade aktualisiert";
  if (hours < 48) return `vor ${hours} h`;
  return `vor ${Math.floor(hours / 24)} Tagen`;
}

const BUCKET_DOT: Record<FreshnessBucket, string> = {
  fresh: "var(--trade-accent-success)",
  aging: "var(--trade-text-muted)",
  stale: "var(--trade-accent-warn)",
  never: "var(--trade-accent-warn)",
};

export default function ListFreshnessStrip({
  rows,
  now,
}: {
  rows: ListFreshnessRow[];
  now: Date;
}) {
  return (
    <div
      aria-label="Aktualität der Sanktionslisten"
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-trade-border bg-trade-bg-panel px-4 py-2.5"
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-trade-text-muted">
        Listen-Stand
      </span>
      {rows.map((row) => {
        const bucket = freshnessBucket(now, row.fetchedAt);
        return (
          <span
            key={row.list}
            className="inline-flex items-center gap-1.5 text-[12px] text-trade-text-secondary"
            title={`${SANCTIONS_LIST_LABELS[row.list]}: ${freshnessAgeLabel(now, row.fetchedAt)}`}
          >
            <span
              aria-hidden="true"
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: BUCKET_DOT[bucket] }}
            />
            {SANCTIONS_LIST_LABELS[row.list]}
            {bucket === "never" || bucket === "stale" ? (
              <span className="text-trade-text-muted">
                ({freshnessAgeLabel(now, row.fetchedAt)})
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
