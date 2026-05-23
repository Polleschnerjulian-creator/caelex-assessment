import "server-only";
import { prisma } from "@/lib/prisma";
import type { TradeNotificationPreferences } from "@prisma/client";

/**
 * Caelex Trade — Settings: Notification & Audit-Trail preferences
 * (Sprint T-Settings).
 *
 * Single row per org carrying:
 *   - 8 email-notification toggles (license expiry, EUC expiry,
 *     re-export consent expiry, sanctions hit, catch-all trigger,
 *     Supplement No. 2 reminder, Sammelgenehmigung expiry, VSD
 *     deadline). All default true — operators are opted in.
 *   - Audit-trail settings: retention period (years), optional
 *     webhook URL, per-event-type webhook opt-ins.
 *
 * The two clusters live on one row because they share the same
 * write cadence (org-admin updates them from the same Settings
 * tab) and the same access pattern (read once per page load).
 */

export type TradeNotificationPreferencesView = TradeNotificationPreferences;

/**
 * Patch shape — every field optional, missing fields leave the
 * column untouched (true partial-patch semantics).
 */
export type TradeNotificationPreferencesPatch = Partial<
  Omit<
    TradeNotificationPreferences,
    "id" | "organizationId" | "createdAt" | "updatedAt"
  >
>;

/**
 * Validation bounds for the retention window. 1 year is the floor
 * because below that we can't satisfy the EAR/ITAR 5-year retention
 * obligation; 30 years is the ceiling to prevent runaway settings.
 */
export const MIN_RETENTION_YEARS = 1;
export const MAX_RETENTION_YEARS = 30;
export const DEFAULT_RETENTION_YEARS = 5;

/**
 * Fetch preferences for an org. Returns null when no row exists —
 * call `ensurePreferences` to lazy-create with the default-on toggles.
 */
export async function getPreferences(
  organizationId: string,
): Promise<TradeNotificationPreferencesView | null> {
  return prisma.tradeNotificationPreferences.findUnique({
    where: { organizationId },
  });
}

/**
 * Return preferences for an org, creating a default-on row if missing.
 * The new row gets all 8 notification toggles set to true and the
 * 5y retention default. Safe to call on every Settings-page load.
 */
export async function ensurePreferences(
  organizationId: string,
): Promise<TradeNotificationPreferencesView> {
  return prisma.tradeNotificationPreferences.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
}

/**
 * Merge a patch into the preferences row. Throws on out-of-range
 * `auditRetentionYears` so callers can surface a field-level error
 * to the form. Fields omitted from the patch leave the column
 * untouched.
 */
export async function upsertPreferences(
  organizationId: string,
  patch: TradeNotificationPreferencesPatch,
): Promise<TradeNotificationPreferencesView> {
  if (Object.prototype.hasOwnProperty.call(patch, "auditRetentionYears")) {
    const years = patch.auditRetentionYears;
    if (
      years === null ||
      years === undefined ||
      !Number.isInteger(years) ||
      years < MIN_RETENTION_YEARS ||
      years > MAX_RETENTION_YEARS
    ) {
      throw new RetentionRangeError(
        `auditRetentionYears must be an integer between ${MIN_RETENTION_YEARS} and ${MAX_RETENTION_YEARS}`,
      );
    }
  }

  // Defensive: an empty-string webhook URL collapses to null. The
  // Prisma column is nullable and we don't want stray "" rows.
  const sanitised: TradeNotificationPreferencesPatch = { ...patch };
  if (
    Object.prototype.hasOwnProperty.call(sanitised, "auditWebhookUrl") &&
    (sanitised.auditWebhookUrl === "" ||
      sanitised.auditWebhookUrl === undefined)
  ) {
    sanitised.auditWebhookUrl = null;
  }

  return prisma.tradeNotificationPreferences.upsert({
    where: { organizationId },
    create: { organizationId, ...sanitised },
    update: { ...sanitised },
  });
}

/**
 * Thrown by `upsertPreferences` when the retention window is out of
 * the supported range. Server actions catch this and surface a
 * field-level form error.
 */
export class RetentionRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetentionRangeError";
  }
}
