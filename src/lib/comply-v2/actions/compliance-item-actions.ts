import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "./define-action";
import { REGULATIONS, type RegulationKey } from "../types";

/**
 * Phase 1 actions on ComplianceItem.
 *
 * Three to start:
 *   - snoozeComplianceItem  — defer an item until a future date
 *   - unsnoozeComplianceItem — wake it back up early
 *   - addComplianceItemNote — append a markdown note
 *
 * Each action:
 *   - validates a Zod schema
 *   - resolves the cross-regime ID format `${regulation}:${rowId}`
 *   - checks the user owns the row (defense in depth — even though
 *     RequirementStatus rows are user-scoped via assessment, we also
 *     verify on the auth side)
 *   - persists into the new V2 side-tables (ComplianceItemSnooze,
 *     ComplianceItemNote) — the legacy *RequirementStatus rows are
 *     untouched
 *   - revalidates `/dashboard/today` so the Mercury inbox refreshes
 *
 * Phase 2 actions to come: markAttested, requestEvidence,
 * escalateToCounsel, submitToNCA — those will be requiresApproval=true
 * and route via AstraProposal.
 */

const REGULATION_SET = new Set<string>(REGULATIONS);

/**
 * Parse a cross-regime item ID into its parts. Throws if malformed.
 * Format: `${RegulationKey}:${rowId}` — e.g. "NIS2:cl9k2j8...".
 */
function parseItemId(itemId: string): {
  regulation: RegulationKey;
  rowId: string;
} {
  const idx = itemId.indexOf(":");
  if (idx <= 0) {
    throw new Error(`Malformed itemId "${itemId}" — expected REG:rowId`);
  }
  const regulation = itemId.slice(0, idx);
  const rowId = itemId.slice(idx + 1);
  if (!REGULATION_SET.has(regulation) || !rowId) {
    throw new Error(`Unknown regulation "${regulation}" in itemId`);
  }
  return { regulation: regulation as RegulationKey, rowId };
}

/**
 * Verify the requesting user owns the underlying RequirementStatus row.
 * Throws if not. Returns silently on success.
 */
async function assertOwnership(
  regulation: RegulationKey,
  rowId: string,
  userId: string,
): Promise<void> {
  // We hop through the assessment FK to confirm userId matches.
  type Owner = { assessment: { userId: string } } | null;
  let owner: Owner = null;

  switch (regulation) {
    case "DEBRIS":
      owner = await prisma.debrisRequirementStatus.findUnique({
        where: { id: rowId },
        select: { assessment: { select: { userId: true } } },
      });
      break;
    case "CYBERSECURITY":
      owner = await prisma.cybersecurityRequirementStatus.findUnique({
        where: { id: rowId },
        select: { assessment: { select: { userId: true } } },
      });
      break;
    case "NIS2":
      owner = await prisma.nIS2RequirementStatus.findUnique({
        where: { id: rowId },
        select: { assessment: { select: { userId: true } } },
      });
      break;
    case "CRA":
      owner = await prisma.cRARequirementStatus.findUnique({
        where: { id: rowId },
        select: { assessment: { select: { userId: true } } },
      });
      break;
    case "UK_SPACE_ACT":
      owner = await prisma.ukRequirementStatus.findUnique({
        where: { id: rowId },
        select: { assessment: { select: { userId: true } } },
      });
      break;
    case "US_REGULATORY":
      owner = await prisma.usRequirementStatus.findUnique({
        where: { id: rowId },
        select: { assessment: { select: { userId: true } } },
      });
      break;
    case "EXPORT_CONTROL":
      owner = await prisma.exportControlRequirementStatus.findUnique({
        where: { id: rowId },
        select: { assessment: { select: { userId: true } } },
      });
      break;
    case "SPECTRUM":
      owner = await prisma.spectrumRequirementStatus.findUnique({
        where: { id: rowId },
        select: { assessment: { select: { userId: true } } },
      });
      break;
    default: {
      const exhaustive: never = regulation;
      throw new Error(`Unhandled regulation: ${exhaustive as string}`);
    }
  }

  if (!owner) {
    throw new Error(`ComplianceItem not found`);
  }
  if (owner.assessment.userId !== userId) {
    throw new Error(`Not authorized for this ComplianceItem`);
  }
}

