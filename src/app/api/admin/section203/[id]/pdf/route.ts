/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/admin/section203/[id]/pdf
 *
 * Stream the rendered Verpflichtungserklärung PDF for a single
 * commitment row. Renders on-demand from the canonical template
 * (no cached storage required) — the row's data is the source of
 * truth, the PDF is just its presentation.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/atlas-auth";
import { renderSection203Pdf } from "@/lib/pdf/section203/render";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requirePlatformAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const row = await prisma.section203Commitment.findUnique({
      where: { id },
      select: {
        id: true,
        signerName: true,
        role: true,
        signerEmail: true,
        scope: true,
        signedAt: true,
      },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const buffer = await renderSection203Pdf({
      recordId: row.id,
      signerName: row.signerName,
      role: row.role,
      signerEmail: row.signerEmail,
      scope: row.scope,
      signedAt: row.signedAt,
    });

    const safeName = row.signerName.replace(/[^a-zA-Z0-9]+/g, "_");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="Verpflichtungserklaerung_${safeName}_${row.id}.pdf"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error("[admin/section203/pdf] render failed", { error: msg, id });
    return NextResponse.json({ error: "Render failed" }, { status: 500 });
  }
}
