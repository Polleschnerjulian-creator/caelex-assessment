/**
 * Caelex Passage — POST /api/trade/assess/from-datasheet.
 *
 * Persistence step of the /trade/assess wizard: the operator has CONFIRMED a
 * classification (Screen 2), so we commit it as
 *   - a `TradeItem` (status REQUIRES_REVIEW, the confirmed code on the
 *     regime-appropriate cell, identity + parametric attributes from the
 *     extraction), plus
 *   - a `TradeItemClassificationDraft` (decision ACCEPTED, the confirmed
 *     snapshot in `acceptedSnapshot`, the extraction `evidence` blob, the
 *     `sourceFilename`, reviewer stamped) — the audit record of the sign-off.
 *
 * Both rows land in one Prisma `$transaction` so a half-persisted state is
 * impossible. v1 does NOT store the raw PDF to R2 (spec §10): the audit lives
 * on the draft (sourceFilename + the extraction snapshot), nothing more.
 *
 * The route synthesises NOTHING — it persists exactly the code the human
 * confirmed. Status is REQUIRES_REVIEW (not CLASSIFIED) so a confirmed-but-
 * advisory classification still surfaces for final operator sign-off.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { confirmedCodeCell } from "@/lib/trade/intake/confirmed-code-cell";

export const runtime = "nodejs";

// ─── Validation ────────────────────────────────────────────────────────

/**
 * The confirmed control code. `canonicalId` is the load-bearing field
 * (e.g. "ECCN:9A515.a.1"); the explicit regime cells let the wizard pin a
 * code onto the exact TradeItem column when it already knows the regime.
 */
const ConfirmedCodeSchema = z.object({
  canonicalId: z.string().min(1).max(120),
  regime: z.string().max(60).optional(),
  confidence: z.string().max(20).optional(),
  eccnEU: z.string().max(50).optional(),
  eccnUS: z.string().max(50).optional(),
  usmlCategory: z.string().max(100).optional(),
  mtcrCategory: z.string().max(100).optional(),
  germanAlEntry: z.string().max(100).optional(),
});

/**
 * Identity + parametric attributes carried over from the extraction. All
 * optional — the trigger engine treats nulls as "not set". `passthrough` is
 * deliberately NOT used: only known columns are persisted.
 */
const ItemSchema = z.object({
  name: z.string().min(1).max(200),
  internalSku: z.string().max(100).optional(),
  manufacturerName: z.string().max(200).optional(),
  manufacturerPartNo: z.string().max(100).optional(),
  description: z.string().max(5000).default(""),
  countryOfOrigin: z.string().length(2).optional(),
  usContentPercent: z.number().min(0).max(100).optional(),
  designedWithUSTech: z.boolean().optional(),
  manufacturedWithUSEquipment: z.boolean().optional(),
  apertureMeters: z.number().min(0).optional(),
  rangeKm: z.number().min(0).optional(),
  payloadKg: z.number().min(0).optional(),
  isRadHardened: z.boolean().optional(),
  isMilSpec: z.boolean().optional(),
  isAntiJam: z.boolean().optional(),
  /** Extended operator-supplied attributes (Z3e+) — persisted verbatim into the
   *  TradeItem.parametricAttributes JSON column (no migration; column exists). */
  parametricAttributes: z
    .record(z.string(), z.union([z.number(), z.boolean(), z.string()]))
    .optional(),
});

const BodySchema = z.object({
  item: ItemSchema,
  confirmedCode: ConfirmedCodeSchema,
  /** The extraction snapshot (ClassificationDraft blob) — audit only. */
  evidence: z.record(z.string(), z.unknown()).optional(),
  /** Original PDF filename when the source was an upload. */
  sourceFilename: z.string().max(300).optional(),
});

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Resolve which TradeItem column the confirmed code lands on. Delegates to the
 * SHARED `confirmedCodeCell` mapper so this route and the /trade/assess client
 * (AssessFlow.handleConfirm, which threads the same cell onto the in-memory
 * item it hands to the landscape engine) agree byte-for-byte — ONE source of
 * truth, no second copy to drift. Honours an explicit regime cell first, then
 * the regime, then the canonicalId prefix. Returns only TYPED regime columns
 * (real TradeItem DB columns) so it is safe to spread onto a Prisma `create`.
 *
 * `confirmedCodeCell` may instead carry a `declaredOtherCode` (a confirmed code
 * on a regime with no dedicated cell — B2). That is NOT a TradeItem column, so
 * we strip it here: the code already lives on the persisted draft snapshot
 * (`proposedEccn` / `acceptedSnapshot`), and the verdict engine reads it from
 * the in-memory landscape item, not from a persisted column.
 */
