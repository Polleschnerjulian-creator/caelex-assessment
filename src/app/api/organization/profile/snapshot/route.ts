/**
 * Freeze & Sign endpoint.
 *
 * POST /api/organization/profile/snapshot
 *   Body: { purpose?: "audit" | "dd" | "nca" | "voluntary" }
 *   Response: { id, snapshotHash, frozenAt, issuerKeyId, verifyUrl }
 *
 * Rate-limited via `sensitive` tier (5/hr) — freezing is expensive
 * (fetches profile + traces + issuer-key decrypt + signs) and it's
 * rarely necessary to freeze more than a few times an hour.
 *
 * GET /api/organization/profile/snapshot
 *   Returns the last 20 snapshots for the org — newest first.
 *   Used by the UI to show "Last signed: <date>".
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  freezeProfileSnapshot,
  listProfileSnapshots,
} from "@/lib/services/profile-snapshot-service";

const freezeBodySchema = z.object({
  purpose: z.enum(["audit", "dd", "nca", "voluntary"]).optional(),
});

async function getSessionAndOrg() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    orderBy: { joinedAt: "desc" },
    include: {
      organization: { select: { id: true, isActive: true } },
    },
  });
  if (!membership?.organization?.isActive) {
    return {
      error: NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      ),
    };
  }
  return {
    userId: session.user.id,
    organizationId: membership.organization.id,
  };
}

// ─── POST (freeze) ───

export async function POST(request: NextRequest) {
  try {
    const rl = await checkRateLimit("sensitive", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const session = await getSessionAndOrg();
    if ("error" in session) return session.error;

    const body = await request.json().catch(() => ({}));
    const parsed = freezeBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const snapshot = await freezeProfileSnapshot({
      organizationId: session.organizationId,
      userId: session.userId,
      purpose: parsed.data.purpose,
    });

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
      request.nextUrl.origin;

    return NextResponse.json({
      id: snapshot.id,
      snapshotHash: snapshot.snapshotHash,
      frozenAt: snapshot.frozenAt.toISOString(),
      issuerKeyId: snapshot.issuerKeyId,
      // Human-facing verification page — what an operator links to
      // when sharing proof with a regulator or auditor.
      verifyUrl: `${origin}/verity/profile-snapshot/${snapshot.id}`,
      // Machine-facing JSON endpoint — returns the same snapshot + a
      // structured verification report. Use this for scripts / bots.
      verifyApiUrl: `${origin}/api/v1/verity/profile-snapshot/${snapshot.id}`,
    });
  } catch (err) {
    logger.error("Error freezing profile snapshot", err);
    const message =
      err instanceof Error && err.message.startsWith("No OperatorProfile")
        ? err.message
        : "Internal server error";
    const status =
      err instanceof Error && err.message.startsWith("No OperatorProfile")
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

// ─── GET (list) ───

export async function GET(request: NextRequest) {
  try {
    const rl = await checkRateLimit("api", getIdentifier(request));
    if (!rl.success) return createRateLimitResponse(rl);

    const session = await getSessionAndOrg();
    if ("error" in session) return session.error;

    const rows = await listProfileSnapshots(session.organizationId, 20);

    return NextResponse.json({
      snapshots: rows.map((r) => ({
        id: r.id,
        snapshotHash: r.snapshotHash,
        issuerKeyId: r.issuerKeyId,
        frozenAt: r.frozenAt.toISOString(),
        frozenBy: r.frozenBy,
        purpose: r.purpose,
      })),
    });
  } catch (err) {
    logger.error("Error listing profile snapshots", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
