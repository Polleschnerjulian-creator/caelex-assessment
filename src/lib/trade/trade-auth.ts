/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared auth helper: session + org membership + TRADE product-access gate.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import type { OrganizationRole } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TradeAuthContext {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Single gate for Trade API routes.
 *
 * Composes three checks:
 *   1. Valid NextAuth session with a user.id
 *   2. Active org membership via getCurrentOrganization
 *   3. TRADE product entitlement via hasProductAccess
 *
 * Returns null on ANY failure so callers can map to 401 / 403.
 * Returns a minimal TradeAuthContext on success.
 */
export async function getTradeAuth(): Promise<TradeAuthContext | null> {
  // Step 1 — session
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  // Step 2 — org membership
  const org = await getCurrentOrganization(session.user.id);
  if (!org) {
    return null;
  }

  // Step 3 — TRADE product entitlement
  const ok = await hasProductAccess(org.organizationId, "TRADE");
  if (!ok) {
    return null;
  }

  return {
    userId: org.userId,
    organizationId: org.organizationId,
    role: org.role,
  };
}
