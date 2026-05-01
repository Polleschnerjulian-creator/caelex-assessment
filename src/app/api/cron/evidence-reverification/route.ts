import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";
import {
  countStaleEvidenceByTier,
  findStaleEvidence,
  type StaleEvidenceRow,
} from "@/lib/operator-profile/evidence.server";
import {
  dispatchReverificationForStaleRows,
  type DispatchSummary,
} from "@/lib/operator-profile/auto-detection/dispatcher.server";
import type { VerificationTier } from "@/lib/operator-profile/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Evidence Re-Verification Cron — Sprint 1C skeleton.
 *
 * **Purpose:** every day, walk DerivationTrace rows whose verification
 * tier has lapsed (expiresAt < now) and prepare them for re-fetching.
 * Sprint 2 will plug in actual adapters (Handelsregister, UNOOSA, BAFA);
 * Sprint 1C only enumerates + logs + emits a per-tier breakdown so we can
 * watch the backlog grow before adapters land.
 *
 * **Why "skeleton":** the dispatch logic that fans out to T1 (self-confirm
 * email), T2 (re-fetch public source), T3 (re-engage counsel) is heavy and
 * needs adapters. We build it incrementally:
 *
 *   - Sprint 1C (this file): enumerate stale rows, log structured telemetry
 *   - Sprint 2A-2D:           plug in T1 + T2 adapters
 *   - Sprint 5+:              T3-T4 (counsel/authority re-engagement UI)
 *
 * **Idempotence:** running twice in a row produces the same logs, no
 * mutation. Once adapters land, idempotence will be enforced via the
 * append-only chain — every re-verification appends a NEW evidence row,
 * so re-running the cron without state changes appends nothing.
 *
 * **Schedule:** daily at 04:15 UTC, slotted between solar-flux-polling
 * (04:00) and celestrak-polling (05:00). The window matters because Sprint
 * 2's adapters will hit external APIs — we don't want them competing with
 * other heavy-fetch jobs for socket budget on the Vercel function.
 *
 * **Auth:** `CRON_SECRET` bearer header (per existing cron pattern).
 */

const PAGE_LIMIT = 1000;
const MAX_PAGES_PER_RUN = 5; // hard cap: 5000 rows per cron run

interface CronResponseBody {
  success: boolean;
  totalStale: number;
  totalEnumerated: number;
  byTier: Record<VerificationTier, number>;
  durationMs: number;
  pages: number;
  cappedAtMaxPages: boolean;
  dispatchEnabled: boolean;
  dispatch?: DispatchSummary;
}

/**
 * Auto-dispatch is gated by an env flag during early Sprint 2 rollout.
 * Default-off in production until we've watched the cron logs across at
 * least one full day to confirm enumeration is stable.
 *
 * Set EVIDENCE_REVERIFICATION_AUTODISPATCH=1 in Vercel env to enable.
 */
function autodispatchEnabled(): boolean {
  return process.env.EVIDENCE_REVERIFICATION_AUTODISPATCH === "1";
}

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const a = Buffer.from(header);
    const b = Buffer.from(`Bearer ${secret}`);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const now = new Date();

  try {
    // 1. Total per-tier breakdown (cheap aggregate count) — gives the
    //    operator a single number to watch in dashboards before the
    //    enumeration kicks in.
    const byTier = await countStaleEvidenceByTier(now);
    const totalStale = Object.values(byTier).reduce((a, b) => a + b, 0);

    // 2. Enumerate stale rows page-by-page. We collect all rows up to the
    //    max-pages cap, then optionally dispatch to the adapter framework
    //    in step 3 below.
    let pages = 0;
    let totalEnumerated = 0;
    let cappedAtMaxPages = false;
    const allStale: StaleEvidenceRow[] = [];

    while (pages < MAX_PAGES_PER_RUN) {
      const batch: StaleEvidenceRow[] = await findStaleEvidence({
        limit: PAGE_LIMIT,
        offset: pages * PAGE_LIMIT,
        now,
      });
      if (batch.length === 0) break;

      logger.info("[evidence-reverification] stale batch", {
        page: pages,
        size: batch.length,
        // First 3 rows for debug — full enumeration is too noisy
        sample: batch.slice(0, 3).map((row) => ({
          id: row.id,
          organizationId: row.organizationId,
          fieldName: row.fieldName,
          tier: row.verificationTier,
          expiredAt: row.expiresAt.toISOString(),
          ageDays: Math.floor(
            (now.getTime() - row.expiresAt.getTime()) / 86400000,
          ),
        })),
      });

      allStale.push(...batch);
      totalEnumerated += batch.length;
      pages += 1;
      if (batch.length < PAGE_LIMIT) break;
    }

    if (pages === MAX_PAGES_PER_RUN) {
      cappedAtMaxPages = true;
      logger.warn(
        "[evidence-reverification] hit MAX_PAGES_PER_RUN — backlog growing",
        { totalEnumerated, pageLimit: PAGE_LIMIT, maxPages: MAX_PAGES_PER_RUN },
      );
    }

    // 3. Optionally dispatch to the auto-detection framework. Gated by
    //    EVIDENCE_REVERIFICATION_AUTODISPATCH env var so the cron can run
    //    in observe-only mode in production until we have watched it for a
    //    day. Sprint 2A: VIES adapter only; Sprint 2B-2D add more.
    let dispatch: DispatchSummary | undefined;
    const dispatchEnabled = autodispatchEnabled();
    if (dispatchEnabled && allStale.length > 0) {
      dispatch = await dispatchReverificationForStaleRows(allStale);
    }

    const durationMs = Date.now() - startedAt;

    logger.info("[evidence-reverification] cron complete", {
      totalStale,
      totalEnumerated,
      byTier,
      durationMs,
      pages,
      cappedAtMaxPages,
      dispatchEnabled,
      dispatch,
    });

    const body: CronResponseBody = {
      success: true,
      totalStale,
      totalEnumerated,
      byTier,
      durationMs,
      pages,
      cappedAtMaxPages,
      dispatchEnabled,
      dispatch,
    };
    return NextResponse.json(body);
  } catch (err) {
    logger.error("[evidence-reverification] cron failed", err);
    return NextResponse.json(
      {
        success: false,
        error: "internal",
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
