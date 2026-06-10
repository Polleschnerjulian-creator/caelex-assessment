/**
 * POST   /api/trade/demo-workspace — seed the [DEMO] sample workspace
 * DELETE /api/trade/demo-workspace — remove every [DEMO]-prefixed row
 *
 * MANAGER+ only (it writes org data). The seeder runs the REAL screening
 * and recompute engines so the sample statuses are derived, never faked.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { getIdentifier } from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  loadDemoWorkspace,
  removeDemoWorkspace,
} from "@/lib/trade/demo-workspace.server";

const WRITE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!WRITE_ROLES.has(tradeAuth.role)) {
      return NextResponse.json(
        { error: "Requires MANAGER or above" },
        { status: 403 },
      );
    }
    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const result = await loadDemoWorkspace(
      tradeAuth.organizationId,
      tradeAuth.userId,
    );
    if (result.alreadyLoaded) {
      return NextResponse.json(
        { error: "Demo workspace already loaded" },
        { status: 409 },
      );
    }
    return NextResponse.json({ loaded: true, created: result.created });
  } catch (err) {
    logger.error(
      "demo-workspace POST failed",
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!WRITE_ROLES.has(tradeAuth.role)) {
      return NextResponse.json(
        { error: "Requires MANAGER or above" },
        { status: 403 },
      );
    }
    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const result = await removeDemoWorkspace(tradeAuth.organizationId);
    return NextResponse.json({ removed: result.removed });
  } catch (err) {
    logger.error(
      "demo-workspace DELETE failed",
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
