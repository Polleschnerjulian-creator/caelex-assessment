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
import {
  runDestinationLandscape,
  confirmedCodeMapsToNoSignal,
} from "@/lib/trade/landscape.server";
import {
  classifyItemForOperation,
  type ClassifiableItem,
} from "@/lib/trade/classification/classify-item";

export const runtime = "nodejs";

const BodySchema = z.object({
  item: z.object({ name: z.string().min(1) }).passthrough(),
  // ISO 3166-1 alpha-2, uppercase — matches the operations route's country
  // validation. The seat drives the exporter-origin resolution downstream;
  // a malformed seat must be rejected at the chokepoint, not passed through.
  exporterSeat: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, "Must be ISO 3166-1 alpha-2 (uppercase)")
    .optional(),
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
      // Generic message — never leak raw Zod issues to the client.
      return NextResponse.json(
        { error: "Expected { item: { name }, exporterSeat? (ISO-2) }" },
        { status: 400 },
      );
    }

    const item = parsed.data.item as unknown as ClassifiableItem;

    // B14: surface the fail-closed downgrade in the audit log. The engine
    // already downgrades a GO from a confirmed-but-unevaluable code to a cited
    // REVIEW (landscape.server.ts); we log it here so the chokepoint event is
    // observable. The classification is destination-agnostic for this check
    // (the signal-vs-no-signal question does not depend on the destination).
    const probe = classifyItemForOperation(item, {
      exporterSeat: parsed.data.exporterSeat,
    });
    if (confirmedCodeMapsToNoSignal(item, probe)) {
      logger.warn(
        "[trade/assess/landscape] confirmed code maps to no engine-readable signal — landscape downgraded to REVIEW",
        {
          userId: tradeAuth.userId,
          organizationId: tradeAuth.organizationId,
          itemName: item.name,
        },
      );
    }

    const result = runDestinationLandscape(item, {
      exporterSeat: parsed.data.exporterSeat,
    });
    return NextResponse.json(result);
  } catch (err) {
    logger.error("POST /api/trade/assess/landscape failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
