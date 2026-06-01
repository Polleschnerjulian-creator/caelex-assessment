/**
 * Caelex Trade — Screening Triage (UI Phase 3C).
 *
 * Pure functions that turn the raw TradeParty screening cohort (the same
 * rows the parties list + sidebar badge already read) into an urgency-
 * ordered triage queue, plus the small validation predicate the per-party
 * resolution drawer needs.
 *
 * Why pure (no `server-only`, no Prisma, no React):
 *   - The triage page fetches the parties itself via the existing
 *     /api/trade/parties endpoint; this module only *orders + describes*.
 *   - jsdom component tests hang on this machine — so ALL correctness that
 *     can be node-tested lives here and is covered by the co-located test.
 *   - `now` is injected so ordering is deterministic.
 *
 * NO new sanctions data, NO new scoring — match scores come from the
 * existing engine (TradeParty.screeningHits when the caller has them).
 *
 * Phase-3C scope note: there is intentionally NO bulk false-positive
 * dismissal. Every potential match is resolved INDIVIDUALLY in the
 * per-party resolution drawer (via the existing `decide` route) with its
 * own justification. The only bulk action is "re-screen selected".
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type TriageScreeningStatus =
  | "NOT_SCREENED"
  | "CLEAR"
  | "POTENTIAL_MATCH"
  | "CONFIRMED_HIT"
  | "STALE";

/** One hit as denormalized onto TradeParty.screeningHits (top-N). */
export interface TriageHit {
  list: string;
  entryId: string;
  score: number;
  matchedFields: string[];
}

/** Shape fetched from GET /api/trade/parties (+ optional hit/cascade data). */
export interface TriageInputRow {
  id: string;
  legalName: string;
  tradeName: string | null;
  countryCode: string;
  status: "ACTIVE" | "ARCHIVED" | "BLOCKED";
  screeningStatus: TriageScreeningStatus;
  isUSPerson: boolean;
  isHighRiskCountry: boolean;
  lastScreenedAt: string | null;
  /** Top-N hits (TradeParty.screeningHits JSON) — may be absent. The list
   *  endpoint doesn't return these today, so the queue cell degrades to a
   *  generic reason and the concrete hits surface in the drawer. */
  screeningHits?: TriageHit[] | null;
  /** Whether the latest screening flagged a 50%-rule cascade hit. Optional;
   *  the list endpoint doesn't return it today, so callers default false. */
  cascadeHit?: boolean;
}

/** Derived row consumed by the triage table + drawer. */
export interface TriageRow extends TriageInputRow {
  /** 0 = most urgent. */
  urgencyRank: number;
  /** ms since lastScreenedAt; Infinity when never screened. */
  lastScreenedMs: number;
  /** Top hit by score, if any. */
  topHit: TriageHit | null;
}

/** Statuses that belong in the default "needs action" queue. */
export const TRIAGE_QUEUE_STATUSES: ReadonlySet<TriageScreeningStatus> =
  new Set(["POTENTIAL_MATCH", "STALE", "NOT_SCREENED"]);

const RANK: Record<TriageScreeningStatus, number> = {
  POTENTIAL_MATCH: 0,
  STALE: 1,
  NOT_SCREENED: 2,
  CONFIRMED_HIT: 3,
  CLEAR: 4,
};

export function urgencyRank(status: TriageScreeningStatus): number {
  return RANK[status];
}

function topHitOf(row: TriageInputRow): TriageHit | null {
  const hits = row.screeningHits;
  if (!hits || hits.length === 0) return null;
  return hits.reduce((best, h) => (h.score > best.score ? h : best), hits[0]);
}

function msSince(now: Date, iso: string | null): number {
  if (!iso) return Infinity; // never screened ⇒ maximally stale
  return now.getTime() - new Date(iso).getTime();
}

/**
 * Filter to the queue set, derive urgency/staleness/top-hit, and return a
 * NEW array sorted: urgencyRank asc → most-stale first → legalName asc.
 * Never mutates the input. Pass `includeStatuses` to override the default
 * queue (e.g. show CONFIRMED_HIT when the user picks that filter chip).
 */
export function deriveTriageQueue(
  rows: ReadonlyArray<TriageInputRow>,
  now: Date,
  includeStatuses: ReadonlySet<TriageScreeningStatus> = TRIAGE_QUEUE_STATUSES,
): TriageRow[] {
  const derived: TriageRow[] = rows
    .filter((r) => includeStatuses.has(r.screeningStatus))
    .map((r) => ({
      ...r,
      urgencyRank: urgencyRank(r.screeningStatus),
      lastScreenedMs: msSince(now, r.lastScreenedAt),
      topHit: topHitOf(r),
    }));
  derived.sort(compareTriage);
  return derived;
}

/** Sort comparator: urgency asc → most-stale first → name asc. */
export function compareTriage(a: TriageRow, b: TriageRow): number {
  if (a.urgencyRank !== b.urgencyRank) return a.urgencyRank - b.urgencyRank;
  // Most-stale first: larger lastScreenedMs (incl. Infinity) sorts earlier.
  if (a.lastScreenedMs !== b.lastScreenedMs) {
    return b.lastScreenedMs - a.lastScreenedMs;
  }
  return a.legalName.localeCompare(b.legalName);
}

/** One-line "why is this in the queue" string for the table cell. */
export function triageReason(row: TriageRow): string {
  switch (row.screeningStatus) {
    case "POTENTIAL_MATCH": {
      if (row.topHit) {
        return `Potential match — top ${row.topHit.score.toFixed(2)} (${row.topHit.list})`;
      }
      return "Potential match — needs review";
    }
    case "STALE": {
      const days =
        row.lastScreenedMs === Infinity
          ? null
          : Math.round(row.lastScreenedMs / 86_400_000);
      return days === null
        ? "Stale — screening data out of date"
        : `Stale — last screened ${days} d ago`;
    }
    case "NOT_SCREENED":
      return "Never screened — run the first screen";
    case "CONFIRMED_HIT":
      return "Confirmed sanctions hit — party blocked";
    case "CLEAR":
      return "Clear";
  }
}

/** Reason validation mirroring (not replacing) the server Zod min(1).max(2000). */
export function validateResolutionReason(
  notes: string,
): { ok: true } | { ok: false; error: string } {
  const trimmed = notes.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "A justification is required." };
  }
  if (notes.length > 2000) {
    return {
      ok: false,
      error: "Justification must be 2000 characters or fewer.",
    };
  }
  return { ok: true };
}

/** Summarize a batch-screen response for the success toast. */
export function summarizeBatch(
  items: ReadonlyArray<{ ok: boolean; decision?: string }>,
): {
  total: number;
  ok: number;
  failed: number;
  newPotentialMatches: number;
} {
  let ok = 0;
  let failed = 0;
  let newPotentialMatches = 0;
  for (const it of items) {
    if (it.ok) ok++;
    else failed++;
    if (it.decision === "POTENTIAL_MATCH") newPotentialMatches++;
  }
  return { total: items.length, ok, failed, newPotentialMatches };
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
