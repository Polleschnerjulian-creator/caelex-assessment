/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 *   GET /api/atlas/organization/dpa  — fetch (or auto-create) the DPA
 *                                       execution record for the active
 *                                       Atlas org. Status only.
 *
 *   GET /api/atlas/organization/dpa?download=cover
 *                                     — stream the cover-PDF.
 *
 * Compliance-Audit 2026-05 closes the AVV-counter-signing gap. The
 * lawyer can pull the cover-PDF, sign it, and return it via a secure
 * channel (signed PDF goes to operator).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  renderDpaCoverPdf,
  computeDpaContentHash,
} from "@/lib/pdf/dpa-cover/render";
import { DPA_TEMPLATE_VERSION } from "@/lib/pdf/dpa-cover/template";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dpaContentHash = await computeDpaContentHash();

    /* Find or create — one row per (org, dpaVersion). Bumping
       DPA_TEMPLATE_VERSION causes a fresh row to be issued the next
       time the org pulls the page. */
    let execution = await prisma.organizationDPAExecution.findUnique({
      where: {
        organizationId_dpaVersion: {
          organizationId: atlas.organizationId,
          dpaVersion: DPA_TEMPLATE_VERSION,
        },
      },
    });
    if (!execution) {
      execution = await prisma.organizationDPAExecution.create({
        data: {
          organizationId: atlas.organizationId,
          dpaVersion: DPA_TEMPLATE_VERSION,
          dpaContentHash,
          status: "PENDING",
        },
      });
    }

    const url = new URL(req.url);
    const wantsDownload = url.searchParams.get("download") === "cover";

    if (!wantsDownload) {
      return NextResponse.json({
        execution: {
          id: execution.id,
          status: execution.status,
          dpaVersion: execution.dpaVersion,
          dpaContentHash: execution.dpaContentHash,
          requestedAt: execution.requestedAt.toISOString(),
          downloadedAt: execution.downloadedAt?.toISOString() ?? null,
          executedAt: execution.executedAt?.toISOString() ?? null,
          customerSignerName: execution.customerSignerName,
          customerSignerRole: execution.customerSignerRole,
        },
      });
    }

    /* Stream the cover-PDF + flip status to DOWNLOADED on first pull. */
    const buffer = await renderDpaCoverPdf({
      recordId: execution.id,
      customerOrgName: atlas.organizationName,
      customerOrgSlug: atlas.organizationSlug,
      customerOrgAddress: null,
      customerSignerName: execution.customerSignerName,
      customerSignerRole: execution.customerSignerRole,
      dpaVersion: execution.dpaVersion,
      dpaContentHash: execution.dpaContentHash,
      generatedAt: new Date(),
    });

    if (execution.status === "PENDING" && !execution.downloadedAt) {
      await prisma.organizationDPAExecution.update({
        where: { id: execution.id },
        data: { status: "DOWNLOADED", downloadedAt: new Date() },
      });
    }

    const safeOrgSlug = atlas.organizationSlug.replace(/[^a-zA-Z0-9]+/g, "_");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="Caelex_AVV_Cover_${safeOrgSlug}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[atlas/organization/dpa] failed", {
      error: msg,
      orgId: atlas.organizationId,
    });
    return NextResponse.json({ error: "DPA fetch failed" }, { status: 500 });
  }
}
