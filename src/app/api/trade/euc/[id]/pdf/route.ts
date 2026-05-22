/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/euc/[id]/pdf — render the EUC as an
 * EU Reg. 2021/821 Annex IIIa-compliant PDF and stream it as a
 * download. Read-only; the EUC row is NOT mutated by this call.
 *
 * Sprint Z6 (Tier 5).
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
import { isSuperAdmin } from "@/lib/super-admin";
import {
  buildAnnexIIIaDocument,
  adaptEUCForAnnex,
} from "@/lib/trade/euc/annex-iiia-template";
import { renderAnnexIIIaPdf } from "@/lib/trade/euc/annex-iiia-pdf";

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

    // Resolve org. Super-admins may impersonate any active org.
    let organizationId: string | null = null;
    let organizationName: string | null = null;
    if (isSuperAdmin(session.user.email)) {
      const anyOrg = await prisma.organization.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });
      organizationId = anyOrg?.id ?? null;
      organizationName = anyOrg?.name ?? null;
    } else {
      const ctx = await getCurrentOrganization(userId);
      if (ctx) {
        organizationId = ctx.organizationId;
        organizationName = ctx.organization.name;
      }
    }

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    // Org-scope the fetch so we never leak cross-org EUC existence.
    const euc = await prisma.tradeEUCRequest.findFirst({
      where: { id, organizationId },
      include: {
        party: {
          select: {
            legalName: true,
            tradeName: true,
            countryCode: true,
            addressLines: true,
          },
        },
        operation: {
          select: {
            reference: true,
            description: true,
            shipToCountry: true,
            endUseCountry: true,
            declaredEndUse: true,
            endUserName: true,
            endUserSector: true,
            lines: {
              select: {
                quantity: true,
                item: {
                  select: {
                    name: true,
                    internalSku: true,
                    description: true,
                    eccnEU: true,
                    eccnUS: true,
                    usmlCategory: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!euc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const input = adaptEUCForAnnex({
      euc,
      party: euc.party,
      operation: euc.operation,
      exporterOrgName: organizationName ?? "Caelex Trade Customer",
    });
    const document = buildAnnexIIIaDocument(input);
    const buffer = renderAnnexIIIaPdf(document);

    const filename = `euc-${euc.id}-annex-iiia.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        // EUC content is sensitive — never cache at any layer.
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    logger.error("GET /api/trade/euc/[id]/pdf failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
