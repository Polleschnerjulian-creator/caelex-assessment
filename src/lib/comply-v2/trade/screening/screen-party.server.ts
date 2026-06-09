/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Screen one TradeParty against the latest snapshots of all registered
 * sanctions lists. Persists a TradeScreeningResult and updates the
 * TradeParty's denormalized screeningStatus + lastScreenedAt.
 *
 * This is the central server function called by:
 *   - The on-demand "Screen now" button in /dashboard/trade/counterparties (A8)
 *   - The Astra tool `screen_trade_party` (A7)
 *   - The continuous re-screening cron (A7) for parties whose lastScreenedAt
 *     is older than 30 days
 *
 * Design:
 *   - Pure-ish: takes prisma client + party id, returns the new screening
 *     result. No HTTP, no UI concerns.
 *   - Uses the latest snapshot per list (computed via allLatestSnapshots()).
 *     Snapshot hash is recorded on the screening result for audit.
 *   - Hits below WEAK_MATCH threshold are dropped from persistence
 *     (would create noise; if the operator needs lower-threshold hits
 *     they re-screen with custom threshold via the screening engine).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  TradeScreeningStatus,
  TradeScreeningDecision,
  TradeSanctionsList,
  type TradeParty,
  NotificationType,
  NotificationSeverity,
  type TradeScreeningResult,
} from "@prisma/client";
import { logger } from "@/lib/logger";

import {
  classifyScore,
  matchByIdentifier,
  screenAgainstEntries,
  type FuzzyHit,
} from "./fuzzy-match";
import { allLatestSnapshots } from "./snapshot-store.server";
import { getEffectiveScreeningConfig } from "@/lib/trade/settings/screening-config-service";
import { REGISTERED_PARSERS } from "./sync.server";
import type { CanonicalSanctionsEntry } from "./sources/types";
import { runCascadeForParty } from "./cascade-50pct.server";
import type { CascadeResultWithUbo } from "./cascade-50pct.server";
import { sendTradeSanctionsHit } from "@/lib/email";
import {
  buildScreeningExplained,
  listLabel,
  type ExplainedResult,
  type ScreeningGap,
  type ScreeningVerdict,
  type ScreeningVerification,
} from "./screening-explained";

// ─── Critical lists (T-H3: fail-closed gate) ────────────────────────
//
// When a screening result would otherwise be CLEAR, but one or more of
// these primary designated-party lists was ABSENT from the snapshot Map
// (cron down, sync failure, etc.), the result is escalated to
// POTENTIAL_MATCH / POTENTIAL_MATCH so a human reviews it.
// This prevents an infra failure from silently producing a "compliant"
// verdict.
//
// Only primary single-authority lists are critical; aggregated / optional
// lists (UK_OFSI, DDTC_DEBARRED, EU_ANNEX_IV, OPEN_SANCTIONS) are
// supplementary — their absence does NOT block a CLEAR.
export const CRITICAL_LISTS: TradeSanctionsList[] = [
  TradeSanctionsList.OFAC_SDN,
  TradeSanctionsList.EU_FSF,
  TradeSanctionsList.UN_CONSOLIDATED,
  TradeSanctionsList.BIS_ENTITY,
];

// ─── Snapshot staleness (SNAPSHOT-STALENESS gate) ───────────────────
//
// A critical-list snapshot that is PRESENT but older than this TTL is
// treated like a missing one: a would-be-CLEAR is escalated to
// POTENTIAL_MATCH. The T-H3 gate only catches an ABSENT snapshot; if the
// daily sync cron silently stops (network, auth, upstream URL drift) the
// latest snapshot just goes stale, and screening a party CLEAR against a
// weeks-old OFAC list is no safer than screening against none.
//
// 48h gives the daily cron one fully-missed run of slack before a screen
// escalates. This is a fail-closed POLICY choice (no regulatory SLA on
// list freshness), so it lives as a constant, not a verified legal value.
export const CRITICAL_SNAPSHOT_MAX_AGE_MS = 48 * 60 * 60 * 1000;

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Reason-for-listing metadata projected from a sanctions entry's
 * `listMetadata` (OFAC programs, BIS policy, EU regulation ref, UN reference,
 * remarks) plus the authority citation for the list. Surfaced on the party
 * page as the progressive-disclosure "Warum steht diese Partei auf der Liste?"
 * detail.
 *
 * PRESENTATION ONLY — derived from already-parsed source data, never affects a
 * screening decision. Every field is optional: when a source did not publish a
 * given datum the UI shows "Grund nicht in der Quelle hinterlegt" rather than
 * inventing one.
 */
