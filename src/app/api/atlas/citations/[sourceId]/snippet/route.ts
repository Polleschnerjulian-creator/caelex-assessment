/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — GET /api/atlas/citations/[sourceId]/snippet
 *
 * Returns metadata + a short text snippet for a citation source-id,
 * used by the hover-preview tooltip in chat / agent / mandate-detail
 * surfaces. Failure-soft: 404 when source-id can't be resolved.
 *
 * Snippet priority order (mirrors source-preview/[id] strategy):
 *   1. scope_description — purpose-built summary of what the act covers
 *   2. First key_provision.paragraph_text — verbatim statutory text
 *   3. First key_provision.summary — Caelex-curated summary
 *   4. "" — empty string; the UI handles no-snippet gracefully
 *
 * Auth: requires Atlas auth (any logged-in lawyer). No mandate-scope
 * — citations are global legal sources, not mandate-specific.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import {
  resolveSourceId,
  checkValidity,
} from "@/lib/atlas/validity-tools.server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SNIPPET_MAX_CHARS = 600;

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ sourceId: string }> },
) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit("api", getIdentifier(req, atlas.userId));
  if (!rl.success) return createRateLimitResponse(rl);

  const { sourceId: raw } = await ctx.params;

  /* Defense: decode + cap + reject path-traversal chars. The
     validity-tools regex already enforces shape but defense in depth. */
  const sourceId = decodeURIComponent(raw).slice(0, 200);
  if (/[/\\]{2,}|[<>"'`]/.test(sourceId)) {
    return NextResponse.json({ error: "Invalid sourceId" }, { status: 400 });
  }

  /* Use existing helper. Falls back to parent-source (strips -§ / -Art.
     suffix) when direct hit misses — matches the chat-engine citation
     resolution path. */
  const { sourceId: resolvedId, source } = resolveSourceId(sourceId);
  if (!source) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  /* Compose snippet.
     Priority 1: scope_description — written for exactly this use case.
     Priority 2: first key_provision paragraph_text — verbatim statutory text.
     Priority 3: first key_provision summary — Caelex-curated paraphrase.
     Empty string is a valid result — the UI renders no-snippet state. */
  const firstProvision = source.key_provisions?.[0];
  const snippetRaw =
    source.scope_description ||
    firstProvision?.paragraph_text ||
    firstProvision?.summary ||
    "";
  const snippet = snippetRaw.slice(0, SNIPPET_MAX_CHARS);

  /* Reuse the validity-check so the badge in the popover matches the
     same logic as inline-pill badges (in_force / amended / repealed
     / needs_review / pending / unknown). */
  const validity = checkValidity(resolvedId);

  logger.info("[atlas/citations/snippet] resolved", {
    userId: atlas.userId,
    sourceId: resolvedId,
    hasSnippet: snippet.length > 0,
  });

  return NextResponse.json(
    {
      sourceId: resolvedId,
      title: validity.title ?? source.title_en ?? "Unbekannte Quelle",
      status: validity.status ?? "unknown",
      badge: validity.badge,
      lastVerified: validity.lastVerified,
      sourceUrl: validity.sourceUrl ?? source.source_url ?? null,
      snippet,
    },
    {
      headers: {
        // Tooltip-grade cache: refresh hourly, serve stale up to 24h.
        // Citation metadata rarely changes mid-session.
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
