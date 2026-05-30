/**
 * GET   /api/trade/items/[id]   — fetch single item + computed classification
 * PATCH /api/trade/items/[id]   — update item fields
 *
 * The GET response includes a pre-computed LicenseDetermination so the
 * UI doesn't need to run engine logic client-side.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { z } from "zod";

import { evaluateTradeItemSubset } from "@/lib/comply-v2/trade/property-trigger-engine";
import { calculateDeMinimis } from "@/lib/comply-v2/trade/de-minimis-calculator";
import { determineLicenseRequirements } from "@/lib/comply-v2/trade/license-determination";

// ─── Validation ───────────────────────────────────────────────────────

const PatchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  internalSku: z.string().max(100).optional().nullable(),
  manufacturerName: z.string().max(200).optional().nullable(),
  manufacturerPartNo: z.string().max(100).optional().nullable(),
  description: z.string().max(5000).optional(),
  eccnEU: z.string().max(50).optional().nullable(),
  eccnUS: z.string().max(50).optional().nullable(),
  usmlCategory: z.string().max(100).optional().nullable(),
  mtcrCategory: z.string().max(100).optional().nullable(),
  germanAlEntry: z.string().max(100).optional().nullable(),
  countryOfOrigin: z.string().length(2).optional().nullable(),
  usContentPercent: z.number().min(0).max(100).optional().nullable(),
  designedWithUSTech: z.boolean().optional(),
  manufacturedWithUSEquipment: z.boolean().optional(),
  apertureMeters: z.number().min(0).optional().nullable(),
  rangeKm: z.number().min(0).optional().nullable(),
  payloadKg: z.number().min(0).optional().nullable(),
  isRadHardened: z.boolean().optional(),
  isMilSpec: z.boolean().optional(),
  isAntiJam: z.boolean().optional(),
  status: z
    .enum(["DRAFT", "CLASSIFIED", "REQUIRES_REVIEW", "ARCHIVED"])
    .optional(),
  classificationSource: z
    .enum([
      "USER_DECLARED",
      "ASTRA_SUGGESTED",
      "ATTORNEY_OPINION",
      "BAFA_AUSKUNFT_GUETERLISTE",
      "CJ_DETERMINATION",
    ])
    .optional(),
  classificationEvidenceUrl: z.string().url().optional().nullable(),
});

// ─── Helpers ──────────────────────────────────────────────────────────

async function getItemForOrg(id: string, organizationId: string) {
  return prisma.tradeItem.findFirst({
    where: { id, organizationId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      notes: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

/** Run all three pure engines on the item and return the classification.
 * Exported for unit testing (T-H6). Pure — no IO.
 */
export function computeClassification(
  item: Awaited<ReturnType<typeof getItemForOrg>>,
) {
  if (!item) return null;

  const triggerEval = evaluateTradeItemSubset({
    apertureMeters: item.apertureMeters,
    rangeKm: item.rangeKm,
    payloadKg: item.payloadKg,
    isRadHardened: item.isRadHardened,
    isMilSpec: item.isMilSpec,
    isAntiJam: item.isAntiJam,
    description: item.description,
    eccnEU: item.eccnEU,
    eccnUS: item.eccnUS,
    usmlCategory: item.usmlCategory,
  });

  // Item-level classification is DESTINATION-AGNOSTIC.
  // Destination (export country) lives on TradeOperation, not TradeItem.
  // Passing countryOfOrigin (where the item was MADE) as the destination was a
  // critical correctness bug (T-H6): a US-made item evaluated as destination=US,
  // an Iran-made item would fire the embargo gate — both wrong.
  // Fix: omit destination entirely at this level.
  //   - de-minimis: destinationTier="STANDARD" (most permissive / destination-unknown
  //     baseline) so only the US-content-percentage math is meaningful here;
  //     destinationCountry omitted (undefined) so embargoed-destination gate cannot
  //     fire against the origin country.
  //   - license determination: destinationCountry=undefined — destination-specific
  //     embargo/de-minimis/license gates run per TradeOperation, not per item.
  let deMinimis = null;
  if (item.usContentPercent !== null && item.usContentPercent !== undefined) {
    deMinimis = calculateDeMinimis({
      usControlledContentPercent: item.usContentPercent,
      hasItarContent: triggerEval.hasItarFlag,
      designedWithUSTech: item.designedWithUSTech ?? false,
      manufacturedWithUSEquipment: item.manufacturedWithUSEquipment ?? false,
      // Destination is unknown at item level — use STANDARD (25%) as the
      // destination-agnostic baseline. Destination-specific tier (10%/embargo)
      // is evaluated per TradeOperation when the actual destination is known.
      destinationTier: "STANDARD",
      // destinationCountry intentionally omitted (undefined) — T-H6.
      usContentEccns: [item.eccnEU, item.eccnUS].filter(
        (v): v is string => !!v,
      ),
    });
  }

  // destinationCountry=undefined: destination is not known at item level.
  // Destination-specific embargo / license gates are evaluated per TradeOperation.
  const licenseDetermination = determineLicenseRequirements(
    triggerEval,
    deMinimis,
    undefined, // T-H6: destination unknown at item level
    undefined,
    undefined,
    { eccnEU: item.eccnEU, eccnUS: item.eccnUS }, // T-M5: pass actual codes for Gate 0
  );

  return { triggerEval, deMinimis, licenseDetermination };
}

// ─── GET ─────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
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

    const { id } = await context.params;
    const item = await getItemForOrg(id, tradeAuth.organizationId);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const classification = computeClassification(item);

    return NextResponse.json({ item, classification });
  } catch (err) {
    logger.error("[trade/items/:id GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
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

    const { id } = await context.params;
    const existing = await prisma.tradeItem.findFirst({
      where: { id, organizationId: tradeAuth.organizationId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // When classification codes are set, auto-advance status to CLASSIFIED
    const isBeingClassified =
      data.eccnEU !== undefined ||
      data.eccnUS !== undefined ||
      data.usmlCategory !== undefined ||
      data.mtcrCategory !== undefined ||
      data.germanAlEntry !== undefined;

    const item = await prisma.tradeItem.update({
      where: { id },
      data: {
        ...data,
        ...(isBeingClassified && !data.status && existing.status === "DRAFT"
          ? {
              status: "CLASSIFIED",
              classifiedAt: new Date(),
              classifiedById: tradeAuth.userId,
            }
          : {}),
      },
    });

    return NextResponse.json({ item });
  } catch (err) {
    logger.error("[trade/items/:id PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
