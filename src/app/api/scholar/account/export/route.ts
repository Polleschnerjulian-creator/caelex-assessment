/**
 * GET /api/scholar/account/export
 *
 * Returns the authenticated user's Scholar data as a JSON download.
 * Gated by getScholarAuth — unauthenticated/unauthorised requests receive 403.
 *
 * Response headers:
 *   Content-Type: application/json
 *   Content-Disposition: attachment; filename="caelex-scholar-data.json"
 */
import { NextResponse } from "next/server";
import { getScholarAuth } from "@/lib/scholar/scholar-auth";
import { gatherScholarUserData } from "@/lib/scholar/data-export.server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getSafeErrorMessage } from "@/lib/validations";
import { logSecurityEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await getScholarAuth();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // G19: rate-limit the DSAR export to blunt a data-scrape vector
  // (Art. 32). The full account export is heavier than a normal read,
  // so it uses the conservative "export" tier (20/hr Redis · 5/hr
  // in-memory dev), keyed per-user so one account cannot drain it.
  const rl = await checkRateLimit("export", getIdentifier(req, auth.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  try {
    const data = await gatherScholarUserData(auth.userId);
    const json = JSON.stringify(data, null, 2);

    // Audit the DSAR export (Art. 15/30) — a persisted, queryable record.
    void logSecurityEvent("DATA_EXPORT", "LOW", "scholar:account export", {
      userId: auth.userId,
    }).catch(() => {});

    return new Response(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          'attachment; filename="caelex-scholar-data.json"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Datenexport fehlgeschlagen") },
      { status: 500 },
    );
  }
}
