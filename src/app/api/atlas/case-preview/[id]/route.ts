/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/case-preview/[id]
 *
 * Lightweight projection of a single Atlas case for the citation-pill
 * hover-preview, parallel to /api/atlas/source-preview/[id]. Returns
 * only the fields the tooltip needs (title, jurisdiction, forum,
 * date_decided, ruling-summary excerpt) so the payload stays tiny and
 * the response is HTTP-cacheable for an hour.
 *
 * Auth: requires getAtlasAuth (org-scoped). Case-law data is
 * reference content, not user-scoped — gating by org keeps the surface
 * consistent with the rest of /api/atlas/*.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCaseById } from "@/data/legal-cases";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PATTERN = /^CASE-[A-Z0-9-]+$/;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("api", getIdentifier(request, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const { id: rawId } = await context.params;
  if (!ID_PATTERN.test(rawId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const c = getCaseById(rawId);
  if (!c) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: c.id,
      jurisdiction: c.jurisdiction,
      forum: c.forum,
      title: c.title,
      date_decided: c.date_decided,
      plaintiff: c.plaintiff,
      defendant: c.defendant,
      ruling_summary:
        c.ruling_summary.length > 320
          ? c.ruling_summary.slice(0, 317) + "…"
          : c.ruling_summary,
      precedential_weight: c.precedential_weight,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
