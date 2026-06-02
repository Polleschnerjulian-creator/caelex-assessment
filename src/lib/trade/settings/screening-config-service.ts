import "server-only";
import { prisma } from "@/lib/prisma";
import {
  type ScreeningConfig,
  type RawScreeningConfig,
  normalizeScreeningConfig,
} from "./screening-config";

/**
 * Caelex Passage — Screening config service (server-only).
 *
 * Thin I/O glue over the pure `screening-config` core: read the effective
 * config (DB row normalised, or audited defaults), lazy-create the row, and
 * apply a validated patch. Every read + write flows through
 * `normalizeScreeningConfig`, so the engine and UI always see a clean config
 * regardless of what's in the row or the request body.
 */

/**
 * The effective config for an org — the stored row normalised through the
 * pure core, or the audited defaults when no row exists. This is what the
 * screening engine and the settings UI both read (default-safe).
 */
export async function getEffectiveScreeningConfig(
  organizationId: string,
): Promise<ScreeningConfig> {
  const row = await prisma.tradeScreeningConfig.findUnique({
    where: { organizationId },
  });
  return normalizeScreeningConfig(row);
}

/**
 * Lazy-create the row with schema defaults (call on Settings-page load so
 * the Screening tab always has a row to edit). Returns the raw row.
 */
export async function ensureScreeningConfig(organizationId: string) {
  return prisma.tradeScreeningConfig.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
}

/**
 * Apply a partial patch — merged over the current effective config and
 * normalised through the pure core, so partial updates keep untouched
 * fields and no out-of-range value is ever persisted. Records who changed
 * it. Returns the new effective config.
 */
export async function updateScreeningConfig(
  organizationId: string,
  patch: RawScreeningConfig,
  updatedById?: string | null,
): Promise<ScreeningConfig> {
  const current = await getEffectiveScreeningConfig(organizationId);
  const clean = normalizeScreeningConfig({ ...current, ...patch });

  await prisma.tradeScreeningConfig.upsert({
    where: { organizationId },
    create: {
      organizationId,
      enabledLists: clean.enabledLists,
      matchThreshold: clean.matchThreshold,
      autoBlockOnConfirmedHit: clean.autoBlockOnConfirmedHit,
      reScreenIntervalDays: clean.reScreenIntervalDays,
      updatedById: updatedById ?? null,
    },
    update: {
      enabledLists: clean.enabledLists,
      matchThreshold: clean.matchThreshold,
      autoBlockOnConfirmedHit: clean.autoBlockOnConfirmedHit,
      reScreenIntervalDays: clean.reScreenIntervalDays,
      updatedById: updatedById ?? null,
    },
  });

  return clean;
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
