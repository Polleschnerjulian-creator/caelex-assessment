/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * POST /api/pharos/astra/chat
 *
 * Pharos-Astra Chat-Endpoint für Behörden-User. Stateless: Client
 * sendet Verlauf + neue Nachricht, Server returnt Antwort + Tool-
 * Call-Trace. Auth-gated auf AUTHORITY-Org mit aktivem Profil.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import { runPharosAstra } from "@/lib/pharos/astra-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ChatBody = z.object({
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate-limit through the existing astra_chat tier — same budget as
    // operator-side Astra (60/hr) since the calling pattern is similar.
    const rl = await checkRateLimit(
      "astra_chat",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    // Auth: caller must belong to an AUTHORITY org with an
    // AuthorityProfile.
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
    if (membership.organization.orgType !== "AUTHORITY") {
      return NextResponse.json(
        { error: "Pharos-Astra is only available to AUTHORITY orgs" },
        { status: 403 },
      );
    }
    const profile = await prisma.authorityProfile.findUnique({
      where: { organizationId: membership.organizationId },
      select: { id: true },
    });
    if (!profile) {
      return NextResponse.json(
        {
          error: "Authority profile not configured",
          code: "AUTHORITY_NOT_CONFIGURED",
        },
        { status: 403 },
      );
    }

    const raw = await request.json().catch(() => null);
    const parsed = ChatBody.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await runPharosAstra({
      authorityProfileId: profile.id,
      history: parsed.data.history ?? [],
      userMessage: parsed.data.message,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Antwort fehlgeschlagen" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      reply: result.reply,
      toolCalls: result.toolCalls,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Pharos-Astra chat POST failed: ${msg}`);
    return NextResponse.json(
      { error: "Pharos-Astra is currently unavailable" },
      { status: 500 },
    );
  }
}
