/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/pharos/briefing
 *
 * On-demand briefing für die Behörden des callenden Users.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { generateBriefing } from "@/lib/pharos/daily-briefing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
      select: { id: true },
    });
    if (profiles.length === 0) {
      return NextResponse.json({ briefings: [] });
    }
    const briefings = await Promise.all(
      profiles.map((p) => generateBriefing(p.id)),
    );
    return NextResponse.json({ briefings });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-briefing] failed: ${msg}`);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
