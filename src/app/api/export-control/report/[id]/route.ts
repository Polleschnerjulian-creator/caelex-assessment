import { NextResponse } from "next/server";

/**
 * Sprint T5 sunset — see /api/export-control/route.ts for full context.
 * 410 Gone with Deprecation + Sunset headers. The legacy JSON-report
 * endpoint is dropped without a direct successor; the new posture page
 * (/trade/program) renders the same data interactively.
 */

const GONE_RESPONSE_INIT = {
  status: 410,
  headers: {
    Deprecation: "true",
    Sunset: "2026-08-21T00:00:00Z",
    Link: '</api/v1/compliance>; rel="successor-version"',
  },
} as const;

const GONE_BODY = {
  error: "gone",
  message:
    "The legacy export-control report API has been retired in Sprint T5 (2026-05-21). Posture data is now rendered on /trade/program; no JSON-report endpoint exists yet — a PDF/JSON export will ship after the migration window closes.",
  successor: "/trade/program",
};

function gone() {
  return NextResponse.json(GONE_BODY, GONE_RESPONSE_INIT);
}

export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
