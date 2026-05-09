/**
 * Atlas Comparator — Time-travel jurisdiction diffs (D2/Time-travel).
 *
 * "What changed between 2024-01-01 and 2026-05-01 for DE?"
 * Partners writing client memos that say "as of today, the regime is X"
 * need a way to see what shifted in the window between the prior
 * assessment and now. The comparator already has a forward `?t=`
 * slider; this module adds the BACKWARD diff.
 *
 * Built on the existing `forecast-engine.ts` event feed: it already
 * tracks per-source effective dates, repealed sections, status flips.
 * This module just slices that feed by a (from, to) window and groups
 * by jurisdiction.
 *
 * Output is a structured diff that the UI can render as a redline
 * panel — "DE: 3 changes (1 amendment to BWRG §6, 1 status flip to
 * draft Weltraumgesetz, 1 new EU-Space-Act readiness rating)".
 */

import type { ForecastEvent } from "@/lib/atlas/forecast-engine";
import { getAllForecastEvents } from "@/lib/atlas/forecast-engine";
import { EU_MEMBER_STATES_SET } from "@/lib/space-law-types";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";

export interface JurisdictionTimeDiff {
  jurisdictionCode: string;
  /** Events whose effective date falls in (fromIso, toIso] AND touch
   *  this jurisdiction (directly, INT, or EU-meta). */
  events: ForecastEvent[];
}

export interface TimeDiffResult {
  fromIso: string;
  toIso: string;
  /** One entry per requested jurisdiction. Empty `events` is OK — we
   *  return a row for every selected code so the UI can show "no
   *  changes" affirmatively rather than silently hiding the column. */
  byJurisdiction: JurisdictionTimeDiff[];
  /** Aggregate count of distinct events across all jurisdictions —
   *  events touching multiple jurisdictions count once. */
  uniqueEventCount: number;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function eventTouchesJurisdiction(
  e: ForecastEvent,
  code: SpaceLawCountryCode,
): boolean {
  if (e.jurisdictions.includes(code)) return true;
  if (e.jurisdictions.includes("INT")) return true;
  if (e.jurisdictions.includes("EU") && EU_MEMBER_STATES_SET.has(code))
    return true;
  return false;
}

/**
 * Compute the diff. Caller passes `from` and `to` Date objects + the
 * selected jurisdiction codes; the result is one entry per code with
 * the matching events.
 *
 * Window semantics: events with `effectiveDate > fromIso` AND
 * `effectiveDate <= toIso` are in scope. The lower bound is
 * exclusive (you don't want events that happened ON your "as-of"
 * date), the upper inclusive (you DO want events as-of your target).
 * If `from >= to`, returns an empty result.
 */
export function computeTimeDiff(
  from: Date,
  to: Date,
  jurisdictions: SpaceLawCountryCode[],
): TimeDiffResult {
  const fromIso = toIso(from);
  const toIsoStr = toIso(to);
  if (from.getTime() >= to.getTime()) {
    return {
      fromIso,
      toIso: toIsoStr,
      byJurisdiction: jurisdictions.map((code) => ({
        jurisdictionCode: code,
        events: [],
      })),
      uniqueEventCount: 0,
    };
  }

  const all = getAllForecastEvents();
  const inWindow = all.filter(
    (e) => e.effectiveDate > fromIso && e.effectiveDate <= toIsoStr,
  );

  const byJurisdiction: JurisdictionTimeDiff[] = jurisdictions.map((code) => ({
    jurisdictionCode: code,
    events: inWindow.filter((e) => eventTouchesJurisdiction(e, code)),
  }));

  const uniqueIds = new Set<string>();
  for (const j of byJurisdiction) {
    for (const e of j.events) uniqueIds.add(e.id);
  }

  return {
    fromIso,
    toIso: toIsoStr,
    byJurisdiction,
    uniqueEventCount: uniqueIds.size,
  };
}