function regimeCellPatch(code: z.infer<typeof ConfirmedCodeSchema>) {
  const { declaredOtherCode: _declaredOtherCode, ...cellColumns } =
    confirmedCodeCell(code);
  void _declaredOtherCode;
  return cellColumns;
}

// ─── Authorization ─────────────────────────────────────────────────────────

// This route mints a CONFIRMED classification: a TradeItem plus an ACCEPTED
// TradeItemClassificationDraft with the operator stamped as reviewer (the
// audit sign-off record). A VIEWER is read-only and must NOT be able to forge
// that sign-off. The real `recordDecision` four-eyes path enforces MEMBER+;
// this wizard shortcut mirrors that floor. MEMBER and above only — VIEWER 403.
// Closes B9 (RBAC fail-open: a VIEWER could mint a confirmed sign-off).
const WRITE_ROLES = new Set(["OWNER", "ADMIN", "MANAGER", "MEMBER"]);

// ─── POST ─────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!WRITE_ROLES.has(tradeAuth.role)) {
      return NextResponse.json(
        {
          error:
            "Insufficient role — read-only members cannot confirm a classification sign-off.",
        },
        { status: 403 },
      );
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { item, confirmedCode, evidence, sourceFilename } = parsed.data;
    const cellPatch = regimeCellPatch(confirmedCode);

    const itemId = await prisma.$transaction(async (tx) => {
      const created = await tx.tradeItem.create({
        data: {
          organizationId: tradeAuth.organizationId,
          createdById: tradeAuth.userId,
          name: item.name,
          internalSku: item.internalSku,
          manufacturerName: item.manufacturerName,
          manufacturerPartNo: item.manufacturerPartNo,
          description: item.description,
          countryOfOrigin: item.countryOfOrigin,
          usContentPercent: item.usContentPercent,
          designedWithUSTech: item.designedWithUSTech ?? false,
          manufacturedWithUSEquipment:
            item.manufacturedWithUSEquipment ?? false,
          apertureMeters: item.apertureMeters,
          rangeKm: item.rangeKm,
          payloadKg: item.payloadKg,
          isRadHardened: item.isRadHardened ?? false,
          isMilSpec: item.isMilSpec ?? false,
          isAntiJam: item.isAntiJam ?? false,
          // Extended operator-supplied attributes (Z3e+) ride along verbatim for
          // audit / re-classification — NOT the verdict (which stays code-driven
          // off the confirmed cell). Column exists, so no migration.
          parametricAttributes: (item.parametricAttributes ?? undefined) as
            | Prisma.InputJsonValue
            | undefined,
          // The confirmed code on the regime-appropriate cell.
          ...cellPatch,
          classificationSource: "USER_DECLARED",
          classifiedAt: new Date(),
          classifiedById: tradeAuth.userId,
          // Confirmed-but-advisory → still surfaces for final sign-off.
          status: "REQUIRES_REVIEW",
        },
        select: { id: true },
      });

      await tx.tradeItemClassificationDraft.create({
        data: {
          organizationId: tradeAuth.organizationId,
          tradeItemId: created.id,
          createdById: tradeAuth.userId,
          proposedEccn: confirmedCode.canonicalId,
          proposedRegime: confirmedCode.regime ?? null,
          confidence: confirmedCode.confidence ?? null,
          evidence: (evidence ?? {}) as Prisma.InputJsonValue,
          sourceFilename: sourceFilename ?? null,
          // The operator confirmed it in the wizard — record the sign-off.
          // DELIBERATE single-actor sign-off: createdById === reviewedById is
          // intentional here. The /trade/assess wizard is one human confirming
          // their own classification in one step, so the four-eyes split and
          // the disclaimerAtReview that recordDecision enforces are by-design
          // N/A on this path — NOT an oversight.
          decision: "ACCEPTED",
          reviewedById: tradeAuth.userId,
          reviewedAt: new Date(),
          acceptedSnapshot: {
            canonicalId: confirmedCode.canonicalId,
            ...(confirmedCode.regime ? { regime: confirmedCode.regime } : {}),
            ...(confirmedCode.confidence
              ? { confidence: confirmedCode.confidence }
              : {}),
          } as Prisma.InputJsonValue,
        },
      });

      return created.id;
    });

    logger.info("[trade/assess/from-datasheet POST] persisted", {
      itemId,
      canonicalId: confirmedCode.canonicalId,
    });

    return NextResponse.json({ itemId }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/trade/assess/from-datasheet failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
