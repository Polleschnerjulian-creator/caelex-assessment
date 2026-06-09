/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Passage — Screening result, three-valued + the Explanation Envelope.
 *
 * THESIS: the Ausfuhrverantwortliche signs with personal criminal liability,
 * so a green "CLEAR" that is actually "we couldn't check" is disqualifying.
 * Screening is honestly THREE-VALUED:
 *
 *   CLEAR           — every critical list was present, fresh, and produced no
 *                     name/identifier/cascade hit. A real, verifiable negative.
 *   POTENTIAL_MATCH — at least one hit (name / identifier / 50%-cascade /
 *                     control-without-equity). Human triage required.
 *   UNVERIFIED      — a CRITICAL sanctions/denied-party list was MISSING
 *                     (never synced / cron down) or STALE (snapshot past its
 *                     freshness TTL). The screen could NOT rule out a match —
 *                     this is NOT a hit and NOT a clear. Neutral-but-blocking,
 *                     never green. Fail-closed: missing/stale data => an
 *                     explicit non-clear state, never a silent pass.
 *
 * The persisted `TradeScreeningDecision` Prisma enum has no UNVERIFIED value
 * (additive-only; no migration in this lane), so an UNVERIFIED screen is
 * persisted with the safe non-CLEAR enum value (POTENTIAL_MATCH) — preserving
 * the fail-closed write + the existing triage path — while THIS in-memory
 * `verification` lane + the `ExplainedResult` below carry the honest UNVERIFIED
 * signal the UI surfaces loudly (amber/neutral, never a green GO).
 *
 * ── Explanation Envelope (ExplainedResult<T>) ──────────────────────────────
 * The envelope types + constructors are imported from the single canonical
 * contract at `src/lib/comply-v2/trade/explained-result.ts` and re-exported
 * below, so this screening lane shares ONE definition with the rest of Passage
 * (no drift) and every envelope is built through the throwing constructors the
 * shared <ExplainedPanel> renderer relies on (it refuses to render an
 * un-explained consequential result).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { TradeSanctionsList } from "@prisma/client";

// ─── The Explanation Envelope (canonical contract) ─────────────────────────
//
// The envelope types + constructors are the single canonical contract in
// `explained-result.ts` (lane 1). Re-exported here so downstream importers of
// this screening module (screen-party.server.ts, the [id] party page) keep a
// stable import surface. Building envelopes via `explainedResult()` /
// `unverifiedResult()` runs the throw-on-missing-source / throw-on-missing-why
// guards, so an un-explained screening envelope can never be constructed.
import {
  explainedResult,
  unverifiedResult,
  type ExplainConfidence,
  type ExplainSource,
  type ExplainOverride,
  type ExplainedResult,
} from "@/lib/comply-v2/trade/explained-result";

export type {
  ExplainConfidence,
  ExplainSource,
  ExplainOverride,
  ExplainedResult,
};

// ─── Three-valued screening verdict ────────────────────────────────────────

/**
 * The honest, three-valued verification state of a screening run. This is the
 * value the UI keys its colour + copy off — NOT the persisted enum.
 *
 * Mapping to the persisted `TradeScreeningDecision`:
 *   CLEAR           ⇒ decision CLEAR
 *   POTENTIAL_MATCH ⇒ decision POTENTIAL_MATCH (a real hit)
 *   UNVERIFIED      ⇒ decision POTENTIAL_MATCH (fail-closed; reason is gap-not-hit)
 */
export type ScreeningVerification = "CLEAR" | "POTENTIAL_MATCH" | "UNVERIFIED";

/**
 * Why a screen is UNVERIFIED: which critical lists were unscreenable and how.
 * One of `missing` / `stale` is non-empty whenever verification === "UNVERIFIED".
 */
export interface ScreeningGap {
  /** Critical lists with NO snapshot at all (never synced / cron never ran). */
  missing: TradeSanctionsList[];
  /**
   * Critical lists whose latest snapshot is PRESENT but older than the
   * freshness TTL, with the snapshot's own version + age for the audit trail.
   */
  stale: Array<{
    list: TradeSanctionsList;
    /** Snapshot content hash that was too old (provenance). */
    snapshotHash: string;
    /** Upstream-published version of the stale snapshot, if any. */
    upstreamVersion?: string;
    /** When that snapshot was fetched. */
    fetchedAt: string;
    /** Age of the stale snapshot, in whole hours, at screen time. */
    ageHours: number;
  }>;
  /** The TTL (hours) a critical snapshot may reach before it is treated stale. */
  maxAgeHours: number;
}

