import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { parseFeed, normaliseUrl } from "@/lib/atlas/feed-parser";
import { ALL_SOURCES } from "@/data/legal-sources";

/**
 * Atlas feed-discovery cron.
 *
 * Polls public RSS / Atom feeds (no paid APIs, no external costs) for
 * space-law-related entries that aren't yet indexed in the static
 * legal-source data files. Each matching entry becomes a pending
 * candidate in AtlasPendingSourceCandidate for admin review.
 *
 * Feeds added here should be:
 *  1. Officially published by the originating body (gazette, UN org, etc.)
 *  2. Free to poll, no authentication
 *  3. Updated frequently enough to matter (daily to weekly)
 *
 * Failure on any single feed is logged and skipped — one broken feed
 * never fails the cron as a whole.
 */

export const runtime = "nodejs";
export const maxDuration = 180;

// Keyword filter — a feed entry matches if any of these substrings
// appears in title + description (case-insensitive). Deliberately
// broad on purpose; the admin review step rejects false positives.
const SPACE_KEYWORDS = [
  // English
  "space",
  "satellite",
  "outer space",
  "orbit",
  "orbital",
  "launch vehicle",
  "unoosa",
  "copuos",
  "itu",
  "earth observation",
  "remote sensing",
  "space debris",
  // German
  "weltraum",
  "satellit",
  "raumfahrt",
  "weltraumgesetz",
  "satelliten",
  "orbital",
];

const FETCH_TIMEOUT = 15_000;
const MAX_BODY_BYTES = 5_000_000;

interface FeedConfig {
  /** Short identifier used as feedSource + dedupKey prefix. */
  id: string;
  /** ISO jurisdiction code or supranational marker. */
  jurisdiction: string;
  /** Human-readable label shown in admin UI. */
  label: string;
  url: string;
}

/**
 * Feed registry. Add new public feeds here — the rest of the cron
 * is generic. Only well-known, stable, publicly hosted feeds belong
 * in this list.
 */
const FEEDS: FeedConfig[] = [
  {
    id: "GESETZE_IM_INTERNET",
    jurisdiction: "DE",
    label: "Gesetze im Internet — BMJ",
    url: "https://www.gesetze-im-internet.de/rss.xml",
  },
  {
    id: "UNOOSA_NEWS",
    jurisdiction: "INT",
    label: "UNOOSA — News",
    url: "https://www.unoosa.org/oosa/en/rss/oosa.xml",
  },
];

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname;
    if (host === "localhost" || host === "0.0.0.0") return false;
    if (host.startsWith("127.") || host.startsWith("10.")) return false;
    if (host.startsWith("192.168.")) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host === "169.254.169.254") return false;
    return true;
  } catch {
    return false;
  }
}

async function readBodyBounded(resp: Response): Promise<string> {
  if (!resp.body) return "";
  const reader = resp.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: false });
  let total = 0;
  let out = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel();
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  out += decoder.decode();
  return out;
}

function findMatchedKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const hits: string[] = [];
  for (const kw of SPACE_KEYWORDS) {
    if (lower.includes(kw)) hits.push(kw);
  }
  return hits;
}

// Pre-compute the set of already-indexed source URLs so we can skip
// items we already have deep-dive pages for. Normalised for dedupe.
const INDEXED_URLS = new Set(
  ALL_SOURCES.filter((s) => s.source_url).map((s) =>
    normaliseUrl(s.source_url),
  ),
);

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  let feedsOk = 0;
  let feedsErr = 0;
  let candidatesCreated = 0;
  let candidatesSkipped = 0;

  for (const feed of FEEDS) {
    if (!isSafeHttpUrl(feed.url)) {
      feedsErr++;
      continue;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
      const resp = await fetch(feed.url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "ATLAS-FeedDiscovery/1.0 (Caelex Space Law Database)",
          Accept:
            "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8",
        },
        redirect: "follow",
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        logger.warn("atlas feed fetch non-ok", {
          feed: feed.id,
          status: resp.status,
        });
        feedsErr++;
        continue;
      }

      const body = await readBodyBounded(resp);
      const items = parseFeed(body);
      feedsOk++;

      for (const item of items) {
        const haystack = `${item.title}\n${item.description ?? ""}`;
        const matches = findMatchedKeywords(haystack);
        if (matches.length === 0) continue;

        const normalised = normaliseUrl(item.url);
        // Skip anything we already have a deep-dive page for.
        if (INDEXED_URLS.has(normalised)) {
          candidatesSkipped++;
          continue;
        }

        const dedupKey = `${feed.id}::${normalised}`;

        // Use upsert-where-unique so repeated polls are no-ops after the
        // first insert. Updating fields isn't useful here: the admin
        // review state is owned by humans, and the feed content is
        // captured once at detection time.
        try {
          const existing = await prisma.atlasPendingSourceCandidate.findUnique({
            where: { dedupKey },
          });
          if (existing) {
            candidatesSkipped++;
            continue;
          }
          await prisma.atlasPendingSourceCandidate.create({
            data: {
              jurisdiction: feed.jurisdiction,
              feedSource: feed.id,
              title: item.title.slice(0, 1000),
              url: item.url.slice(0, 2000),
              description: item.description?.slice(0, 4000) ?? null,
              publishedAt: item.publishedAt ?? null,
              matchKeywords: matches,
              dedupKey,
            },
          });
          candidatesCreated++;
        } catch (err) {
          // P2002 unique violation is expected under concurrent runs —
          // treat as skip.
          logger.warn("atlas candidate upsert failed", {
            dedupKey,
            error: err instanceof Error ? err.message : String(err),
          });
          candidatesSkipped++;
        }
      }
    } catch (err) {
      logger.warn("atlas feed fetch failed", {
        feed: feed.id,
        error: err instanceof Error ? err.message : String(err),
      });
      feedsErr++;
    }
  }

  const durationMs = Date.now() - started;
  logger.info("atlas feed-discovery completed", {
    feedsOk,
    feedsErr,
    candidatesCreated,
    candidatesSkipped,
    durationMs,
  });

  return NextResponse.json({
    success: true,
    feedsOk,
    feedsErr,
    candidatesCreated,
    candidatesSkipped,
    durationMs,
  });
}
