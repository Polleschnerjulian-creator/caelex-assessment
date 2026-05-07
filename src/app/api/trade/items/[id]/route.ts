/**
 * GET   /api/trade/items/[id]   — fetch single item + computed classification
 * PATCH /api/trade/items/[id]   — update item fields
 *
 * The GET response includes a pre-computed LicenseDetermination so the
 * UI doesn't need to run engine logic client-side.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { z } from "zod";

import { evaluateTradeItemSubset } from "@/lib/comply-v2/trade/property-trigger-engine";
import {
  calculateDeMinimis,
  getDestinationTier,
} from "@/lib/comply-v2/trade/de-minimis-calculator";
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

/** Run all three pure engines on the item and return the classification. */
function computeClassification(
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

  let deMinimis = null;
  if (item.usContentPercent !== null && item.usContentPercent !== undefined) {
    deMinimis = calculateDeMinimis({
      usControlledContentPercent: item.usContentPercent,
      hasItarContent: triggerEval.hasItarFlag,
      designedWithUSTech: item.designedWithUSTech ?? false,
      manufacturedWithUSEquipment: item.manufacturedWithUSEquipment ?? false,
      destinationTier: item.countryOfOrigin
        ? getDestinationTier(item.countryOfOrigin)
        : "STANDARD",
      destinationCountry: item.countryOfOrigin ?? undefined,
      usContentEccns: [item.eccnEU, item.eccnUS].filter(
        (v): v is string => !!v,
      ),
    });
  }

  const licenseDetermination = determineLicenseRequirements(
    triggerEval,
    deMinimis,
    item.countryOfOrigin ?? undefined,
  );

  return { triggerEval, deMinimis, licenseDetermination };
}

// ─── GET ─────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const org = await getCurrentOrganization(userId);
    if (!org) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const item = await getItemForOrg(id, org.organizationId);
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const org = await getCurrentOrganization(userId);
    if (!org) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { id } = await context.params;
    const existing = await prisma.tradeItem.findFirst({
      where: { id, organizationId: org.organizationId },
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
              classifiedById: userId,
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
