/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 *   GET /api/atlas/workspaces/templates
 *
 * Returns the list of available workspace templates as
 * id+title+description+cardCount summaries. Card content stays
 * server-side (templates can grow large; the client picker doesn't
 * need it).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { listTemplateSummaries } from "@/data/atlas-workspace-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    // Authentication-only check — templates are firm-grade material
    // so we don't expose them to anonymous traffic, but no rate-limit
    // because the list is tiny and rarely fetched.
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ templates: listTemplateSummaries() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`GET /api/atlas/workspaces/templates failed: ${msg}`);
    return NextResponse.json(
      { error: "Failed to load templates" },
      { status: 500 },
    );
  }
}
