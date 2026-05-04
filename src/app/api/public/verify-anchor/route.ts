/**
 * POST /api/public/verify-anchor — Sprint 8C
 *
 * Public endpoint that lets anyone (regulator, investor, journalist,
 * curious party) submit an audit-anchor SHA-256 and retrieve the
 * OpenTimestamps proof bytes Caelex stored for it. The caller can
 * then independently verify the proof against Bitcoin using any
 * OpenTimestamps client — Caelex does not need to be trusted for
 * the cryptographic math.
 *
 * # The capability model
 *
 * The anchor hash is a SHA-256 of an audit-log entry hash; it's
 * effectively a capability-bearer token. Knowing one means either
 * you computed it from the operator's own audit trail or the
 * operator handed it to you (e.g. in a regulatory submission).
 * Looking it up here doesn't leak anything new — it confirms the
 * proof we *already committed to* on Bitcoin's blockchain.
 *
 * # What we DO expose
 *
 *   - anchorHash, status, submittedAt, upgradedAt
 *   - calendarUrl (which OpenTimestamps calendar attested it)
 *   - proof bytes as base64 (the regulator runs `ots verify` offline)
 *
 * # What we DON'T expose
 *
 *   - organizationId — correlation across anchors could de-anonymise
 *     operators. The verification doesn't need it; the proof binds
 *     to the digest, not to who owns it.
 *   - errorMessage on FAILED rows — internal diagnostic noise.
 *
 * # Why we don't run Bitcoin-block verification server-side
 *
 *   - Would require either a Bitcoin node (heavy) or a trusted
 *     blockchain-data API (re-introduces a trust point).
 *   - The regulator's whole point is *not* trusting Caelex — they
 *     should run the verifier themselves on the proof bytes.
 *   - OpenTimestamps client (`pip install opentimestamps-client`)
 *     does it offline against any Bitcoin RPC.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  applyCorsHeaders,
  handleCorsPreflightResponse,
} from "@/lib/cors.server";
import {
  checkRateLimit,
  createRateLimitResponse,
  getIdentifier,
} from "@/lib/ratelimit";

export const runtime = "nodejs";
export const maxDuration = 30;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const auditTimestampAnchor = (prisma as any).auditTimestampAnchor;

const VerifyRequestSchema = z.object({
  anchorHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "anchorHash must be a 64-character hex SHA-256")
    .transform((s) => s.toLowerCase()),
});

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreflightResponse(request.headers.get("origin"), "*");
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");

  // Rate-limit on public_api tier (5/hr). The lookup is cheap but
  // we don't want this endpoint scraped for proofs across the hash
  // space.
  const identifier = getIdentifier(request);
  const rateLimit = await checkRateLimit("public_api", identifier);
  if (!rateLimit.success) {
    return applyCorsHeaders(createRateLimitResponse(rateLimit), origin, "*");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return applyCorsHeaders(
      NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
      origin,
      "*",
    );
  }
  const parsed = VerifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return applyCorsHeaders(
      NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
          })),
        },
        { status: 400 },
      ),
      origin,
      "*",
    );
  }

  const { anchorHash } = parsed.data;

  try {
    // Pull every anchor row that committed this digest. Multiple
    // calendars submitted in parallel = multiple rows; the verifier
    // can pick whichever proof they trust.
    const rows = (await auditTimestampAnchor.findMany({
      where: { anchorHash },
      select: {
        id: true,
        anchorHash: true,
        status: true,
        calendarUrl: true,
        otsProof: true,
        submittedAt: true,
        upgradedAt: true,
        blockHeight: true,
      },
      orderBy: { submittedAt: "asc" },
      take: 10,
    })) as Array<{
      id: string;
      anchorHash: string;
      status: string;
      calendarUrl: string;
      otsProof: Buffer;
      submittedAt: Date;
      upgradedAt: Date | null;
      blockHeight: number | null;
    }>;

    if (rows.length === 0) {
      return applyCorsHeaders(
        NextResponse.json(
          {
            found: false,
            anchorHash,
          },
          { status: 200 },
        ),
        origin,
        "*",
      );
    }

    // Hide FAILED rows from the public response — they're internal
    // diagnostic noise. If ALL rows are FAILED, treat as not-found.
    const surfaced = rows.filter((r) => r.status !== "FAILED");
    if (surfaced.length === 0) {
      return applyCorsHeaders(
        NextResponse.json(
          {
            found: false,
            anchorHash,
          },
          { status: 200 },
        ),
        origin,
        "*",
      );
    }

    return applyCorsHeaders(
      NextResponse.json(
        {
          found: true,
          anchorHash,
          anchors: surfaced.map((r) => ({
            status: r.status, // "PENDING" | "UPGRADED"
            calendarUrl: r.calendarUrl,
            submittedAt: r.submittedAt.toISOString(),
            upgradedAt: r.upgradedAt ? r.upgradedAt.toISOString() : null,
            blockHeight: r.blockHeight,
            proofBase64: r.otsProof.toString("base64"),
            proofBytes: r.otsProof.length,
          })),
        },
        { status: 200 },
      ),
      origin,
      "*",
    );
  } catch (err) {
    logger.error("[verify-anchor] lookup failed", err);
    return applyCorsHeaders(
      NextResponse.json({ error: "Internal lookup error" }, { status: 500 }),
      origin,
      "*",
    );
  }
}
