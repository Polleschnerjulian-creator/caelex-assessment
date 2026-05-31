"use server";

/**
 * Trade Re-Export Consent server actions (Sprint E4b).
 *
 * Mirrors euc-actions.ts. Each action: auth + role-check + Zod parse
 * + delegate to reexport-service + revalidatePath.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createReexportConsent,
  transitionReexportStatus,
} from "@/lib/trade/reexport-service";
import { logger } from "@/lib/logger";
import { TradeReexportFormType, TradeReexportStatus } from "@prisma/client";
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
      "Insufficient role — MANAGER or higher required to manage re-export consents",
    );
  }
}

// ─── Schemas ────────────────────────────────────────────────────────

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

const createSchema = z.object({
  formType: z.nativeEnum(TradeReexportFormType),
  requestingPartyId: z.string().min(1, "requestingPartyId required"),
  originalExporterName: z.string().min(1, "originalExporterName required"),
  originalExporterCountry: z
    .string()
    .length(2, "originalExporterCountry must be ISO-2"),
  newDestinationCountry: z
    .string()
    .length(2, "newDestinationCountry must be ISO-2"),
  newEndUserName: z.string().min(1, "newEndUserName required"),
  originalLicenseNumber: optionalString,
  operationId: optionalString,
  notes: optionalString,
});

const transitionSchema = z.object({
  reexportId: z.string().min(1, "reexportId required"),
  nextStatus: z.nativeEnum(TradeReexportStatus),
  denialReason: optionalString,
  signedDocumentId: optionalString,
  validUntil: optionalIsoDate,
  notes: optionalString,
});

export type CreateReexportInput = z.input<typeof createSchema>;
export type TransitionReexportInput = z.input<typeof transitionSchema>;

// ─── Actions ────────────────────────────────────────────────────────

export async function createReexport(
  input: CreateReexportInput,
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

    const created = await createReexportConsent({
      organizationId: ctx.orgId,
      formType: parsed.data.formType,
      requestingPartyId: parsed.data.requestingPartyId,
      originalExporterName: parsed.data.originalExporterName,
      originalExporterCountry:
        parsed.data.originalExporterCountry.toUpperCase(),
      newDestinationCountry: parsed.data.newDestinationCountry.toUpperCase(),
      newEndUserName: parsed.data.newEndUserName,
      originalLicenseNumber: parsed.data.originalLicenseNumber,
      operationId: parsed.data.operationId,
      notes: parsed.data.notes,
      lastActionById: ctx.userId,
    });

    revalidatePath("/trade/reexport-consents");
    return { ok: true, id: created.id };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("reexport-actions: create failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error while creating re-export consent",
    };
  }
}

export async function advanceReexportStatus(
  input: TransitionReexportInput,
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

    await transitionReexportStatus({
      organizationId: ctx.orgId,
      reexportId: parsed.data.reexportId,
      nextStatus: parsed.data.nextStatus,
      denialReason: parsed.data.denialReason,
      signedDocumentId: parsed.data.signedDocumentId,
      validUntil: parsed.data.validUntil,
      notes: parsed.data.notes,
      lastActionById: ctx.userId,
    });

    revalidatePath("/trade/reexport-consents");
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("reexport-actions: status transition failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error while advancing status",
    };
  }
}
