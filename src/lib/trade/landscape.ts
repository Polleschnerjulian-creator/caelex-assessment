/**
 * Passage Liefer-Landkarte — pure types + the curated destination set.
 * The runner lives in `landscape.server.ts` (imports the engine).
 */
import type { Verdict } from "./operation-assistant-verdict";

/** One destination's verdict + the cited reason (from the engine's row). */
export interface LandscapeCell {
  /** ISO-2 destination. */
  country: string;
  verdict: Verdict; // "GO" | "REVIEW" | "BLOCKED"
  /** The licence/reason line from the engine for this destination (cited). */
  detail: string;
}

export interface LandscapeResult {
  go: LandscapeCell[];
  review: LandscapeCell[];
  blocked: LandscapeCell[];
  /** Always set — the clean-buyer honesty caption (rendered verbatim). */
  caption: string;
}

export const LANDSCAPE_CAPTION =
  "Annahme: sauberer Endkunde — im nächsten Schritt mit dem echten Käufer verschärft.";

/**
 * Curated ~18 destinations: the EU001/friendly allies + an EU-27 sample +
 * the watch set + the hard-block set so the red zone is always visible.
 * Tuned later (spec §10 fast-follow). ISO-2.
 */
export const LANDSCAPE_DESTINATIONS: readonly string[] = [
  // EU001/friendly allies
  "US",
  "JP",
  "CA",
  "AU",
  "NZ",
  "NO",
  "CH",
  "GB",
  // EU-27 sample
  "DE",
  "FR",
  "IT",
  "NL",
  "ES",
  // watch set
  "IN",
  "CN",
  // hard-block set (always red — proves the engine blocks them)
  "RU",
  "BY",
  "IR",
  "KP",
  "SY",
  "CU",
] as const;
