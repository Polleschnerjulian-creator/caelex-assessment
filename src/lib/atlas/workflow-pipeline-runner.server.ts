import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V3 T1.E — Multi-Step Workflow Pipeline Runner.
 *
 * Orchestrates sequential `runChat()` invocations over a workflow's
 * `pipeline: WorkflowStep[]`. Each step's prompt becomes a user-turn
 * in the SAME AtlasChat (chatId carried forward), so the assistant
 * sees the full conversation history of the pipeline.
 *
 * Server-side stream consumption: `runChat()` returns a streaming SSE
 * `ReadableStream<Uint8Array>`. The runner consumes it locally —
 * accumulating `text` deltas + `tool_call_*` events — and only proceeds
 * to step N+1 once step N's stream has closed. No UI; the persisted
 * chat history is the user-visible output via the standard
 * `/atlas/chat/[id]` view.
 *
 * Design notes:
 * - First failure aborts the pipeline (no auto-retry in v1).
 * - No Prisma persistence for pipeline metadata in v1 — the AtlasChat
 *   already records `workflowId`, which is the link key. Future:
 *   `AtlasWorkflowRun` table for step-level analytics.
 * - No external cost beyond what `runChat()` itself bills for —
 *   pipeline is just a sequencer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { runChat } from "./chat-engine.server";
import { getWorkflowById, type WorkflowStep } from "./workflow-library";
import { getToolMetadata } from "./tool-metadata";
import { logger } from "@/lib/logger";

export interface PipelineRunInput {
  workflowId: string;
  userId: string;
  organizationId: string;
  /** Optional mandate-scope. Applied to every step. */
  mandateId?: string | null;
  /** UI locale forwarded to chat-engine for system-prompt hints. */
  language?: "de" | "en" | "fr" | "es";
  /** Override the workflow's default expectedTools-derived toggles. */
  toolToggles?: Record<string, boolean>;
  /** When true, halt the pipeline if a step produces zero text + zero
   *  tool-calls (empty assistant turn). Defaults to true. */
  abortOnEmptyTurn?: boolean;
  /** T1.E.26 approval-gate behaviour. Pipeline pre-flight scans each
   *  step's `expectedTools` against `tool-metadata.requiresApproval`.
   *  - Default (undefined / false): halt before running ANY step if at
   *    least one upcoming step needs approval. Returns
   *    `awaitingApproval` so the UI can prompt the user.
   *  - `true`: skip the pre-flight check entirely — the caller has
   *    already obtained user consent (e.g. via a single up-front
   *    "Run this whole pipeline?" modal). */
  bypassApproval?: boolean;
  /** T1.E.27 per-step retry policy. When a step's runChat throws OR
   *  the stream emits an `error` event, retry up to `maxRetries`
   *  times with backoffMs[i] delay between attempts. Defaults to
   *  `{ maxRetries: 2, backoffMs: [1000, 3000] }` (≈4s worst-case).
   *  Pass `{ maxRetries: 0 }` to disable retries entirely. */
  retryPolicy?: PipelineRetryPolicy;
}

export interface PipelineRetryPolicy {
  maxRetries: number;
  /** Wait between attempts. `backoffMs[i]` is the delay AFTER the i-th
   *  failure (0-indexed). If shorter than maxRetries, the last entry
   *  is reused for subsequent retries. Empty array → no waits. */
  backoffMs: number[];
}

const DEFAULT_RETRY_POLICY: PipelineRetryPolicy = {
  maxRetries: 2,
  backoffMs: [1000, 3000],
};

/** Per-step approval summary returned by the pre-flight scan. */
export interface PipelinePendingStepApproval {
  stepIndex: number;
  /** Tool names from `step.expectedTools` that are marked
   *  `requiresApproval=true` in tool-metadata. Empty for safe steps;
   *  this list is only included for steps that need approval. */
  requiresApprovalTools: string[];
}

export interface PipelineStepResult {
  stepIndex: number;
  /** First 200 chars of the step prompt (full prompt lives in DB). */
  promptPreview: string;
  /** Full assistant text accumulated from `text` deltas. */
  assistantText: string;
  /** Tool names invoked during this step (in order). */
  toolsUsed: string[];
  /** Wall-clock duration of this step's runChat() + stream consumption. */
  durationMs: number;
  isError: boolean;
  /** Error message when isError = true; otherwise undefined. */
  errorMessage?: string;
  /** T1.E.27: how many retries the step needed before succeeding (or
   *  before giving up). 0 means first-try success or no retry policy
   *  in play. */
  retriedAttempts?: number;
}

