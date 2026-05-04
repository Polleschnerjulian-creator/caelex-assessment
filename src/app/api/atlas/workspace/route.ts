/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * POST /api/atlas/workspace
 *
 * Atlas-AI-Mode 5. Quick-Action ⌘5: Erstellt einen leeren STANDALONE
 * Matter (ohne Mandant, ohne Scope, ohne Handshake) und gibt die
 * matterId zurück. Client navigiert anschließend zu
 * /atlas/network/{matterId}/workspace.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAtlasAuth } from "@/lib/atlas-auth";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";
import {
  createStandaloneMatter,
  MatterServiceError,
} from "@/lib/legal-network/matter-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  name: z.string().min(2).max(120).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // H-1: getAtlasAuth() enforces the LAW_FIRM/BOTH orgType filter at the
    // membership lookup. The previous fallback to "any active membership"
    // let OPERATOR/AUTHORITY users create LegalMatter rows scoped to their
    // own non-law-firm orgs, which corrupted the matter-tenancy model.
    // Pharos AUTHORITY users belong on /pharos, not on /atlas.
    const atlas = await getAtlasAuth();
    if (!atlas) {
      return NextResponse.json(
        { error: "No active law-firm organisation" },
        { status: 403 },
      );
    }

    const rl = await checkRateLimit(
      "legal_matter_invite",
      getIdentifier(request, atlas.userId),
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterMs: rl.reset - Date.now() },
        { status: 429 },
      );
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const result = await createStandaloneMatter({
      lawFirmOrgId: atlas.organizationId,
      createdBy: atlas.userId,
      name: parsed.data.name,
    });

    return NextResponse.json({ matterId: result.matterId }, { status: 201 });
  } catch (err) {
    if (err instanceof MatterServiceError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`POST /api/atlas/workspace failed: ${msg}`);
    return NextResponse.json(
      { error: "Workspace creation failed" },
      { status: 500 },
    );
  }
}