/** The machine-readable result carried in ExplainedResult.value. */
export interface ScreeningVerdict {
  verification: ScreeningVerification;
  /** The persisted decision enum (audit / DB consistency). */
  decision: "CLEAR" | "POTENTIAL_MATCH";
  /** Top fuzzy-match score across all consulted lists (0 when none). */
  topScore: number;
  /** Number of persisted hits. */
  hitCount: number;
  /** Whether the 50%-ownership cascade triggered. */
  cascadeHit: boolean;
  /** Critical-list coverage gap (empty arrays unless UNVERIFIED). */
  gap: ScreeningGap;
}

// ─── Pretty list labels (UI + source citations) ────────────────────────────

const LIST_LABEL: Record<string, string> = {
  OFAC_SDN: "OFAC SDN",
  BIS_ENTITY: "BIS Entity List",
  EU_FSF: "EU FSF (consolidated)",
  UN_CONSOLIDATED: "UN Consolidated",
  DDTC_DEBARRED: "DDTC Debarred",
  UK_OFSI: "UK OFSI",
  EU_ANNEX_IV: "EU Reg. 833/2014 Annex IV",
  OPEN_SANCTIONS: "OpenSanctions",
};

const LIST_AUTHORITY_CITATION: Record<string, string> = {
  OFAC_SDN: "31 CFR Part 501 — OFAC Specially Designated Nationals",
  BIS_ENTITY: "15 CFR Part 744 Supp. No. 4 — BIS Entity List",
  EU_FSF: "EU Consolidated Financial Sanctions File",
  UN_CONSOLIDATED: "UN Security Council Consolidated Sanctions List",
};

export function listLabel(list: TradeSanctionsList | string): string {
  return LIST_LABEL[list] ?? String(list).replace(/_/g, " ");
}

// ─── The builder: ScreeningVerdict → ExplainedResult<ScreeningVerdict> ─────

/**
 * Compose the Explanation Envelope for a screening verdict. The renderer
 * refuses to display a consequential result with empty what/why/wherefore/
 * confidence, OR empty sources while confidence !== UNVERIFIED — so EVERY
 * branch here populates those fields honestly.
 *
 * Conservative-by-design:
 *   - UNVERIFIED carries confidence "UNVERIFIED" and a `why` naming the exact
 *     missing/stale critical list(s) + how stale; the missing/stale list IS a
 *     source (with its listVersion), so the gap is itself cited.
 *   - CLEAR is a real negative (confidence HIGH) with every critical list cited
 *     as a source. It can ONLY be reached when no critical list is missing/stale
 *     (the engine guarantees this), so a CLEAR envelope can never hide a gap.
 *   - POTENTIAL_MATCH stays MEDIUM (a fuzzy/cascade signal, not a confirmed
 *     identity) and points the human to triage — the audited-reasoning flow is
 *     untouched.
 */
