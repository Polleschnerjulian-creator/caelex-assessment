/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Sprint D2 — Multi-Agent Orchestration (v1).
 * ────────────────────────────────────────────────────────────────────
 * Fires K parallel sub-agents (single-completion, no tool-use) so the
 * main agent can dispatch genuinely-parallel work — e.g., "compare X
 * across 5 jurisdictions" runs 5 sub-Claude-calls in parallel via
 * Promise.all instead of 5 sequential turns of the main loop.
 *
 * v1 scope (intentionally TIGHT):
 *   - Sub-agents are single-completion, NO tool-use loop. They get a
 *     prompt + lawyer-context, return one text output.
 *   - Max 4 parallel sub-agents per call (rate-limit + cost guard).
 *   - Per-subtask token caps (max_tokens=1500) so a single runaway
 *     sub-agent can't burn the whole iteration budget.
 *   - Returns concat'd Markdown sections + per-task token totals so
 *     the main agent's running cost accounting stays accurate.
 *
 * Why not "true multi-agent" (separate Recherche/Drafting/Compliance
 * roles + sub-tool-loops) for v1: per the tracker D2 deferral note —
 * "schwacher ROI für deutsche Mandat-Größe (typisch 1-2 Anwälte pro
 * Akte, wenig parallel benefit)". This light version delivers the
 * core value (parallelism for IO-bound exploration) without the
 * 2-week build. v2 can extend if a real use-case appears.
 *
 * The orchestrator is invoked DIRECTLY from the agent route's tool-
 * execution loop (special-case before executeAtlasTool), NOT through
 * the shared executor. That keeps the parallel-spawn logic on the
 * route's request boundary where we can charge tokens cleanly to the
 * AtlasAgentRun row.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { logger } from "@/lib/logger";

/* Hard caps — bigger numbers compound rate-limit + cost risk fast. */
const MAX_PARALLEL_SUBTASKS = 4;
const SUBTASK_MAX_OUTPUT_TOKENS = 1500;
/* Sub-agents use a more deterministic temperature than the main agent
   (which is locked to 1 for Extended Thinking). 0.5 = somewhere
   between focused-research and creative-drafting. */
const SUBTASK_TEMPERATURE = 0.5;

export interface SubtaskSpec {
  /// Human-readable label shown in the main agent's tool_result.
  /// Helps the lawyer see "what was delegated".
  title: string;
  /// The full prompt for the sub-agent. Should be self-contained —
  /// the sub-agent has no conversation history, no tools, no mandate
  /// context unless the main agent included it inline.
  prompt: string;
}

export interface SubtaskResult {
  title: string;
  output: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  durationMs: number;
  error: string | null;
}

export interface DelegationOutcome {
  /// Markdown-formatted concat of all subtask outputs, suitable for
  /// returning as a tool_result.content string. Each section opens
  /// with `## <title>` so the main agent can navigate them.
  content: string;
  /// Per-subtask records (audit trail for the run summary + cost UI).
  results: SubtaskResult[];
  /// Token totals across ALL subtasks — added to the main run's
  /// accumulated counters by the route caller.
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheCreationTokens: number;
  totalCacheReadTokens: number;
  /// True when at least one subtask errored. The main agent sees
  /// errors inline in the output ("ERROR: ...") so it can re-plan.
  hasErrors: boolean;
}

interface DelegationOptions {
  anthropic: Anthropic;
  model: string;
  /// Optional shared system-prompt prefix injected into every sub-
  /// agent (e.g., mandate context, jurisdiction). When null, each
  /// sub-agent runs with only the subtask's own prompt.
  sharedSystemPrompt: string | null;
}

/**
 * Validate + run K sub-agents in parallel. Caps the array at
 * MAX_PARALLEL_SUBTASKS and rejects malformed inputs early.
 */
