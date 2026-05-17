/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint B2 — Cross-Run-Memory per Mandat.
 * ────────────────────────────────────────────────────────────────────
 * Rolling summary of the mandate's recent agent-runs. Built fire-and-
 * forget after each run completes; pre-pended to the next run's system-
 * prompt so the agent has continuity across sessions on the same
 * mandate.
 *
 * Two public entry-points:
 *
 *   loadMandateMemoryForPrompt(mandateId, organizationId)
 *     Synchronous-style read for the agent route's start-path. Returns
 *     the cached `agentRunMemory` if present, else a cold-start fallback
 *     (last 3 runs as a bullet-list). Null when there are no runs.
 *
 *   updateMandateMemory(mandateId, organizationId)
 *     Fire-and-forget background job. Called from the agent route just
 *     after a successful run completes. Idempotent — skips if the cache
 *     is already current with the most-recent run. Logs failures but
 *     never throws (the caller must NOT await this in a way that blocks
 *     the SSE close).
 *
 * Token budget: cap at 4000 chars (parity with the crossChatSummary
 * pattern already used in AtlasMandate). Summary uses the same
 * buildAnthropicClient() that powers chat / agent / verification — one
 * Atlas-wide LLM access pattern.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import { prisma } from "@/lib/prisma";
import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { logger } from "@/lib/logger";

/* Max characters persisted to AtlasMandate.agentRunMemory. 4000 chars
   ≈ 1000 tokens — fits comfortably in a system-prompt prepend without
   eating into the lawyer's actual conversation budget. */
const MEMORY_CHAR_CAP = 4000;
/* How many of the latest completed runs to feed into the summariser.
   5 is the sweet spot — enough context for continuity, small enough to
   keep input-token cost negligible (~10-15k tokens at typical run size). */
const RUNS_TO_SUMMARISE = 5;
/* Cold-start fallback — when no rolling summary exists yet, the prompt
   instead gets the goals of the last N runs as a bullet-list. */
const COLDSTART_RUNS = 3;
/* Output-token cap for the summariser model. 1500 tokens ≈ 6000 chars
   raw; we slice to MEMORY_CHAR_CAP afterwards so the prompt-prepend
   stays bounded even if the model overshoots. */
const SUMMARISER_MAX_OUTPUT_TOKENS = 1500;
/* Low-but-not-zero temperature — we want consistent summaries across
   re-runs but with enough flexibility to handle varied run shapes. */
const SUMMARISER_TEMPERATURE = 0.3;

interface StepLike {
  toolName: string;
}

interface ArtifactLike {
  kind: string;
  title: string;
}

/* Extract unique tool-names from the persisted steps array. The Json
   column type lets prisma return `unknown`, so guard each entry. */
function extractToolNames(stepsJson: unknown): string[] {
  if (!Array.isArray(stepsJson)) return [];
  const names: string[] = [];
  for (const s of stepsJson) {
    if (
      typeof s === "object" &&
      s !== null &&
      "toolName" in s &&
      typeof (s as Record<string, unknown>).toolName === "string"
    ) {
      names.push((s as StepLike).toolName);
    }
  }
  return Array.from(new Set(names));
}

function extractArtifactSummaries(artifactsJson: unknown): string[] {
  if (!Array.isArray(artifactsJson)) return [];
  const out: string[] = [];
  for (const a of artifactsJson) {
    if (
      typeof a === "object" &&
      a !== null &&
      "kind" in a &&
      "title" in a &&
      typeof (a as Record<string, unknown>).kind === "string" &&
      typeof (a as Record<string, unknown>).title === "string"
    ) {
      const lit = a as ArtifactLike;
      out.push(`${lit.kind}: ${lit.title}`);
    }
  }
  return out;
}

/**
 * Load mandate-scoped memory for injection into the agent system-
 * prompt. Returns:
 *   - the cached `agentRunMemory` when present
 *   - else a cold-start fallback (last 3 run-goals + key artifacts)
 *   - else null when there are no prior runs at all
 *
 * Org-scoped read to enforce tenant isolation.
 */
