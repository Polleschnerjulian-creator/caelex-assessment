/**
 * Caelex Trade — POST /api/trade/licenses/parse (M1-1C).
 *
 * Receives a BAFA-Bescheid PDF via multipart/form-data, runs it through
 * the Claude-Vision parser, and returns the structured extraction so the
 * "Neue Lizenz" form can pre-fill its fields.
 *
 * Why a separate endpoint instead of folding it into POST /api/trade/
 * licenses?
 *
 *   - Parse vs. create are independent operations. The operator may want
 *     to upload the PDF, review the extracted fields, edit any low-
 *     confidence values, and only then click "Create License". Coupling
 *     them would mean an upload could fail silently in the middle of a
 *     create transaction.
 *
 *   - Different rate-limit class. PDF-parse is an expensive AI call
 *     (~$0.02 + 8-30s latency) → `document_generation` tier (5/hr).
 *     License-create is a cheap DB-write → `api` tier (100/min).
 *
 *   - Different role-gate. Anyone with MEMBER+ can create a license
 *     manually. Uploading a Bescheid is gated to OWNER/ADMIN/MANAGER
 *     because the parse result is shown directly in the UI and we want
 *     someone with judgment to validate before saving.
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
import { parseBafaBescheid } from "@/lib/trade/licenses/bafa-bescheid-parser.server";

/** Maximum PDF size in bytes — 5 MB. BAFA-Bescheide are typically 200-
 *  800 KB; 5 MB is generous and still safe against abuse. */
const MAX_PDF_BYTES = 5 * 1024 * 1024;

/** Roles allowed to parse PDFs. Member/Viewer can still create licenses
 *  manually, but the parse-flow is operator-judgment territory. */
const ALLOWED_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Expensive AI call → use document_generation tier (5/hr per user).
    const rl = await checkRateLimit(
      "document_generation",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    if (!ALLOWED_ROLES.has(tradeAuth.role)) {
      return NextResponse.json(
        {
          error:
            "Insufficient role — only Owner / Admin / Manager can parse Bescheid PDFs.",
        },
        { status: 403 },
      );
    }

    // Multipart form-data — expect a single `file` field with the PDF.
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
      logger.warn("POST /api/trade/licenses/parse — formData failed", {
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

    // Size + type gate — defence-in-depth on top of Vercel's body limits.
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

    // Loose MIME check — browsers send "application/pdf" but a forged
    // Content-Type would still fail at the heuristic pre-check inside
    // the parser, so we're permissive here.
    const fileType = fileEntry.type.toLowerCase();
    if (fileType && fileType !== "application/pdf") {
      return NextResponse.json(
        {
          error: `Expected application/pdf, got ${fileEntry.type}.`,
        },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await fileEntry.arrayBuffer());

    const parseResult = await parseBafaBescheid(buf);

    if (!parseResult.ok) {
      logger.warn("trade BAFA-Bescheid parse failed", {
        userId: tradeAuth.userId,
        orgId: tradeAuth.organizationId,
        fileSize: fileEntry.size,
        error: parseResult.error,
      });
      return NextResponse.json(
        {
          error: parseResult.error,
          warnings: parseResult.warnings ?? [],
        },
        { status: 422 },
      );
    }

    logger.info("trade BAFA-Bescheid parsed", {
      userId: tradeAuth.userId,
      orgId: tradeAuth.organizationId,
      fileName: fileEntry.name,
      fileSize: fileEntry.size,
      licenseType: parseResult.extraction.licenseType,
      licenseNumber: parseResult.extraction.licenseNumber,
      latencyMs: parseResult.latencyMs,
      modelUsed: parseResult.modelUsed,
      warnings: parseResult.extraction.warnings.length,
    });

    return NextResponse.json({
      ok: true,
      extraction: parseResult.extraction,
      meta: {
        modelUsed: parseResult.modelUsed,
        latencyMs: parseResult.latencyMs,
        fileName: fileEntry.name,
        fileSize: fileEntry.size,
      },
    });
  } catch (err) {
    logger.error("POST /api/trade/licenses/parse failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
