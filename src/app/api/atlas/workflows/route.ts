/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/workflows — list all curated workflows.
 *
 * Read-only, auth-gated. Filterable by ?category= or ?quickstartsOnly=1.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  listWorkflows,
  listCategories,
  type WorkflowCategory,
} from "@/lib/atlas/workflow-library";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const atlas = await getAtlasAuth();
  if (!atlas) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get(
      "category",
    ) as WorkflowCategory | null;
    const quickstartsOnly = url.searchParams.get("quickstartsOnly") === "1";

    const workflows = listWorkflows({
      category: category ?? undefined,
      quickstartsOnly,
    });
    const categories = listCategories();

    return NextResponse.json({
      workflows,
      categories,
      total: workflows.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/workflows] GET failed", {
      userId: atlas.userId,
      error: msg,
    });
    return NextResponse.json(
      { error: "Failed to load workflows" },
      { status: 500 },
    );
  }
}
