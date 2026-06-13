/**
 * Caelex Passage — POST /api/trade/assess/landscape.
 *
 * The Liefer-Landkarte step: takes a confirmed classifiable item + the
 * exporter seat, runs the SAME engine the single verdict uses over the
 * curated destination set under a clean-buyer assumption, and returns the
 * GO/REVIEW/BLOCKED buckets + the honesty caption (rendered verbatim).
 *
 * No GO is synthesised — every cell is engine-derived (runDestinationLandscape).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { runDestinationLandscape } from "@/lib/trade/landscape.server";
import type { ClassifiableItem } from "@/lib/trade/classification/classify-item";

export const runtime = "nodejs";

const BodySchema = z.object({
  item: z.object({ name: z.string().min(1) }).passthrough(),
  exporterSeat: z.string().optional(),
});

export async function POST(req: Request) {
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

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Expected { item: { name }, exporterSeat? }" },
        { status: 400 },
      );
    }

    const result = runDestinationLandscape(
      parsed.data.item as unknown as ClassifiableItem,
      { exporterSeat: parsed.data.exporterSeat },
    );
    return NextResponse.json(result);
  } catch (err) {
    logger.error("POST /api/trade/assess/landscape failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