export async function loadMandateMemoryForPrompt(
  mandateId: string,
  organizationId: string,
): Promise<string | null> {
  try {
    const mandate = await prisma.atlasMandate.findFirst({
      where: { id: mandateId, organizationId },
      select: {
        agentRunMemory: true,
        agentRunMemoryAt: true,
        agentRunMemoryUpToRunId: true,
      },
    });
    if (mandate?.agentRunMemory) {
      /* Cached path — append a freshness hint so the model knows when
         the memory was last refreshed (useful for "ist das noch aktuell?"
         judgement calls). */
      const at = mandate.agentRunMemoryAt
        ? mandate.agentRunMemoryAt.toISOString().slice(0, 10)
        : null;
      return at
        ? `${mandate.agentRunMemory}\n\n_(Memory aktualisiert: ${at})_`
        : mandate.agentRunMemory;
    }

    /* Cold-start fallback: enumerate the last few runs unaggregated.
       Per the tracker acceptance-criterion: "Cold-start (no memory
       yet): fallback to last 3 run-summaries unaggregated". */
    const recentRuns = await prisma.atlasAgentRun.findMany({
      where: { mandateId, organizationId, status: "complete" },
      orderBy: { completedAt: "desc" },
      take: COLDSTART_RUNS,
      select: { goal: true, artifacts: true, completedAt: true },
    });
    if (recentRuns.length === 0) return null;

    const lines = recentRuns.map((r) => {
      const date = r.completedAt
        ? r.completedAt.toISOString().slice(0, 10)
        : "?";
      const arts = extractArtifactSummaries(r.artifacts);
      const artText =
        arts.length > 0 ? ` → ${arts.slice(0, 3).join("; ")}` : "";
      return `- ${date}: ${r.goal.slice(0, 200)}${artText}`;
    });
    return `_(Cold-start: noch keine verdichtete Memory. Letzte ${recentRuns.length} Runs:)_\n${lines.join("\n")}`;
  } catch (err) {
    logger.warn("[atlas/memory] load failed", {
      mandateId,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Fire-and-forget: summarise the mandate's recent agent-runs and
 * persist the rolling summary.
 *
 *   - Idempotent: if `agentRunMemoryUpToRunId` already points at the
 *     most-recent completed run, returns without calling Claude.
 *   - Failure-soft: logs errors, never throws. The caller MUST NOT
 *     await this in a way that would block the SSE response close —
 *     use `void updateMandateMemory(...).catch(...)`.
 */
export async function updateMandateMemory(
  mandateId: string,
  organizationId: string,
): Promise<void> {
  try {
    const mandate = await prisma.atlasMandate.findFirst({
      where: { id: mandateId, organizationId },
      select: { id: true, name: true, agentRunMemoryUpToRunId: true },
    });
    if (!mandate) {
      logger.warn("[atlas/memory] mandate not found", { mandateId });
      return;
    }

    const recentRuns = await prisma.atlasAgentRun.findMany({
      where: { mandateId, organizationId, status: "complete" },
      orderBy: { completedAt: "desc" },
      take: RUNS_TO_SUMMARISE,
      select: {
        id: true,
        goal: true,
        artifacts: true,
        completedAt: true,
        steps: true,
      },
    });

    if (recentRuns.length === 0) {
      logger.info("[atlas/memory] no runs to summarise", { mandateId });
      return;
    }

    /* Idempotency guard — the most recent run's id is the natural
       sentinel for "this memory is current". */
    if (mandate.agentRunMemoryUpToRunId === recentRuns[0].id) {
      return;
    }

    const setup = buildAnthropicClient();
    if (!setup) {
      logger.warn("[atlas/memory] anthropic client not configured", {
        mandateId,
      });
      return;
    }

    const runsBlock = recentRuns
      .map((r, i) => {
        const date = r.completedAt
          ? r.completedAt.toISOString().slice(0, 10)
          : "?";
        const tools = extractToolNames(r.steps);
        const arts = extractArtifactSummaries(r.artifacts);
        const parts = [
          `### Run ${i + 1} — ${date}`,
          `Ziel: ${r.goal.slice(0, 500)}`,
        ];
        if (tools.length > 0) parts.push(`Tools: ${tools.join(", ")}`);
        if (arts.length > 0) parts.push(`Artefakte: ${arts.join("; ")}`);
        return parts.join("\n");
      })
      .join("\n\n");

    const completion = await setup.client.messages.create({
      model: setup.model,
      max_tokens: SUMMARISER_MAX_OUTPUT_TOKENS,
      temperature: SUMMARISER_TEMPERATURE,
      system: `Du bist ein Memory-Summariser für Atlas, ein juristisches AI-Tool für deutsche Weltraumrecht-Anwälte. Verdichte die folgenden Agent-Run-Records zu einer kompakten Mandat-Historie. Ziel: der nächste Agent-Run muss in einem Blick verstehen, was bisher in diesem Mandat passiert ist.

Format (strikt einhalten):

## Bisher geleistete Arbeit
- (chronologisch, je Run 1-2 Zeilen — was war das Ziel, was kam raus)

## Wichtige Fakten
- (Daten, Behörden-Kontakte, Klient-Eckdaten, regulatorische Klassifizierungen die in den Runs aufgetaucht sind)

## Offene Punkte
- (was noch fehlt, was als nächstes ansteht, was noch zu klären ist)

Knapp, präzise, lawyer-grade. Maximal 4000 Zeichen. Keine Floskeln. Deutsch.`,
      messages: [
        {
          role: "user",
          content: `Mandat: ${mandate.name}\n\nLetzte ${recentRuns.length} Agent-Runs:\n\n${runsBlock}`,
        },
      ],
    });

    /* Anthropic's discriminated-union ContentBlock has shape-narrowing
       via `b.type === "text"`, but a custom type-predicate fails the
       parameter-type compatibility check. Use a simple ternary instead
       — type-narrowing flows naturally through the conditional. */
    const summaryText = completion.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .slice(0, MEMORY_CHAR_CAP);

    if (summaryText.length === 0) {
      logger.warn("[atlas/memory] empty summary returned", { mandateId });
      return;
    }

    await prisma.atlasMandate.update({
      where: { id: mandateId },
      data: {
        agentRunMemory: summaryText,
        agentRunMemoryAt: new Date(),
        agentRunMemoryUpToRunId: recentRuns[0].id,
      },
    });

    logger.info("[atlas/memory] updated", {
      mandateId,
      latestRunId: recentRuns[0].id,
      summaryChars: summaryText.length,
      runsSummarised: recentRuns.length,
    });
  } catch (err) {
    logger.error("[atlas/memory] update failed", {
      mandateId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
