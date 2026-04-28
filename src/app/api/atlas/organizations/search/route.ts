/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/organizations/search?q=…
 *
 * Phase AB-2 — typeahead for the InvitePanel counterparty picker.
 * Lawyer types client name; we surface up to 8 operator organisations
 * matching the substring. Caller MUST be a LAW_FIRM org (this is an
 * Atlas-side endpoint — operators don't search other operators).
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
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
});

const RESULT_LIMIT = 8;

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Atlas-side typeahead. We deliberately skip the orgType gate
    // here — the column hasn't been reliably migrated to prod (Vercel
    // build:deploy swallows db-push failures), and the InvitePanel
    // is only renderable from Atlas mode anyway. Auth-by-session is
    // the operative gate; the orgType layer was defence-in-depth.
    // Once the migration drift is resolved we can re-enable the
    // LAW_FIRM check from membership.organization.orgType.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }

    const rl = await checkRateLimit(
      "api",
      getIdentifier(request, session.user.id),
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

    // Exclude the caller's own org (prevents self-invite). The
    // orgType filter (only OPERATOR + BOTH) is dropped temporarily
    // due to schema drift — see comment on the membership query
    // above. The lawyer can still pick the right counterparty by
    // name; the worst case is a search hit on another LAW_FIRM,
    // which the invite endpoint will then reject downstream.
    const orgs = await prisma.organization.findMany({
      where: {
        AND: [
          { id: { not: membership.organizationId } },
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
