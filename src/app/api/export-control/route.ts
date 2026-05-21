import { NextResponse } from "next/server";

/**
 * Sprint T5 sunset (2026-05-21) — legacy export-control API retired.
 * Use Caelex Trade at /trade/program (UI) and the v1 compliance API at
 * /api/v1/compliance (programmatic access) instead. The 410-Gone +
 * Sunset header pair signals the deprecation per RFC 8594.
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
    "The legacy export-control API has been retired in Sprint T5 (2026-05-21). Use Caelex Trade at /trade/program (UI) or /api/v1/compliance (programmatic). This URL will return 410 until 2026-08-21, after which it will be removed.",
  successor: "/api/v1/compliance",
};

function gone() {
  return NextResponse.json(GONE_BODY, GONE_RESPONSE_INIT);
}

export const GET = gone;
export const POST = gone;
export const PUT = gone;
export const PATCH = gone;
export const DELETE = gone;
