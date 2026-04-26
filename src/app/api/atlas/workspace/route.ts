/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/atlas/workspace
 *
 * Atlas-AI-Mode 5. Quick-Action ⌘5: Erstellt einen leeren STANDALONE
 * Matter (ohne Mandant, ohne Scope, ohne Handshake) und gibt die
 * matterId zurück. Client navigiert anschließend zu
 * /atlas/network/{matterId}/workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  createStandaloneMatter,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(2).max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "legal_matter_invite",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: {
        organizationId: true,
        organization: {
          select: { id: true, orgType: true, isActive: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership || !membership.organization.isActive) {
      return NextResponse.json(
        { error: "No active organisation" },
        { status: 403 },
      );
    }
    // Atlas (lawyer-side) — operators are not lawyers, no workspace
    // privilege for them.
    if (
      membership.organization.orgType !== "LAW_FIRM" &&
      membership.organization.orgType !== "BOTH"
    ) {
      return NextResponse.json(
        { error: "Workspace is for law-firm orgs only" },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createStandaloneMatter({
      lawFirmOrgId: membership.organizationId,
      createdBy: session.user.id,
      name: parsed.data.name,
    });

    return NextResponse.json({ matterId: result.matterId }, { status: 201 });
  } catch (err) {
    if (err instanceof MatterServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspace failed: ${msg}`);
    return NextResponse.json(
      { error: "Workspace creation failed" },
      { status: 500 },
    );
  }
}
