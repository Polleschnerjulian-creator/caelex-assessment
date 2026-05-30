/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/trade/vsd/[id]/pdf?jurisdiction=ofac|bis|ddtc — render the
 * voluntary self-disclosure as a jurisdiction-specific PDF and stream it
 * as a download. Read-only; the VSD row is NOT mutated by this call.
 *
 * Caelex Trade — Sprint Z6b-d (Tier 5).
 *
 * Three jurisdictions, one route — the `?jurisdiction=` query string
 * picks the renderer (OFAC § 501.806, BIS § 764.5, DDTC § 127.12).
 * When omitted, the route falls back to the VSD's `authority` enum
 * (OFAC/BIS/DDTC are auto-routed; other authorities return 400).
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
import { getTradeAuth } from "@/lib/trade/trade-auth";
import { isSuperAdmin } from "@/lib/super-admin";
import {
  adaptVsdForBuilder,
  type VsdJurisdiction,
} from "@/lib/trade/vsd-pdf/vsd-shared";
import { renderVsdPdf } from "@/lib/trade/vsd-pdf/vsd-pdf-renderer";
import { buildVsdOfacDocument } from "@/lib/trade/vsd-pdf/vsd-ofac-template";
import { buildVsdBisDocument } from "@/lib/trade/vsd-pdf/vsd-bis-template";
import { buildVsdDdtcDocument } from "@/lib/trade/vsd-pdf/vsd-ddtc-template";
import type { TradeVSDAuthority } from "@prisma/client";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    // Super-admins bypass the TRADE entitlement gate and may impersonate
    // any active org. Normal users go through getTradeAuth().
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let userId: string;
    let organizationId: string | null = null;
    let organizationName: string | null = null;

    if (isSuperAdmin(session.user.email)) {
      userId = session.user.id;
      const anyOrg = await prisma.organization.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });
      organizationId = anyOrg?.id ?? null;
      organizationName = anyOrg?.name ?? null;
    } else {
      const tradeAuth = await getTradeAuth();
      if (!tradeAuth) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      userId = tradeAuth.userId;
      organizationId = tradeAuth.organizationId;
      const org = await prisma.organization.findUnique({
        where: { id: tradeAuth.organizationId },
        select: { name: true },
      });
      organizationName = org?.name ?? null;
    }

    const rl = await checkRateLimit("api", getIdentifier(req, userId));
    if (!rl.success) return createRateLimitResponse(rl);

    if (!organizationId) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    // Org-scope the fetch so we never leak cross-org VSD existence.
    const vsd = await prisma.tradeVoluntaryDisclosure.findFirst({
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
          },
        },
        item: {
          select: {
            name: true,
            internalSku: true,
            eccnEU: true,
            eccnUS: true,
            usmlCategory: true,
          },
        },
      },
    });

    if (!vsd) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Pick the jurisdiction. ?jurisdiction= wins, otherwise fall back
    // to the VSD's authority enum.
    const url = new URL(req.url);
    const qsJurisdiction = url.searchParams.get("jurisdiction");
    const jurisdiction = resolveJurisdiction(qsJurisdiction, vsd.authority);
    if (!jurisdiction) {
      return NextResponse.json(
        {
          error:
            "Unsupported jurisdiction. Use ?jurisdiction=ofac|bis|ddtc or " +
            "set the VSD authority to OFAC, BIS, or DDTC.",
        },
        { status: 400 },
      );
    }

    const input = adaptVsdForBuilder({
      vsd,
      party: vsd.party,
      operation: vsd.operation,
      item: vsd.item,
      filerOrgName: organizationName ?? "Caelex Trade Customer",
    });

    const document =
      jurisdiction === "ofac"
        ? buildVsdOfacDocument(input)
        : jurisdiction === "bis"
          ? buildVsdBisDocument(input)
          : buildVsdDdtcDocument(input);
    const buffer = renderVsdPdf(document);

    const filename = `vsd-${vsd.id}-${jurisdiction}.pdf`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
        // VSD content is privileged compliance work-product — never
        // cache at any layer.
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (err) {
    logger.error("GET /api/trade/vsd/[id]/pdf failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Resolve a VSD jurisdiction from the query string or fall back to
 * the VSD's authority enum. Returns null when neither yields one of
 * the three supported renderers.
 */
function resolveJurisdiction(
  qsJurisdiction: string | null,
  authority: TradeVSDAuthority,
): VsdJurisdiction | null {
  if (qsJurisdiction) {
    const normalised = qsJurisdiction.toLowerCase();
    if (
      normalised === "ofac" ||
      normalised === "bis" ||
      normalised === "ddtc"
    ) {
      return normalised;
    }
    return null;
  }
  switch (authority) {
    case "OFAC":
      return "ofac";
    case "BIS":
      return "bis";
    case "DDTC":
      return "ddtc";
    default:
      return null;
  }
}