export interface HitReasonMeta {
  /**
   * The single-line reason-for-listing, when the source carries one. Composed
   * from the most specific datum available (OFAC remarks, EU/UN remarks). Never
   * fabricated — absent when the source did not publish a reason.
   */
  reasonForListing?: string;
  /**
   * Sanctions programmes / regulation references that designated this entry:
   *   - OFAC SDN: programme tags (e.g. "SDGT", "RUSSIA-EO14024")
   *   - EU FSF: regulation numbers (e.g. "833/2014")
   *   - UN: UN list type
   *   - BIS: licence policy code, when present
   */
  programs?: string[];
  /** Free-form remarks/title the source published (extra context for triage). */
  remarks?: string;
  /** The authority + legal-basis citation for the LIST this hit came from. */
  authorityCitation?: string;
  /** Human label for the list (e.g. "OFAC SDN"), for the disclosure header. */
  listLabel?: string;
}

/**
 * Hit augmented with the source list (which list the entryId came from) plus
 * additive presentation metadata threaded for the party page. Persisted on
 * TradeScreeningResult.hits as JSONB. The added fields are OPTIONAL so historic
 * rows (without them) and the existing `FuzzyHit` consumers stay valid.
 */
export interface PersistableHit extends FuzzyHit {
  list: TradeSanctionsList;
  /**
   * The listed entity's PRIMARY/legal name (entry.names[0]). Lets the UI flag
   * an AKA match: when `matchedName` differs from `legalName`, the operator
   * matched on an alias, not the legal name. Absent only when the source had
   * no name (defensive — should never happen for a real hit).
   */
  legalName?: string;
  /**
   * True when the fuzzy `matchedName` is an ALIAS rather than the entry's legal
   * name (matchedName !== legalName). Surfaces "Treffer über Aliasname …".
   * False/undefined for an identifier hit or a legal-name match.
   */
  aliasMatch?: boolean;
  /** Reason-for-listing projection (program/policy/reg refs + authority). */
  reason?: HitReasonMeta;
}

export interface ScreenPartyOptions {
  /**
   * Override the score threshold below which hits are discarded. When
   * unset, the org's configured `matchThreshold` is used (0.75 if the org
   * never changed it). Pass a higher value for stricter screening or 0 to
   * capture everything (debug).
   */
  scoreThreshold?: number;

  /**
   * Override the user id recorded as `decidedById` on auto-CLEAR
   * results. Defaults to undefined (system-recorded). Set this when
   * a human-initiated screen run should attribute the decision to
   * that user.
   */
  systemDecisionUserId?: string;
}

export interface ScreenPartyResult {
  partyId: string;
  /** New screening result row. */
  screeningResult: TradeScreeningResult;
  /** Updated party (with new denormalized status fields). */
  party: TradeParty;
  /**
   * Cascade analysis result, if the party has any beneficial owners
   * in the org's graph. Null if no edges exist for this party (cascade
   * couldn't compute anything meaningful — common for newly-added
   * counterparties before ownership is captured).
   *
   * Carries the fail-closed `uboStatus` (COMPLETE/INCOMPLETE/UNKNOWN) so the
   * UI can show an amber "UBO unvollständig" alert when beneficial ownership
   * could not be fully resolved — never implying a clean cascade.
   */
  cascade: CascadeResultWithUbo | null;
  /** Summary for logging/UI. */
  summary: {
    hitCount: number;
    topScore: number;
    decision: TradeScreeningDecision;
    /**
     * Honest THREE-VALUED state the UI keys colour/copy off — distinct from
     * the persisted `decision` enum. A missing/stale critical list yields
     * UNVERIFIED (not a hit, not a clear), persisted as POTENTIAL_MATCH.
     */
    verification: ScreeningVerification;
    listsConsulted: TradeSanctionsList[];
    snapshotsMissing: TradeSanctionsList[];
    /** Critical lists whose latest snapshot is older than the staleness TTL. */
    snapshotsStale: TradeSanctionsList[];
    /** Whether the 50%-rule cascade triggered (≥50% sanctioned ownership). */
    cascadeHit: boolean;
    /** Number of CONFIRMED_HIT ancestors found via cascade traversal. */
    sanctionedAncestorCount: number;
  };
  /**
   * The Explanation Envelope for this screen — WHAT/WHY/WHEREFORE/CONFIDENCE/
   * SOURCE/OVERRIDE. UNVERIFIED carries confidence "UNVERIFIED" + the
   * missing/stale critical list(s) as sources (with listVersion). This is the
   * shape the <ExplainedPanel> renderer consumes; a CLEAR can never hide a
   * critical-list gap because the engine only reaches CLEAR with all critical
   * lists present + fresh.
   */
  explained: ExplainedResult<ScreeningVerdict>;
}

