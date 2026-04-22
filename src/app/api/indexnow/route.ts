import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

/**
 * IndexNow helper endpoints.
 *
 * IndexNow (indexnow.org) is a free protocol adopted by Bing,
 * Yandex, Seznam, Naver, and Yep — when a site POSTs a URL change
 * notification, those search engines crawl the URL within minutes
 * instead of waiting for their regular crawl cycle. Google does NOT
 * participate in IndexNow (they have their own Indexing API with
 * narrower scope), but Bing + Yandex combined account for ~15% of
 * EU search share — material for Caelex's market.
 *
 * Two routes here:
 *
 *   GET  /api/indexnow?key=<INDEXNOW_KEY>  — ownership-proof endpoint.
 *        Bing fetches this during verification and expects the key
 *        as plaintext response body.
 *
 *   POST /api/indexnow                      — server-to-server URL
 *        submission. Used by cron-jobs or CI to push fresh URLs to
 *        the IndexNow API when sitemap or content changes. Rate-
 *        limited per IP as a precaution against abuse.
 *
 * Activation: set INDEXNOW_KEY in Vercel env (any 8-128 char
 * hex/alphanumeric string). The key doubles as the filename Bing
 * expects at /{key}.txt — we serve that from /public/ as a companion
 * to this route.
 */

export const runtime = "nodejs";

// ─── GET — key ownership proof ─────────────────────────────────────

export async function GET(request: NextRequest) {
  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return new NextResponse("IndexNow key not configured", { status: 404 });
  }

  const requested = request.nextUrl.searchParams.get("key");
  if (requested !== key) {
    return new NextResponse("Invalid key", { status: 403 });
  }

  // Bing expects the plaintext key body on verification.
  return new NextResponse(key, {
    status: 200,
    headers: { "Content-Type": "text/plain" },
  });
}

// ─── POST — push URL updates to IndexNow ──────────────────────────

interface IndexNowBody {
  urls: string[];
}

export async function POST(request: NextRequest) {
  // Tight rate-limit — this endpoint is a privileged server-to-server
  // push and shouldn't be called more than a few times per hour even
  // in the heaviest content-update scenarios.
  const rl = await checkRateLimit("sensitive", getIdentifier(request));
  if (!rl.success) return createRateLimitResponse(rl);

  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "IndexNow key not configured" },
      { status: 503 },
    );
  }

  // Optional shared-secret gate for machine-to-machine calls.
  // Callers from cron or CI pass it via the X-IndexNow-Auth header.
  const expectedAuth = process.env.INDEXNOW_PUSH_SECRET;
  if (expectedAuth) {
    const received = request.headers.get("x-indexnow-auth") ?? "";
    if (received !== expectedAuth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: IndexNowBody;
  try {
    body = (await request.json()) as IndexNowBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return NextResponse.json(
      { error: "Body must be { urls: string[] } with at least one URL" },
      { status: 400 },
    );
  }
  if (body.urls.length > 10_000) {
    return NextResponse.json(
      { error: "IndexNow accepts at most 10 000 URLs per request" },
      { status: 400 },
    );
  }

  const host = "caelex.eu";

  // Validate every submitted URL is on our own host — IndexNow
  // rejects mixed-host batches and we don't want to accept foreign
  // URL submissions.
  for (const url of body.urls) {
    try {
      const parsed = new URL(url);
      if (parsed.host !== host) {
        return NextResponse.json(
          { error: `URL ${url} is not on ${host}` },
          { status: 400 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: `Invalid URL: ${url}` },
        { status: 400 },
      );
    }
  }

  // Bing's IndexNow endpoint — the primary submission target. Bing
  // then propagates to Yandex / Seznam / Naver / Yep so a single
  // POST reaches all participating engines.
  const indexNowEndpoint = "https://api.indexnow.org/IndexNow";

  try {
    const res = await fetch(indexNowEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `https://${host}/${key}.txt`,
        urlList: body.urls,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      logger.warn("IndexNow push failed", {
        status: res.status,
        body: text.slice(0, 500),
      });
      return NextResponse.json(
        { error: "IndexNow push failed", status: res.status },
        { status: 502 },
      );
    }

    logger.info("IndexNow push succeeded", {
      count: body.urls.length,
    });
    return NextResponse.json({ success: true, submitted: body.urls.length });
  } catch (err) {
    logger.error("IndexNow push error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "IndexNow push error" }, { status: 502 });
  }
}
