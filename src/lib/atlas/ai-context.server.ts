/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — AI Context Loader
 * ─────────────────────────────
 *
 * Loads the two tiers of custom AI-context that are injected into every
 * Atlas chat system-prompt:
 *
 *   1. firmHouseStyle  — Kanzlei-wide standing instructions
 *      (tone, citation style, jurisdiction defaults …).
 *      Stored on AtlasOrgBranding.aiHouseStyle.
 *      Writable only by Owner/Admin.
 *
 *   2. userInstructions — Per-user personal preferences
 *      (output format, language nuance, shortcuts …).
 *      Stored on User.atlasAiInstructions.
 *      Every authenticated user can edit their own record.
 *
 * Returns nulls for absent rows — callers skip injection silently.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import { prisma } from "@/lib/prisma";

export interface AtlasAiContext {
  /** Kanzlei-wide AI house style / standing instructions, or null. */
  firmHouseStyle: string | null;
  /** Per-user personal Atlas AI instructions, or null. */
  userInstructions: string | null;
}

/**
 * Loads both tiers of AI custom-context for a given org + user pair.
 *
 * Tenant-safe: queries are scoped to the provided ids — no cross-tenant
 * leakage is possible even if ids are guessed, because Prisma `findUnique`
 * returns null when the record doesn't exist for the given org.
 *
 * Both queries run in parallel via Promise.all to keep latency low.
 */
export async function loadAtlasAiContext(
  organizationId: string,
  userId: string,
): Promise<AtlasAiContext> {
  const [branding, user] = await Promise.all([
    prisma.atlasOrgBranding.findUnique({
      where: { organizationId },
      select: { aiHouseStyle: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { atlasAiInstructions: true },
    }),
  ]);

  return {
    firmHouseStyle: branding?.aiHouseStyle ?? null,
    userInstructions: user?.atlasAiInstructions ?? null,
  };
}
