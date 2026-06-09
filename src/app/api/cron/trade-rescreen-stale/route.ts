/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Daily cron: re-screen TradeParty records whose last screening is
 * stale (older than 30 days) — closes the second half of Wave A
 * Sprint A7 (continuous-monitoring).
 *
 * Schedule: 05:00 UTC daily, 30 minutes after the sanctions-sync cron
 * at 04:30 UTC. The 30-min gap ensures snapshots are fresh BEFORE
 * we re-screen against them.
 *
 * Idempotency: parties already screened within the 30-day window are
 * skipped. Each screening run produces a new TradeScreeningResult row
 * (insert-only) with the snapshot hash valid at THIS moment — so even
 * if a party hasn't moved in the upstream lists, the audit trail
 * captures that we re-checked.
 *
 * Performance budget: typical org has < 50 parties; screening takes
 * ~50ms (in-memory Jaro-Winkler against ~25K entries). With cpus: 2
 * (Vercel build container... wait, this is a runtime cron, not a
 * build) the cron runs on a serverless function with no parallelism
 * concerns. 5000 parties × 50ms = 250s, fits the maxDuration: 300
 * budget below.
 *
 * Strategy: STALE_AFTER_DAYS = 30 — common standard, also matches the
 * STALE enum value semantics on TradeParty.screeningStatus.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { screenParty } from "@/lib/comply-v2/trade/screening/screen-party.server";
import { raiseVsdForPostHocFlip } from "@/lib/trade/vsd-posthoc-flip.server";

export const runtime = "nodejs";
// Vercel cron functions can run up to 300s on Hobby, 900s on Pro.
// We pick 300s as a safe ceiling — at typical 50ms/screening this
// covers ~6000 parties. If we ever exceed that, switch to a chunked
// invocation (cron triggers a worker that processes 1000 at a time).
export const maxDuration = 300;

const STALE_AFTER_DAYS = 30;
const STALE_MS = STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

interface RescreenItemResult {
  partyId: string;
  partyName: string;
  ok: boolean;
  decision?: string;
  cascadeHit?: boolean;
  hitCount?: number;
  /**
   * Lane C (P2) — number of post-hoc VSDs raised because this party flipped
   * from a non-hit to a hit AFTER one or more of its operations had already
   * shipped (EXECUTED). 0 for the common case.
   */
  postHocVsdsRaised?: number;
  elapsedMs: number;
  error?: string;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const start = Date.now();
  const cutoff = new Date(start - STALE_MS);

  try {
    // Find ACTIVE parties that haven't been screened recently.
    // We deliberately skip ARCHIVED + BLOCKED — those don't need
    // automatic re-checks (they're not transacting). BLOCKED stays
    // BLOCKED until the operator unblocks via triage.
    //
    // We also pick up parties with screeningStatus = STALE which is
    // a hint from elsewhere in the system that they need a refresh.
    const stale = await prisma.tradeParty.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { lastScreenedAt: null }, // never screened
          { lastScreenedAt: { lt: cutoff } },
          { screeningStatus: "STALE" },
        ],
      },
      // Lane C (P2): capture screeningStatus BEFORE the re-screen so we can
      // detect a CLEAR/STALE/NOT_SCREENED → hit FLIP and raise a post-hoc VSD
      // for any already-shipped operation on this party.
      select: {
        id: true,
        legalName: true,
        organizationId: true,
        screeningStatus: true,
      },
      // Order by oldest first — gives the longest-stale parties priority
      // if we hit maxDuration.
      orderBy: [{ lastScreenedAt: { sort: "asc", nulls: "first" } }],
      // Cap at 5000 to stay within maxDuration budget. If exceeded,
      // next day's cron picks up the rest. Stable order (asc) means
      // oldest get refreshed first across runs.
      take: 5000,
    });

    logger.info("trade-rescreen-stale: starting batch", {
      cutoff: cutoff.toISOString(),
      candidateCount: stale.length,
      staleAfterDays: STALE_AFTER_DAYS,
    });

    const results: RescreenItemResult[] = [];
    let okCount = 0;
    let failCount = 0;
    let cascadeHitCount = 0;
    let confirmedCount = 0;
    // Lane C (P2): post-hoc VSD tally across the batch.
    let postHocFlipCount = 0;
    let postHocVsdCount = 0;

    for (const party of stale) {
      const itemStart = Date.now();
      try {
        // Prior screening status captured BEFORE the re-screen — the LHS of a
        // potential CLEAR→hit flip.
        const priorStatus = party.screeningStatus;
        const result = await screenParty(party.id);

        // ── Post-hoc flip detection (Lane C) ──────────────────────────────
        // If this re-screen flipped a previously-non-hit party to a hit, and
        // any of its operations already EXECUTED, raise a VSD + notification.
        // Best-effort: a VSD failure must never abort the screening batch — the
        // re-screen itself (and its audit row) already persisted above.
        let postHocVsdsRaised = 0;
        try {
          const flip = await raiseVsdForPostHocFlip({
            partyId: party.id,
            priorStatus,
            newDecision: result.summary.decision,
            organizationId: party.organizationId,
          });
          if (flip.flipped) postHocFlipCount++;
          postHocVsdsRaised = flip.vsdsCreated.length;
          postHocVsdCount += postHocVsdsRaised;
        } catch (flipErr) {
          logger.error(
            "trade-rescreen-stale: post-hoc VSD flip detection failed (screening persisted)",
            flipErr,
            { partyId: party.id },
          );
        }

        const item: RescreenItemResult = {
          partyId: party.id,
          partyName: party.legalName,
          ok: true,
          decision: result.summary.decision,
          cascadeHit: result.summary.cascadeHit,
          hitCount: result.summary.hitCount,
          postHocVsdsRaised,
          elapsedMs: Date.now() - itemStart,
        };
        results.push(item);
        okCount++;
        if (result.summary.cascadeHit) cascadeHitCount++;
        if (result.summary.decision === "POTENTIAL_MATCH") confirmedCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          partyId: party.id,
          partyName: party.legalName,
          ok: false,
          error: message,
          elapsedMs: Date.now() - itemStart,
        });
        failCount++;
        logger.error("trade-rescreen-stale: screening failed", err, {
          partyId: party.id,
        });
      }
    }

    const summary = {
      totalElapsedMs: Date.now() - start,
      cutoff: cutoff.toISOString(),
      candidateCount: stale.length,
      okCount,
      failCount,
      newCascadeHits: cascadeHitCount,
      newPotentialMatches: confirmedCount,
      // Lane C (P2): parties that flipped non-hit → hit this run, and the
      // post-hoc VSDs raised for their already-shipped operations.
      postHocFlips: postHocFlipCount,
      postHocVsdsRaised: postHocVsdCount,
    };

    logger.info("trade-rescreen-stale: completed", summary);

    return NextResponse.json({
      ...summary,
      // Cap detail in response — full results in logs only
      sampleResults: results.slice(0, 10),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("trade-rescreen-stale: cron failed", err);
    return NextResponse.json(
      { error: "Internal error", message },
      { status: 500 },
    );
  }
}
