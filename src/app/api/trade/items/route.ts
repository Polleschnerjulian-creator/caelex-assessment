/**
 * GET  /api/trade/items  — list TradeItems for the caller's org
 * POST /api/trade/items  — create a new TradeItem
 *
 * Auth: session required, org-scoped.
 * Rate: "api" tier (100 req/min).
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

// ─── Validation ───────────────────────────────────────────────────────

const CreateTradeItemSchema = z.object({
  name: z.string().min(1).max(200),
  internalSku: z.string().max(100).optional(),
  manufacturerName: z.string().max(200).optional(),
  manufacturerPartNo: z.string().max(100).optional(),
  description: z.string().max(5000).default(""),
  eccnEU: z.string().max(50).optional(),
  eccnUS: z.string().max(50).optional(),
  usmlCategory: z.string().max(100).optional(),
  mtcrCategory: z.string().max(100).optional(),
  germanAlEntry: z.string().max(100).optional(),
  countryOfOrigin: z.string().length(2).optional(),
  usContentPercent: z.number().min(0).max(100).optional(),
  designedWithUSTech: z.boolean().optional(),
  manufacturedWithUSEquipment: z.boolean().optional(),
  apertureMeters: z.number().min(0).optional(),
  rangeKm: z.number().min(0).optional(),
  payloadKg: z.number().min(0).optional(),
  isRadHardened: z.boolean().optional(),
  isMilSpec: z.boolean().optional(),
  isAntiJam: z.boolean().optional(),
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
    const status = searchParams.get("status");
    const search = searchParams.get("q") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20", 10));

    const where = {
      organizationId: tradeAuth.organizationId,
      ...(status
        ? {
            status: status as
              | "DRAFT"
              | "CLASSIFIED"
              | "REQUIRES_REVIEW"
              | "ARCHIVED",
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              {
                internalSku: { contains: search, mode: "insensitive" as const },
              },
              { eccnEU: { contains: search, mode: "insensitive" as const } },
              { eccnUS: { contains: search, mode: "insensitive" as const } },
              {
                usmlCategory: {
                  contains: search,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.tradeItem.findMany({
        where,
        select: {
          id: true,
          name: true,
          internalSku: true,
          manufacturerName: true,
          description: true,
          eccnEU: true,
          eccnUS: true,
          usmlCategory: true,
          mtcrCategory: true,
          germanAlEntry: true,
          status: true,
          classificationSource: true,
          classifiedAt: true,
          createdAt: true,
          updatedAt: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tradeItem.count({ where }),
    ]);

    return NextResponse.json({
      items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    logger.error("[trade/items GET]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
    const parsed = CreateTradeItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const item = await prisma.tradeItem.create({
      data: {
        organizationId: tradeAuth.organizationId,
        createdById: tradeAuth.userId,
        name: data.name,
        internalSku: data.internalSku,
        manufacturerName: data.manufacturerName,
        manufacturerPartNo: data.manufacturerPartNo,
        description: data.description,
        eccnEU: data.eccnEU,
        eccnUS: data.eccnUS,
        usmlCategory: data.usmlCategory,
        mtcrCategory: data.mtcrCategory,
        germanAlEntry: data.germanAlEntry,
        countryOfOrigin: data.countryOfOrigin,
        usContentPercent: data.usContentPercent,
        designedWithUSTech: data.designedWithUSTech ?? false,
        manufacturedWithUSEquipment: data.manufacturedWithUSEquipment ?? false,
        apertureMeters: data.apertureMeters,
        rangeKm: data.rangeKm,
        payloadKg: data.payloadKg,
        isRadHardened: data.isRadHardened ?? false,
        isMilSpec: data.isMilSpec ?? false,
        isAntiJam: data.isAntiJam ?? false,
        status: "DRAFT",
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    logger.error("[trade/items POST]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
