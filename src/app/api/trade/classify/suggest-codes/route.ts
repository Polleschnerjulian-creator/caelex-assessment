import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  attributesToCandidateCodes,
  type SuggestInputAttribute,
} from "@/lib/trade/classify-suggest";

export const runtime = "nodejs";

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

    const body = (await req.json().catch(() => null)) as {
      attributes?: unknown;
    } | null;
    if (!body || !Array.isArray(body.attributes)) {
      return NextResponse.json(
        { error: "Expected { attributes: SuggestInputAttribute[] }" },
        { status: 400 },
      );
    }

    const suggestions = attributesToCandidateCodes(
      body.attributes as SuggestInputAttribute[],
    );
    return NextResponse.json({ suggestions });
  } catch (err) {
    logger.error("POST /api/trade/classify/suggest-codes failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
