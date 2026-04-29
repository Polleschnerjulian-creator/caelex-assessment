/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/pharos/.well-known/keys/[authorityProfileId]
 *
 * Public key directory — RFC 8615 inspired well-known location.
 * Returns the Ed25519 verifying key + metadata of the authority that
 * signs Pharos AI receipts. Allows external verifiers to cross-check
 * the publicKeyBase64 embedded in a receipt against this canonical
 * source — defense-in-depth.
 *
 * Why a separate endpoint? A motivated attacker who controls a single
 * receipt response could embed a forged publicKeyBase64 + matching
 * forged signature. By fetching the key from /.well-known/, the
 * verifier double-anchors trust in (a) the receipt JSON AND (b) the
 * authority profile's canonical key directory. They must agree.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PUBLIC_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, max-age=86400, immutable",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_HEADERS });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ authorityProfileId: string }> },
) {
  try {
    const { authorityProfileId } = await context.params;
    if (!authorityProfileId || authorityProfileId.length < 5) {
      return NextResponse.json(
        { error: "invalid authorityProfileId" },
        { status: 400, headers: PUBLIC_HEADERS },
      );
    }

    const profile = await prisma.authorityProfile.findUnique({
      where: { id: authorityProfileId },
      select: {
        id: true,
        authorityType: true,
        jurisdiction: true,
        publicSigningKey: true,
        organization: { select: { name: true } },
      },
    });

    if (!profile || !profile.publicSigningKey) {
      return NextResponse.json(
        { error: "key not found or not yet provisioned" },
        { status: 404, headers: PUBLIC_HEADERS },
      );
    }

    return NextResponse.json(
      {
        version: "pharos-keys-v1",
        authorityProfileId: profile.id,
        authorityType: profile.authorityType,
        jurisdiction: profile.jurisdiction,
        organizationName: profile.organization.name,
        keys: [
          {
            algorithm: "ed25519",
            publicKeyBase64: profile.publicSigningKey,
            // Future: rotation history, withRevoked, etc. For now one
            // key per authority — derived deterministically from
            // ENCRYPTION_KEY + authorityProfileId.
            status: "active",
            keyDerivation:
              "scrypt(ENCRYPTION_KEY, 'pharos:authority:'+authorityProfileId, N=2^14)",
          },
        ],
      },
      { status: 200, headers: PUBLIC_HEADERS },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[pharos-keys] GET failed: ${msg}`);
    return NextResponse.json(
      { error: "internal error" },
      { status: 500, headers: PUBLIC_HEADERS },
    );
  }
}