export async function delegateSubtasks(
  rawSubtasks: unknown,
  opts: DelegationOptions,
): Promise<DelegationOutcome> {
  /* ── Input validation ──────────────────────────────────────────── */
  if (!Array.isArray(rawSubtasks)) {
    return errorOutcome("subtasks must be an array");
  }
  const subtasks: SubtaskSpec[] = [];
  for (const s of rawSubtasks) {
    if (typeof s !== "object" || s === null) continue;
    const r = s as Record<string, unknown>;
    if (typeof r.title !== "string" || r.title.length === 0) continue;
    if (typeof r.prompt !== "string" || r.prompt.length < 10) continue;
    /* Cap individual prompts at 4000 chars so a single subtask can't
       blow up the input-token bill on its own. */
    subtasks.push({
      title: r.title.slice(0, 200),
      prompt: r.prompt.slice(0, 4000),
    });
    if (subtasks.length >= MAX_PARALLEL_SUBTASKS) break;
  }
  if (subtasks.length === 0) {
    return errorOutcome(
      "No valid subtasks (each needs `title: string` and `prompt: string >= 10 chars`)",
    );
  }

  /* ── Fire all sub-agents in parallel ──────────────────────────── */
  logger.info("[atlas/sub-agent] dispatching", {
    count: subtasks.length,
    titles: subtasks.map((s) => s.title),
  });

  const results = await Promise.all(
    subtasks.map((s) => runOneSubtask(s, opts)),
  );

  /* ── Assemble outcome ─────────────────────────────────────────── */
  const totalInputTokens = results.reduce((a, r) => a + r.inputTokens, 0);
  const totalOutputTokens = results.reduce((a, r) => a + r.outputTokens, 0);
  const totalCacheCreationTokens = results.reduce(
    (a, r) => a + r.cacheCreationTokens,
    0,
  );
  const totalCacheReadTokens = results.reduce(
    (a, r) => a + r.cacheReadTokens,
    0,
  );
  const hasErrors = results.some((r) => r.error !== null);

  /* Build Markdown-ish concat: each subtask gets a ## section so the
     main agent can navigate visually + reference by title. */
  const sections: string[] = [];
  for (const r of results) {
    sections.push(`## ${r.title}`);
    if (r.error) {
      sections.push(`> ERROR: ${r.error}`);
    } else {
      sections.push(r.output);
    }
    sections.push("");
  }
  const content = sections.join("\n").trim();

  return {
    content,
    results,
    totalInputTokens,
    totalOutputTokens,
    totalCacheCreationTokens,
    totalCacheReadTokens,
    hasErrors,
  };
}

async function runOneSubtask(
  subtask: SubtaskSpec,
  opts: DelegationOptions,
): Promise<SubtaskResult> {
  const t0 = Date.now();
  try {
    const system = opts.sharedSystemPrompt
      ? `${opts.sharedSystemPrompt}\n\n---\n\nDu bist ein Sub-Agent — fokussiert auf EINE konkrete Teilaufgabe. Kein Tool-Use verfügbar. Liefere eine knappe, präzise Antwort als Markdown.`
      : `Du bist ein Sub-Agent eines größeren juristischen AI-Tools. Fokussiert auf EINE konkrete Teilaufgabe. Kein Tool-Use verfügbar. Liefere eine knappe, präzise Antwort als Markdown.`;

    const response = await opts.anthropic.messages.create({
      model: opts.model,
      max_tokens: SUBTASK_MAX_OUTPUT_TOKENS,
      temperature: SUBTASK_TEMPERATURE,
      system,
      messages: [{ role: "user", content: subtask.prompt }],
    });

    const output = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    return {
      title: subtask.title,
      output,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheCreationTokens: response.usage.cache_creation_input_tokens ?? 0,
      cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
      durationMs: Date.now() - t0,
      error: null,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn("[atlas/sub-agent] subtask failed", {
      title: subtask.title,
      error: msg,
    });
    return {
      title: subtask.title,
      output: "",
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      durationMs: Date.now() - t0,
      error: msg,
    };
  }
}

function errorOutcome(message: string): DelegationOutcome {
  return {
    content: `ERROR: ${message}`,
    results: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreationTokens: 0,
    totalCacheReadTokens: 0,
    hasErrors: true,
  };
}
