/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/customs/aes-us?operationId=<id>
 *
 * Z14b — AES US (Automated Export System) filing-payload export.
 *
 * Returns an application/xml stream containing the AES electronic-filing
 * payload generated from the supplied TradeOperation. The client
 * downloads as `aes-export-filing-<reference>.xml`.
 *
 * Server-side generation chosen for the same reasons as Z14a / Z5c:
 * smaller route bundle for non-users, single org-scoped DAL.
 *
 * Authorization: same as GET /api/trade/operations/[id] — org-member
 * with read access to the operation.
 *
 * Rate limit: `export` tier (20/hr).
 *
 * NOTE: This endpoint generates the filing PAYLOAD only. Actual ACE /
 * AESDirect submission via CBP's CATAIR interface is a separate future
 * sprint.
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
import { buildAesXml } from "@/lib/trade/customs-filing/aes-us";

export async function GET(req: Request) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "export",
      getIdentifier(req, tradeAuth.userId),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const url = new URL(req.url);
    const operationId = url.searchParams.get("operationId");
    if (!operationId) {
      return NextResponse.json(
        { error: "Missing required query param: operationId" },
        { status: 400 },
      );
    }

    // Pull the operation with the full graph the builder needs.
    const operation = await prisma.tradeOperation.findFirst({
      where: { id: operationId, organizationId: tradeAuth.organizationId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        counterparty: {
          select: {
            legalName: true,
            tradeName: true,
            countryCode: true,
            addressLines: true,
          },
        },
        lines: {
          include: {
            item: {
              select: {
                name: true,
                description: true,
                countryOfOrigin: true,
                eccnUS: true,
                usmlCategory: true,
              },
            },
            appliedLicense: {
              select: {
                licenseType: true,
                licenseNumber: true,
              },
            },
          },
        },
        licenses: {
          select: {
            licenseType: true,
            licenseNumber: true,
          },
        },
      },
    });

    if (!operation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const xml = buildAesXml({
      generatedAt: new Date(),
      usppi: {
        legalName: operation.organization?.name ?? "(Organisation unknown)",
        addressCountry: "US",
      },
      operation: {
        id: operation.id,
        reference: operation.reference,
        description: operation.description,
        operationType: operation.operationType,
        shipFromCountry: operation.shipFromCountry,
        shipToCountry: operation.shipToCountry,
        endUseCountry: operation.endUseCountry,
        endUserName: operation.endUserName,
        endUserSector: operation.endUserSector,
        scheduledShipDate: operation.scheduledShipDate,
        createdAt: operation.createdAt,
        counterparty: operation.counterparty,
        lines: operation.lines.map((l) => ({
          id: l.id,
          quantity: l.quantity,
          unitValue: l.unitValue,
          unitCurrency: l.unitCurrency,
          item: l.item,
          appliedLicense: l.appliedLicense,
        })),
        licenses: operation.licenses.map((lic) => ({
          licenseType: lic.licenseType,
          licenseNumber: lic.licenseNumber,
        })),
      },
    });

    // Sanitize reference for the Content-Disposition filename.
    const safeRef = operation.reference.replace(/[^A-Z0-9_-]/gi, "-");

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="aes-export-filing-${safeRef}.xml"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error("GET /api/trade/customs/aes-us failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
