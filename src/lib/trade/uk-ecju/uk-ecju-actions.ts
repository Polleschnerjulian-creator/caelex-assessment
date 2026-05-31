"use server";

/**
 * Trade UK ECJU server actions (Z37-UK, Tier 4).
 *
 * Each action: auth + role-check + Zod parse + delegate to service +
 * revalidatePath. Mirrors reexport-actions.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createUkEcjuLicense,
  transitionUkEcjuStatus,
} from "@/lib/trade/uk-ecju/uk-ecju-service";
import { logger } from "@/lib/logger";
import {
  TradeUkEcjuLicenseStatus,
  TradeUkEcjuLicenseType,
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
      "Insufficient role — MANAGER or higher required to manage UK ECJU licences",
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

const optionalBigInt = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v.trim().length === 0) return null;
    try {
      return BigInt(v.replace(/[^0-9]/g, ""));
    } catch {
      return null;
    }
  });

const createSchema = z.object({
  applicantName: z.string().min(1, "Applicant name is required").max(500),
  applicantAddress: z
    .string()
    .min(1, "Applicant address is required")
    .max(2000),
  licenseType: z.nativeEnum(TradeUkEcjuLicenseType),
  ecjuReference: z.string().max(64).optional(),
  controlListEntries: z.string().optional(), // CSV
  destinationCountries: z.string().optional(), // CSV
  endUserName: z.string().max(500).optional(),
  endUserAddress: z.string().max(2000).optional(),
  endUseDescription: z.string().max(4000).optional(),
  validFrom: optionalIsoDate,
  validUntil: optionalIsoDate,
  capValueGbpPence: optionalBigInt,
  notes: z.string().max(4000).optional(),
});

const transitionSchema = z.object({
  licenseId: z.string().min(1),
  nextStatus: z.nativeEnum(TradeUkEcjuLicenseStatus),
  ecjuReference: z.string().max(64).optional(),
  validFrom: optionalIsoDate,
  validUntil: optionalIsoDate,
  notes: z.string().max(4000).optional(),
});

// ─── Actions ────────────────────────────────────────────────────────

function parseCsv(input: string | undefined): string[] {
  if (!input) return [];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export async function createUkEcjuLicenseAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { userId, orgId, role } = await resolveActionContext();
    assertEditor(role);

    const raw = Object.fromEntries(formData.entries());
    const parsed = createSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const created = await createUkEcjuLicense({
      organizationId: orgId,
      applicantName: parsed.data.applicantName,
      applicantAddress: parsed.data.applicantAddress,
      licenseType: parsed.data.licenseType,
      ecjuReference: parsed.data.ecjuReference ?? null,
      controlListEntries: parseCsv(parsed.data.controlListEntries),
      destinationCountries: parseCsv(parsed.data.destinationCountries),
      endUserName: parsed.data.endUserName ?? null,
      endUserAddress: parsed.data.endUserAddress ?? null,
      endUseDescription: parsed.data.endUseDescription ?? null,
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
      capValueGbp: parsed.data.capValueGbpPence,
      notes: parsed.data.notes ?? null,
      createdById: userId,
    });

    revalidatePath("/trade/uk-ecju");
    return { ok: true, id: created.id };
  } catch (err) {
    const message =
      err instanceof ActionError
        ? err.publicMessage
        : err instanceof Error
          ? err.message
          : "Unknown error";
    logger.warn(`createUkEcjuLicenseAction failed: ${message}`);
    return { ok: false, error: message };
  }
}

export async function transitionUkEcjuStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { orgId, role } = await resolveActionContext();
    assertEditor(role);

    const raw = Object.fromEntries(formData.entries());
    const parsed = transitionSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Validation failed",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    await transitionUkEcjuStatus({
      organizationId: orgId,
      licenseId: parsed.data.licenseId,
      nextStatus: parsed.data.nextStatus,
      ecjuReference: parsed.data.ecjuReference,
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
      notes: parsed.data.notes,
    });

    revalidatePath("/trade/uk-ecju");
    revalidatePath(`/trade/uk-ecju/${parsed.data.licenseId}`);
    return { ok: true, id: parsed.data.licenseId };
  } catch (err) {
    const message =
      err instanceof ActionError
        ? err.publicMessage
        : err instanceof Error
          ? err.message
          : "Unknown error";
    logger.warn(`transitionUkEcjuStatusAction failed: ${message}`);
    return { ok: false, error: message };
  }
}
