"use server";

/**
 * Trade FAA AST server actions (Z38-US, Tier 4).
 *
 * Each action: auth + role-check + Zod parse + delegate to service +
 * revalidatePath. Mirrors uk-ecju-actions.ts.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  createFaaAstLicense,
  transitionFaaAstStatus,
} from "@/lib/trade/faa-ast/faa-ast-service";
import { logger } from "@/lib/logger";
import {
  TradeFaaAstLicenseStatus,
  TradeFaaAstLicenseType,
  TradeFaaAstVehicleType,
  TradeFaaAstFinancialResponsibilityType,
} from "@prisma/client";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const EDITOR_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

class ActionError extends Error {
  constructor(public readonly publicMessage: string) {
    super(publicMessage);
    this.name = "ActionError";
  }
}

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
      "Insufficient role — MANAGER or higher required to manage FAA AST licences",
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

const optionalFloat = z
  .string()
  .optional()
  .transform((v) => {
    if (!v || v.trim().length === 0) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  });

const createSchema = z.object({
  operatorName: z.string().min(1, "Operator name is required").max(500),
  operatorAddress: z.string().min(1, "Operator address is required").max(2000),
  licenseType: z.nativeEnum(TradeFaaAstLicenseType),
  faaReference: z.string().max(64).optional(),
  launchSite: z.string().min(1, "Launch site is required").max(200),
  vehicleName: z.string().min(1, "Vehicle name is required").max(200),
  vehicleType: z.nativeEnum(TradeFaaAstVehicleType),
  maximumProbabilityOfCasualtyEc: optionalFloat,
  thirdPartyLiabilityCapUsdCents: optionalBigInt,
  financialResponsibilityType: z
    .nativeEnum(TradeFaaAstFinancialResponsibilityType)
    .optional(),
  validFrom: optionalIsoDate,
  validUntil: optionalIsoDate,
  notes: z.string().max(4000).optional(),
});

const transitionSchema = z.object({
  licenseId: z.string().min(1),
  nextStatus: z.nativeEnum(TradeFaaAstLicenseStatus),
  faaReference: z.string().max(64).optional(),
  validFrom: optionalIsoDate,
  validUntil: optionalIsoDate,
  notes: z.string().max(4000).optional(),
});

// ─── Actions ────────────────────────────────────────────────────────

export async function createFaaAstLicenseAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { userId, orgId, role } = await resolveSessionContext();
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

    const created = await createFaaAstLicense({
      organizationId: orgId,
      operatorName: parsed.data.operatorName,
      operatorAddress: parsed.data.operatorAddress,
      licenseType: parsed.data.licenseType,
      faaReference: parsed.data.faaReference ?? null,
      launchSite: parsed.data.launchSite,
      vehicleName: parsed.data.vehicleName,
      vehicleType: parsed.data.vehicleType,
      maximumProbabilityOfCasualtyEc:
        parsed.data.maximumProbabilityOfCasualtyEc,
      thirdPartyLiabilityCapUsdCents:
        parsed.data.thirdPartyLiabilityCapUsdCents,
      financialResponsibilityType:
        parsed.data.financialResponsibilityType ?? null,
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
      notes: parsed.data.notes ?? null,
      createdById: userId,
    });

    revalidatePath("/trade/faa-ast");
    return { ok: true, id: created.id };
  } catch (err) {
    const message =
      err instanceof ActionError
        ? err.publicMessage
        : err instanceof Error
          ? err.message
          : "Unknown error";
    logger.warn(`createFaaAstLicenseAction failed: ${message}`);
    return { ok: false, error: message };
  }
}

export async function transitionFaaAstStatusAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const { orgId, role } = await resolveSessionContext();
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

    await transitionFaaAstStatus({
      organizationId: orgId,
      licenseId: parsed.data.licenseId,
      nextStatus: parsed.data.nextStatus,
      faaReference: parsed.data.faaReference,
      validFrom: parsed.data.validFrom,
      validUntil: parsed.data.validUntil,
      notes: parsed.data.notes,
    });

    revalidatePath("/trade/faa-ast");
    revalidatePath(`/trade/faa-ast/${parsed.data.licenseId}`);
    return { ok: true, id: parsed.data.licenseId };
  } catch (err) {
    const message =
      err instanceof ActionError
        ? err.publicMessage
        : err instanceof Error
          ? err.message
          : "Unknown error";
    logger.warn(`transitionFaaAstStatusAction failed: ${message}`);
    return { ok: false, error: message };
  }
}
