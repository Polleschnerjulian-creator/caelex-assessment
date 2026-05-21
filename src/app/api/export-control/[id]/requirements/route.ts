import { NextResponse } from "next/server";

/**
 * Sprint T5 sunset — see /api/export-control/route.ts for full context.
 * 410 Gone with Deprecation + Sunset headers.
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
    "The legacy export-control requirements API has been retired in Sprint T5 (2026-05-21). Requirement statuses now live on TradeComplianceProgram — use /trade/program (UI) or /api/v1/compliance (programmatic).",
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
