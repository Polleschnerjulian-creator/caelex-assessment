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
import { getSafeErrorMessage } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  const auth = await getScholarAuth();
  if (!auth) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await gatherScholarUserData(auth.userId);
    const json = JSON.stringify(data, null, 2);

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
