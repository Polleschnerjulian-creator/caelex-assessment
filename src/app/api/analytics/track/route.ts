import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Schema for incoming tracking events
const trackEventSchema = z.object({
  eventType: z.string().min(1).max(100),
  eventData: z.record(z.string(), z.unknown()).optional(),
  category: z
    .enum(["navigation", "engagement", "conversion", "error", "general"])
    .optional(),
  sessionId: z.string().min(1).max(100),
  userId: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  path: z.string().max(500).nullable().optional(),
  referrer: z.string().max(1000).nullable().optional(),
  durationMs: z.number().nullable().optional(),
  timestamp: z.string().optional(),
});

/**
 * POST /api/analytics/track
 * Fire-and-forget event tracking endpoint
 * Designed for high-volume, non-blocking tracking
 */
export async function POST(request: Request) {
  try {
    // Parse request body (supports both JSON and sendBeacon text)
    let body: unknown;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      // sendBeacon sends as text/plain
      const text = await request.text();
      body = JSON.parse(text);
    }

    // Validate input
    const result = trackEventSchema.safeParse(body);
    if (!result.success) {
      // Return 200 anyway - we don't want tracking failures to cause client errors
      return NextResponse.json({ ok: true, tracked: false });
    }

    const data = result.data;

    // Get country from headers (if behind Cloudflare or similar)
    const ipCountry =
      request.headers.get("cf-ipcountry") ||
      request.headers.get("x-vercel-ip-country") ||
      null;

    // Get user agent
    const userAgent = request.headers.get("user-agent") || null;

    // Store event in database
    await prisma.analyticsEvent.create({
      data: {
        eventType: data.eventType,
        eventCategory: data.category || "general",
        eventData: (data.eventData || {}) as Record<
          string,
          string | number | boolean | null
        >,
        sessionId: data.sessionId,
        userId: data.userId || null,
        organizationId: data.organizationId || null,
        path: data.path || null,
        referrer: data.referrer || null,
        durationMs: data.durationMs || null,
        ipCountry,
        userAgent,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });

    // Also track acquisition events for marketing analytics
    if (data.eventType === "page_view" && !data.userId) {
      // Parse UTM parameters from path/referrer
      const url = data.path ? new URL(data.path, "https://caelex.eu") : null;
      const utm_source = url?.searchParams.get("utm_source");
      const utm_medium = url?.searchParams.get("utm_medium");
      const utm_campaign = url?.searchParams.get("utm_campaign");
      const utm_content = url?.searchParams.get("utm_content");
      const utm_term = url?.searchParams.get("utm_term");

      if (utm_source || data.referrer) {
        await prisma.acquisitionEvent.create({
          data: {
            anonymousId: data.sessionId,
            source: utm_source || deriveSourceFromReferrer(data.referrer),
            medium: utm_medium,
            campaign: utm_campaign,
            content: utm_content,
            term: utm_term,
            landingPage: data.path,
            referrerUrl: data.referrer,
            eventType: "visit",
            country: ipCountry,
          },
        });
      }
    }

    // Track signup conversions
    if (data.eventType === "signup" && data.userId) {
      await prisma.acquisitionEvent.create({
        data: {
          userId: data.userId,
          anonymousId: data.sessionId,
          source: "direct", // Will be updated with actual source in aggregation
          eventType: "signup",
          country: ipCountry,
        },
      });
    }

    return NextResponse.json({ ok: true, tracked: true });
  } catch (error) {
    // Log error but return success - analytics should never fail loudly
    console.error("[Analytics Track] Error:", error);
    return NextResponse.json({ ok: true, tracked: false });
  }
}

/**
 * Derive traffic source from referrer URL
 */
function deriveSourceFromReferrer(referrer: string | null | undefined): string {
  if (!referrer) return "direct";

  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase();

    // Search engines
    if (host.includes("google")) return "google";
    if (host.includes("bing")) return "bing";
    if (host.includes("duckduckgo")) return "duckduckgo";
    if (host.includes("yahoo")) return "yahoo";

    // Social networks
    if (host.includes("linkedin")) return "linkedin";
    if (host.includes("twitter") || host.includes("x.com")) return "twitter";
    if (host.includes("facebook")) return "facebook";
    if (host.includes("instagram")) return "instagram";

    // News / Tech
    if (host.includes("reddit")) return "reddit";
    if (host.includes("hackernews") || host.includes("ycombinator"))
      return "hackernews";
    if (host.includes("producthunt")) return "producthunt";

    // Space industry specific
    if (host.includes("spacenews")) return "spacenews";
    if (host.includes("esa.int")) return "esa";
    if (host.includes("nasa.gov")) return "nasa";

    // Generic referral
    return "referral";
  } catch {
    return "direct";
  }
}

// Prevent caching
export const dynamic = "force-dynamic";
