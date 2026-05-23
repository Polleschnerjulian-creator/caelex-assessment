"use server";

/**
 * Caelex Trade — Settings server actions (Sprint T-Settings).
 *
 * One action per Settings tab. Each:
 *   1. auth-check (must be signed in)
 *   2. role-check (OWNER/ADMIN only — settings are admin-surface)
 *   3. zod-validate the input
 *   4. delegate to the appropriate service
 *   5. revalidatePath('/trade/settings') so the page picks up state
 *
 * The OWNER/ADMIN role floor matches the platform-wide convention that
 * `org:update` / `settings:write` permissions belong to that group.
 * MANAGER+ would let team-leads edit settings, which is the rule for
 * the compliance program — but settings carry billing-adjacent risk
 * (API keys, webhook URLs) so we stay stricter here.
 *
 * Returns a discriminated `ActionResult` so client forms can render
 * field-level errors without juggling try/catch around the boundary.
 */

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/super-admin";
import { logger } from "@/lib/logger";
import {
  upsertProfile,
  isTradeRegime,
  type TradeOrgProfilePatch,
  type TradeRegime,
} from "@/lib/trade/settings/org-profile-service";
import {
  upsertPreferences,
  RetentionRangeError,
  type TradeNotificationPreferencesPatch,
} from "@/lib/trade/settings/notification-preferences-service";
import {
  createApiKey as createApiKeyService,
  revokeApiKey as revokeApiKeyService,
  InvalidScopeError,
  type TradeApiKeyScope,
  type CreatedTradeApiKey,
} from "@/lib/trade/settings/api-keys-service";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export type CreateApiKeyResult =
  | { ok: true; plaintextKey: string; keyPrefix: string; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * OWNER and ADMIN may edit Trade settings. MANAGER+ would be too loose
 * because API-key creation and webhook URLs are billing-adjacent.
 */
const SETTINGS_EDITOR_ROLES = ["OWNER", "ADMIN"] as const;

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
  if (!session?.user?.id) {
    throw new ActionError("Not signed in");
  }
  const userId = session.user.id;

  if (isSuperAdmin(session.user.email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!anyOrg) {
      throw new ActionError("No active organisation found");
    }
    return { userId, orgId: anyOrg.id, role: "OWNER" };
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId, organization: { isActive: true } },
    select: { organizationId: true, role: true },
    orderBy: { joinedAt: "asc" },
  });
  if (!membership) {
    throw new ActionError("No active organisation membership");
  }
  return { userId, orgId: membership.organizationId, role: membership.role };
}

function assertSettingsEditor(role: string) {
  if (!(SETTINGS_EDITOR_ROLES as readonly string[]).includes(role)) {
    throw new ActionError(
      "Insufficient role — OWNER or ADMIN required to edit Trade settings",
    );
  }
}

// ─── Zod helpers ───────────────────────────────────────────────────────

const optionalString = z
  .string()
  .optional()
  .transform((v) => {
    const t = v?.trim();
    return t && t.length > 0 ? t : null;
  });

const optionalEmail = z
  .union([z.string().email(), z.literal("")])
  .optional()
  .transform((v) => (v && v.length > 0 ? v.trim() : null));

const optionalUrl = z
  .union([z.string().url(), z.literal("")])
  .optional()
  .transform((v) => (v && v.length > 0 ? v.trim() : null));

const optionalBoolean = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

// ─── Org Profile ───────────────────────────────────────────────────────

const orgProfileSchema = z.object({
  bafaContactName: optionalString,
  bafaContactRole: optionalString,
  bafaContactPhone: optionalString,
  bafaContactEmail: optionalEmail,
  eoriNumber: optionalString,
  dunsPlus4: optionalString,
  primaryExportJurisdiction: optionalString,
  preferredRegimes: z.array(z.string()).optional(),
});

export type OrgProfileInput = z.input<typeof orgProfileSchema>;

