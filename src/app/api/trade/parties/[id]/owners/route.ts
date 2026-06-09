/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/trade/parties/[id]/owners — list TradePartyOwnership edges
 *                                       where this party is the OWNED entity
 * POST /api/trade/parties/[id]/owners — add a new owner of this party
 *
 * The cascade engine (Sprint A6) reads these edges to compute the
 * 50%-rule sanctioned-ownership aggregate.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { z } from "zod";

const AddOwnerSchema = z
  .object({
    ownerId: z.string().min(1).max(50),
    percent: z.number().gt(0).lte(1),
    controlType: z
      .enum(["economic", "voting", "control_no_equity"])
      .default("economic"),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.ownerId !== undefined, {
    message: "ownerId is required",
  });

// ─── GET ─────────────────────────────────────────────────────────────

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    // Verify org-scope: the OWNED party must be in caller's org
    const target = await prisma.tradeParty.findFirst({
      where: { id, organizationId: tradeAuth.organizationId },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const edges = await prisma.tradePartyOwnership.findMany({
      where: { ownedId: id },
      orderBy: { percent: "desc" },
      select: {
        id: true,
        percent: true,
        controlType: true,
        notes: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            legalName: true,
            countryCode: true,
            screeningStatus: true,
            status: true,
            isHighRiskCountry: true,
          },
        },
      },
    });

    return NextResponse.json({ owners: edges });
  } catch (err) {
    logger.error("GET /api/trade/parties/[id]/owners failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    const body = await req.json();
    const parsed = AddOwnerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { ownerId, percent, controlType, notes } = parsed.data;

    if (ownerId === id) {
      return NextResponse.json(
        { error: "A party cannot own itself" },
        { status: 400 },
      );
    }

    // Both parties must be in the same org
    const [target, owner] = await Promise.all([
      prisma.tradeParty.findFirst({
        where: { id, organizationId: tradeAuth.organizationId },
        select: { id: true, legalName: true },
      }),
      prisma.tradeParty.findFirst({
        where: { id: ownerId, organizationId: tradeAuth.organizationId },
        select: { id: true, legalName: true },
      }),
    ]);
    if (!target) {
      return NextResponse.json(
        { error: "Owned party not found" },
        { status: 404 },
      );
    }
    if (!owner) {
      return NextResponse.json(
        { error: "Owner party not found" },
        { status: 404 },
      );
    }

    try {
      const edge = await prisma.tradePartyOwnership.create({
        data: {
          ownerId,
          ownedId: id,
          percent,
          controlType,
          notes,
        },
        include: {
          owner: {
            select: {
              id: true,
              legalName: true,
              countryCode: true,
              screeningStatus: true,
              status: true,
              isHighRiskCountry: true,
            },
          },
        },
      });

      logger.info("trade ownership edge created", {
        ownedId: id,
        ownerId,
        percent,
        controlType,
        userId: tradeAuth.userId,
      });

      return NextResponse.json({ edge }, { status: 201 });
    } catch (e) {
      // Unique constraint violation → already exists
      const code = (e as { code?: string }).code;
      if (code === "P2002") {
        return NextResponse.json(
          {
            error:
              "Ownership edge already exists from this owner to this party. Delete it first to re-add with new values.",
          },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (err) {
    logger.error("POST /api/trade/parties/[id]/owners failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
