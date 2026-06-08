/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — GET /api/admin/v2/paths?product=comply
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Top page-to-page transition edges for one product's Path/Flow Sankey. Reads
 * ONLY the PII-free Phase-3 rollup table AnalyticsPathEdge (never raw
 * AnalyticsEvent): pathname-only on both ends, one pre-counted row per
 * (date, product, edge), so this endpoint is small and touches no identifier.
 *
 * The Sankey shows a single day (the most recent day that has edges for the
 * product), not a range sum — overlaying many days' flows would smear the graph
 * and the daily snapshot is what the UI renders. We take the top 60 edges by
 * transition count to bound payload + render cost (the route table is small, but
 * 60 is plenty for a legible diagram and keeps the JSON tight).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache.server";
import { logger } from "@/lib/logger";
import {
  requireSuperAdminApi,
  logSuperAdminAccess,
} from "@/lib/admin-auth.server";
import type { PathsResponse, PathEdgeView } from "@/lib/admin/analytics-types";

// Node runtime: Prisma + the server-only audit/cache helpers are not Edge-safe.
export const runtime = "nodejs";
// Never statically cache a super-admin surface (parity with cockpit/retention).
export const dynamic = "force-dynamic";

/**
 * The closed set of product codes the path rollups are keyed by. Validating
 * against this fixed allowlist (rather than free text) keeps the cache key
 * bounded and prevents the untrusted `?product=` param from probing arbitrary
 * values. Mirrors AnalyticsPathEdge.product's documented domain.
 */
const PRODUCTS = [
  "comply",
  "trade",
  "atlas",
  "pharos",
  "scholar",
  "marketing",
] as const;
type Product = (typeof PRODUCTS)[number];

function isProduct(v: unknown): v is Product {
  return typeof v === "string" && (PRODUCTS as readonly string[]).includes(v);
}

/**
 * Build the latest-day edge list for a product. Two cheap reads: first resolve
 * the most recent date that has any edge for this product, then pull that day's
 * edges (top 60 by transitions). When the product has no edges at all we return
 * the explicit empty branch (date:null, edges:[]) so the UI can show a clean
 * "no data yet" state — the rollups may be empty pre-go-live.
 */
async function buildPaths(product: Product): Promise<PathsResponse> {
  const latest = await prisma.analyticsPathEdge.findFirst({
    where: { product },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latest) {
    return { product, date: null, edges: [] };
  }

  const rows = await prisma.analyticsPathEdge.findMany({
    where: { product, date: latest.date },
    orderBy: { transitions: "desc" }, // strongest flows first; UI caps the draw
    take: 60, // bound payload + Sankey render cost
    select: { fromPath: true, toPath: true, transitions: true },
  });

  const edges: PathEdgeView[] = rows.map((r) => ({
    fromPath: r.fromPath,
    toPath: r.toPath,
    transitions: r.transitions,
  }));

  // @db.Date column → take the calendar day only (UTC, no time component).
  const date = latest.date.toISOString().slice(0, 10);

  return { product, date, edges };
}

export async function GET(request: Request): Promise<NextResponse> {
  // Layer-3 authz: never trust the middleware alone for cross-tenant data.
  const gate = await requireSuperAdminApi();
  if (gate instanceof NextResponse) return gate;

  // Audit the authorized cross-tenant read (best-effort; awaited).
  await logSuperAdminAccess({
    userId: gate.userId,
    email: gate.email,
    surface: "admin:api/paths",
    request,
  });

  // Validate the untrusted query param against the closed product set.
  const raw = new URL(request.url).searchParams.get("product");
  const product: Product = isProduct(raw) ? raw : "comply";

  try {
    const payload = await withCache(
      `admin:paths:${product}`,
      () => buildPaths(product),
      300,
    );
    return NextResponse.json(payload);
  } catch (error) {
    // Log server-side; return a generic body (no DB/stack detail leak), for
    // parity with the cockpit/retention routes.
    logger.error("[admin/v2/paths] Error", error);
    return NextResponse.json(
      { error: "Failed to load paths" },
      { status: 500 },
    );
  }
}
