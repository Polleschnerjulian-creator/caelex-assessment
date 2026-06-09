/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET  /api/trade/parties  — list TradeParty records for the caller's org
 * POST /api/trade/parties  — create a new TradeParty
 *
 * Auth: session required, org-scoped via getCurrentOrganization.
 * Rate: "api" tier (100 req/min).
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
import { TradePartyStatus, TradeScreeningStatus, Prisma } from "@prisma/client";

import { canonicalizeName } from "@/lib/comply-v2/trade/screening/sources/types";
import { emitTradeEvent } from "@/lib/comply-v2/trade/ops-events.server";

// ─── Validation ───────────────────────────────────────────────────────

/**
 * High-risk countries (NIS2 Annex II + OFAC most-restricted + EU dual-use D:1).
 * Used to set isHighRiskCountry on creation. Hard-coded here rather than DB
 * because the list is small + audit-stable + rarely changes (regulatory event).
 */
const HIGH_RISK_COUNTRIES = new Set<string>([
  "CN",
  "RU",
  "IR",
  "KP",
  "BY",
  "SY",
  "VE",
  "CU",
  "MM",
  "AF",
]);

const CreateTradePartySchema = z.object({
  legalName: z.string().min(1).max(300),
  tradeName: z.string().max(300).optional(),
  countryCode: z
    .string()
    .length(2)
    .regex(/^[A-Z]{2}$/, "Must be ISO 3166-1 alpha-2 (uppercase)"),
  addressLines: z.array(z.string().max(200)).max(10).optional(),
  vatNumber: z.string().max(50).optional(),
  ducnsNumber: z.string().max(20).optional(),
  leiCode: z.string().length(20).optional(),
  cageCode: z.string().max(10).optional(),
  isUSPerson: z.boolean().optional(),
});

// ─── GET ─────────────────────────────────────────────────────────────

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") ?? "";
    const status = searchParams.get("status");
    const screening = searchParams.get("screening");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

    const where: Prisma.TradePartyWhereInput = {
      organizationId: tradeAuth.organizationId,
    };

    if (status && status in TradePartyStatus) {
      where.status = status as TradePartyStatus;
    }
    if (screening && screening in TradeScreeningStatus) {
      where.screeningStatus = screening as TradeScreeningStatus;
    }
    if (search) {
      const canonical = canonicalizeName(search);
      where.OR = [
        { legalName: { contains: search, mode: "insensitive" } },
        { tradeName: { contains: search, mode: "insensitive" } },
        // Use canonical for fuzzy-ish exact match — search "müller" finds "muller"
        { canonicalName: { contains: canonical } },
      ];
    }

    const [parties, total] = await Promise.all([
      prisma.tradeParty.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          countryCode: true,
          status: true,
          screeningStatus: true,
          isUSPerson: true,
          isHighRiskCountry: true,
          lastScreenedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.tradeParty.count({ where }),
    ]);

    return NextResponse.json({
      parties,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("GET /api/trade/parties failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
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

    const body = await req.json();
    const parsed = CreateTradePartySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const canonical = canonicalizeName(data.legalName);
    const isHighRisk = HIGH_RISK_COUNTRIES.has(data.countryCode);

    const party = await prisma.tradeParty.create({
      data: {
        organizationId: tradeAuth.organizationId,
        createdById: tradeAuth.userId,
        legalName: data.legalName,
        tradeName: data.tradeName,
        countryCode: data.countryCode,
        addressLines: data.addressLines ?? [],
        canonicalName: canonical,
        vatNumber: data.vatNumber,
        ducnsNumber: data.ducnsNumber,
        leiCode: data.leiCode,
        cageCode: data.cageCode,
        isUSPerson: data.isUSPerson ?? false,
        isHighRiskCountry: isHighRisk,
        // status defaults ACTIVE; screeningStatus defaults NOT_SCREENED
      },
    });

    await emitTradeEvent("trade.party.created", {
      organizationId: tradeAuth.organizationId,
      summary: `${party.legalName} · ${party.countryCode}${isHighRisk ? " · high-risk country" : ""}`,
      data: {
        partyId: party.id,
        legalName: party.legalName,
        countryCode: party.countryCode,
        isHighRiskCountry: isHighRisk,
        userId: tradeAuth.userId,
      },
    });

    logger.info("trade party created", {
      partyId: party.id,
      orgId: tradeAuth.organizationId,
      userId: tradeAuth.userId,
    });

    return NextResponse.json({ party }, { status: 201 });
  } catch (err) {
    logger.error("POST /api/trade/parties failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
