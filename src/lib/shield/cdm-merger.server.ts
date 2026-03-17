/**
 * SHIELD — CDM Merger
 * Merges CDMs from multiple sources (Space-Track + LeoLabs).
 * Deduplicates by conjunction (same NORAD IDs + TCA within 1h).
 * Prefers LeoLabs data when both sources report the same conjunction.
 */

import "server-only";
import type { ParsedCDM } from "./types";

const TCA_MATCH_WINDOW_MS = 60 * 60 * 1000;

function makeKey(cdm: ParsedCDM): string {
  const ids = [cdm.sat1NoradId, cdm.sat2NoradId].sort();
  return `${ids[0]}-${ids[1]}`;
}

function tcaMatch(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= TCA_MATCH_WINDOW_MS;
}

export function mergeCDMs(
  spaceTrackCDMs: ParsedCDM[],
  leoLabsCDMs: ParsedCDM[],
): ParsedCDM[] {
  if (leoLabsCDMs.length === 0) return spaceTrackCDMs;
  if (spaceTrackCDMs.length === 0) return leoLabsCDMs;

  const result: ParsedCDM[] = [];
  const matchedStIndices = new Set<number>();

  for (const llCdm of leoLabsCDMs) {
    const llKey = makeKey(llCdm);
    let matched = false;

    for (let i = 0; i < spaceTrackCDMs.length; i++) {
      if (matchedStIndices.has(i)) continue;
      const stCdm = spaceTrackCDMs[i];
      if (llKey === makeKey(stCdm) && tcaMatch(llCdm.tca, stCdm.tca)) {
        result.push(llCdm);
        result.push(stCdm);
        matchedStIndices.add(i);
        matched = true;
        break;
      }
    }

    if (!matched) result.push(llCdm);
  }

  for (let i = 0; i < spaceTrackCDMs.length; i++) {
    if (!matchedStIndices.has(i)) result.push(spaceTrackCDMs[i]);
  }

  return result;
}
