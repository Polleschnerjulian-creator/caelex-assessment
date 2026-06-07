import { NextResponse } from "next/server";
import { z } from "zod";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { scholarSearchSources } from "@/lib/scholar/scholar-search.server";
import { logSearch } from "@/lib/scholar/search-history.server";
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
  if (!rl.success) return createRateLimitResponse(rl);

  const parsed = SearchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const result = await scholarSearchSources(parsed.data);

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
