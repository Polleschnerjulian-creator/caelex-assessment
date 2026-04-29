/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/pharos/briefing/preview?authorityProfileId=<id>
 *
 * Renders the daily briefing email in HTML for in-browser preview.
 * Authority members can see what their team will receive at 06:00 UTC.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateBriefing } from "@/lib/pharos/daily-briefing";
import { renderBriefingHtml } from "@/lib/pharos/briefing-email-renderer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true },
  });
  const orgIds = memberships.map((m) => m.organizationId);
  const profiles = await prisma.authorityProfile.findMany({
    where: { organizationId: { in: orgIds } },
    include: { organization: { select: { name: true } } },
  });
  if (profiles.length === 0) {
    return NextResponse.json(
      { error: "No authority membership" },
      { status: 403 },
    );
  }

  const requested = request.nextUrl.searchParams.get("authorityProfileId");
  const target = requested
    ? profiles.find((p) => p.id === requested)
    : profiles[0];
  if (!target) {
    return NextResponse.json(
      { error: "authority not accessible" },
      { status: 403 },
    );
  }

  try {
    const briefing = await generateBriefing(target.id);
    const html = renderBriefingHtml({
      authorityName: target.organization.name,
      authorityType: target.authorityType,
      briefing,
    });
    return new NextResponse(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-briefing-preview] failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
