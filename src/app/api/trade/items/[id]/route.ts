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
import { recomputeOperation } from "@/lib/comply-v2/trade/operations/recompute.server";

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
  // ── Override gate (T-M18) — audited reasoning for a raw code change ──
  // When a PATCH changes a control code, the human MUST supply a source +
  // a justification, the same discipline the classify copilot enforces.
  // A silent field-write of a control code is exactly the leak this closes.
  overrideSource: z.string().max(500).optional().nullable(),
  overrideJustification: z.string().max(2000).optional().nullable(),
});

/** The control-code fields gated by the override-reasoning requirement. */
const CONTROL_CODE_FIELDS = [
  "eccnEU",
  "eccnUS",
  "usmlCategory",
  "mtcrCategory",
  "germanAlEntry",
] as const;
type ControlCodeField = (typeof CONTROL_CODE_FIELDS)[number];

/**
 * Compute which control codes the PATCH actually CHANGES (new value !==
 * existing value). A no-op write (same value) is not an override and must
 * not demand a justification. Returns the changed fields with before/after.
 */
function changedControlCodes(
  data: z.infer<typeof PatchSchema>,
  existing: Record<string, unknown>,
): Array<{ field: ControlCodeField; from: string | null; to: string | null }> {
  const changes: Array<{
    field: ControlCodeField;
    from: string | null;
    to: string | null;
  }> = [];
  for (const field of CONTROL_CODE_FIELDS) {
    if (!(field in data)) continue;
    const to = (data[field] ?? null) as string | null;
    const from = (existing[field] ?? null) as string | null;
    if (to !== from) changes.push({ field, from, to });
  }
  return changes;
}

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
    {
      eccnEU: item.eccnEU,
      eccnUS: item.eccnUS,
      usmlCategory: item.usmlCategory,
    }, // T-M5: pass actual codes (incl. USML) to the gate
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

    // ── Override gate (T-M18) ──
    // A HUMAN's definitive control-code classification/override must go
    // through the SAME audited-reasoning discipline as the classify copilot:
    // require a source + a justification, and record the human + the
    // before→after on the audit trail. We gate on ACTUAL changes only (a
    // same-value write is a no-op and must not demand a justification).
    //
    // EXEMPTION — accepting an AI suggestion (classificationSource ===
    // "ASTRA_SUGGESTED") is NOT a definitive human decision: it parks the
    // item in REQUIRES_REVIEW (pending), and the audited reasoning is
    // captured later at the human CONFIRM step (the classify copilot and the
    // item-edit form both require + send overrideSource/Justification there).
    // Gating the suggestion-accept would break "AI proposes → human disposes"
    // and the matcher "Übernehmen" / create-from-datasheet flows. The
    // auto-advance below additionally REFUSES to mark an AI-suggested accept
    // CLASSIFIED, so the exemption can never reach a classified state without
    // a justification — it closes the same leak it appears to open.
    const codeChanges = changedControlCodes(
      data,
      existing as unknown as Record<string, unknown>,
    );
    const overrideSource = data.overrideSource?.trim() || null;
    const overrideJustification = data.overrideJustification?.trim() || null;
    const isAiSuggestionAccept =
      data.classificationSource === "ASTRA_SUGGESTED";
    if (codeChanges.length > 0 && !isAiSuggestionAccept) {
      if (!overrideSource || !overrideJustification) {
        return NextResponse.json(
          {
            error:
              "A control-code change requires a source and a justification (audited-reasoning). Provide overrideSource + overrideJustification.",
            code: "OVERRIDE_REASONING_REQUIRED",
            changedFields: codeChanges.map((c) => c.field),
          },
          { status: 400 },
        );
      }
    }

    // `overrideSource` / `overrideJustification` are audit-trail inputs,
    // NOT TradeItem columns — strip them before the update.
    const updateData = { ...data };
    delete updateData.overrideSource;
    delete updateData.overrideJustification;

    // When classification codes are set, auto-advance status to CLASSIFIED —
    // but NEVER for an AI-suggested accept (that stays pending: the matcher
    // sends an explicit REQUIRES_REVIEW, and even if a caller omits the
    // status we refuse to silently mark an un-justified AI suggestion
    // CLASSIFIED). This is the second half of the T-M18 exemption guard.
    const isBeingClassified =
      updateData.eccnEU !== undefined ||
      updateData.eccnUS !== undefined ||
      updateData.usmlCategory !== undefined ||
      updateData.mtcrCategory !== undefined ||
      updateData.germanAlEntry !== undefined;
    const autoClassify =
      isBeingClassified &&
      !updateData.status &&
      existing.status === "DRAFT" &&
      !isAiSuggestionAccept;

    const item = await prisma.tradeItem.update({
      where: { id },
      data: {
        ...updateData,
        ...(autoClassify
          ? {
              status: "CLASSIFIED",
              classifiedAt: new Date(),
              classifiedById: tradeAuth.userId,
            }
          : {}),
      },
    });

    // Record the override reasoning on the audit trail (one note per
    // PATCH that changed a code). Best-effort — a note failure must not
    // fail the PATCH (the code change is already persisted + recompute
    // still runs below). The human (tradeAuth.userId) is the decision of
    // record; the note captures source + justification + before→after.
    if (codeChanges.length > 0 && overrideSource && overrideJustification) {
      try {
        const diff = codeChanges
          .map((c) => `${c.field}: ${c.from ?? "—"} → ${c.to ?? "—"}`)
          .join("; ");
        await prisma.tradeItemNote.create({
          data: {
            itemId: id,
            userId: tradeAuth.userId,
            body: `[Klassifizierungs-Override] ${diff}\nQuelle: ${overrideSource}\nBegründung: ${overrideJustification}`,
          },
        });
      } catch (e) {
        logger.warn(
          "[trade/items/:id PATCH] override-audit note failed — non-fatal",
          { itemId: id, err: e instanceof Error ? e.message : String(e) },
        );
      }
    }

    // ── Tier 1.8: recompute the operations this item rides on ──
    // Classifying an item (or changing its codes) changes what every operation
    // that includes it IS — its risk, catch-all, required licenses and, via
    // Tier 1.7, its lifecycle status. Refresh each non-terminal operation so a
    // freshly-classified item auto-advances those ops from
    // AWAITING_CLASSIFICATION → SCREENING WITHOUT the operator re-opening each
    // one. Best-effort + fully isolated: a fan-out failure must never fail the
    // item PATCH (the classification is already persisted above).
    const classificationChanged =
      isBeingClassified || item.status !== existing.status;
    if (classificationChanged) {
      try {
        const affected = await prisma.tradeOperation.findMany({
          where: {
            organizationId: tradeAuth.organizationId,
            lines: { some: { itemId: id } },
            // Skip terminal / halted operations — their state is frozen and a
            // reclassification does not reopen them.
            status: {
              notIn: ["EXECUTED", "VOLUNTARY_DISCLOSURE_FILED", "BLOCKED"],
            },
          },
          select: { id: true },
        });
        for (const op of affected) {
          await recomputeOperation(op.id, tradeAuth.organizationId);
        }
        if (affected.length > 0) {
          logger.info("[trade/items/:id PATCH] Tier 1.8 recompute fan-out", {
            itemId: id,
            operationsRecomputed: affected.length,
          });
        }
      } catch (e) {
        logger.warn(
          "[trade/items/:id PATCH] operation recompute fan-out failed — non-fatal",
          { itemId: id, err: e instanceof Error ? e.message : String(e) },
        );
      }
    }

    return NextResponse.json({ item });
  } catch (err) {
    logger.error("[trade/items/:id PATCH]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
