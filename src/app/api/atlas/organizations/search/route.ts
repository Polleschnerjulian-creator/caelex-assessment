/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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

    // Atlas-side typeahead — caller must be a LAW_FIRM. This guards
    // against operator-org users discovering other operators via
    // typeahead, which would be a data-leak vector.
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: {
        organizationId: true,
        organization: { select: { orgType: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    if (!membership) {
      return NextResponse.json({ error: "No active org" }, { status: 403 });
    }
    if (membership.organization.orgType === "OPERATOR") {
      return NextResponse.json(
        { error: "Atlas-only endpoint" },
        { status: 403 },
      );
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

    // Filter to OPERATOR + BOTH (operator-side capable). Exclude the
    // caller's own org so a firm can't accidentally invite themselves.
    const orgs = await prisma.organization.findMany({
      where: {
        AND: [
          { id: { not: membership.organizationId } },
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
