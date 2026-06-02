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
  TradeScreeningStatus,
  TradeScreeningDecision,
  TradeSanctionsList,
  type TradeParty,
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
import type { CascadeResult } from "./cascade-50pct";
import { sendTradeSanctionsHit } from "@/lib/email";

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

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Hit augmented with the source list (which list the entryId came from).
 * Persisted on TradeScreeningResult.hits as JSONB.
 */
export interface PersistableHit extends FuzzyHit {
  list: TradeSanctionsList;
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
   */
  cascade: CascadeResult | null;
  /** Summary for logging/UI. */
  summary: {
    hitCount: number;
    topScore: number;
    decision: TradeScreeningDecision;
    listsConsulted: TradeSanctionsList[];
    snapshotsMissing: TradeSanctionsList[];
    /** Whether the 50%-rule cascade triggered (≥50% sanctioned ownership). */
    cascadeHit: boolean;
    /** Number of CONFIRMED_HIT ancestors found via cascade traversal. */
    sanctionedAncestorCount: number;
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
      { partyId },
      "screenParty: no sanctions snapshots available — sync cron may not have run yet",
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

    // Track entryIds that already produced an identifier hit so we don't
    // double-count them from the fuzzy-name pass below.
    const identifierHitIds = new Set<string>();

    if (partyIdentifiers.length > 0) {
      for (const entry of entries) {
        const idHit = matchByIdentifier(partyIdentifiers, entry);
        if (idHit) {
          allHits.push({ ...idHit, list });
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
        allHits.push({ ...hit, list });
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
      { partyId, missingCritical },
      "screenParty: critical sanctions list(s) missing — a would-be-CLEAR result will be escalated to POTENTIAL_MATCH (T-H3)",
    );
  }

  let decision: TradeScreeningDecision;
  let newStatus: TradeScreeningStatus;
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
  } else if (sanctionedControlOnlyCount > 0) {
    // T-H5: sanctioned control-without-equity owner (post-Dec-2025 OFAC
    // trustee doctrine). Softer than a 50%-rule cascade hit — the legal
    // effect is not as definitive, but OFAC control doctrine requires a
    // human to review. Escalate to POTENTIAL_MATCH rather than auto-block.
    // Uses existing enum values — no migration required.
    logger.warn(
      { partyId, sanctionedControlOnlyCount },
      "screenParty: sanctioned control-without-equity owner detected (T-H5) — escalating to POTENTIAL_MATCH",
    );
    decision = TradeScreeningDecision.POTENTIAL_MATCH;
    newStatus = TradeScreeningStatus.POTENTIAL_MATCH;
  } else if (missingCritical.length > 0) {
    // T-H3: Would otherwise be CLEAR, but a critical list's snapshot is
    // unavailable. An infra failure must NOT silently produce a "compliant"
    // verdict. Escalate to POTENTIAL_MATCH so a human reviews it.
    // Uses existing enum values — no migration required.
    decision = TradeScreeningDecision.POTENTIAL_MATCH;
    newStatus = TradeScreeningStatus.POTENTIAL_MATCH;
  } else {
    decision = TradeScreeningDecision.CLEAR;
    newStatus = TradeScreeningStatus.CLEAR;
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
        hits: allHits as unknown as object[],
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
        cascade: cascade ? (cascade as unknown as object) : undefined,
      },
    }),
    prisma.tradeParty.update({
      where: { id: partyId },
      data: {
        screeningStatus: newStatus,
        screeningHits:
          allHits.length > 0
            ? (allHits.slice(0, 10) as unknown as object[])
            : null,
        lastScreenedAt: now,
      },
    }),
  ]);

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
      listsConsulted,
      snapshotsMissing: missingLists(listsConsulted),
    },
  };

  logger.info(
    {
      partyId,
      decision,
      hitCount: allHits.length,
      topScore: topScore.toFixed(3),
      listsConsulted: listsConsulted.length,
      cascadeHit,
      sanctionedAncestorCount: cascadeAncestorCount,
      cascadeAggregate: cascade?.aggregateSanctionedOwnership.toFixed(3),
      sanctionedControlOnlyCount,
    },
    "screenParty: completed",
  );

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
  cascade: CascadeResult | null,
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
