/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared auth helper: session + org membership + TRADE product-access gate.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasProductAccess } from "@/lib/products";
import { isSuperAdmin } from "@/lib/super-admin";
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
 * Super-admin bypass: platform owners (lib/super-admin allowlist) skip the
 * membership + entitlement gate and resolve to the OLDEST active org with a
 * synthetic OWNER role — identical to the (trade) layout's god-mode branch,
 * resolveActionContext() (server actions) and resolveTradeOrgId(). WITHOUT
 * this, a super-admin is let into the Trade UI by the layout but every
 * /api/trade/* call here returns null → 403 ("Forbidden" + "Failed to load
 * items"): the page renders, the data calls fail. Using the same findFirst
 * query as the layout guarantees the API operates on the SAME org the shell
 * displays.
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

  // Step 1b — super-admin god-mode (mirrors (trade)/layout.tsx + resolveActionContext)
  if (isSuperAdmin(session.user.email)) {
    const anyOrg = await prisma.organization.findFirst({
      where: { isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!anyOrg) {
      return null;
    }
    return {
      userId: session.user.id,
      organizationId: anyOrg.id,
      role: "OWNER",
    };
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
