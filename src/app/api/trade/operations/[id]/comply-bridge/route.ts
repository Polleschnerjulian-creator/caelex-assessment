/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/operations/[id]/comply-bridge
 *
 * Returns the three cross-domain Caelex Comply snapshots for a Trade
 * Operation — debris mitigation, ITU spectrum coordination, and
 * national space-act authorisation. Each is independently nullable
 * (returns `null` when no Spacecraft is linked to the operation via
 * the Mission FK). The client renders an empty state for each null
 * panel.
 *
 * Org-scoped + rate-limited under the "api" tier. Read-only.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import {
  getDebrisStatus,
  getSpectrumStatus,
  getAuthorizationStatus,
} from "@/lib/trade/comply-bridge/comply-bridge-service";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const org = await getCurrentOrganization(userId);
    if (!org) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    // Parallel fetch — three independent reads, no inter-dependencies.
    const [debris, spectrum, authorization] = await Promise.all([
      getDebrisStatus(id, org.organizationId),
      getSpectrumStatus(id, org.organizationId),
      getAuthorizationStatus(id, org.organizationId),
    ]);

    return NextResponse.json({
      debris,
      spectrum,
      authorization,
    });
  } catch (err) {
    logger.error("GET /api/trade/operations/[id]/comply-bridge failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