export function buildScreeningExplained(
  verdict: ScreeningVerdict,
  ctx: {
    partyName: string;
    /** Critical lists actually consulted (present + fresh) — cited on CLEAR. */
    criticalConsulted: Array<{
      list: TradeSanctionsList;
      snapshotHash: string;
      upstreamVersion?: string;
      fetchedAt: string;
    }>;
    /** Distinct lists that produced hits (cited on POTENTIAL_MATCH). */
    hitLists?: TradeSanctionsList[];
  },
): ExplainedResult<ScreeningVerdict> {
  const override: ExplainOverride = { allowed: false };

  if (verdict.verification === "UNVERIFIED") {
    const { missing, stale, maxAgeHours } = verdict.gap;

    // Each missing/stale critical list is itself a SOURCE — its (un)version is
    // the gap. listVersion = "MISSING" / "STALE@<version> (<age>h old)".
    const sources: ExplainSource[] = [
      ...missing.map((l) => ({
        label: listLabel(l),
        citation: LIST_AUTHORITY_CITATION[l] ?? listLabel(l),
        listVersion: "MISSING — no snapshot ingested",
      })),
      ...stale.map((s) => ({
        label: listLabel(s.list),
        citation: LIST_AUTHORITY_CITATION[s.list] ?? listLabel(s.list),
        listVersion: `STALE — ${s.upstreamVersion ?? s.snapshotHash.slice(0, 12)} · ${s.ageHours}h old (TTL ${maxAgeHours}h)`,
      })),
    ];

    const missingNames = missing.map(listLabel);
    const staleNames = stale.map(
      (s) => `${listLabel(s.list)} (${s.ageHours}h old)`,
    );
    const gapParts: string[] = [];
    if (missingNames.length > 0)
      gapParts.push(`missing: ${missingNames.join(", ")}`);
    if (staleNames.length > 0)
      gapParts.push(`stale (> ${maxAgeHours}h TTL): ${staleNames.join(", ")}`);

    return unverifiedResult({
      value: verdict,
      what: `UNVERIFIED — ${ctx.partyName} could NOT be cleared: a critical sanctions list was not screenable`,
      why:
        `No name, identifier, or ownership hit was found against the lists that WERE available — ` +
        `but ${gapParts.join("; ")}. A CLEAR cannot be issued while a critical designated-party ` +
        `list is unscreened or stale: clearing against a missing or weeks-old list is no safer than ` +
        `clearing against none. (Fail-closed gate: T-H3 missing-list / SNAPSHOT-STALENESS.)`,
      wherefore:
        `Do NOT transact on this result. Treat the party as NOT cleared until the affected ` +
        `list(s) are re-synced and the party is re-screened. Trigger a sanctions-list sync ` +
        `(or wait for the daily cron), then re-run "Screen now". If you must proceed, an ` +
        `authorised reviewer can record a documented override — the screen stays UNVERIFIED on the audit trail.`,
      sources,
      override,
    });
  }

  if (verdict.verification === "POTENTIAL_MATCH") {
    const hitLists = ctx.hitLists ?? [];
    // Sources: the lists that produced the signal + (always) the critical lists
    // that WERE screened, so the reviewer sees the full corpus version basis.
    const sources: ExplainSource[] = [
      ...hitLists.map((l) => ({
        label: listLabel(l),
        citation: LIST_AUTHORITY_CITATION[l] ?? listLabel(l),
      })),
      ...ctx.criticalConsulted.map((c) => ({
        label: listLabel(c.list),
        citation: LIST_AUTHORITY_CITATION[c.list] ?? listLabel(c.list),
        listVersion: c.upstreamVersion ?? c.snapshotHash.slice(0, 12),
      })),
    ];
    // Dedupe by label, keep first (a hit-list cite wins over the corpus cite).
    const seen = new Set<string>();
    const dedupedSources = sources.filter((s) => {
      if (seen.has(s.label)) return false;
      seen.add(s.label);
      return true;
    });

    const reason = verdict.cascadeHit
      ? `a ≥50%-ownership cascade to a sanctioned/blocked owner`
      : `a name/identifier match (top score ${verdict.topScore.toFixed(3)} across ${verdict.hitCount} hit${verdict.hitCount === 1 ? "" : "s"})`;

    return explainedResult({
      value: verdict,
      what: `POTENTIAL MATCH — ${ctx.partyName} requires human triage before any transaction`,
      why: `Screening surfaced ${reason}. This is a SIGNAL, not a confirmed identity — the same name/owner may be a different person/entity.`,
      wherefore: `Open the screening run, review the matched entries (and ownership chain, if any), and record a documented decision: confirm the hit (block) or dismiss as a false positive. Do NOT transact until decided.`,
      confidence: "MEDIUM",
      sources:
        dedupedSources.length > 0
          ? dedupedSources
          : [
              {
                label: "Screening corpus",
                citation: "Consolidated sanctions / denied-party lists",
              },
            ],
      override,
    });
  }

  // (POTENTIAL_MATCH returned above.)

  // CLEAR — a real, verifiable negative. Reachable ONLY when every critical
  // list was present + fresh, so the gap is provably empty here.
  const sources: ExplainSource[] = ctx.criticalConsulted.map((c) => ({
    label: listLabel(c.list),
    citation: LIST_AUTHORITY_CITATION[c.list] ?? listLabel(c.list),
    listVersion: c.upstreamVersion ?? c.snapshotHash.slice(0, 12),
  }));

  return explainedResult({
    value: verdict,
    what: `CLEAR — no sanctions match for ${ctx.partyName}`,
    why: `Every critical designated-party list (${ctx.criticalConsulted.map((c) => listLabel(c.list)).join(", ")}) was present and fresh, and produced no name, identifier, or ≥50%-ownership match above the configured threshold.`,
    wherefore: `No screening block on this party. Re-screen before any new transaction once the result is older than the org's re-screen cadence (sanctions lists change frequently).`,
    confidence: "HIGH",
    // CLEAR is a determined result, so sources MUST be non-empty. The engine
    // only reaches CLEAR with at least the critical lists consulted, so this
    // is always satisfied — but guard defensively.
    sources:
      sources.length > 0
        ? sources
        : [
            {
              label: "Screening corpus",
              citation: "Consolidated sanctions / denied-party lists",
            },
          ],
    override,
  });
}