export interface PipelineRunResult {
  workflowId: string;
  /** AtlasChat ID — same across all steps (carried forward). */
  chatId: string;
  steps: PipelineStepResult[];
  totalDurationMs: number;
  /** True when every step completed without error. */
  isCompleted: boolean;
  /** Set when the runner aborted on a hard error (no workflow / no
   *  pipeline). Distinguishes from step-level failures. */
  aborted?: { code: string; message: string };
  /** T1.E.26: set when the pre-flight approval scan found steps that
   *  need user consent and `bypassApproval` wasn't passed. The pipeline
   *  did NOT execute any step in this case — call again with
   *  `bypassApproval: true` after the user approves. */
  awaitingApproval?: {
    pendingSteps: PipelinePendingStepApproval[];
  };
}

/* ── Public API ─────────────────────────────────────────────────────── */

export async function runWorkflowPipeline(
  input: PipelineRunInput,
): Promise<PipelineRunResult> {
  const startedAt = Date.now();
  const workflow = getWorkflowById(input.workflowId);

  if (!workflow) {
    return {
      workflowId: input.workflowId,
      chatId: "",
      steps: [],
      totalDurationMs: Date.now() - startedAt,
      isCompleted: false,
      aborted: {
        code: "WORKFLOW_NOT_FOUND",
        message: `Workflow not found: ${input.workflowId}`,
      },
    };
  }

  if (!workflow.pipeline || workflow.pipeline.length === 0) {
    return {
      workflowId: input.workflowId,
      chatId: "",
      steps: [],
      totalDurationMs: Date.now() - startedAt,
      isCompleted: false,
      aborted: {
        code: "NO_PIPELINE",
        message: `Workflow has no pipeline: ${input.workflowId}`,
      },
    };
  }

  /* T1.E.26 pre-flight approval scan. For each step, check whether
     any tool in `expectedTools` is marked `requiresApproval=true` in
     tool-metadata. If so AND the caller didn't pass `bypassApproval`,
     halt before running anything and return the pending-approval
     list. The UI prompts the user; on consent it re-invokes with
     `bypassApproval: true`. */
  if (!input.bypassApproval) {
    const pendingSteps: PipelinePendingStepApproval[] = [];
    for (let i = 0; i < workflow.pipeline.length; i++) {
      const step = workflow.pipeline[i];
      const tools = step.expectedTools ?? [];
      const flagged: string[] = [];
      for (const toolName of tools) {
        const meta = getToolMetadata(toolName);
        if (meta?.requiresApproval) flagged.push(toolName);
      }
      if (flagged.length > 0) {
        pendingSteps.push({ stepIndex: i, requiresApprovalTools: flagged });
      }
    }
    if (pendingSteps.length > 0) {
      logger.info("[atlas/pipeline] halting pre-flight on approval-required", {
        workflowId: workflow.id,
        pendingStepCount: pendingSteps.length,
      });
      return {
        workflowId: workflow.id,
        chatId: "",
        steps: [],
        totalDurationMs: Date.now() - startedAt,
        isCompleted: false,
        awaitingApproval: { pendingSteps },
      };
    }
  }

  const abortOnEmpty = input.abortOnEmptyTurn ?? true;
  const retryPolicy = input.retryPolicy ?? DEFAULT_RETRY_POLICY;
  let chatId: string | null = null;
  const steps: PipelineStepResult[] = [];

  for (let i = 0; i < workflow.pipeline.length; i++) {
    const step = workflow.pipeline[i];
    const stepStart = Date.now();

    /* T1.E.27 retry loop. Wraps runChat + consumeChatStream so
       transient failures (network blip, gateway 503, stream-error
       event from Anthropic) don't kill the whole pipeline. The
       maxAttempts = 1 + maxRetries — first try counts. */
    const maxAttempts = retryPolicy.maxRetries + 1;
    let attempt = 0;
    let lastError: string | undefined = undefined;
    let consumed: {
      assistantText: string;
      toolsUsed: string[];
      errorMessage?: string;
    } | null = null;
    let attemptChatId: string | null = chatId;
    let stepThrew = false;
    let throwMessage: string | undefined;

    while (attempt < maxAttempts) {
      try {
        const result = await runChat({
          chatId: attemptChatId,
          userId: input.userId,
          organizationId: input.organizationId,
          mandateId: input.mandateId ?? null,
          userMessage: step.prompt,
          language: input.language ?? "de",
          titleHint: i === 0 ? workflow.name : undefined,
          workflowId: workflow.id,
          toolToggles:
            input.toolToggles ??
            deriveToggles(step.expectedTools, workflow.toolToggles),
        });

        attemptChatId = result.chatId;

        const streamed = await consumeChatStream(result.stream);
        consumed = streamed;

        if (streamed.errorMessage === undefined) {
          /* Success — exit retry loop. */
          stepThrew = false;
          throwMessage = undefined;
          lastError = undefined;
          break;
        }
        /* Stream-error event — retryable. */
        lastError = streamed.errorMessage;
      } catch (err) {
        /* Hard throw — runChat couldn't start / SSE blew up. */
        stepThrew = true;
        throwMessage = err instanceof Error ? err.message : String(err);
        lastError = throwMessage;
      }

      attempt += 1;
      if (attempt < maxAttempts) {
        /* Apply backoff. backoffMs[i-1] for the i-th retry; reuse last
           entry if the array is shorter than maxRetries. */
        const idx = Math.min(attempt - 1, retryPolicy.backoffMs.length - 1);
        const delay = idx >= 0 ? retryPolicy.backoffMs[idx] : 0;
        logger.warn("[atlas/pipeline] step failed, retrying", {
          workflowId: workflow.id,
          stepIndex: i,
          attempt,
          nextDelayMs: delay,
          error: lastError,
        });
        if (delay > 0) {
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    /* Did the retry-loop produce a result? */
    if (stepThrew) {
      /* Hard-throw exhausted all retries. */
      steps.push({
        stepIndex: i,
        promptPreview: step.prompt.slice(0, 200),
        assistantText: "",
        toolsUsed: [],
        durationMs: Date.now() - stepStart,
        isError: true,
        errorMessage: throwMessage,
        retriedAttempts: attempt - 1,
      });
      logger.error("[atlas/pipeline] step threw (retries exhausted)", {
        workflowId: workflow.id,
        stepIndex: i,
        attempts: attempt,
        error: throwMessage,
      });
      break;
    }

    if (!consumed) {
      /* Shouldn't happen — every code path should have set consumed
         OR set stepThrew. Defensive fallback. */
      steps.push({
        stepIndex: i,
        promptPreview: step.prompt.slice(0, 200),
        assistantText: "",
        toolsUsed: [],
        durationMs: Date.now() - stepStart,
        isError: true,
        errorMessage: "unexpected: no consumed stream and no thrown error",
        retriedAttempts: attempt,
      });
      break;
    }

    try {
      chatId = attemptChatId;

      const stepResult: PipelineStepResult = {
        stepIndex: i,
        promptPreview: step.prompt.slice(0, 200),
        assistantText: consumed.assistantText,
        toolsUsed: consumed.toolsUsed,
        durationMs: Date.now() - stepStart,
        isError: consumed.errorMessage !== undefined,
        errorMessage: consumed.errorMessage,
        retriedAttempts: attempt,
      };
      steps.push(stepResult);

      if (stepResult.isError) {
        logger.warn("[atlas/pipeline] step aborted on stream error", {
          workflowId: workflow.id,
          stepIndex: i,
          attempts: attempt + 1,
          error: consumed.errorMessage,
        });
        break;
      }

      if (
        abortOnEmpty &&
        consumed.assistantText.trim().length === 0 &&
        consumed.toolsUsed.length === 0
      ) {
        stepResult.isError = true;
        stepResult.errorMessage = "Empty assistant turn (no text, no tools)";
        logger.warn("[atlas/pipeline] step aborted on empty turn", {
          workflowId: workflow.id,
          stepIndex: i,
        });
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      steps.push({
        stepIndex: i,
        promptPreview: step.prompt.slice(0, 200),
        assistantText: "",
        toolsUsed: [],
        durationMs: Date.now() - stepStart,
        isError: true,
        errorMessage: msg,
      });
      logger.error("[atlas/pipeline] step threw", {
        workflowId: workflow.id,
        stepIndex: i,
        error: msg,
      });
      break;
    }
  }

  const isCompleted =
    steps.length === workflow.pipeline.length && steps.every((s) => !s.isError);

  return {
    workflowId: workflow.id,
    chatId: chatId ?? "",
    steps,
    totalDurationMs: Date.now() - startedAt,
    isCompleted,
  };
}

/* ── Stream consumer ────────────────────────────────────────────────── */

interface ConsumedStream {
  assistantText: string;
  toolsUsed: string[];
  /** Set when the stream emitted an SSE `error` event. */
  errorMessage?: string;
}

export async function consumeChatStream(
  stream: ReadableStream<Uint8Array>,
): Promise<ConsumedStream> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let assistantText = "";
  const toolsUsed: string[] = [];
  let errorMessage: string | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = drainEvents(buffer, (evt) => {
        if (evt.type === "text" && typeof evt.delta === "string") {
          assistantText += evt.delta;
        } else if (
          (evt.type === "tool_call_start" || evt.type === "tool_use") &&
          typeof evt.name === "string"
        ) {
          toolsUsed.push(evt.name);
        } else if (evt.type === "error" && typeof evt.message === "string") {
          errorMessage = evt.message;
        }
      });
    }
    // Flush trailing buffer (any final event without \n\n boundary).
    if (buffer.length > 0) {
      drainEvents(buffer + "\n\n", (evt) => {
        if (evt.type === "text" && typeof evt.delta === "string") {
          assistantText += evt.delta;
        } else if (
          (evt.type === "tool_call_start" || evt.type === "tool_use") &&
          typeof evt.name === "string"
        ) {
          toolsUsed.push(evt.name);
        } else if (evt.type === "error" && typeof evt.message === "string") {
          errorMessage = evt.message;
        }
      });
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }

  return { assistantText, toolsUsed, errorMessage };
}

/**
 * Splits buffered SSE bytes into discrete events (\n\n delimited),
 * parses each `data: ...` payload as JSON, and dispatches to `onEvent`.
 * Returns the remaining (partial) buffer to feed back in on the next
 * iteration.
 */
function drainEvents(
  buffer: string,
  onEvent: (evt: Record<string, unknown>) => void,
): string {
  const parts = buffer.split("\n\n");
  const tail = parts.pop() ?? "";
  for (const part of parts) {
    // Each part may contain comment lines (`: keepalive`) and one
    // `data: <json>` line. Find the data line and parse it.
    for (const line of part.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload.length === 0) continue;
      try {
        const json = JSON.parse(payload);
        if (json && typeof json === "object") {
          onEvent(json as Record<string, unknown>);
        }
      } catch {
        // Malformed event — ignore. The chat-engine never emits this
        // in practice but we don't want a single bad line to break
        // the whole pipeline.
      }
    }
  }
  return tail;
}

/* ── Toggle derivation ──────────────────────────────────────────────── */

/**
 * Maps a step's expected-tool names into the bundle-level toggle map
 * `runChat()` expects. Conservative: when in doubt, enable. The chat-
 * engine's defaults are all-on except `documents` and `web` (paid /
 * external surface area), so we mirror that and only flip `web` on
 * when an expected tool requires it.
 */
function deriveToggles(
  expectedTools: string[] | undefined,
  workflowOverride: Record<string, boolean> | undefined,
): Record<string, boolean> {
  const base: Record<string, boolean> = {
    korpus: true,
    compliance: true,
    comparison: true,
    drafting: true,
    validity: true,
    documents: false,
    web: false,
    workflow: true,
    mandate: true,
  };

  if (workflowOverride) {
    return { ...base, ...workflowOverride };
  }

  const tools = expectedTools ?? [];
  for (const t of tools) {
    if (
      t === "search_eurlex" ||
      t === "search_courtlistener" ||
      t === "web_search" ||
      t === "fetch_url"
    ) {
      base.web = true;
    }
    if (
      t === "get_mandate_files" ||
      t === "read_mandate_file" ||
      t === "summarize_mandate_file" ||
      t === "ocr_mandate_file" ||
      t === "extract_mandate_file_clauses"
    ) {
      base.documents = true;
    }
  }
  return base;
}