// ─── snoozeComplianceItem ─────────────────────────────────────────────────

export const snoozeComplianceItem = defineAction({
  name: "snooze-compliance-item",
  description:
    "Defer a ComplianceItem until a future date. While snoozed, the item is hidden from the Today inbox but still visible in Reference views.",
  schema: z.object({
    itemId: z.string().min(3),
    days: z.coerce.number().int().min(1).max(90),
    reason: z.string().max(500).optional(),
  }),
  async handler({ itemId, days, reason }, ctx) {
    const { regulation, rowId } = parseItemId(itemId);
    await assertOwnership(regulation, rowId, ctx.userId);

    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await prisma.complianceItemSnooze.upsert({
      where: { itemId_userId: { itemId, userId: ctx.userId } },
      create: {
        itemId,
        userId: ctx.userId,
        snoozedUntil,
        reason: reason ?? null,
      },
      update: {
        snoozedUntil,
        reason: reason ?? null,
      },
    });

    revalidatePath("/dashboard/today");
    return { itemId, snoozedUntil };
  },
  paletteVerb: {
    label: "Snooze item",
    hint: "Defer the selected ComplianceItem",
    group: "item",
    iconName: "Clock",
    contextual: true,
  },
  astra: {
    enabled: true,
    description:
      "Snooze a ComplianceItem for N days. Use when the user wants to defer attention without changing compliance status.",
  },
});

// ─── unsnoozeComplianceItem ───────────────────────────────────────────────

export const unsnoozeComplianceItem = defineAction({
  name: "unsnooze-compliance-item",
  description: "Wake a snoozed ComplianceItem back up immediately.",
  schema: z.object({ itemId: z.string().min(3) }),
  async handler({ itemId }, ctx) {
    const { regulation, rowId } = parseItemId(itemId);
    await assertOwnership(regulation, rowId, ctx.userId);

    await prisma.complianceItemSnooze.deleteMany({
      where: { itemId, userId: ctx.userId },
    });

    revalidatePath("/dashboard/today");
    return { itemId };
  },
  paletteVerb: {
    label: "Wake item",
    hint: "Bring a snoozed item back into the inbox",
    group: "item",
    iconName: "BellRing",
    contextual: true,
  },
  astra: {
    enabled: true,
    description: "Wake a snoozed ComplianceItem back up immediately.",
  },
});

// ─── addComplianceItemNote ────────────────────────────────────────────────

export const addComplianceItemNote = defineAction({
  name: "add-compliance-item-note",
  description:
    "Append a markdown note to a ComplianceItem. Notes are V2-native — separate from the legacy `notes` field on each *RequirementStatus row, so multiple users can co-author and notes survive regulation-table-schema churn.",
  schema: z.object({
    itemId: z.string().min(3),
    body: z.string().min(1).max(8000),
  }),
  async handler({ itemId, body }, ctx) {
    const { regulation, rowId } = parseItemId(itemId);
    await assertOwnership(regulation, rowId, ctx.userId);

    const note = await prisma.complianceItemNote.create({
      data: { itemId, userId: ctx.userId, body },
      select: { id: true, createdAt: true },
    });

    revalidatePath("/dashboard/today");
    return { itemId, noteId: note.id, createdAt: note.createdAt };
  },
  paletteVerb: {
    label: "Add note",
    hint: "Attach a markdown note to the selected item",
    group: "item",
    iconName: "Pencil",
    contextual: true,
  },
  astra: {
    enabled: true,
    description: "Append a markdown note to a ComplianceItem.",
  },
});

