import { NextResponse } from "next/server";
import { z } from "zod";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { scholarSearchSources } from "@/lib/scholar/scholar-search.server";
import { logSearch } from "@/lib/scholar/search-history.server";
import { getScholarPreferences } from "@/lib/scholar/preferences.server";
import { logSecurityEvent } from "@/lib/audit";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SearchBody = z.object({
  query: z.string().min(2).max(200),
  jurisdiction: z.string().max(5).optional(),
  type: z.string().max(60).optional(),
  complianceArea: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  const auth = await getScholarAuth();
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rl = await checkRateLimit("scholar", getIdentifier(req, auth.userId));
  if (!rl.success) {
    // Detection signal — repeated denials per user surface abuse/scraping.
    void logSecurityEvent("RATE_LIMIT_EXCEEDED", "LOW", "scholar:search", {
      userId: auth.userId,
    }).catch(() => {});
    return createRateLimitResponse(rl);
  }

  const parsed = SearchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    // Honour the per-user AI-search consent (privacy-by-default; default off).
    // Opted-out users get a keyword-only search that never calls the paid
    // embedding provider — no query leaves Caelex for OpenAI without consent,
    // and an attacker cannot drive embedding spend through opted-out accounts.
    const prefs = await getScholarPreferences(auth.userId);
    const result = await scholarSearchSources(parsed.data, {
      semantic: prefs.semanticSearch,
    });

    // Best-effort search history logging — a logging failure must NEVER
    // propagate to the caller (wrapping in void + try/catch).
    void logSearch(
      auth.userId,
      parsed.data.query,
      parsed.data.jurisdiction,
    ).catch(() => {
      /* intentionally swallowed */
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Scholar search failed") },
      { status: 500 },
    );
  }
}
