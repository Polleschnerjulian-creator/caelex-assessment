/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/trade/dcs/generate — Destination Control Statement
 * generator endpoint.
 *
 * Sprint Z30 (Tier 4). Wraps the pure
 * `generateDestinationControlStatement` function with NextAuth +
 * organization-scoping + rate limiting.
 *
 * Request body (JSON):
 *   {
 *     eccns: string[],                  // required, ≥ 1
 *     destinationCountry: string,       // required, ISO-3166 alpha-2
 *     destinationCountryName?: string,  // optional pretty name
 *     consigneeName?: string,           // optional end-user name
 *     shipmentReference?: string,       // optional audit reference
 *     // Optional inline cascade result for the safety check —
 *     // typically passed straight through from the Z18 cascade UI.
 *     cascadeResult?: CascadeResult | null,
 *     // Optional: response format. `"json"` (default) returns the
 *     // statement object; `"text"` streams a downloadable .txt file.
 *     format?: "json" | "text",
 *   }
 *
 * Response (format=json, default):
 *   200 → DCSGeneratorOutput
 *   400 → { error: "<validation message>" }
 *   401 → { error: "Unauthorized" }
 *   403 → { error: "No active organization" }
 *
 * Response (format=text):
 *   200 → text/plain attachment, filename `dcs-<destination>-<timestamp>.txt`
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import {
  generateDestinationControlStatement,
  DCSGeneratorError,
} from "@/lib/trade/dcs-generator";
import type { CascadeResult } from "@/lib/trade/subject-to-ear/cascade";

// ─── Validation schemas ─────────────────────────────────────────────

const requestSchema = z.object({
  eccns: z.array(z.string()).min(1, "At least one ECCN is required"),
  destinationCountry: z.string().min(1, "destinationCountry is required"),
  destinationCountryName: z.string().optional(),
  consigneeName: z.string().optional(),
  shipmentReference: z.string().optional(),
  // The cascade result has a large nested shape; rather than mirror
  // the full Zod schema here, accept any record and let the generator
  // perform the structural check (we only read the obligations flag).
  cascadeResult: z.unknown().optional().nullable(),
  format: z.enum(["json", "text"]).optional().default("json"),
});

// ─── Handler ────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be JSON" },
        { status: 400 },
      );
    }
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const input = parsed.data;

    let output;
    try {
      output = generateDestinationControlStatement({
        eccns: input.eccns,
        destinationCountry: input.destinationCountry,
        destinationCountryName: input.destinationCountryName,
        consigneeName: input.consigneeName,
        shipmentReference: input.shipmentReference,
        // Pass-through; the generator validates required fields.
        cascadeResult: (input.cascadeResult ?? null) as CascadeResult | null,
      });
    } catch (e) {
      if (e instanceof DCSGeneratorError) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
      throw e;
    }

    // ── Format = text → download .txt file ─────────────────────────
    if (input.format === "text") {
      const safeDest = output.normalizedDestinationCountry.toLowerCase();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `dcs-${safeDest}-${timestamp}.txt`;
      return new NextResponse(output.text, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          // Shipping document content is sensitive — never cache.
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    // ── Format = json (default) → return structured output ─────────
    return NextResponse.json(output, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    logger.error("POST /api/trade/dcs/generate failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
