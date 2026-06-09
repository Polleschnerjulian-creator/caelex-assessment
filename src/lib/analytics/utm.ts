/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Caelex Analytics — UTM + referrer capture (GDPR-safe, slug-only).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The marketing/top-of-funnel `acq_page_viewed` event (./events.ts) carries the
 * acquisition attribution dimensions — `utmSource`/`utmMedium`/`utmCampaign`/
 * `utmContent`/`utmTerm` plus a coarse `referrer` host. World-class attribution
 * needs those FIVE UTM keys + the referring host, but the event store is
 * PII-impossible by construction: every one of those fields is a SLUG
 * (SLUG_REGEX — lowercase a-z0-9 and `_ - : .`, 1–64 chars). So this module's
 * entire job is to turn the RAW, attacker-/user-controlled `?utm_*=…` query and
 * the raw `document.referrer` URL into guaranteed-valid slugs (or drop them),
 * NEVER letting a full URL, a query string, or free prose reach the wire.
 *
 * WHY A SEPARATE PURE MODULE: this is the security-critical normalisation, so it
 * lives in a pure (no React / DOM / Prisma) unit-tested file rather than inline
 * in the provider. The provider passes it `window.location.search` +
 * `document.referrer` and forwards the result; the server ingestion boundary
 * re-validates every slug via the same SLUG_REGEX, so a bug here can only ever
 * drop a value, never leak one.
 *
 * GROUNDING: `acq_page_viewed`'s payload schema (./events.ts) accepts exactly
 * `{ utmSource?, utmMedium?, utmCampaign?, utmContent?, utmTerm? }` as optional
 * slugs — that is the closed set this module produces. The `referrer` host is
 * intentionally NOT part of that payload schema (it would widen cardinality and
 * the schema is `.strict()`); it is carried as the page's `topic` slug instead,
 * the one normalised-token field the envelope already allows.
 *
 * Pure module — unit-tested in utm.test.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { SLUG_REGEX } from "./events";
import { segmentToSlug } from "./surface";

/** The five UTM dimensions, normalised to slugs (any absent key omitted). */
export interface UtmSlugs {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
}

/** Map of `utm_*` query keys → the camelCase payload field they populate. */
const UTM_KEY_MAP: ReadonlyArray<readonly [string, keyof UtmSlugs]> = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_content", "utmContent"],
  ["utm_term", "utmTerm"],
];

/**
 * Normalise one raw UTM value into a slug, or `undefined` if it cannot become a
 * meaningful one. Reuses {@link segmentToSlug} (lowercase, non-slug chars → `-`,
 * trim leading separators, 64-char cap) so the result ALWAYS passes SLUG_REGEX.
 * Empty / whitespace-only / sentinel-only inputs are dropped (return undefined)
 * so we never emit a junk `"index"`/`":id"` placeholder as if it were a real
 * campaign token.
 */
export function normalizeUtmValue(
  raw: string | null | undefined,
): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  const slug = segmentToSlug(trimmed);
  // segmentToSlug returns these sentinels for empty / id-shaped input — they are
  // not real attribution values, so suppress them rather than record noise.
  if (slug === "index" || slug === ":id" || slug === "segment")
    return undefined;
  return SLUG_REGEX.test(slug) ? slug : undefined;
}

/**
 * Parse the five UTM dimensions out of a raw query string (the value of
 * `window.location.search`, with or without a leading "?"). Returns only the
 * keys that were present AND normalised to a valid slug. Never throws; an
 * unparseable input yields `{}`.
 *
 * The RAW query string is consumed here and DISCARDED — only the bounded slug
 * values escape, so the original `?utm_campaign=<free text>` (which can carry
 * PII / tracking ids) never leaves the browser.
 */
export function parseUtmParams(search: string | null | undefined): UtmSlugs {
  const out: UtmSlugs = {};
  if (typeof search !== "string" || search.length === 0) return out;
  let params: URLSearchParams;
  try {
    // URLSearchParams tolerates a leading "?" and is total over any string.
    params = new URLSearchParams(
      search.startsWith("?") ? search.slice(1) : search,
    );
  } catch {
    return out;
  }
  for (const [queryKey, field] of UTM_KEY_MAP) {
    const slug = normalizeUtmValue(params.get(queryKey));
    if (slug !== undefined) out[field] = slug;
  }
  return out;
}

/**
 * Reduce a raw referrer URL (the value of `document.referrer`) to a coarse,
 * bounded HOST slug — e.g. `https://www.google.com/search?q=secret` → `google`
 * (the registrable-ish label, `www.` stripped). Returns `undefined` for an empty
 * referrer (direct / typed-in traffic) or a SAME-ORIGIN referrer (internal
 * navigation is not an acquisition source). Only the host label survives — the
 * path + query (which can carry the user's prior search terms / PII) are dropped
 * before anything is emitted.
 *
 * @param referrer   The raw `document.referrer` string.
 * @param currentOrigin Optional current `window.location.origin` — when the
 *   referrer shares it, the function returns `undefined` (same-site nav).
 */
export function referrerToSlug(
  referrer: string | null | undefined,
  currentOrigin?: string | null,
): string | undefined {
  if (typeof referrer !== "string") return undefined;
  const trimmed = referrer.trim();
  if (trimmed.length === 0) return undefined;

  let host: string;
  let origin: string;
  try {
    const url = new URL(trimmed);
    host = url.hostname;
    origin = url.origin;
  } catch {
    // Not an absolute URL — nothing trustworthy to extract.
    return undefined;
  }
  if (!host) return undefined;
  // Same-origin referrer = internal navigation, not an external acquisition src.
  if (currentOrigin && origin === currentOrigin) return undefined;

  // Strip a leading "www." then take the most significant label that is not a
  // bare TLD: e.g. "www.google.com" → "google", "t.co" → "t",
  // "news.ycombinator.com" → "ycombinator". This keeps host cardinality low and
  // human-readable without a public-suffix list.
  const bare = host.toLowerCase().replace(/^www\./, "");
  const labels = bare.split(".").filter(Boolean);
  if (labels.length === 0) return undefined;
  const significant =
    labels.length >= 2 ? labels[labels.length - 2] : labels[0];
  return normalizeUtmValue(significant);
}

/**
 * One-shot capture: turn a raw query string + raw referrer (+ optional current
 * origin) into the acquisition attribution bundle the provider stamps on an
 * `acq_page_viewed`. `utm` holds the (possibly empty) slug payload; `referrer`
 * is the coarse host slug (or undefined). Pure + total.
 */
export function captureAcquisition(
  search: string | null | undefined,
  referrer: string | null | undefined,
  currentOrigin?: string | null,
): { utm: UtmSlugs; referrer?: string } {
  const utm = parseUtmParams(search);
  const ref = referrerToSlug(referrer, currentOrigin);
  return ref !== undefined ? { utm, referrer: ref } : { utm };
}
