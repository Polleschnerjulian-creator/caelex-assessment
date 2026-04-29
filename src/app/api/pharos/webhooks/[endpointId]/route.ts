/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/pharos/webhooks/[endpointId]
 *
 * Public-but-HMAC-verified webhook receiver. External (non-Caelex)
 * operators report NIS2/Compliance-events here.
 *
 * Required headers:
 *   x-pharos-timestamp:  ISO-8601 UTC, ±5min window
 *   x-pharos-nonce:      unique-per-request (uuid recommended)
 *   x-pharos-signature:  hex(HMAC-SHA256(rawSecret, timestamp+nonce+sha256(body)))
 *
 * Body MUST be valid JSON with at least { eventType: string }.
 * Allowed event types per endpoint are configured at provisioning time.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { verifyAndProcess } from "@/lib/pharos/webhook-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, x-pharos-timestamp, x-pharos-nonce, x-pharos-signature",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_HEADERS });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ endpointId: string }> },
) {
  try {
    const { endpointId } = await context.params;

    const timestamp = request.headers.get("x-pharos-timestamp") ?? "";
    const nonce = request.headers.get("x-pharos-nonce") ?? "";
    const signature = request.headers.get("x-pharos-signature") ?? "";

    if (!timestamp || !nonce || !signature) {
      return NextResponse.json(
        {
          ok: false,
          status: "REJECTED_MISSING_HEADERS",
          reason:
            "x-pharos-timestamp, x-pharos-nonce, x-pharos-signature are all required",
        },
        { status: 400, headers: PUBLIC_HEADERS },
      );
    }

    const rawBody = await request.text();
    const verdict = await verifyAndProcess({
      endpointId,
      timestamp,
      nonce,
      signature,
      rawBody,
    });

    const status = verdict.ok
      ? 202
      : verdict.status === "REJECTED_NOT_FOUND"
        ? 404
        : verdict.status === "REJECTED_REPLAY"
          ? 409
          : verdict.status === "REJECTED_PAUSED"
            ? 423 // locked
            : verdict.status === "REJECTED_TIMESTAMP" ||
                verdict.status === "REJECTED_SIGNATURE" ||
                verdict.status === "REJECTED_EVENT"
              ? 401
              : 500;

    return NextResponse.json(verdict, { status, headers: PUBLIC_HEADERS });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-webhook-receiver] ${msg}`);
    return NextResponse.json(
      { ok: false, status: "ERROR", reason: msg },
      { status: 500, headers: PUBLIC_HEADERS },
    );
  }
}
