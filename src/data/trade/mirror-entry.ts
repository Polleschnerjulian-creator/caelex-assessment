/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Data-Sprint S5 — MIRROR ARCHITECTURE FOUNDATION.
 *
 * A large family of national control lists do NOT invent their own goods
 * numbering: they ADOPT the multilateral / EU dual-use list one-to-one and
 * publish it under a national cover. Switzerland's Güterkontrollverordnung
 * (Anhang 2 Teil 2), Norway's dual-use list, Canada's ECL Group 1, Australia's
 * DSGL Part 2 — each transposes the Wassenaar Arrangement Dual-Use List (and,
 * for the EU members / Switzerland via the bilateral agreements, the EU Annex I
 * structure) verbatim, code-for-code. A Swiss `9A004` IS the Wassenaar/EU
 * `9A004`; the Swiss list merely references it under the Swiss EKN
 * (Exportkontrollnummer) scheme.
 *
 * Re-curating those code lists per country would be both wasteful and a
 * fabrication risk (we would be re-typing the SAME control text from a
 * different official cover and inevitably drift). The MIRROR architecture
 * instead lets a per-country data file declare, for each national code, that it
 * MIRRORS an EXISTING union entry — and inherit that entry's title/description/
 * controlReason while carrying its OWN national code, source URL and as-of
 * date. Only the genuine national DELTAS (a modified scope, or a control with
 * no multilateral equivalent) carry their own text.
 *
 * This file defines the per-country source shape (`MirrorEntry`). The adapter
 * that resolves a `MirrorEntry[]` against the already-built union base
 * (`adaptMirrorEntries`) lives in `normalized-corpus.ts` next to its sibling
 * adapters, because it needs the union's internal `NormalizedCorpusEntry` type
 * and the base lookup map.
 *
 * THREE DELTA TYPES (the `mirrorDelta` discriminator):
 *   • "NONE"          — the national code is a verbatim adoption of the source
 *                       entry. title/description/controlReason are INHERITED
 *                       from the resolved source; `mirrorsCanonicalId` is
 *                       REQUIRED and MUST resolve (fail-fast on a dangling
 *                       mirror).
 *   • "MODIFIED"      — the national code mirrors a source entry for LINKAGE
 *                       (the source must still exist), but the country has
 *                       altered the scope/threshold, so the entry carries its
 *                       OWN title + description (REQUIRED). `mirrorsCanonicalId`
 *                       is REQUIRED and MUST resolve.
 *   • "NATIONAL_ONLY" — a genuinely national control with NO multilateral /
 *                       union equivalent (e.g. a Swiss national-control Anhang 5
 *                       position). No source lookup; title + description are
 *                       REQUIRED; `mirrorsCanonicalId` is ABSENT.
 *
 * Pure data transformation — no I/O, no Claude, zero external cost.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/**
 * One national control-list entry expressed as a MIRROR of the union.
 *
 * A per-country data file (e.g. `ch-gkv.ts`) exports a `readonly MirrorEntry[]`;
 * `adaptMirrorEntries` (in `normalized-corpus.ts`) resolves each against the
 * union base and produces `NormalizedCorpusEntry` rows under the country's own
 * regime. Distinct from `ClassificationEntry` and the other own-type corpus
 * shapes (`UkStrategicEntry`, `EuCmlEntry`, …) — this shape carries the mirror
 * linkage instead of re-stating the full control text.
 */
export interface MirrorEntry {
  /**
   * The country's OWN code, exactly as the national list prints it
   * (e.g. a Swiss EKN "9A004", a CA ECL "9-15"). Becomes the produced
   * `NormalizedCorpusEntry.code`; the canonicalId is `${regime}:${nationalCode}`.
   */
  nationalCode: string;

  /**
   * The EXISTING union `canonicalId` this national code mirrors
   * (e.g. "EU_ANNEX_I:9A004", "WASSENAAR:9A004", "MTCR_ANNEX:1.A.1").
   * REQUIRED for "NONE" + "MODIFIED" (the adapter resolves it in the base map
   * and throws a dangling-mirror Error if it is missing). ABSENT for
   * "NATIONAL_ONLY".
   */
  mirrorsCanonicalId?: string;

  /** Which kind of mirror linkage this entry expresses. */
  mirrorDelta: "NONE" | "MODIFIED" | "NATIONAL_ONLY";

  /**
   * REQUIRED for "MODIFIED" + "NATIONAL_ONLY" (the entry's OWN headline). For
   * "NONE" it is OMITTED and inherited from the resolved source entry. The
   * adapter throws if a MODIFIED/NATIONAL_ONLY entry omits it.
   */
  title?: string;

  /**
   * REQUIRED for "MODIFIED" + "NATIONAL_ONLY" (the entry's OWN description). For
   * "NONE" it is OMITTED and inherited from the resolved source entry. The
   * adapter throws if a MODIFIED/NATIONAL_ONLY entry omits it.
   */
  description?: string;

  /**
   * Optional control-reason override. When present it REPLACES the inherited
   * reasons; when absent a "NONE"/"MODIFIED" entry inherits the source's
   * reasons and a "NATIONAL_ONLY" entry defaults to []. We never fabricate a
   * reason the national source does not carry.
   */
  controlReason?: string[];

  /** The NATIONAL official source URL (always present). */
  sourceUrl: string;

  /** Verification date, YYYY-MM-DD. */
  asOfDate: string;
}
