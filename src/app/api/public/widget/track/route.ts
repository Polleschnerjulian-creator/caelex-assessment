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

async function resolveAllowedOrigins(
  widgetId: string | undefined,
): Promise<string[] | "*"> {
  if (!widgetId) return "*";
  try {
    const config = await prisma.widgetConfig.findUnique({
      where: { id: widgetId },
      select: { allowedDomains: true },
    });
    if (config?.allowedDomains && config.allowedDomains.length > 0) {
      // Map bare domains to full origin URLs for CORS header matching
      return config.allowedDomains.flatMap((domain) => [
        `https://${domain}`,
        `http://${domain}`,
      ]);
    }
  } catch {
    // Fall back to wildcard on DB error
  }
  return "*";
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return handleCorsPreflightResponse(origin, "*");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // H-API6: reflect the caller's origin on error responses only when it
  // appears in at least ONE widget's allowed domain list. Previously we
  // returned Access-Control-Allow-Origin: * on every error path, which
  // let any site read error responses (info disclosure + fingerprinting).
  // The helper takes "null" for no-CORS when origin is unknown.
  const safeErrorCors = async (): Promise<string[] | null> => {
    if (!origin) return null;
    try {
      const anyMatch = await prisma.widgetConfig.findFirst({
        where: {
          allowedDomains: {
            hasSome: [origin.replace(/^https?:\/\//, "")],
          },
        },
        select: { id: true },
      });
      return anyMatch ? [origin] : null;
    } catch {
      return null;
    }
  };

  // Rate limiting (widget tier: 30/hour)
  const identifier = getIdentifier(request);
  const rateLimitResult = await checkRateLimit("widget", identifier);
  if (!rateLimitResult.success) {
    const response = createRateLimitResponse(rateLimitResult);
    return applyCorsHeaders(response, origin, (await safeErrorCors()) ?? []);
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
    return applyCorsHeaders(response, origin, (await safeErrorCors()) ?? []);
  }

  const parsed = WidgetTrackSchema.safeParse(body);
  if (!parsed.success) {
    const response = NextResponse.json(
      { error: "Validation failed" },
      { status: 400 },
    );
    return applyCorsHeaders(response, origin, (await safeErrorCors()) ?? []);
  }

  const { event, widgetId } = parsed.data;

  // Validate CORS origin against widget's allowed domains
  const allowedOrigins = await resolveAllowedOrigins(widgetId);
  if (allowedOrigins !== "*" && origin && !allowedOrigins.includes(origin)) {
    const response = NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403 },
    );
    return applyCorsHeaders(response, origin, allowedOrigins);
  }

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
  return applyCorsHeaders(response, origin, allowedOrigins);
}
