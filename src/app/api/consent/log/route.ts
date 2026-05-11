/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/consent/log — record a cookie/processing consent decision.
 *
 * Compliance-Audit 2026-05 closes the DSGVO Art. 7 Abs. 1 Nachweispflicht
 * gap. Every decision the user makes in the cookie banner is persisted
 * server-side as an append-only ConsentRecord row, with hashed
 * session-key + hashed IP + optional userId so the operator can
 * demonstrate consent in case of a BlnBDI inspection.
 *
 * Anonymous calls (banner fires before sign-in) are accepted — that's
 * the whole point of the sessionHashed key.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { hashSession, hashIp, hashUserAgent } from "@/lib/consent-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  consentVersion: z.string().min(1).max(64),
  sessionKey: z.string().min(8).max(128),
  decision: z.enum(["accept_all", "decline", "customize", "revoke"]),
  preferences: z.object({
    necessary: z.boolean(),
    analytics: z.boolean(),
    performance: z.boolean(),
    errorTracking: z.boolean(),
  }),
  surface: z.string().max(64).optional(),
  path: z.string().max(256).optional(),
});

/** Trim a path of any query/fragment so we don't accidentally
 *  persist sensitive query params via the consent log. */
function sanitisePath(rawPath: string | undefined): string | undefined {
  if (!rawPath) return undefined;
  const noQuery = rawPath.split("?")[0]?.split("#")[0];
  return noQuery?.slice(0, 256);
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ??
    ""
  );
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Bad request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const sessionHashed = hashSession(parsed.data.sessionKey);
  const ipHashed = hashIp(getClientIp(req));
  const userAgentHashed = hashUserAgent(req.headers.get("user-agent"));

  try {
    await prisma.consentRecord.create({
      data: {
        consentVersion: parsed.data.consentVersion,
        sessionHashed,
        ipHashed: ipHashed || null,
        userAgentHashed,
        userId,
        decision: parsed.data.decision,
        preferences: parsed.data.preferences,
        surface: parsed.data.surface ?? null,
        path: sanitisePath(parsed.data.path) ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    /* Don't surface DB errors to the client — they're noise on the
       cookie banner. Log server-side and return 200 anyway so the UX
       doesn't loop on consent re-prompt. The localStorage record is
       the user-side proof; the DB record is the server-side proof. */
    logger.error("[consent/log] failed to persist", { error: msg });
    return NextResponse.json({ ok: false, persisted: false });
  }
}
