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
} from "@/data/legal-sources";
import type { LegalSource } from "@/data/legal-sources";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes — checking many URLs

const ALL_SOURCES: LegalSource[] = [
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
];

// Check ~50 sources per run (full cycle in ~7 days for 325 sources)
const BATCH_SIZE = 50;
const FETCH_TIMEOUT = 10_000; // 10 seconds per URL

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

    // Process batch
    for (const source of batch) {
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
          // HTTP error — record it
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
          errors++;
          checked++;
          continue;
        }

        // Get content and hash it
        const content = await response.text();
        const newHash = hashContent(content);

        // Get existing record
        const existing = await prisma.atlasSourceCheck.findUnique({
          where: { sourceId: source.id },
        });

        const previousHash = existing?.contentHash ?? null;
        const isChanged = previousHash !== null && previousHash !== newHash;

        await prisma.atlasSourceCheck.upsert({
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
        });

        if (isChanged) {
          changed++;
        } else {
          unchanged++;
        }
        checked++;
      } catch (err) {
        // Fetch error (timeout, network, etc.)
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
        errors++;
        checked++;
      }
    }

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
    logger.error("ATLAS source check failed", { error: err });
    return NextResponse.json(
      { error: "Internal error", message: String(err) },
      { status: 500 },
    );
  }
}
