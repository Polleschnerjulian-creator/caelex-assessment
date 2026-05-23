/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/customs/atlas-de?operationId=<id>
 *
 * Z14a — ATLAS-DE customs-filing payload export.
 *
 * Returns an application/xml stream containing the ATLAS Ausfuhranmeldung
 * IE515 payload generated from the supplied TradeOperation. The client
 * downloads as `atlas-ausfuhranmeldung-<reference>.xml`.
 *
 * Server-side generation chosen over client-side serialization to:
 *
 *   - Keep the XML builder out of the route-bundle for users who never
 *     click the button.
 *   - Re-use the existing org-scoped DAL pattern that the BAFA endpoint
 *     (Z5c) already proves out.
 *
 * Authorization: same as GET /api/trade/operations/[id] — org-member
 * with read access to the operation.
 *
 * Rate limit: `export` tier (20/hr). XML generation is cheap; we cap
 * because the eventual ATLAS upload is what we're protecting.
 *
 * NOTE: This endpoint generates the filing PAYLOAD only. Actual SOAP /
 * AS4-EDIFACT submission to GZD is a separate future sprint.
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
import { buildAtlasXml } from "@/lib/trade/customs-filing/atlas-de";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const rl = await checkRateLimit("export", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    const org = await getCurrentOrganization(userId);
    if (!org) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

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
      where: { id: operationId, organizationId: org.organizationId },
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
            vatNumber: true,
          },
        },
        lines: {
          include: {
            item: {
              select: {
                name: true,
                description: true,
                countryOfOrigin: true,
                eccnEU: true,
                eccnUS: true,
                germanAlEntry: true,
              },
            },
            appliedLicense: {
              select: {
                licenseType: true,
                licenseNumber: true,
                validUntil: true,
              },
            },
          },
        },
        licenses: {
          select: {
            licenseType: true,
            licenseNumber: true,
            validUntil: true,
          },
        },
      },
    });

    if (!operation) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const xml = buildAtlasXml({
      generatedAt: new Date(),
      exporter: {
        legalName: operation.organization?.name ?? "(Organisation unknown)",
        addressCountry: "DE",
      },
      operation: {
        id: operation.id,
        reference: operation.reference,
        description: operation.description,
        operationType: operation.operationType,
        shipFromCountry: operation.shipFromCountry,
        shipToCountry: operation.shipToCountry,
        endUseCountry: operation.endUseCountry,
        scheduledShipDate: operation.scheduledShipDate,
        createdAt: operation.createdAt,
        previousDocuments: [],
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
          validUntil: lic.validUntil,
        })),
      },
    });

    // Sanitize reference for the Content-Disposition filename.
    const safeRef = operation.reference.replace(/[^A-Z0-9_-]/gi, "-");

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="atlas-ausfuhranmeldung-${safeRef}.xml"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error("GET /api/trade/customs/atlas-de failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
