/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/organizations/search?q=…
 *
 * Phase AB-2 — typeahead for the InvitePanel counterparty picker.
 * Lawyer types client name; we surface up to 8 operator organisations
 * matching the substring. Caller MUST be a LAW_FIRM (or BOTH) org —
 * this is an Atlas-side endpoint, operators don't search other operators.
 *
 * Why a dedicated endpoint instead of reusing Claude's
 * `find_operator_organization` tool: that tool is owned by the
 * AI loop, has rate limits geared to LLM call patterns, and emits
 * tool-use events. Direct API → typeahead is just plain DB lookup +
 * standard auth, no LLM round-trip, no event noise.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* AUDIT-FIX C1: Tighten min-length to 2 (was already 2 but reaffirmed
   alongside the auth/scope hardening). 0/1-char queries are a classic
   enumeration vector — at 2 chars + insensitive contains, an attacker
   would need to brute-force 26²=676 combinations to surface the full
   table; combined with rate-limit + orgType filter that's no longer
   meaningfully exploitable. */
const QuerySchema = z.object({
  q: z.string().trim().min(2).max(100),
});

const RESULT_LIMIT = 8;

export async function GET(request: NextRequest) {
  try {
    /* AUDIT-FIX C1: This route previously used raw auth() + no orgType
       filter, enabling cross-tenant org-enumeration (any logged-in
       Caelex user could probe the full LAW_FIRM customer book via
       2-char prefix queries). Now: getAtlasAuth() requires LAW_FIRM
       (or BOTH) membership and isActive org, the orgType filter on
       the result-set scopes to legitimate invite candidates only
       (OPERATOR + BOTH — the orgs lawyers actually onboard), and
       the rate-limit caps abuse. The previous "schema drift" excuse
       for removing the orgType filter is moot — getAtlasAuth itself
       relies on the orgType column working, so if that's broken the
       endpoint would 401 anyway, not silently leak. */
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(request, atlas.userId),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const url = new URL(request.url);
    const parsed = QuerySchema.safeParse({ q: url.searchParams.get("q") });
    if (!parsed.success) {
      return NextResponse.json({ organizations: [] });
    }

    const { q } = parsed.data;

    /* Authz scope:
       - Exclude the caller's own org (prevents self-invite).
       - orgType ∈ {OPERATOR, BOTH} — these are the orgs lawyers can
         legitimately invite as clients. LAW_FIRM and AUTHORITY orgs
         are deliberately excluded (a law firm has no business
         "inviting" another law firm or a regulator via this picker).
       - isActive: true — never surface deactivated tenants. */
    const orgs = await prisma.organization.findMany({
      where: {
        AND: [
          { id: { not: atlas.organizationId } },
          { isActive: true },
          { orgType: { in: ["OPERATOR", "BOTH"] } },
          { name: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, slug: true, logoUrl: true },
      orderBy: { name: "asc" },
      take: RESULT_LIMIT,
    });

    return NextResponse.json({ organizations: orgs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Atlas org-search failed: ${msg}`);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
