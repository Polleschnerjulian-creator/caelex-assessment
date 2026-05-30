/**
 * GET /api/trade/items/[id]/de-minimis — BOM-level de-minimis percentage.
 *
 * Sprint Z12. Tier 5 per the Living Execution Plan.
 *
 * Fetches a `TradeItem` and runs `calculateBomDeMinimis()` (Z12) against
 * its BOM. The BOM is read from the item's `parametricAttributes.bom`
 * field today; once `TradeBomEdge` (separate sprint per the plan) lands
 * the loader will switch to a relational walk. The calculator output
 * shape is stable across both loaders.
 *
 * POST /api/trade/items/[id]/de-minimis — same calculation, but with a
 * caller-supplied BOM in the request body. Used by the UI's
 * "preview what-if" panel and by upstream services that have a BOM
 * in-flight before persistence.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";

import {
  calculateBomDeMinimis,
  type BomLine,
} from "@/lib/trade/bom-de-minimis/calculator";

// ─── Validation ───────────────────────────────────────────────────────

const BomLineSchema = z.object({
  nodeId: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  usOrigin: z.boolean(),
  eccn: z.string().min(1).max(50),
  fairMarketValueEur: z.number(),
});

const PostBodySchema = z.object({
  bom: z.array(BomLineSchema).max(500),
});

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Load the BOM from a TradeItem's `parametricAttributes.bom` field.
 *
 * Today the BOM lives in the catch-all JSON bag because the
 * `TradeBomEdge` schema migration is queued as a separate sprint per
 * the Z12 split. When that lands, swap this loader for a relational
 * walk against `prisma.tradeBomEdge.findMany({ where: { parentId } })`.
 * The calculator's `BomLine[]` shape stays stable.
 */
function extractBomFromParametricAttributes(
  parametricAttributes: unknown,
): BomLine[] {
  if (!parametricAttributes || typeof parametricAttributes !== "object") {
    return [];
  }
  const attrs = parametricAttributes as Record<string, unknown>;
  const bomCandidate = attrs.bom;
  if (!Array.isArray(bomCandidate)) {
    return [];
  }
  const lines: BomLine[] = [];
  for (const raw of bomCandidate) {
    const parsed = BomLineSchema.safeParse(raw);
    if (parsed.success) {
      lines.push(parsed.data);
    }
  }
  return lines;
}

// ─── GET ──────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    const item = await prisma.tradeItem.findFirst({
      where: { id, organizationId: tradeAuth.organizationId },
      select: {
        id: true,
        name: true,
        parametricAttributes: true,
        countryOfOrigin: true,
        usContentPercent: true,
      },
    });
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const bom = extractBomFromParametricAttributes(item.parametricAttributes);
    const calculation = calculateBomDeMinimis({ id: item.id, bom });

    return NextResponse.json({
      item: {
        id: item.id,
        name: item.name,
        countryOfOrigin: item.countryOfOrigin,
        legacyUsContentPercent: item.usContentPercent,
      },
      calculation,
      // Metadata so the UI can tell the operator where the BOM came from
      // + when to expect the schema-backed relational walker (Z12a sprint).
      meta: {
        bomSource: "parametric_attributes_json",
        bomLineCount: bom.length,
        schemaMigrationPending: true,
      },
    });
  } catch (err) {
    logger.error("[trade/items/:id/de-minimis GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────

/**
 * POST /api/trade/items/[id]/de-minimis
 *
 * Run the de-minimis calculation against a BOM supplied in the request
 * body (instead of the persisted one). Useful for:
 *   - the UI's "what-if" preview when the operator is still editing
 *   - upstream services that compute a BOM transiently before persistence
 *
 * Does NOT persist anything — purely a calculation endpoint. The item
 * id is still validated to ensure the caller has access to that item.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    // Verify item access without loading the whole row
    const exists = await prisma.tradeItem.findFirst({
      where: { id, organizationId: tradeAuth.organizationId },
      select: { id: true, name: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    const parsed = PostBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues,
        },
        { status: 400 },
      );
    }

    const calculation = calculateBomDeMinimis({
      id: exists.id,
      bom: parsed.data.bom,
    });

    return NextResponse.json({
      item: { id: exists.id, name: exists.name },
      calculation,
      meta: {
        bomSource: "request_body",
        bomLineCount: parsed.data.bom.length,
        schemaMigrationPending: true,
      },
    });
  } catch (err) {
    logger.error("[trade/items/:id/de-minimis POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