// ─── Reason-for-listing projection (PRESENTATION ONLY) ───────────────
//
// The authority + legal-basis citation per critical list, mirroring the table
// in screening-explained.ts. Used to attach an authority citation to each hit's
// reason detail so the operator can trace WHY the entry is listed back to the
// designating authority. Presentation-only — never feeds a decision.
const HIT_LIST_AUTHORITY: Partial<Record<TradeSanctionsList, string>> = {
  [TradeSanctionsList.OFAC_SDN]:
    "31 CFR Part 501 — OFAC Specially Designated Nationals",
  [TradeSanctionsList.BIS_ENTITY]:
    "15 CFR Part 744 Supp. No. 4 — BIS Entity List",
  [TradeSanctionsList.EU_FSF]: "EU Consolidated Financial Sanctions File",
  [TradeSanctionsList.UN_CONSOLIDATED]:
    "UN Security Council Consolidated Sanctions List",
};

/**
 * Read a string field from a sanctions entry's `listMetadata` bag, returning
 * `undefined` for anything that is not a non-empty string. Defensive: the bag
 * is `Record<string, unknown>`, so values may be of any type.
 */
function metaString(
  meta: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = meta[key];
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Read a string[] field from `listMetadata`, returning `undefined` when absent
 * or empty. Filters non-string / empty elements.
 */
function metaStringArray(
  meta: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const v = meta[key];
  if (!Array.isArray(v)) return undefined;
  const out = v.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
  return out.length > 0 ? out.map((s) => s.trim()) : undefined;
}

/**
 * Project a sanctions entry's already-parsed `listMetadata` into the
 * presentation-only `HitReasonMeta` surfaced on the party page. PURE — no I/O,
 * no decision impact.
 *
 * The reason-for-listing is composed from the MOST SPECIFIC datum the source
 * published (remarks / title), the programme / regulation references, and the
 * list's authority citation. Nothing is fabricated: when a source carries no
 * reason datum, `reasonForListing`/`remarks`/`programs` are simply absent and
 * the UI shows "Grund nicht in der Quelle hinterlegt".
 */
export function projectHitReason(
  entry: CanonicalSanctionsEntry,
  list: TradeSanctionsList,
): HitReasonMeta {
  const meta = entry.listMetadata ?? {};
  const programs = metaStringArray(meta, "programs");
  // OFAC/BIS use "remarks"; some sources also carry a "title". Prefer the
  // richest free-text reason the source published.
  const remarks = metaString(meta, "remarks");
  const title = metaString(meta, "title");
  const reasonForListing = remarks ?? title;

  return {
    ...(reasonForListing ? { reasonForListing } : {}),
    ...(programs ? { programs } : {}),
    ...(remarks ? { remarks } : {}),
    authorityCitation: HIT_LIST_AUTHORITY[list] ?? listLabel(list),
    listLabel: listLabel(list),
  };
}

/**
 * Enrich a raw FuzzyHit with the source list + presentation metadata threaded
 * for the party page: the entry's legal name, an AKA-match flag, and the
 * reason-for-listing projection. PURE — no I/O, no decision impact. The hit's
 * `score` / `entryId` / `matchedName` / `matchedFields` are preserved
 * byte-for-byte; only additive fields are layered on.
 *
 * AKA detection: a name hit whose `matchedName` differs from the entry's legal
 * name (`names[0]`) matched on an ALIAS. Identifier hits set `matchedName` to
 * `names[0]`, so they correctly report `aliasMatch: false`.
 */
export function enrichHit(
  hit: FuzzyHit,
  entry: CanonicalSanctionsEntry,
  list: TradeSanctionsList,
): PersistableHit {
  const legalName = entry.names[0];
  const aliasMatch =
    typeof legalName === "string" &&
    legalName.length > 0 &&
    hit.matchedName !== legalName;
  return {
    ...hit,
    list,
    ...(legalName ? { legalName } : {}),
    aliasMatch,
    reason: projectHitReason(entry, list),
  };
}

// ─── Main entry point ───────────────────────────────────────────────

/**
 * Screen one TradeParty by id. Throws if party not found.
 */
export async function screenParty(
  partyId: string,
  options: ScreenPartyOptions = {},
): Promise<ScreenPartyResult> {
  const party = await prisma.tradeParty.findUnique({ where: { id: partyId } });
  if (!party) {
    throw new Error(`TradeParty not found: ${partyId}`);
  }

  // Per-org screening config (settings → engine). Falls back to audited
  // defaults (all lists, threshold 0.75 = SCORE_WEAK_MATCH) when no row
  // exists, so behaviour is preserved for orgs that never touched settings.
  const config = await getEffectiveScreeningConfig(party.organizationId);
  // An explicit option (debug / stricter re-screen) still wins over config.
  const threshold = options.scoreThreshold ?? config.matchThreshold;

  const allSnapshots = await allLatestSnapshots();
  // Restrict to the org's enabled lists. The config layer guarantees the
  // critical lists are ALWAYS present (fail-closed), so this only skips
  // optional lists the operator turned off — it can never drop a critical
  // designated-party list. The T-H3 gate below still escalates if a
  // critical list's snapshot is genuinely missing (infra failure).
  const enabledSet = new Set<TradeSanctionsList>(
    config.enabledLists as TradeSanctionsList[],
  );
  const snapshots = new Map(
    [...allSnapshots].filter(([list]) => enabledSet.has(list)),
  );
  const listsConsulted = Array.from(snapshots.keys());

  // No snapshots at all — cron hasn't completed any successful sync yet.
  // This is NOT a failure of the party — we record an empty result with
  // a special note so the user understands why no hits appeared.
  if (snapshots.size === 0) {
    logger.warn(
      "screenParty: no sanctions snapshots available — sync cron may not have run yet",
      { partyId },
    );
  }

  // Build party's identifier list for exact-match pre-check (Sprint A3).
  // Only include non-null, non-empty values present on the loaded party.
  const partyIdentifiers: { type: string; value: string }[] = [
    party.leiCode ? { type: "lei", value: party.leiCode } : null,
    party.vatNumber ? { type: "vat", value: party.vatNumber } : null,
    party.ducnsNumber ? { type: "duns", value: party.ducnsNumber } : null,
    party.cageCode ? { type: "cage", value: party.cageCode } : null,
  ].filter((id): id is { type: string; value: string } => id !== null);

  // Run fuzzy match across ALL snapshots. List is preserved on each hit.
  // For each entry we first attempt an exact identifier pre-check: if the
  // party's LEI/VAT/DUNS/CAGE matches an entry identifier exactly, that is
  // a definitive hit (score 1.0) independent of the name score (Sprint A3).
  const allHits: PersistableHit[] = [];
  const hashesByList: Partial<Record<TradeSanctionsList, string>> = {};

  for (const [list, snapshot] of snapshots) {
    hashesByList[list] = snapshot.hash;
    const entries = snapshot.entries as unknown as CanonicalSanctionsEntry[];

    // entryId → entry lookup so we can enrich a FuzzyHit (which carries only
    // entryId/matchedName/score) with the source entry's legal name + reason
    // metadata for the UI. Presentation-only threading — does NOT affect which
    // hits are produced or their scores.
    const entryById = new Map<string, CanonicalSanctionsEntry>();
    for (const entry of entries) entryById.set(entry.entryId, entry);

    // Track entryIds that already produced an identifier hit so we don't
    // double-count them from the fuzzy-name pass below.
    const identifierHitIds = new Set<string>();

    if (partyIdentifiers.length > 0) {
      for (const entry of entries) {
        const idHit = matchByIdentifier(partyIdentifiers, entry);
        if (idHit) {
          allHits.push(enrichHit(idHit, entry, list));
          identifierHitIds.add(entry.entryId);
        }
      }
    }

    // Name-based fuzzy screening for entries NOT already caught by identifier.
    const nameHits = screenAgainstEntries(
      party.canonicalName,
      entries,
      threshold,
    );
    for (const hit of nameHits) {
      if (!identifierHitIds.has(hit.entryId)) {
        const entry = entryById.get(hit.entryId);
        allHits.push(entry ? enrichHit(hit, entry, list) : { ...hit, list });
      }
    }
  }

  // Sort all hits across lists by score descending
  allHits.sort((a, b) => b.score - a.score);

  // ── 50%-Rule Cascade Analysis (Sprint A6) ─────────────────────────
  // Independent of fuzzy match: even if the party's name doesn't match
  // any sanctions list directly, it may be sanctioned by virtue of
  // beneficial ownership ≥50% by sanctioned entities.
  const cascade = await runCascadeForParty(partyId, party.organizationId);

  // Determine overall decision: triggered by EITHER fuzzy hits OR
  // cascade. Cascade hit alone is sufficient to escalate to
  // POTENTIAL_MATCH (in fact more decisive than a 0.85 name match).
  const topScore = allHits.length > 0 ? allHits[0].score : 0;
  const band = classifyScore(topScore);
  const cascadeHit = cascade?.cascadeHit ?? false;
  const cascadeAncestorCount = cascade?.sanctionedAncestorCount ?? 0;
  // T-H5: control-without-equity signal (post-Dec-2025 OFAC trustee doctrine).
  // Separate from the equity 50%-rule — a sanctioned trustee/controller with
  // 0% equity triggers human review, not auto-block.
  const sanctionedControlOnlyCount = cascade?.sanctionedControlOnlyCount ?? 0;

  // ── T-H3: Identify missing critical-list snapshots ────────────────
  // Compute which critical lists were not consulted due to missing
  // snapshots (cron down, sync failure, etc.). This is done before the
  // decision block so we can escalate CLEAR → POTENTIAL_MATCH.
  const missingCritical = CRITICAL_LISTS.filter((l) => !snapshots.has(l));
  if (missingCritical.length > 0) {
    logger.warn(
      "screenParty: critical sanctions list(s) missing — a would-be-CLEAR result will be escalated to POTENTIAL_MATCH (T-H3)",
      { partyId, missingCritical },
    );
  }

  // ── SNAPSHOT-STALENESS: critical lists present but past their TTL ──
  // A snapshot that exists but is older than CRITICAL_SNAPSHOT_MAX_AGE_MS
  // means the sync cron has silently stopped refreshing it — clearing a
  // party against it is no safer than clearing against a missing list.
  // Escalate a would-be-CLEAR exactly like the T-H3 missing-list gate.
  const nowMs = Date.now();
  const staleCritical = CRITICAL_LISTS.filter((l) => {
    const snap = snapshots.get(l);
    return (
      !!snap && nowMs - snap.fetchedAt.getTime() > CRITICAL_SNAPSHOT_MAX_AGE_MS
    );
  });
  // Capture each stale snapshot's provenance (version + age) so the
  // Explanation Envelope can cite the EXACT stale list version as a source.
  const staleCriticalDetail = staleCritical.map((l) => {
    const snap = snapshots.get(l)!;
    return {
      list: l,
      snapshotHash: snap.hash,
      upstreamVersion: snap.upstreamVersion ?? undefined,
      fetchedAt: snap.fetchedAt.toISOString(),
      ageHours: Math.floor(
        (nowMs - snap.fetchedAt.getTime()) / (60 * 60 * 1000),
      ),
    };
  });
  if (staleCritical.length > 0) {
    logger.warn(
      "screenParty: critical sanctions list snapshot(s) STALE — a would-be-CLEAR result will be escalated to POTENTIAL_MATCH (SNAPSHOT-STALENESS)",
      { partyId, staleCritical, maxAgeMs: CRITICAL_SNAPSHOT_MAX_AGE_MS },
    );
  }

  // ── Three-valued verification + persisted decision ────────────────
  //
  // `verification` is the HONEST state the UI surfaces (CLEAR /
  // POTENTIAL_MATCH / UNVERIFIED). `decision`/`newStatus` are the persisted
  // Prisma enums (no UNVERIFIED value — additive-only, no migration), so an
  // UNVERIFIED screen is stored as the safe non-CLEAR enum POTENTIAL_MATCH.
  // This preserves the fail-closed write + the existing triage path while the
  // Explanation Envelope carries the gap-not-hit reason.
  //
  // Precedence:
  //   1. A real signal (name/identifier hit, 50%-cascade, control-only) ⇒
  //      POTENTIAL_MATCH — a genuine match suspicion, human triage.
  //   2. ELSE a missing/stale CRITICAL list ⇒ UNVERIFIED — a would-be-CLEAR
  //      that we could NOT verify; NEVER green. (T-H3 / SNAPSHOT-STALENESS.)
  //   3. ELSE CLEAR — a real negative against every present + fresh critical
  //      list. The ONLY branch that can be green.
  const criticalGapPresent =
    missingCritical.length > 0 || staleCritical.length > 0;
  let decision: TradeScreeningDecision;
  let newStatus: TradeScreeningStatus;
  let verification: ScreeningVerification;
  if (
    band === "confirmed" ||
    band === "potential" ||
    band === "weak" ||
    cascadeHit ||
    cascadeAncestorCount > 0
  ) {
    // Any of: name match (any band) OR cascade-detected sanctioned
    // ownership requires human review before clearing.
    decision = TradeScreeningDecision.POTENTIAL_MATCH;
    newStatus = TradeScreeningStatus.POTENTIAL_MATCH;
    verification = "POTENTIAL_MATCH";
  } else if (sanctionedControlOnlyCount > 0) {
    // T-H5: sanctioned control-without-equity owner (post-Dec-2025 OFAC
    // trustee doctrine). Softer than a 50%-rule cascade hit — the legal
    // effect is not as definitive, but OFAC control doctrine requires a
    // human to review. Escalate to POTENTIAL_MATCH rather than auto-block.
    // Uses existing enum values — no migration required.
    logger.warn(
      "screenParty: sanctioned control-without-equity owner detected (T-H5) — escalating to POTENTIAL_MATCH",
      { partyId, sanctionedControlOnlyCount },
    );
    decision = TradeScreeningDecision.POTENTIAL_MATCH;
    newStatus = TradeScreeningStatus.POTENTIAL_MATCH;
    verification = "POTENTIAL_MATCH";
  } else if (criticalGapPresent) {
    // T-H3 / SNAPSHOT-STALENESS: Would otherwise be CLEAR, but a critical
    // list's snapshot is unavailable (missing) or past its freshness TTL
    // (sync cron silently stopped). An infra failure must NOT silently
    // produce a "compliant" verdict. This is UNVERIFIED — we could not RULE
    // OUT a match, which is categorically different from POTENTIAL_MATCH (a
    // match suspicion). Persisted as POTENTIAL_MATCH (the safe non-CLEAR enum)
    // but surfaced as UNVERIFIED so the UI is honest: neutral/amber, never
    // green. Uses existing enum values — no migration required.
    logger.warn(
      "screenParty: would-be-CLEAR escalated to UNVERIFIED — critical list missing/stale (fail-closed, NOT a hit)",
      { partyId, missingCritical, staleCritical },
    );
    decision = TradeScreeningDecision.POTENTIAL_MATCH;
    newStatus = TradeScreeningStatus.POTENTIAL_MATCH;
    verification = "UNVERIFIED";
  } else {
    decision = TradeScreeningDecision.CLEAR;
    newStatus = TradeScreeningStatus.CLEAR;
    verification = "CLEAR";
  }

  // Compose snapshotHash — we hash the per-list hashes together so the
  // screening result is content-addressable to "this exact combination
  // of list versions". Lets us prove later: this party was screened
  // against THIS specific OFAC version + THIS specific BIS version etc.
  const combinedHash = combineHashes(hashesByList);

  // Persist + update denormalized fields atomically
  const now = new Date();
  const [screeningResult, updatedParty] = await prisma.$transaction([
    prisma.tradeScreeningResult.create({
      data: {
        partyId,
        hits: allHits as unknown as Prisma.InputJsonValue,
        decision,
        decidedById:
          decision === TradeScreeningDecision.CLEAR
            ? options.systemDecisionUserId
            : null,
        decidedAt: decision === TradeScreeningDecision.CLEAR ? now : null,
        snapshotHash: combinedHash,
        // Sprint A6: persist cascade snapshot so the UI can display
        // ancestor chains weeks later, and audit captures the exact
        // ownership-graph state used.
        cascade: cascade
          ? (cascade as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    }),
    prisma.tradeParty.update({
      where: { id: partyId },
      data: {
        screeningStatus: newStatus,
        // Nullable Json column: an explicit JSON-null must be written as
        // Prisma.JsonNull, not the JS `null` literal (Prisma type rule).
        screeningHits:
          allHits.length > 0
            ? (allHits.slice(0, 10) as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        lastScreenedAt: now,
      },
    }),
  ]);

  // ── Build the Explanation Envelope (WHAT/WHY/WHEREFORE/…) ──────────
  // The critical lists actually consulted (present + fresh) — cited as the
  // SOURCE basis on CLEAR, and the corpus basis on POTENTIAL_MATCH.
  const criticalConsulted = CRITICAL_LISTS.filter(
    (l) => snapshots.has(l) && !staleCritical.includes(l),
  ).map((l) => {
    const snap = snapshots.get(l)!;
    return {
      list: l,
      snapshotHash: snap.hash,
      upstreamVersion: snap.upstreamVersion ?? undefined,
      fetchedAt: snap.fetchedAt.toISOString(),
    };
  });
  // Distinct lists that produced a fuzzy/identifier hit (cited on a match).
  const hitLists = Array.from(new Set(allHits.map((h) => h.list)));

  const gap: ScreeningGap = {
    missing: missingCritical,
    stale: staleCriticalDetail,
    maxAgeHours: Math.floor(CRITICAL_SNAPSHOT_MAX_AGE_MS / (60 * 60 * 1000)),
  };
  const verdict: ScreeningVerdict = {
    verification,
    decision:
      decision === TradeScreeningDecision.CLEAR ? "CLEAR" : "POTENTIAL_MATCH",
    topScore,
    hitCount: allHits.length,
    cascadeHit,
    gap,
  };
  const explained = buildScreeningExplained(verdict, {
    partyName: updatedParty.legalName,
    criticalConsulted,
    hitLists,
  });

  const result: ScreenPartyResult = {
    partyId,
    screeningResult,
    party: updatedParty,
    cascade,
    summary: {
      hitCount: allHits.length,
      topScore,
      cascadeHit,
      sanctionedAncestorCount: cascadeAncestorCount,
      decision,
      verification,
      listsConsulted,
      snapshotsMissing: missingLists(listsConsulted),
      snapshotsStale: staleCritical,
    },
    explained,
  };

  logger.info("screenParty: completed", {
    partyId,
    decision,
    verification,
    hitCount: allHits.length,
    topScore: topScore.toFixed(3),
    listsConsulted: listsConsulted.length,
    missingCriticalCount: missingCritical.length,
    staleCriticalCount: staleCritical.length,
    cascadeHit,
    sanctionedAncestorCount: cascadeAncestorCount,
    cascadeAggregate: cascade?.aggregateSanctionedOwnership.toFixed(3),
    sanctionedControlOnlyCount,
  });

  // Sprint E2: dispatch sanctions-hit email when the screening decision
  // escalates from CLEAR. Best-effort — if email fails, the screening
  // result + Notification still persist. Fire-and-forget via try/catch
  // so the caller doesn't block on SMTP/Resend.
  if (decision === TradeScreeningDecision.POTENTIAL_MATCH) {
    void dispatchSanctionsHitEmails(updatedParty, allHits, cascade).catch(
      (err) => {
        logger.error(
          "screenParty: sanctions-hit email dispatch failed (result still persisted)",
          err,
          { partyId },
        );
      },
    );

    // Tier 1.2 — in-app PUSH on a NEW escalation. The only push before was
    // email (easy to miss); also surface a Notification in the app bell.
    // Transition-gated: only when the party was NOT already flagged, so a
    // routine re-screen of a still-flagged party doesn't re-spam the centre.
    // `party.screeningStatus` is the PRIOR value (loaded before the update).
    // Awaited (fast local DB write) for determinism, but best-effort — a
    // notification failure must never fail the screening.
    const wasAlreadyFlagged =
      party.screeningStatus === TradeScreeningStatus.POTENTIAL_MATCH ||
      party.screeningStatus === TradeScreeningStatus.CONFIRMED_HIT;
    if (!wasAlreadyFlagged) {
      try {
        await createSanctionsHitNotifications(updatedParty, allHits, cascade);
      } catch (err) {
        logger.error(
          "screenParty: sanctions-hit in-app notification failed (result still persisted)",
          err,
          { partyId },
        );
      }
    }
  }

  return result;
}

/**
 * Sprint E2 — send `trade_sanctions_hit` email to every OWNER/ADMIN/MANAGER
 * member of the party's org. Idempotent per (user, party, day) via the
 * same NotificationLog table — sendEmail() handles dedup at the log
 * layer, we just need to not call it twice for the same screening result.
 *
 * The "decided once per screening" rule lives upstream: this function is
 * only invoked on a fresh screenParty() call that returned POTENTIAL_MATCH,
 * so per-screening idempotency is implicit (we don't re-call screenParty
 * for the same snapshot hash within the same hour — the re-screen cron
 * checks lastScreenedAt).
 */
async function dispatchSanctionsHitEmails(
  party: TradeParty,
  hits: PersistableHit[],
  cascade: CascadeResultWithUbo | null,
): Promise<void> {
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: party.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: {
      userId: true,
      user: { select: { email: true, name: true } },
    },
  });
  if (recipients.length === 0) return;

  // Distinct sanctions lists across hits.
  const matchedLists = Array.from(new Set(hits.map((h) => h.list as string)));
  const topScore = hits.length > 0 ? hits[0].score : 0;
  const sanctionedAncestors =
    cascade?.ancestors
      .filter((a) => a.screeningStatus === "CONFIRMED_HIT" || a.isBlocked)
      .slice(0, 3)
      .map((a) => ({
        name: a.ancestorName,
        effectivePercent: a.effectivePercent,
      })) ?? [];

  for (const recipient of recipients) {
    if (!recipient.user?.email) continue;
    try {
      await sendTradeSanctionsHit(recipient.user.email, recipient.userId, {
        recipientName: recipient.user.name ?? "Operator",
        partyId: party.id,
        partyName: party.canonicalName,
        countryCode: party.countryCode,
        topScore,
        matchedLists,
        cascadeHit: cascade?.cascadeHit ?? false,
        sanctionedAncestorCount: cascade?.sanctionedAncestorCount ?? 0,
        sanctionedAncestors,
      });
    } catch (err) {
      logger.error(
        "dispatchSanctionsHitEmails: send failed for recipient",
        err,
        { partyId: party.id, userId: recipient.userId },
      );
    }
  }
}

/**
 * Tier 1.2 — create an in-app Notification for every OWNER/ADMIN/MANAGER of the
 * party's org when it NEWLY escalates to POTENTIAL_MATCH. Complements the email
 * path (which is easy to miss). Reuses the generic Notification model (no
 * migration): type COMPLIANCE_ACTION_REQUIRED, severity URGENT, deep-linking to
 * the screening triage queue. Caller transition-gates this so it fires once per
 * escalation, not on every re-screen of an already-flagged party.
 */
async function createSanctionsHitNotifications(
  party: TradeParty,
  hits: PersistableHit[],
  cascade: CascadeResultWithUbo | null,
): Promise<void> {
  const recipients = await prisma.organizationMember.findMany({
    where: {
      organizationId: party.organizationId,
      role: { in: ["OWNER", "ADMIN", "MANAGER"] },
    },
    select: { userId: true },
  });
  if (recipients.length === 0) return;

  const matchedLists = Array.from(new Set(hits.map((h) => h.list as string)));
  const reason = cascade?.cascadeHit
    ? `50%-Eigentums-Kaskade (${cascade.sanctionedAncestorCount} sanktionierte/r Eigentümer)`
    : matchedLists.length > 0
      ? `Treffer auf ${matchedLists.join(", ")}`
      : "Sanktionslisten-Prüfung erfordert Review";

  await prisma.notification.createMany({
    data: recipients.map((r) => ({
      userId: r.userId,
      organizationId: party.organizationId,
      type: NotificationType.COMPLIANCE_ACTION_REQUIRED,
      severity: NotificationSeverity.URGENT,
      title: `Sanktions-Treffer: ${party.canonicalName}`,
      message: `${party.canonicalName}${party.countryCode ? ` (${party.countryCode})` : ""} wurde als POTENTIAL_MATCH eingestuft — ${reason}. Bitte in der Screening-Triage prüfen.`,
      actionUrl: "/trade/screening",
      entityType: "trade_party",
      entityId: party.id,
    })),
  });
}

// ─── Helpers (exported for testing) ─────────────────────────────────

/**
 * Combine per-list snapshot hashes into one deterministic hash. Sort
 * by list name first so the same set of hashes always produces the
 * same combined hash regardless of iteration order.
 */
export function combineHashes(
  hashesByList: Partial<Record<TradeSanctionsList, string>>,
): string {
  const sorted = Object.entries(hashesByList)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([list, hash]) => `${list}:${hash}`)
    .join("|");
  return createHash("sha256").update(sorted).digest("hex");
}

/**
 * Compute which sanctions lists were NOT consulted because no snapshot
 * exists yet. Surfaces "you should have synced X first" in the UI.
 *
 * Single source of truth: the expected set is derived from
 * REGISTERED_PARSERS (sync.server.ts) so this list stays in sync
 * automatically as new parsers are added. Previously this hardcoded
 * only 4 of the 8 registered sources (T-M12).
 *
 * NOTE: this is OBSERVABILITY only — it does NOT affect the fail-closed
 * decision gate (A4 / CRITICAL_LISTS). Keep them separate.
 */
export function missingLists(
  consulted: TradeSanctionsList[],
): TradeSanctionsList[] {
  const expected = REGISTERED_PARSERS.map((p) => p.list);
  const consultedSet = new Set(consulted);
  return expected.filter((l) => !consultedSet.has(l));
}
