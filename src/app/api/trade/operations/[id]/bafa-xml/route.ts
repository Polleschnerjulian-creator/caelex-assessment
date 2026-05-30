/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/operations/[id]/bafa-xml — BAFA ELAN-K2 XML export (Z5c).
 *
 * Returns an application/xml stream that the client downloads as
 * `bafa-elan-k2-<reference>.xml`. Server-side rendering chosen over
 * client-side serialization to:
 *
 *   - Keep the XML builder out of the route-bundle for users who
 *     never click the button.
 *   - Avoid leaking the schema-mapping logic to non-authenticated
 *     pages (the builder is plain TS, but defence-in-depth).
 *   - Re-use the existing org-scoped DAL query the GET endpoint
 *     already proves out.
 *
 * Authorization: same as GET /api/trade/operations/[id] — org-member
 * with read access to the operation. No additional permission gate;
 * if you can VIEW the operation you can EXPORT it.
 *
 * Rate limit: `export` tier (20/hr). XML generation is cheap but the
 * downstream BAFA upload is what we're actually protecting — operators
 * shouldn't be spamming new versions of the same export every minute.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";
import { buildBafaXmlReport } from "@/lib/trade/bafa";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const tradeAuth = await getTradeAuth();
    if (!tradeAuth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { userId, organizationId } = tradeAuth;

    const rl = await checkRateLimit("export", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const { id } = await context.params;

    // Pull the operation with the full graph the builder needs.
    // Mirrors the include shape of GET /api/trade/operations/[id] but
    // selects the BAFA-specific fields (e.g. counterparty.addressLines,
    // hsCode, full item codes).
    const operation = await prisma.tradeOperation.findFirst({
      where: { id, organizationId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        counterparty: {
          select: {
            legalName: true,
            tradeName: true,
            countryCode: true,
            addressLines: true,
            vatNumber: true,
            leiCode: true,
          },
        },
        lines: {
          include: {
            item: {
              select: {
                name: true,
                internalSku: true,
                manufacturerName: true,
                manufacturerPartNo: true,
                description: true,
                eccnEU: true,
                eccnUS: true,
                usmlCategory: true,
                mtcrCategory: true,
                germanAlEntry: true,
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
            issuedAt: true,
            validUntil: true,
            status: true,
          },
        },
      },
    });

    if (!operation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const xml = buildBafaXmlReport({
      generatedAt: new Date(),
      applicant: {
        legalName: operation.organization?.name ?? "(Organisation unknown)",
        addressCountry: "DE",
      },
      operation: {
        id: operation.id,
        reference: operation.reference,
        description: operation.description,
        operationType: operation.operationType,
        status: operation.status,
        shipFromCountry: operation.shipFromCountry,
        shipToCountry: operation.shipToCountry,
        endUseCountry: operation.endUseCountry,
        routeStops: operation.routeStops,
        declaredEndUse: operation.declaredEndUse,
        endUserName: operation.endUserName,
        endUserSector: operation.endUserSector,
        catchAllArt4Hit: operation.catchAllArt4Hit,
        catchAllArt5Hit: operation.catchAllArt5Hit,
        catchAllArt9Hit: operation.catchAllArt9Hit,
        catchAllArt10Hit: operation.catchAllArt10Hit,
        notificationDuty: operation.notificationDuty,
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
          issuedAt: lic.issuedAt,
          validUntil: lic.validUntil,
          status: lic.status,
        })),
      },
    });

    // Sanitize reference for use in a Content-Disposition filename
    const safeRef = operation.reference.replace(/[^A-Z0-9_-]/gi, "-");

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="bafa-elan-k2-${safeRef}.xml"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error("GET /api/trade/operations/[id]/bafa-xml failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
