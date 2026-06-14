/**
 * POST /api/trade/items/import — batch item import (ILA review #8).
 *
 * Receives ALREADY-PARSED rows (the client parses the CSV for preview;
 * the file never crosses the wire) and creates them with the SAME
 * semantics as the single-item POST: per-row validation, deterministic
 * auto-classification suggestion (ASTRA_SUGGESTED + REQUIRES_REVIEW,
 * never overrides a declared code), per-row error collection. MANAGER+.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { getSafeErrorMessage } from "@/lib/validations";
import { deriveAutoClassification } from "@/lib/trade/auto-classify-on-create";
import { CSV_IMPORT_MAX_ROWS } from "@/lib/trade/csv-import";

const ImportRowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  internalSku: z.string().max(120).optional(),
  manufacturerName: z.string().max(200).optional(),
  manufacturerPartNo: z.string().max(120).optional(),
  // ISO 3166-1 alpha-2, uppercase — matches the operations/items routes.
  // A loose `.max(2)` previously accepted 1-char / lowercase origins that
  // never round-trip cleanly through the engine's origin tables.
  countryOfOrigin: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, "Must be ISO 3166-1 alpha-2 (uppercase)")
    .optional(),
  eccnEU: z.string().max(20).optional(),
});

const ImportBodySchema = z.object({
  rows: z.array(ImportRowSchema).min(1).max(CSV_IMPORT_MAX_ROWS),
});

const WRITE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!WRITE_ROLES.has(tradeAuth.role)) {
      return NextResponse.json(
        { error: "Requires MANAGER or above" },
        { status: 403 },
      );
    }
    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const body = await req.json().catch(() => null);
    const parsed = ImportBodySchema.safeParse(body);
    if (!parsed.success) {
      // Generic message — never leak raw Zod issues to the client.
      return NextResponse.json(
        { error: getSafeErrorMessage(parsed.error, "Validation failed") },
        { status: 400 },
      );
    }

    let created = 0;
    let autoSuggested = 0;
    const failed: Array<{ index: number; name: string; error: string }> = [];

    for (const [index, row] of parsed.data.rows.entries()) {
      try {
        // Same auto-classification semantics as the single-item POST:
        // suggestion-only, parked in REQUIRES_REVIEW, never overrides a
        // human-declared code.
        const auto = deriveAutoClassification(row);
        await prisma.tradeItem.create({
          data: {
            organizationId: tradeAuth.organizationId,
            createdById: tradeAuth.userId,
            name: row.name,
            description: row.description,
            internalSku: row.internalSku,
            manufacturerName: row.manufacturerName,
            manufacturerPartNo: row.manufacturerPartNo,
            countryOfOrigin: row.countryOfOrigin,
            eccnEU: row.eccnEU,
            status: "DRAFT",
            ...(auto?.patch ?? {}),
          },
        });
        created += 1;
        if (auto) autoSuggested += 1;
      } catch (err) {
        // Log the real cause server-side; return a generic message to the
        // client (the index + name already locate the offending row).
        logger.warn("[trade/items/import] row create failed", {
          index,
          name: row.name,
          err: err instanceof Error ? err.message : String(err),
        });
        failed.push({
          index,
          name: row.name,
          error: getSafeErrorMessage(err, "Row import failed"),
        });
      }
    }

    logger.info("[trade/items/import] batch import", {
      organizationId: tradeAuth.organizationId,
      created,
      autoSuggested,
      failed: failed.length,
    });

    return NextResponse.json({ created, autoSuggested, failed });
  } catch (err) {
    logger.error(
      "[trade/items/import] failed",
      err instanceof Error ? err : undefined,
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
