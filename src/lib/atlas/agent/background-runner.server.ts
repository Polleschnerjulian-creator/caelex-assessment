/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint D3 — Background Long-Running Agent Runner (v1).
 * ────────────────────────────────────────────────────────────────────
 * Synchronous (non-SSE) agent-loop invoked from the Vercel cron at
 * /api/cron/atlas-background-agents. Mirrors the chat route's
 * tool-use loop but without:
 *   - streaming / SSE (cron has no client)
 *   - cost-budget pauses (background runs have a SERVER-defined cap
 *     via BACKGROUND_BUDGET_USD; no lawyer to confirm in-flight)
 *   - interactive approval pauses (background = no human in the loop;
 *     when the model requests a requiresApproval tool, we HALT the
 *     run with status="halted_for_review" + persist conversationState
 *     so the lawyer can pick it up via the B1 resume-from-approval
 *     flow next time they're online)
 *   - verification (skip for v1 to keep the cron fast)
 *   - suggested_next (background runs don't chain)
 *
 * Persists an AtlasAgentRun row exactly like manual runs, with
 * templateId="background-agent" + the mandate-context so the history
 * page shows them as first-class runs. Memory is updated post-run
 * via the same B2 memory-summariser fire-and-forget.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import type Anthropic from "@anthropic-ai/sdk";

import { buildAnthropicClient } from "@/lib/atlas/anthropic-client";
import { ATLAS_TOOLS, isAtlasToolName } from "@/lib/atlas/atlas-tools";
import { executeAtlasTool } from "@/lib/atlas/atlas-tool-executor";
import {
  requiresApproval,
  approvalRationale,
  type ApprovalGate,
} from "@/lib/atlas/agent/approval-policy";
import {
  loadMandateMemoryForPrompt,
  updateMandateMemory,
} from "@/lib/atlas/agent/memory-summarizer.server";
import { delegateSubtasks } from "@/lib/atlas/agent/sub-agent-orchestrator.server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/* Background runs are server-controlled — no lawyer to bump the
   budget mid-flight. Cap at $1/run so a runaway loop can't drain the
   ANTHROPIC_API_KEY balance overnight. The cron caller can override
   if a specific mandate's schedule needs more headroom. */
const DEFAULT_BACKGROUND_BUDGET_USD = 1.0;
const MAX_ITERATIONS = 10;
const MAX_TOKENS = 4000;

/* Pricing constants — kept in sync with the agent route's H10 cache-
   aware accounting. */
const PRICE_INPUT_PER_MTOK = 3.0;
const PRICE_OUTPUT_PER_MTOK = 15.0;
const PRICE_CACHE_CREATION_PER_MTOK = PRICE_INPUT_PER_MTOK * 1.25;
const PRICE_CACHE_READ_PER_MTOK = PRICE_INPUT_PER_MTOK * 0.1;

function estimateCostUsd(
  input: number,
  output: number,
  cacheCreation: number,
  cacheRead: number,
): number {
  return (
    (input / 1_000_000) * PRICE_INPUT_PER_MTOK +
    (cacheCreation / 1_000_000) * PRICE_CACHE_CREATION_PER_MTOK +
    (cacheRead / 1_000_000) * PRICE_CACHE_READ_PER_MTOK +
    (output / 1_000_000) * PRICE_OUTPUT_PER_MTOK
  );
}

const BACKGROUND_SYSTEM_PROMPT = `Du bist Atlas, läufst im BACKGROUND-MODUS — automatischer Agent-Run via Vercel-Cron, KEIN Anwalt am Bildschirm.

WICHTIGSTE REGEL: Wenn deine Plan-Steps einen Tool-Call benötigen, der eine permanente Aktion ausführt (create_*, send_*, schedule_*, finalize_*), STOP sofort und gib aus warum eine Anwalts-Freigabe benötigt wird. Der Runner pausiert dann automatisch und der Anwalt kann den Run später fortsetzen.

Im Background-Modus ist deine Aufgabe TYPISCH:
 - Monitoring (z.B. "prüfe ob neue BNetzA-Bescheide eingegangen sind, drafte Antwort-Outline")
 - Periodische Recherche (z.B. "wöchentlich neue NIS2-Transpositions-Acts checken")
 - Daten-Aggregation (z.B. "monatlich Mandanten-Status-Snapshot")

Liefere am Ende ein EINZIGES Summary-Artefakt mit den Befunden. Keine Mandanten-Briefe, keine Schriftsätze — diese erfordern Anwalts-Freigabe und müssen vom Anwalt manuell angestoßen werden.

Output-Format:

\`\`\`
[[ARTIFACT type=summary title="<Was wurde geprüft>"]]
<Markdown: Befunde + offene Punkte für den Anwalt zum Review>
[[/ARTIFACT]]
\`\`\`

Knapp, präzise, lawyer-grade. Deutsch. KEINE Emojis.`;

export interface BackgroundRunResult {
  runId: string;
  status: "complete" | "halted_for_review" | "error";
  iterations: number;
  costUsd: number;
  message?: string;
}

export interface BackgroundRunOptions {
  userId: string;
  organizationId: string;
  mandateId: string;
  goal: string;
  /// Override the default $1 budget cap.
  budgetUsd?: number;
}

/**
 * Run an agent autonomously without a streaming client. Persists the
 * AtlasAgentRun row throughout (running → halted_for_review | complete
 * | error). Approval-required tools cause an immediate halt with
 * persisted conversationState for later resume.
 *
 * Returns lightweight result info — does NOT throw on agent-loop
 * errors (those are persisted on the row + surfaced via `status`).
 * Throws ONLY for caller-side bugs (DB unavailable, anthropic not
 * configured).
 */
export async function runAgentInBackground(
  opts: BackgroundRunOptions,
): Promise<BackgroundRunResult> {
  const setup = buildAnthropicClient();
  if (!setup) {
    throw new Error("[atlas/background] anthropic client not configured");
  }
  const { client: anthropic, model } = setup;
  const budgetUsd = opts.budgetUsd ?? DEFAULT_BACKGROUND_BUDGET_USD;

  /* Pre-load mandate context + memory in parallel. */
  const [mandate, memory] = await Promise.all([
    prisma.atlasMandate.findFirst({
      where: { id: opts.mandateId, organizationId: opts.organizationId },
      select: {
        id: true,
        name: true,
        clientName: true,
        jurisdiction: true,
        operatorType: true,
        primaryAuthority: true,
        customInstructions: true,
      },
    }),
    loadMandateMemoryForPrompt(opts.mandateId, opts.organizationId),
  ]);
  if (!mandate) {
    throw new Error(`[atlas/background] mandate ${opts.mandateId} not found`);
  }

  const systemPromptLines: string[] = [BACKGROUND_SYSTEM_PROMPT];
  systemPromptLines.push("", "## Active mandate");
  systemPromptLines.push(`- ID: ${mandate.id}`);
  systemPromptLines.push(`- Name: ${mandate.name}`);
  if (mandate.clientName)
    systemPromptLines.push(`- Client: ${mandate.clientName}`);
  if (mandate.jurisdiction)
    systemPromptLines.push(`- Jurisdiction: ${mandate.jurisdiction}`);
  if (mandate.operatorType)
    systemPromptLines.push(`- Operator: ${mandate.operatorType}`);
  if (mandate.primaryAuthority)
    systemPromptLines.push(`- Behörde: ${mandate.primaryAuthority}`);
  if (mandate.customInstructions) {
    systemPromptLines.push("", "### Custom instructions");
    systemPromptLines.push(mandate.customInstructions);
  }
  if (memory) {
    systemPromptLines.push("", "## Vorherige Agent-Aktivität in diesem Mandat");
    systemPromptLines.push(memory);
  }
  const systemPrompt = systemPromptLines.join("\n");

  /* Create the AtlasAgentRun row up-front so a mid-loop crash still
     leaves a trace in history. */
  const runRow = await prisma.atlasAgentRun.create({
    data: {
      userId: opts.userId,
      organizationId: opts.organizationId,
      mandateId: opts.mandateId,
      goal: opts.goal.slice(0, 2000),
      status: "running",
      budgetUsd,
      pausedForBudget: false,
      templateId: "background-agent",
    },
    select: { id: true },
  });
  const runId = runRow.id;

  /* Runtime state. */
  const conversation: Anthropic.MessageParam[] = [
    { role: "user", content: opts.goal },
  ];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalCacheReadTokens = 0;
  const toolsUsed: string[] = [];
  let textBuffer = "";
  const persistedSteps: Array<{
    iteration: number;
    toolId: string;
    toolName: string;
    input: Record<string, unknown>;
    durationMs?: number;
    isError?: boolean;
    summary?: string;
  }> = [];
  const persistedReasoning: Record<number, string> = {};
  /* Sprint E3 — Sub-Agent token sub-tracking, parallel zum agent
     route. Powers the Live-Counter split in the regular UI when
     background-runs are reviewed from history. */
  let subAgentInputTokens = 0;
  let subAgentOutputTokens = 0;
  const approvalGates: ApprovalGate[] = [];

  try {
    let iter = 0;
    while (iter < MAX_ITERATIONS) {
      /* Budget guard — hard halt at the cap, no lawyer to bump it. */
      const currentCost = estimateCostUsd(
        totalInputTokens,
        totalOutputTokens,
        totalCacheCreationTokens,
        totalCacheReadTokens,
      );
      if (currentCost > budgetUsd) {
        logger.warn("[atlas/background] budget exhausted", {
          runId,
          currentCost,
          budgetUsd,
        });
        await prisma.atlasAgentRun.update({
          where: { id: runId },
          data: {
            status: "stopped_for_budget",
            pausedForBudget: true,
            iterations: iter,
            steps: persistedSteps as unknown as object,
            reasoning: persistedReasoning as unknown as object,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            subAgentInputTokens,
            subAgentOutputTokens,
            costUsd: currentCost,
            completedAt: new Date(),
          },
        });
        return {
          runId,
          status: "error",
          iterations: iter,
          costUsd: currentCost,
          message: "Background budget exhausted",
        };
      }
      iter++;

      const cachedTools: Anthropic.Tool[] = ATLAS_TOOLS.map((t, i, arr) =>
        i === arr.length - 1
          ? { ...t, cache_control: { type: "ephemeral" } }
          : t,
      );
      const cachedSystem: Anthropic.TextBlockParam[] = [
        {
          type: "text",
          text: systemPrompt,
          cache_control: { type: "ephemeral" },
        },
      ];

      /* NON-streaming call — background has no client to flush to. */
      const finalMessage = await anthropic.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
        system: cachedSystem,
        messages: conversation,
        tools: cachedTools,
      });

      totalInputTokens += finalMessage.usage.input_tokens;
      totalOutputTokens += finalMessage.usage.output_tokens;
      totalCacheCreationTokens +=
        finalMessage.usage.cache_creation_input_tokens ?? 0;
      totalCacheReadTokens += finalMessage.usage.cache_read_input_tokens ?? 0;

      /* Accumulate visible-text for citation extraction later. */
      for (const block of finalMessage.content) {
        if (block.type === "text") textBuffer += block.text;
      }

      conversation.push({ role: "assistant", content: finalMessage.content });

      if (finalMessage.stop_reason !== "tool_use") break;

      /* Sprint B1 — Approval check. Background runs HALT (don't try
         to ask the model to skip — that loses lawyer review). */
      const toolUseBlocks = finalMessage.content.filter(
        (b): b is Extract<Anthropic.ContentBlock, { type: "tool_use" }> =>
          b.type === "tool_use",
      );
      const firstDangerous = toolUseBlocks.find((b) =>
        requiresApproval(b.name),
      );
      if (firstDangerous) {
        const gate: ApprovalGate = {
          toolUseId: firstDangerous.id,
          toolName: firstDangerous.name,
          originalInput: firstDangerous.input as Record<string, unknown>,
          decision: null,
          rationale: approvalRationale(firstDangerous.name),
          requestedAt: new Date().toISOString(),
          decidedAt: null,
        };
        approvalGates.push(gate);
        const finalCost = estimateCostUsd(
          totalInputTokens,
          totalOutputTokens,
          totalCacheCreationTokens,
          totalCacheReadTokens,
        );
        await prisma.atlasAgentRun.update({
          where: { id: runId },
          data: {
            status: "awaiting_approval",
            pausedForApproval: true,
            approvalGates: approvalGates as unknown as object,
            conversationState: {
              conversation,
              totalInputTokens,
              totalOutputTokens,
              totalCacheCreationTokens,
              totalCacheReadTokens,
              toolsUsed,
              textBuffer,
              persistedSteps,
              persistedReasoning,
              iter,
              pendingToolUseId: firstDangerous.id,
            } as unknown as object,
            iterations: iter,
            steps: persistedSteps as unknown as object,
            reasoning: persistedReasoning as unknown as object,
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            subAgentInputTokens,
            subAgentOutputTokens,
            costUsd: finalCost,
          },
        });
        logger.info("[atlas/background] halted for approval", {
          runId,
          mandateId: opts.mandateId,
          toolName: firstDangerous.name,
          iterations: iter,
        });
        return {
          runId,
          status: "halted_for_review",
          iterations: iter,
          costUsd: finalCost,
          message: `Halted: requires approval for ${firstDangerous.name}`,
        };
      }

      /* Execute tool_uses (all guaranteed non-dangerous at this point). */
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        persistedSteps.push({
          iteration: iter,
          toolId: block.id,
          toolName: block.name,
          input: block.input as Record<string, unknown>,
        });
        const t0 = Date.now();
        let resultContent = "";
        let isError = false;
        if (block.name === "delegate_subtasks") {
          /* Sprint D2 — sub-agent dispatch, same as agent route. */
          try {
            const inp = block.input as { subtasks?: unknown };
            const outcome = await delegateSubtasks(inp.subtasks, {
              anthropic,
              model,
              sharedSystemPrompt: systemPrompt,
            });
            resultContent = outcome.content;
            isError = outcome.hasErrors;
            totalInputTokens += outcome.totalInputTokens;
            totalOutputTokens += outcome.totalOutputTokens;
            totalCacheCreationTokens += outcome.totalCacheCreationTokens;
            totalCacheReadTokens += outcome.totalCacheReadTokens;
            if (!isError) toolsUsed.push(block.name);
            /* Sprint E3 — sub-agent token sub-tracking. */
            subAgentInputTokens += outcome.totalInputTokens;
            subAgentOutputTokens += outcome.totalOutputTokens;
          } catch (err) {
            resultContent = JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            });
            isError = true;
          }
        } else {
          try {
            if (!isAtlasToolName(block.name)) {
              throw new Error(`Unknown tool: ${block.name}`);
            }
            const out = await executeAtlasTool({
              name: block.name,
              input: block.input as Record<string, unknown>,
              callerUserId: opts.userId,
              callerOrgId: opts.organizationId,
              mandateId: opts.mandateId,
            });
            resultContent = out.content;
            isError = out.isError;
            if (!isError) toolsUsed.push(block.name);
          } catch (err) {
            resultContent = JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            });
            isError = true;
          }
        }
        const durationMs = Date.now() - t0;
        const summary = isError
          ? `Fehler: ${resultContent.slice(0, 200)}`
          : `${resultContent.length} chars`;
        const stepRec = persistedSteps.find((s) => s.toolId === block.id);
        if (stepRec) {
          stepRec.durationMs = durationMs;
          stepRec.isError = isError;
          stepRec.summary = summary;
        }
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: resultContent,
          is_error: isError || undefined,
        });
      }
      conversation.push({ role: "user", content: toolResults });
    }

    /* Parse artifacts from textBuffer (same fence-regex as the route). */
    const artifacts: Array<{ kind: string; title: string; body: string }> = [];
    const ARTIFACT_RE =
      /\[\[ARTIFACT\s+type=(\w+)\s+title="([^"]+)"\]\]([\s\S]*?)\[\[\/ARTIFACT\]\]/g;
    let am: RegExpExecArray | null;
    while ((am = ARTIFACT_RE.exec(textBuffer)) !== null) {
      artifacts.push({
        kind: am[1].toLowerCase(),
        title: am[2],
        body: am[3].trim(),
      });
    }

    const finalCost = estimateCostUsd(
      totalInputTokens,
      totalOutputTokens,
      totalCacheCreationTokens,
      totalCacheReadTokens,
    );

    await prisma.atlasAgentRun.update({
      where: { id: runId },
      data: {
        status: "complete",
        iterations: iter,
        steps: persistedSteps as unknown as object,
        reasoning: persistedReasoning as unknown as object,
        artifacts: artifacts as unknown as object,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        subAgentInputTokens,
        subAgentOutputTokens,
        costUsd: finalCost,
        completedAt: new Date(),
        conversationState: {
          conversation,
          totalInputTokens,
          totalOutputTokens,
          totalCacheCreationTokens,
          totalCacheReadTokens,
          toolsUsed,
          textBuffer,
          persistedSteps,
          persistedReasoning,
          iter,
        } as unknown as object,
      },
    });

    /* Sprint B2 — fire-and-forget memory update. */
    void updateMandateMemory(opts.mandateId, opts.organizationId).catch(
      (err) => {
        logger.warn("[atlas/background] memory update failed", {
          mandateId: opts.mandateId,
          runId,
          error: err instanceof Error ? err.message : String(err),
        });
      },
    );

    logger.info("[atlas/background] run complete", {
      runId,
      mandateId: opts.mandateId,
      iterations: iter,
      costUsd: finalCost,
    });
    return { runId, status: "complete", iterations: iter, costUsd: finalCost };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("[atlas/background] run failed", {
      runId,
      mandateId: opts.mandateId,
      error: msg,
    });
    await prisma.atlasAgentRun.update({
      where: { id: runId },
      data: {
        status: "error",
        errorMessage: msg.slice(0, 1000),
        steps: persistedSteps as unknown as object,
        reasoning: persistedReasoning as unknown as object,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        subAgentInputTokens,
        subAgentOutputTokens,
        completedAt: new Date(),
      },
    });
    return { runId, status: "error", iterations: 0, costUsd: 0, message: msg };
  }
}

/* ─────────────────────────────────────────────────────────────────
   Schedule helpers — compute nextRunAt from a simple schedule enum
   ───────────────────────────────────────────────────────────────── */

export type BackgroundSchedule = "daily" | "weekly" | "every-6h" | "every-12h";

const ALLOWED_SCHEDULES: BackgroundSchedule[] = [
  "daily",
  "weekly",
  "every-6h",
  "every-12h",
];

export function isValidSchedule(s: unknown): s is BackgroundSchedule {
  return typeof s === "string" && (ALLOWED_SCHEDULES as string[]).includes(s);
}

export function computeNextRunAt(
  schedule: BackgroundSchedule,
  from: Date = new Date(),
): Date {
  const next = new Date(from.getTime());
  switch (schedule) {
    case "every-6h":
      next.setHours(next.getHours() + 6);
      break;
    case "every-12h":
      next.setHours(next.getHours() + 12);
      break;
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
  }
  return next;
}
