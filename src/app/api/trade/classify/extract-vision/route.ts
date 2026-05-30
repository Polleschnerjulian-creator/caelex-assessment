/**
 * Caelex Trade — POST /api/trade/classify/extract-vision (M1-1A).
 *
 * Multimodal datasheet extraction endpoint. Takes a PDF, runs BOTH
 *
 *   1. the Z4a regex extractor (`datasheet-extractor.ts`) — fast,
 *      precision-first, catches well-formatted spec-table prose
 *
 *   2. the M1-1A Claude Vision extractor — recall-first, catches
 *      values regex misses (tables, scanned PDFs, unusual phrasings)
 *
 * in parallel, then merges via `mergeExtractions` (regex wins on
 * agreement, Vision fills gaps, disagreements flagged) and returns a
 * unified `MergedExtraction`. The downstream `/trade/classify` UI
 * renders attribute rows with source badges + reasoning + alternates.
 *
 * Why an endpoint distinct from the existing classify endpoints?
 *
 *   - Different cost profile. Regex-only is ~50ms; adding Vision pushes
 *     latency to 8–25s and ~$0.02/parse. Operators opt in by clicking
 *     "Use Claude Vision" rather than every PDF upload paying the cost.
 *
 *   - Different rate-limit class. `document_generation` (5/hr per user)
 *     vs the cheap `api` tier the regex-only endpoint uses.
 *
 *   - Different role-gate. Vision results are surfaced as
 *     authoritative-looking suggestions; we want a MANAGER+ to be in
 *     the loop, not a VIEWER.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { extractDatasheet } from "@/lib/trade/datasheet-extractor";
import { extractDatasheetViaVision } from "@/lib/trade/classification/claude-vision-extractor.server";
import { mergeExtractions } from "@/lib/trade/classification/extraction-merger";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const ALLOWED_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "document_generation",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    if (!ALLOWED_ROLES.has(tradeAuth.role)) {
      return NextResponse.json(
        {
          error:
            "Insufficient role — only Owner / Admin / Manager can run Vision extraction.",
        },
        { status: 403 },
      );
    }

    // Multipart form-data → file field
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return NextResponse.json(
        {
          error:
            "Expected multipart/form-data with a `file` field containing the PDF.",
        },
        { status: 400 },
      );
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (err) {
      logger.warn("POST /api/trade/classify/extract-vision — formData failed", {
        err: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: "Could not parse multipart body." },
        { status: 400 },
      );
    }

    const fileEntry = formData.get("file");
    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "Missing `file` field in form-data." },
        { status: 400 },
      );
    }

    if (fileEntry.size === 0) {
      return NextResponse.json({ error: "File is empty." }, { status: 400 });
    }
    if (fileEntry.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        {
          error: `File too large (${(fileEntry.size / 1024 / 1024).toFixed(1)} MB). Max: ${MAX_PDF_BYTES / 1024 / 1024} MB.`,
        },
        { status: 413 },
      );
    }

    const fileType = fileEntry.type.toLowerCase();
    if (fileType && fileType !== "application/pdf") {
      return NextResponse.json(
        { error: `Expected application/pdf, got ${fileEntry.type}.` },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await fileEntry.arrayBuffer());
    const startMs = Date.now();

    // Run BOTH extractors in parallel. `Promise.allSettled` so a failure
    // in one doesn't kill the other — we still want the regex baseline
    // if Vision hits a quota error.
    const [regexSettled, visionSettled] = await Promise.allSettled([
      extractDatasheet(buf),
      extractDatasheetViaVision(buf),
    ]);

    const regex =
      regexSettled.status === "fulfilled" ? regexSettled.value : null;
    if (regexSettled.status === "rejected") {
      logger.warn("regex extractor crashed", {
        userId: tradeAuth.userId,
        err: String(regexSettled.reason),
      });
    }

    const visionResult =
      visionSettled.status === "fulfilled" ? visionSettled.value : null;
    if (visionSettled.status === "rejected") {
      logger.warn("vision extractor crashed", {
        userId: tradeAuth.userId,
        err: String(visionSettled.reason),
      });
    }

    const merged = mergeExtractions({
      regex,
      vision: visionResult?.ok ? visionResult.attributes : null,
      visionWarnings: visionResult?.ok ? visionResult.warnings : undefined,
      visionError:
        visionResult && !visionResult.ok ? visionResult.error : undefined,
    });

    logger.info("trade classify vision extraction completed", {
      userId: tradeAuth.userId,
      orgId: tradeAuth.organizationId,
      fileName: fileEntry.name,
      fileSize: fileEntry.size,
      attributeCount: merged.attributes.length,
      warningCount: merged.warnings.length,
      regexAvailable: regex !== null,
      visionAvailable: visionResult?.ok ?? false,
      visionLatencyMs: visionResult?.ok ? visionResult.latencyMs : null,
      visionModelUsed: visionResult?.ok ? visionResult.modelUsed : null,
      totalLatencyMs: Date.now() - startMs,
    });

    return NextResponse.json({
      ok: true,
      extraction: merged,
      meta: {
        fileName: fileEntry.name,
        fileSize: fileEntry.size,
        totalLatencyMs: Date.now() - startMs,
        visionModelUsed: visionResult?.ok ? visionResult.modelUsed : null,
        visionLatencyMs: visionResult?.ok ? visionResult.latencyMs : null,
      },
    });
  } catch (err) {
    logger.error("POST /api/trade/classify/extract-vision failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
