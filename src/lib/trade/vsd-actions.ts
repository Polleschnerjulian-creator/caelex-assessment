"use server";

/**
 * Trade Voluntary Self-Disclosure server actions (Sprint E1b).
 *
 * Same auth + role + Zod pattern as euc-actions and reexport-actions.
 * Manager+ role required to create or transition; everyone with
 * Trade access can read. The `notes` field is treated as privileged —
 * the read API surface for non-creators may redact it in a future
 * sprint, but at the action level we accept whatever the operator
 * writes.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createVsd, transitionVsdStatus } from "@/lib/trade/vsd-service";
import { logger } from "@/lib/logger";
import {
  TradeVSDAuthority,
  TradeVSDViolationType,
  TradeVSDStatus,
  TradeVSDOutcome,
} from "@prisma/client";
import {
  resolveActionContext,
  TradeActionError as ActionError,
} from "@/lib/trade/resolve-action-context";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const EDITOR_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

function assertEditor(role: string) {
  if (!(EDITOR_ROLES as readonly string[]).includes(role)) {
    throw new ActionError(
      "Insufficient role — MANAGER or higher required to manage voluntary disclosures",
    );
  }
}

// ─── Schemas ────────────────────────────────────────────────────────

const requiredIsoDate = z
  .string()
  .min(1, "date required")
  .transform((v) => new Date(v))
  .refine((d) => !Number.isNaN(d.getTime()), { message: "Invalid date" });

const optionalIsoDate = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? new Date(v) : null))
  .refine((d) => d === null || !Number.isNaN(d.getTime()), {
    message: "Invalid date",
  });

const optionalString = z
  .string()
  .optional()
  .transform((v) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  });

const optionalNumber = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const createSchema = z.object({
  authority: z.nativeEnum(TradeVSDAuthority),
  violationType: z.nativeEnum(TradeVSDViolationType),
  title: z.string().min(1, "title required").max(200, "title too long"),
  description: z.string().min(1, "description required"),
  discoveredAt: requiredIsoDate,
  occurredAt: optionalIsoDate,
  operationId: optionalString,
  itemId: optionalString,
  partyId: optionalString,
  notes: optionalString,
});

const transitionSchema = z.object({
  vsdId: z.string().min(1, "vsdId required"),
  nextStatus: z.nativeEnum(TradeVSDStatus),
  filingReference: optionalString,
  outcome: z.nativeEnum(TradeVSDOutcome).optional(),
  penaltyAmountUsd: optionalNumber,
  outcomeNotes: optionalString,
  filingDocumentId: optionalString,
  notes: optionalString,
});

export type CreateVsdInput = z.input<typeof createSchema>;
export type TransitionVsdInput = z.input<typeof transitionSchema>;

// ─── Actions ────────────────────────────────────────────────────────

export async function createVsdAction(
  input: CreateVsdInput,
): Promise<ActionResult> {
  try {
    const ctx = await resolveActionContext();
    assertEditor(ctx.role);

    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Some fields are invalid",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    const created = await createVsd({
      organizationId: ctx.orgId,
      authority: parsed.data.authority,
      violationType: parsed.data.violationType,
      title: parsed.data.title,
      description: parsed.data.description,
      discoveredAt: parsed.data.discoveredAt,
      occurredAt: parsed.data.occurredAt,
      operationId: parsed.data.operationId,
      itemId: parsed.data.itemId,
      partyId: parsed.data.partyId,
      notes: parsed.data.notes,
      lastActionById: ctx.userId,
    });

    revalidatePath("/trade/vsd");
    return { ok: true, id: created.id };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("vsd-actions: create failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error while creating VSD",
    };
  }
}

export async function advanceVsdStatus(
  input: TransitionVsdInput,
): Promise<ActionResult> {
  try {
    const ctx = await resolveActionContext();
    assertEditor(ctx.role);

    const parsed = transitionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Some fields are invalid",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<
          string,
          string[]
        >,
      };
    }

    await transitionVsdStatus({
      organizationId: ctx.orgId,
      vsdId: parsed.data.vsdId,
      nextStatus: parsed.data.nextStatus,
      filingReference: parsed.data.filingReference,
      outcome: parsed.data.outcome ?? null,
      penaltyAmountUsd: parsed.data.penaltyAmountUsd,
      outcomeNotes: parsed.data.outcomeNotes,
      filingDocumentId: parsed.data.filingDocumentId,
      notes: parsed.data.notes,
      lastActionById: ctx.userId,
    });

    revalidatePath("/trade/vsd");
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("vsd-actions: status transition failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error while advancing status",
    };
  }
}