export async function updateOrgProfile(
  input: OrgProfileInput,
): Promise<ActionResult> {
  try {
    const ctx = await resolveSessionContext();
    assertSettingsEditor(ctx.role);

    const parsed = orgProfileSchema.safeParse(input);
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

    // Whitelist-filter regimes server-side — the form sends raw strings.
    const regimes = (parsed.data.preferredRegimes ?? []).filter(
      (r): r is TradeRegime => isTradeRegime(r),
    );

    const patch: TradeOrgProfilePatch = {
      ...parsed.data,
      preferredRegimes: regimes,
    };

    await upsertProfile(ctx.orgId, patch);
    revalidatePath("/trade/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("settings-actions: updateOrgProfile failed", err);
    return {
      ok: false,
      error: "Unexpected error while saving — please try again",
    };
  }
}

// ─── Notification preferences ──────────────────────────────────────────

const notificationsSchema = z.object({
  notifyLicenseExpiry: optionalBoolean,
  notifyEucExpiry: optionalBoolean,
  notifyReexportConsentExpiry: optionalBoolean,
  notifySanctionsHit: optionalBoolean,
  notifyCatchAllTrigger: optionalBoolean,
  notifySupplement2Reminder: optionalBoolean,
  notifySammelgenehmigungExpiry: optionalBoolean,
  notifyVsdDeadline: optionalBoolean,
});

export type NotificationsInput = z.input<typeof notificationsSchema>;

export async function updateNotifications(
  input: NotificationsInput,
): Promise<ActionResult> {
  try {
    const ctx = await resolveSessionContext();
    assertSettingsEditor(ctx.role);

    const parsed = notificationsSchema.safeParse(input);
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

    await upsertPreferences(
      ctx.orgId,
      parsed.data as TradeNotificationPreferencesPatch,
    );
    revalidatePath("/trade/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("settings-actions: updateNotifications failed", err);
    return {
      ok: false,
      error: "Unexpected error while saving — please try again",
    };
  }
}

// ─── Audit settings (lives on the same preferences row) ────────────────

const auditSchema = z.object({
  auditRetentionYears: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "" || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    }),
  auditWebhookUrl: optionalUrl,
  auditWebhookOnClassification: optionalBoolean,
  auditWebhookOnLicenseDecision: optionalBoolean,
  auditWebhookOnScreeningHit: optionalBoolean,
  auditWebhookOnEucLifecycle: optionalBoolean,
  auditWebhookOnVsdSubmitted: optionalBoolean,
});

export type AuditInput = z.input<typeof auditSchema>;

export async function updateAuditSettings(
  input: AuditInput,
): Promise<ActionResult> {
  try {
    const ctx = await resolveSessionContext();
    assertSettingsEditor(ctx.role);

    const parsed = auditSchema.safeParse(input);
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

    // Drop undefined retention so we don't try to update with `undefined`
    // (the schema turns blank input into undefined; Prisma would NPE).
    const patch: TradeNotificationPreferencesPatch = { ...parsed.data };
    if (patch.auditRetentionYears === undefined) {
      delete patch.auditRetentionYears;
    }

    try {
      await upsertPreferences(ctx.orgId, patch);
    } catch (err) {
      if (err instanceof RetentionRangeError) {
        return {
          ok: false,
          error: "Some fields are invalid",
          fieldErrors: { auditRetentionYears: [err.message] },
        };
      }
      throw err;
    }

    revalidatePath("/trade/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("settings-actions: updateAuditSettings failed", err);
    return {
      ok: false,
      error: "Unexpected error while saving — please try again",
    };
  }
}

// ─── API keys ──────────────────────────────────────────────────────────

const createKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Name too long"),
  scopes: z.array(z.string()).min(1, "Pick a scope"),
});

export type CreateApiKeyInput = z.input<typeof createKeySchema>;

export async function createTradeApiKey(
  input: CreateApiKeyInput,
): Promise<CreateApiKeyResult> {
  try {
    const ctx = await resolveSessionContext();
    assertSettingsEditor(ctx.role);

    const parsed = createKeySchema.safeParse(input);
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

    let created: CreatedTradeApiKey;
    try {
      created = await createApiKeyService({
        organizationId: ctx.orgId,
        name: parsed.data.name,
        scopes: parsed.data.scopes as TradeApiKeyScope[],
        createdById: ctx.userId,
      });
    } catch (err) {
      if (err instanceof InvalidScopeError) {
        return {
          ok: false,
          error: "Some fields are invalid",
          fieldErrors: { scopes: [err.message] },
        };
      }
      throw err;
    }

    revalidatePath("/trade/settings");
    return {
      ok: true,
      plaintextKey: created.plaintextKey,
      keyPrefix: created.apiKey.keyPrefix,
      id: created.apiKey.id,
    };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("settings-actions: createTradeApiKey failed", err);
    return {
      ok: false,
      error: "Unexpected error while creating key — please try again",
    };
  }
}

const revokeKeySchema = z.object({
  id: z.string().min(1, "id required"),
  reason: optionalString,
});

export type RevokeApiKeyInput = z.input<typeof revokeKeySchema>;

export async function revokeTradeApiKey(
  input: RevokeApiKeyInput,
): Promise<ActionResult> {
  try {
    const ctx = await resolveSessionContext();
    assertSettingsEditor(ctx.role);

    const parsed = revokeKeySchema.safeParse(input);
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

    const revoked = await revokeApiKeyService(
      parsed.data.id,
      ctx.orgId,
      parsed.data.reason,
    );

    if (!revoked) {
      return { ok: false, error: "API key not found" };
    }

    revalidatePath("/trade/settings");
    return { ok: true };
  } catch (err) {
    if (err instanceof ActionError) {
      return { ok: false, error: err.publicMessage };
    }
    logger.error("settings-actions: revokeTradeApiKey failed", err);
    return {
      ok: false,
      error: "Unexpected error while revoking key — please try again",
    };
  }
}