// ─── Derive the verification state from a PERSISTED screening row ───────────
//
// The persisted `TradeScreeningDecision` enum has no UNVERIFIED value, so a
// historical row stores both a real hit AND a fail-closed gap as
// POTENTIAL_MATCH. The persistent detail page (which reads stored rows, not a
// live screen) reconstructs the honest three-valued state from the evidence:
//
//   CLEAR           ⇐ decision CLEAR
//   POTENTIAL_MATCH ⇐ decision POTENTIAL_MATCH WITH evidence of a real signal
//                     (≥1 hit, OR a 50%-cascade hit, OR a sanctioned
//                     control-without-equity owner)
//   UNVERIFIED      ⇐ decision POTENTIAL_MATCH with NO such evidence — the
//                     ONLY way the engine reaches POTENTIAL_MATCH without a
//                     signal is the missing/stale-critical-list fail-closed
//                     gate. (CONFIRMED_HIT / FALSE_POSITIVE_DISMISSED are
//                     post-triage human decisions — never UNVERIFIED.)
//
// CONSERVATIVE: this never upgrades a stored result to CLEAR. A POTENTIAL_MATCH
// without visible evidence resolves to UNVERIFIED (neutral-but-blocking), never
// to a green clear — so a lost/garbled hits array fails closed, not open.

/** The minimal persisted shape this derivation reads. */
export interface PersistedScreeningRow {
  decision:
    | "CLEAR"
    | "POTENTIAL_MATCH"
    | "CONFIRMED_HIT"
    | "FALSE_POSITIVE_DISMISSED";
  /** Persisted hits array (may be empty). */
  hits: Array<unknown> | null | undefined;
  /** Persisted cascade snapshot (CascadeResult shape) or null. */
  cascade:
    | {
        cascadeHit?: boolean;
        sanctionedAncestorCount?: number;
        sanctionedControlOnlyCount?: number;
      }
    | null
    | undefined;
}

/**
 * Reconstruct the honest three-valued verification of a stored screening row.
 * Returns null for terminal human decisions (CONFIRMED_HIT /
 * FALSE_POSITIVE_DISMISSED) — those have their own UI treatment and are never
 * UNVERIFIED.
 */
export function deriveVerificationFromPersistedRow(
  row: PersistedScreeningRow,
): ScreeningVerification | null {
  if (row.decision === "CLEAR") return "CLEAR";
  if (
    row.decision === "CONFIRMED_HIT" ||
    row.decision === "FALSE_POSITIVE_DISMISSED"
  ) {
    return null;
  }
  // decision === "POTENTIAL_MATCH": distinguish a real signal from the gap.
  const hitCount = Array.isArray(row.hits) ? row.hits.length : 0;
  const cascadeHit = row.cascade?.cascadeHit === true;
  const sanctionedAncestors = row.cascade?.sanctionedAncestorCount ?? 0;
  const controlOnly = row.cascade?.sanctionedControlOnlyCount ?? 0;
  const hasRealSignal =
    hitCount > 0 || cascadeHit || sanctionedAncestors > 0 || controlOnly > 0;
  return hasRealSignal ? "POTENTIAL_MATCH" : "UNVERIFIED";
}
