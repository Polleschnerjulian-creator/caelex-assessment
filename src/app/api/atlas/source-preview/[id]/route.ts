/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * GET /api/atlas/source-preview/[id]
 *
 * Lightweight projection of a single Atlas legal-source for the
 * citation-pill hover-preview. Returns ONLY the fields the tooltip
 * needs (title, scope_description, jurisdiction, type, status) so the
 * payload stays tiny and the response is HTTP-cacheable for an hour.
 *
 * Auth: requires the user to be inside an Atlas org (getAtlasAuth).
 * Same scope as the rest of /api/atlas/* — non-Atlas Caelex users
 * shouldn't be hitting Atlas pages anyway, and the data being
 * returned is reference catalogue (not user-scoped), so we choose
 * gating-by-org over public exposure.
 *
 * Rate-limited via the api tier — read-only but tooltip hovers can
 * fire dozens of requests on a single chat bubble; client caches in
 * a Map so this won't hammer the endpoint after the first hover.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getLegalSourceById } from "@/data/legal-sources";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PATTERN = /^[A-Z0-9][A-Za-z0-9-]+$/;

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

  const source = getLegalSourceById(rawId);
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      title: source.title_en,
      scope_description: source.scope_description ?? "(no scope description)",
      jurisdiction: source.jurisdiction,
      type: source.type,
      status: source.status,
    },
    {
      headers: {
        // Tooltip-grade cache: refresh hourly, serve stale up to 24h
        // while revalidating. The catalogue rarely changes mid-session.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
