import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  suggestionsFromAttributesAndText,
  type SuggestInputAttribute,
} from "@/lib/trade/classify-suggest";
import { findOrgPrecedents } from "@/lib/trade/classification/org-precedents.server";

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
      text?: unknown;
      excludeItemId?: unknown;
    } | null;
    if (!body || !Array.isArray(body.attributes)) {
      return NextResponse.json(
        {
          error:
            "Expected { attributes: SuggestInputAttribute[], text?: string }",
        },
        { status: 400 },
      );
    }

    // `text` (the datasheet's raw text) is optional — when present it unlocks
    // the DCW-1 corpus keyword fallback for codes the parametric matcher can't
    // see (declared codes, distinctive control-list terms). Suggestion-only +
    // LOW confidence; never a determination.
    const text = typeof body.text === "string" ? body.text : undefined;
    const suggestions = suggestionsFromAttributesAndText(
      body.attributes as SuggestInputAttribute[],
      text,
    );

    // ILA review #5 — the org's own reviewed classifications as ranked
    // precedents ("you classified X similarly"). Suggestion-only; the
    // apply path parks them in REQUIRES_REVIEW like every candidate.
    const orgPrecedents = text
      ? await findOrgPrecedents(
          tradeAuth.organizationId,
          text,
          typeof body.excludeItemId === "string"
            ? body.excludeItemId
            : undefined,
        ).catch(() => [])
      : [];

    return NextResponse.json({ suggestions, orgPrecedents });
  } catch (err) {
    logger.error("POST /api/trade/classify/suggest-codes failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
