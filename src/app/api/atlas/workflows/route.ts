/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * GET /api/atlas/workflows — list all curated workflows.
 *
 * Read-only, auth-gated. Filterable by ?category= or ?quickstartsOnly=1.
 *
 * Atlas V3 T1.E enhancement (2026-05-26): each workflow returned now
 * includes pipeline-derived metadata for the picker UI:
 *   - stepCount: number of steps in the pipeline (undefined for
 *     single-prompt workflows)
 *   - estimatedDurationMs: sum of every step's expected-tool
 *     durations from the tool-metadata sidecar
 *   - requiresApproval: true iff any step uses an approval-required
 *     tool (T1.E.26 gate — the UI badges "consent required" so the
 *     lawyer knows what they're starting)
 *
 * Backwards-compatible: existing fields preserved verbatim, new
 * fields are additions.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAtlasAuth } from "@/lib/atlas-auth";
import {
  listWorkflows,
  listCategories,
  type WorkflowCategory,
  type Workflow,
} from "@/lib/atlas/workflow-library";
import { aggregateToolCalls, getToolMetadata } from "@/lib/atlas/tool-metadata";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PipelineEnrichment {
  stepCount?: number;
  estimatedDurationMs?: number;
  requiresApproval?: boolean;
}

function enrichWorkflow(w: Workflow): Workflow & PipelineEnrichment {
  if (!w.pipeline || w.pipeline.length === 0) {
    /* Single-prompt workflow — no pipeline metadata to compute. */
    return w;
  }
  const allTools: string[] = [];
  let needsApproval = false;
  for (const step of w.pipeline) {
    const tools = step.expectedTools ?? [];
    allTools.push(...tools);
    for (const t of tools) {
      const meta = getToolMetadata(t);
      if (meta?.requiresApproval) needsApproval = true;
    }
  }
  const agg = aggregateToolCalls(allTools);
  return {
    ...w,
    stepCount: w.pipeline.length,
    estimatedDurationMs: agg.estimatedDurationMs,
    requiresApproval: needsApproval,
  };
}

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
    }).map(enrichWorkflow);
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