// ─── markAsAttested (requiresApproval) ────────────────────────────────────

/**
 * Mark a ComplianceItem as ATTESTED — the V2-native equivalent of
 * the legacy "compliant" status.
 *
 * This is the first action gated by `requiresApproval: true`. When
 * called by Astra (or by a non-OWNER user), it writes an AstraProposal
 * row instead of executing immediately. A reviewer with appropriate
 * permission can approve or reject from /dashboard/proposals.
 *
 * Approving runs the same handler with the *original requester's*
 * permissions, so a super-admin approving an Astra proposal does not
 * elevate the resulting write.
 *
 * Implementation: writes "compliant" into the legacy *RequirementStatus
 * row's `status` column (preserves V1 read paths), AND adds a "marked
 * attested" note via the V2 ComplianceItemNote table for audit trail.
 */
export const markAsAttested = defineAction({
  name: "mark-compliance-item-attested",
  description:
    "Mark a ComplianceItem as ATTESTED (V1-equivalent: compliant). Persists into the underlying *RequirementStatus row + adds a V2 audit note.",
  schema: z.object({
    itemId: z.string().min(3),
    evidenceSummary: z.string().min(10).max(2000),
  }),
  requiresApproval: true,
  async handler({ itemId, evidenceSummary }, ctx) {
    const { regulation, rowId } = parseItemId(itemId);
    await assertOwnership(regulation, rowId, ctx.userId);

    // Update the legacy status field. Each table has the same
    // shape for `status` so the call is uniform.
    const data = { status: "compliant" };
    switch (regulation) {
      case "DEBRIS":
        await prisma.debrisRequirementStatus.update({
          where: { id: rowId },
          data,
        });
        break;
      case "CYBERSECURITY":
        await prisma.cybersecurityRequirementStatus.update({
          where: { id: rowId },
          data,
        });
        break;
      case "NIS2":
        await prisma.nIS2RequirementStatus.update({
          where: { id: rowId },
          data,
        });
        break;
      case "CRA":
        await prisma.cRARequirementStatus.update({
          where: { id: rowId },
          data,
        });
        break;
      case "UK_SPACE_ACT":
        await prisma.ukRequirementStatus.update({
          where: { id: rowId },
          data,
        });
        break;
      case "US_REGULATORY":
        await prisma.usRequirementStatus.update({
          where: { id: rowId },
          data,
        });
        break;
      case "EXPORT_CONTROL":
        await prisma.exportControlRequirementStatus.update({
          where: { id: rowId },
          data,
        });
        break;
      case "SPECTRUM":
        await prisma.spectrumRequirementStatus.update({
          where: { id: rowId },
          data,
        });
        break;
      default: {
        const exhaustive: never = regulation;
        throw new Error(`Unhandled regulation: ${exhaustive as string}`);
      }
    }

    // V2 audit-trail note so the attestation event survives even if
    // the underlying row is modified later.
    await prisma.complianceItemNote.create({
      data: {
        itemId,
        userId: ctx.userId,
        body: `**Marked attested.** Evidence summary:\n\n${evidenceSummary}`,
      },
    });

    revalidatePath("/dashboard/today");
    return { itemId, status: "ATTESTED" };
  },
  paletteVerb: {
    label: "Mark item attested",
    hint: "Requires reviewer approval before applying",
    group: "item",
    iconName: "ShieldCheck",
    contextual: true,
  },
  astra: {
    enabled: true,
    description:
      "Mark a ComplianceItem as ATTESTED (compliant). High-impact — writes a proposal that a reviewer must approve.",
    requiresProposal: true,
  },
});

// Re-export for index aggregation.
export const COMPLIANCE_ITEM_ACTIONS = {
  snoozeComplianceItem,
  unsnoozeComplianceItem,
  addComplianceItemNote,
  markAsAttested,
} as const;
