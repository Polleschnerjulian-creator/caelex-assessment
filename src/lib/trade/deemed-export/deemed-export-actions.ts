"use server";

/**
 * Trade Deemed-Export server actions (Z13b, Tier 6).
 *
 * Thin wrappers around `deemed-export-service.ts` with auth + role
 * check + Zod input parsing. Same pattern as `euc-actions.ts` /
 * `vsd-actions.ts`.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  createDeemedExportAuthorization,
  updateDeemedExportAuthorization,
} from "./deemed-export-service";
import { logger } from "@/lib/logger";
import {
  TradeDeemedExportAuthorizationStatus,
  TradeDeemedExportAuthorizationType,
} from "@prisma/client";

export type DeemedExportActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const EDITOR_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

async function resolveSessionContext(): Promise<{
  userId: string;
  orgId: string;
  role: string;
}> {
  const session = await auth();
  if (!session?.user?.id) throw new ActionError("Not signed in");
  const userId = session.user.id;

  if (isSuperAdmin(session.user.email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!anyOrg) throw new ActionError("No active organisation found");
    return { userId, orgId: anyOrg.id, role: "OWNER" };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organizationId: true, role: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) throw new ActionError("No active organisation membership");
  return { userId, orgId: membership.organizationId, role: membership.role };
}

function assertEditor(role: string) {
  if (!(EDITOR_ROLES as readonly string[]).includes(role)) {
    throw new ActionError(
      "Insufficient role — MANAGER or higher required to manage deemed-export authorisations",
    );
  }
}

class ActionError extends Error {
  constructor(public readonly publicMessage: string) {
    super(publicMessage);
    this.name = "ActionError";
  }
}

// ─── Schemas ────────────────────────────────────────────────────────

const optionalString = z
  .string()
  .optional()
  .transform((v) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  });

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

const codeArray = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((v) => {
    if (!v) return [] as string[];
    if (Array.isArray(v))
      return v.map((s) => s.trim()).filter((s) => s.length > 0);
    return v
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  });

const createSchema = z.object({
  foreignNationalEmployeeId: z.string().min(1, "employee id required"),
  foreignNationalName: optionalString,
  foreignNationality: z
    .string()
    .min(2)
    .max(2)
    .transform((s) => s.toUpperCase()),
  nativeCountry: z
    .string()
    .min(2)
    .max(2)
    .transform((s) => s.toUpperCase()),
  authorizationType: z.nativeEnum(TradeDeemedExportAuthorizationType),
  exemptionBasis: optionalString,
  authorizationReference: optionalString,
  allowedECCNs: codeArray,
  allowedUSMLCategories: codeArray,
  validFrom: requiredIsoDate,
  validUntil: optionalIsoDate,
  notes: optionalString,
});

const updateSchema = z.object({
  authorizationId: z.string().min(1, "authorizationId required"),
  status: z.nativeEnum(TradeDeemedExportAuthorizationStatus).optional(),
  validUntil: optionalIsoDate,
  notes: optionalString,
  allowedECCNs: codeArray.optional(),
  allowedUSMLCategories: codeArray.optional(),
});

export type CreateDeemedExportInput = z.input<typeof createSchema>;
export type UpdateDeemedExportInput = z.input<typeof updateSchema>;

// ─── Actions ────────────────────────────────────────────────────────

export async function createDeemedExport(
  input: CreateDeemedExportInput,
): Promise<DeemedExportActionResult> {
  try {
    const ctx = await resolveSessionContext();
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

    const created = await createDeemedExportAuthorization({
      organizationId: ctx.orgId,
      foreignNationalEmployeeId: parsed.data.foreignNationalEmployeeId,
      foreignNationalName: parsed.data.foreignNationalName,
      foreignNationality: parsed.data.foreignNationality,
      nativeCountry: parsed.data.nativeCountry,
      authorizationType: parsed.data.authorizationType,
      exemptionBasis: parsed.data.exemptionBasis,
      authorizationReference: parsed.data.authorizationReference,
      allowedECCNs: parsed.data.allowedECCNs,
      allowedUSMLCategories: parsed.data.allowedUSMLCategories,
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
      notes: parsed.data.notes,
      lastActionById: ctx.userId,
    });

    revalidatePath("/trade/deemed-exports");
    return { ok: true, id: created.id };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("deemed-export-actions: create failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error while creating authorisation",
    };
  }
}

export async function updateDeemedExport(
  input: UpdateDeemedExportInput,
): Promise<DeemedExportActionResult> {
  try {
    const ctx = await resolveSessionContext();
    assertEditor(ctx.role);

    const parsed = updateSchema.safeParse(input);
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

    await updateDeemedExportAuthorization({
      organizationId: ctx.orgId,
      authorizationId: parsed.data.authorizationId,
      status: parsed.data.status,
      validUntil: parsed.data.validUntil,
      notes: parsed.data.notes,
      allowedECCNs: parsed.data.allowedECCNs,
      allowedUSMLCategories: parsed.data.allowedUSMLCategories,
      lastActionById: ctx.userId,
    });

    revalidatePath("/trade/deemed-exports");
    revalidatePath(`/trade/deemed-exports/${parsed.data.authorizationId}`);
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("deemed-export-actions: update failed", err);
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Unexpected error while updating authorisation",
    };
  }
}
