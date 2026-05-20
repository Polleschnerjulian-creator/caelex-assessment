import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  enrichOperatorProfile,
  persistEnrichmentToAssureProfile,
} from "@/lib/profile-enrichment/orchestrator";
import type { EnrichmentResult } from "@/lib/profile-enrichment/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — VIES can be slow

// ─── Configuration ─────────────────────────────────────────────────────────

/**
 * Re-enrich orgs whose last enrichment is older than this many days.
 * 30d is a reasonable cadence — VAT/LEI records change rarely.
 */
const REFRESH_INTERVAL_DAYS = 30;

/**
 * Hard cap per cron run to avoid runaway loops on first deploy. Increase as
 * needed; with the 5-minute maxDuration and ~5-15s per VIES call we can
 * comfortably do 50-100 orgs per run.
 */
const MAX_ORGS_PER_RUN = 100;

// ─── Auth ──────────────────────────────────────────────────────────────────

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

// ─── Handler ───────────────────────────────────────────────────────────────

/**
 * Sprint A1 cron — daily EU-wide profile enrichment.
 *
 * Schedule (proposed for vercel.json): Daily at 04:00 UTC.
 *
 * For each active Organization whose AssureCompanyProfile hasn't been touched
 * in the last 30 days (or has no profile at all):
 *   1. Build EnrichmentInput from existing org metadata (name, jurisdiction, VAT?).
 *   2. Run orchestrator.enrichOperatorProfile() — parallel VIES + GLEIF + BRIS.
 *   3. Best-effort upsert matching fields back to AssureCompanyProfile.
 *
 * Soft-fail per-org: a single org's enrichment failure does not affect others.
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[profile-enrichment] CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("[profile-enrichment] Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("[profile-enrichment] Starting daily sync...");

    const orgs = await selectOrgsToEnrich();
    logger.info("[profile-enrichment] Selected orgs", {
      count: orgs.length,
      capped: orgs.length >= MAX_ORGS_PER_RUN,
    });

    let succeeded = 0;
    let partial = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ organizationId: string; error: string }> = [];

    for (const org of orgs) {
      try {
        const result = await enrichOne(org.id);
        switch (result.status) {
          case "SUCCESS":
            succeeded++;
            break;
          case "PARTIAL":
            partial++;
            break;
          case "FAILED":
            failed++;
            break;
          case "SKIPPED":
            skipped++;
            break;
        }
      } catch (err) {
        failed++;
        errors.push({
          organizationId: org.id,
          error: err instanceof Error ? err.message : String(err),
        });
        // Capped sample for log size.
        if (errors.length <= 10) {
          logger.warn("[profile-enrichment] Per-org failure", {
            organizationId: org.id,
            error: err instanceof Error ? err.message : "unknown",
          });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    logger.info("[profile-enrichment] Sync complete", {
      processed: orgs.length,
      succeeded,
      partial,
      failed,
      skipped,
      durationMs,
    });

    return NextResponse.json({
      processed: orgs.length,
      succeeded,
      partial,
      failed,
      skipped,
      durationMs,
      sampleErrors: errors.slice(0, 5),
    });
  } catch (err) {
    logger.error("[profile-enrichment] Sync failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json(
      {
        error: "Sync failed",
      },
      { status: 500 },
    );
  }
}

// ─── Internals ─────────────────────────────────────────────────────────────

/**
 * Select organizations due for enrichment.
 *
 * Strategy: pick orgs where either:
 *   a) No AssureCompanyProfile row exists yet (never enriched), OR
 *   b) AssureCompanyProfile.updatedAt is older than REFRESH_INTERVAL_DAYS.
 *
 * Limit to MAX_ORGS_PER_RUN per run.
 */
async function selectOrgsToEnrich(): Promise<Array<{ id: string }>> {
  const cutoff = new Date(
    Date.now() - REFRESH_INTERVAL_DAYS * 24 * 60 * 60 * 1000,
  );

  // We use raw $queryRaw to express the "left join + nullable or stale" filter
  // efficiently. Falls back gracefully if assureCompanyProfile table is empty.
  //
  // Note: takes only `id` — caller's enrichOne fetches the rest as needed.
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT o.id
    FROM "Organization" o
    LEFT JOIN "AssureCompanyProfile" acp ON acp."organizationId" = o.id
    WHERE acp.id IS NULL OR acp."updatedAt" < ${cutoff}
    ORDER BY acp."updatedAt" NULLS FIRST, o."createdAt" ASC
    LIMIT ${MAX_ORGS_PER_RUN}
  `;

  return rows;
}

/**
 * Run the full enrichment pipeline for one organization.
 *
 * Reads existing org metadata to assemble EnrichmentInput, runs the
 * orchestrator, and best-effort upserts results to AssureCompanyProfile.
 */
async function enrichOne(organizationId: string): Promise<EnrichmentResult> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      // We don't have a jurisdiction column on Organization in V1; OperatorProfile
      // carries it. Read it via the existing service in the next sprint when we
      // wire enrichOperatorProfile() into onboarding. For the cron sweep,
      // fall back to name-only enrichment.
    },
  });

  if (!org) {
    return {
      status: "SKIPPED",
      profile: {},
      sourceAttempts: [],
      durationMs: 0,
      startedAt: new Date().toISOString(),
    };
  }

  const result = await enrichOperatorProfile({
    organizationId: org.id,
    legalName: org.name,
    // vatId / lei / countryCode will be added in Sprint A4 (trilateral auto-discovery)
    // when we plumb the EnrichedProfile back into onboarding for confirmation.
  });

  if (result.status === "SUCCESS" || result.status === "PARTIAL") {
    await persistEnrichmentToAssureProfile(organizationId, result.profile);
  }

  return result;
}
