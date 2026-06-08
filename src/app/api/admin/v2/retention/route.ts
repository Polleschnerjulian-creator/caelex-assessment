/**
 * GET /api/admin/v2/retention?scope=all|comply|trade|atlas|pharos|scholar
 *   →  RetentionResponse
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The weekly signup-cohort retention grid for the super-admin /admin center.
 * Reads ONLY the PII-free AnalyticsRetentionCohort rollup (already bucketed into
 * cohortWeek × weeksSince counts) — never raw AnalyticsEvent — so the grid can
 * never surface who is in a cohort, only how many returned.
 *
 * Auth: super-admin only (requireSuperAdminApi). Authorized reads are audit-
 * logged AFTER the gate passes. Prisma reads are withCache-wrapped (5 min).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withCache } from "@/lib/cache.server";
import {
  requireSuperAdminApi,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import type {
  RetentionResponse,
  RetentionCohortRow,
  RetentionCell,
} from "@/lib/admin/analytics-types";

// Node runtime: Prisma + the audit hash-chain require Node, not Edge.
export const runtime = "nodejs";
// Live operational metrics — never serve from Next's full-route cache.
export const dynamic = "force-dynamic";

/**
 * The closed set of retention scopes we accept. Validating against an allow-list
 * (rather than passing the raw query straight into the WHERE) means an attacker
 * can't probe arbitrary productScope values, and an unknown scope simply yields
 * an empty grid instead of an error.
 */
const RETENTION_SCOPES = [
  "all",
  "comply",
  "trade",
  "atlas",
  "pharos",
  "scholar",
] as const;
type RetentionScope = (typeof RETENTION_SCOPES)[number];

function isRetentionScope(v: unknown): v is RetentionScope {
  return (
    typeof v === "string" && (RETENTION_SCOPES as readonly string[]).includes(v)
  );
}

/**
 * Assemble the retention grid for one scope. Pure data shaping — the caller has
 * already gated + audited. Reads only the rollup (no raw events / no PII).
 */
async function buildRetention(
  scope: RetentionScope,
): Promise<RetentionResponse> {
  const [scopeGroups, rows] = await Promise.all([
    // The scope switcher only offers scopes that actually have data, so empty
    // pre-go-live scopes don't show up. groupBy keeps this a single index scan.
    prisma.analyticsRetentionCohort.groupBy({ by: ["productScope"] }),
    // All cells for the selected scope. Newest cohort first; within a cohort,
    // ascending weeksSince so the row is already in column order.
    prisma.analyticsRetentionCohort.findMany({
      where: { productScope: scope },
      orderBy: [{ cohortWeek: "desc" }, { weeksSince: "asc" }],
      select: {
        cohortWeek: true,
        cohortSize: true,
        weeksSince: true,
        returnedUsers: true,
      },
    }),
  ]);

  const availableScopes = scopeGroups
    .map((g) => g.productScope)
    .sort((a, b) => a.localeCompare(b));

  // Group the flat cell rows into one RetentionCohortRow per cohortWeek. The
  // findMany order (cohortWeek desc, then weeksSince asc) means we can build
  // dense, column-ordered rows in a single pass and preserve newest-first order.
  const cohortMap = new Map<string, RetentionCohortRow>();
  let maxWeeksSince = 0;
  for (const r of rows) {
    const key = r.cohortWeek.toISOString().slice(0, 10);
    let cohort = cohortMap.get(key);
    if (!cohort) {
      cohort = { cohortWeek: key, cohortSize: r.cohortSize, cells: [] };
      cohortMap.set(key, cohort);
    }
    const cell: RetentionCell = {
      weeksSince: r.weeksSince,
      returnedUsers: r.returnedUsers,
      // Guard divide-by-zero: an empty cohort reports 0% rather than NaN.
      pct: r.cohortSize > 0 ? r.returnedUsers / r.cohortSize : 0,
    };
    cohort.cells.push(cell);
    if (r.weeksSince > maxWeeksSince) maxWeeksSince = r.weeksSince;
  }

  return {
    scope,
    availableScopes,
    // Map iteration order preserves insertion = newest-first (rows came back desc).
    cohorts: Array.from(cohortMap.values()),
    maxWeeksSince,
  };
}

export async function GET(request: Request) {
  // ── Layer 3 of the /admin gate: authoritative super-admin check. ──
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate; // 403 — do nothing else.

  // Audit the authorized cross-tenant access (best-effort; never throws).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/retention",
    request,
  });

  // Validate the untrusted ?scope= param against the closed set; default "all".
  const scopeParam = new URL(request.url).searchParams.get("scope");
  const scope: RetentionScope = isRetentionScope(scopeParam)
    ? scopeParam
    : "all";

  try {
    // Cache the (gated) rollup reads for 5 min, keyed by scope.
    const payload = await withCache(
      `admin:retention:${scope}`,
      () => buildRetention(scope),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Generic 500 — never leak the underlying DB/error detail to the client.
    logger.error("[admin/v2/retention] Error", error);
    return NextResponse.json(
      { error: "Failed to load retention" },
      { status: 500 },
    );
  }
}
