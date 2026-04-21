import { NextResponse } from "next/server";
import { timingSafeEqual, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Import all legal sources
import {
  LEGAL_SOURCES_DE,
  LEGAL_SOURCES_FR,
  LEGAL_SOURCES_UK,
  LEGAL_SOURCES_IT,
  LEGAL_SOURCES_LU,
  LEGAL_SOURCES_NL,
  LEGAL_SOURCES_BE,
  LEGAL_SOURCES_ES,
  LEGAL_SOURCES_NO,
  LEGAL_SOURCES_SE,
  LEGAL_SOURCES_FI,
  LEGAL_SOURCES_DK,
  LEGAL_SOURCES_AT,
  LEGAL_SOURCES_CH,
  LEGAL_SOURCES_PT,
  LEGAL_SOURCES_IE,
  LEGAL_SOURCES_GR,
  LEGAL_SOURCES_CZ,
  LEGAL_SOURCES_PL,
  LEGAL_SOURCES_NZ,
} from "@/data/legal-sources";
import { LEGAL_SOURCES_INT } from "@/data/legal-sources/sources/intl";
import { LEGAL_SOURCES_EU } from "@/data/legal-sources/sources/eu";
import type { LegalSource } from "@/data/legal-sources";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — checking many URLs

const ALL_SOURCES: LegalSource[] = [
  ...LEGAL_SOURCES_INT,
  ...LEGAL_SOURCES_EU,
  ...LEGAL_SOURCES_DE,
  ...LEGAL_SOURCES_FR,
  ...LEGAL_SOURCES_UK,
  ...LEGAL_SOURCES_IT,
  ...LEGAL_SOURCES_LU,
  ...LEGAL_SOURCES_NL,
  ...LEGAL_SOURCES_BE,
  ...LEGAL_SOURCES_ES,
  ...LEGAL_SOURCES_NO,
  ...LEGAL_SOURCES_SE,
  ...LEGAL_SOURCES_FI,
  ...LEGAL_SOURCES_DK,
  ...LEGAL_SOURCES_AT,
  ...LEGAL_SOURCES_CH,
  ...LEGAL_SOURCES_PT,
  ...LEGAL_SOURCES_IE,
  ...LEGAL_SOURCES_GR,
  ...LEGAL_SOURCES_CZ,
  ...LEGAL_SOURCES_PL,
  ...LEGAL_SOURCES_NZ,
];

// Check ~50 sources per run (full cycle in ~7 days for 325 sources)
const BATCH_SIZE = 50;
const FETCH_TIMEOUT = 10_000; // 10 seconds per URL

/** M7: parallel fetch concurrency. With 8 simultaneous requests and a
 *  10s per-URL timeout, worst-case batch duration drops from ~500s
 *  serial to ~65s, well under the maxDuration=300 ceiling. */
const FETCH_CONCURRENCY = 8;

/** M20 / C9: cap fetched body size to prevent memory exhaustion from
 *  a hostile redirect target serving a huge response. */
const MAX_BODY_BYTES = 5_000_000; // 5 MB

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

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * ATLAS Source Monitor — Daily Cron Job
 *
 * Fetches a batch of legal source URLs, hashes their content,
 * and flags changes for admin review.
 *
 * Schedule: Daily at 04:30 AM UTC
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
  }

  const auth = request.headers.get("authorization") || "";
  if (!isValidCronSecret(auth, cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  let checked = 0;
  let changed = 0;
  let errors = 0;
  let unchanged = 0;

  try {
    // Get existing checks to determine which sources to check next
    const existingChecks = await prisma.atlasSourceCheck.findMany({
      select: { sourceId: true, lastChecked: true },
    });

    const checkMap = new Map(
      existingChecks.map((c) => [c.sourceId, c.lastChecked]),
    );

    // Sort sources by: never checked first, then oldest checked first
    const sortedSources = [...ALL_SOURCES]
      .filter((s) => s.source_url && s.source_url.startsWith("http"))
      .sort((a, b) => {
        const aChecked = checkMap.get(a.id);
        const bChecked = checkMap.get(b.id);
        if (!aChecked && !bChecked) return 0;
        if (!aChecked) return -1;
        if (!bChecked) return 1;
        return aChecked.getTime() - bChecked.getTime();
      });

    // Take batch
    const batch = sortedSources.slice(0, BATCH_SIZE);

    // M22: fetch existing rows for the batch only (vs. the whole table)
    // so we don't transfer all 350+ hashes for 50 records we'll touch.
    const batchIds = batch.map((s) => s.id);
    const existingMap = new Map(
      (
        await prisma.atlasSourceCheck.findMany({
          where: { sourceId: { in: batchIds } },
          select: { sourceId: true, contentHash: true, previousHash: true },
        })
      ).map((r) => [r.sourceId, r]),
    );

    // C9: whitelist the URL protocol + reject private / loopback targets
    // before ever calling fetch().
    function isSafeHttpUrl(url: string): boolean {
      try {
        const u = new URL(url);
        if (u.protocol !== "http:" && u.protocol !== "https:") return false;
        const host = u.hostname;
        if (host === "localhost" || host === "0.0.0.0") return false;
        if (host.startsWith("127.") || host.startsWith("10.")) return false;
        if (host.startsWith("192.168.")) return false;
        if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
        if (host === "169.254.169.254") return false; // cloud-metadata
        return true;
      } catch {
        return false;
      }
    }

    // C9: read up to MAX_BODY_BYTES from the response stream, stop early
    // past that threshold so a hostile gigabyte body can't OOM the runtime.
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

    // Process a single source: returns a stat tag. Thrown errors are
    // caught by the caller so we always land in a final upsert.
    type Stat = "changed" | "unchanged" | "error";
    async function processOne(source: (typeof batch)[number]): Promise<Stat> {
      if (!isSafeHttpUrl(source.source_url)) {
        await prisma.atlasSourceCheck.upsert({
          where: { sourceId: source.id },
          create: {
            sourceId: source.id,
            jurisdiction: source.jurisdiction,
            sourceUrl: source.source_url,
            status: "ERROR",
            errorMessage: "unsafe-url",
            lastChecked: new Date(),
          },
          update: {
            status: "ERROR",
            errorMessage: "unsafe-url",
            lastChecked: new Date(),
          },
        });
        return "error";
      }

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const response = await fetch(source.source_url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "ATLAS-SourceMonitor/1.0 (Caelex Space Law Database)",
            Accept:
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          redirect: "follow",
        });

        clearTimeout(timeout);

        const httpStatus = response.status;

        if (!response.ok) {
          await prisma.atlasSourceCheck.upsert({
            where: { sourceId: source.id },
            create: {
              sourceId: source.id,
              jurisdiction: source.jurisdiction,
              sourceUrl: source.source_url,
              status: "ERROR",
              httpStatus,
              errorMessage: `HTTP ${httpStatus}`,
              lastChecked: new Date(),
            },
            update: {
              status: "ERROR",
              httpStatus,
              errorMessage: `HTTP ${httpStatus}`,
              lastChecked: new Date(),
            },
          });
          return "error";
        }

        const content = await readBodyBounded(response);
        const newHash = hashContent(content);

        const existing = existingMap.get(source.id);
        const previousHash = existing?.contentHash ?? null;
        const isChanged = previousHash !== null && previousHash !== newHash;

        // M20: each real content change is also appended to the
        // AtlasSourceCheckHistory table so we never lose prior versions.
        // AtlasSourceCheck.previousHash only holds the most recent prior
        // hash; the history row is the append-only audit trail.
        await prisma.$transaction([
          prisma.atlasSourceCheck.upsert({
            where: { sourceId: source.id },
            create: {
              sourceId: source.id,
              jurisdiction: source.jurisdiction,
              sourceUrl: source.source_url,
              contentHash: newHash,
              previousHash: null,
              status: "UNCHANGED",
              httpStatus,
              lastChecked: new Date(),
            },
            update: {
              contentHash: newHash,
              previousHash: isChanged ? previousHash : existing?.previousHash,
              status: isChanged ? "CHANGED" : "UNCHANGED",
              httpStatus,
              errorMessage: null,
              lastChecked: new Date(),
              ...(isChanged ? { lastChanged: new Date() } : {}),
            },
          }),
          ...(isChanged
            ? [
                prisma.atlasSourceCheckHistory.create({
                  data: {
                    sourceId: source.id,
                    jurisdiction: source.jurisdiction,
                    contentHash: newHash,
                    previousHash,
                    httpStatus,
                  },
                }),
              ]
            : []),
        ]);

        return isChanged ? "changed" : "unchanged";
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown fetch error";
        await prisma.atlasSourceCheck.upsert({
          where: { sourceId: source.id },
          create: {
            sourceId: source.id,
            jurisdiction: source.jurisdiction,
            sourceUrl: source.source_url,
            status: "ERROR",
            errorMessage: message.slice(0, 500),
            lastChecked: new Date(),
          },
          update: {
            status: "ERROR",
            errorMessage: message.slice(0, 500),
            lastChecked: new Date(),
          },
        });
        return "error";
      }
    }

    // M7: process the batch with bounded concurrency. A tiny semaphore
    // keeps FETCH_CONCURRENCY workers draining a shared queue.
    const queue = [...batch];
    async function worker() {
      for (;;) {
        const source = queue.shift();
        if (!source) return;
        const stat = await processOne(source);
        if (stat === "changed") changed++;
        else if (stat === "unchanged") unchanged++;
        else errors++;
        checked++;
      }
    }
    await Promise.all(
      Array.from({ length: FETCH_CONCURRENCY }, () => worker()),
    );

    const duration = Date.now() - startTime;

    logger.info("ATLAS source check completed", {
      checked,
      changed,
      unchanged,
      errors,
      durationMs: duration,
      totalSources: ALL_SOURCES.length,
    });

    return NextResponse.json({
      success: true,
      checked,
      changed,
      unchanged,
      errors,
      totalSources: ALL_SOURCES.length,
      durationMs: duration,
    });
  } catch (err) {
    // L3: details land in logger only; the cron response stays generic
    // so that even an accidental external caller cannot read raw stack
    // traces or DB error strings.
    logger.error("ATLAS source check failed", {
      error: err instanceof Error ? (err.stack ?? err.message) : String(err),
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
