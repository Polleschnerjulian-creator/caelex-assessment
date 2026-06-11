/**
 * POST /api/public/passage-check — the public Passage teaser (ILA #2).
 *
 * Deterministic, ZERO-AI-cost: runs the corpus keyword matcher over a
 * free-text product description and returns INDICATIVE control-list
 * candidates. Honesty contract, enforced in the response shape:
 *   - every response carries the disclaimer: keyword hints are NOT a
 *     classification; numeric thresholds in the legal text decide;
 *   - zero matches explicitly says "not a clearance" + names the
 *     covered lists, so silence is never read as green;
 *   - LOW confidence is hard-coded by the matcher (suggestion-only).
 *
 * Public + rate-limited ("widget", 60/hr/IP — booth-friendly), no auth,
 * no persistence — nothing the visitor types is stored.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { matchByKeyword } from "@/lib/comply-v2/trade/classification/corpus-code-matcher";

const BodySchema = z.object({
  description: z.string().min(10).max(2000),
});

export const PASSAGE_CHECK_DISCLAIMER =
  "Keyword-based indication only — NOT a classification. Control-list " +
  "entries carry numeric thresholds (accuracy, strength, frequency, " +
  "particle size) that decide membership; only a review of your item's " +
  "actual parameters against the legal text settles it. No matches is " +
  "NOT a clearance.";

export async function POST(req: Request) {
  try {
    const rl = await checkRateLimit("widget", getIdentifier(req));
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Expected { description: string (10–2000 chars) }" },
        { status: 400 },
      );
    }

    // minHits 2: a single shared token ("system", "satellite") is noise;
    // requiring two keeps the public teaser honest about signal strength.
    const matches = matchByKeyword(parsed.data.description, 6, 2);

    return NextResponse.json({
      disclaimer: PASSAGE_CHECK_DISCLAIMER,
      coveredLists: [
        "EU Annex I (Reg. 2021/821) — space-relevant Cat 1–7, 9",
        "NSG Trigger & Dual-Use",
        "EU Reg. 833/2014 deep annexes (Russia)",
        "US CCL / USML XV / MTCR / Wassenaar / DE Ausfuhrliste (headline sets)",
      ],
      candidates: matches.map((m) => ({
        code: m.entry.code,
        list: m.entry.list,
        title: m.entry.title,
        rationale: m.rationale,
        confidence: m.confidence,
      })),
    });
  } catch (err) {
    logger.error(
      "public passage-check failed",
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
