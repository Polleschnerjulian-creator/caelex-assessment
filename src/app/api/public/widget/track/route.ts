/**
 * POST /api/public/widget/track
 * OPTIONS /api/public/widget/track
 *
 * Widget analytics event tracking.
 * Rate limited: 30 requests/hour per IP (widget tier).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { WidgetTrackSchema } from "@/lib/validations/api-compliance";
import { prisma } from "@/lib/prisma";
import {
  applyCorsHeaders,
  handleCorsPreflightResponse,
} from "@/lib/cors.server";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return handleCorsPreflightResponse(origin, "*");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Rate limiting (widget tier: 30/hour)
  const identifier = getIdentifier(request);
  const rateLimitResult = await checkRateLimit("widget", identifier);
  if (!rateLimitResult.success) {
    const response = createRateLimitResponse(rateLimitResult);
    return applyCorsHeaders(response, origin, "*");
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const response = NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
    return applyCorsHeaders(response, origin, "*");
  }

  const parsed = WidgetTrackSchema.safeParse(body);
  if (!parsed.success) {
    const response = NextResponse.json(
      { error: "Validation failed" },
      { status: 400 },
    );
    return applyCorsHeaders(response, origin, "*");
  }

  const { event, widgetId } = parsed.data;

  // Increment the appropriate counter
  try {
    const incrementField =
      event === "impression"
        ? { impressions: { increment: 1 } }
        : event === "completion"
          ? { completions: { increment: 1 } }
          : { ctaClicks: { increment: 1 } };

    await prisma.widgetConfig.update({
      where: { id: widgetId },
      data: incrementField,
    });
  } catch {
    // Widget not found — silently ignore to avoid leaking info
  }

  const response = NextResponse.json({ ok: true }, { status: 200 });
  return applyCorsHeaders(response, origin, "*");
}
