/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET   /api/trade/parties/[id]  — fetch one TradeParty + recent screening results
 * PATCH /api/trade/parties/[id]  — update mutable fields
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { z } from "zod";
import { TradePartyStatus } from "@prisma/client";

import { canonicalizeName } from "@/lib/comply-v2/trade/screening/sources/types";

const UpdateTradePartySchema = z.object({
  legalName: z.string().min(1).max(300).optional(),
  tradeName: z.string().max(300).nullable().optional(),
  countryCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/)
    .optional(),
  addressLines: z.array(z.string().max(200)).max(10).optional(),
  vatNumber: z.string().max(50).nullable().optional(),
  ducnsNumber: z.string().max(20).nullable().optional(),
  leiCode: z.string().length(20).nullable().optional(),
  cageCode: z.string().max(10).nullable().optional(),
  isUSPerson: z.boolean().optional(),
  status: z.nativeEnum(TradePartyStatus).optional(),
  blockedReason: z.string().max(500).nullable().optional(),
});

// ─── GET ─────────────────────────────────────────────────────────────

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
    const party = await prisma.tradeParty.findFirst({
      where: { id, organizationId: org.organizationId },
      include: {
        screenings: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            decision: true,
            decidedAt: true,
            createdAt: true,
            snapshotHash: true,
            hits: true,
            notes: true,
            decidedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!party) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ party });
  } catch (err) {
    logger.error({ err }, "GET /api/trade/parties/[id] failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── PATCH ───────────────────────────────────────────────────────────

export async function PATCH(
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

    const existing = await prisma.tradeParty.findFirst({
      where: { id, organizationId: org.organizationId },
      select: { id: true, legalName: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = UpdateTradePartySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const data = parsed.data;

    // If legalName changes, regenerate canonicalName so fuzzy match stays in sync.
    const updates: Record<string, unknown> = { ...data };
    if (data.legalName && data.legalName !== existing.legalName) {
      updates.canonicalName = canonicalizeName(data.legalName);
    }

    const party = await prisma.tradeParty.update({
      where: { id },
      data: updates,
    });

    logger.info(
      { partyId: id, userId, fields: Object.keys(data) },
      "trade party updated",
    );

    return NextResponse.json({ party });
  } catch (err) {
    logger.error({ err }, "PATCH /api/trade/parties/[id] failed");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
